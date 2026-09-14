import { notFound } from "next/navigation";

import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

const CLIENT_STEPS = [
  "Connect MetaMask to GenLayer StudioNet chain 61999. The connected account becomes the client on anything you open.",
  "Open a mandate: write the agreement, name the operator, weight the criteria so they total one hundred, and mark anything non-negotiable.",
  "Fund it. The payment moves into custody, the terms lock and the checklist is fingerprinted.",
  "Review the delivery. Approve it and the operator is paid in full.",
  "Or contest it, naming the criteria that were not met and saying why. Then seal the record and ask for an adjudication round.",
  "Once the appeal window has elapsed, finalize the ruling and settle. The split follows the rule agreed at the start.",
];

const OPERATOR_STEPS = [
  "Connect the MetaMask account named as the operator in the on-chain mandate.",
  "Accept the work and post the performance bond if the agreement asks for one.",
  "File sources as you go, binding each one to the criterion it supports.",
  "Submit the deliverable before the execution deadline.",
  "If the work is contested, answer it and file counter sources, then let the sealed record speak.",
  "Collect. The bond returns whether the ruling went your way or not.",
];

const CHECKS = [
  ["Funding must be exact", "Try funding with the wrong amount. The action is refused and nothing is held."],
  ["Terms lock at funding", "Try editing a funded mandate. The amendment path exists so that tampering has something to fail against."],
  ["A contest must name criteria", "Try contesting with nothing selected. The panel cannot answer a complaint that names nothing."],
  ["Unreachable sources do not pass", "File a source at an address that does not resolve, seal the record and run a round. The criterion comes back inconclusive and custody does not move."],
  ["Settlement waits for the window", "Try settling straight after a ruling. It is refused until the appeal window has elapsed and the ruling has been finalized."],
  ["Custody always reaches zero", "After any settlement, the amount held on the mandate reads zero and the parts sum to what was deposited."],
];

export default function GuidePage() {
  if (!FEATURES.guide) notFound();

  return (
    <section className="page-zone">
      <div className="t-shell">
        <div className="zone-head">
          <div>
            <div className="t-kicker muted">Getting started</div>
            <h1>
              Using <span>Attestra</span>
            </h1>
            <p>
              Every record is read directly from the deployed StudioNet contract.
              Acting on a mandate requires the MetaMask account named in the agreement.
            </p>
          </div>
        </div>

        <div className="detail-layout">
          <div>
            <div className="panel">
              <h3>Hiring an operator</h3>
              <ul className="timeline">
                {CLIENT_STEPS.map((step, index) => (
                  <li key={step}>
                    <strong>Step {index + 1}</strong>
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <h3>Taking on work</h3>
              <ul className="timeline">
                {OPERATOR_STEPS.map((step, index) => (
                  <li key={step}>
                    <strong>Step {index + 1}</strong>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside>
            <div className="panel">
              <h3>Connecting a wallet</h3>
              <p className="lede">
                Use the connect control in the header. The site asks MetaMask to
                switch to StudioNet chain 61999 and offers to add it when needed.
                No seed phrase, private key or password is ever requested or stored.
              </p>
              <div className="data-row">
                <span>Network</span>
                <span>GenLayer StudioNet</span>
              </div>
              <div className="data-row">
                <span>Chain</span>
                <span>61999</span>
              </div>
              <div className="data-row">
                <span>Currency</span>
                <span>GEN</span>
              </div>
            </div>

            <div className="panel">
              <h3>Moving the clock</h3>
              <p className="lede">
                Deadlines are measured in protocol steps. Any connected account
                can advance the clock from a mandate page to test execution and
                appeal deadlines.
              </p>
            </div>

            <div className="panel">
              <h3>Live manual samples</h3>
              <p className="lede">
                Start from a prepared mandate on the overview page, review the
                terms, and sign each step in MetaMask. The repository also
                includes six guided scenarios, evidence fixtures and a release
                checklist in the samples folder.
              </p>
            </div>
          </aside>
        </div>

        <div className="zone-head" style={{ marginTop: 60 }}>
          <div>
            <div className="t-kicker muted">Try it yourself</div>
            <h2>
              Six <span>Checks</span>
            </h2>
            <p>
              Each one takes a minute and each one fails loudly if the protocol is not
              behaving.
            </p>
          </div>
        </div>

        <div className="card-grid">
          {CHECKS.map(([title, body]) => (
            <article key={title} className="t-card">
              <div className="card-top">
                <span className="chip accent">Check</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
