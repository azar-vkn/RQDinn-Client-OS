/**
 * Demo data. Everything created here is flagged `is_demo` and uses *.demo email
 * addresses. Demo sign-in accounts (password below) are listed in README.md.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { db } from "./client";
import * as s from "./schema";
import { WORKFLOW_TEMPLATES } from "./workflow-templates";
import { hashPassword } from "@/server/auth/password";
import type { Actor } from "@/server/auth/session";
import { DEFAULT_AGREEMENT_TEMPLATE } from "@/lib/agreement-template";
import { DEFAULT_AGENCY, setSetting } from "@/server/services/settings";
import { createProject } from "@/server/services/projects";
import { recordPayment, createInvoice, markInvoiceSent } from "@/server/services/billing";
import { generateAgreement, sendAgreement, acceptAgreement } from "@/server/services/agreements";
import { saveAnswer, completeOnboarding, saveCallNotes } from "@/server/services/onboarding";
import { saveUpload } from "@/server/services/files";
import { handleEvent } from "@/server/services/workflow-engine";
import { addPreview, requestChanges, updateRevision, sendPreview, approveProject, launchProject, startMaintenance } from "@/server/services/delivery";
import { createMaintenanceRequest } from "@/server/services/maintenance";

import { DEMO_PASSWORD } from "./demo";
export { DEMO_PASSWORD };

const ALL_TABLES = [
  "notifications", "activity_logs", "sessions", "maintenance_requests", "launches", "deployment_items", "approvals",
  "revisions", "previews", "tasks", "payments", "payment_milestones", "invoice_items", "invoices", "agreements",
  "agreement_templates", "documents", "files", "onboarding_answers", "onboarding_forms", "project_steps", "projects",
  "workflow_steps", "workflows", "client_contacts", "users", "clients", "settings",
];

export async function truncateAll(database: Database = db) {
  await database.execute(sql.raw(`TRUNCATE ${ALL_TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`));
}

export async function seedIfEmpty(database: Database) {
  const [{ n }] = await database.select({ n: sql<number>`count(*)::int` }).from(s.users);
  if (n === 0) await seed({ freshDparkz: process.env.SEED_FRESH_DPARKZ === "true" });
}

const rupees = (n: number) => n * 100;
const daysAgo = (d: number, h = 10) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(h, 0, 0, 0);
  return x;
};
const isoDaysFromNow = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};

/** Spread a project's activity log across a realistic time range so the timeline reads naturally. */
async function backdate(projectId: string, startDaysAgo: number, endDaysAgo = 0) {
  const logs = await db
    .select({ id: s.activityLogs.id })
    .from(s.activityLogs)
    .where(eq(s.activityLogs.projectId, projectId))
    .orderBy(asc(s.activityLogs.createdAt), asc(s.activityLogs.id));
  const start = daysAgo(startDaysAgo, 10).getTime();
  const end = Math.min(daysAgo(endDaysAgo, 17).getTime(), Date.now() - 20 * 60_000);
  const step = logs.length > 1 ? (end - start) / (logs.length - 1) : 0;
  for (let i = 0; i < logs.length; i++) {
    await db.update(s.activityLogs).set({ createdAt: new Date(start + step * i) }).where(eq(s.activityLogs.id, logs[i].id));
  }
  // Stages happened one after another across the same range.
  const steps = await db
    .select()
    .from(s.projectSteps)
    .where(and(eq(s.projectSteps.projectId, projectId), sql`${s.projectSteps.startedAt} is not null`))
    .orderBy(asc(s.projectSteps.position));
  for (let i = 0; i < steps.length; i++) {
    const startedAt = new Date(start + ((end - start) * i) / steps.length);
    const completedAt = steps[i].completedAt ? new Date(Math.min(end, start + ((end - start) * (i + 1)) / steps.length - 3600_000)) : null;
    await db.update(s.projectSteps).set({ startedAt, completedAt }).where(eq(s.projectSteps.id, steps[i].id));
  }
  const [p] = await db.update(s.projects).set({ createdAt: new Date(start) }).where(eq(s.projects.id, projectId)).returning();
  // Client-level entries (e.g. "Client created") happen just before the project.
  await db
    .update(s.activityLogs)
    .set({ createdAt: new Date(start - 3600_000) })
    .where(and(eq(s.activityLogs.clientId, p.clientId), sql`${s.activityLogs.projectId} is null`));
  await db.update(s.clients).set({ createdAt: new Date(start - 3600_000) }).where(eq(s.clients.id, p.clientId));
}

async function demoLogoSvg(name: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240"><rect width="640" height="240" rx="28" fill="#252321"/><text x="320" y="138" text-anchor="middle" font-family="Georgia, serif" font-size="84" font-weight="700" fill="${color}" letter-spacing="6">${name}</text><text x="320" y="186" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#F7F3EA" letter-spacing="8">RESTAURANT · CAFÉ</text></svg>`;
  return new File([svg], `${name.replace(/[^A-Za-z]/g, "").toLowerCase()}-logo.svg`, { type: "image/svg+xml" });
}

async function demoMenuPdf(title: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.97, 0.95, 0.92) });
  page.drawText(title, { x: 60, y: 760, size: 36, font: serif, color: rgb(0.15, 0.14, 0.13) });
  page.drawText("MENU  ·  DEMO FILE", { x: 60, y: 732, size: 11, font: sans, color: rgb(0.85, 0.47, 0.34) });
  const items = [
    ["Signature Alfaham (Half)", "320"], ["Kuzhimandi Chicken", "380"], ["Beef Fry Kerala Style", "260"], ["Dragon Chicken", "290"],
    ["Paneer Butter Masala", "240"], ["Malabar Parotta (2)", "40"], ["Fresh Lime Soda", "60"], ["Falooda Royale", "160"],
  ];
  items.forEach(([n, p], i) => {
    page.drawText(n, { x: 60, y: 670 - i * 40, size: 15, font: sans, color: rgb(0.15, 0.14, 0.13) });
    page.drawText(`Rs. ${p}`, { x: 470, y: 670 - i * 40, size: 15, font: sans, color: rgb(0.42, 0.56, 0.44) });
  });
  const bytes = await pdf.save();
  return new File([new Uint8Array(bytes)], `${title.replace(/[^A-Za-z]/g, "").toLowerCase()}-menu.pdf`, { type: "application/pdf" });
}

/**
 * Essentials every installation needs, with or without demo data:
 * agency settings, the default agreement template and the standard workflows.
 */
export async function seedBase() {
  await setSetting("agency", DEFAULT_AGENCY);
  await db.insert(s.agreementTemplates).values({ name: "Website Development Agreement", body: DEFAULT_AGREEMENT_TEMPLATE, isDefault: true });
  const wfIds: Record<string, string> = {};
  for (const t of WORKFLOW_TEMPLATES) {
    const [wf] = await db.insert(s.workflows).values({ name: t.name, slug: t.slug, description: t.description, serviceType: t.serviceType }).returning();
    wfIds[t.slug] = wf.id;
    await db.insert(s.workflowSteps).values(
      t.steps.map((st, i) => ({
        workflowId: wf.id,
        position: i + 1,
        name: st.name,
        key: st.key,
        pipelineStage: st.stage,
        clientVisible: st.clientVisible ?? true,
        clientLabel: st.clientLabel,
        description: st.description,
      })),
    );
  }
  return { wfIds };
}

export async function seed(opts: { freshDparkz?: boolean } = {}) {
  console.log("[seed] Seeding demo data…");
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const { wfIds } = await seedBase();

  // Staff
  const [admin] = await db.insert(s.users).values({ name: "RQdinn Admin", email: "admin@rqdinn.demo", role: "admin", title: "Founder", passwordHash }).returning();
  const [aisha] = await db.insert(s.users).values({ name: "Aisha Rahman", email: "aisha@rqdinn.demo", role: "team", title: "Project Manager", passwordHash }).returning();
  const [rohan] = await db.insert(s.users).values({ name: "Rohan Menon", email: "rohan@rqdinn.demo", role: "team", title: "Developer", passwordHash }).returning();
  const actor: Actor = { id: admin.id, name: admin.name, email: admin.email, role: "admin", title: admin.title, clientId: null };
  const aishaActor: Actor = { id: aisha.id, name: aisha.name, email: aisha.email, role: "team", title: aisha.title, clientId: null };

  const [template] = await db.select().from(s.agreementTemplates).limit(1);

  const newClient = async (c: typeof s.clients.$inferInsert, contact: Omit<typeof s.clientContacts.$inferInsert, "clientId">) => {
    const [row] = await db.insert(s.clients).values({ ...c, isDemo: true }).returning();
    await db.insert(s.clientContacts).values({ ...contact, clientId: row.id, isPrimary: true });
    await db.insert(s.activityLogs).values({ clientId: row.id, actorId: admin.id, event: "client.created", description: `Client ${row.companyName} created`, clientVisible: true });
    return row;
  };
  const clientUser = async (clientId: string, name: string, email: string) => {
    const [u] = await db.insert(s.users).values({ name, email, role: "client", clientId, passwordHash }).returning();
    return { id: u.id, name: u.name, email: u.email, role: "client", title: null, clientId } as Actor;
  };
  const answer = (projectId: string, a: Actor, entries: Record<string, unknown>) =>
    Promise.all(Object.entries(entries).map(([k, v]) => saveAnswer(projectId, k, v, "answered", a)));
  const later = (projectId: string, a: Actor, keys: string[]) => Promise.all(keys.map((k) => saveAnswer(projectId, k, null, "client_later", a)));

  /* ── 1. D'PARKZ — the hero demo client (In Development) ── */
  if (!opts.freshDparkz) {
    const dparkz = await newClient(
      {
        companyName: "D'PARKZ",
        industry: "restaurant",
        status: "active",
        address: "Bypass Road, Near Town Junction",
        city: "Kottakkal, Kerala",
        website: null,
        instagram: "https://instagram.com/dparkz.demo",
        assignedToId: aisha.id,
        notes: "Family restaurant & café. Owner prefers WhatsApp for updates. [Demo data]",
      },
      { name: "Muhammed Riyas", role: "Owner", phone: "+91 98470 12345", email: "riyas@dparkz.demo", whatsapp: "+91 98470 12345" },
    );
    const owner = await clientUser(dparkz.id, "Muhammed Riyas", "owner@dparkz.demo");
    const p = await createProject(
      {
        clientId: dparkz.id,
        workflowId: wfIds["website"],
        name: "D'PARKZ Official Website",
        serviceType: "website",
        value: rupees(30000),
        annualValue: rupees(6000),
        assignedToId: aisha.id,
        startDate: isoDaysFromNow(-6),
        dueDate: isoDaysFromNow(14),
        isDemo: true,
      },
      actor,
    );
    const ag = await generateAgreement(p.id, template.id, {}, actor);
    await sendAgreement(ag.id, actor);
    await acceptAgreement(ag.id, owner, { name: "Muhammed Riyas", ip: "demo" });
    const [adv, fin, ann] = await db.select().from(s.paymentMilestones).where(eq(s.paymentMilestones.projectId, p.id)).orderBy(asc(s.paymentMilestones.position));
    const inv = await createInvoice(
      {
        clientId: dparkz.id,
        projectId: p.id,
        issueDate: isoDaysFromNow(-6),
        dueDate: isoDaysFromNow(1),
        notes: DEFAULT_AGENCY.invoiceNotes,
        items: [
          { description: "Website Development", quantity: 1, unitPrice: rupees(30000) },
          { description: "Domain + Hosting + SSL + Maintenance (1 year)", quantity: 1, unitPrice: rupees(6000) },
        ],
        milestoneIds: [adv.id, fin.id, ann.id],
      },
      actor,
    );
    await markInvoiceSent(inv.id, actor);
    await recordPayment({ projectId: p.id, milestoneId: adv.id, amount: rupees(15000), method: "upi", reference: "UPI-DEMO-4417", receivedAt: daysAgo(5) }, actor);

    await db.update(s.projects).set({ onboardingAt: daysAgo(4, 11), onboardingMeetingLink: "https://meet.google.com/demo-dpk-rqd", onboardingAssigneeId: aisha.id }).where(eq(s.projects.id, p.id));
    await answer(p.id, aishaActor, {
      "business.name": "D'PARKZ",
      "business.type": "Family restaurant & café",
      "business.description": "A warm family restaurant known for Arabian grills, Kuzhimandi and Kerala classics, with a relaxed café corner for evenings.",
      "business.restaurant_type": "Casual dining",
      "business.cuisine": "Arabian, Kerala, Chinese",
      "business.locations": 1,
      "business.dining_options": ["Dine-in", "Takeaway", "Delivery"],
      "business.delivery": "Own + partners",
      "business.reservations": "Phone reservations",
      "business.address": "Bypass Road, Near Town Junction, Kottakkal, Malappuram, Kerala 676503",
      "business.city": "Kottakkal",
      "business.state": "Kerala",
      "business.country": "India",
      "business.maps_url": "https://maps.google.com/?q=DPARKZ+Kottakkal",
      "business.hours": "Every day 11:30 AM – 11:30 PM",
      "business.phone": "+91 98470 12345",
      "business.whatsapp": "+91 98470 12345",
      "business.email": "hello@dparkz.demo",
      "contact.name": "Muhammed Riyas",
      "contact.role": "Owner",
      "contact.phone": "+91 98470 12345",
      "contact.email": "riyas@dparkz.demo",
      "contact.approver": "Muhammed Riyas",
      "contact.preferred_channel": "WhatsApp",
      "contact.best_time": "Weekdays 3–6 PM",
      "brand.primary_color": "#C8102E",
      "brand.secondary_color": "#F2B705",
      "brand.style": "Warm & friendly",
      "brand.typography": "Mix of serif & sans",
      "content.about": "Started in 2019 by the Riyas family, D'PARKZ brings together Arabian grills and Kerala home-style cooking under one roof.",
      "content.menu": "Arabian: Alfaham, Kuzhimandi, Shawai\nKerala: Beef fry, Parotta, Fish curry meals\nChinese: Dragon chicken, Fried rice\nDesserts & drinks: Falooda, Fresh juices",
      "content.offers": "Family combo for 4 — ₹999 (weekends)",
      "content.cta": ["Call now", "WhatsApp us", "Get directions"],
      "content.references": "https://www.barbequenation.com",
      "social.instagram": "https://instagram.com/dparkz.demo",
      "social.facebook": "https://facebook.com/dparkz.demo",
      "requirements.features": ["About section", "Menu", "Gallery", "Contact", "Google Maps", "WhatsApp button", "Testimonials"],
      "requirements.expectations": "More weekend family bookings and a menu customers can open easily on their phones.",
      "requirements.not_wanted": "No online payment or ordering for now. No stock photos of food that isn't ours.",
    });
    await saveUpload({ file: await demoLogoSvg("D'PARKZ", "#F2B705"), clientId: dparkz.id, projectId: p.id, folder: "Brand", uploadedById: aisha.id, onboardingFieldKey: "brand.logo" });
    await saveUpload({ file: await demoMenuPdf("D'PARKZ"), clientId: dparkz.id, projectId: p.id, folder: "Menu", uploadedById: owner.id, onboardingFieldKey: "content.menu_file" });
    await later(p.id, aishaActor, ["assets.food_photos", "assets.place_photos"]);
    await saveCallNotes(p.id, "Owner wants the menu to be the hero on mobile. Food shoot planned next week — photos to follow. Wants WhatsApp enquiries, not online orders.", aishaActor);
    await completeOnboarding(p.id, aishaActor);
    await handleEvent(p.id, "content.completed");
    const stepId = Object.fromEntries((await db.select().from(s.projectSteps).where(eq(s.projectSteps.projectId, p.id))).map((st) => [st.key, st.id]));
    await db.insert(s.tasks).values(
      [
        ["Collect logo", "completed", "high", "content_collection"],
        ["Collect menu", "completed", "high", "content_collection"],
        ["Optimize food images", "todo", "medium", "development"],
        ["Build homepage", "in_progress", "high", "development"],
        ["Build menu section", "todo", "high", "development"],
        ["Add Google Maps", "todo", "medium", "development"],
        ["Add WhatsApp button", "todo", "medium", "development"],
        ["Mobile testing", "todo", "medium", "development"],
        ["Client review", "todo", "medium", "client_review"],
        ["Deploy", "todo", "low", "deployment"],
      ].map(([title, status, priority, stage], i) => ({
        projectId: p.id,
        projectStepId: stepId[stage] ?? null,
        title: title as string,
        status: status as "todo",
        priority: priority as "medium",
        assigneeId: i < 3 ? aisha.id : rohan.id,
        dueDate: isoDaysFromNow(i),
        position: i + 10,
        completedAt: status === "completed" ? daysAgo(3) : null,
        createdById: admin.id,
      })),
    );
    await backdate(p.id, 6, 1);
  }

  /* ── 2. Spice Route Kitchen — QR ordering, onboarding in progress ── */
  {
    const c = await newClient(
      { companyName: "Spice Route Kitchen", industry: "restaurant", status: "active", city: "Kochi, Kerala", assignedToId: rohan.id, notes: "[Demo data] QR table ordering for 18 tables." },
      { name: "Neha Varghese", role: "Operations Head", phone: "+91 90370 55512", email: "neha@spiceroute.demo", whatsapp: "+91 90370 55512" },
    );
    const p = await createProject(
      { clientId: c.id, workflowId: wfIds["qr-ordering"], name: "Spice Route QR Ordering", serviceType: "qr_ordering", value: rupees(45000), annualValue: rupees(9000), assignedToId: rohan.id, startDate: isoDaysFromNow(-3), dueDate: isoDaysFromNow(21), isDemo: true },
      actor,
    );
    const ag = await generateAgreement(p.id, template.id, {}, actor);
    await acceptAgreement(ag.id, actor, { name: "Neha Varghese", offline: true });
    const [adv] = await db.select().from(s.paymentMilestones).where(and(eq(s.paymentMilestones.projectId, p.id), eq(s.paymentMilestones.kind, "advance")));
    await recordPayment({ projectId: p.id, milestoneId: adv.id, amount: adv.amount, method: "bank_transfer", reference: "NEFT-DEMO-2210", receivedAt: daysAgo(2) }, actor);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    await db.update(s.projects).set({ onboardingAt: tomorrow, onboardingMeetingLink: "https://meet.google.com/demo-spc-rqd", onboardingAssigneeId: rohan.id }).where(eq(s.projects.id, p.id));
    await answer(p.id, actor, { "business.name": "Spice Route Kitchen", "business.type": "Multi-cuisine restaurant", "business.cuisine": "North Indian, Chinese", "business.locations": 2 });
    await backdate(p.id, 3, 0);
  }

  /* ── 3. Nova Dental Studio — in client review ── */
  {
    const c = await newClient(
      { companyName: "Nova Dental Studio", industry: "healthcare", status: "active", city: "Kozhikode, Kerala", assignedToId: aisha.id, website: "https://novadental.demo", notes: "[Demo data]" },
      { name: "Dr. Sneha Nair", role: "Founder", phone: "+91 94470 88120", email: "sneha@novadental.demo", whatsapp: "+91 94470 88120" },
    );
    const doc = await clientUser(c.id, "Dr. Sneha Nair", "sneha@novadental.demo");
    const p = await createProject(
      { clientId: c.id, workflowId: wfIds["website"], name: "Nova Dental Website", serviceType: "website", value: rupees(25000), annualValue: rupees(5000), assignedToId: aisha.id, startDate: isoDaysFromNow(-20), dueDate: isoDaysFromNow(4), isDemo: true },
      actor,
    );
    const ag = await generateAgreement(p.id, template.id, {}, actor);
    await sendAgreement(ag.id, actor);
    await acceptAgreement(ag.id, doc, { name: "Dr. Sneha Nair", ip: "demo" });
    const [adv] = await db.select().from(s.paymentMilestones).where(and(eq(s.paymentMilestones.projectId, p.id), eq(s.paymentMilestones.kind, "advance")));
    await recordPayment({ projectId: p.id, milestoneId: adv.id, amount: adv.amount, method: "upi", reference: "UPI-DEMO-8830", receivedAt: daysAgo(18) }, actor);
    await answer(p.id, aishaActor, {
      "business.name": "Nova Dental Studio", "business.type": "Dental clinic", "business.description": "Modern family dental clinic.", "business.address": "Mavoor Road, Kozhikode",
      "contact.name": "Dr. Sneha Nair", "contact.phone": "+91 94470 88120", "content.about": "Gentle, modern dentistry for the whole family.",
      "requirements.features": ["About section", "Services", "Gallery", "Contact", "Booking", "FAQ", "Testimonials"],
    });
    await later(p.id, aishaActor, ["brand.logo"]);
    await completeOnboarding(p.id, aishaActor);
    await handleEvent(p.id, "content.completed");
    await addPreview(p.id, { url: "https://nova-dental-v1.preview.demo", notes: "Homepage, services and contact pages.", send: true }, actor);
    const rev = await requestChanges(p.id, "1. Make the Book Appointment button bigger\n2. Replace the team photo\n3. Add Sunday timings", doc);
    await updateRevision(rev.id, { status: "completed", response: "All three changes done — see V2." }, aishaActor);
    const v2 = await addPreview(p.id, { url: "https://nova-dental-v2.preview.demo", notes: "Revision round 1 applied.", send: false }, actor);
    await sendPreview(v2.id, actor);
    await backdate(p.id, 20, 0);
  }

  /* ── 4. GreenLeaf Organics — live & in maintenance ── */
  {
    const c = await newClient(
      { companyName: "GreenLeaf Organics", industry: "retail", status: "active", city: "Thrissur, Kerala", assignedToId: rohan.id, website: "https://greenleaf.demo", notes: "[Demo data]" },
      { name: "Arjun Das", role: "Director", phone: "+91 99610 33445", email: "arjun@greenleaf.demo", whatsapp: "+91 99610 33445" },
    );
    const arjun = await clientUser(c.id, "Arjun Das", "arjun@greenleaf.demo");
    const p = await createProject(
      { clientId: c.id, workflowId: wfIds["website"], name: "GreenLeaf Store Website", serviceType: "website", value: rupees(40000), annualValue: rupees(8000), assignedToId: rohan.id, startDate: isoDaysFromNow(-75), dueDate: isoDaysFromNow(-40), isDemo: true },
      actor,
    );
    const ag = await generateAgreement(p.id, template.id, {}, actor);
    await acceptAgreement(ag.id, actor, { name: "Arjun Das", offline: true });
    const ms = await db.select().from(s.paymentMilestones).where(eq(s.paymentMilestones.projectId, p.id)).orderBy(asc(s.paymentMilestones.position));
    await recordPayment({ projectId: p.id, milestoneId: ms[0].id, amount: ms[0].amount, method: "bank_transfer", reference: "NEFT-DEMO-1101", receivedAt: daysAgo(74) }, actor);
    await answer(p.id, actor, {
      "business.name": "GreenLeaf Organics", "business.type": "Organic grocery store", "business.description": "Farm-fresh organic produce.", "business.address": "Round North, Thrissur",
      "contact.name": "Arjun Das", "contact.phone": "+91 99610 33445", "content.about": "Organic produce sourced directly from Kerala farmers.", "requirements.features": ["About section", "Product catalog", "Contact", "WhatsApp button"],
    });
    await completeOnboarding(p.id, actor);
    await addPreview(p.id, { url: "https://greenleaf-v1.preview.demo", send: true }, actor);
    await approveProject(p.id, arjun, { name: "Arjun Das", ip: "demo" });
    await recordPayment({ projectId: p.id, milestoneId: ms[1].id, amount: ms[1].amount, method: "bank_transfer", reference: "NEFT-DEMO-1188", receivedAt: daysAgo(45) }, actor);
    await recordPayment({ projectId: p.id, milestoneId: ms[2].id, amount: ms[2].amount, method: "upi", reference: "UPI-DEMO-1190", receivedAt: daysAgo(45) }, actor);
    await db.update(s.deploymentItems).set({ isDone: true, doneAt: daysAgo(44), doneById: rohan.id }).where(eq(s.deploymentItems.projectId, p.id));
    await handleEvent(p.id, "deployment.infrastructure_ready");
    const renew = new Date();
    renew.setDate(renew.getDate() + 320);
    await launchProject(p.id, { url: "https://greenleaf.demo", hostingRenewalDate: renew.toISOString().slice(0, 10), maintenanceRenewalDate: renew.toISOString().slice(0, 10), analyticsUrl: "https://analytics.google.com" }, actor);
    await db.update(s.launches).set({ launchedAt: daysAgo(42) }).where(eq(s.launches.projectId, p.id));
    await startMaintenance(p.id, actor);
    await createMaintenanceRequest({ projectId: p.id, type: "image", title: "Update Onam offer banner", description: "Please replace the homepage banner with the new Onam offer (20% off on all vegetables). Image attached on WhatsApp." }, arjun);
    await backdate(p.id, 75, 1);
  }

  /* ── 5. Kaapi House Café — new lead ── */
  {
    const c = await newClient(
      { companyName: "Kaapi House Café", industry: "restaurant", status: "lead", city: "Bengaluru, Karnataka", assignedToId: aisha.id, notes: "[Demo data] Referred by D'PARKZ." },
      { name: "Karthik Rao", role: "Co-founder", phone: "+91 98450 77001", email: "karthik@kaapihouse.demo", whatsapp: "+91 98450 77001" },
    );
    const p = await createProject(
      { clientId: c.id, workflowId: wfIds["restaurant-website"], name: "Kaapi House Website", serviceType: "website", value: rupees(28000), annualValue: rupees(6000), assignedToId: aisha.id, dueDate: isoDaysFromNow(35), isDemo: true },
      actor,
    );
    await generateAgreement(p.id, template.id, {}, actor);
    // Still a lead: the proposal/agreement is out, nothing signed yet.
    await db.update(s.clients).set({ status: "lead" }).where(eq(s.clients.id, c.id));
    await backdate(p.id, 1, 0);
  }

  // Demo seeding shouldn't leave a wall of unread notifications.
  await db.update(s.notifications).set({ readAt: new Date() });
  console.log("[seed] Done.");
}
