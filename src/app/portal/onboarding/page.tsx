import { requireClientPage } from "@/server/auth/session";
import { getPortalContext } from "@/server/services/portal";
import { getOnboarding } from "@/server/services/onboarding";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/layout";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata = { title: "Your requirements" };

export default async function PortalOnboarding() {
  const user = await requireClientPage();
  const ctx = await getPortalContext(user);
  if (!ctx.project) return <Card><EmptyState title="No project yet" /></Card>;
  const ob = await getOnboarding(ctx.project.project.id);
  return (
    <OnboardingWizard
      mode="portal"
      data={{
        projectId: ctx.project.project.id,
        clientName: ob.clientName,
        projectName: ob.projectName,
        ctx: ob.ctx,
        sections: ob.sections,
        answers: ob.answers,
        filesByField: ob.filesByField,
        status: ob.form.status,
        currentSection: ob.form.currentSection,
      }}
    />
  );
}
