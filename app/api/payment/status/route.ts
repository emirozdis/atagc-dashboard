import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { getSignedUrl } from "@/lib/storage-utils";
import { PaymentStatusEnum } from "@/types/payment";

interface AcceptedApplication {
    id: string;
    application_type: string;
    status: string;
    payment_status: string | null;
    reviewed_at: string | null;
    form_snapshot?: { fee?: number | string } | null;
    form?: { fee?: number | string } | Array<{ fee?: number | string }> | null;
}

function applicationFee(application: AcceptedApplication): number {
    const formFee = Array.isArray(application.form) ? application.form[0]?.fee : application.form?.fee;
    return Math.max(0, Number(formFee ?? application.form_snapshot?.fee ?? 0));
}

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error(auth.message || "Unauthorized");
    const userId = auth.session.user.id;
    const requestedApplicationId = new URL(request.url).searchParams.get("applicationId");

    // Payment becomes due when an application is accepted. Committee placement
    // happens separately and must not hide the fee from the applicant.
    const { data: applications } = await supabase
      .from("applications")
      .select(`
            id, application_type, status, payment_status, reviewed_at, form_snapshot,
            form:application_forms ( fee )
        `)
      .eq("user_id", userId)
      .in("status", ["accepted", "approved"])
      .order("reviewed_at", { ascending: false });

    const acceptedApplications = (applications || []) as AcceptedApplication[];
    const selectedApplication = acceptedApplications.find((application) => application.id === requestedApplicationId)
      || acceptedApplications[0]
      || null;

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

    const appStatuses = acceptedApplications.map((application) => application.payment_status);
    // Payment is per participant, not per accepted application. A settled
    // receipt therefore wins over a later accepted application; only an
    // outstanding receipt when nothing is paid keeps the balance due.
    const paymentStatus = appStatuses.includes(PaymentStatusEnum.PAID)
      ? PaymentStatusEnum.PAID
      : appStatuses.includes(PaymentStatusEnum.PROCESSING)
        ? PaymentStatusEnum.PROCESSING
        : appStatuses.includes(PaymentStatusEnum.UNPAID)
          ? PaymentStatusEnum.UNPAID
          : appStatuses.includes(PaymentStatusEnum.REJECTED)
            ? PaymentStatusEnum.REJECTED
            : appStatuses.includes(PaymentStatusEnum.EXEMPT)
              ? PaymentStatusEnum.EXEMPT
              : PaymentStatusEnum.UNPAID;

    const selectedFee = selectedApplication ? applicationFee(selectedApplication) : 0;
    const finalAmount = paymentStatus === PaymentStatusEnum.EXEMPT ? 0 : selectedFee;

    return NextResponse.json({
        payment_status: acceptedApplications.length ? paymentStatus : "not_required",
        amount_required: finalAmount,
        selected_application_id: selectedApplication?.id || null,
        accepted_applications: acceptedApplications.map((application) => ({
            id: application.id,
            application_type: application.application_type,
            fee: applicationFee(application),
            payment_status: application.payment_status || "unpaid",
        })),
        last_receipt: receipt || null
    });
});
