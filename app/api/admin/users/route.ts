import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { canManageRole } from "@/lib/permissions";
import { sendSystemNotification } from "@/lib/notification-service";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const POST = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
    requireAuth: true, 
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN] 
  });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const { userId, reason } = await request.json();

  if (!userId || !reason) throw new Error("Missing fields");

  // 1. Get Target User Role
  const { data: targetUser } = await supabase
      .from("users")
      .select("role, full_name")
      .eq("id", userId)
      .single();

  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // 2. Check Hierarchy
  if (!canManageRole(session.user.role, targetUser.role)) {
      return NextResponse.json({ error: "Bu kullanıcıyı uyarma yetkiniz yok (Hiyerarşi Kuralı)." }, { status: 403 });
  }

  // 3. Create Warning
  const { error } = await supabase
      .from("user_warnings")
      .insert({
          user_id: userId,
          issued_by: session.user.id,
          reason: reason
      });

  if (error) throw error;

  await logAction(session.user.id, "issue_warning", { target_id: userId, reason }, request);

  await sendSystemNotification(userId, "warning_issued");

  return NextResponse.json({ success: true });
});

export const DELETE = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN] 
    });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const session = auth.session;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) throw new Error("Missing ID");

    // 1. Fetch Warning to check ownership
    const { data: warning } = await supabase
        .from("user_warnings")
        .select("*")
        .eq("id", id)
        .single();

    if (!warning) return NextResponse.json({ error: "Warning not found" }, { status: 404 });

    // 2. Check Permissions: Superadmin OR Issuer
    if (session.user.role !== ROLES.SUPERADMIN && warning.issued_by !== session.user.id) {
        return NextResponse.json({ error: "Sadece kendi verdiğiniz uyarıyı kaldırabilirsiniz." }, { status: 403 });
    }

    // 3. Delete
    const { error } = await supabase
        .from("user_warnings")
        .delete()
        .eq("id", id);

    if (error) throw error;

    await logAction(session.user.id, "remove_warning", { warning_id: id, target_id: warning.user_id }, request);

    return NextResponse.json({ success: true });
});
