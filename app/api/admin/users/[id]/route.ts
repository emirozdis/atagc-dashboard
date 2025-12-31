import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
        if (!auth.ok || !auth.session) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });

        const { id } = await params;

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
                    submitted_at,
                    review_notes
                )
            `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("Fetch user error:", error);
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}