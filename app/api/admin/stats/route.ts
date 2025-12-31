import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";

export async function GET(request: Request) {
    try {
        const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
        if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
        const session = auth.session;

        // Parallel fetch for stats to optimize performance
        const [
            { count: totalApplications, error: totalError },
            { count: pendingApplications, error: pendingError },
            { count: approvedApplications, error: approvedError },
            { data: recentApplications, error: recentError },
            { data: recentLogs, error: logsError }
        ] = await Promise.all([
            // Total Applications
            supabase.from("applications").select("*", { count: "exact", head: true }),

            // Pending Applications
            supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),

            // Approved Applications (Registered Delegates)
            supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "approved"),

            // Recent Applications (Last 5)
            supabase
                .from("applications")
                .select(`
                  id,
                  status,
                  submitted_at,
                  user:users (
                    full_name,
                    email
                  )
                `)
                .order("submitted_at", { ascending: false })
                .limit(5),
            
            // Recent Logs (Last 5) - Added for dashboard widget
            supabase
                .from("logs")
                .select(`
                  id,
                  action,
                  created_at,
                  user:users (
                    full_name
                  )
                `)
                .order("created_at", { ascending: false })
                .limit(5)
        ]);

        if (totalError || pendingError || approvedError || recentError || logsError) {
            console.error("Stats API Error:", { totalError, pendingError, approvedError, recentError, logsError });
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        return NextResponse.json({
            stats: {
                total: totalApplications || 0,
                pending: pendingApplications || 0,
                approved: approvedApplications || 0,
            },
            recentActivity: recentApplications || [],
            recentLogs: recentLogs || []
        });

    } catch (error) {
        console.error("Internal API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// Change Log:
// - Added query to fetch `recentLogs` (last 5) for the dashboard widget.
// - Updated response JSON structure to include `recentLogs`.