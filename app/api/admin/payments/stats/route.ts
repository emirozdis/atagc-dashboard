import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
    if (!auth.ok) throw new Error("Unauthorized");

    // 1. Get Total Target Audience (Approved Delegates)
    // Only approved applicants are expected to pay.
    const { count: totalDelegates } = await supabase
        .from("applications")
        .select("*", { count: 'exact', head: true })
        .eq("status", "approved");

    // 2. Get Successfully Paid Users
    const { count: paidDelegates } = await supabase
        .from("applications")
        .select("*", { count: 'exact', head: true })
        .eq("payment_status", "paid");

    const total = totalDelegates || 0;
    const paid = paidDelegates || 0;
    const unpaid = total - paid; // Includes 'unpaid', 'processing', 'rejected'

    // 3. Get Trend Data (Last 7 Days Activity)
    // We count rows in payment_receipts to show activity/workload
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0,0,0,0);

    const { data: trendData } = await supabase
        .from("payment_receipts")
        .select("created_at")
        .gte("created_at", sevenDaysAgo.toISOString());

    const dailyCounts: Record<string, number> = {};
    
    for(let i=0; i<7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString("tr-TR", { day: 'numeric', month: 'short' });
        dailyCounts[dateStr] = 0;
    }

    trendData?.forEach((item) => {
        const dateStr = new Date(item.created_at).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short' });
        if (dailyCounts[dateStr] !== undefined) {
            dailyCounts[dateStr]++;
        }
    });

    const trendChartData = Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, count }))
        .reverse();

    return NextResponse.json({
        stats: {
            paid,
            unpaid,
            total
        },
        trend: trendChartData
    });
});
// Change Log:
// - Changed logic to query `applications` table instead of `payment_receipts`.
// - "Unpaid" now accurately reflects the gap between Total Approved Delegates and Paid Delegates.