import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin" && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, committeeId } = await request.json();

    if (!userId) {
        return NextResponse.json({ error: "User ID missing" }, { status: 400 });
    }

    // If committeeId is provided, we are assigning/updating
    if (committeeId) {
        // 1. Check if user is already in a committee
        const { data: existing } = await supabase
            .from("committee_members")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle(); 

        if (existing) {
            // Update existing assignment
             const { error } = await supabase
                .from("committee_members")
                .update({ committee_id: committeeId })
                .eq("id", existing.id);
             if (error) throw error;
        } else {
            // Insert new assignment
            const { error } = await supabase
                .from("committee_members")
                .insert({ user_id: userId, committee_id: committeeId });
            if (error) throw error;
        }
    } else {
        // If committeeId is null/empty/undefined, remove assignment
        const { error } = await supabase
            .from("committee_members")
            .delete()
            .eq("user_id", userId);
        
        if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assignment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
// Change Log:
// - Created new API route to handle committee assignment (Create, Update, Delete).