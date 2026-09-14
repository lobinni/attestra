import { HomeLive } from "@/components/HomeLive";
import { SampleMandateCatalog } from "@/components/SampleMandateCatalog";
import { FEATURES } from "@/lib/features";

export default function HomePage() {
  return (
    <>
      <HomeLive />
      {FEATURES.samples ? <SampleMandateCatalog /> : null}
    </>
  );
}
