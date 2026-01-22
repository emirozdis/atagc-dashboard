import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { getSignedUrl } from "@/lib/storage-utils";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await limiter.check(60, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) {
    return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  }
  const session = auth.session;
  const userId = session.user.id;

  // Optimized Fetch: Removed Member List and Roll Calls logic
  // This reduces DB load significantly.
  const [
    { data: user, error: userError },
    { data: userDetails, error: detailsError },
    { data: application, error: appError },
    { data: committeeMember, error: cmError },
    { data: managedCommittee, error: managedError },
    { data: settingsData, error: settingsError }
  ] = await Promise.all([
    supabase.from("users").select(`
        id, full_name, email, role, created_at, updated_at,
        user_warnings:user_warnings!user_warnings_user_id_fkey (
            id, reason, created_at,
            issuer:users!user_warnings_issued_by_fkey ( full_name, role )
        )
    `).eq("id", userId).maybeSingle(),
    supabase.from("user_details").select("id, birth_date, phone_number, school_name, profile_picture_url, is_profile_picture_hidden, allow_connections, notification_preferences, additional_info").eq("user_id", userId).maybeSingle(),
    supabase.from("applications").select("id, status, submitted_at, review_notes").eq("user_id", userId).maybeSingle(),
    supabase.from("committee_members").select(`
        can_write, 
        committee:committees (
            id, 
            name, 
            description, 
            admin_id,
            admin:users!committees_admin_id_fkey (
                id,
                full_name,
                email,
                role,
                user_details ( profile_picture_url, is_profile_picture_hidden )
            )
        )
      `).eq("user_id", userId).maybeSingle(),
    supabase.from("committees").select("id, name, description, admin_id").eq("admin_id", userId).maybeSingle(),
    supabase.from("system_settings").select("term_name, location, event_start_date, event_end_date, contact_email").maybeSingle()
  ]);

  if (userError) return NextResponse.json({ error: "Database error" }, { status: 500 });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // 1. Sign User's Own Profile Picture
  // This remains to ensure the profile/header avatars work.
  if (userDetails?.profile_picture_url) {
    userDetails.profile_picture_url = await getSignedUrl("profile-pictures", userDetails.profile_picture_url) || userDetails.profile_picture_url;
  }

  // 2. Sign Committee Chairman Profile Picture (Single Item)
  // Useful for the "My Committee" summary card on the dashboard.
  if (committeeMember?.committee) {
    const c = Array.isArray(committeeMember.committee) ? committeeMember.committee[0] : committeeMember.committee;
    const adminUser = Array.isArray(c?.admin) ? c.admin[0] : c?.admin;

    if (adminUser) {
      const adminDetails = Array.isArray(adminUser.user_details) ? adminUser.user_details[0] : adminUser.user_details;
      const isAdminSelf = adminUser.id === userId;
      const isHidden = adminDetails?.is_profile_picture_hidden;

      let signedUrl = null;
      if (adminDetails?.profile_picture_url) {
        if (isAdminSelf || user.role === 'superadmin' || !isHidden) {
          signedUrl = await getSignedUrl("profile-pictures", adminDetails.profile_picture_url);
        }
      }
      (adminUser as any).profile_picture_url = signedUrl;
    }
  }

  // Consolidate Committee Data
  let finalCommitteeData: any = committeeMember;
  if (finalCommitteeData && Array.isArray(finalCommitteeData.committee)) {
    finalCommitteeData.committee = finalCommitteeData.committee[0];
  }
  if (!finalCommitteeData && managedCommittee) {
    finalCommitteeData = {
      can_write: true,
      committee: managedCommittee
    };
  }

  // Fetch Topic (Single lightweight query)
  let topic = null;
  if (finalCommitteeData?.committee) {
    const committeeId = finalCommitteeData.committee.id;
    if (committeeId) {
      const { data: topicData } = await supabase
        .from("topics")
        .select("title, description")
        .eq("committee_id", committeeId)
        .limit(1)
        .maybeSingle();
      topic = topicData;
    }
  }

  const finalSettings = {
    term_name: settingsData?.term_name ?? "ATAGÇ",
    location: settingsData?.location ?? "Konum Belirlenmedi",
    event_start_date: settingsData?.event_start_date ?? null,
    event_end_date: settingsData?.event_end_date ?? null,
    contact_email: settingsData?.contact_email ?? "info@atagc.com.tr"
  };

  return NextResponse.json({
    user,
    userDetails,
    application,
    committeeMember: finalCommitteeData,
    // Note: 'committeeMembers' (the list) and 'recentRollCalls' are NO LONGER returned here.
    // They are fetched on-demand in the Committee page.
    topic,
    settings: finalSettings
  });
});

export const PUT = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(10, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const body = await request.json();
  const { 
    full_name, phone_number, school_name, birth_date, city, 
    profile_picture_url, is_profile_picture_hidden, allow_connections,
    notification_preferences 
  } = body;

  // 1. Update basic user info
  if (full_name) {
    const { error: userError } = await supabase
      .from("users")
      .update({ full_name })
      .eq("id", session.user.id);
    if (userError) throw userError;
  }

  // 2. Update user details
  const detailsUpdate: any = {};
  if (phone_number) detailsUpdate.phone_number = phone_number;
  if (school_name) detailsUpdate.school_name = school_name;
  if (birth_date) detailsUpdate.birth_date = birth_date;
  if (profile_picture_url !== undefined) detailsUpdate.profile_picture_url = profile_picture_url;
  if (is_profile_picture_hidden !== undefined) detailsUpdate.is_profile_picture_hidden = is_profile_picture_hidden;
  if (allow_connections !== undefined) detailsUpdate.allow_connections = allow_connections;
  if (notification_preferences !== undefined) detailsUpdate.notification_preferences = notification_preferences;

  const { data: existingDetails } = await supabase
    .from("user_details")
    .select("id, additional_info")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (city) {
    const existingInfo = existingDetails?.additional_info || {};
    detailsUpdate.additional_info = { ...existingInfo, city };
  }

  if (Object.keys(detailsUpdate).length > 0) {
    if (existingDetails) {
      const { error: updateError } = await supabase
        .from("user_details")
        .update(detailsUpdate)
        .eq("user_id", session.user.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("user_details")
        .insert({
          user_id: session.user.id,
          ...detailsUpdate
        });
      if (insertError) throw insertError;
    }
  }

  return NextResponse.json({ success: true, message: "Profil güncellendi" });
});

// Change Log:
// - Removed fetching of `committeeMembers` (full roster) and `recentRollCalls` to optimize performance.
// - Removed the loop that generated Signed URLs for every member.
// - Kept user's own profile picture signing logic.