"use client";

import { useState } from "react";

import { WalletNotice } from "@/components/WalletNotice";
import type {
  ContestRecord,
  EvidenceReceipt,
  Mandate,
  Ruling,
  SettlementRecord,
  TxPhase,
} from "@/lib/attestra";
import { CONTRACT_EXPLORER_URL } from "@/lib/config";
import {
  criterionLabel,
  evidenceLabel,
  externalUrl,
  fromWei,
  mandateLabel,
  walletLabel,
} from "@/lib/format";
import { useAttestra, useLiveQuery } from "@/lib/useAttestra";
import {
  FLAG_LABELS,
  POLICY_LABELS,
  RESULT_LABELS,
  ROLE_LABELS,
  RULING_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  type EvidenceRole,
} from "@/lib/protocol/vocabulary";

interface WorkspaceData {
  mandate: Mandate;
  evidence: EvidenceReceipt[];
  contest: ContestRecord | null;
  rulings: Ruling[];
  settlement: SettlementRecord | null;
}

const PHASE_LABELS: Record<TxPhase, string> = {
  idle: "Ready",
  wallet: "Confirm in MetaMask",
  submitted: "Submitted to StudioNet",
  pending: "Waiting for validator acceptance",
  finalizing: "Waiting for finality",
  finalized: "Recorded on chain",
  rejected: "Signature declined",
  failed: "Transaction failed",
};

export function MandateWorkspace({ mandateId }: { mandateId: string }) {
  const { client, address, onRightNetwork } = useAttestra();
  const query = useLiveQuery<WorkspaceData>(
    async (liveClient) => {
      const [mandate, evidence, contestValue, rulings, settlementValue] =
        await Promise.all([
          liveClient.getMandate(mandateId),
          liveClient.getEvidence(mandateId),
          liveClient.getContest(mandateId),
          liveClient.listRulings(mandateId),
          liveClient.getSettlement(mandateId),
        ]);
      return {
        mandate,
        evidence,
        contest:
          contestValue && "mandate_id" in contestValue
            ? (contestValue as ContestRecord)
            : null,
        rulings,
        settlement:
          settlementValue && "mandate_id" in settlementValue
            ? (settlementValue as SettlementRecord)
            : null,
      };
    },
    mandateId,
  );

  const [phase, setPhase] = useState<TxPhase>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceCriterion, setEvidenceCriterion] = useState("");
  const [evidenceRole, setEvidenceRole] = useState<EvidenceRole>("SUPPORTING");
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [deliverableUri, setDeliverableUri] = useState("");
  const [contestClaim, setContestClaim] = useState("");
  const [contestSelection, setContestSelection] = useState<string[]>([]);
  const [responseText, setResponseText] = useState("");
  const [appealGrounds, setAppealGrounds] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftRules, setDraftRules] = useState("");

  const busy = ["wallet", "submitted", "pending", "finalizing"].includes(phase);

  const transact = async (label: string, operation: () => Promise<unknown>) => {
    setActionError(null);
    setMessage(null);
    setTxHash(null);
    client.setPhaseHandler((next, hash) => {
      setPhase(next);
      if (hash) setTxHash(hash);
    });
    try {
      await operation();
      await query.refresh();
      setMessage(`${label} was recorded in accepted StudioNet state.`);
      setPhase("idle");
    } catch (error) {
      await query.refresh();
      setPhase("idle");
      setActionError(
        error instanceof Error ? error.message : "The transaction could not be completed.",
      );
    }
  };

  if (query.loading && !query.data) {
    return <p className="list-state">Reading the mandate from StudioNet…</p>;
  }
  if (query.error || !query.data) {
    return (
      <div className="notice danger">
        {query.error || "The contract did not return this mandate."}
        <button className="t-btn small ghost" onClick={() => void query.refresh()}>
          Retry
        </button>
      </div>
    );
  }

  const { mandate: m, evidence, contest, rulings, settlement } = query.data;
  const isClient = address === m.client.toLowerCase();
  const isOperator = address === m.operator.toLowerCase();
  const isParty = isClient || isOperator;
  const canAct = Boolean(address) && onRightNetwork && isParty;
  const latestRuling = rulings[rulings.length - 1] ?? null;

  const actionButton = (
    label: string,
    operation: () => Promise<unknown>,
    enabled = true,
  ) => (
    <button
      type="button"
      className="t-btn small"
      disabled={!canAct || !enabled || busy}
      onClick={() => void transact(label, operation)}
    >
      {label}
    </button>
  );

  return (
    <div className="detail-layout">
      <div>
        <div className="panel">
          <div className="card-top">
            <span className="chip accent">{STATUS_LABELS[m.status]}</span>
            <span className="mono-label">
              {mandateLabel(m.mandate_id)} · protocol clock {m.current_tick}
            </span>
          </div>
          <h3 style={{ fontSize: 34, marginTop: 18 }}>{m.title}</h3>
          <p className="lede">{m.description}</p>
          <div className="data-row">
            <span>Client</span>
            <span>{walletLabel(m.client, "Client")}</span>
          </div>
          <div className="data-row">
            <span>Operator</span>
            <span>{walletLabel(m.operator, "Operator")}</span>
          </div>
          <div className="data-row">
            <span>Agreed payment</span>
            <span>{fromWei(m.payment_wei)} GEN</span>
          </div>
          <div className="data-row">
            <span>Currently held</span>
            <span>{fromWei(m.custody_held)} GEN</span>
          </div>
          <div className="data-row">
            <span>Evidence rules</span>
            <span>{m.evidence_rules || "Protocol defaults only"}</span>
          </div>
          <div className="data-row">
            <span>Agreement integrity</span>
            <span>{m.checklist_hash ? "Locked and fingerprinted" : "Locks when funded"}</span>
          </div>
          {m.deliverable_uri ? (
            <div className="data-row">
              <span>Deliverable</span>
              <a
                className="address"
                href={externalUrl(m.deliverable_uri)}
                target="_blank"
                rel="noreferrer"
              >
                Open filed work
              </a>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <h3>Acceptance checklist</h3>
          <p className="lede">
            Frozen weights. The contract sums the weight of each criterion that
            independent validators mark as met.
          </p>
          {m.criteria.map((criterion) => {
            const outcome = latestRuling?.criterion_results.find(
              (item) => item.id === criterion.id,
            );
            return (
              <div key={criterion.id} className="criterion">
                <header>
                  <span className="mono-label">
                    {criterionLabel(criterion.id)} · {TYPE_LABELS[criterion.type]} · weight {criterion.weight}
                  </span>
                  <span
                    className={`chip ${
                      outcome?.result === "PASS"
                        ? "accent"
                        : outcome?.result === "FAIL"
                          ? "danger"
                          : outcome
                            ? "warn"
                            : ""
                    }`}
                  >
                    {outcome
                      ? RESULT_LABELS[outcome.result]
                      : criterion.critical
                        ? "Non-negotiable"
                        : "Pending"}
                  </span>
                </header>
                <p>{criterion.text}</p>
                {outcome?.justification ? (
                  <p style={{ marginTop: 8, color: "var(--t-muted)" }}>
                    {outcome.justification}
                  </p>
                ) : null}
                <div className="weight-bar">
                  <i style={{ width: `${criterion.weight}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel">
          <h3>Evidence record</h3>
          <p className="lede">
            Source metadata is a submitter claim until validators retrieve the
            source during adjudication.
          </p>
          {evidence.length === 0 ? (
            <p className="list-state" style={{ padding: "20px 0" }}>
              No evidence receipt has been filed.
            </p>
          ) : (
            evidence.map((item) => (
              <div key={item.receipt_id} className="criterion">
                <header>
                  <span className="mono-label">
                    {evidenceLabel(item.receipt_id)} · {ROLE_LABELS[item.evidence_role]} ·{" "}
                    {item.criterion_id ? criterionLabel(item.criterion_id) : "Mandate-wide"}
                  </span>
                  <span className={`chip ${item.sealed ? "dark" : ""}`}>
                    {item.sealed ? "Sealed" : "Open"}
                  </span>
                </header>
                <p>{item.captured_summary || "No source summary was supplied."}</p>
                <div className="data-row">
                  <span>Source</span>
                  <a
                    className="address"
                    href={externalUrl(item.url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.url.slice(0, 64)}
                  </a>
                </div>
                <div className="data-row">
                  <span>Independence claim</span>
                  <span>{item.claimed_independence.toLowerCase().replaceAll("_", " ")}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {contest ? (
          <div className="panel">
            <h3>Contest</h3>
            <p className="lede">{contest.claim}</p>
            <div className="data-row">
              <span>Criteria named</span>
              <span>{contest.contested_criteria.map(criterionLabel).join(", ")}</span>
            </div>
            <div className="data-row">
              <span>Operator response</span>
              <span>{contest.operator_response || "Not filed"}</span>
            </div>
          </div>
        ) : null}

        {rulings.length > 0 ? (
          <div className="panel">
            <h3>Rulings</h3>
            <p className="lede">
              Every round is append-only. Explanatory prose is visible, but only
              criterion outcomes affect score and settlement.
            </p>
            {rulings.map((ruling) => (
              <div key={ruling.ruling_id} className="criterion">
                <header>
                  <span className="mono-label">
                    Round {ruling.round_number} · score {ruling.score}
                  </span>
                  <span className="chip accent">
                    {RULING_LABELS[ruling.ruling]}
                  </span>
                </header>
                <p>{ruling.reasoning}</p>
                {ruling.integrity_flags.length > 0 ? (
                  <p className="notice warn" style={{ marginTop: 12 }}>
                    {ruling.integrity_flags
                      .map((flag) => FLAG_LABELS[flag] ?? "Integrity issue detected")
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {settlement ? (
          <div className="panel">
            <h3>Settlement</h3>
            <div className="data-row">
              <span>Policy applied</span>
              <span>{POLICY_LABELS[settlement.policy_applied]}</span>
            </div>
            <div className="data-row">
              <span>Score</span>
              <span>{settlement.score} of 100</span>
            </div>
            <div className="data-row">
              <span>Operator payout</span>
              <span>{fromWei(settlement.operator_payout)} GEN</span>
            </div>
            <div className="data-row">
              <span>Client payout</span>
              <span>{fromWei(settlement.client_payout)} GEN</span>
            </div>
          </div>
        ) : null}
      </div>

      <aside>
        <div className="panel">
          <h3>Your move</h3>
          <p className="lede">
            {isClient
              ? "This wallet is the client."
              : isOperator
                ? "This wallet is the operator."
                : "Connect a party wallet to act. Reading remains public."}
          </p>
          <WalletNotice />
          {address && !isParty ? (
            <p className="notice warn">This wallet is not a party to the mandate.</p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
            {m.status === "DRAFT" && isClient
              ? actionButton("Fund mandate", () =>
                  client.fundMandate(m.mandate_id, BigInt(m.payment_wei)),
                )
              : null}
            {["DRAFT", "ESCROWED"].includes(m.status) && isClient
              ? actionButton("Cancel", () => client.cancelMandate(m.mandate_id))
              : null}
            {m.status === "ESCROWED" && isOperator
              ? actionButton("Accept work", () =>
                  client.acceptMandate(
                    m.mandate_id,
                    "",
                    BigInt(m.operator_bond_wei),
                  ),
                )
              : null}
            {m.status === "DELIVERED" && isClient
              ? actionButton("Approve work", () => client.approveWork(m.mandate_id))
              : null}
            {m.status === "CONTESTED" && isParty
              ? actionButton("Seal record", () => client.sealRecord(m.mandate_id))
              : null}
            {["RECORD_SEALED", "APPEALED"].includes(m.status)
              ? actionButton("Run adjudication", () => client.adjudicate(m.mandate_id))
              : null}
            {m.status === "RULING"
              ? actionButton("Finalize ruling", () => client.finalizeRuling(m.mandate_id))
              : null}
            {["APPROVED", "FINALIZED"].includes(m.status)
              ? actionButton("Settle custody", () => client.settle(m.mandate_id))
              : null}
            {["ENGAGED", "ESCROWED"].includes(m.status)
              ? actionButton("Mark lapsed", () => client.lapseMandate(m.mandate_id))
              : null}
            {["LAPSED", "FINALIZED"].includes(m.status)
              ? actionButton("Recover custody", () => client.recoverEscrow(m.mandate_id))
              : null}
            <button
              type="button"
              className="t-btn small ghost"
              disabled={!address || !onRightNetwork || busy}
              onClick={() => void transact("Protocol tick", () => client.tick())}
            >
              Advance clock
            </button>
            <button
              type="button"
              className="t-btn small ghost"
              disabled={query.loading}
              onClick={() => void query.refresh()}
            >
              Refresh
            </button>
          </div>
          {phase !== "idle" ? (
            <p className="notice" style={{ marginTop: 14 }}>
              {PHASE_LABELS[phase]}
              {txHash ? " · transaction reference available for support" : ""}
            </p>
          ) : null}
          {message ? <p className="notice">{message}</p> : null}
          {actionError ? <p className="notice danger">{actionError}</p> : null}
          <p className="mono-label" style={{ marginTop: 16 }}>
            <a href={CONTRACT_EXPLORER_URL} target="_blank" rel="noreferrer">
              Open live contract in explorer
            </a>
          </p>
        </div>

        {canAct && isClient && m.status === "DRAFT" ? (
          <div className="panel">
            <h3>Amend draft terms</h3>
            <p className="lede">
              Draft wording can change before funding. The acceptance checklist
              and settlement rules remain as originally recorded in this editor.
            </p>
            <label className="field">
              <span>Revised title</span>
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder={m.title}
              />
            </label>
            <label className="field">
              <span>Revised agreement</span>
              <textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                placeholder={m.description}
              />
            </label>
            <label className="field">
              <span>Revised evidence rules</span>
              <input
                value={draftRules}
                onChange={(event) => setDraftRules(event.target.value)}
                placeholder={m.evidence_rules || "Public evidence requirements"}
              />
            </label>
            <button
              className="t-btn small accent"
              type="button"
              disabled={busy}
              onClick={() =>
                void transact("Draft amendment", () =>
                  client.updateDraft(
                    m.mandate_id,
                    draftTitle.trim() || m.title,
                    draftDescription.trim() || m.description,
                    m.criteria,
                    draftRules.trim() || m.evidence_rules,
                  ),
                )
              }
            >
              Save draft amendment
            </button>
          </div>
        ) : null}

        {canAct && ["ESCROWED", "ENGAGED", "DELIVERED", "CONTESTED"].includes(m.status) ? (
          <div className="panel">
            <h3>File evidence</h3>
            <label className="field">
              <span>Criterion</span>
              <select
                value={evidenceCriterion}
                onChange={(event) => setEvidenceCriterion(event.target.value)}
              >
                <option value="">Mandate-wide source</option>
                {m.criteria.map((criterion) => (
                  <option key={criterion.id} value={criterion.id}>
                    {criterionLabel(criterion.id)} — {criterion.text.slice(0, 45)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Public source URL</span>
              <input
                value={evidenceUrl}
                onChange={(event) => setEvidenceUrl(event.target.value)}
                placeholder="https://…"
              />
            </label>
            <label className="field">
              <span>Role</span>
              <select
                value={evidenceRole}
                onChange={(event) =>
                  setEvidenceRole(event.target.value as EvidenceRole)
                }
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>What the source shows</span>
              <textarea
                value={evidenceSummary}
                onChange={(event) => setEvidenceSummary(event.target.value)}
              />
            </label>
            <button
              className="t-btn small accent"
              type="button"
              disabled={busy || !evidenceUrl}
              onClick={() =>
                void transact("Evidence receipt", () =>
                  client.submitEvidence(m.mandate_id, {
                    criterionId: evidenceCriterion,
                    url: evidenceUrl,
                    evidenceRole,
                    claimedContentHash: "",
                    contentType: "text/html",
                    sourceIdentity: "",
                    claimedIndependence: "UNKNOWN",
                    capturedSummary: evidenceSummary,
                  }),
                )
              }
            >
              File receipt
            </button>
          </div>
        ) : null}

        {canAct && isOperator && m.status === "ENGAGED" ? (
          <div className="panel">
            <h3>Deliver the work</h3>
            <label className="field">
              <span>Public deliverable URL</span>
              <input
                value={deliverableUri}
                onChange={(event) => setDeliverableUri(event.target.value)}
                placeholder="https://…"
              />
            </label>
            <button
              className="t-btn small accent"
              type="button"
              disabled={busy || !deliverableUri}
              onClick={() =>
                void transact("Deliverable", () =>
                  client.submitDeliverable(m.mandate_id, deliverableUri, ""),
                )
              }
            >
              Submit deliverable
            </button>
          </div>
        ) : null}

        {canAct && isClient && m.status === "DELIVERED" ? (
          <div className="panel">
            <h3>Contest delivery</h3>
            <p className="lede">Name the criteria that the delivered work missed.</p>
            {m.criteria.map((criterion) => (
              <label
                key={criterion.id}
                className="data-row"
                style={{ cursor: "pointer", alignItems: "center" }}
              >
                <span>{criterionLabel(criterion.id)} — {criterion.text.slice(0, 54)}</span>
                <input
                  type="checkbox"
                  checked={contestSelection.includes(criterion.id)}
                  onChange={(event) =>
                    setContestSelection((current) =>
                      event.target.checked
                        ? [...current, criterion.id]
                        : current.filter((id) => id !== criterion.id),
                    )
                  }
                />
              </label>
            ))}
            <label className="field" style={{ marginTop: 14 }}>
              <span>Claim</span>
              <textarea
                value={contestClaim}
                onChange={(event) => setContestClaim(event.target.value)}
              />
            </label>
            <button
              className="t-btn small"
              type="button"
              disabled={busy || !contestClaim || contestSelection.length === 0}
              onClick={() =>
                void transact("Contest", () =>
                  client.openContest(
                    m.mandate_id,
                    contestSelection,
                    contestClaim,
                    [],
                    BigInt(m.contest_bond_wei),
                  ),
                )
              }
            >
              Open contest
            </button>
          </div>
        ) : null}

        {canAct && isOperator && m.status === "CONTESTED" ? (
          <div className="panel">
            <h3>Answer contest</h3>
            <label className="field">
              <span>Operator response</span>
              <textarea
                value={responseText}
                onChange={(event) => setResponseText(event.target.value)}
              />
            </label>
            <button
              className="t-btn small accent"
              type="button"
              disabled={busy || !responseText}
              onClick={() =>
                void transact("Contest response", () =>
                  client.respondToContest(m.mandate_id, responseText, []),
                )
              }
            >
              File response
            </button>
          </div>
        ) : null}

        {canAct && m.status === "RULING" && m.appeal_count < 1 ? (
          <div className="panel">
            <h3>Appeal</h3>
            <p className="lede">
              One appeal over the same sealed record, available until protocol
              tick {m.appeal_deadline_tick}.
            </p>
            <label className="field">
              <span>Grounds</span>
              <textarea
                value={appealGrounds}
                onChange={(event) => setAppealGrounds(event.target.value)}
              />
            </label>
            <button
              className="t-btn small"
              type="button"
              disabled={busy || !appealGrounds}
              onClick={() =>
                void transact("Appeal", () =>
                  client.appeal(m.mandate_id, appealGrounds),
                )
              }
            >
              Open appeal
            </button>
          </div>
        ) : null}

        <div className="panel">
          <h3>Settlement rules</h3>
          <div className="data-row">
            <span>Confirmed</span>
            <span>{POLICY_LABELS[m.policies.confirmed]}</span>
          </div>
          <div className="data-row">
            <span>Partially met</span>
            <span>{POLICY_LABELS[m.policies.partial]}</span>
          </div>
          <div className="data-row">
            <span>Rejected</span>
            <span>{POLICY_LABELS[m.policies.rejected]}</span>
          </div>
          <div className="data-row">
            <span>Inconclusive</span>
            <span>{POLICY_LABELS[m.policies.inconclusive]}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
