/**
 * Onboarding form definition.
 *
 * The form is declarative: sections → fields. Fields can be limited to certain
 * industries or services, which makes the form adapt to each client. Answers are
 * stored per field key in `onboarding_answers`; file fields are answered by rows
 * in `files` tagged with `onboarding_field_key`.
 */
import { FOOD_INDUSTRIES } from "./constants";

export type FieldType =
  | "text"
  | "textarea"
  | "url"
  | "phone"
  | "email"
  | "number"
  | "select"
  | "multiselect"
  | "checklist"
  | "color"
  | "file";

export interface OnboardingField {
  key: string;
  label: string;
  /** Conversational phrasing used in Onboarding Call Mode. */
  question: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  options?: string[];
  /** Allow adding custom options (checklists). */
  allowCustom?: boolean;
  required?: boolean;
  /** Show only for these industries. */
  industries?: string[];
  /** Show only for these service types. */
  services?: string[];
  /** For file fields: destination folder + whether this is a tracked asset. */
  folder?: string;
  asset?: boolean;
  accept?: string;
}

export interface OnboardingSection {
  key: string;
  title: string;
  description: string;
  fields: OnboardingField[];
}

export interface OnboardingContext {
  industry: string;
  serviceType: string;
}

const IMG_DOCS = "image/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip";

export const ONBOARDING_SECTIONS: OnboardingSection[] = [
  {
    key: "business",
    title: "Business Details",
    description: "The essentials about the business.",
    fields: [
      { key: "business.name", label: "Business name", question: "What is the exact name of your business, as customers should see it?", type: "text", required: true },
      { key: "business.type", label: "Business type", question: "How would you describe the type of business?", type: "text", placeholder: "e.g. Family restaurant, boutique, clinic" , required: true},
      { key: "business.description", label: "Description", question: "In a few sentences, what does your business do and what makes it special?", type: "textarea", required: true },
      { key: "business.restaurant_type", label: "Restaurant type", question: "What kind of restaurant is it?", type: "select", options: ["Fine dining", "Casual dining", "Café", "Quick service", "Cloud kitchen", "Bakery", "Bar & lounge", "Food truck"], industries: FOOD_INDUSTRIES },
      { key: "business.cuisine", label: "Cuisine", question: "Which cuisines do you serve?", type: "text", placeholder: "e.g. South Indian, Chinese, Continental", industries: FOOD_INDUSTRIES },
      { key: "business.locations", label: "Number of locations", question: "How many locations or branches do you have?", type: "number", industries: FOOD_INDUSTRIES },
      { key: "business.dining_options", label: "Dining options", question: "Which dining options do you offer?", type: "multiselect", options: ["Dine-in", "Takeaway", "Delivery", "Catering", "Private events"], industries: FOOD_INDUSTRIES },
      { key: "business.delivery", label: "Delivery availability", question: "Do you offer delivery? Through your own team or partners like Swiggy/Zomato?", type: "select", options: ["No delivery", "Own delivery", "Swiggy / Zomato", "Own + partners"], industries: FOOD_INDUSTRIES },
      { key: "business.reservations", label: "Reservation availability", question: "Do customers need to reserve a table?", type: "select", options: ["Not needed", "Phone reservations", "Online reservations wanted", "Walk-in only"], industries: FOOD_INDUSTRIES },
      { key: "business.address", label: "Address", question: "What is the full address of the business?", type: "textarea", required: true },
      { key: "business.city", label: "City", question: "Which city?", type: "text" },
      { key: "business.state", label: "State", question: "Which state?", type: "text" },
      { key: "business.country", label: "Country", question: "Which country?", type: "text", placeholder: "India" },
      { key: "business.maps_url", label: "Google Maps URL", question: "Can you share the Google Maps link for your location?", type: "url" },
      { key: "business.gbp_url", label: "Google Business Profile URL", question: "Do you have a Google Business Profile? What is the link?", type: "url" },
      { key: "business.hours", label: "Opening hours", question: "What are your opening hours through the week?", type: "textarea", placeholder: "Mon–Fri 11:00–23:00\nSat–Sun 10:00–23:30" },
      { key: "business.phone", label: "Phone", question: "Which phone number should customers call?", type: "phone" },
      { key: "business.whatsapp", label: "WhatsApp", question: "What is your preferred WhatsApp number for customer enquiries?", type: "phone", placeholder: "+91 XXXXX XXXXX" },
      { key: "business.email", label: "Email", question: "Which email address should enquiries go to?", type: "email" },
    ],
  },
  {
    key: "contact",
    title: "Contact Details",
    description: "Who we work with during the project.",
    fields: [
      { key: "contact.name", label: "Primary contact person", question: "Who will be our main point of contact for this project?", type: "text", required: true },
      { key: "contact.role", label: "Role", question: "What is their role in the business?", type: "text" },
      { key: "contact.phone", label: "Phone", question: "What is the best phone number to reach them?", type: "phone", required: true },
      { key: "contact.email", label: "Email", question: "And their email address?", type: "email" },
      { key: "contact.approver", label: "Final decision maker", question: "Who gives the final approval on designs and content?", type: "text" },
      { key: "contact.preferred_channel", label: "Preferred communication", question: "How do you prefer we keep in touch with updates?", type: "select", options: ["WhatsApp", "Phone call", "Email", "Client portal"] },
      { key: "contact.best_time", label: "Best time to contact", question: "When is the best time to reach you?", type: "text", placeholder: "e.g. Weekdays after 3 PM" },
    ],
  },
  {
    key: "brand",
    title: "Brand Details",
    description: "Logo, colours and the feel of the brand.",
    fields: [
      { key: "brand.logo", label: "Logo", question: "Do you have your logo? Ideally a high-resolution PNG, SVG or PDF.", type: "file", folder: "Brand", asset: true, accept: "image/*,application/pdf,.svg,.ai,.eps" },
      { key: "brand.primary_color", label: "Primary brand colour", question: "What is your main brand colour?", type: "color" },
      { key: "brand.secondary_color", label: "Secondary brand colour", question: "Is there a secondary or accent colour?", type: "color" },
      { key: "brand.style", label: "Brand style", question: "Which words best describe how the brand should feel?", type: "select", options: ["Modern & minimal", "Premium & elegant", "Warm & friendly", "Bold & vibrant", "Traditional & heritage", "Playful & fun"] },
      { key: "brand.typography", label: "Typography preference", question: "Any preference for fonts — classic serif, clean sans-serif, or something expressive?", type: "select", options: ["Clean sans-serif", "Classic serif", "Mix of serif & sans", "Handwritten / script accents", "No preference"] },
      { key: "brand.guidelines", label: "Existing brand guidelines", question: "Do you have any brand guidelines or previous design files?", type: "file", folder: "Brand", accept: IMG_DOCS },
      { key: "brand.notes", label: "Additional brand notes", question: "Anything else about your brand we should keep in mind?", type: "textarea" },
    ],
  },
  {
    key: "content",
    title: "Website Content",
    description: "What the site should say and show.",
    fields: [
      { key: "content.about", label: "About the business", question: "Tell me the story of the business — how it started and what you stand for.", type: "textarea", required: true },
      { key: "content.services", label: "Services", question: "Which services should we highlight?", type: "textarea" },
      { key: "content.products", label: "Products", question: "Are there products you want to showcase?", type: "textarea" },
      { key: "content.menu", label: "Menu", question: "Can you walk me through the menu — categories, signature dishes, pricing?", type: "textarea", industries: FOOD_INDUSTRIES },
      { key: "content.menu_file", label: "Menu file", question: "Do you have the menu as a PDF or photos?", type: "file", folder: "Menu", asset: true, accept: IMG_DOCS, industries: FOOD_INDUSTRIES },
      { key: "content.offers", label: "Offers", question: "Any current offers, combos or promotions to feature?", type: "textarea" },
      { key: "content.special_sections", label: "Special sections", question: "Are there special sections you'd like — events, catering, careers, franchise?", type: "textarea" },
      { key: "content.contact_info", label: "Contact information to display", question: "Which contact details should appear publicly on the website?", type: "textarea" },
      { key: "content.cta", label: "Call-to-action preferences", question: "What is the most important action a visitor should take?", type: "multiselect", options: ["Call now", "WhatsApp us", "Book a table", "Order online", "Get directions", "Send an enquiry", "Visit store"] },
      { key: "content.references", label: "Website references", question: "Are there websites you like the look of? Share the links.", type: "textarea", placeholder: "One URL per line" },
      { key: "content.competitors", label: "Competitor / reference websites", question: "Who are your main competitors online?", type: "textarea", placeholder: "One URL per line" },
      { key: "content.files", label: "Content files", question: "Any documents with content — brochures, write-ups, price lists?", type: "file", folder: "Documents", accept: IMG_DOCS },
    ],
  },
  {
    key: "social",
    title: "Social Media",
    description: "Where the business lives online.",
    fields: [
      { key: "social.instagram", label: "Instagram", question: "What is your Instagram profile link?", type: "url", placeholder: "https://instagram.com/…" },
      { key: "social.facebook", label: "Facebook", question: "Facebook page?", type: "url", placeholder: "https://facebook.com/…" },
      { key: "social.youtube", label: "YouTube", question: "YouTube channel?", type: "url" },
      { key: "social.linkedin", label: "LinkedIn", question: "LinkedIn page?", type: "url" },
      { key: "social.gbp", label: "Google Business Profile", question: "Google Business Profile link (if different from before)?", type: "url" },
      { key: "social.whatsapp", label: "WhatsApp link", question: "WhatsApp Business link or catalogue?", type: "url", placeholder: "https://wa.me/91…" },
      { key: "social.other", label: "Other links", question: "Any other platforms — Swiggy, Zomato, Justdial, TripAdvisor?", type: "textarea", placeholder: "One URL per line" },
    ],
  },
  {
    key: "requirements",
    title: "Requirements",
    description: "What the finished product must include.",
    fields: [
      {
        key: "requirements.features",
        label: "Features & sections",
        question: "Let's go through what the website needs. Which of these should it have?",
        type: "checklist",
        allowCustom: true,
        options: ["About section", "Services", "Product catalog", "Menu", "Gallery", "Contact", "Google Maps", "WhatsApp button", "Booking", "Online ordering", "Testimonials", "Blog", "FAQ"],
        required: true,
      },
      { key: "requirements.additional", label: "Additional requirements", question: "Anything else the website must do?", type: "textarea" },
      { key: "requirements.expectations", label: "Client expectations", question: "What would make this project a big success for you?", type: "textarea" },
      { key: "requirements.not_wanted", label: "Things the client does NOT want", question: "Is there anything you specifically do NOT want on the website?", type: "textarea" },
      { key: "requirements.deadline", label: "Target launch", question: "Is there a date you'd like to launch by — an event or season?", type: "text" },
    ],
  },
  {
    key: "assets",
    title: "Assets",
    description: "Photos, videos and media for the build.",
    fields: [
      { key: "assets.food_photos", label: "Food photos", question: "Do you have good photos of your dishes?", type: "file", folder: "Food Photos", asset: true, accept: "image/*,video/*", industries: FOOD_INDUSTRIES },
      { key: "assets.place_photos", label: "Venue / interior photos", question: "Photos of the place — interior, exterior, ambience?", type: "file", folder: "Restaurant Photos", asset: true, accept: "image/*,video/*", industries: FOOD_INDUSTRIES },
      { key: "assets.photos", label: "Business photos", question: "Do you have photos of your business, team or work?", type: "file", folder: "Photos", asset: true, accept: "image/*,video/*" },
      { key: "assets.videos", label: "Videos", question: "Any videos we can use?", type: "file", folder: "Other", accept: "video/*" },
      { key: "assets.team_photos", label: "Team photos", question: "Would you like a team section? Do you have team photos?", type: "file", folder: "Other", accept: "image/*" },
      { key: "assets.notes", label: "Asset notes", question: "Anything to note about the photos — credits, photographers, a shoot planned?", type: "textarea" },
    ],
  },
  {
    key: "confirm",
    title: "Final Confirmation",
    description: "Review everything with the client before completing.",
    fields: [],
  },
];

export function visibleFields(section: OnboardingSection, ctx: OnboardingContext) {
  return section.fields.filter((f) => {
    if (f.industries && !f.industries.includes(ctx.industry)) return false;
    if (f.services && !f.services.includes(ctx.serviceType)) return false;
    // Non-food businesses get the generic photo field; food businesses get specific ones.
    if (f.key === "assets.photos" && FOOD_INDUSTRIES.includes(ctx.industry)) return false;
    return true;
  });
}

export function visibleSections(ctx: OnboardingContext) {
  return ONBOARDING_SECTIONS.map((s) => ({ ...s, fields: visibleFields(s, ctx) }));
}

export function findField(key: string): OnboardingField | undefined {
  for (const s of ONBOARDING_SECTIONS) {
    const f = s.fields.find((x) => x.key === key);
    if (f) return f;
  }
  return undefined;
}

export type AnswerState = { value: unknown; status: "answered" | "client_later" | "not_applicable" };

export function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

export interface OnboardingComputed {
  progress: number;
  sections: {
    key: string;
    title: string;
    answered: number;
    total: number;
    complete: boolean;
    missingRequired: string[];
  }[];
  assets: { key: string; label: string; state: "received" | "later" | "missing" }[];
  outstanding: string[];
}

/** Derive progress, section completeness and outstanding assets. */
export function computeOnboarding(
  ctx: OnboardingContext,
  answers: Record<string, AnswerState>,
  fileCounts: Record<string, number>,
): OnboardingComputed {
  let answered = 0;
  let total = 0;
  const sections: OnboardingComputed["sections"] = [];
  const assets: OnboardingComputed["assets"] = [];

  for (const section of visibleSections(ctx)) {
    let sAnswered = 0;
    const missingRequired: string[] = [];
    for (const field of section.fields) {
      const a = answers[field.key];
      const hasFiles = (fileCounts[field.key] ?? 0) > 0;
      const done =
        hasFiles || (a && (a.status === "client_later" || a.status === "not_applicable" || isFilled(a.value)));
      if (done) sAnswered++;
      else if (field.required) missingRequired.push(field.label);
      if (field.asset) {
        assets.push({
          key: field.key,
          label: field.label,
          state: hasFiles ? "received" : a?.status === "client_later" ? "later" : "missing",
        });
      }
    }
    answered += sAnswered;
    total += section.fields.length;
    if (section.fields.length) {
      sections.push({
        key: section.key,
        title: section.title,
        answered: sAnswered,
        total: section.fields.length,
        complete: missingRequired.length === 0,
        missingRequired,
      });
    }
  }

  const outstanding = assets.filter((a) => a.state !== "received").map((a) => a.label);
  return { progress: total ? Math.round((answered / total) * 100) : 0, sections, assets, outstanding };
}
