"use server";

import { z } from "zod";
import { requireStaff } from "@/server/auth/session";
import { assertProjectAccess } from "@/server/auth/permissions";
import { createTask, deleteTask, getTaskProjectId, updateTask } from "@/server/services/tasks";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { formObject, run } from "./run";
import { optionalDate, optionalText, optionalUuid, requiredText, uuid } from "./schemas";

const taskSchema = z.object({
  projectId: uuid,
  title: requiredText("Title", 200),
  description: optionalText(5000),
  assigneeId: optionalUuid,
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  status: z.enum(TASK_STATUSES).default("todo"),
  dueDate: optionalDate,
  projectStepId: optionalUuid,
});

export async function createTaskAction(fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    const input = taskSchema.parse(formObject(fd));
    await assertProjectAccess(actor, input.projectId);
    await createTask(input, actor);
  }, "Task added.");
}

export async function updateTaskAction(taskId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    const projectId = await getTaskProjectId(uuid.parse(taskId));
    await assertProjectAccess(actor, projectId);
    const { projectId: _p, ...patch } = taskSchema.parse({ ...formObject(fd), projectId });
    await updateTask(taskId, patch, actor);
  }, "Task updated.");
}

export async function setTaskStatusAction(taskId: string, status: string) {
  return run(async () => {
    const actor = await requireStaff();
    const projectId = await getTaskProjectId(uuid.parse(taskId));
    await assertProjectAccess(actor, projectId);
    await updateTask(taskId, { status: z.enum(TASK_STATUSES).parse(status) }, actor);
  });
}

export async function deleteTaskAction(taskId: string) {
  return run(async () => {
    const actor = await requireStaff();
    const projectId = await getTaskProjectId(uuid.parse(taskId));
    await assertProjectAccess(actor, projectId);
    await deleteTask(taskId);
  }, "Task deleted.");
}
