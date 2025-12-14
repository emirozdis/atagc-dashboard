import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    // Allow admin and superadmin to view settings
    if (session?.user?.role !== "superadmin" && session?.user?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to fetch existing settings
    const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .single();

    if (error) {
        // If no settings exist yet, return default values
        console.warn("Settings not found or DB error, returning defaults:", error.message);
        return NextResponse.json({
            applications_open: true,
            maintenance_mode: false,
            term_name: "ATAGÇ 2026",
            contact_email: "info@atagc.com.tr"
        });
    }

    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    // Only superadmin can modify system settings
    if (session?.user?.role !== "superadmin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        
        // Check if settings row exists (we assume singleton pattern for settings)
        const { data: existing } = await supabase.from("system_settings").select("id").maybeSingle();

        let resultError;

        if (existing) {
            // Update existing row
            const { error } = await supabase
                .from("system_settings")
                .update({
                    applications_open: body.applications_open,
                    maintenance_mode: body.maintenance_mode,
                    term_name: body.term_name,
                    contact_email: body.contact_email,
                    updated_at: new Date().toISOString()
                })
                .eq("id", existing.id);
            resultError = error;
        } else {
            // Insert new row if table is empty
            const { error } = await supabase
                .from("system_settings")
                .insert({
                    applications_open: body.applications_open,
                    maintenance_mode: body.maintenance_mode,
                    term_name: body.term_name,
                    contact_email: body.contact_email
                });
            resultError = error;
        }

        if (resultError) throw resultError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Settings update error:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}