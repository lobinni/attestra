"use client";

import { CONTRACT_EXPLORER_URL } from "@/lib/config";
import { useLiveQuery } from "@/lib/useAttestra";

/** Human-readable live deployment status; technical proof remains in docs. */
export function ContractSettings() {
  const query = useLiveQuery((client) => client.getProtocolInfo());

  return (
    <div className="panel">
      <div className="card-top">
        <span className={`chip ${query.data ? "accent" : "warn"}`}>
          {query.loading ? "Checking network" : query.data ? "Live" : "Unavailable"}
        </span>
        <span className="mono-label">Accepted network state</span>
      </div>
      <h3 style={{ marginTop: 20 }}>Active deployment</h3>
      <p className="lede">
        The interface reads the verified contract directly and asks MetaMask to
        sign every action. Nothing is copied into an application database.
      </p>
      <div className="data-row">
        <span>Network</span>
        <span>GenLayer StudioNet · chain 61999</span>
      </div>
      <div className="data-row">
        <span>Contract status</span>
        <span>{query.data ? "Responding normally" : "Being checked"}</span>
      </div>
      <div className="data-row">
        <span>Protocol clock</span>
        <span>{query.data?.current_tick ?? "—"}</span>
      </div>
      <div className="data-row">
        <span>Mandates recorded</span>
        <span>{query.data?.mandate_count ?? "—"}</span>
      </div>
      <div className="data-row">
        <span>Source verification</span>
        <span>Exact match confirmed</span>
      </div>
      {query.error ? (
        <p className="notice danger">
          The live contract could not be reached. Try the network check again.
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        <button
          className="t-btn small ghost"
          type="button"
          onClick={() => void query.refresh()}
          disabled={query.loading}
        >
          Check live status
        </button>
        <a
          className="t-btn small"
          href={CONTRACT_EXPLORER_URL}
          target="_blank"
          rel="noreferrer"
        >
          View verified deployment
        </a>
      </div>
      <p className="notice" style={{ marginTop: 18 }}>
        Deployment replacement is handled in hosting configuration and the
        deployment manifest. Visitors never need to edit technical settings.
      </p>
    </div>
  );
}
