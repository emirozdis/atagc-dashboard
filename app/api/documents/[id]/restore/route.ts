import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { Logger } from "@/lib/logger";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";

export const POST = apiHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;
    const auth = await getAuthorization({ 
        requireAuth: true, 
        allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN] 
    });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");

    const { versionId } = await request.json();

    const { data: version, error: vError } = await supabase
        .from("document_versions")
        .select("document_blob, version_name")
        .eq("id", versionId)
        .single();

    if (vError || !version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    const { error: updateError } = await supabase
        .from("committee_documents")
        .update({
            document_blob: version.document_blob,
            updated_at: new Date().toISOString()
        })
        .eq("committee_id", id);

    if (updateError) throw updateError;

    await Logger.audit(
        { userId: auth.session.user.id, req: request },
        { 
            action: "restore_document_version", 
            category: "system",
            resourceType: "committee_document",
            resourceId: id,
            metadata: { version_id: versionId, version_name: version.version_name } 
        }
    );

    return NextResponse.json({ success: true });
});