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
    allowedRoles: [ROLES.HEAD_OBSERVER, ROLES.SUPERADMIN, ROLES.ADMIN],
  });
  if (!auth.ok || !auth.session) throw new Error(auth.message || "Unauthorized");

  const session = auth.session;
  const assignedBy = session.user.id;

  const body = await request.json();
  const { assigned_task, task_description, committee } = body;

  if (!assigned_task?.trim()) {
    return NextResponse.json(
      { error: "assigned_task is required." },
      { status: 400 }
    );
  }

  // 1. Get relevant observers (same logic as list_relevant)
  let observerQuery = supabase
    .from("observer_allocations")
    .select("id");

  if (committee) {
    observerQuery = observerQuery.eq("allocated_committee", committee);
  } else {
    observerQuery = observerQuery.eq("field_observer", true);
  }

  const { data: observers, error: observerError } = await observerQuery;

  if (observerError) throw observerError;

  if (!observers || observers.length === 0) {
    return NextResponse.json(
      { error: "No eligible observer was found." },
      { status: 404 }
    );
  }

  const observerIds = observers.map((o) => o.id);

  // 2. Count active tasks per observer (pending or in_progress)
  const { data: activeTasks, error: taskError } = await supabase
    .from("observer_tasks")
    .select("assigned_to")
    .in("assigned_to", observerIds)
    .in("status", ["assigned"]);

  if (taskError) throw taskError;

  // Build a count map
  const taskCounts: Record<string, number> = {};
  for (const id of observerIds) {
    taskCounts[id] = 0;
  }
  for (const task of activeTasks || []) {
    if (task.assigned_to in taskCounts) {
      taskCounts[task.assigned_to]++;
    }
  }

  // 3. Find observer(s) with the least active tasks
  const minCount = Math.min(...Object.values(taskCounts));
  const candidates = observerIds.filter((id) => taskCounts[id] === minCount);

  // Pick randomly if tied
  const selectedObserver = candidates[Math.floor(Math.random() * candidates.length)];

  // 4. Create the task
  const { data: task, error: insertError } = await supabase
    .from("observer_tasks")
    .insert({
      assigned_by: assignedBy,
      assigned_to: selectedObserver,
      assigned_task: assigned_task.trim(),
      task_description: task_description?.trim() || null,
      status: "assigned",
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return NextResponse.json(task, { status: 201 });
});
