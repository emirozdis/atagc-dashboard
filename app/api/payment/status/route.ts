import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { getSignedUrl } from "@/lib/storage-utils";
import { PaymentStatusEnum } from "@/types/payment";

export const GET = apiHandler(async () => {
    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error(auth.message || "Unauthorized");
    const userId = auth.session.user.id;

    // Payment becomes due when an application is accepted. Committee placement
    // happens separately and must not hide the fee from the applicant.
    const { data: applications } = await supabase
      .from("applications")
      .select(`
            id, status, payment_status, form_snapshot,
            form:application_forms ( fee )
        `)
      .eq("user_id", userId)
      .in("status", ["accepted", "approved"]);

    const { data: receipt } = await supabase
      .from("payment_receipts")
      .select("id, status, admin_note, created_at, storage_path, file_type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (receipt && receipt.storage_path) {
        const signedUrl = await getSignedUrl("receipts", receipt.storage_path, 3600);
        (receipt as Record<string, unknown>).file_url = signedUrl;
    }

    const placedApplications = (applications || []) as Array<{
      form_snapshot?: { fee?: number };
      form?: { fee?: number } | Array<{ fee?: number }> | null;
      payment_status?: string;
    }>;
    const fee = Math.max(0, ...placedApplications.map((application) => Number((Array.isArray(application.form) ? application.form[0]?.fee : application.form?.fee) || application.form_snapshot?.fee || 0)));
    const appStatuses = placedApplications.map((application) => application.payment_status);
    // A single exempt application must not hide another accepted application
    // that still needs payment. Outstanding states win over completed ones.
    const paymentStatus = appStatuses.includes(PaymentStatusEnum.UNPAID)
      ? PaymentStatusEnum.UNPAID
      : appStatuses.includes(PaymentStatusEnum.REJECTED)
        ? PaymentStatusEnum.REJECTED
        : appStatuses.includes(PaymentStatusEnum.PROCESSING)
          ? PaymentStatusEnum.PROCESSING
          : appStatuses.includes(PaymentStatusEnum.PAID)
            ? PaymentStatusEnum.PAID
            : appStatuses.includes(PaymentStatusEnum.EXEMPT)
              ? PaymentStatusEnum.EXEMPT
              : PaymentStatusEnum.UNPAID;

    // If exempt, force amount to 0
    const finalAmount = paymentStatus === PaymentStatusEnum.EXEMPT ? 0 : fee;

    return NextResponse.json({
        payment_status: placedApplications.length ? paymentStatus : "not_required",
        amount_required: finalAmount,
        last_receipt: receipt || null
    });
});
