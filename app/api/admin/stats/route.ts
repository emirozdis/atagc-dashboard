import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async () => {
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] 
    });
    if (!auth.ok) throw new Error(auth.message);

    const { data, error } = await supabase.rpc("get_admin_dashboard_stats");

    if (error) {
        console.error("Stats RPC Error:", error);
        throw new Error("Could not load database statistics.");
    }

    return NextResponse.json(data);
});
