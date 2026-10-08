import { notFound } from "next/navigation";

import { CreateMandateForm } from "@/components/CreateMandateForm";
import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

export default function NewMandatePage() {
  if (!FEATURES.mandates) notFound();

  return (
    <section className="page-zone">
      <div className="t-shell">
        <div className="zone-head">
          <div>
            <div className="t-kicker muted">New agreement</div>
            <h1>
              Open A <span>Mandate</span>
            </h1>
            <p>
              Write the agreement, weight the criteria, and choose what each possible
              outcome does to the money. Funding freezes all of it.
            </p>
          </div>
        </div>
        <CreateMandateForm />
      </div>
    </section>
  );
}
