import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import bcrypt from "bcryptjs";
import { logAction } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

// Strict limit: 3 password change attempts per minute per IP
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const POST = apiHandler(async (request: Request) => {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    await limiter.check(3, ip);

    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const session = auth.session;

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
        throw new Error("Missing fields");
    }

    if (newPassword.length < 6) {
        throw new Error("Yeni şifre en az 6 karakter olmalıdır.");
    }

    // 1. Get current password hash
    const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("password_hash")
        .eq("id", session.user.id)
        .single();

    if (fetchError || !user) throw new Error("User not found");

    // 2. Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
        return NextResponse.json({ error: "Mevcut şifre hatalı." }, { status: 400 });
    }

    // 3. Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // 4. Update password
    const { error: updateError } = await supabase
        .from("users")
        .update({
            password_hash: newHash,
            updated_at: new Date().toISOString()
        })
        .eq("id", session.user.id);

    if (updateError) throw updateError;

    await logAction(session.user.id, "change_password", { method: "profile_settings" }, request);

    return NextResponse.json({ success: true, message: "Şifreniz başarıyla güncellendi." });
});

// Change Log:
// - New endpoint for authenticated password changes.
// - Includes verification of the old password before changing.