import { ExternalLink, MonitorCheck } from "lucide-react";
import { requireClientPage } from "@/server/auth/session";
import { getPortalContext } from "@/server/services/portal";
import { listApprovals, listPreviews, listRevisions } from "@/server/services/delivery";
import { listFiles } from "@/server/services/files";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/shared/layout";
import { StatusBadge } from "@/components/shared/status-badge";
import { FileTile } from "@/components/files/file-manager";
import { ApprovedCard, ReviewActions } from "@/components/portal/review-client";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata = { title: "Review" };

export default async function PortalReview() {
  const user = await requireClientPage();
  const ctx = await getPortalContext(user);
  if (!ctx.project) return <Card><EmptyState title="No project yet" /></Card>;
  const pid = ctx.project.project.id;
  const [previews, revisions, approvals, files] = await Promise.all([listPreviews(pid), listRevisions(pid), listApprovals(pid), listFiles({ clientId: ctx.client.id, projectId: pid })]);
  const current = previews.find((p) => p.status === "in_review" || p.status === "changes_requested");
  const approved = previews.find((p) => p.status === "approved");
  const openRevision = revisions.find((r) => r.revision.status !== "completed");

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Review" description="Preview your website, approve it, or tell us what to change." />

      {approvals[0] && <ApprovedCard version={approvals[0].version} name={approvals[0].approvedName} at={formatDateTime(approvals[0].approvedAt)} />}

      {current ? (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-orange-soft via-cream to-white p-6 sm:p-8">
            <Badge tone="orange" dot>
              Version {current.version}
            </Badge>
            <h2 className="mt-3 font-serif text-3xl font-medium">{current.status === "changes_requested" ? "We're working on your changes" : "Your website preview is ready."}</h2>
            <p className="mt-2 max-w-xl text-muted">
              {current.status === "changes_requested"
                ? "Thanks for your feedback. We'll share an updated version soon — you can still browse the current one."
                : "Take a look on your phone and computer. When you're happy, approve it — or request changes."}
            </p>
            {current.notes && <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-ink-soft">{current.notes}</p>}
            <Button size="lg" variant="dark" className="mt-5" asChild>
              <a href={current.url} target="_blank" rel="noreferrer">
                Open website preview <ExternalLink />
              </a>
            </Button>
          </div>
          {current.status === "in_review" && (
            <div className="border-t border-line-soft p-5 sm:p-6">
              <ReviewActions projectId={pid} version={current.version} url={current.url} blocked={!!openRevision} />
            </div>
          )}
        </Card>
      ) : !approved ? (
        <Card>
          <EmptyState icon={<MonitorCheck />} title="No preview yet" description="We'll let you know as soon as the first version of your website is ready to review." />
        </Card>
      ) : null}

      {revisions.length > 0 && (
        <Card>
          <CardHeader title="Your change requests" />
          <ul className="divide-y divide-line-soft">
            {revisions.map((r) => (
              <li key={r.revision.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    Round {r.revision.round} {r.previewVersion && <span className="font-normal text-muted">· {r.previewVersion}</span>}
                  </p>
                  <StatusBadge kind="revision" value={r.revision.status} />
                </div>
                <p className="whitespace-pre-line rounded-lg bg-cream/70 p-3 text-sm">{r.revision.clientFeedback}</p>
                {files.filter((f) => f.revisionId === r.revision.id).length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {files
                      .filter((f) => f.revisionId === r.revision.id)
                      .map((f) => (
                        <FileTile key={f.id} f={f} />
                      ))}
                  </div>
                )}
                {r.revision.response && (
                  <div className="rounded-lg border border-green/25 bg-green-soft p-3 text-sm">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-green-dark">RQdinn</p>
                    <p className="whitespace-pre-line">{r.revision.response}</p>
                  </div>
                )}
                <p className="text-xs text-subtle">
                  Sent {formatDate(r.revision.createdAt)}
                  {r.revision.closedAt ? ` · Completed ${formatDate(r.revision.closedAt)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
