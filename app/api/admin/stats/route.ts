import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/SERVER_supabase";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        // Check for superadmin or admin
        if (session?.user?.role !== "superadmin" && session?.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parallel fetch for stats to optimize performance
        const [
            { count: totalApplications, error: totalError },
            { count: pendingApplications, error: pendingError },
            { count: approvedApplications, error: approvedError },
            { data: recentApplications, error: recentError }
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
                .limit(5)
        ]);

        if (totalError || pendingError || approvedError || recentError) {
            console.error("Stats API Error:", { totalError, pendingError, approvedError, recentError });
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        return NextResponse.json({
            stats: {
                total: totalApplications || 0,
                pending: pendingApplications || 0,
                approved: approvedApplications || 0,
            },
            recentActivity: recentApplications || []
        });

    } catch (error) {
        console.error("Internal API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
