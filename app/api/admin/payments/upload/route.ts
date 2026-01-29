import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { Logger } from "@/lib/logger";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];

export const POST = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const userId = auth.session.user.id;

    // Check if application exists
    const { data: app } = await supabase
        .from("applications")
        .select("id, payment_status")
        .eq("user_id", userId)
        .single();

    if (!app) throw new Error("Application not found");
    if (app.payment_status === 'paid' || app.payment_status === 'processing') {
        throw new Error("Payment already submitted or completed.");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) throw new Error("No file uploaded");
    if (file.size > MAX_FILE_SIZE) throw new Error("File too large (Max 5MB)");
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Invalid file type (PDF, JPG, PNG only)");

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-receipt.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to 'receipts' PRIVATE bucket
    const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false
        });

    if (uploadError) throw new Error("Storage upload failed");

    // DB Insert
    const { data: newReceipt, error: dbError } = await supabase
        .from("payment_receipts")
        .insert({
            user_id: userId,
            application_id: app.id,
            storage_path: fileName,
            file_type: file.type,
            status: 'pending'
        })
        .select("id")
        .single();

    if (dbError) throw dbError;

    // Update Application Status
    await supabase
        .from("applications")
        .update({ payment_status: 'processing' })
        .eq("id", app.id);

    await Logger.audit(
        { userId: userId, req: request },
        { 
            action: "upload_payment_receipt", 
            category: "business",
            resourceType: "payment_receipt",
            resourceId: newReceipt.id,
            metadata: { file: fileName } 
        }
    );

    return NextResponse.json({ success: true });
});