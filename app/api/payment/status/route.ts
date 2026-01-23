import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { getSignedUrl } from "@/lib/storage-utils";
import { PaymentStatusEnum } from "@/types/payment";

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const userId = auth.session.user.id;

    const { data: app } = await supabase
        .from("applications")
        .select(`
            payment_status,
            form:application_forms ( fee )
        `)
        .eq("user_id", userId)
        .maybeSingle();

    const { data: receipt } = await supabase
        .from("payment_receipts")
        .select("id, status, admin_note, created_at, storage_path, file_type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (receipt && receipt.storage_path) {
        const signedUrl = await getSignedUrl("receipts", receipt.storage_path, 3600);
        (receipt as any).file_url = signedUrl;
    }

    const formData = Array.isArray(app?.form) ? app.form[0] : app?.form;
    const fee = formData?.fee || 0;
    
    // If exempt, force amount to 0
    const finalAmount = app?.payment_status === PaymentStatusEnum.EXEMPT ? 0 : fee;

    return NextResponse.json({
        payment_status: app?.payment_status || PaymentStatusEnum.UNPAID,
        amount_required: finalAmount, 
        last_receipt: receipt || null
    });
});