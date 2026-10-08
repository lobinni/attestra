import Link from "next/link";
import { notFound } from "next/navigation";

import { MandateWorkspace } from "@/components/MandateWorkspace";
import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function MandateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!FEATURES.mandates) notFound();

  const { id } = await params;
  return (
    <section className="page-zone">
      <div className="t-shell">
        <div className="zone-head">
          <div>
            <div className="t-kicker muted">
              <Link href="/mandates">Registry</Link> · Live record
            </div>
            <h1>
              Mandate <span>Record</span>
            </h1>
            <p>
              The agreement, the sealed evidence, the rulings and the settlement, in the
              order they happened.
            </p>
          </div>
        </div>
        <MandateWorkspace mandateId={id} />
      </div>
    </section>
  );
}
