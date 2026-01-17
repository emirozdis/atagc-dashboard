import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { logAction } from "@/lib/logger";
import { sendSystemNotification } from "@/lib/notification-service";
import { getSignedUrl } from "@/lib/storage-utils";

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
    if (!auth.ok) throw new Error("Unauthorized");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("Missing ID");

    // Fetches Receipt + User + User Details + Reviewer Name
    const { data, error } = await supabase
        .from("payment_receipts")
        .select(`
            *,
            user:users!payment_receipts_user_id_fkey ( 
                id, 
                full_name, 
                email, 
                role,
                user_details (
                    phone_number,
                    school_name,
                    additional_info
                )
            ),
            reviewer:users!payment_receipts_reviewed_by_fkey ( full_name )
        `)
        .eq("id", id)
        .single();

    if (error || !data) throw new Error("Receipt not found");

    // Generate Signed URL for secure viewing
    if (data.storage_path) {
        data.file_url = await getSignedUrl("receipts", data.storage_path, 3600);
    }

    return NextResponse.json(data);
});

export const POST = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
    
    // Fix: Explicitly check for session existence to satisfy TypeScript
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    
    const adminId = auth.session.user.id;

    const { receiptId, action, note } = await request.json();

    if (!receiptId || !['approve', 'reject'].includes(action)) {
        throw new Error("Invalid request");
    }

    if (action === 'reject' && !note) {
        throw new Error("Reason required for rejection");
    }

    const { data: receipt } = await supabase
        .from("payment_receipts")
        .select("user_id, application_id, status")
        .eq("id", receiptId)
        .single();

    if (!receipt) throw new Error("Receipt not found");
    if (receipt.status !== 'pending') throw new Error("Receipt already processed");

    const now = new Date().toISOString();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const appPaymentStatus = action === 'approve' ? 'paid' : 'rejected';

    const { error: rError } = await supabase
        .from("payment_receipts")
        .update({
            status: newStatus,
            admin_note: note,
            reviewed_by: adminId,
            reviewed_at: now
        })
        .eq("id", receiptId);

    if (rError) throw rError;

    const { error: aError } = await supabase
        .from("applications")
        .update({ payment_status: appPaymentStatus })
        .eq("id", receipt.application_id);

    if (aError) console.error("Failed to update application status", aError);

    await logAction(adminId, `review_payment_${action}`, { receipt_id: receiptId, user_id: receipt.user_id }, request);
    
    if (action === 'approve') {
        await sendSystemNotification(receipt.user_id, "payment_approved");
    } else {
        await sendSystemNotification(receipt.user_id, "payment_rejected");
    }

    return NextResponse.json({ success: true });
});

// Change Log:
// - Updated POST handler to check `if (!auth.ok || !auth.session)` to resolve the "possibly null or undefined" TypeScript error.