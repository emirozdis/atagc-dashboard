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

    // If no application, return early with nulls
    if (!application) {
      return NextResponse.json({
        application: null,
        committeeMember: null,
        topic: null
      });
    }

    // Fetch committee assignment
    const { data: committeeMember, error: cmError } = await supabase
      .from("committee_members")
      .select(`
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
      application,
      committeeMember,
      topic
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Change Log:
// - Created new API route to serve participant data.
// - Handles fetching application, committee, and topic details server-side using the secure client.