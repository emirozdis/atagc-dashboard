import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN] 
    });
    if (!auth.ok) throw new Error(auth.message);

    const { id } = await params;

    const { data, error } = await supabase
        .from("applications")
        .select(`
    id,
    status,
    submitted_at,
    review_notes,
    form_data,
    form:application_forms (
        id,
        title,
        slug,
        steps
    ),
    user:users (
      id,
      full_name,
      email,
      role,
      user_details (
        id,
        phone_number,
        school_name,
        birth_date,
        additional_info,
        profile_picture_url
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
        return NextResponse.json(
            { error: "Database error", message: "Başvuru bulunamadı." },
            { status: 404 }
        );
    }

    return NextResponse.json(data);
});