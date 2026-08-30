import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(20, ip);

  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: [ROLES.OBSERVER, ROLES.HEAD_OBSERVER, ROLES.SUPERADMIN, ROLES.ADMIN],
  });
  if (!auth.ok || !auth.session) throw new Error(auth.message || "Unauthorized");

  const session = auth.session;
  const userId = session.user.id;
  const userRole = session.user.role;

  const body = await request.json();
  const { target_task_id, action } = body;

  if (!target_task_id) {
    return NextResponse.json(
      { error: "target_task_id is required." },
      { status: 400 }
    );
  }

  if (!action || !["complete", "cancel"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'complete' or 'cancel'." },
      { status: 400 }
    );
  }

  // Fetch the task
  const { data: task, error: taskError } = await supabase
    .from("observer_tasks")
    .select("id, assigned_to, status")
    .eq("id", target_task_id)
    .single();

  if (taskError || !task) {
    return NextResponse.json(
      { error: "Task not found." },
      { status: 404 }
    );
  }

  // If user is an observer, they can only modify tasks assigned to them
  if (userRole === ROLES.OBSERVER && task.assigned_to !== userId) {
    return NextResponse.json(
      { error: "You do not have permission to change this task." },
      { status: 403 }
    );
  }

  const newStatus = action === "complete" ? "completed" : "cancelled";

  const { data: updated, error: updateError } = await supabase
    .from("observer_tasks")
    .update({ status: newStatus })
    .eq("id", target_task_id)
    .select()
    .single();

  if (updateError) throw updateError;

  return NextResponse.json(updated);
});
