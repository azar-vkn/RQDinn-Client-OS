import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/session";
import { assertProjectAccess } from "@/server/auth/permissions";
import { AppError } from "@/server/errors";
import { getOnboarding } from "@/server/services/onboarding";
import { getProject } from "@/server/services/projects";
import { CallMode } from "@/components/onboarding/call-mode";

export const metadata = { title: "Onboarding call" };

export default async function CallPage(props: PageProps<"/call/[projectId]">) {
  const user = await requireStaffPage();
  const { projectId } = await props.params;
  try {
    await assertProjectAccess(user, projectId);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const [ob, p] = await Promise.all([getOnboarding(projectId), getProject(projectId)]);
  return (
    <CallMode
      meetingLink={p.project.onboardingMeetingLink}
      callNotes={ob.form.callNotes}
      data={{
        projectId,
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
