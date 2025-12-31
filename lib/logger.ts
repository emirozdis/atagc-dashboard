import { supabase } from "@/lib/SERVER_supabase";

export async function logAction(
  userId: string | null | undefined, 
  action: string, 
  details: any, 
  req?: Request
) {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (req) {
      const forwarded = req.headers.get("x-forwarded-for");
      ipAddress = forwarded ? forwarded.split(",")[0] : null;
      userAgent = req.headers.get("user-agent");
    }

    await supabase.from("logs").insert({
      user_id: userId || null,
      action,
      details,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  } catch (error) {
    console.error("Failed to write log:", error);
    // Silent fail to not disrupt main flow
  }
}