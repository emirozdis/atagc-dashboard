import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";

export async function POST(request: Request) {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  try {
    const { userId, committeeId } = await request.json();

    if (!userId) {
        return NextResponse.json({ error: "User ID missing" }, { status: 400 });
    }

    // 1. Check if user is already in a committee (Previous State)
    const { data: existing } = await supabase
        .from("committee_members")
        .select("id, committee_id")
        .eq("user_id", userId)
        .maybeSingle(); 

    // If committeeId is provided, we are assigning/updating
    if (committeeId) {
        if (existing) {
            // Update existing assignment
             const { error } = await supabase
                .from("committee_members")
                .update({ committee_id: committeeId })
                .eq("id", existing.id);
             if (error) throw error;

             await logAction(session?.user?.id, "update_committee_assignment", { 
                 target_user_id: userId, 
                 new_committee_id: committeeId,
                 previous_state: existing 
             }, request);
        } else {
            // Insert new assignment
            const { error } = await supabase
                .from("committee_members")
                .insert({ user_id: userId, committee_id: committeeId });
            if (error) throw error;

            await logAction(session?.user?.id, "create_committee_assignment", { 
                target_user_id: userId, 
                committee_id: committeeId,
                previous_state: null
            }, request);
        }
    } else {
        // If committeeId is null/empty/undefined, remove assignment
        if (existing) {
            const { error } = await supabase
                .from("committee_members")
                .delete()
                .eq("user_id", userId);
            
            if (error) throw error;

            await logAction(session?.user?.id, "delete_committee_assignment", { 
                target_user_id: userId,
                previous_state: existing
            }, request);
        }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assignment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
// Change Log:
// - Updated logging to include `previous_state` (the existing committee assignment) before updates or deletions.