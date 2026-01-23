import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { getSignedUrls } from "@/lib/storage-utils";
import { apiHandler } from "@/lib/api-handler";
import { ROLES, COMMITTEE_LEADS } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  const auth = await getAuthorization({ 
      requireAuth: true, 
      allowedRoles: [ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR, ROLES.APPLICANT], 
      requireApproved: true 
  });
  
  if (!auth.ok || !auth.session) throw new Error(auth.message);
  const session = auth.session;

  if (!COMMITTEE_LEADS.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: Management access only" }, { status: 403 });
  }

  let committeeId: string | null = null;

  const { data: adminCommittee } = await supabase
    .from("committees")
    .select("id")
    .eq("admin_id", session.user.id)
    .maybeSingle();
    
  if (adminCommittee) {
    committeeId = adminCommittee.id;
  } else {
    const { data: memberCommittee } = await supabase
      .from("committee_members")
      .select("committee_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (memberCommittee) committeeId = memberCommittee.committee_id;
  }

  if (!committeeId) {
    return NextResponse.json({ error: "Committee not found" }, { status: 404 });
  }

  const { data: dashboardData, error } = await supabase
      .rpc("get_committee_dashboard_data", { target_committee_id: committeeId });

  if (error) {
      console.error("RPC Error:", error);
      throw new Error("Komite verileri alınamadı.");
  }

  const members = dashboardData.members || [];
  const pathsToSign: string[] = [];
  const memberMap = new Map();

  members.forEach((m: any) => {
      m.userId = m.user_id;
      
      const isSelf = m.userId === session.user.id;
      const isHidden = m.is_profile_picture_hidden;
      
      if (m.profile_picture_url) {
          if (isSelf || !isHidden) {
               if (!m.profile_picture_url.startsWith('http')) {
                   pathsToSign.push(m.profile_picture_url);
               }
          } else {
              m.profile_picture_url = null; // Hide if privacy enabled
          }
      }
      memberMap.set(m.userId, m);
  });

  if (pathsToSign.length > 0) {
      const signedData = await getSignedUrls("profile-pictures", pathsToSign);
      const urlMap = new Map(signedData?.map(i => [i.path, i.signedUrl]));

      members.forEach((m: any) => {
          if (m.profile_picture_url && urlMap.has(m.profile_picture_url)) {
              m.image = urlMap.get(m.profile_picture_url);
              m.profile_picture_url = m.image;
          }
      });
  }

  const { data: rollCalls } = await supabase
      .from("roll_calls")
      .select("id, session_name, created_at")
      .eq("committee_id", committeeId)
      .order("created_at", { ascending: false })
      .limit(5);

  return NextResponse.json({
    ...dashboardData.committee,
    topic: dashboardData.topic,
    members: members,
    roll_calls: rollCalls || [],
    stats: {
      total_members: members.length
    }
  });
});