import Link from "next/link";

import { FEATURES } from "@/lib/features";
import { MANDATE_TEMPLATES } from "@/lib/sample-mandates";

/** Template selection only. Creation still happens through a user signature. */
export function SampleMandateCatalog() {
  return (
    <section className="page-zone" style={{ paddingTop: 0 }}>
      <div className="t-shell">
        <div className="zone-head">
          <div>
            <div className="t-kicker muted">Prepared live scenarios</div>
            <h2>
              Sample <span>Mandates</span>
            </h2>
            <p>
              Choose a template and the form fills the agreement, checklist,
              amounts and protocol windows. Every action is then signed by your
              MetaMask wallet and written directly to the live contract.
            </p>
          </div>
          {FEATURES.guide ? (
            <Link className="t-btn small ghost" href="/guide">
              Read the testing guide
            </Link>
          ) : null}
        </div>

        <div className="card-grid">
          {MANDATE_TEMPLATES.map((template) => (
            <article key={template.id} className="t-card">
              <div className="card-top">
                <span className="chip accent">{template.badge}</span>
                <span className="mono-label">Live transaction</span>
              </div>
              <h3>{template.name}</h3>
              <p>{template.purpose}</p>
              <div className="data-row" style={{ marginTop: 18 }}>
                <span>Payment</span>
                <span>{template.paymentGen} GEN</span>
              </div>
              <div className="data-row">
                <span>Operator bond</span>
                <span>{template.operatorBondGen} GEN</span>
              </div>
              <div className="data-row">
                <span>Criteria</span>
                <span>{template.criteria.length} weighted items</span>
              </div>
              <div className="card-foot">
                <span className="mono-label">
                  Execution {template.executionTicks} steps
                </span>
                {FEATURES.mandates ? (
                  <Link
                    className="t-btn small"
                    href={`/mandates/new?sample=${template.id}`}
                  >
                    Use sample
                  </Link>
                ) : (
                  <span className="mono-label">Mandate creation disabled</span>
                )}
              </div>
            </article>
          ))}
        </div>

        <p className="notice" style={{ marginTop: 20 }}>
          Selecting a template does not create a mandate. You review the terms,
          connect both participating MetaMask accounts as needed, and sign each
          step against StudioNet chain 61999.
        </p>
      </div>
    </section>
  );
}
