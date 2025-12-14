import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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
