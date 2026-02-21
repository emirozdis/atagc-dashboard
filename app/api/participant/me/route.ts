import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { getSignedUrl } from "@/lib/storage-utils";
import { updateProfileSchema } from "@/lib/schemas";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error(auth.message || 'Unauthorized');

  const session = auth.session;
  const userId = session.user.id;

  // Use the RPC to fetch consolidated data
  const { data: userData, error } = await supabase
    .rpc('get_participant_me_data', { target_user_id: userId });

  if (error) throw error;
  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const user = userData as any;

  // Extract objects built by RPC
  const details = user.user_details;
  const application = user.application;

  // Fetch Consents
  const { data: consents } = await supabase
    .from("user_consents")
    .select("id, consent_type, consent_version, action, created_at, ip_address")
    .eq("user_id", userId)
    .eq("action", "GRANTED")
    .order("created_at", { ascending: false });

  let committeeData: any = null;
  const memberRecord = user.committee_members?.[0];
  const managedRecord = user.managed_committees?.[0];

  if (managedRecord) {
    committeeData = {
      ...managedRecord,
      role: 'manager',
      can_write: true,
      topic: Array.isArray(managedRecord.topic) ? managedRecord.topic[0] : managedRecord.topic
    };
  } else if (memberRecord?.committee) {
    const comm = Array.isArray(memberRecord.committee) ? memberRecord.committee[0] : memberRecord.committee;

    if (comm) {
      committeeData = {
        id: comm.id,
        name: comm.name,
        description: comm.description,
        role: 'member',
        can_write: memberRecord.can_write,
        topic: Array.isArray(comm.topic) ? comm.topic[0] : comm.topic,
        admin: Array.isArray(comm.admin) ? comm.admin[0] : comm.admin
      };
    }
  }

  const delegationMember = user.delegation_members;
  let delegationData = null;
  if (delegationMember?.delegation) {
    const del = Array.isArray(delegationMember.delegation) ? delegationMember.delegation[0] : delegationMember.delegation;
    const leader = Array.isArray(del.leader) ? del.leader[0] : del.leader;
    delegationData = {
      id: del.id,
      name: del.name || "Bilinmeyen Delegasyon",
      leader_name: leader?.full_name || "Bilinmiyor",
      accepted: delegationMember.accepted
    };
  }

  // Generate Signed URLs for private storage files
  if (details?.profile_picture_url) {
    details.profile_picture_url = await getSignedUrl("profile-pictures", details.profile_picture_url);
  }

  if (committeeData?.admin?.user_details) {
    const adminDetails = Array.isArray(committeeData.admin.user_details)
      ? committeeData.admin.user_details[0]
      : committeeData.admin.user_details;

    if (adminDetails?.profile_picture_url && !adminDetails.is_profile_picture_hidden) {
      committeeData.admin.profile_picture_url = await getSignedUrl("profile-pictures", adminDetails.profile_picture_url);
    }
  }

  if (application && application.form) {
    application.form = Array.isArray(application.form) ? application.form[0] : application.form;
  }

  const response = {
    profile: {
      ...user,
      details,
      consents: consents || [],
      delegation: delegationData,
      user_details: undefined, 
      user_warnings: user.user_warnings,
      committee_members: undefined,
      managed_committees: undefined,
      delegation_members: undefined,
      application: undefined
    },
    application: application || null,
    committee: committeeData
  };

  return NextResponse.json(response);
});

export const PUT = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(10, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const body = await request.json();
  const validData = updateProfileSchema.parse(body);

  if (validData.full_name) {
    const { error: userError } = await supabase
      .from("users")
      .update({ full_name: validData.full_name })
      .eq("id", session.user.id);
    if (userError) throw userError;
  }

  const { city, grade, ...restDetails } = validData;
  const detailsUpdate: any = { ...restDetails };

  if (city) detailsUpdate.city = city;
  if (grade) detailsUpdate.grade = grade;

  Object.keys(detailsUpdate).forEach(key => detailsUpdate[key] === undefined && delete detailsUpdate[key]);
  delete detailsUpdate.full_name;

  if (Object.keys(detailsUpdate).length > 0) {
    const { error } = await supabase
      .from("user_details")
      .upsert({
        user_id: session.user.id,
        ...detailsUpdate
      }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  return NextResponse.json({ success: true, message: "Profil güncellendi" });
});