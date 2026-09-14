"use client";

import Link from "next/link";

import type { Mandate } from "@/lib/attestra";
import { FEATURES } from "@/lib/features";
import { fromWei, mandateLabel } from "@/lib/format";
import { useLiveQuery } from "@/lib/useAttestra";
import { STATUS_LABELS } from "@/lib/protocol/vocabulary";

interface HomeData {
  tick: number;
  count: number;
  open: number;
  contested: number;
  settled: number;
  operatorCount: number;
  custody: bigint;
  recent: Mandate[];
}

export function HomeLive() {
  const query = useLiveQuery<HomeData>(async (client) => {
    const [protocol, page] = await Promise.all([
      client.getProtocolInfo(),
      client.listMandates(0, 100),
    ]);
    const details = await Promise.all(
      page.items.map((item) => client.getMandate(item.mandate_id)),
    );
    const open = details.filter((item) =>
      ["DRAFT", "ESCROWED", "ENGAGED", "DELIVERED"].includes(item.status),
    ).length;
    const contested = details.filter((item) =>
      [
        "CONTESTED",
        "RECORD_SEALED",
        "REVIEWING",
        "RULING",
        "APPEALED",
        "FINAL_REVIEW",
        "FINALIZED",
      ].includes(item.status),
    ).length;
    return {
      tick: protocol.current_tick,
      count: protocol.mandate_count,
      open,
      contested,
      settled: details.filter((item) => item.status === "SETTLED").length,
      operatorCount: new Set(details.map((item) => item.operator.toLowerCase())).size,
      custody: details.reduce(
        (total, item) => total + BigInt(item.custody_held || "0"),
        BigInt(0),
      ),
      recent: [...details].reverse().slice(0, 6),
    };
  });

  const data = query.data ?? {
    tick: 0,
    count: 0,
    open: 0,
    contested: 0,
    settled: 0,
    operatorCount: 0,
    custody: BigInt(0),
    recent: [],
  };

  return (
    <>
      <section className="t-shell">
        <div className="t-hero">
          <svg
            className="hero-lanes"
            viewBox="0 0 1200 680"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M70 90 C210 160 130 270 230 330 S110 520 210 610" />
            <path d="M1130 110 C1000 170 1090 265 980 340 S1110 505 1000 600" />
            <path d="M20 420 C260 380 420 470 620 430 S980 350 1180 400" />
          </svg>

          <div className="hero-copy">
            <div className="t-kicker">StudioNet · Chain 61999 · Live contract</div>
            <h1>
              Payment That <span>Waits</span>
              <br />
              For The Evidence
            </h1>
            <p>
              Agree the criteria, fund the work, and let independent validators
              read the sealed record. Custody releases on what the evidence
              supports, never on what a single party asserts.
            </p>
            <div className="hero-proof" aria-label="Live protocol status">
              <span>
                <i />
                {data.count} mandates on chain
              </span>
              <span>
                <i />
                {fromWei(data.custody)} GEN held
              </span>
              <span>
                <i />
                {data.operatorCount} recorded operators
              </span>
            </div>
            {FEATURES.mandates ? (
              <div className="hero-actions">
                <Link className="t-btn accent" href="/mandates">
                  Browse mandates
                </Link>
                <Link className="t-btn ghost" href="/mandates/new">
                  Open a mandate
                </Link>
              </div>
            ) : null}
          </div>

          <div className="hero-corner-meta">
            <span>Protocol tick {data.tick}</span>
            <span>Custody {fromWei(data.custody)} GEN</span>
            <span>{query.loading ? "Reading chain" : "Accepted state"}</span>
          </div>
        </div>
      </section>

      <section className="page-zone">
        <div className="t-shell">
          <div className="zone-head">
            <div>
              <div className="t-kicker muted">Live registry · {data.open} open</div>
              <h2>
                Verification <span>Hub</span>
              </h2>
              <p>
                Every visible record is read from the deployed StudioNet
                contract. The application keeps no parallel database.
              </p>
            </div>
            <button className="t-btn small ghost" onClick={() => void query.refresh()}>
              Refresh chain state
            </button>
          </div>

          {query.error ? <p className="notice danger">{query.error}</p> : null}

          {FEATURES.liveStats ? (
            <div className="stat-strip">
              <div>
                <span className="mono-label">Open work</span>
                <strong>{data.open}</strong>
              </div>
              <div>
                <span className="mono-label">Adjudication path</span>
                <strong>{data.contested}</strong>
              </div>
              <div>
                <span className="mono-label">Settled</span>
                <strong>{data.settled}</strong>
              </div>
              <div>
                <span className="mono-label">Protocol tick</span>
                <strong>{data.tick}</strong>
              </div>
            </div>
          ) : null}

          {!FEATURES.mandates ? null : query.loading && !query.data ? (
            <p className="list-state">Reading accepted StudioNet state…</p>
          ) : data.recent.length === 0 ? (
            <div className="list-state">
              <p>No mandate has been created on this deployment yet.</p>
              <Link className="t-btn small accent" href="/mandates/new">
                Create the first mandate
              </Link>
            </div>
          ) : (
            <div className="card-grid" style={{ marginTop: 40 }}>
              {data.recent.map((item) => (
                <Link
                  key={item.mandate_id}
                  className="t-card"
                  href={`/mandates/${item.mandate_id}`}
                >
                  <div className="card-top">
                    <span className="chip accent">
                      {STATUS_LABELS[item.status] ?? "Unknown stage"}
                    </span>
                    <span className="mono-label">{mandateLabel(item.mandate_id)}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="card-foot">
                    <span className="mono-label">
                      {item.criterion_count} criteria · held {fromWei(item.custody_held)} GEN
                    </span>
                    <span className="amount">{fromWei(item.payment_wei)} GEN</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {FEATURES.outcomes ? (
      <section className="page-zone" style={{ paddingTop: 0 }}>
        <div className="t-shell">
          <div className="zone-head">
            <div>
              <div className="t-kicker muted">How custody resolves</div>
              <h2>
                Four <span>Outcomes</span>
              </h2>
              <p>
                Validators report what the record shows. The contract applies
                the policy both parties froze before execution.
              </p>
            </div>
          </div>
          <div className="card-grid">
            {[
              ["Confirmed", "Every criterion met", "The operator receives the payment in full."],
              ["Partially met", "Some met, some not", "Custody splits by the score derived from frozen weights."],
              ["Rejected", "The agreement was missed", "The payment returns to the client."],
              ["Inconclusive", "The record cannot decide", "Custody stays held for human review rather than guessing."],
            ].map(([badge, title, body]) => (
              <article className="t-card" key={badge}>
                <div className="card-top">
                  <span className="chip accent">{badge}</span>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      ) : null}
    </>
  );
}
