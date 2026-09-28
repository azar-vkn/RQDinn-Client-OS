/**
 * Payment provider abstraction.
 *
 * Today payments are recorded manually by staff once money has actually been
 * received (bank transfer, UPI, cash…). There is deliberately no fake
 * "payment successful" flow. A gateway such as Razorpay plugs in here:
 *   1. createPaymentLink(invoice)  → send link to client
 *   2. webhook route verifies the signature → calls billing.recordPayment({ provider: "razorpay", providerPaymentId })
 */
export interface PaymentLinkRequest {
  invoiceId: string;
  invoiceNumber: string;
  amount: number; // paise
  currency: string;
  customer: { name: string; email?: string | null; phone?: string | null };
}

export interface PaymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  createPaymentLink(req: PaymentLinkRequest): Promise<{ url: string; providerRef: string }>;
  verifyWebhook(rawBody: string, signature: string | null): boolean;
}

export const razorpayProvider: PaymentProvider = {
  name: "razorpay",
  isConfigured: () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  async createPaymentLink() {
    throw new Error("Razorpay integration is not enabled yet.");
  },
  verifyWebhook() {
    return false;
  },
};

export function activePaymentProvider(): PaymentProvider | null {
  return razorpayProvider.isConfigured() ? razorpayProvider : null;
}
