import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, ExternalLink, Headphones, Pencil, Phone, Video } from "lucide-react";
import { and, eq, ne, sql } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/session";
import { assertProjectAccess } from "@/server/auth/permissions";
import { AppError } from "@/server/errors";
import { db } from "@/server/db/client";
import { maintenanceRequests, revisions, tasks as tasksTable } from "@/server/db/schema";
import { getProject, listStaff, type ProjectDetail } from "@/server/services/projects";
import { getProjectBilling, listInvoices } from "@/server/services/billing";
import { agreementDefaults, listAgreements, listTemplates } from "@/server/services/agreements";
import { listDocuments } from "@/server/services/documents";
import { listFiles } from "@/server/services/files";
import { listTasks } from "@/server/services/tasks";
import { getDeployment, listApprovals, listPreviews, listRevisions } from "@/server/services/delivery";
import { listMaintenance } from "@/server/services/maintenance";
import { listActivity } from "@/server/services/activity";
import { getOnboarding } from "@/server/services/onboarding";
import { PageHeader, LinkTabs, InfoRow, EmptyState } from "@/components/shared/layout";
import { StageBadge, StatusBadge, DemoBadge } from "@/components/shared/status-badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { StageTracker } from "@/components/projects/stage-tracker";
import { NextActionCard, type NextAction } from "@/components/projects/next-action";
import { PaymentsPanel } from "@/components/payments/payments-panel";
import { AgreementsPanel } from "@/components/documents/agreements-panel";
import { DocumentsTable } from "@/components/documents/documents-table";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";
import { FileManager } from "@/components/files/file-manager";
import { TaskList, NewTaskButton } from "@/components/tasks/task-list";
import { ReviewPanel } from "@/components/projects/review-panel";
import { DeploymentPanel } from "@/components/projects/deployment-panel";
import { MaintenanceTable, NewMaintenanceDialog } from "@/components/maintenance/maintenance-table";
import { Timeline } from "@/components/shared/timeline";
import { OnboardingSummary } from "@/components/onboarding/onboarding-summary";
import { ScheduleForm } from "@/components/onboarding/schedule-form";
import { EditProjectButton } from "@/components/projects/edit-project-dialog";
import { FILE_FOLDERS, FOOD_INDUSTRIES, GENERAL_FILE_FOLDERS, SERVICE_TYPES, labelFor } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  try {
    const p = await getProject(id);
    return { title: p.project.name };
  } catch {
    return { title: "Project" };
  }
}

const TABS = ["overview", "onboarding", "tasks", "payments", "documents", "files", "review", "deployment", "maintenance", "activity"] as const;
type Tab = (typeof TABS)[number];

async function computeNextAction(d: ProjectDetail): Promise<NextAction> {
  const id = d.project.id;
  if (d.project.phase === "live") return { kind: "maintenance", title: "The website is live 🎉", description: "Move the project into maintenance so the client can request updates." };
  if (d.project.phase === "maintenance") return { kind: "link", title: "In maintenance", description: "Handle client update requests as they come in.", label: "View requests", href: `/projects/${id}?tab=maintenance` };
  const key = d.current?.key;
  switch (key) {
    case "client_confirmed":
    case "agreement": {
      const ags = await listAgreements({ projectId: id });
      const latest = ags[0];
      if (!latest) return { kind: "link", title: "Generate the agreement", description: "Create a client-specific agreement from your template.", label: "Generate agreement", href: `/projects/${id}?tab=documents` };
      if (latest.status === "draft") return { kind: "send-agreement", title: "Share the agreement", description: "Review the draft, then send it to the client's portal.", agreementId: latest.id };
      return {
        kind: "link",
        title: "Waiting for the client to accept the agreement",
        description: "Meanwhile you can generate the invoice and record the advance payment.",
        label: "Record advance payment",
        href: `/projects/${id}?tab=payments`,
        secondary: { label: "View agreement", href: `/agreements/${latest.id}` },
      };
    }
    case "advance_payment":
      return { kind: "link", title: "Collect the advance payment", description: "Generate the invoice and record the payment once it's received.", label: "Go to payments", href: `/projects/${id}?tab=payments` };
    case "onboarding":
      return {
        kind: "link",
        title: "Run the onboarding call",
        description: "Fill the onboarding form live while you talk to the client — every answer saves instantly.",
        label: "Start onboarding call",
        href: `/call/${id}`,
        secondary: { label: "Open form", href: `/projects/${id}/onboarding` },
      };
    case "content_collection":
      return { kind: "content", title: "Collect remaining content", description: "Once the pending assets are in (or you're ready to build), move to development." };
    case "development":
      return { kind: "link", title: "Build, then share a preview", description: "Upload the V1 preview link to send it for client review.", label: "Upload preview", href: `/projects/${id}?tab=review` };
    case "client_review":
    case "final_approval": {
      const open = await db.select({ round: revisions.round }).from(revisions).where(and(eq(revisions.projectId, id), ne(revisions.status, "completed")));
      if (open.length) return { kind: "link", title: `Resolve revision round ${open[0].round}`, description: "The client requested changes. Update the build, then close the round.", label: "Open review", href: `/projects/${id}?tab=review` };
      return { kind: "link", title: "Waiting for client approval", description: "The client reviews the preview in their portal and approves or requests changes.", label: "Open review", href: `/projects/${id}?tab=review` };
    }
    case "final_payment":
      return { kind: "link", title: "Collect the final payment", description: "The client approved the website. Record the final payment to unlock launch.", label: "Record final payment", href: `/projects/${id}?tab=payments` };
    case "domain_hosting":
    case "deployment":
    case "launch":
      return { kind: "link", title: "Complete the deployment checklist", description: "Domain, DNS, SSL, testing — then mark the website LIVE.", label: "Open deployment", href: `/projects/${id}?tab=deployment` };
    default:
      return { kind: "info", title: d.current ? `Current stage: ${d.current.name}` : "All stages complete", description: "Update stage statuses as work progresses.", secondary: { label: "Tasks", href: `/projects/${id}?tab=tasks` } };
  }
}

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const user = await requireStaffPage();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(String(sp.tab)) ? (sp.tab as Tab) : "overview";

  try {
    await assertProjectAccess(user, id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const d = await getProject(id);
  const { project, client } = d;
  const staff = await listStaff();
  const base = `/projects/${id}`;

  const [[openTasks], [openRevs], [openMaint]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(tasksTable).where(and(eq(tasksTable.projectId, id), ne(tasksTable.status, "completed"))),
    db.select({ n: sql<number>`count(*)::int` }).from(revisions).where(and(eq(revisions.projectId, id), ne(revisions.status, "completed"))),
    db.select({ n: sql<number>`count(*)::int` }).from(maintenanceRequests).where(and(eq(maintenanceRequests.projectId, id), ne(maintenanceRequests.status, "completed"))),
  ]);

  const tabs = [
    { key: "overview", label: "Overview", href: base },
    { key: "onboarding", label: "Onboarding", href: `${base}?tab=onboarding` },
    { key: "tasks", label: "Tasks", href: `${base}?tab=tasks`, count: openTasks.n },
    { key: "payments", label: "Payments", href: `${base}?tab=payments` },
    { key: "documents", label: "Documents", href: `${base}?tab=documents` },
    { key: "files", label: "Files", href: `${base}?tab=files` },
    { key: "review", label: "Review", href: `${base}?tab=review`, count: openRevs.n },
    { key: "deployment", label: "Deployment", href: `${base}?tab=deployment` },
    { key: "maintenance", label: "Maintenance", href: `${base}?tab=maintenance`, count: openMaint.n },
    { key: "activity", label: "Activity", href: `${base}?tab=activity` },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: client.companyName, href: `/clients/${client.id}` }, { label: project.name }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {project.name}
            {project.isDemo && <DemoBadge />}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StageBadge stage={d.stage} />
            <span className="text-muted">·</span>
            <span>{labelFor(SERVICE_TYPES, project.serviceType)}</span>
            <span className="text-muted">·</span>
            <span>{d.workflowName ?? "No workflow"}</span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href={`${base}/onboarding`}>
                <ClipboardList /> Onboarding
              </Link>
            </Button>
            <EditProjectButton
              projectId={id}
              staff={staff}
              values={{
                name: project.name,
                description: project.description,
                value: project.value,
                annualValue: project.annualValue,
                assignedToId: project.assignedToId,
                startDate: project.startDate,
                dueDate: project.dueDate,
                phase: project.phase,
              }}
            />
          </>
        }
      />

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-card">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-ink">{project.phase === "maintenance" ? "Maintenance" : project.phase === "live" ? "Live" : d.current?.name ?? "Complete"}</span>
            <span className="font-semibold text-ink">{project.progress}%</span>
          </div>
          <Progress value={project.progress} size="lg" />
        </div>
      </div>

      <LinkTabs tabs={tabs} active={tab} />

      {tab === "overview" && (
        <div className="space-y-5">
          <NextActionCard projectId={id} action={await computeNextAction(d)} />
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader title="Project stages" description={`${d.steps.filter((s) => s.status === "completed").length} of ${d.steps.length} complete`} />
              <CardBody>
                <StageTracker projectId={id} steps={d.steps} currentId={project.currentStepId} staff={staff} tasks={await listTasks(user, { projectId: id })} />
              </CardBody>
            </Card>
            <div className="space-y-5">
              {d.launch && (
                <Card className="border-green/30 bg-green-soft p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-dark">🎉 Project live</p>
                  <a href={d.launch.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1.5 font-medium text-ink hover:underline">
                    {d.launch.url} <ExternalLink className="size-3.5" />
                  </a>
                  <p className="mt-1 text-xs text-muted">Launched {formatDate(d.launch.launchedAt)}</p>
                </Card>
              )}
              <Card>
                <CardHeader title="Project details" />
                <dl className="divide-y divide-line-soft px-5 py-2">
                  <InfoRow label="Client">
                    <Link href={`/clients/${client.id}`} className="text-orange-dark hover:underline">
                      {client.companyName}
                    </Link>
                  </InfoRow>
                  <InfoRow label="Project value">{formatMoney(project.value)}</InfoRow>
                  <InfoRow label="Annual">{formatMoney(project.annualValue)}</InfoRow>
                  <InfoRow label="Total">{formatMoney(project.value + project.annualValue)}</InfoRow>
                  <InfoRow label="Project lead">{d.assigneeName}</InfoRow>
                  <InfoRow label="Start date">{formatDate(project.startDate)}</InfoRow>
                  <InfoRow label="Target launch">{formatDate(project.dueDate)}</InfoRow>
                  <InfoRow label="Status">
                    <StatusBadge kind="phase" value={project.phase} />
                  </InfoRow>
                </dl>
                {project.description && <p className="whitespace-pre-line border-t border-line-soft px-5 py-4 text-sm text-ink-soft">{project.description}</p>}
              </Card>
              <Card>
                <CardHeader title="Onboarding call" icon={<Headphones />} />
                <div className="space-y-3 p-5">
                  {project.onboardingAt ? (
                    <p className="text-sm">
                      <span className="font-medium">{formatDateTime(project.onboardingAt)}</span>
                      {project.onboardingMeetingLink && (
                        <a href={project.onboardingMeetingLink} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-orange-dark hover:underline">
                          <Video className="size-3.5" /> Join
                        </a>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-muted">Not scheduled yet.</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" asChild>
                      <Link href={`/call/${id}`}>
                        <Phone /> Call mode
                      </Link>
                    </Button>
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={`${base}?tab=onboarding`}>Schedule</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {tab === "onboarding" && <OnboardingTab projectId={id} project={project} staff={staff} />}

      {tab === "tasks" && (
        <Card>
          <CardHeader title="Tasks" action={<NewTaskButton projectId={id} staff={staff} size="sm" stages={d.steps.map((s) => ({ id: s.id, name: s.name }))} />} />
          <TaskList tasks={await listTasks(user, { projectId: id })} staff={staff} stages={d.steps.map((s) => ({ id: s.id, name: s.name }))} />
        </Card>
      )}

      {tab === "payments" && (await PaymentsTab({ id, clientId: client.id, user }))}

      {tab === "documents" && (
        <div className="space-y-5">
          <AgreementsPanel
            projectId={id}
            agreements={await listAgreements({ projectId: id })}
            templates={(await listTemplates()).map((t) => ({ id: t.id, name: t.name, isDefault: t.isDefault }))}
            defaults={await agreementDefaults(id)}
          />
          <Card>
            <CardHeader title="All documents" description="Agreements, invoices, receipts and other documents." action={<UploadDocumentDialog clientId={client.id} projectId={id} />} />
            <DocumentsTable docs={await listDocuments(user, { projectId: id })} showClient={false} />
          </Card>
        </div>
      )}

      {tab === "files" && (
        <Card className="p-5">
          <FileManager
            files={await listFiles({ clientId: client.id, projectId: id })}
            folders={FOOD_INDUSTRIES.includes(client.industry) ? FILE_FOLDERS : GENERAL_FILE_FOLDERS}
            target={{ projectId: id }}
            canManage
            currentUserId={user.id}
          />
        </Card>
      )}

      {tab === "review" && (await ReviewTab({ id, clientId: client.id }))}

      {tab === "deployment" && (await DeploymentTab({ id, d }))}

      {tab === "maintenance" && (
        <Card>
          <CardHeader title="Maintenance requests" action={<NewMaintenanceDialog projectId={id} />} />
          <MaintenanceTable items={await maintenanceWithFiles(user, id, client.id)} staff={staff} showProject={false} />
        </Card>
      )}

      {tab === "activity" && (
        <Card className="p-6">
          <ActivityTab projectId={id} />
        </Card>
      )}
    </div>
  );
}

async function ActivityTab({ projectId }: { projectId: string }) {
  const items = await listActivity({ projectId });
  return items.length ? <Timeline items={items} /> : <EmptyState title="No activity yet" />;
}

async function OnboardingTab({ projectId, project, staff }: { projectId: string; project: ProjectDetail["project"]; staff: { id: string; name: string }[] }) {
  const ob = await getOnboarding(projectId);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader
          title="Onboarding"
          description={ob.form.status === "completed" ? `Completed ${formatDateTime(ob.form.completedAt)}` : `${ob.computed.progress}% complete`}
          action={<StatusBadge kind="onboarding" value={ob.form.status} />}
        />
        <div className="space-y-5 p-5">
          <Progress value={ob.computed.progress} />
          <OnboardingSummary computed={ob.computed} />
          <div className="flex flex-wrap gap-2 border-t border-line-soft pt-5">
            <Button asChild>
              <Link href={`/call/${projectId}`}>
                <Phone /> Start onboarding call
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${projectId}/onboarding`}>
                <Pencil /> {ob.form.status === "completed" ? "View answers" : "Open form"}
              </Link>
            </Button>
          </div>
        </div>
      </Card>
      <div className="space-y-5">
        <Card>
          <CardHeader title="Schedule the call" icon={<Headphones />} />
          <div className="p-5">
            <ScheduleForm projectId={projectId} at={project.onboardingAt} link={project.onboardingMeetingLink} assigneeId={project.onboardingAssigneeId} staff={staff} />
          </div>
        </Card>
        {ob.form.callNotes && (
          <Card>
            <CardHeader title="Call notes" />
            <p className="whitespace-pre-line p-5 text-sm text-ink-soft">{ob.form.callNotes}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

async function PaymentsTab({ id, clientId, user }: { id: string; clientId: string; user: Awaited<ReturnType<typeof requireStaffPage>> }) {
  const billing = await getProjectBilling(id);
  const invoices = await listInvoices(user, { projectId: id });
  return (
    <PaymentsPanel
      projectId={id}
      clientId={clientId}
      scheduled={billing.scheduled}
      paid={billing.paid}
      milestones={billing.milestones.map((m) => ({ ...m.milestone, invoiceNumber: m.invoiceNumber, received: m.received }))}
      payments={billing.payments.map((p) => ({ ...p.payment, recordedBy: p.recordedBy, milestoneLabel: p.milestoneLabel, invoiceNumber: p.invoiceNumber }))}
      invoices={invoices}
    />
  );
}

async function ReviewTab({ id, clientId }: { id: string; clientId: string }) {
  const [previews, revs, approvals, files] = await Promise.all([listPreviews(id), listRevisions(id), listApprovals(id), listFiles({ clientId, projectId: id })]);
  return (
    <ReviewPanel
      projectId={id}
      previews={previews}
      approvals={approvals}
      revisions={revs.map((r) => ({ ...r.revision, previewVersion: r.previewVersion, requestedBy: r.requestedBy, files: files.filter((f) => f.revisionId === r.revision.id) }))}
    />
  );
}

async function DeploymentTab({ id, d }: { id: string; d: ProjectDetail }) {
  const dep = await getDeployment(id);
  return (
    <DeploymentPanel
      projectId={id}
      items={dep.items.map((i) => ({ ...i.item, doneBy: i.doneBy }))}
      readyToLaunch={dep.readyToLaunch}
      launch={d.launch}
      phase={d.project.phase}
      defaultUrl={d.client.website}
    />
  );
}

async function maintenanceWithFiles(user: Awaited<ReturnType<typeof requireStaffPage>>, projectId: string, clientId: string) {
  const [items, files] = await Promise.all([listMaintenance(user, { projectId }), listFiles({ clientId, projectId })]);
  return items.map((m) => ({ ...m, files: files.filter((f) => f.maintenanceRequestId === m.id) }));
}
