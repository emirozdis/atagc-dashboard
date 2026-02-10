import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(30, ip);

  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: [ROLES.HEAD_OBSERVER, ROLES.SUPERADMIN, ROLES.ADMIN],
  });
  if (!auth.ok || !auth.session) throw new Error(auth.message || "Unauthorized");

  const session = auth.session;
  const assignedBy = session.user.id;

  const body = await request.json();
  const { assigned_to, assigned_task, task_description } = body;

  if (!assigned_to || !assigned_task?.trim()) {
    return NextResponse.json(
      { error: "assigned_to ve assigned_task alanları zorunludur." },
      { status: 400 }
    );
  }

  // Verify assigned_to user exists and is an observer
  const { data: targetUser, error: targetError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", assigned_to)
    .single();

  if (targetError || !targetUser) {
    return NextResponse.json(
      { error: "Atanacak kullanıcı bulunamadı." },
      { status: 404 }
    );
  }

  if (targetUser.role !== ROLES.OBSERVER) {
    return NextResponse.json(
      { error: "Görev yalnızca gözlemci rolündeki kullanıcılara atanabilir." },
      { status: 400 }
    );
  }

  const { data: task, error: insertError } = await supabase
    .from("observer_tasks")
    .insert({
      assigned_by: assignedBy,
      assigned_to,
      assigned_task: assigned_task.trim(),
      task_description: task_description?.trim() || null,
      status: "assigned",
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return NextResponse.json(task, { status: 201 });
});
