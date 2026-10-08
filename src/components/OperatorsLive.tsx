"use client";

import type { Passport } from "@/lib/attestra";
import { fromWei, walletLabel } from "@/lib/format";
import { useLiveQuery } from "@/lib/useAttestra";

export function OperatorsLive() {
  const query = useLiveQuery<Passport[]>(async (client) => {
    const page = await client.listMandates(0, 100);
    const addresses = Array.from(
      new Set(page.items.map((item) => item.operator.toLowerCase())),
    );
    return Promise.all(addresses.map((address) => client.getPassport(address)));
  });

  if (query.loading && !query.data) {
    return <p className="list-state">Reading operator passports from StudioNet…</p>;
  }
  if (query.error) return <p className="notice danger">{query.error}</p>;
  if (!query.data?.length) {
    return (
      <div className="list-state">
        No operator appears in the live mandate registry yet.
      </div>
    );
  }

  return (
    <>
      <div className="filter-row">
        <button className="filter-button" onClick={() => void query.refresh()}>
          Refresh chain state
        </button>
      </div>
      <div className="card-grid">
        {query.data
          .sort((a, b) => b.average_score - a.average_score)
          .map((entry) => (
            <article key={entry.operator} className="t-card">
              <div className="card-top">
                <span className="chip accent">
                  Average score {entry.average_score}
                </span>
                <span className="mono-label">
                  {entry.scored_mandates} scored
                </span>
              </div>
              <h3 style={{ fontSize: 20 }}>
                {walletLabel(entry.operator, "Operator")}
              </h3>
              <div className="data-row">
                <span>Confirmed</span>
                <span>{entry.mandates_confirmed}</span>
              </div>
              <div className="data-row">
                <span>Partially met</span>
                <span>{entry.mandates_partial}</span>
              </div>
              <div className="data-row">
                <span>Rejected</span>
                <span>{entry.mandates_rejected}</span>
              </div>
              <div className="data-row">
                <span>Inconclusive</span>
                <span>{entry.mandates_inconclusive}</span>
              </div>
              <div className="data-row">
                <span>Contests faced</span>
                <span>{entry.contests_faced}</span>
              </div>
              <div className="card-foot">
                <span className="mono-label">Verified value</span>
                <span className="amount">
                  {fromWei(entry.verified_value_wei)} GEN
                </span>
              </div>
            </article>
          ))}
      </div>
    </>
  );
}
