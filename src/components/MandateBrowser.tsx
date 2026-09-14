"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useAttestra, useLiveQuery } from "@/lib/useAttestra";
import { fromWei, mandateLabel } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/protocol/vocabulary";
import type { Mandate } from "@/lib/attestra";

const FILTERS = [
  ["ALL", "All"],
  ["OPEN", "Open"],
  ["DELIVERED", "Under review"],
  ["CONTESTED", "Contested"],
  ["RULING", "Ruled"],
  ["SETTLED", "Settled"],
  ["MINE", "Mine"],
] as const;

export function MandateBrowser() {
  const { address } = useAttestra();
  const [filter, setFilter] = useState("ALL");
  const query = useLiveQuery<Mandate[]>(async (client) => {
    const page = await client.listMandates(0, 100);
    const details = await Promise.all(
      page.items.map((item) => client.getMandate(item.mandate_id)),
    );
    return details.reverse();
  });

  const visible = useMemo(() => {
    return (query.data ?? []).filter((item) => {
      if (filter === "ALL") return true;
      if (filter === "MINE") {
        return address
          ? item.client.toLowerCase() === address ||
              item.operator.toLowerCase() === address
          : false;
      }
      if (filter === "OPEN") {
        return ["DRAFT", "ESCROWED", "ENGAGED"].includes(item.status);
      }
      if (filter === "CONTESTED") {
        return [
          "CONTESTED",
          "RECORD_SEALED",
          "REVIEWING",
          "APPEALED",
          "FINAL_REVIEW",
        ].includes(item.status);
      }
      if (filter === "RULING") {
        return ["RULING", "FINALIZED"].includes(item.status);
      }
      return item.status === filter;
    });
  }, [query.data, filter, address]);

  return (
    <>
      <div className="filter-row" aria-label="Registry filters">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`filter-button ${filter === key ? "is-active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
        <button
          className="filter-button"
          type="button"
          onClick={() => void query.refresh()}
        >
          Refresh
        </button>
        <Link className="t-btn small" href="/mandates/new" style={{ marginLeft: "auto" }}>
          Open a mandate
        </Link>
      </div>

      {query.error ? <p className="notice danger">{query.error}</p> : null}

      {query.loading && !query.data ? (
        <p className="list-state">Reading the StudioNet registry…</p>
      ) : visible.length === 0 ? (
        <div className="list-state">
          <p>
            {filter === "ALL"
              ? "No mandate has been recorded by this contract yet."
              : "Nothing on chain matches this filter."}
          </p>
          {filter === "ALL" ? (
            <Link className="t-btn small accent" href="/mandates/new">
              Create the first mandate
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="card-grid">
          {visible.map((item) => (
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
    </>
  );
}
