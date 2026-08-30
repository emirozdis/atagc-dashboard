import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { Logger } from "@/lib/logger";
import { apiHandler } from "@/lib/api-handler";
import { ROLES } from "@/lib/roles";
import { canAccessCommittee } from "@/lib/committee-access";

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

    if (!(await canAccessCommittee(auth.session.user.id, auth.session.user.role, id, true))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { versionId } = await request.json();

    const { data: version, error: vError } = await supabase
        .from("document_versions")
        .select("document_blob, version_name, committee_id")
        .eq("id", versionId)
        .single();

    if (vError || !version) return NextResponse.json({ error: "Version not found" }, { status: 404 });
    if (version.committee_id !== id) return NextResponse.json({ error: "Version does not belong to this committee" }, { status: 403 });

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
