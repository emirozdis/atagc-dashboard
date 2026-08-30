import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async () => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
  if (!auth.ok) throw new Error("Unauthorized");
  const count = async (table: string, filters: Array<[string, string]> = []) => {
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    for (const [column, value] of filters) query = query.eq(column, value);
    const result = await query;
    if (result.error) throw result.error;
    return result.count || 0;
  };
  const [totalApplications, pendingApplications, underReviewApplications, acceptedApplications, rejectedApplications, totalUsers, assignedUsers, totalDelegations, recent, applicationRows] = await Promise.all([
    count("applications"), count("applications", [["status", "pending"]]), count("applications", [["status", "under_review"]]), count("applications", [["status", "accepted"]]), count("applications", [["status", "rejected"]]), count("users"), count("conference_assignments"), count("delegations"),
    supabase.from("applications").select("id, application_type, status, submitted_at, user:users(full_name,email)").order("submitted_at", { ascending: false }).limit(8),
    supabase.from("applications").select("application_type, status, submitted_at"),
  ]);
  if (recent.error || applicationRows.error) throw new Error("Unable to load dashboard statistics.");
  const byType = ["delegate", "chairboard", "delegation", "press", "observer"].map((type) => ({ type, count: (applicationRows.data || []).filter((row) => row.application_type === type).length }));
  const byStatus = ["pending", "under_review", "accepted", "rejected", "withdrawn"].map((status) => ({ status, count: (applicationRows.data || []).filter((row) => row.status === status).length }));
  const submittedByDay = new Map<string, number>();
  for (const row of applicationRows.data || []) {
    const day = new Date(row.submitted_at).toISOString().slice(0, 10);
    submittedByDay.set(day, (submittedByDay.get(day) || 0) + 1);
  }
  const applicationsOverTime = Array.from(submittedByDay.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, count]) => ({ date, count }));
  return NextResponse.json({ stats: { totalApplications, pendingApplications: pendingApplications + underReviewApplications, acceptedApplications, rejectedApplications, totalUsers, assignedUsers, totalDelegations }, byType, byStatus, applicationsOverTime, recentApplications: recent.data || [] });
});
