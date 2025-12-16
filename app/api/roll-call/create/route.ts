import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    const auth = await getAuthorization({
        requireAuth: true,
        customCheck: async (session, supabase) => {
            if (!session?.user) return { ok: false, status: 401, message: 'Unauthorized' };
            const role = session.user.role;

            if (role === 'committee_chairman') {
                const { data: adminCommittee } = await supabase
                    .from('committees')
                    .select('id')
                    .eq('admin_id', session.user.id)
                    .maybeSingle();

                if (adminCommittee) return { ok: true, payload: { role, adminCommitteeId: adminCommittee.id } };

                const { data: memberCommittee } = await supabase
                    .from('committee_members')
                    .select('committee_id')
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                if (memberCommittee) return { ok: true, payload: { role, memberCommitteeId: memberCommittee.committee_id } };

                return { ok: false, status: 403, message: 'Yönettiğiniz bir komite bulunamadı.' };
            }

            if (role === 'superadmin' || role === 'admin') return { ok: true, payload: { role } };

            return { ok: false, status: 403, message: 'Forbidden' };
        }
    });

    if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });

    try {
        const { committee_id, session_name } = await request.json();
        
        let targetCommitteeId = committee_id;

        // Permission Logic
        if (auth.payload?.role === "committee_chairman") {
            if (auth.payload.adminCommitteeId) {
                targetCommitteeId = auth.payload.adminCommitteeId;
            } else if (auth.payload.memberCommitteeId) {
                targetCommitteeId = auth.payload.memberCommitteeId;
            } else {
                return NextResponse.json({ error: "Yönettiğiniz bir komite bulunamadı." }, { status: 403 });
            }
        } else if (auth.payload?.role === "superadmin" || auth.payload?.role === "admin") {
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