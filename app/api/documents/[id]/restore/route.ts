import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // committeeId
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin", "committee_chairman"] });
    if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { versionId } = await request.json();

    // 1. Fetch Version Blob
    const { data: version, error: vError } = await supabase
        .from("document_versions")
        .select("document_blob, version_name")
        .eq("id", versionId)
        .single();

    if (vError || !version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    // 2. Overwrite Head (Live Doc)
    const { error: updateError } = await supabase
        .from("committee_documents")
        .update({
            document_blob: version.document_blob,
            updated_at: new Date().toISOString()
        })
        .eq("committee_id", id);

    if (updateError) return NextResponse.json({ error: "Restore failed" }, { status: 500 });

    // 3. Log
    await logAction(auth.session.user.id, "restore_document_version", { committee_id: id, version_id: versionId }, request);

    // 4. Return success. Client must now trigger Hocuspocus refresh via WebSocket.
    return NextResponse.json({ success: true });
}

// Change Log:
// - New API route for restoring a previous document version.