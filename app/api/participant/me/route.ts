import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";

export async function GET(request: Request) {
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
        { data: settingsData, error: settingsError }
    ] = await Promise.all([
        supabase.from("users").select("id, full_name, email, role, created_at, updated_at").eq("id", userId).single(),
        supabase.from("user_details").select("id, birth_date, phone_number, school_name, additional_info").eq("user_id", userId).maybeSingle(),
        supabase.from("applications").select("id, status, submitted_at, review_notes").eq("user_id", userId).maybeSingle(),
        supabase.from("committee_members").select(`can_write, committee:committees (id, name, description, admin_id)`).eq("user_id", userId).maybeSingle(),
        supabase.from("system_settings").select("term_name, location, event_start_date, event_end_date, contact_email").maybeSingle()
    ]);

    if (userError) {
      console.error("Fetch user error:", userError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (appError) console.error("Fetch application error:", appError);

    // 2. Fetch Topic
    let topic = null;
    if (committeeMember?.committee) {
      // @ts-ignore
      const committeeId = committeeMember.committee.id;
      const { data: topicData } = await supabase
        .from("topics")
        .select("title, description")
        .eq("committee_id", committeeId)
        .limit(1)
        .maybeSingle();
      
      topic = topicData;
    }

    // 3. Prepare Settings with Generic Defaults
    // "2026" is removed from hardcoded strings here. It must come from DB.
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
      committeeMember,
      topic,
      settings: finalSettings
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}