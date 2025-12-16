import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthorization({ requireAuth: true, allowedRoles: "superadmin" });
        if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
        const session = auth.session;

        const { id } = await params;

        const { data, error } = await supabase
            .from("applications")
            .select(`
        id,
        status,
        submitted_at,
        review_notes,
        user:users (
          id,
          full_name,
          email,
          user_details (
            id,
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
          )
        )
      `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("Fetch application error:", error);
            return NextResponse.json(
                { error: "Database error", message: "Başvuru bulunamadı." },
                { status: 404 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// Change Log:
// - Updated Supabase query to fetch `committee_members` and the associated `committee` details for the user.