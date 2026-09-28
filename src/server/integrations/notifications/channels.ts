import { db, type DbOrTx } from "@/server/db/client";
import { notifications } from "@/server/db/schema";

/**
 * Notification channels.
 *
 * Business logic never talks to providers directly: it emits an event, the
 * notification service resolves recipients, and each enabled channel delivers.
 * Adding WhatsApp / email / SMS later means implementing `send` for that channel
 * and flipping `isEnabled` — nothing in the core changes.
 */

export interface Recipient {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface OutboundMessage {
  event: string;
  title: string;
  body?: string;
  href?: string;
}

export interface NotificationChannel {
  readonly name: "in_app" | "email" | "whatsapp" | "sms" | "push";
  isEnabled(): boolean;
  send(recipient: Recipient, message: OutboundMessage, tx?: DbOrTx): Promise<void>;
}

export const inAppChannel: NotificationChannel = {
  name: "in_app",
  isEnabled: () => true,
  async send(recipient, message, tx = db) {
    await tx.insert(notifications).values({
      userId: recipient.userId,
      event: message.event,
      title: message.title,
      body: message.body,
      href: message.href,
    });
  },
};

/** Email via Resend (not wired yet). */
export const emailChannel: NotificationChannel = {
  name: "email",
  isEnabled: () => false, // Enable once RESEND_API_KEY is configured and the adapter is implemented.
  async send() {
    throw new Error("Email channel is not implemented yet.");
  },
};

/** WhatsApp Business Cloud API (not wired yet). */
export const whatsappChannel: NotificationChannel = {
  name: "whatsapp",
  isEnabled: () => false, // Requires WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN and approved templates.
  async send() {
    throw new Error("WhatsApp channel is not implemented yet.");
  },
};

export const smsChannel: NotificationChannel = {
  name: "sms",
  isEnabled: () => false,
  async send() {
    throw new Error("SMS channel is not implemented yet.");
  },
};

export const CHANNELS: NotificationChannel[] = [inAppChannel, emailChannel, whatsappChannel, smsChannel];

/** Integration status for the Settings screen. */
export function channelStatus() {
  return [
    { name: "In-app", enabled: true, note: "Active" },
    { name: "Email (Resend)", enabled: false, note: process.env.RESEND_API_KEY ? "Key found — adapter pending" : "Not configured" },
    { name: "WhatsApp Business", enabled: false, note: process.env.WHATSAPP_ACCESS_TOKEN ? "Token found — adapter pending" : "Not configured" },
    { name: "SMS", enabled: false, note: "Not configured" },
  ];
}
