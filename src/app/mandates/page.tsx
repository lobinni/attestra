import { notFound } from "next/navigation";

import { MandateBrowser } from "@/components/MandateBrowser";
import { FEATURES } from "@/lib/features";

export default function MandatesPage() {
  if (!FEATURES.mandates) notFound();

  return (
    <section className="page-zone">
      <div className="t-shell">
        <div className="zone-head">
          <div>
            <div className="t-kicker muted">Live StudioNet registry</div>
            <h1>
              Mandate <span>Registry</span>
            </h1>
            <p>
              Every agreement returned by the deployed contract, at every stage
              of its lifecycle. Reading requires no wallet.
            </p>
          </div>
        </div>
        <MandateBrowser />
      </div>
    </section>
  );
}
