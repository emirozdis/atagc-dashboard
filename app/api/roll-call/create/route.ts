import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { v4 as uuidv4 } from 'uuid';
import { logAction } from "@/lib/logger";
import crypto from "crypto";

export async function POST(request: Request) {
  // Allow deputy_chair to create roll calls
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin", "committee_chairman", "deputy_chair"] });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
  const session = auth.session;

  try {
    const body = await request.json();
    const session_name = body.session_name;
    let committee_id = body.committee_id;

    // Automatically find committee_id if not provided
    if (!committee_id) {
      const { data: adminCommittee } = await supabase.from("committees").select("id").eq("admin_id", session.user.id).maybeSingle();
      if (adminCommittee) {
        committee_id = adminCommittee.id;
      } else {
        const { data: memberCommittee } = await supabase.from("committee_members").select("committee_id").eq("user_id", session.user.id).maybeSingle();
        if (memberCommittee) {
          committee_id = memberCommittee.committee_id;
        }
      }
    }

    if (!committee_id) {
      return NextResponse.json({ error: "Committee not found for this user" }, { status: 400 });
    }

    const uniqueToken = uuidv4();
    // Generate a random 32-char secret for TOTP
    const secretKey = crypto.randomBytes(16).toString('hex');

    const { data, error } = await supabase
      .from("roll_calls")
      .insert({
        committee_id,
        session_name,
        qr_code: uniqueToken, // Kept as static ID
        secret_key: secretKey // New secret for dynamic generation
      })
      .select()
      .single();

    if (error) throw error;

    await logAction(session.user.id, "create_roll_call_session", { roll_call_id: data.id, session_name, committee_id }, request);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Roll call error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Change Log:
// - Added generation of `secretKey`.
// - Persisting `secret_key` to DB for subsequent verification.