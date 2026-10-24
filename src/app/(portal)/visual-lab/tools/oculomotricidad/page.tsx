import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import OculomotorClient from "@/components/visualLabTools/oculomotor/OculomotorClient";

export default function OculomotorPage() {
  return (
    <SecondaryScreenShell backHref="/visual-lab/tools">
      <OculomotorClient />
    </SecondaryScreenShell>
  );
}
