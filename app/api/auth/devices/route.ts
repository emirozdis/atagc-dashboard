import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { UAParser } from "ua-parser-js";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  
  const userId = auth.session.user.id;
  const currentSessionId = auth.session.user.sessionId;

  const { data: sessions, error } = await supabase
    .from("active_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("last_active", { ascending: false });

  if (error) throw error;

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
});

export const DELETE = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("id");
  const type = searchParams.get("type"); 

  const userId = auth.session.user.id;
  const currentSessionId = auth.session.user.sessionId;

  if (type === 'all_others') {
    const { error } = await supabase
        .from("active_sessions")
        .delete()
        .eq("user_id", userId)
        .neq("id", currentSessionId);
    
    if (error) throw error;
    return NextResponse.json({ success: true, message: "Diğer tüm cihazlardan çıkış yapıldı." });
  }

  if (sessionId) {
    const { error } = await supabase
        .from("active_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", userId); 

    if (error) throw error;
    return NextResponse.json({ success: true, message: "Cihazdan çıkış yapıldı." });
  }

  throw new Error("Invalid request");
});