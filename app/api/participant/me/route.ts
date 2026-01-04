import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { logAction } from "@/lib/logger";

// Generous dashboard loading limit (60 requests/min)
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await limiter.check(60, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  try {
    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) {
      return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }
    const session = auth.session;
    const userId = session.user.id;

    // 1. Parallel Fetching
    const [
      { data: user, error: userError },
      { data: userDetails, error: detailsError },
      { data: application, error: appError },
      { data: committeeMember, error: cmError },
      { data: managedCommittee, error: managedError },
      { data: settingsData, error: settingsError }
    ] = await Promise.all([
      supabase.from("users").select("id, full_name, email, role, created_at, updated_at").eq("id", userId).single(),
      supabase.from("user_details").select("id, birth_date, phone_number, school_name, additional_info").eq("user_id", userId).maybeSingle(),
      supabase.from("applications").select("id, status, submitted_at, review_notes").eq("user_id", userId).maybeSingle(),
      supabase.from("committee_members").select(`can_write, committee:committees (id, name, description, admin_id)`).eq("user_id", userId).maybeSingle(),
      supabase.from("committees").select("id, name, description, admin_id").eq("admin_id", userId).maybeSingle(),
      supabase.from("system_settings").select("term_name, location, event_start_date, event_end_date, contact_email").maybeSingle()
    ]);

    if (userError) {
      console.error("Fetch user error:", userError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (appError) console.error("Fetch application error:", appError);

    // 2. Unify Committee Data
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

    // 3. Fetch Topic
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

    // 4. Prepare Settings
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
      topic,
      settings: finalSettings
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const PUT = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(10, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const body = await request.json();
  const { full_name, phone_number, school_name, birth_date, city } = body;

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

  // Handling additional info (JSONB) merge for City
  if (city) {
    // First fetch existing to merge properly
    const { data: existingDetails } = await supabase
      .from("user_details")
      .select("additional_info")
      .eq("user_id", session.user.id)
      .single();

    const existingInfo = existingDetails?.additional_info || {};
    detailsUpdate.additional_info = { ...existingInfo, city };
  }

  if (Object.keys(detailsUpdate).length > 0) {
    const { error: detailsError } = await supabase
      .from("user_details")
      .update(detailsUpdate)
      .eq("user_id", session.user.id);

    if (detailsError) throw detailsError;
  }

  await logAction(session.user.id, "update_profile", { changed_fields: Object.keys(body) }, request);

  return NextResponse.json({ success: true, message: "Profil güncellendi" });
});

// Change Log:
// - Added PUT handler to allow users to update their own profile information.
// - Handles updating both `users` table (name) and `user_details` (phone, school, etc.).