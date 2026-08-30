import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { Logger } from "@/lib/logger";
import { canManageRole } from "@/lib/permissions";
import { sendSystemNotification } from "@/lib/notification-service";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";
import { warningSchema } from "@/lib/schemas";

export const POST = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ 
      requireAuth: true, 
      allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN] 
  });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const body = await request.json();
  const { userId, category, reason } = warningSchema.parse(body);

  const { data: targetUser } = await supabase.from("users").select("role").eq("id", userId).single();
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!canManageRole(session.user.role, targetUser.role)) {
      return NextResponse.json({ error: "Unauthorized action." }, { status: 403 });
  }

  const { data: warning, error } = await supabase.from("user_warnings").insert({
      user_id: userId,
      issued_by: session.user.id,
      category,
      reason
  }).select("id").single();

  if (error) throw error;

  await Logger.audit(
      { userId: session.user.id, req: request }, 
      { 
          action: "issue_warning", 
          category: "access",
          resourceType: "warning",
          resourceId: warning.id,
          metadata: { target_id: userId, category, reason } 
      }
  );
  
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

    const { data: warning } = await supabase.from("user_warnings").select("*").eq("id", id).single();
    if (!warning) return NextResponse.json({ error: "Warning not found." }, { status: 404 });

    if (session.user.role !== ROLES.SUPERADMIN && warning.issued_by !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized action." }, { status: 403 });
    }

    const { error } = await supabase.from("user_warnings").delete().eq("id", id);
    if (error) throw error;

    await Logger.audit(
        { userId: session.user.id, req: request },
        { 
            action: "remove_warning", 
            category: "access",
            resourceType: "warning",
            resourceId: id,
            metadata: { deleted_category: warning.category, deleted_reason: warning.reason, target_user_id: warning.user_id }
        }
    );
    return NextResponse.json({ success: true });
});
