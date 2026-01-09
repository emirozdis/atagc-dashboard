import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { UAParser } from "ua-parser-js";

export async function GET(request: Request) {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const userId = auth.session.user.id;
  const currentSessionId = auth.session.user.sessionId;

  const { data: sessions, error } = await supabase
    .from("active_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("last_active", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });

  // Parse User Agent strings
  const formattedSessions = sessions.map((s) => {
    const parser = new UAParser(s.user_agent || "");
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    const deviceName = device.model 
        ? `${device.vendor || ''} ${device.model}` 
        : (device.type === 'mobile' ? 'Mobile Phone' : 'Desktop/Laptop');

    return {
      id: s.id,
      ip: s.ip_address,
      lastActive: s.last_active,
      isCurrent: s.id === currentSessionId,
      deviceInfo: {
        browser: `${browser.name || 'Unknown'} ${browser.version || ''}`,
        os: `${os.name || 'Unknown'} ${os.version || ''}`,
        type: deviceName.trim(),
        raw: s.user_agent
      }
    };
  });

  return NextResponse.json(formattedSessions);
}

export async function DELETE(request: Request) {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("id");
  const type = searchParams.get("type"); // 'all_others'

  const userId = auth.session.user.id;
  const currentSessionId = auth.session.user.sessionId;

  if (type === 'all_others') {
    // Delete all except current
    const { error } = await supabase
        .from("active_sessions")
        .delete()
        .eq("user_id", userId)
        .neq("id", currentSessionId);
    
    if (error) return NextResponse.json({ error: "Failed to revoke sessions" }, { status: 500 });
    return NextResponse.json({ success: true, message: "Diğer tüm cihazlardan çıkış yapıldı." });
  }

  if (sessionId) {
    // Delete specific
    const { error } = await supabase
        .from("active_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", userId); // Security check: Ensure session belongs to user

    if (error) return NextResponse.json({ error: "Failed to revoke session" }, { status: 500 });
    return NextResponse.json({ success: true, message: "Cihazdan çıkış yapıldı." });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// Change Log:
// - New route to list active sessions with UA parsing.
// - DELETE support for specific ID or bulk 'all_others'.