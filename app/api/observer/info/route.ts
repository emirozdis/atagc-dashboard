import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { getSignedUrl } from "@/lib/storage-utils";
import { OBSERVER_TEAM } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: true, allowedRoles: OBSERVER_TEAM });
  if (!auth.ok || !auth.session) throw new Error(auth.message || 'Unauthorized');

  const session = auth.session;
  const userId = session.user.id;

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, full_name, email, role, created_at")
    .eq("id", userId)
    .single();

  if (userError) throw userError;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: observerData, error: observerError } = await supabase
    .from("users")
    .select(`
        id, full_name, email, role, created_at,
        user_details (
            id, phone_number, school, city, grade, birth_date, profile_picture_url,
            is_profile_picture_hidden, allow_connections, notification_preferences, additional_info,
            high_schools(school_name)
        )
    `)
    .eq("id", userId)
    .single();



  if (observerError) throw observerError;
  if (!observerData) return NextResponse.json({ error: "Observer data not found" }, { status: 404 });

  const observerUser = observerData;

  // Unwrap Relations
  const details = Array.isArray(observerUser.user_details)
    ? observerUser.user_details[0]
    : observerUser.user_details;

  // Profile Picture Signing
  if (details?.profile_picture_url) {
    details.profile_picture_url = await getSignedUrl("profile-pictures", details.profile_picture_url);
  }

  // Fetch observer allocation data
  const { data: allocation, error: allocationError } = await supabase
    .from("observer_allocations")
    .select("allocated_field, allocated_committee, field_observer")
    .eq("id", userId)
    .maybeSingle();

  if (allocationError) throw allocationError;

  // Fetch committee name if allocated to a committee
  let committeeName = null;
  if (allocation?.allocated_committee) {
    const { data: committeeData, error: committeeError } = await supabase
      .from("committees")
      .select("name")
      .eq("id", allocation.allocated_committee)
      .maybeSingle();

    if (committeeError) throw committeeError;
    committeeName = committeeData?.name || null;
  }

  // Fetch tasks assigned to this observer
  const { data: tasks, error: tasksError } = await supabase
    .from("observer_tasks")
    .select("id, assigned_by, assigned_task, task_description, status, created_at")
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false });

  if (tasksError) throw tasksError;

  // Construct Clean Response
  const response = {
    allocatedArea: allocation?.allocated_field || '',
    allocatedCommittee: allocation?.allocated_committee || null,
    allocatedCommitteeName: committeeName,
    fieldObserver: allocation?.field_observer || null,
    tasks: tasks || [],
  };

  return NextResponse.json(response);
});
