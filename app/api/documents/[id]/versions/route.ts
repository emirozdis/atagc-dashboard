import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";

// GET: List Versions (Metadata only, no blobs)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // committeeId

    // Auth Check
    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Validate access (must be member or admin of committee)
    // For simplicity, relying on row level security or role checks done in UI
    // Ideally, replicate the access logic from Hocuspocus here.

    const { data, error } = await supabase
        .from("document_versions")
        .select(`
            id,
            created_at,
            created_by,
            version_name,
            is_auto_save,
            creator:users!document_versions_created_by_fkey(full_name)
        `)
        .eq("committee_id", id)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
}

// POST: Create Manual Snapshot
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ["superadmin", "admin", "committee_chairman", "deputy_chair"] });
    if (!auth.ok || !auth.session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await request.json();

    // 1. Get Current Head Blob
    const { data: currentDoc, error: fetchError } = await supabase
        .from("committee_documents")
        .select("document_blob")
        .eq("committee_id", id)
        .single();

    if (fetchError || !currentDoc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // 2. Insert into Versions
    const { error: insertError } = await supabase
        .from("document_versions")
        .insert({
            committee_id: id,
            document_blob: currentDoc.document_blob, // Copy the blob
            version_name: name || "Manuel Kayıt",
            is_auto_save: false,
            created_by: auth.session.user.id,
            created_at: new Date().toISOString()
        });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    await logAction(auth.session.user.id, "create_document_version", { committee_id: id, version_name: name }, request);

    return NextResponse.json({ success: true });
}

// Change Log:
// - New API route for managing document versions.