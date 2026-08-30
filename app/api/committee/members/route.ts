import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { rateLimit } from "@/lib/rate-limit";
import { getSignedUrls } from "@/lib/storage-utils";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";
import { canAccessCommittee } from "@/lib/committee-access";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

type CommitteeUser = { id: string; full_name: string; email: string; role: string; user_details?: { profile_picture_url?: string | null; is_profile_picture_hidden?: boolean } | Array<{ profile_picture_url?: string | null; is_profile_picture_hidden?: boolean }> | null };
type CommitteeMemberRow = { id: string; can_write?: boolean; user?: CommitteeUser | CommitteeUser[] | null };
type ProcessedUser = { id: string; userId: string; full_name: string; email: string; role: string; can_edit: boolean; image: string | null };

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) {
    throw new Error("Unauthorized");
  }
  const session = auth.session;
  const currentUserId = session.user.id;

  const { data: membership } = await supabase
    .from("committee_members")
    .select("committee_id")
    .eq("user_id", currentUserId)
    .maybeSingle();

  let committeeId = membership?.committee_id;

  if (!committeeId) {
    const { data: managed } = await supabase
      .from("committees")
      .select("id")
      .eq("admin_id", currentUserId)
      .maybeSingle();
    committeeId = managed?.id;
  }

  if (!committeeId) {
    return NextResponse.json({ error: "No committee found" }, { status: 404 });
  }

  const [adminRes, membersRes] = await Promise.all([
    supabase
      .from("committees")
      .select(`
        admin:users!committees_admin_id_fkey (
          id, full_name, email, role,
          user_details ( profile_picture_url, is_profile_picture_hidden )
        )
      `)
      .eq("id", committeeId)
      .single(),
    
    supabase
      .from("committee_members")
      .select(`
        id,
        can_write,
        user:users (
          id, full_name, email, role,
          user_details ( profile_picture_url, is_profile_picture_hidden )
        )
      `)
      .eq("committee_id", committeeId)
  ]);

  const pathsToSign: string[] = [];
  const memberMap = new Map(); 

  const processUser = (u: CommitteeUser | null | undefined, isChairman = false, memberId?: string, canWrite = false): ProcessedUser | null => {
    if (!u) return null;
    
    const details = Array.isArray(u.user_details) ? u.user_details[0] : u.user_details;
    const isSelf = u.id === currentUserId;
    const isHidden = details?.is_profile_picture_hidden;
    const isSuperAdmin = session.user.role === ROLES.SUPERADMIN;
    
    let imagePath = null;

    if (details?.profile_picture_url) {
      if (isSelf || isSuperAdmin || !isHidden) {
        imagePath = details.profile_picture_url;
        if (imagePath && !imagePath.startsWith('http')) {
          pathsToSign.push(imagePath);
        }
      }
    }

    const obj = {
      id: memberId || `chair-${u.id}`, 
      userId: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      can_edit: canWrite,
      image: imagePath 
    };

    memberMap.set(u.id, obj);
    return obj;
  };

  let adminObj = null;
  if (adminRes.data?.admin) {
    const admin = Array.isArray(adminRes.data.admin) ? adminRes.data.admin[0] : adminRes.data.admin;
    adminObj = processUser(admin as unknown as CommitteeUser, true);
  }

  const membersList = ((membersRes.data || []) as unknown as CommitteeMemberRow[]).map((m) => {
    const u = Array.isArray(m.user) ? m.user[0] : m.user;
    return processUser(u, false, m.id, m.can_write ?? false);
  }).filter((member): member is ProcessedUser => member !== null);

  if (pathsToSign.length > 0) {
    const uniquePaths = Array.from(new Set(pathsToSign));
    const signedData = await getSignedUrls("profile-pictures", uniquePaths);
    
    const urlMap = new Map();
    signedData?.forEach(item => urlMap.set(item.path, item.signedUrl));

    if (adminObj && adminObj.image && urlMap.has(adminObj.image)) {
      adminObj.image = urlMap.get(adminObj.image);
    }

    membersList.forEach((m) => {
      if (m.image && urlMap.has(m.image)) {
        m.image = urlMap.get(m.image);
      }
    });
  }

  return NextResponse.json({
    admin: adminObj,
    members: membersList
  });
});

export const PUT = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const body = await request.json();
  if (typeof body.memberId !== "string" || typeof body.canEdit !== "boolean") throw new Error("Invalid permission update.");

  const { data: member } = await supabase.from("committee_members").select("id, user_id, committee_id, can_write").eq("id", body.memberId).maybeSingle();
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (!(await canAccessCommittee(auth.session.user.id, auth.session.user.role, member.committee_id, true))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("committee_members").update({ can_write: body.canEdit }).eq("id", member.id);
  if (error) throw error;
  await supabase.from("audit_logs").insert({ user_id: auth.session.user.id, action: "update_committee_member_permission", resource_type: "committee_member", resource_id: member.id, metadata: { target_user_id: member.user_id, can_write: body.canEdit } });
  return NextResponse.json({ success: true });
});
