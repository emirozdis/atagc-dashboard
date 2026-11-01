import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { getSignedUrls } from "@/lib/storage-utils";
import { apiHandler } from "@/lib/api-handler";
import { ROLES, COMMITTEE_LEADS } from "@/lib/roles";

const limiter = rateLimit({ namespace: "api/committee/my-committee:limiter", interval: 60 * 1000, uniqueTokenPerInterval: 500 });
type DashboardMember = {
  user_id: string;
  userId?: string;
  is_profile_picture_hidden?: boolean;
  profile_picture_url?: string | null;
  image?: string | null;
  [key: string]: unknown;
};

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

  const [committeeResult, topicResult, memberRows, rollCalls] = await Promise.all([
    supabase
      .from("committees")
      .select("id, name, description, image_url, slug")
      .eq("id", committeeId)
      .maybeSingle(),
    supabase
      .from("topics")
      .select("id, title, description")
      .eq("committee_id", committeeId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("committee_members")
      .select("id, user_id, can_write, user:users(id, full_name, email, role, user_details(profile_picture_url, is_profile_picture_hidden))")
      .eq("committee_id", committeeId),
    supabase
      .from("roll_calls")
      .select("id, session_name, created_at")
      .eq("committee_id", committeeId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (committeeResult.error || !committeeResult.data) {
      console.error("Committee lookup failed:", committeeResult.error);
      throw new Error("Could not load committee data.");
  }
  if (memberRows.error) {
      console.error("Committee members lookup failed:", memberRows.error);
      throw new Error("Could not load committee members.");
  }

  const members = (memberRows.data || []).map((row) => {
      const user = Array.isArray(row.user) ? row.user[0] : row.user;
      const details = user?.user_details
          ? (Array.isArray(user.user_details) ? user.user_details[0] : user.user_details)
          : null;
      return {
          id: row.id,
          userId: row.user_id,
          user_id: row.user_id,
          full_name: user?.full_name || "Unknown member",
          email: user?.email || null,
          role: user?.role || "applicant",
          user: user ? { role: user.role } : undefined,
          can_write: row.can_write === true,
          profile_picture_url: details?.profile_picture_url || null,
          is_profile_picture_hidden: details?.is_profile_picture_hidden === true,
      };
  });

  const pathsToSign: string[] = [];
  members.forEach((m) => {
      const isSelf = m.userId === session.user.id;
      if (m.profile_picture_url) {
          if (isSelf || !m.is_profile_picture_hidden) {
               if (!m.profile_picture_url.startsWith('http')) {
                   pathsToSign.push(m.profile_picture_url);
               }
          } else {
              m.profile_picture_url = null; // Hide if privacy enabled
          }
      }
  });

  if (pathsToSign.length > 0) {
      const signedData = await getSignedUrls("profile-pictures", pathsToSign);
      const urlMap = new Map(signedData?.map(i => [i.path, i.signedUrl]));

      members.forEach((m) => {
          if (m.profile_picture_url && urlMap.has(m.profile_picture_url)) {
              const signedUrl = urlMap.get(m.profile_picture_url) || null;
              (m as DashboardMember).image = signedUrl;
              m.profile_picture_url = signedUrl;
          }
      });
  }

  return NextResponse.json({
    ...committeeResult.data,
    topic: topicResult.data || null,
    members: members,
    roll_calls: rollCalls.data || [],
    stats: {
      total_members: members.length
    }
  });
});
