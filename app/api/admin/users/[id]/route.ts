import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin", "committee_chairman", "deputy_chair"] });
        if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
        const session = auth.session;

        const { id } = await params;

        // Security Check for Chairmen/Deputies
        if (session.user.role === 'committee_chairman' || session.user.role === 'deputy_chair') {
            let committeeId = null;
            
            const { data: managed } = await supabase.from("committees").select("id").eq("admin_id", session.user.id).maybeSingle();
            if (managed) committeeId = managed.id;
            else {
                const { data: membership } = await supabase.from("committee_members").select("committee_id").eq("user_id", session.user.id).maybeSingle();
                if (membership) committeeId = membership.committee_id;
            }

            if (!committeeId) return NextResponse.json({ error: "No committee found for requester" }, { status: 403 });

            const { data: isMember } = await supabase
                .from("committee_members")
                .select("id")
                .eq("committee_id", committeeId)
                .eq("user_id", id)
                .maybeSingle();
            
            const { data: isAdmin } = await supabase
                .from("committees")
                .select("id")
                .eq("id", committeeId)
                .eq("admin_id", id)
                .maybeSingle();

            if (!isMember && !isAdmin) {
                return NextResponse.json({ error: "Bu kullanıcı sizin komitenizde değil." }, { status: 403 });
            }
        }

        const { data, error } = await supabase
            .from("users")
            .select(`
                id, 
                full_name, 
                email, 
                role, 
                is_suspended, 
                created_at, 
                updated_at,
                user_details (
                    phone_number,
                    school_name,
                    birth_date,
                    additional_info
                ),
                committee_members (
                    id,
                    committee:committees (
                        id,
                        name
                    )
                ),
                managed_committees:committees!admin_id (
                    id,
                    name
                ),
                application:applications (
                    id,
                    status,
                    payment_status,
                    submitted_at,
                    review_notes,
                    form:application_forms (
                        slug,
                        title
                    )
                ),
                user_warnings:user_warnings!user_warnings_user_id_fkey (
                    id,
                    reason,
                    created_at,
                    issuer:users!user_warnings_issued_by_fkey (
                        id,
                        full_name,
                        role
                    )
                ),
                payment_receipts:payment_receipts!payment_receipts_user_id_fkey (
                    id, created_at
                )
            `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("Fetch user error:", error);
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Sort warnings
        if (data.user_warnings && Array.isArray(data.user_warnings)) {
            data.user_warnings.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        // Sort receipts to get latest
        if (data.payment_receipts && Array.isArray(data.payment_receipts)) {
            data.payment_receipts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Change Log:
// - Updated query to include `form:application_forms(slug, title)` in the `application` selection.