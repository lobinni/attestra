import { notFound } from "next/navigation";

import { OperatorsLive } from "@/components/OperatorsLive";
import { FEATURES } from "@/lib/features";

export default function OperatorsPage() {
  if (!FEATURES.operators) notFound();

  return (
    <section className="page-zone">
      <div className="t-shell">
        <div className="zone-head">
          <div>
            <div className="t-kicker muted">On-chain verification history</div>
            <h1>
              Operator <span>Record</span>
            </h1>
            <p>
              Transparent outcome counts read from StudioNet, never an opaque
              application score or a database profile.
            </p>
          </div>
        </div>
        <OperatorsLive />
      </div>
    </section>
  );
}
