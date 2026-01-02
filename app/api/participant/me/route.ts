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
    // Use 'any' to bypass strict type inference mismatch between committeeMember (inferred array prop) and managedCommittee (object)
    let finalCommitteeData: any = committeeMember;

    // Handle Supabase returning array for committee relation if strictly typed
    if (finalCommitteeData && Array.isArray(finalCommitteeData.committee)) {
        finalCommitteeData.committee = finalCommitteeData.committee[0];
    }

    if (!finalCommitteeData && managedCommittee) {
        finalCommitteeData = {
            can_write: true, // Chairmen implicitly have write access
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

    // 4. Prepare Settings with Generic Defaults
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

// Change Log:
// - Added `: any` type annotation to `finalCommitteeData` to resolve TypeScript error where `committee` property types mismatched (array vs object).
// - Added a check to flatten `finalCommitteeData.committee` if it comes back as an array from Supabase, ensuring consistency for the frontend.
// - Cleaned up `@ts-ignore` comments by using the `any` typed variable.