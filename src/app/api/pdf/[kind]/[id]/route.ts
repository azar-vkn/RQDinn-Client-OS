import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { assertClientAccess, assertProjectAccess, isStaff } from "@/server/auth/permissions";
import { getInvoice, getPaymentForReceipt } from "@/server/services/billing";
import { getAgreement } from "@/server/services/agreements";
import { getAgency } from "@/server/services/settings";
import { agreementPdf, invoicePdf, receiptPdf } from "@/server/pdf/documents";
import { AppError, forbidden, notFound } from "@/server/errors";

/** PDF downloads: /api/pdf/invoice/:id, /api/pdf/agreement/:id, /api/pdf/receipt/:paymentId */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/pdf/[kind]/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { kind, id } = await ctx.params;
  try {
    let bytes: Uint8Array;
    let filename: string;
    if (kind === "invoice") {
      const inv = await getInvoice(id);
      await assertClientAccess(user, inv.client.id);
      if (!isStaff(user) && (inv.invoice.status === "draft" || inv.invoice.status === "void")) throw forbidden();
      bytes = await invoicePdf(inv);
      filename = `${inv.invoice.number}.pdf`;
    } else if (kind === "agreement") {
      const { agreement } = await getAgreement(id);
      await assertProjectAccess(user, agreement.projectId);
      if (!isStaff(user) && agreement.status === "draft") throw forbidden();
      bytes = await agreementPdf(agreement, await getAgency());
      filename = `${agreement.title.replace(/[^\w\- ]+/g, "")}.pdf`;
    } else if (kind === "receipt") {
      const r = await getPaymentForReceipt(id);
      await assertClientAccess(user, r.payment.clientId);
      bytes = await receiptPdf(r);
      filename = `Receipt-${r.payment.id.slice(0, 8).toUpperCase()}.pdf`;
    } else {
      throw notFound("Document");
    }
    const inline = req.nextUrl.searchParams.get("inline") === "1";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof AppError) return new NextResponse(err.message, { status: err.code === "forbidden" ? 403 : 404 });
    console.error("[pdf]", err);
    return new NextResponse("Unable to generate the PDF. Please try again.", { status: 500 });
  }
}
