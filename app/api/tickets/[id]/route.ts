import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { replyTicketSchema, updateTicketStatusSchema } from "@/lib/schemas";
import { MANAGEMENT_ROLES } from "@/lib/roles";
import { getSignedUrls } from "@/lib/storage-utils";
import { Logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const GET = apiHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    await limiter.check(30, ip);

    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const session = auth.session;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get("token");

    const { data: ticket, error } = await supabase
        .from("tickets")
        .select(`
            *,
            user:users(full_name, email, role),
            messages:ticket_messages(
                *,
                sender:users(full_name, role)
            )
        `)
        .eq("id", id)
        .order("created_at", { foreignTable: "ticket_messages", ascending: true })
        .single();

    if (error || !ticket) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Access Control
    const isStaff = MANAGEMENT_ROLES.includes(session.user.role as any);
    const isOwner = ticket.user_id !== null && session.user.id === ticket.user_id;
    const hasValidTrackingToken = accessToken && accessToken === ticket.access_token;

    if (!isStaff && !isOwner && !hasValidTrackingToken) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Attachment Signing
    const allAttachments: string[] = [];
    ticket.messages?.forEach((msg: any) => {
        if (msg.attachments && Array.isArray(msg.attachments)) {
            allAttachments.push(...msg.attachments);
        }
    });

    if (allAttachments.length > 0) {
        const signedData = await getSignedUrls("ticket-attachments", allAttachments);
        const urlMap = new Map(signedData?.map(s => [s.path, s.signedUrl]));
        ticket.messages.forEach((msg: any) => {
            if (msg.attachments) {
                msg.attachments = msg.attachments.map((path: string) => urlMap.get(path) || path);
            }
        });
    }

    if (!isStaff && ticket.is_anonymous) {
        delete (ticket as any).user;
        delete (ticket as any).user_id;
    }

    return NextResponse.json(ticket);
});

export const POST = apiHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    await limiter.check(10, ip);

    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const session = auth.session;

    const { id } = await params;
    const formData = await request.formData();

    const rawBody: any = {};
    const files: File[] = [];
    formData.forEach((value, key) => {
        if (value instanceof File) files.push(value);
        else rawBody[key] = value;
    });

    const { message, accessToken } = replyTicketSchema.parse({ ...rawBody, ticketId: id });

    if (!message?.trim() && files.length === 0) throw new Error("Lütfen bir mesaj yazın veya en az bir dosya ekleyin.");

    const { data: ticket } = await supabase.from("tickets").select("status, user_id, access_token, is_anonymous").eq("id", id).single();
    if (!ticket) throw new Error("Talep bulunamadı.");
    if (ticket.status === 'closed') throw new Error("Bu talep kapatılmıştır. Yeni yanıt eklenemez.");

    // Permissions
    const isStaff = MANAGEMENT_ROLES.includes(session.user.role as any);
    const isOwner = ticket.user_id !== null && session.user.id === ticket.user_id;
    const hasValidTrackingToken = accessToken === ticket.access_token;

    if (!isStaff && !isOwner && !hasValidTrackingToken) {
        throw new Error("Forbidden");
    }

    const senderId = (ticket.is_anonymous && !isStaff) ? null : session.user.id;

    // File Validation & Uploads
    const attachmentPaths: string[] = [];
    if (files.length > 0) {
        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                throw new Error(`Dosya boyutu çok büyük: ${file.name} (Max 20MB)`);
            }
            if (!ALLOWED_TYPES.includes(file.type)) {
                throw new Error(`Desteklenmeyen dosya formatı: ${file.name}. Lütfen JPEG, PNG, WEBP veya PDF yükleyiniz.`);
            }
        }

        for (const file of files) {
            const ext = file.name.split('.').pop();
            const fileName = `replies/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const arrayBuffer = await file.arrayBuffer();
            
            const { error: uploadError } = await supabase.storage
                .from("ticket-attachments")
                .upload(fileName, Buffer.from(arrayBuffer), { 
                    contentType: file.type,
                    upsert: false 
                });

            if (uploadError) throw new Error("Dosya yükleme hatası: " + uploadError.message);
            attachmentPaths.push(fileName);
        }
    }

    // Insert Message
    const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: id,
        sender_id: senderId,
        message,
        attachments: attachmentPaths.length > 0 ? attachmentPaths : null,
        is_staff_reply: isStaff
    });
    if (error) throw error;

    // Update Status
    let newStatus = ticket.status;
    if (isStaff && (ticket.status === 'submitted' || ticket.status === 'reviewing')) {
        newStatus = 'answered';
    } else if (!isStaff && ticket.status === 'answered') {
        newStatus = 'reviewing';
    }

    await supabase.from("tickets").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);

    return NextResponse.json({ success: true });
});

export const PUT = apiHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json();
    const { status } = updateTicketStatusSchema.parse({ ...body, ticketId: id });

    const auth = await getAuthorization({
        requireAuth: true,
        allowedRoles: MANAGEMENT_ROLES
    });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");

    const { data: ticket } = await supabase.from("tickets").select("status").eq("id", id).single();
    if (ticket?.status === 'closed') {
        throw new Error("Kapatılan talepler tekrar açılamaz.");
    }

    const { error } = await supabase
        .from("tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) throw error;

    await Logger.audit(
        { userId: auth.session.user.id, req: request },
        {
            action: "update_ticket_status",
            category: "business",
            resourceId: id,
            metadata: { old_status: ticket?.status, new_status: status }
        }
    );

    return NextResponse.json({ success: true });
});