import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";

export async function GET() {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin"] });
    if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    
    // Ensure we only ever deal with one record. Fetch 1.
    const { data: records, error } = await supabase
        .from("system_settings")
        .select("*")
        .limit(1);

    // Default values object
    const defaults = {
        applications_open: true,
        maintenance_mode: false,
        term_name: "ATAGÇ",
        contact_email: "info@atagc.com.tr",
        location: "İTÜ GVO İzmir NESAN Yerleşkesi",
        event_start_date: null,
        event_end_date: null
    };

    if (error) {
        return NextResponse.json(defaults);
    }

    const data = records && records.length > 0 ? records[0] : null;

    if (!data) {
        return NextResponse.json(defaults);
    }

    // Helper to safely extract YYYY-MM-DD from an ISO timestamptz string
    const toDateString = (isoString: string | null) => {
        if (!isoString) return "";
        // Take first 10 characters (YYYY-MM-DD) safely regardless of time/zone parts
        return isoString.substring(0, 10);
    };

    return NextResponse.json({
        ...data,
        term_name: data.term_name ?? defaults.term_name,
        location: data.location ?? defaults.location,
        event_start_date: toDateString(data.event_start_date) || defaults.event_start_date,
        event_end_date: toDateString(data.event_end_date) || defaults.event_end_date,
    });
}

export async function POST(request: Request) {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: "superadmin" });
    if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    const session = auth.session;

    try {
        const body = await request.json();
        
        const { data: existingRecords } = await supabase
            .from("system_settings")
            .select("id")
            .limit(1);
        
        const existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

        const updateData = {
            applications_open: body.applications_open,
            maintenance_mode: body.maintenance_mode,
            term_name: body.term_name,
            contact_email: body.contact_email,
            location: body.location,
            // Allow null or valid ISO strings
            event_start_date: body.event_start_date ? new Date(body.event_start_date).toISOString() : null,
            event_end_date: body.event_end_date ? new Date(body.event_end_date).toISOString() : null,
            updated_at: new Date().toISOString()
        };

        if (existing) {
            const { error } = await supabase
                .from("system_settings")
                .update(updateData)
                .eq("id", existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from("system_settings")
                .insert(updateData);
            if (error) throw error;
        }

        await logAction(session?.user?.id, "update_settings", { 
            changes: body,
            previous_state: existing ? "updated" : "created"
        }, request);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Settings update error:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}

// Change Log:
// - GET: Updated date extraction to use `substring(0, 10)` which correctly extracts YYYY-MM-DD from `timestamptz` ISO strings without timezone shifting artifacts from Date parsing.
// - POST: Explicitly converting incoming date strings to `toISOString()` to ensure `timestamptz` compatibility in Postgres.