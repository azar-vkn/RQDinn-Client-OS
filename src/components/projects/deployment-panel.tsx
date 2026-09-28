"use client";

import * as React from "react";
import { BarChart3, CalendarClock, ExternalLink, Globe, PartyPopper, Plus, Rocket, Wrench } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton, TextAreaField, TextField } from "@/components/shared/form-fields";
import { useAction } from "@/hooks/use-action";
import { addDeploymentItemAction, launchProjectAction, startMaintenanceAction, toggleDeploymentItemAction } from "@/server/actions/delivery";
import { formatDate, formatDateTime, toDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface DeploymentItemView {
  id: string;
  label: string;
  required: boolean;
  isDone: boolean;
  doneAt: Date | string | null;
  doneBy: string | null;
}
export interface LaunchView {
  url: string;
  launchedAt: Date | string;
  hostingRenewalDate: string | null;
  maintenanceRenewalDate: string | null;
  analyticsUrl: string | null;
}

export function LaunchRecord({ launch, phase, projectId, staff = true }: { launch: LaunchView; phase: string; projectId?: string; staff?: boolean }) {
  const start = useAction(startMaintenanceAction);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-green/30 bg-gradient-to-br from-green-soft to-white p-6">
      <div className="absolute -right-8 -top-8 size-36 rounded-full bg-green-light/60 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-green-dark">
          <PartyPopper className="size-5" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Project Live</span>
        </div>
        <a href={launch.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium text-ink hover:text-green-dark">
          {launch.url.replace(/^https?:\/\//, "").replace(/\/$/, "")} <ExternalLink className="size-4" />
        </a>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <Rocket className="size-3.5" /> Launched
            </dt>
            <dd className="mt-0.5 font-medium">{formatDate(launch.launchedAt)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <CalendarClock className="size-3.5" /> Hosting renewal
            </dt>
            <dd className="mt-0.5 font-medium">{formatDate(launch.hostingRenewalDate)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <Wrench className="size-3.5" /> Maintenance renewal
            </dt>
            <dd className="mt-0.5 font-medium">{formatDate(launch.maintenanceRenewalDate)}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          {launch.analyticsUrl && (
            <Button size="sm" variant="secondary" asChild>
              <a href={launch.analyticsUrl} target="_blank" rel="noreferrer">
                <BarChart3 /> Analytics
              </a>
            </Button>
          )}
          {staff && projectId && phase === "live" && (
            <Button size="sm" variant="success" loading={start.pending} onClick={() => start.execute(projectId)}>
              <Wrench /> Move to maintenance
            </Button>
          )}
          {phase === "maintenance" && <Badge tone="green" dot>In maintenance</Badge>}
        </div>
      </div>
    </div>
  );
}

export function DeploymentPanel({
  projectId,
  items,
  readyToLaunch,
  launch,
  phase,
  defaultUrl,
}: {
  projectId: string;
  items: DeploymentItemView[];
  readyToLaunch: boolean;
  launch: LaunchView | null;
  phase: string;
  defaultUrl?: string | null;
}) {
  const toggle = useAction(toggleDeploymentItemAction, { success: (d) => (d.readyToLaunch ? "Everything's ready — this project is READY TO LAUNCH." : "") });
  const [launchOpen, setLaunchOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const done = items.filter((i) => i.isDone).length;
  const remainingRequired = items.filter((i) => i.required && !i.isDone).length;
  const inAYear = new Date();
  inAYear.setFullYear(inAYear.getFullYear() + 1);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader
          title="Deployment checklist"
          description={`${done} of ${items.length} complete`}
          action={
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  <Plus /> Item
                </Button>
              </DialogTrigger>
              <DialogContent title="Add checklist item" size="sm">
                <ActionForm action={addDeploymentItemAction.bind(null, projectId)} onSuccess={() => setAddOpen(false)} className="space-y-4">
                  <TextField name="label" label="Item" required placeholder="e.g. Favicon added" />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="required" defaultChecked className="size-4" /> Required before launch
                  </label>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">
                        Cancel
                      </Button>
                    </DialogClose>
                    <SubmitButton>Add</SubmitButton>
                  </DialogFooter>
                </ActionForm>
              </DialogContent>
            </Dialog>
          }
        />
        <div className="px-5 pt-4">
          <Progress value={items.length ? (done / items.length) * 100 : 0} />
        </div>
        <ul className="p-2">
          {items.map((i) => (
            <li key={i.id}>
              <label className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-cream/60", toggle.pending && "pointer-events-none")}>
                <input type="checkbox" checked={i.isDone} onChange={(e) => toggle.execute(projectId, i.id, e.target.checked)} disabled={!!launch} className="size-[18px]" />
                <span className={cn("flex-1 text-sm", i.isDone ? "text-muted line-through" : "text-ink")}>{i.label}</span>
                {!i.required && <span className="text-[11px] text-subtle">Optional</span>}
                {i.isDone && i.doneAt && <span className="hidden text-[11px] text-subtle sm:inline">{formatDate(i.doneAt, "d MMM")}{i.doneBy ? ` · ${i.doneBy}` : ""}</span>}
              </label>
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-5">
        {launch ? (
          <LaunchRecord launch={launch} phase={phase} projectId={projectId} />
        ) : (
          <Card className="p-6">
            {readyToLaunch ? (
              <>
                <Badge tone="green" dot className="mb-3">
                  Ready to launch
                </Badge>
                <h3 className="font-serif text-2xl font-medium">Everything looks good.</h3>
                <p className="mt-1 text-sm text-muted">All required checks are complete. Mark the website live to create the launch record and notify the client.</p>
                <Dialog open={launchOpen} onOpenChange={setLaunchOpen}>
                  <DialogTrigger asChild>
                    <Button className="mt-5" size="lg" variant="success">
                      <Rocket /> Mark website LIVE
                    </Button>
                  </DialogTrigger>
                  <DialogContent title="Launch 🚀" description="This creates the launch record and moves the project to Live.">
                    <ActionForm action={launchProjectAction.bind(null, projectId)} onSuccess={() => setLaunchOpen(false)} className="space-y-4">
                      <TextField name="url" label="Live website URL" required defaultValue={defaultUrl ?? ""} placeholder="https://dparkz.in" />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField name="hostingRenewalDate" label="Hosting renewal date" type="date" defaultValue={toDateInput(inAYear)} />
                        <TextField name="maintenanceRenewalDate" label="Maintenance renewal date" type="date" defaultValue={toDateInput(inAYear)} />
                      </div>
                      <TextField name="analyticsUrl" label="Analytics dashboard URL" placeholder="https://analytics.google.com/…" />
                      <TextAreaField name="notes" label="Launch notes" rows={2} />
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="secondary">
                            Cancel
                          </Button>
                        </DialogClose>
                        <SubmitButton variant="success" loadingText="Launching…">
                          Go live
                        </SubmitButton>
                      </DialogFooter>
                    </ActionForm>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <>
                <div className="flex size-11 items-center justify-center rounded-xl bg-cream text-muted">
                  <Globe className="size-5" />
                </div>
                <h3 className="mt-4 font-medium">Not ready to launch yet</h3>
                <p className="mt-1 text-sm text-muted">
                  Complete the remaining {remainingRequired} required item{remainingRequired === 1 ? "" : "s"} to move this project forward.
                </p>
              </>
            )}
          </Card>
        )}
        {launch && <p className="text-center text-xs text-subtle">Launched {formatDateTime(launch.launchedAt)}</p>}
      </div>
    </div>
  );
}
