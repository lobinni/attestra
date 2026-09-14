import { notFound } from "next/navigation";

import { ContractSettings } from "@/components/ContractSettings";
import { FEATURES } from "@/lib/features";
import deployment from "../../../deployments/studionet.json";

export default function ContractPage() {
  if (!FEATURES.contract) notFound();

  return (
    <section className="page-zone">
      <div className="t-shell">
        <div className="zone-head">
          <div>
            <div className="t-kicker muted">Canonical deployment</div>
            <h1>
              Contract <span>Proof</span>
            </h1>
            <p>
              A readable summary of the live deployment. Full technical proof
              remains available in the repository and public explorer.
            </p>
          </div>
        </div>

        <div className="detail-layout">
          <ContractSettings />
          <aside>
            <div className="panel">
              <h3>Independent verification</h3>
              <p className="lede">
                The source published by StudioNet was compared with the source
                in this repository. The comparison found an exact match after
                normalizing transport line endings.
              </p>
              <div className="data-row">
                <span>Source completeness</span>
                <span>{deployment.contract.sourceLines.toLocaleString()} lines confirmed</span>
              </div>
              <div className="data-row">
                <span>Public interface</span>
                <span>Ten reads and eighteen actions</span>
              </div>
              <div className="data-row">
                <span>Verification</span>
                <span>Passed</span>
              </div>
              <div className="data-row">
                <span>Network</span>
                <span>StudioNet</span>
              </div>
            </div>

            <div className="panel">
              <h3>What this proves</h3>
              <p className="notice">
                The website is connected to the same contract represented by
                this repository. The network reports the expected interface,
                and the contract answers live reads successfully.
              </p>
              <a
                className="t-btn small ghost"
                href={deployment.contract.explorerUrl}
                target="_blank"
                rel="noreferrer"
                style={{ marginTop: 16 }}
              >
                Open public explorer
              </a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
