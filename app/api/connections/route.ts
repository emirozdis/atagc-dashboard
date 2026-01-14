import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/logger";
import { getSignedUrl } from "@/lib/storage-utils";
import { sendSystemNotification } from "@/lib/notification-service";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

// ... GET implementation remains unchanged ...
export async function GET(request: Request) {
  // Enforce Approved status for connections
  const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = auth.session.user.id;

  // 1. Fetch Received Pending Requests
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

  if (receivedError) return NextResponse.json({ error: receivedError.message }, { status: 500 });

  // 2. Fetch Sent Pending Requests
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

  if (sentError) return NextResponse.json({ error: sentError.message }, { status: 500 });

  // 3. Fetch Connected Users (Both directions)
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

  // --- Image Signing Helper ---
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
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await limiter.check(10, ip); // 10 scans per minute
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  // Enforce Approved status
  const auth = await getAuthorization({ requireAuth: true, requireApproved: true });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requesterId = auth.session.user.id;

  try {
    const { targetUserId } = await request.json();

    if (!targetUserId) return NextResponse.json({ error: "Target ID required" }, { status: 400 });
    if (requesterId === targetUserId) return NextResponse.json({ error: "You cannot add yourself" }, { status: 400 });

    // 1. Check Privacy Settings of Target
    const { data: targetDetails } = await supabase
      .from("user_details")
      .select("allow_connections")
      .eq("user_id", targetUserId)
      .single();

    if (targetDetails && targetDetails.allow_connections === false) {
      return NextResponse.json({ error: "Kullanıcı bağlantı isteklerini kapatmış." }, { status: 403 });
    }

    // 2. Check Existing Connection
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
      
      // Handle REJECTED case: Allow resending
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
          
          // NOTIFICATION (Resend)
          await sendSystemNotification(targetUserId, "connection_request");

          return NextResponse.json({ success: true, message: "İstek tekrar gönderildi." });
        } else {
          await supabase.from("user_connections").delete().eq("id", existing.id);
        }
      }
    }

    // 3. Create Connection Request
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

    // NOTIFICATION (New Request)
    await sendSystemNotification(targetUserId, "connection_request");

    return NextResponse.json({ 
      success: true, 
      message: `Bağlantı isteği gönderildi: ${targetUser?.full_name}` 
    });

  } catch (error) {
    console.error("Connection request error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

// Change Log:
// - Added `sendSystemNotification(targetUserId, "connection_request")` when a new or resent request occurs.