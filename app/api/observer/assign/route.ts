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

  // 1. Permission check: must be head_observer, admin, or superadmin
  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: [ROLES.HEAD_OBSERVER, ROLES.SUPERADMIN, ROLES.ADMIN],
  });
  if (!auth.ok || !auth.session) throw new Error(auth.message || "Unauthorized");

  const body = await request.json();
  const { user_id, committee, allocated_field } = body;

  if (!user_id) {
    return NextResponse.json(
      { error: "user_id is required." },
      { status: 400 }
    );
  }

  // 2. Check if the target user exists and is an observer
  const { data: targetUser, error: targetError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user_id)
    .single();

  if (targetError || !targetUser) {
    return NextResponse.json(
      { error: "User not found." },
      { status: 404 }
    );
  }

  if (targetUser.role !== ROLES.OBSERVER) {
    return NextResponse.json(
      { error: "Only observers can be assigned." },
      { status: 400 }
    );
  }

  // 3. Determine allocation: field observer, allocated field, or committee observer
  let field_observer = false;
  let allocated_committee: string | null = null;
  let allocated_field_value: string | null = null;

  if (!committee && !allocated_field) {
    field_observer = true;
  } else if (!committee && allocated_field) {
    allocated_field_value = allocated_field;
  } else {
    // Verify the committee exists
    const { data: committeeData, error: committeeError } = await supabase
      .from("committees")
      .select("id")
      .eq("id", committee)
      .single();

    if (committeeError || !committeeData) {
      return NextResponse.json(
        { error: "The specified committee was not found." },
        { status: 404 }
      );
    }

    allocated_committee = committee;
  }

  // 4. Upsert: if the observer already has an allocation, overwrite it
  const { data: existing } = await supabase
    .from("observer_allocations")
    .select("id")
    .eq("id", user_id)
    .single();

  let result;
  let error;

  if (existing) {
    const { data, error: updateError } = await supabase
      .from("observer_allocations")
      .update({ field_observer, allocated_committee, allocated_field: allocated_field_value })
      .eq("id", user_id)
      .select()
      .single();
    result = data;
    error = updateError;
  } else {
    const { data, error: insertError } = await supabase
      .from("observer_allocations")
      .insert({ id: user_id, field_observer, allocated_committee, allocated_field: allocated_field_value })
      .select()
      .single();
    result = data;
    error = insertError;
  }

  if (error) throw error;

  return NextResponse.json(result, { status: existing ? 200 : 201 });
});
