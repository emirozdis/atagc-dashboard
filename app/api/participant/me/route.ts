import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/SERVER_supabase";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch full user information (users can only access their own data via userId from session)
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, full_name, email, role, created_at, updated_at")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Fetch user error:", userError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Fetch user details (phone, school, birth_date, additional_info)
    const { data: userDetails, error: detailsError } = await supabase
      .from("user_details")
      .select("id, birth_date, phone_number, school_name, additional_info")
      .eq("user_id", userId)
      .maybeSingle();

    if (detailsError && detailsError.code !== 'PGRST116') {
      console.error("Fetch user details error:", detailsError);
    }

    // Fetch application
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("id, status, submitted_at, review_notes")
      .eq("user_id", userId)
      .maybeSingle();

    if (appError) {
      console.error("Fetch application error:", appError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Fetch committee assignment AND permission
    const { data: committeeMember, error: cmError } = await supabase
      .from("committee_members")
      .select(`
        can_write,
        committee:committees (
          id,
          name,
          description,
          admin_id
        )
      `)
      .eq("user_id", userId)
      .maybeSingle();

    if (cmError && cmError.code !== 'PGRST116') {
        console.error("Fetch committee error:", cmError);
    }

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

    return NextResponse.json({
      user,
      userDetails,
      application,
      committeeMember,
      topic
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}