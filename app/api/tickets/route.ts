import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { createTicketSchema } from "@/lib/schemas";
import { Logger } from "@/lib/logger";
import { MANAGEMENT_ROLES } from "@/lib/roles";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const session = auth.session;

    const { searchParams } = new URL(request.url);
    
    const trackId = searchParams.get("trackId");
    const trackToken = searchParams.get("trackToken");

    if (trackId && trackToken) {
        const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
        await limiter.check(10, ip);

        const { data, error } = await supabase
            .from("tickets")
            .select("*, messages:ticket_messages(*)")
            .eq("id", trackId)
            .eq("access_token", trackToken)
            .single();

        if (error || !data) return NextResponse.json({ error: "Ticket not found or invalid token" }, { status: 404 });
        
        const isStaff = MANAGEMENT_ROLES.includes(session.user.role as any);
        
        if (data.is_anonymous && !isStaff) {
            delete (data as any).user_id;
        }
        
        return NextResponse.json(data);
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "all";
    const search = searchParams.get("search") || "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("tickets")
        .select(`
            *,
            user:users(full_name, email)
        `, { count: 'exact' });

    const isStaff = MANAGEMENT_ROLES.includes(session.user.role as any);
    if (!isStaff) {
        query = query.eq("user_id", session.user.id);
    }

    if (status !== "all") query = query.eq("status", status);
    if (category !== "all") query = query.eq("category", category);

    if (search) {
        query = query.or(`subject.ilike.%${search}%,user.full_name.ilike.%${search}%,user.email.ilike.%${search}%`, { foreignTable: 'user' });
    }

    const { data, error, count } = await query
        .order("updated_at", { ascending: false })
        .range(from, to);

    if (error) throw error;

    return NextResponse.json({
        data,
        meta: {
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit),
        }
    });
});

export const POST = apiHandler(async (request: Request) => {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    await limiter.check(5, ip);

    const auth = await getAuthorization({ requireAuth: true });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");
    const session = auth.session;

    const formData = await request.formData();
    const rawBody: any = {};
    const files: File[] = [];

    formData.forEach((value, key) => {
        if (value instanceof File) {
            files.push(value);
        } else {
            rawBody[key] = value;
        }
    });

    const validData = createTicketSchema.parse(rawBody);

    const dbUserId = validData.is_anonymous ? null : session.user.id;

    const attachmentPaths: string[] = [];
    if (files.length > 0) {
        if (files.length > 3) throw new Error("Maksimum 3 dosya yükleyebilirsiniz.");

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} boyutu çok büyük (Max 5MB).`);
            if (!ALLOWED_TYPES.includes(file.type)) throw new Error(`${file.name} formatı desteklenmiyor.`);

            const ext = file.name.split('.').pop();
            const fileName = `tickets/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const arrayBuffer = await file.arrayBuffer();
            
            const { error: uploadError } = await supabase.storage
                .from("ticket-attachments")
                .upload(fileName, Buffer.from(arrayBuffer), { contentType: file.type });

            if (uploadError) throw new Error("Dosya yüklenemedi.");
            attachmentPaths.push(fileName);
        }
    }

    const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
            user_id: dbUserId,
            is_anonymous: !!validData.is_anonymous,
            category: validData.category,
            subject: validData.subject,
            status: 'submitted',
        })
        .select("id, access_token")
        .single();

    if (ticketError) throw ticketError;

    const { error: msgError } = await supabase
        .from("ticket_messages")
        .insert({
            ticket_id: ticket.id,
            sender_id: dbUserId,
            message: validData.message,
            attachments: attachmentPaths.length > 0 ? attachmentPaths : null,
            is_staff_reply: false
        });

    if (msgError) {
        await supabase.from("tickets").delete().eq("id", ticket.id);
        throw msgError;
    }

    await Logger.audit(
        { userId: session.user.id, req: request },
        {
            action: "submit_ticket",
            category: "business",
            resourceType: "ticket",
            resourceId: ticket.id,
            metadata: { 
                category: validData.category, 
                is_anonymous: validData.is_anonymous,
                stored_as: dbUserId ? "known_user" : "anonymous_entry"
            }
        }
    );

    return NextResponse.json({
        success: true,
        ticketId: ticket.id,
        accessToken: ticket.access_token
    });
});