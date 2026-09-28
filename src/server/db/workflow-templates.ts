import type { PipelineStageValue } from "@/lib/constants";

export interface WorkflowTemplateStep {
  name: string;
  key: string;
  stage: PipelineStageValue;
  clientLabel?: string;
  clientVisible?: boolean;
  description?: string;
}

export interface WorkflowTemplate {
  slug: string;
  name: string;
  serviceType: string;
  description: string;
  steps: WorkflowTemplateStep[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    slug: "website",
    name: "Website Project",
    serviceType: "website",
    description: "Standard RQdinn website delivery — from confirmation to launch and maintenance.",
    steps: [
      { name: "Client Confirmed", key: "client_confirmed", stage: "new", clientVisible: false },
      { name: "Agreement", key: "agreement", stage: "new" },
      { name: "Advance Payment", key: "advance_payment", stage: "payment_pending" },
      { name: "Onboarding", key: "onboarding", stage: "onboarding" },
      { name: "Content Collection", key: "content_collection", stage: "onboarding" },
      { name: "Development", key: "development", stage: "development" },
      { name: "Client Review", key: "client_review", stage: "review" },
      { name: "Final Approval", key: "final_approval", stage: "review", clientVisible: false },
      { name: "Final Payment", key: "final_payment", stage: "payment_pending" },
      { name: "Domain & Hosting", key: "domain_hosting", stage: "ready_to_launch", clientVisible: false },
      { name: "Deployment", key: "deployment", stage: "ready_to_launch", clientLabel: "Launch" },
      { name: "Maintenance", key: "maintenance", stage: "live" },
    ],
  },
  {
    slug: "restaurant-website",
    name: "Restaurant Website",
    serviceType: "website",
    description: "Website workflow tuned for restaurants — menu and food photography collection included.",
    steps: [
      { name: "Client Confirmed", key: "client_confirmed", stage: "new", clientVisible: false },
      { name: "Agreement", key: "agreement", stage: "new" },
      { name: "Advance Payment", key: "advance_payment", stage: "payment_pending" },
      { name: "Onboarding", key: "onboarding", stage: "onboarding" },
      { name: "Content Collection", key: "content_collection", stage: "onboarding", description: "Menu, food photos and venue photos." },
      { name: "Development", key: "development", stage: "development" },
      { name: "Review", key: "client_review", stage: "review", clientLabel: "Client Review" },
      { name: "Final Payment", key: "final_payment", stage: "payment_pending" },
      { name: "Deployment", key: "deployment", stage: "ready_to_launch", clientLabel: "Launch" },
      { name: "Maintenance", key: "maintenance", stage: "live" },
    ],
  },
  {
    slug: "qr-ordering",
    name: "QR Ordering System",
    serviceType: "qr_ordering",
    description: "Table QR ordering rollout for restaurants.",
    steps: [
      { name: "Client Confirmed", key: "client_confirmed", stage: "new", clientVisible: false },
      { name: "Agreement", key: "agreement", stage: "new" },
      { name: "Payment", key: "advance_payment", stage: "payment_pending" },
      { name: "Restaurant Setup", key: "onboarding", stage: "onboarding" },
      { name: "Menu Setup", key: "content_collection", stage: "onboarding" },
      { name: "QR Generation", key: "development", stage: "development" },
      { name: "Staff Setup", key: "staff_setup", stage: "development" },
      { name: "Testing", key: "client_review", stage: "review" },
      { name: "Training", key: "training", stage: "ready_to_launch" },
      { name: "Launch", key: "deployment", stage: "ready_to_launch" },
      { name: "Maintenance", key: "maintenance", stage: "live" },
    ],
  },
  {
    slug: "custom-software",
    name: "Custom Software / CRM",
    serviceType: "custom",
    description: "Discovery-led delivery for CRMs and business applications.",
    steps: [
      { name: "Client Confirmed", key: "client_confirmed", stage: "new", clientVisible: false },
      { name: "Agreement", key: "agreement", stage: "new" },
      { name: "Advance Payment", key: "advance_payment", stage: "payment_pending" },
      { name: "Discovery & Onboarding", key: "onboarding", stage: "onboarding" },
      { name: "Requirements Sign-off", key: "content_collection", stage: "onboarding" },
      { name: "Development", key: "development", stage: "development" },
      { name: "UAT", key: "client_review", stage: "review", clientLabel: "Testing & Review" },
      { name: "Final Payment", key: "final_payment", stage: "payment_pending" },
      { name: "Go-live", key: "deployment", stage: "ready_to_launch", clientLabel: "Launch" },
      { name: "Support & Maintenance", key: "maintenance", stage: "live" },
    ],
  },
];
