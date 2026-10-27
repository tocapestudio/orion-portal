import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import OptotiposClient from "@/components/visualLabTools/optotipos/OptotiposClient";

export default function OptotiposPage() {
  return (
    <SecondaryScreenShell backHref="/visual-lab/tools">
      <OptotiposClient />
    </SecondaryScreenShell>
  );
}
