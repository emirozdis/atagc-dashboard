import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { sendSystemNotification } from "@/lib/notification-service";
import { apiHandler } from "@/lib/api-handler";

export const PUT = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const userId = auth.session.user.id;

  const { connectionId, action } = await request.json(); 

  if (!connectionId || !['accept', 'reject'].includes(action)) {
      throw new Error("Invalid request");
  }

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

  if (action === 'accept') {
      await sendSystemNotification(connection.requester_id, "connection_accepted");
  }

  return NextResponse.json({ success: true });
});

export const DELETE = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const userId = auth.session.user.id;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) throw new Error("Missing ID");

    const { error } = await supabase
        .from("user_connections")
        .delete()
        .eq("id", id)
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

    if (error) throw error;

    return NextResponse.json({ success: true });
});