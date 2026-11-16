import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

interface CommitteeRow {
  id: string;
  name: string;
}

interface MemberRow {
  committee_id: string | null;
  user_id: string | null;
  can_write: boolean | null;
}

interface ApplicantRow {
  user_id: string | null;
}

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({
    requireAuth: true,
    allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN],
  });
  if (!auth.ok) throw new Error(auth.message || "Unauthorized");

  const [committeeResult, memberResult, applicantResult] = await Promise.all([
    supabase.from("committees").select("id, name").order("name", { ascending: true }),
    supabase.from("committee_members").select("committee_id, user_id, can_write"),
    supabase.from("applications").select("user_id").in("application_type", ["delegate", "chairboard"]).in("status", ["accepted", "approved"]),
  ]);

  if (committeeResult.error) throw committeeResult.error;
  if (memberResult.error) throw memberResult.error;
  if (applicantResult.error) throw applicantResult.error;

  const committees = (committeeResult.data || []) as unknown as CommitteeRow[];
  const members = (memberResult.data || []) as unknown as MemberRow[];
  const applicants = (applicantResult.data || []) as unknown as ApplicantRow[];

  const counts = new Map<string, { total: number; chairs: number }>();
  for (const member of members) {
    if (!member.committee_id) continue;
    const key = String(member.committee_id);
    const current = counts.get(key) || { total: 0, chairs: 0 };
    current.total += 1;
    if (member.can_write) current.chairs += 1;
    counts.set(key, current);
  }

  const result = committees.map((committee) => {
    const count = counts.get(String(committee.id)) || { total: 0, chairs: 0 };
    return {
      id: committee.id,
      name: committee.name,
      total: count.total,
      chairs: count.chairs,
      delegates: count.total - count.chairs,
    };
  });

  const placedUserIds = new Set(members.map((member) => String(member.user_id)));
  const applicantUserIds = new Set(applicants.map((applicant) => String(applicant.user_id)));

  return NextResponse.json({
    committees: result,
    placed: result.reduce((total, committee) => total + committee.total, 0),
    unassigned: [...applicantUserIds].filter((userId) => !placedUserIds.has(userId)).length,
  });
});
