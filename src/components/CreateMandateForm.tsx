"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { WalletNotice } from "@/components/WalletNotice";
import {
  MANDATE_TEMPLATES,
  findMandateTemplate,
  type MandateTemplate,
} from "@/lib/sample-mandates";
import { CONTRACT_EXPLORER_URL } from "@/lib/config";
import { FEATURES } from "@/lib/features";
import { criterionLabel, isAddress, toWei } from "@/lib/format";
import { useAttestra } from "@/lib/useAttestra";
import type { TxPhase } from "@/lib/attestra";
import {
  CRITERION_TYPES,
  POLICIES,
  POLICY_LABELS,
  TYPE_LABELS,
  WEIGHT_TOTAL,
  type Criterion,
  type CriticalPolicy,
  type SettlementPolicy,
} from "@/lib/protocol/vocabulary";

const PHASE_LABELS: Record<TxPhase, string> = {
  idle: "Open the mandate",
  wallet: "Confirm in MetaMask…",
  submitted: "Submitted to StudioNet…",
  pending: "Waiting for validator acceptance…",
  finalizing: "Waiting for finality…",
  finalized: "Mandate recorded",
  rejected: "Signature declined",
  failed: "Transaction failed",
};

function CreateMandateFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTemplate = findMandateTemplate(searchParams.get("sample") ?? "");
  const { client, address, onRightNetwork } = useAttestra();

  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplate.id);
  const [selectedTemplate, setSelectedTemplate] =
    useState<MandateTemplate>(initialTemplate);
  const [title, setTitle] = useState(initialTemplate.title);
  const [description, setDescription] = useState(initialTemplate.description);
  const [operator, setOperator] = useState("");
  const [operatorEdited, setOperatorEdited] = useState(false);
  const [payment, setPayment] = useState(initialTemplate.paymentGen);
  const [operatorBond, setOperatorBond] = useState(initialTemplate.operatorBondGen);
  const [contestBond, setContestBond] = useState(initialTemplate.contestBondGen);
  const [evidenceRules, setEvidenceRules] = useState(initialTemplate.evidenceRules);
  const [executionTicks, setExecutionTicks] = useState(initialTemplate.executionTicks);
  const [reviewTicks, setReviewTicks] = useState(initialTemplate.reviewTicks);
  const [criteria, setCriteria] = useState<Criterion[]>(initialTemplate.criteria);
  const [policyPartial, setPolicyPartial] = useState<SettlementPolicy>(
    initialTemplate.policyPartial,
  );
  const [policyInconclusive, setPolicyInconclusive] =
    useState<SettlementPolicy>(initialTemplate.policyInconclusive);
  const [criticalPolicy, setCriticalPolicy] =
    useState<CriticalPolicy>(initialTemplate.criticalPolicy);
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = ["wallet", "submitted", "pending", "finalizing"].includes(phase);
  const weightSum = useMemo(
    () => criteria.reduce((total, item) => total + Number(item.weight || 0), 0),
    [criteria],
  );

  const update = (index: number, patch: Partial<Criterion>) => {
    setCriteria((current) =>
      current.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const addCriterion = () => {
    setCriteria((current) => [
      ...current,
      {
        id: `C${current.length + 1}`,
        text: "",
        type: "EVIDENCE",
        weight: 0,
        critical: false,
        method: "",
      },
    ]);
  };

  const applyTemplate = (id: string) => {
    const template = findMandateTemplate(id);
    setSelectedTemplateId(template.id);
    setSelectedTemplate(template);
    setTitle(template.title);
    setDescription(template.description);
    setPayment(template.paymentGen);
    setOperatorBond(template.operatorBondGen);
    setContestBond(template.contestBondGen);
    setEvidenceRules(template.evidenceRules);
    setExecutionTicks(template.executionTicks);
    setReviewTicks(template.reviewTicks);
    setCriteria(template.criteria.map((criterion) => ({ ...criterion })));
    setPolicyPartial(template.policyPartial);
    setPolicyInconclusive(template.policyInconclusive);
    setCriticalPolicy(template.criticalPolicy);
    setError(null);
    router.replace(`/mandates/new?sample=${template.id}`);
  };

  useEffect(() => {
    if (address && !operatorEdited) setOperator(address);
  }, [address, operatorEdited]);

  const submit = async () => {
    setError(null);
    setTxHash(null);
    if (!address || !onRightNetwork) {
      setError("Connect MetaMask to StudioNet before creating a mandate.");
      return;
    }
    if (!isAddress(operator)) {
      setError("Enter a valid operator wallet address.");
      return;
    }
    if (operator.toLowerCase() === address) {
      setError("The client and operator must use different wallet addresses.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("The title and agreement are required.");
      return;
    }
    if (criteria.some((item) => !item.text.trim())) {
      setError("Every acceptance criterion needs a description.");
      return;
    }
    if (weightSum !== WEIGHT_TOTAL) {
      setError(`Criterion weights must total ${WEIGHT_TOTAL}; they currently total ${weightSum}.`);
      return;
    }

    try {
      const paymentWei = toWei(payment);
      if (paymentWei <= BigInt(0)) throw new Error("Payment must be greater than zero.");
      client.setPhaseHandler((next, hash) => {
        setPhase(next);
        if (hash) setTxHash(hash);
      });
      const result = await client.createMandate({
        operator,
        title: title.trim(),
        description: description.trim(),
        criteria,
        paymentWei,
        operatorBondWei: toWei(operatorBond),
        contestBondWei: toWei(contestBond),
        evidenceRules: evidenceRules.trim(),
        policyConfirmed: "RELEASE_FULL",
        policyPartial,
        policyRejected: "RETURN",
        policyInconclusive,
        criticalPolicy,
        executionTicks: Math.max(1, Number.parseInt(executionTicks, 10) || 1),
        reviewTicks: Math.max(1, Number.parseInt(reviewTicks, 10) || 1),
      });
      const mandateId = typeof result.returned === "string" ? result.returned : null;
      setPhase("idle");
      if (mandateId) {
        router.push(`/mandates/${mandateId}`);
      } else {
        router.push("/mandates");
      }
    } catch (createError) {
      setPhase("idle");
      setError(
        createError instanceof Error
          ? createError.message
          : "The transaction could not be completed.",
      );
    }
  };

  return (
    <div className="detail-layout">
      <div>
        {FEATURES.samples ? (
        <div className="panel">
          <div className="card-top">
            <h3>Start from a live sample</h3>
            <span className="chip accent">Direct contract write</span>
          </div>
          <p className="lede">
            Choose a prepared mandate. The form is prefilled for testing, but
            nothing exists on StudioNet until you review it and sign the
            transaction with MetaMask.
          </p>
          <div className="filter-row" aria-label="Mandate templates">
            {MANDATE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`filter-button ${
                  selectedTemplateId === template.id ? "is-active" : ""
                }`}
                onClick={() => applyTemplate(template.id)}
              >
                {template.name}
              </button>
            ))}
          </div>
          <div className="notice">
            <strong>{selectedTemplate.badge}:</strong> {selectedTemplate.purpose}
            <br />
            <span>
              Suggested evidence: {selectedTemplate.defaultEvidenceUrl}. Publish
              the repository evidence file over public HTTPS before adjudication.
            </span>
          </div>
        </div>
        ) : null}

        <div className="panel">
          <h3>The agreement</h3>
          <p className="lede">
            Write the work in terms that can settle a later disagreement.
            StudioNet freezes this text when the mandate is funded.
          </p>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span>Agreement</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Evidence rules</span>
            <input
              value={evidenceRules}
              onChange={(event) => setEvidenceRules(event.target.value)}
              placeholder="Sources must be publicly retrievable without a login."
            />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Operator wallet</span>
              <input
                value={operator}
                onChange={(event) => {
                  setOperator(event.target.value);
                  setOperatorEdited(true);
                }}
                placeholder="Paste the operator wallet address"
              />
            </label>
            <label className="field">
              <span>Payment in GEN</span>
              <input value={payment} onChange={(event) => setPayment(event.target.value)} />
            </label>
            <label className="field">
              <span>Performance bond in GEN</span>
              <input
                value={operatorBond}
                onChange={(event) => setOperatorBond(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Contest bond in GEN</span>
              <input
                value={contestBond}
                onChange={(event) => setContestBond(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Execution window in protocol steps</span>
              <input
                type="number"
                min={1}
                max={10000}
                value={executionTicks}
                onChange={(event) => setExecutionTicks(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Review window in protocol steps</span>
              <input
                type="number"
                min={1}
                max={10000}
                value={reviewTicks}
                onChange={(event) => setReviewTicks(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="panel">
          <h3>Acceptance checklist</h3>
          <p className="lede">
            Integer weights must total one hundred. The contract—not the
            validator model—sums these weights after a ruling.
          </p>
          {criteria.map((criterion, index) => (
            <div key={criterion.id} className="criterion">
              <header>
                <span className="mono-label">{criterionLabel(criterion.id)}</span>
                {criteria.length > 1 ? (
                  <button
                    className="t-btn small ghost"
                    type="button"
                    onClick={() =>
                      setCriteria((current) =>
                        current.filter((_, position) => position !== index),
                      )
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </header>
              <label className="field">
                <span>What must be true</span>
                <textarea
                  value={criterion.text}
                  onChange={(event) => update(index, { text: event.target.value })}
                />
              </label>
              <div className="grid-2">
                <label className="field">
                  <span>Kind</span>
                  <select
                    value={criterion.type}
                    onChange={(event) =>
                      update(index, {
                        type: event.target.value as Criterion["type"],
                      })
                    }
                  >
                    {CRITERION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Weight</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={criterion.weight}
                    onChange={(event) =>
                      update(index, { weight: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="field">
                  <span>Verification method</span>
                  <input
                    value={criterion.method}
                    onChange={(event) => update(index, { method: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Non-negotiable</span>
                  <select
                    value={criterion.critical ? "yes" : "no"}
                    onChange={(event) =>
                      update(index, { critical: event.target.value === "yes" })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
            <button className="t-btn small ghost" type="button" onClick={addCriterion}>
              Add criterion
            </button>
            <span className="mono-label">Weights total {weightSum} of 100</span>
          </div>
        </div>
      </div>

      <aside>
        <div className="panel">
          <h3>Settlement rules</h3>
          <p className="lede">
            These rules are stored on chain before execution begins. A later
            ruling cannot choose its own payout.
          </p>
          <div className="data-row">
            <span>Every criterion met</span>
            <span>{POLICY_LABELS.RELEASE_FULL}</span>
          </div>
          <label className="field" style={{ marginTop: 16 }}>
            <span>Some met, some not</span>
            <select
              value={policyPartial}
              onChange={(event) =>
                setPolicyPartial(event.target.value as SettlementPolicy)
              }
            >
              {POLICIES.map((policy) => (
                <option key={policy} value={policy}>
                  {POLICY_LABELS[policy]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Record cannot decide</span>
            <select
              value={policyInconclusive}
              onChange={(event) =>
                setPolicyInconclusive(event.target.value as SettlementPolicy)
              }
            >
              {POLICIES.map((policy) => (
                <option key={policy} value={policy}>
                  {POLICY_LABELS[policy]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>A non-negotiable criterion fails</span>
            <select
              value={criticalPolicy}
              onChange={(event) =>
                setCriticalPolicy(event.target.value as CriticalPolicy)
              }
            >
              <option value="VOID_MANDATE">The mandate is rejected</option>
              <option value="PRORATA">The score stands</option>
            </select>
          </label>

          <WalletNotice />
          <button
            className="t-btn accent"
            type="button"
            style={{ width: "100%", marginTop: 16 }}
            disabled={busy || !address || !onRightNetwork}
            onClick={() => void submit()}
          >
            {PHASE_LABELS[phase]}
          </button>
          {txHash ? (
            <p className="notice" style={{ marginTop: 14 }}>
              The transaction reference was saved. You can verify activity from{" "}
              <a href={CONTRACT_EXPLORER_URL} target="_blank" rel="noreferrer">
                the public explorer
              </a>
              .
            </p>
          ) : null}
          {error ? (
            <p className="notice danger" style={{ marginTop: 14 }}>
              {error}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function CreateMandateForm() {
  return (
    <Suspense fallback={<p className="list-state">Preparing the mandate form…</p>}>
      <CreateMandateFormInner />
    </Suspense>
  );
}
