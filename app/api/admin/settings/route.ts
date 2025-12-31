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

    // Use the first record if exists
    const data = records && records.length > 0 ? records[0] : null;

    if (!data) {
        return NextResponse.json(defaults);
    }

    return NextResponse.json({
        ...data,
        term_name: data.term_name ?? defaults.term_name,
        location: data.location ?? defaults.location,
        event_start_date: data.event_start_date ?? defaults.event_start_date,
        event_end_date: data.event_end_date ?? defaults.event_end_date,
    });
}

export async function POST(request: Request) {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: "superadmin" });
    if (!auth.ok) return NextResponse.json({ error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    const session = auth.session;

    try {
        const body = await request.json();
        
        // Robust check for existence
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
            event_start_date: body.event_start_date || null,
            event_end_date: body.event_end_date || null,
            updated_at: new Date().toISOString()
        };

        if (existing) {
            // Update the single existing record
            const { error } = await supabase
                .from("system_settings")
                .update(updateData)
                .eq("id", existing.id);
                
            if (error) throw error;
        } else {
            // Create the first record
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
// - Updated GET to use `.limit(1)` and extract the first element array to robustly handle the "single record" requirement, avoiding `maybeSingle` issues if multiple records exist by accident.
// - Updated POST to perform the same check: fetch `.limit(1)`, check existence, and then Update vs Insert. This ensures we don't accidentally create duplicate settings records.