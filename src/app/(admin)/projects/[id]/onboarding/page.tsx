import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/session";
import { assertProjectAccess } from "@/server/auth/permissions";
import { AppError } from "@/server/errors";
import { getOnboarding } from "@/server/services/onboarding";
import { PageHeader } from "@/components/shared/layout";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { ReopenOnboardingButton } from "@/components/onboarding/reopen-button";

export const metadata = { title: "Onboarding" };

export default async function ProjectOnboardingPage(props: PageProps<"/projects/[id]/onboarding">) {
  const user = await requireStaffPage();
  const { id } = await props.params;
  try {
    await assertProjectAccess(user, id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const ob = await getOnboarding(id);
  return (
    <div className="animate-fade-in">
      <PageHeader
        className="mb-4 sm:mb-5"
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: ob.clientName, href: `/clients/${ob.clientId}` },
          { label: ob.projectName, href: `/projects/${id}` },
          { label: "Onboarding" },
        ]}
        title=""
        actions={ob.form.status === "completed" ? <ReopenOnboardingButton projectId={id} /> : undefined}
      />
      <OnboardingWizard
        mode="admin"
        data={{
          projectId: id,
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
    </div>
  );
}
