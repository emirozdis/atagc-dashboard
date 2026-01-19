import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { getSignedUrl } from "@/lib/storage-utils";

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const userId = auth.session.user.id;

    // Fetch Application Status AND Form Fee
    const { data: app } = await supabase
        .from("applications")
        .select(`
            payment_status,
            form:application_forms ( fee )
        `)
        .eq("user_id", userId)
        .maybeSingle();

    // Fetch Latest Receipt
    const { data: receipt } = await supabase
        .from("payment_receipts")
        .select("id, status, admin_note, created_at, storage_path, file_type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (receipt && receipt.storage_path) {
        const signedUrl = await getSignedUrl("receipts", receipt.storage_path, 3600);
        // Fix: Cast to any to add dynamic property not in DB type
        (receipt as any).file_url = signedUrl;
    }

    // Fix: Handle array return for foreign key relation 'form'
    const formData = Array.isArray(app?.form) ? app.form[0] : app?.form;
    const fee = formData?.fee || 0;

    return NextResponse.json({
        payment_status: app?.payment_status || 'unpaid',
        amount_required: fee, 
        last_receipt: receipt || null
    });
});

// Change Log:
// - Fixed TS error: Cast `receipt` to `any` before assigning `file_url`.
// - Fixed TS error: Handled array check for `app.form` before accessing `.fee`.