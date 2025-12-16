import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";

export async function GET() {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
    if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    const session = auth.session;
    // Allow admin and superadmin to view settings

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
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: "superadmin" });
    if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    const session = auth.session;
    // Only superadmin can modify system settings

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