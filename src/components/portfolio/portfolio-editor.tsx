"use client";

import * as React from "react";
import { ImageIcon, Trash2 } from "lucide-react";
import { DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { deletePortfolioAction, detectCoverImageAction, savePortfolioAction } from "@/server/actions/portfolio";
import type { PortfolioEntry } from "@/server/services/portfolio";
import { normalizeUrl } from "@/lib/validators";
import { PortfolioCover } from "./portfolio-cover";

export type LiveProject = { id: string; name: string; liveUrl: string | null; clientName: string };

export function PortfolioEditor({
  item,
  categories,
  liveProjects,
  onDone,
}: {
  item: PortfolioEntry | null;
  categories: string[];
  liveProjects: LiveProject[];
  onDone: () => void;
}) {
  const [title, setTitle] = React.useState(item?.title ?? "");
  const [url, setUrl] = React.useState(item?.url ?? "");
  const [clientName, setClientName] = React.useState(item?.clientName ?? "");
  const [category, setCategory] = React.useState(item?.category ?? "");
  const [year, setYear] = React.useState(item?.year ? String(item.year) : "");
  const [description, setDescription] = React.useState(item?.description ?? "");
  const [tags, setTags] = React.useState(item?.tags.join(", ") ?? "");
  const [imageUrl, setImageUrl] = React.useState(item?.imageUrl ?? "");
  const [isFeatured, setIsFeatured] = React.useState(item?.isFeatured ?? false);
  const [projectId, setProjectId] = React.useState(item?.projectId ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const save = useAction(savePortfolioAction, { onSuccess: onDone });
  const remove = useAction(deletePortfolioAction, { onSuccess: onDone });
  const detect = useAction(detectCoverImageAction, { onSuccess: (d) => setImageUrl(d.imageUrl) });
  const busy = save.pending || remove.pending;

  const pickProject = (id: string) => {
    setProjectId(id);
    const p = liveProjects.find((x) => x.id === id);
    if (!p) return;
    // Fill the blanks only — never overwrite what was already typed.
    if (!title.trim()) setTitle(p.name);
    if (!url.trim() && p.liveUrl) setUrl(p.liveUrl);
    if (!clientName.trim()) setClientName(p.clientName);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await save.execute(item?.id ?? null, {
      title,
      url,
      clientName,
      category,
      description,
      imageUrl,
      tags: tags.split(","),
      year: year.trim() || null,
      isFeatured,
      projectId: projectId || null,
    });
    setErrors(res.ok ? {} : res.fieldErrors ?? {});
  };

  const previewUrl = normalizeUrl(url) || "";
  // Wait until the link stops changing before asking for a hero screenshot.
  const [shotUrl, setShotUrl] = React.useState(previewUrl);
  React.useEffect(() => {
    const t = setTimeout(() => setShotUrl(previewUrl), 600);
    return () => clearTimeout(t);
  }, [previewUrl]);
  const previewImage = imageUrl.trim() ? normalizeUrl(imageUrl) || null : null;

  return (
    <DialogContent title={item ? "Edit project" : "Add project to portfolio"} description="Each card links straight to the live website." size="lg">
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy} className="m-0 min-w-0 space-y-4 border-0 p-0">
          {liveProjects.length > 0 && (
            <Field label="Fill from a client project (optional)" htmlFor="pf-project" hint="Projects with a live link. Fills empty fields and links the card to that project.">
              <Select id="pf-project" value={projectId} onChange={(e) => pickProject(e.target.value)}>
                <option value="">— None —</option>
                {projectId && !liveProjects.some((p) => p.id === projectId) && <option value={projectId}>Linked project</option>}
                {liveProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.clientName}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project name" htmlFor="pf-title" required error={errors.title}>
              <Input id="pf-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. D'PARKZ Restaurant Website" aria-invalid={!!errors.title || undefined} />
            </Field>
            <Field label="Website link" htmlFor="pf-url" required error={errors.url}>
              <Input id="pf-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" aria-invalid={!!errors.url || undefined} />
            </Field>
            <Field label="Client" htmlFor="pf-client" error={errors.clientName}>
              <Input id="pf-client" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client or brand name" />
            </Field>
            <div className="grid grid-cols-[1fr_96px] gap-3">
              <Field label="Category" htmlFor="pf-category" error={errors.category}>
                <Input id="pf-category" list="pf-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Restaurant, E-commerce…" />
                <datalist id="pf-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Year" htmlFor="pf-year" error={errors.year}>
                <Input id="pf-year" inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} placeholder={String(new Date().getFullYear())} aria-invalid={!!errors.year || undefined} />
              </Field>
            </div>
            <Field label="Description" htmlFor="pf-description" className="sm:col-span-2" error={errors.description}>
              <Textarea id="pf-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What you built and the result for the client." />
            </Field>
            <Field label="Tags" htmlFor="pf-tags" hint="Separate with commas, e.g. Next.js, QR menu, SEO" className="sm:col-span-2" error={errors.tags}>
              <Input id="pf-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_200px] sm:items-start">
            <Field label="Cover image link (optional)" htmlFor="pf-image" error={errors.imageUrl} hint="Leave empty to use a screenshot of the site's hero automatically. Or paste an image link, or use Detect to take the site's share image.">
              <div className="flex gap-2">
                <Input id="pf-image" inputMode="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…/cover.jpg" aria-invalid={!!errors.imageUrl || undefined} />
                <Button type="button" variant="secondary" loading={detect.pending} loadingText="Detecting…" disabled={!previewUrl} onClick={() => detect.execute(url)}>
                  <ImageIcon /> Detect
                </Button>
              </div>
            </Field>
            <div className="aspect-[16/10] overflow-hidden rounded-xl border border-line bg-cream" aria-label="Cover preview">
              <PortfolioCover title={title.trim() || "Project"} url={shotUrl || previewUrl || "https://example.com"} imageUrl={previewImage} screenshot={!!shotUrl && shotUrl === previewUrl} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="size-4" />
            Feature this project (shown first)
          </label>

          <DialogFooter className="sm:justify-between">
            {item ? (
              <Button
                type="button"
                variant="danger-ghost"
                loading={remove.pending}
                loadingText="Removing…"
                onClick={() => confirm(`Remove "${item.title}" from the portfolio?`) && remove.execute(item.id)}
              >
                <Trash2 /> Remove
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" loading={save.pending} loadingText="Saving…">
                {item ? "Save changes" : "Add to portfolio"}
              </Button>
            </div>
          </DialogFooter>
        </fieldset>
      </form>
    </DialogContent>
  );
}
