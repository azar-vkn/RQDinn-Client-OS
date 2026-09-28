import { requireStaffPage } from "@/server/auth/session";
import { listTasks } from "@/server/services/tasks";
import { listProjects, listStaff } from "@/server/services/projects";
import { PageHeader } from "@/components/shared/layout";
import { FilterBar } from "@/components/shared/filter-bar";
import { Card } from "@/components/ui/card";
import { TaskList, NewTaskButton } from "@/components/tasks/task-list";
import { TASK_STATUS_LABEL, TASK_STATUSES } from "@/lib/constants";

export const metadata = { title: "Tasks" };

export default async function TasksPage(props: PageProps<"/tasks">) {
  const user = await requireStaffPage();
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const assignee = typeof sp.assignee === "string" ? sp.assignee : undefined;
  const mine = sp.mine === "1";
  const q = typeof sp.q === "string" ? sp.q.toLowerCase() : "";
  const [tasks, projects, staff] = await Promise.all([
    listTasks(user, { status, assigneeId: assignee, mine }),
    listProjects(user),
    listStaff(),
  ]);
  const filtered = q ? tasks.filter((t) => `${t.title} ${t.projectName} ${t.clientName}`.toLowerCase().includes(q)) : tasks;
  const open = filtered.filter((t) => t.status !== "completed").length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tasks"
        description={`${open} open task${open === 1 ? "" : "s"} across ${projects.length} projects.`}
        actions={<NewTaskButton projects={projects.filter((p) => p.phase !== "cancelled").map((p) => ({ id: p.id, name: `${p.clientName} — ${p.name}` }))} staff={staff} />}
      />
      <FilterBar
        placeholder="Search tasks…"
        filters={[
          { name: "status", label: "All statuses", options: TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] })) },
          { name: "assignee", label: "Everyone", options: staff.map((s) => ({ value: s.id, label: s.name })) },
        ]}
      />
      <Card>
        <TaskList tasks={filtered} staff={staff} showProject empty={q || status || assignee ? "No tasks match your filters." : "No tasks yet."} />
      </Card>
    </div>
  );
}
