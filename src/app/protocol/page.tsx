import { notFound } from "next/navigation";

import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

const STAGES = [
  ["Draft", "The client writes the agreement, the weighted criteria and the settlement rules. Everything is editable and nothing is held."],
  ["Funded", "The payment moves into custody, the terms lock and the checklist is fingerprinted. Nothing is editable after this point."],
  ["In progress", "The operator has accepted the work and posted the performance bond, if the agreement asks for one."],
  ["Under review", "The deliverable is filed. The client can approve it, or contest it by naming the criteria that were not met."],
  ["Contested", "Both sides file their account and their sources. Nothing is decided yet."],
  ["Record sealed", "The admissible evidence is snapshotted and hashed. Nothing filed afterwards is part of the record."],
  ["Ruling issued", "An adjudication round returns a result for each criterion. The contract sums the frozen weights itself."],
  ["Finalized", "The appeal window has elapsed and the ruling became payable. One ruling is pinned so a later round cannot redirect it."],
  ["Settled", "Custody is released according to the rule both parties agreed before the work began."],
];

const GUARANTEES = [
  ["The panel never names an amount", "It reports whether each criterion was met. Amounts, percentages and recipients are computed by the contract from the weights that were frozen at funding."],
  ["Unavailable evidence never passes", "A source that cannot be retrieved supports an inconclusive outcome. The body of an error page is not the document somebody claimed to cite."],
  ["Terms and money are separate", "Settlement reads what the chain actually moved, not what was agreed. A smaller deposit settles over the smaller number."],
  ["A failed round costs nothing", "If a round does not reach agreement, no ruling is stored, no custody moves and the mandate stays where it was so the call can be retried."],
  ["Bonds return to whoever posted them", "A client who contests and loses is not punished, and an operator who underperforms is not slashed. Ordinary task failure is not misconduct."],
  ["Value leaves through one door", "There is one transfer helper, called from three places, with recipients read from storage. No function accepts a recipient and an amount from a caller."],
];

export default function ProtocolPage() {
  if (!FEATURES.protocol) notFound();

  return (
    <section className="page-zone">
      <div className="t-shell">
        <div className="zone-head">
          <div>
            <div className="t-kicker muted">How it works</div>
            <h1>
              The <span>Protocol</span>
            </h1>
            <p>
              A panel decides what the evidence shows. The contract decides what follows
              from it. The two are separated on purpose.
            </p>
          </div>
        </div>

        <div className="detail-layout">
          <div className="panel">
            <h3>The life of a mandate</h3>
            <p className="lede">
              Each stage has one legal set of next steps, and every write checks the stage
              before it does anything else.
            </p>
            <ul className="timeline">
              {STAGES.map(([title, body]) => (
                <li key={title}>
                  <strong>{title}</strong>
                  {body}
                </li>
              ))}
            </ul>
          </div>

          <aside>
            <div className="panel">
              <h3>Outcomes and money</h3>
              <div className="data-row">
                <span>Every criterion met</span>
                <span>Released in full</span>
              </div>
              <div className="data-row">
                <span>Some met, some not</span>
                <span>Split by score</span>
              </div>
              <div className="data-row">
                <span>Work rejected</span>
                <span>Returned to the client</span>
              </div>
              <div className="data-row">
                <span>Record cannot decide</span>
                <span>Held for human review</span>
              </div>
            </div>

            <div className="panel">
              <h3>The clock</h3>
              <p className="lede">
                Deadlines are counted in protocol ticks rather than wall-clock time,
                because a deadline that silently reads zero is worse than one that is
                openly abstract. Any account can advance the clock.
              </p>
            </div>
          </aside>
        </div>

        <div className="card-grid" style={{ marginTop: 40 }}>
          {GUARANTEES.map(([title, body]) => (
            <article key={title} className="t-card">
              <div className="card-top">
                <span className="chip accent">Guarantee</span>
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
