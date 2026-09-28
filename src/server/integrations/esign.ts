/**
 * E-signature provider abstraction (Leegality, Digio, DocuSign, Zoho Sign…).
 *
 * The MVP records a click-through acknowledgement in the client portal (name,
 * timestamp, IP) — it does NOT claim to be a legally binding e-signature.
 * A provider implements this interface; the agreement row stores
 * `signature_provider` + `signature_envelope_id`, and a webhook marks it accepted.
 */
export interface ESignProvider {
  readonly name: string;
  isConfigured(): boolean;
  createEnvelope(input: {
    agreementId: string;
    title: string;
    body: string;
    signer: { name: string; email: string; phone?: string | null };
  }): Promise<{ envelopeId: string; signingUrl: string }>;
}

export function activeESignProvider(): ESignProvider | null {
  return null; // Not configured in the MVP.
}
