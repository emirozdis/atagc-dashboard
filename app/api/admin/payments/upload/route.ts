import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";
import { assertFileSignature } from "@/lib/upload-validation";
import { z } from "zod";
import crypto from "node:crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];

export const POST = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");

    const formData = await request.formData();
    const targetUserId = formData.get("userId");
    const userId = z.uuid().parse(targetUserId);

    // Check if application exists
    const [{ data: app }, { data: assignment }, { data: existingReceipt }] = await Promise.all([
      supabase
        .from("applications")
        .select("id, payment_status, status")
        .eq("user_id", userId)
        .in("status", ["approved", "accepted"])
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("conference_assignments").select("user_id").eq("user_id", userId).maybeSingle(),
      supabase.from("payment_receipts").select("storage_path").eq("user_id", userId).maybeSingle(),
    ]);

    if (!app || !assignment) throw new Error("The participant must have a final placement first.");
    if (app.payment_status === 'paid' || app.payment_status === 'processing') {
        throw new Error("Payment already submitted or completed.");
    }

    const file = formData.get("file") as File;

    if (!file) throw new Error("No file uploaded");
    if (file.size > MAX_FILE_SIZE) throw new Error("File too large (Max 5MB)");
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Invalid file type (PDF, JPG, PNG only)");
    await assertFileSignature(file);

    const fileExt = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    const fileName = `${userId}/${crypto.randomUUID()}-receipt.${fileExt}`;
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

    const { data: receiptResult, error: dbError } = await supabase.rpc("submit_ravenmun_payment_receipt", {
        p_user_id: userId,
        p_application_id: app.id,
        p_storage_path: fileName,
        p_file_type: file.type,
        p_actor_id: auth.session.user.id,
    });

    if (dbError || !receiptResult) {
        await supabase.storage.from("receipts").remove([fileName]);
        throw dbError || new Error("Payment receipt could not be registered.");
    }

    if (existingReceipt?.storage_path && existingReceipt.storage_path !== fileName) {
        await supabase.storage.from("receipts").remove([existingReceipt.storage_path]);
    }

    return NextResponse.json({ success: true });
});
