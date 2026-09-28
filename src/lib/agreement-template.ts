export const AGREEMENT_VARIABLES = [
  "CLIENT_NAME",
  "PROJECT_NAME",
  "PROJECT_PRICE",
  "ANNUAL_PRICE",
  "PAYMENT_TERMS",
  "START_DATE",
  "DELIVERY_SCOPE",
  "AGENCY_NAME",
  "TODAY",
] as const;

export type AgreementVariable = (typeof AGREEMENT_VARIABLES)[number];

/** Replace {{VARIABLE}} placeholders. Unknown placeholders are left visible so they get noticed. */
export function renderTemplate(body: string, vars: Partial<Record<string, string>>) {
  return body.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (match, key: string) => vars[key] ?? match);
}

export const DEFAULT_AGREEMENT_TEMPLATE = `WEBSITE DEVELOPMENT AGREEMENT

This agreement is made on {{TODAY}} between {{AGENCY_NAME}} ("RQdinn") and {{CLIENT_NAME}} ("the Client").

1. PROJECT
RQdinn will design and develop "{{PROJECT_NAME}}" for the Client.

2. SCOPE OF WORK
{{DELIVERY_SCOPE}}

Anything not listed above is out of scope and will be quoted separately.

3. FEES
Project fee: {{PROJECT_PRICE}}
Annual domain, hosting, SSL & maintenance: {{ANNUAL_PRICE}} per year, renewable.

4. PAYMENT TERMS
{{PAYMENT_TERMS}}

5. TIMELINE
Work begins on {{START_DATE}}, after the advance payment and onboarding are complete. Timelines depend on the Client providing content, feedback and approvals on time.

6. REVISIONS
The fee includes up to two rounds of revisions during the review stage. Further changes may be charged.

7. CLIENT RESPONSIBILITIES
The Client will provide accurate business information, logos, photographs and other content, and confirms they have the right to use them.

8. OWNERSHIP
On receipt of full payment, the Client owns the final website content and design. RQdinn may showcase the work in its portfolio.

9. MAINTENANCE
The annual plan covers hosting, SSL, security updates, backups and minor content updates. Major new features are quoted separately.

10. CANCELLATION
If the project is cancelled after work has started, the advance payment is non-refundable.

Accepted by the Client through the RQdinn Client Portal, or signed below.

For {{AGENCY_NAME}}                         For {{CLIENT_NAME}}
`;
