import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { logAction } from "@/lib/logger";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const GET = apiHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;

    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");

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

    if (error) throw error;

    return NextResponse.json(data);
});

export const POST = apiHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR] 
    });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");

    const { name } = await request.json();

    const { data: currentDoc, error: fetchError } = await supabase
        .from("committee_documents")
        .select("document_blob")
        .eq("committee_id", id)
        .single();

    if (fetchError || !currentDoc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const { error: insertError } = await supabase
        .from("document_versions")
        .insert({
            committee_id: id,
            document_blob: currentDoc.document_blob,
            version_name: name || "Manuel Kayıt",
            is_auto_save: false,
            created_by: auth.session.user.id,
            created_at: new Date().toISOString()
        });

    if (insertError) throw insertError;

    await logAction(auth.session.user.id, "create_document_version", { committee_id: id, version_name: name }, request);

    return NextResponse.json({ success: true });
});

// Change Log:
// - Wrapped with `apiHandler`.
// - Replaced hardcoded strings with `ROLES` constants.