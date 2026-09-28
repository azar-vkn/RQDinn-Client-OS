import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, ExternalLink, Globe, AtSign, Mail, MapPin, MessageCircle, Phone, Plus } from "lucide-react";
import { requireStaffPage } from "@/server/auth/session";
import { assertClientAccess } from "@/server/auth/permissions";
import { AppError } from "@/server/errors";
import { getClient } from "@/server/services/clients";
import { listProjects, listStaff } from "@/server/services/projects";
import { workflowsWithSteps } from "@/server/services/workflows";
import { listInvoices, paymentsOverview } from "@/server/services/billing";
import { listDocuments } from "@/server/services/documents";
import { listFiles } from "@/server/services/files";
import { listTasks } from "@/server/services/tasks";
import { listMaintenance } from "@/server/services/maintenance";
import { listActivity } from "@/server/services/activity";
import { listOnboardingForms } from "@/server/services/onboarding";
import { PageHeader, LinkTabs, InfoRow, EmptyState } from "@/components/shared/layout";
import { StatusBadge, DemoBadge } from "@/components/shared/status-badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, Progress } from "@/components/ui/misc";
import { EditClientButton } from "@/components/clients/client-dialog";
import { PortalAccess } from "@/components/clients/portal-access";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { DocumentsTable } from "@/components/documents/documents-table";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";
import { FileManager } from "@/components/files/file-manager";
import { TaskList, NewTaskButton } from "@/components/tasks/task-list";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
import { Timeline } from "@/components/shared/timeline";
import { FILE_FOLDERS, FOOD_INDUSTRIES, GENERAL_FILE_FOLDERS, INDUSTRIES, labelFor } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

const TABS = ["overview", "projects", "payments", "documents", "files", "onboarding", "tasks", "activity", "maintenance"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata(props: PageProps<"/clients/[id]">) {
  const { id } = await props.params;
  try {
    return { title: (await getClient(id)).client.companyName };
  } catch {
    return { title: "Client" };
  }
}

export default async function ClientPage(props: PageProps<"/clients/[id]">) {
  const user = await requireStaffPage();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(String(sp.tab)) ? (sp.tab as Tab) : "overview";
  try {
    await assertClientAccess(user, id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  const [{ client, assigneeName, contacts, portalUsers }, projects, staff] = await Promise.all([getClient(id), listProjects(user, { clientId: id }), listStaff()]);
  const primary = contacts[0];
  const base = `/clients/${id}`;
  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  const tabs = [
    { key: "overview", label: "Overview", href: base },
    { key: "projects", label: "Projects", href: `${base}?tab=projects`, count: projects.length },
    { key: "payments", label: "Payments", href: `${base}?tab=payments` },
    { key: "documents", label: "Documents", href: `${base}?tab=documents` },
    { key: "files", label: "Files", href: `${base}?tab=files` },
    { key: "onboarding", label: "Onboarding", href: `${base}?tab=onboarding` },
    { key: "tasks", label: "Tasks", href: `${base}?tab=tasks` },
    { key: "activity", label: "Activity", href: `${base}?tab=activity` },
    { key: "maintenance", label: "Maintenance", href: `${base}?tab=maintenance` },
  ];

  const newProject = <NewProjectDialog clients={[{ id, companyName: client.companyName }]} workflows={await workflowsWithSteps()} staff={staff} defaultClientId={id} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: client.companyName }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {client.companyName} {client.isDemo && <DemoBadge />}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="client" value={client.status} />
            <span>{labelFor(INDUSTRIES, client.industry)}</span>
            {client.city && <span className="text-muted">· {client.city}</span>}
          </span>
        }
        actions={
          <>
            <EditClientButton
              staff={staff}
              values={{
                id,
                companyName: client.companyName,
                industry: client.industry,
                status: client.status,
                address: client.address,
                city: client.city,
                website: client.website,
                googleBusinessUrl: client.googleBusinessUrl,
                instagram: client.instagram,
                notes: client.notes,
                assignedToId: client.assignedToId,
                contact: primary ? { name: primary.name, role: primary.role, phone: primary.phone, email: primary.email, whatsapp: primary.whatsapp } : undefined,
              }}
            />
            {newProject}
          </>
        }
      />
      <LinkTabs tabs={tabs} active={tab} />

      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Projects</h2>
              </div>
              {projects.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {projects.map((p) => (
                    <ProjectCard key={p.id} p={p} />
                  ))}
                </div>
              ) : (
                <Card>
                  <EmptyState compact title="No projects yet" description="Create the first project to start the workflow." action={newProject} />
                </Card>
              )}
            </div>
            <Card>
              <CardHeader title="Company information" />
              <dl className="divide-y divide-line-soft px-5 py-2">
                <InfoRow label="Industry">{labelFor(INDUSTRIES, client.industry)}</InfoRow>
                <InfoRow label="Address">{[client.address, client.city].filter(Boolean).join(", ") || null}</InfoRow>
                <InfoRow label="Website">
                  {client.website ? (
                    <a href={client.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-orange-dark hover:underline">
                      <Globe className="size-3.5" /> {client.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : null}
                </InfoRow>
                <InfoRow label="Google Business">
                  {client.googleBusinessUrl ? (
                    <a href={client.googleBusinessUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-orange-dark hover:underline">
                      <MapPin className="size-3.5" /> Profile <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </InfoRow>
                <InfoRow label="Instagram">
                  {client.instagram ? (
                    <a href={client.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-orange-dark hover:underline">
                      <AtSign className="size-3.5" /> {client.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "")}
                    </a>
                  ) : null}
                </InfoRow>
                <InfoRow label="Assigned to">{assigneeName}</InfoRow>
                <InfoRow label="Client since">{formatDate(client.createdAt)}</InfoRow>
              </dl>
              {client.notes && <p className="whitespace-pre-line border-t border-line-soft px-5 py-4 text-sm text-ink-soft">{client.notes}</p>}
            </Card>
          </div>
          <div className="space-y-5">
            <Card>
              <CardHeader title="Contacts" />
              <ul className="divide-y divide-line-soft">
                {contacts.map((c) => (
                  <li key={c.id} className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <div>
                        <p className="text-sm font-medium">
                          {c.name} {c.isPrimary && <span className="ml-1 text-[11px] font-normal text-orange-dark">Primary</span>}
                        </p>
                        {c.role && <p className="text-xs text-muted">{c.role}</p>}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.phone && (
                        <Button size="sm" variant="secondary" asChild>
                          <a href={`tel:${c.phone.replace(/\s/g, "")}`}>
                            <Phone /> {c.phone}
                          </a>
                        </Button>
                      )}
                      {c.whatsapp && (
                        <Button size="sm" variant="secondary" asChild>
                          <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                            <MessageCircle /> WhatsApp
                          </a>
                        </Button>
                      )}
                      {c.email && (
                        <Button size="sm" variant="secondary" asChild>
                          <a href={`mailto:${c.email}`}>
                            <Mail /> Email
                          </a>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Client portal" description="Secure workspace for the client." />
              <div className="p-5">
                <PortalAccess clientId={id} users={portalUsers} defaultName={primary?.name} defaultEmail={primary?.email} />
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "projects" &&
        (projects.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState title="No projects yet" action={newProject} />
          </Card>
        ))}

      {tab === "payments" && <ClientPayments clientId={id} user={user} />}

      {tab === "documents" && (
        <Card>
          <CardHeader title="Documents" action={<UploadDocumentDialog clientId={id} />} />
          <DocumentsTable docs={await listDocuments(user, { clientId: id })} showClient={false} />
        </Card>
      )}

      {tab === "files" && (
        <Card className="p-5">
          <FileManager
            files={await listFiles({ clientId: id })}
            folders={FOOD_INDUSTRIES.includes(client.industry) ? FILE_FOLDERS : GENERAL_FILE_FOLDERS}
            target={{ clientId: id, projectId: projects[0]?.id }}
            canManage
            currentUserId={user.id}
          />
        </Card>
      )}

      {tab === "onboarding" && <ClientOnboarding clientId={id} user={user} />}

      {tab === "tasks" && (
        <Card>
          <CardHeader title="Tasks" action={projects.length ? <NewTaskButton projects={projectOptions} staff={staff} size="sm" /> : undefined} />
          <TaskList tasks={(await listTasks(user)).filter((t) => projects.some((p) => p.id === t.projectId))} staff={staff} showProject />
        </Card>
      )}

      {tab === "activity" && (
        <Card className="p-6">
          <ClientActivity clientId={id} />
        </Card>
      )}

      {tab === "maintenance" && (
        <Card>
          <CardHeader title="Maintenance requests" />
          <MaintenanceTable items={(await listMaintenance(user)).filter((m) => m.clientId === id).map((m) => ({ ...m, files: [] }))} staff={staff} showProject={false} />
        </Card>
      )}
    </div>
  );
}

async function ClientPayments({ clientId, user }: { clientId: string; user: Awaited<ReturnType<typeof requireStaffPage>> }) {
  const [overview, invoices] = await Promise.all([paymentsOverview(user), listInvoices(user, { clientId })]);
  const ms = overview.milestones.filter((m) => m.clientId === clientId);
  const paid = ms.reduce((s, m) => s + Math.min(m.received, m.amount), 0);
  const total = ms.reduce((s, m) => s + m.amount, 0);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[13px] text-muted">Total</p>
          <p className="mt-1 font-serif text-3xl">{formatMoney(total)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] text-muted">Total paid</p>
          <p className="mt-1 font-serif text-3xl text-green-dark">{formatMoney(paid)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] text-muted">Total pending</p>
          <p className="mt-1 font-serif text-3xl text-orange-dark">{formatMoney(total - paid)}</p>
        </Card>
      </div>
      <Card>
        <CardHeader title="Payment schedule" />
        {ms.length ? (
          <ul className="divide-y divide-line-soft">
            {ms.map((m) => (
              <li key={m.id}>
                <Link href={`/projects/${m.projectId}?tab=payments`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-cream/40">
                  <div>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-muted">{m.projectName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatMoney(m.amount)}</span>
                    <StatusBadge kind="milestone" value={m.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact title="No payment schedule yet" />
        )}
      </Card>
      <Card>
        <CardHeader title="Invoices" />
        {invoices.length ? (
          <ul className="divide-y divide-line-soft">
            {invoices.map((i) => (
              <li key={i.id}>
                <Link href={`/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-cream/40">
                  <div>
                    <p className="text-sm font-medium">{i.number}</p>
                    <p className="text-xs text-muted">
                      {formatDate(i.issueDate)} · {i.projectName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatMoney(i.total)}</span>
                    <StatusBadge kind="invoice" value={i.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact title="No invoices yet" />
        )}
      </Card>
    </div>
  );
}

async function ClientOnboarding({ clientId, user }: { clientId: string; user: Awaited<ReturnType<typeof requireStaffPage>> }) {
  const forms = (await listOnboardingForms(user)).filter((f) => f.clientId === clientId);
  if (!forms.length) return <Card><EmptyState icon={<ClipboardList />} title="No onboarding yet" description="Onboarding forms are created with each project." /></Card>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {forms.map((f) => (
        <Card key={f.projectId} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{f.projectName}</p>
              <p className="text-xs text-muted">{f.completedAt ? `Completed ${formatDateTime(f.completedAt)}` : f.onboardingAt ? `Call: ${formatDateTime(f.onboardingAt)}` : "Not scheduled"}</p>
            </div>
            <StatusBadge kind="onboarding" value={f.status} />
          </div>
          <Progress value={f.progress} className="mt-4" />
          <div className="mt-4 flex gap-2">
            <Button size="sm" asChild>
              <Link href={`/call/${f.projectId}`}>
                <Phone /> Call mode
              </Link>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/projects/${f.projectId}/onboarding`}>
                <Plus /> Open form
              </Link>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

async function ClientActivity({ clientId }: { clientId: string }) {
  const items = await listActivity({ clientId });
  return items.length ? <Timeline items={items} /> : <EmptyState title="No activity yet" />;
}
