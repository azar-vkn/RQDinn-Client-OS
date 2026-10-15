"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Copy, Package, Pencil, Plus, RotateCcw, Search, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/lib/format";
import { rupeesToPaise } from "@/lib/validators";
import { QUOTE_GST_PERCENT, SERVICE_BILLING_SUFFIX, type ServiceBillingValue } from "@/lib/constants";
import type { CatalogService } from "@/server/services/catalog";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/layout";
import { ServiceEditor } from "./service-editor";

const priceLabel = (paise: number, billing: ServiceBillingValue) => `${formatMoney(paise)}${SERVICE_BILLING_SUFFIX[billing] ? ` ${SERVICE_BILLING_SUFFIX[billing]}` : ""}`;
const withGst = (paise: number, on: boolean) => (on ? paise + Math.round((paise * QUOTE_GST_PERCENT) / 100) : paise);

export function ServiceCatalog({ services, isAdmin, agencyName }: { services: CatalogService[]; isAdmin: boolean; agencyName: string }) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [discountInput, setDiscountInput] = React.useState("");
  const [gst, setGst] = React.useState(false);
  const [quoteFor, setQuoteFor] = React.useState("");
  const [editing, setEditing] = React.useState<CatalogService | "new" | null>(null);

  const categories = React.useMemo(() => [...new Set(services.map((s) => s.category))], [services]);
  const activeCategory = category === "all" || categories.includes(category) ? category : "all";

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      if (activeCategory !== "all" && s.category !== activeCategory) return false;
      if (!q) return true;
      return [s.name, s.category, s.description ?? "", ...s.features].join(" ").toLowerCase().includes(q);
    });
  }, [services, query, activeCategory]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, CatalogService[]>();
    for (const s of visible) map.set(s.category, [...(map.get(s.category) ?? []), s]);
    return [...map.entries()];
  }, [visible]);

  // Derived from the latest catalog, so edits or deletions never leave a stale line behind.
  const lines = services.filter((s) => s.isActive && selected.includes(s.id));

  const sum = (billing: ServiceBillingValue) => lines.filter((l) => l.billing === billing).reduce((a, l) => a + l.price, 0);
  const oneTime = sum("one_time");
  const monthly = sum("monthly");
  const yearly = sum("yearly");
  const hasBilling = (b: ServiceBillingValue) => lines.some((l) => l.billing === b);
  const hasOneTime = hasBilling("one_time");
  const hasRecurring = hasBilling("monthly") || hasBilling("yearly");

  const discountRaw = rupeesToPaise(discountInput);
  const discountInvalid = discountInput.trim() !== "" && !Number.isFinite(discountRaw);
  const discount = Number.isFinite(discountRaw) ? Math.min(discountRaw, oneTime) : 0;
  const discountCapped = Number.isFinite(discountRaw) && discountRaw > oneTime && oneTime > 0;
  const taxable = oneTime - discount;
  const gstAmount = gst ? Math.round((taxable * QUOTE_GST_PERCENT) / 100) : 0;
  const oneTimeTotal = taxable + gstAmount;
  const monthlyTotal = withGst(monthly, gst);
  const yearlyTotal = withGst(yearly, gst);
  const firstYear = oneTimeTotal + monthlyTotal * 12 + yearlyTotal;

  const totalParts = [
    { amount: oneTimeTotal, suffix: "", show: hasOneTime },
    { amount: monthlyTotal, suffix: " / month", show: hasBilling("monthly") },
    { amount: yearlyTotal, suffix: " / year", show: hasBilling("yearly") },
  ].filter((p) => p.show);

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const clear = () => {
    setSelected([]);
    setDiscountInput("");
    setGst(false);
  };

  const copyQuote = () => {
    const rows = [
      `${agencyName} — Quote${quoteFor.trim() ? ` for ${quoteFor.trim()}` : ""}`,
      `Date: ${formatDate(new Date())}`,
      "",
      ...lines.map((l) => `• ${l.name}: ${priceLabel(l.price, l.billing)}`),
      "",
    ];
    if (hasOneTime) {
      rows.push(`One-time subtotal: ${formatMoney(oneTime)}`);
      if (discount > 0) rows.push(`Discount: −${formatMoney(discount)}`);
      if (gst) rows.push(`GST (${QUOTE_GST_PERCENT}%): ${formatMoney(gstAmount)}`);
      rows.push(`Total (one-time): ${formatMoney(oneTimeTotal)}`);
    }
    if (hasBilling("monthly")) rows.push(`Monthly: ${formatMoney(monthlyTotal)} / month${gst ? " (incl. GST)" : ""}`);
    if (hasBilling("yearly")) rows.push(`Yearly: ${formatMoney(yearlyTotal)} / year${gst ? " (incl. GST)" : ""}`);
    if (hasRecurring) rows.push(`First-year total: ${formatMoney(firstYear)}`);
    navigator.clipboard.writeText(rows.join("\n")).then(
      () => toast.success("Quote copied — paste it into WhatsApp or email."),
      () => toast.error("Couldn't copy. Please try again."),
    );
  };

  const editorDialog = isAdmin && (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
      {editing !== null && <ServiceEditor key={editing === "new" ? "new" : editing.id} service={editing === "new" ? null : editing} categories={categories} onDone={() => setEditing(null)} />}
    </Dialog>
  );

  if (!services.length) {
    return (
      <>
        <Card>
          <EmptyState
            icon={<Package />}
            title="No services yet"
            description={isAdmin ? "Add your services with their prices. Then pick what a client needs and see the total instantly." : "An admin hasn't added any services yet."}
            action={
              isAdmin ? (
                <Button onClick={() => setEditing("new")}>
                  <Plus /> Add your first service
                </Button>
              ) : undefined
            }
          />
        </Card>
        {editorDialog}
      </>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services" className="pl-9" aria-label="Search services" />
            </div>
            {isAdmin && (
              <Button className="ml-auto shrink-0" onClick={() => setEditing("new")}>
                <Plus /> Add service
              </Button>
            )}
          </div>
          {categories.length > 1 && (
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {["all", ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={activeCategory === c}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition",
                    activeCategory === c ? "border-ink bg-ink text-cream" : "border-line bg-white text-ink-soft hover:border-[#d9d1c4]",
                  )}
                >
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
          )}
        </div>

        {grouped.length === 0 ? (
          <Card>
            <EmptyState compact icon={<Search />} title="No services match" description="Try a different search or category." />
          </Card>
        ) : (
          grouped.map(([cat, list]) => (
            <section key={cat} className="space-y-3">
              {categories.length > 1 && <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{cat}</h2>}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((s) => {
                  const on = s.isActive && selected.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "flex flex-col rounded-2xl border bg-white shadow-card transition",
                        on ? "border-orange ring-3 ring-orange/15" : "border-line",
                        s.isActive && !on && "hover:border-[#d9d1c4] hover:shadow-lift",
                        !s.isActive && "opacity-70",
                      )}
                    >
                      <button
                        type="button"
                        disabled={!s.isActive}
                        aria-pressed={on}
                        onClick={() => toggle(s.id)}
                        className={cn("group flex flex-1 flex-col rounded-2xl p-4 text-left disabled:cursor-not-allowed", on && "bg-orange-soft/30")}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0 break-words text-[15px] font-semibold text-ink">{s.name}</span>
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-full border transition",
                              on ? "border-orange bg-orange text-white" : "border-line bg-white text-transparent group-enabled:group-hover:border-[#cfc6b8]",
                            )}
                            aria-hidden
                          >
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                        </span>
                        <span className="mt-1.5 font-serif text-2xl font-medium tracking-tight text-ink">
                          {formatMoney(s.price)}
                          {SERVICE_BILLING_SUFFIX[s.billing] && <span className="ml-1 font-sans text-[13px] font-normal text-muted">{SERVICE_BILLING_SUFFIX[s.billing]}</span>}
                        </span>
                        {s.description && <span className="mt-2 break-words text-[13px] leading-snug text-muted">{s.description}</span>}
                        {s.features.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {s.features.map((f, i) => (
                              <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-soft">
                                <Check className="mt-0.5 size-3.5 shrink-0 text-green" />
                                <span className="min-w-0 break-words">{f}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </button>
                      {(isAdmin || !s.isActive) && (
                        <div className="flex items-center justify-between gap-2 border-t border-line-soft px-4 py-2">
                          {!s.isActive ? <Badge tone="outline">Hidden from quotes</Badge> : <span />}
                          {isAdmin && (
                            <Button variant="ghost" size="sm" className="-mr-2" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                              <Pencil /> Edit
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Quote summary */}
      <div id="quote" className="scroll-mt-24 lg:sticky lg:top-24">
        <Card>
          <CardHeader
            title="Quote"
            description={lines.length ? `${lines.length} service${lines.length === 1 ? "" : "s"} selected` : "Select services to build a quote."}
            icon={<ShoppingCart />}
            action={
              lines.length ? (
                <Button variant="ghost" size="sm" onClick={clear}>
                  <RotateCcw /> Clear
                </Button>
              ) : undefined
            }
          />
          {lines.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">Nothing selected yet. Click a service to add it — click again to remove it.</p>
          ) : (
            <div className="space-y-4 p-5">
              <ul className="space-y-2.5">
                {lines.map((l) => (
                  <li key={l.id} className="flex items-start gap-2 text-sm">
                    <p className="min-w-0 flex-1 truncate font-medium text-ink">{l.name}</p>
                    <span className="shrink-0 text-right tabular-nums text-ink">{priceLabel(l.price, l.billing)}</span>
                    <button type="button" onClick={() => toggle(l.id)} className="-mr-1 shrink-0 rounded p-0.5 text-subtle transition hover:bg-cream hover:text-ink" aria-label={`Remove ${l.name}`}>
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="space-y-3 border-t border-line-soft pt-4">
                {hasOneTime && (
                  <>
                    <Row label="One-time subtotal" value={formatMoney(oneTime)} />
                    <Field
                      label="Discount on one-time (₹)"
                      htmlFor="quote-discount"
                      error={discountInvalid ? "Enter a valid amount." : null}
                      hint={discountCapped ? "Capped at the one-time subtotal." : undefined}
                    >
                      <Input id="quote-discount" inputMode="decimal" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="0" aria-invalid={discountInvalid || undefined} />
                    </Field>
                    {discount > 0 && <Row label="Discount" value={`−${formatMoney(discount)}`} />}
                  </>
                )}
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={gst} onChange={(e) => setGst(e.target.checked)} className="size-4" />
                  Add GST ({QUOTE_GST_PERCENT}%)
                </label>
                {gst && hasOneTime && <Row label={`GST (${QUOTE_GST_PERCENT}%)`} value={formatMoney(gstAmount)} />}
              </div>

              <div className="rounded-xl bg-ink p-4 text-cream">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-cream/60">Total{gst ? " · incl. GST" : ""}</p>
                {totalParts.map((p, i) => (
                  <p key={p.suffix || "once"} className={cn("tabular-nums", i === 0 ? "mt-1 font-serif text-[32px] font-medium leading-tight" : "mt-0.5 text-sm text-cream/85")}>
                    {i > 0 && "+ "}
                    {formatMoney(p.amount)}
                    <span className={cn(i === 0 ? "ml-1 font-sans text-sm font-normal text-cream/70" : "text-cream/70")}>{p.suffix}</span>
                  </p>
                ))}
                {hasRecurring && <p className="mt-2 border-t border-cream/15 pt-2 text-xs text-cream/70">First-year total: {formatMoney(firstYear)}</p>}
              </div>

              <div className="space-y-2">
                <Input value={quoteFor} onChange={(e) => setQuoteFor(e.target.value)} placeholder="Quote for (client name, optional)" aria-label="Quote for" />
                <Button variant="secondary" className="w-full" onClick={copyQuote}>
                  <Copy /> Copy quote
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Mobile shortcut to the total */}
      {totalParts[0] && (
        <a href="#quote" className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-cream shadow-pop lg:hidden">
          <ShoppingCart className="size-4" />
          {lines.length} · {formatMoney(totalParts[0].amount)}
          {totalParts[0].suffix}
        </a>
      )}

      {editorDialog}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  );
}
