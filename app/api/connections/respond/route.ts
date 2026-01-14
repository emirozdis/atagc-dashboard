import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { sendSystemNotification } from "@/lib/notification-service";

export async function PUT(request: Request) {
  // Enforce Approved status
  const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = auth.session.user.id;

  try {
    const { connectionId, action } = await request.json(); // action: 'accept' | 'reject'

    if (!connectionId || !['accept', 'reject'].includes(action)) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Verify ownership (Must be recipient to accept)
    const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("id", connectionId)
        .eq("recipient_id", userId)
        .eq("status", "pending")
        .single();

    if (!connection) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const newStatus = action === 'accept' ? 'connected' : 'rejected';

    const { error } = await supabase
        .from("user_connections")
        .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq("id", connectionId);

    if (error) throw error;

    await logAction(userId, `connection_${action}`, { connection_id: connectionId, requester_id: connection.requester_id }, request);

    // NOTIFICATION (Only on Accept)
    if (action === 'accept') {
        await sendSystemNotification(connection.requester_id, "connection_accepted");
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    // Enforce Approved status
    const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
    if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = auth.session.user.id;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        // User can delete if they are requester OR recipient
        const { error } = await supabase
            .from("user_connections")
            .delete()
            .eq("id", id)
            .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}

// Change Log:
// - Added `sendSystemNotification` call when a connection is accepted.