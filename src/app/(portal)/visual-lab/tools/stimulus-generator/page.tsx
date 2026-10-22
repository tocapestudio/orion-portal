import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import StimulusGeneratorClient from "@/components/visualLabTools/stimulusGenerator/StimulusGeneratorClient";

export default function StimulusGeneratorPage() {
  return (
    <SecondaryScreenShell backHref="/visual-lab/tools">
      <div className="mx-auto max-w-2xl">
        <StimulusGeneratorClient />
      </div>
    </SecondaryScreenShell>
  );
}
