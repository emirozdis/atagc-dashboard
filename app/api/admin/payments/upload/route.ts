import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { logAction } from "@/lib/logger";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];

export const POST = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    
    const adminId = auth.session.user.id;
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) throw new Error("Eksik bilgi: Dosya veya kullanıcı ID'si bulunamadı.");

    // Check if application exists and payment is not already complete
    const { data: app } = await supabase
        .from("applications")
        .select("id, payment_status")
        .eq("user_id", userId)
        .single();

    if (!app) throw new Error("Kullanıcıya ait başvuru bulunamadı.");
    if (app.payment_status === 'paid' || app.payment_status === 'processing') {
        throw new Error("Bu kullanıcının ödemesi zaten yapılmış veya inceleniyor.");
    }

    // File Validation
    if (file.size > MAX_FILE_SIZE) throw new Error("Dosya boyutu çok büyük (Max 5MB)");
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Geçersiz dosya formatı (PDF, JPG, PNG).");

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-receipt-by-admin.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to 'receipts' private bucket
    const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false
        });

    if (uploadError) throw new Error("Depolama hatası: Dosya yüklenemedi.");

    // Insert into DB
    const { error: dbError } = await supabase
        .from("payment_receipts")
        .insert({
            user_id: userId,
            application_id: app.id,
            storage_path: fileName,
            file_type: file.type,
            status: 'pending' // Admin uploads still go to pending for review
        });

    if (dbError) throw dbError;

    // Update Application Status
    await supabase
        .from("applications")
        .update({ payment_status: 'processing' })
        .eq("id", app.id);

    await logAction(adminId, "admin_upload_payment_receipt", { 
        target_user_id: userId,
        file: fileName 
    }, request);

    return NextResponse.json({ success: true });
});

// Change log:
// - Created new API route for admins to upload payment receipts for users.
// - Handles file validation, storage upload, DB record creation, and application status update.