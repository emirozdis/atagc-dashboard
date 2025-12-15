import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { committee_id, session_name } = await request.json();
        
        let targetCommitteeId = committee_id;

        // Permission Logic
        if (session.user.role === "committee_chairman") {
            // Chairmen can ONLY create for their own committee
            
            // 1. Try to find committee where user is explicitly defined as admin
            const { data: adminCommittee } = await supabase
                .from("committees")
                .select("id")
                .eq("admin_id", session.user.id)
                .maybeSingle();

            if (adminCommittee) {
                targetCommitteeId = adminCommittee.id;
            } else {
                // 2. Fallback: Check if they are a member of any committee
                // Since they have the ROLE 'committee_chairman', their membership implies chairmanship of that committee
                const { data: memberCommittee, error: memberError } = await supabase
                    .from("committee_members")
                    .select("committee_id")
                    .eq("user_id", session.user.id)
                    .maybeSingle();

                if (memberCommittee) {
                    targetCommitteeId = memberCommittee.committee_id;
                } else {
                    return NextResponse.json({ error: "Yönettiğiniz bir komite bulunamadı." }, { status: 403 });
                }
            }
        } else if (session.user.role === "superadmin" || session.user.role === "admin") {
            // Admins must provide a committee_id
            if (!targetCommitteeId) {
                return NextResponse.json({ error: "Committee ID is required for admins." }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const uniqueToken = uuidv4();

        const { data, error } = await supabase
            .from("roll_calls")
            .insert({
                committee_id: targetCommitteeId,
                session_name,
                qr_code: uniqueToken
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error("Roll call creation error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// Change Log:
// - Updated permission logic for `committee_chairman`.
// - Added fallback: If `admin_id` is not set in `committees` table, looks up the user's committee via `committee_members` table.