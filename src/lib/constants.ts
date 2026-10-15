/** Shared domain vocabulary (safe to import from client and server). */

export const APP_NAME = "RQdinn Client OS";
export const BRAND = "RQDINN";
export const TAGLINE = "Build. Manage. Deliver.";

export const CLIENT_STATUSES = ["lead", "active", "on_hold", "completed", "maintenance"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  lead: "Lead",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  maintenance: "Maintenance",
};

export const INDUSTRIES = [
  { value: "restaurant", label: "Restaurant / Café" },
  { value: "retail", label: "Retail" },
  { value: "hospitality", label: "Hotel / Hospitality" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "real_estate", label: "Real Estate" },
  { value: "professional", label: "Professional Services" },
  { value: "fitness", label: "Fitness & Wellness" },
  { value: "other", label: "Other" },
] as const;
export const FOOD_INDUSTRIES = ["restaurant", "hospitality"];

export const SERVICE_TYPES = [
  { value: "website", label: "Website Development" },
  { value: "qr_ordering", label: "QR Ordering System" },
  { value: "crm", label: "CRM System" },
  { value: "business_app", label: "Business Application" },
  { value: "restaurant_system", label: "Restaurant System" },
  { value: "custom", label: "Custom Software" },
] as const;

export function labelFor(list: readonly { value: string; label: string }[], value: string | null | undefined) {
  return list.find((i) => i.value === value)?.label ?? (value ? value.replace(/_/g, " ") : "—");
}

export const STEP_STATUSES = ["not_started", "in_progress", "waiting", "completed"] as const;
export type StepStatusValue = (typeof STEP_STATUSES)[number];
export const STEP_STATUS_LABEL: Record<StepStatusValue, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  waiting: "Waiting",
  completed: "Completed",
};

export const PIPELINE_STAGES = [
  "new",
  "onboarding",
  "development",
  "review",
  "payment_pending",
  "ready_to_launch",
  "live",
] as const;
export type PipelineStageValue = (typeof PIPELINE_STAGES)[number];
export const PIPELINE_LABEL: Record<PipelineStageValue, string> = {
  new: "New",
  onboarding: "Onboarding",
  development: "In Development",
  review: "Client Review",
  payment_pending: "Payment Pending",
  ready_to_launch: "Ready to Launch",
  live: "Live",
};

export const TASK_STATUSES = ["todo", "in_progress", "waiting", "completed"] as const;
export type TaskStatusValue = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABEL: Record<TaskStatusValue, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  waiting: "Waiting",
  completed: "Completed",
};
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriorityValue = (typeof TASK_PRIORITIES)[number];

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  void: "Void",
};

export const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "gateway", label: "Payment gateway" },
  { value: "other", label: "Other" },
] as const;

export const MAINTENANCE_TYPES = [
  { value: "text", label: "Text change" },
  { value: "image", label: "Image update" },
  { value: "menu", label: "Menu update" },
  { value: "contact", label: "Contact details" },
  { value: "section", label: "Website section" },
  { value: "bug", label: "Bug / something broken" },
  { value: "other", label: "Other" },
] as const;
export const MAINTENANCE_STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  waiting_client: "Waiting for Client",
  completed: "Completed",
};

export const REVISION_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

export const DOCUMENT_TYPES = [
  { value: "agreement", label: "Agreement" },
  { value: "invoice", label: "Invoice" },
  { value: "receipt", label: "Receipt" },
  { value: "proposal", label: "Proposal" },
  { value: "brief", label: "Project Brief" },
  { value: "other", label: "Other" },
] as const;

export const FILE_FOLDERS = ["Brand", "Menu", "Food Photos", "Restaurant Photos", "Documents", "Other"] as const;
export const GENERAL_FILE_FOLDERS = ["Brand", "Content", "Photos", "Documents", "Other"] as const;

/** Step keys the workflow engine understands. */
export const STEP_KEYS = {
  confirmed: "client_confirmed",
  agreement: "agreement",
  advancePayment: "advance_payment",
  onboarding: "onboarding",
  content: "content_collection",
  development: "development",
  review: "client_review",
  approval: "final_approval",
  finalPayment: "final_payment",
  domainHosting: "domain_hosting",
  deployment: "deployment",
  launch: "launch",
  maintenance: "maintenance",
} as const;

export const DEFAULT_DEPLOYMENT_CHECKLIST: { key: string; label: string; required: boolean }[] = [
  { key: "final_payment", label: "Final payment received", required: true },
  { key: "domain", label: "Domain configured", required: true },
  { key: "dns", label: "DNS configured", required: true },
  { key: "ssl", label: "SSL active", required: true },
  { key: "mobile_testing", label: "Mobile testing", required: true },
  { key: "desktop_testing", label: "Desktop testing", required: true },
  { key: "forms", label: "Forms tested", required: true },
  { key: "whatsapp", label: "WhatsApp links tested", required: false },
  { key: "maps", label: "Google Maps tested", required: false },
  { key: "social", label: "Social links tested", required: false },
  { key: "seo", label: "SEO basics completed", required: true },
  { key: "analytics", label: "Analytics configured", required: false },
  { key: "backup", label: "Final backup", required: true },
];

export const APPROVAL_CONFIRMATION =
  "I confirm that the current website version has been reviewed and approved for launch.";

export const SERVICE_BILLINGS = ["one_time", "monthly", "yearly"] as const;
export type ServiceBillingValue = (typeof SERVICE_BILLINGS)[number];
export const SERVICE_BILLING_LABEL: Record<ServiceBillingValue, string> = {
  one_time: "One-time",
  monthly: "Monthly",
  yearly: "Yearly",
};
/** Shown after a price, e.g. "₹5,000 / month". */
export const SERVICE_BILLING_SUFFIX: Record<ServiceBillingValue, string> = {
  one_time: "",
  monthly: "/ month",
  yearly: "/ year",
};
/** GST rate offered on the Services quote calculator. */
export const QUOTE_GST_PERCENT = 18;
