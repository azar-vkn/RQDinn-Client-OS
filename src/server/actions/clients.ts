"use server";

import { z } from "zod";
import { requireStaff } from "@/server/auth/session";
import { assertClientAccess } from "@/server/auth/permissions";
import { addContact, createClient, createPortalUser, deleteContact, resetPortalPassword, updateClient } from "@/server/services/clients";
import { CLIENT_STATUSES } from "@/lib/constants";
import { formObject, run } from "./run";
import { optionalEmail, optionalPhone, optionalText, optionalUrl, optionalUuid, requiredText, uuid } from "./schemas";

const contactSchema = z.object({
  contactName: requiredText("Contact person"),
  contactRole: optionalText(100),
  contactPhone: optionalPhone(),
  contactEmail: optionalEmail,
  contactWhatsapp: optionalPhone("WhatsApp"),
});

const clientSchema = z
  .object({
    companyName: requiredText("Company name", 160),
    industry: z.string().min(1).max(40),
    status: z.enum(CLIENT_STATUSES),
    address: optionalText(500),
    city: optionalText(120),
    website: optionalUrl("Website"),
    googleBusinessUrl: optionalUrl("Google Business Profile"),
    instagram: optionalUrl("Instagram"),
    notes: optionalText(5000),
    assignedToId: optionalUuid,
  })
  .and(contactSchema)
  .transform((v) => ({
    companyName: v.companyName,
    industry: v.industry,
    status: v.status,
    address: v.address,
    city: v.city,
    website: v.website,
    googleBusinessUrl: v.googleBusinessUrl,
    instagram: v.instagram,
    notes: v.notes,
    assignedToId: v.assignedToId,
    contact: { name: v.contactName, role: v.contactRole, phone: v.contactPhone, email: v.contactEmail, whatsapp: v.contactWhatsapp },
  }));

export async function createClientAction(fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    const client = await createClient(clientSchema.parse(formObject(fd)), actor);
    return { id: client.id };
  }, "Client created.");
}

export async function updateClientAction(clientId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertClientAccess(actor, clientId);
    await updateClient(clientId, clientSchema.parse(formObject(fd)), actor);
  }, "Client updated.");
}

export async function addContactAction(clientId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertClientAccess(actor, clientId);
    const c = contactSchema.parse(formObject(fd));
    await addContact(clientId, { name: c.contactName, role: c.contactRole, phone: c.contactPhone, email: c.contactEmail, whatsapp: c.contactWhatsapp });
  }, "Contact added.");
}

export async function deleteContactAction(clientId: string, contactId: string) {
  return run(async () => {
    const actor = await requireStaff();
    await assertClientAccess(actor, clientId);
    await deleteContact(clientId, uuid.parse(contactId));
  }, "Contact removed.");
}

const portalSchema = z.object({
  name: requiredText("Name"),
  email: z.string().trim().email("Enter a valid email address."),
});

export async function createPortalUserAction(clientId: string, fd: FormData) {
  return run(async () => {
    const actor = await requireStaff();
    await assertClientAccess(actor, clientId);
    return createPortalUser(clientId, portalSchema.parse(formObject(fd)), actor);
  });
}

export async function resetPortalPasswordAction(clientId: string, userId: string) {
  return run(async () => {
    const actor = await requireStaff();
    await assertClientAccess(actor, clientId);
    return resetPortalPassword(clientId, uuid.parse(userId));
  });
}
