import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { getSignedUrl } from "@/lib/storage-utils";

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const userId = auth.session.user.id;

    // Fetch Application Payment Status
    const { data: app } = await supabase
        .from("applications")
        .select("payment_status")
        .eq("user_id", userId)
        .maybeSingle();

    // Fetch Latest Receipt Details
    const { data: receipt } = await supabase
        .from("payment_receipts")
        .select("id, status, admin_note, created_at, storage_path, file_type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    // Generate Signed URL if receipt exists
    if (receipt && receipt.storage_path) {
        // Valid for 1 hour
        const signedUrl = await getSignedUrl("receipts", receipt.storage_path, 3600);
        // @ts-ignore
        receipt.file_url = signedUrl;
    }

    return NextResponse.json({
        payment_status: app?.payment_status || 'unpaid',
        last_receipt: receipt || null
    });
});

// Change Log:
// - Added check for `!auth.session` to satisfy TypeScript nullability checks.