import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/logger";
import { getSignedUrl } from "@/lib/storage-utils";
import { sendSystemNotification } from "@/lib/notification-service";
import { apiHandler } from "@/lib/api-handler";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const userId = auth.session.user.id;

  const { data: received, error: receivedError } = await supabase
    .from("user_connections")
    .select(`
      id,
      created_at,
      requester:users!user_connections_requester_id_fkey (
        id, full_name, email, role,
        user_details ( profile_picture_url, additional_info )
      )
    `)
    .eq("recipient_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (receivedError) throw receivedError;

  const { data: sent, error: sentError } = await supabase
    .from("user_connections")
    .select(`
      id,
      created_at,
      recipient:users!user_connections_recipient_id_fkey (
        id, full_name, email, role,
        user_details ( profile_picture_url, additional_info )
      )
    `)
    .eq("requester_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (sentError) throw sentError;

  const { data: sentConnections } = await supabase
    .from("user_connections")
    .select(`
        id, created_at, updated_at,
        friend:users!user_connections_recipient_id_fkey (
            id, full_name, email, role,
            user_details ( profile_picture_url, school_name, additional_info )
        )
    `)
    .eq("requester_id", userId)
    .eq("status", "connected");

  const { data: receivedConnections } = await supabase
    .from("user_connections")
    .select(`
        id, created_at, updated_at,
        friend:users!user_connections_requester_id_fkey (
            id, full_name, email, role,
            user_details ( profile_picture_url, school_name, additional_info )
        )
    `)
    .eq("recipient_id", userId)
    .eq("status", "connected");

  const signImages = async (list: any[], userKey: string) => {
    return Promise.all((list || []).map(async (item: any) => {
      const userObj = item[userKey];
      const d = Array.isArray(userObj.user_details) ? userObj.user_details[0] : userObj.user_details;
      if (d?.profile_picture_url) {
        d.profile_picture_url = await getSignedUrl("profile-pictures", d.profile_picture_url);
      }
      return item;
    }));
  };

  const receivedFormatted = await signImages(received, 'requester');
  const sentFormatted = await signImages(sent, 'recipient');
  
  const allConnected = [...(sentConnections || []), ...(receivedConnections || [])];
  const connectedFormatted = await signImages(allConnected, 'friend');

  return NextResponse.json({
    pending: receivedFormatted,
    sent: sentFormatted,
    connected: connectedFormatted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  });
});

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(10, ip);

  const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const requesterId = auth.session.user.id;

  const { targetUserId } = await request.json();

  if (!targetUserId) throw new Error("Target ID required");
  if (requesterId === targetUserId) throw new Error("You cannot add yourself");

  const { data: targetDetails } = await supabase
    .from("user_details")
    .select("allow_connections")
    .eq("user_id", targetUserId)
    .single();

  if (targetDetails && targetDetails.allow_connections === false) {
    return NextResponse.json({ error: "Kullanıcı bağlantı isteklerini kapatmış." }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("user_connections")
    .select("*")
    .or(`and(requester_id.eq.${requesterId},recipient_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},recipient_id.eq.${requesterId})`)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'connected') {
      return NextResponse.json({ message: "Zaten bağlantınız var.", status: "already_connected" });
    }
    if (existing.status === 'pending') {
      return NextResponse.json({ message: "İstek zaten gönderilmiş veya bekleniyor.", status: "pending" });
    }
    if (existing.status === 'blocked') {
      return NextResponse.json({ error: "İşlem gerçekleştirilemedi." }, { status: 403 });
    }
    
    if (existing.status === 'rejected') {
      if (existing.requester_id === requesterId) {
        const { error: updateError } = await supabase
          .from("user_connections")
          .update({ 
              status: 'pending', 
              updated_at: new Date().toISOString() 
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;

        await logAction(requesterId, "connection_request_resend", { target_id: targetUserId }, request);
        
        await sendSystemNotification(targetUserId, "connection_request");

        return NextResponse.json({ success: true, message: "İstek tekrar gönderildi." });
      } else {
        await supabase.from("user_connections").delete().eq("id", existing.id);
      }
    }
  }

  const { error } = await supabase
    .from("user_connections")
    .insert({
      requester_id: requesterId,
      recipient_id: targetUserId,
      status: 'pending',
      created_at: new Date().toISOString()
    });

  if (error) throw error;

  const { data: targetUser } = await supabase.from("users").select("full_name").eq("id", targetUserId).single();

  await logAction(requesterId, "connection_request", { target_id: targetUserId }, request);

  await sendSystemNotification(targetUserId, "connection_request");

  return NextResponse.json({ 
    success: true, 
    message: `Bağlantı isteği gönderildi: ${targetUser?.full_name}` 
  });
});

// Change Log:
// - Wrapped with `apiHandler`.