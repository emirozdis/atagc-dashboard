import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { 
    accountCreationSchema, 
    FullApplicationSubmission, 
    ApplicationStatusEnum 
} from "@/types/application";
import { PaymentStatusEnum } from "@/types/payment";
import { Logger } from "@/lib/logger";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { sendSystemNotification } from "@/lib/notification-service";
import { z } from "zod";
import { ROLES } from "@/lib/roles";
import { searchParamsSchema, updateApplicationSchema } from "@/lib/schemas";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

interface JoinedForm {
    title: string;
    slug: string;
    fee: number;
}

interface ApplicationData {
    status: string;
    user_id: string;
    review_notes?: string;
    payment_status?: string;
    form: JoinedForm | JoinedForm[] | null;
}

function unwrapRelation<T>(data: T | T[] | null): T | null {
    if (!data) return null;
    if (Array.isArray(data)) return data[0] || null;
    return data;
}

async function fetchApplications(params: z.infer<typeof searchParamsSchema>) {
    const { page, limit, search, status, sort_by, sort_order } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("applications")
        .select(`
            id,
            status,
            submitted_at,
            review_notes,
            form_data,
            form:application_forms!inner(title, slug, fee),
            user:users!inner (
                id,
                full_name,
                email,
                user_details (
                    id,
                    phone_number,
                    school_name,
                    profile_picture_url,
                    additional_info
                ),
                committee_members (
                    id,
                    committee:committees (
                        id,
                        name
                    )
                )
            )
        `, { count: "exact" });

    if (status !== "all") {
        if (status === 'unassigned') {
            query = query
                .eq('status', 'approved')
                .eq('form.slug', 'delegate')
                .is('user.committee_members.id', null);
        } else {
            query = query.eq("status", status);
        }
    }

    if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: 'user' });
    }

    if (sort_by === 'full_name') {
        query = query.order('full_name', { foreignTable: 'users', ascending: sort_order === 'asc' });
    } else {
        query = query.order(sort_by, { ascending: sort_order === 'asc' });
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    return {
        data,
        meta: {
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit),
        }
    };
}

async function processApplicationSubmission(
    body: FullApplicationSubmission, 
    ip: string,
    req: Request
) {
    await limiter.check(5, ip);

    const { data: settings } = await supabase.from("system_settings").select("applications_open").single();
    if (settings && settings.applications_open === false) {
        throw new Error("Başvurular şu anda kapalıdır.");
    }

    const accountData = accountCreationSchema.parse(body.account);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: verification } = await supabase
        .from("email_verifications")
        .select("id")
        .eq("email", accountData.email)
        .eq("verified", true)
        .gt("created_at", oneHourAgo)
        .limit(1)
        .maybeSingle();

    if (!verification) throw new Error("E-posta adresi doğrulanmamış veya doğrulama süresi dolmuş.");

    const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", accountData.email)
        .maybeSingle();

    let userId: string;

    if (existingUser) {
        userId = existingUser.id;
        const { data: existingApp } = await supabase
            .from("applications")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();
            
        if (existingApp) {
            throw new Error("Bu kullanıcı hesabıyla zaten bir başvuru yapılmış.");
        }
    } else {
        const randomHash = Math.random().toString(36).substring(2);
        const now = new Date().toISOString();
        
        const { data: newUser, error: createUserError } = await supabase
            .from("users")
            .insert({
                full_name: accountData.adSoyad,
                email: accountData.email,
                password_hash: randomHash,
                role: ROLES.APPLICANT,
                created_at: now,
                updated_at: now
            })
            .select("id")
            .single();

        if (createUserError || !newUser) throw new Error("Kullanıcı hesabı oluşturulamadı.");
        userId = newUser.id;
    }

    const { data: formTemplate } = await supabase
        .from("application_forms")
        .select("id, slug, steps")
        .eq("id", body.formId)
        .single();

    if (!formTemplate) throw new Error("Geçersiz başvuru formu şablonu.");

    const userDetailsUpdate: Record<string, any> = {};
    const additionalInfo: Record<string, any> = {};
    const cleanFormData = { ...body.formData };

    const steps = formTemplate.steps as Array<{ fields: Array<{ id: string; system_map?: string }> }>;
    
    if (Array.isArray(steps)) {
        steps.forEach(step => {
            step.fields.forEach(field => {
                const value = body.formData[field.id];
                if (value !== undefined && field.system_map) {
                    if (['phone_number', 'school_name', 'birth_date'].includes(field.system_map)) {
                        userDetailsUpdate[field.system_map] = value;
                    } else {
                        additionalInfo[field.system_map] = value;
                    }
                }
            });
        });
    }

    userDetailsUpdate.notification_preferences = {
        application: true, committee: true, social: true, system: true
    };
    userDetailsUpdate.additional_info = additionalInfo;

    const { data: existingDetails } = await supabase
        .from("user_details")
        .select("id, additional_info")
        .eq("user_id", userId)
        .maybeSingle();

    if (existingDetails) {
        userDetailsUpdate.additional_info = {
            ...(existingDetails.additional_info as object),
            ...additionalInfo,
            kvkk_approved: body.kvkkApproved
        };
        await supabase.from("user_details").update(userDetailsUpdate).eq("user_id", userId);
    } else {
        userDetailsUpdate.user_id = userId;
        userDetailsUpdate.additional_info.kvkk_approved = body.kvkkApproved;
        await supabase.from("user_details").insert(userDetailsUpdate);
    }

    const { data: newApp, error: appError } = await supabase
        .from("applications")
        .insert({
            user_id: userId,
            form_id: body.formId,
            form_data: cleanFormData,
            status: ApplicationStatusEnum.PENDING,
            payment_status: PaymentStatusEnum.UNPAID,
            submitted_at: new Date().toISOString()
        })
        .select("id")
        .single();

    if (appError) throw appError;

    await Logger.audit(
        { userId: userId, req: req },
        { 
            action: "submit_application", 
            category: "business",
            resourceType: "application",
            resourceId: newApp.id,
            metadata: { form_id: body.formId, role: formTemplate.slug }
        }
    );
    await sendSystemNotification(userId, "application_received");
}

async function updateApplicationStatus(
    input: z.infer<typeof updateApplicationSchema>, 
    adminId: string, 
    req: Request
) {
    const { id, status, review_notes } = input;

    // 1. Fetch current state
    const { data: currentAppData, error: fetchError } = await supabase
        .from("applications")
        .select("status, review_notes, payment_status, user_id, form:application_forms(slug, fee)")
        .eq("id", id)
        .single();

    if (fetchError || !currentAppData) throw new Error("Başvuru bulunamadı.");

    const currentApp = currentAppData as unknown as ApplicationData;
    const formObj = unwrapRelation(currentApp.form);

    const updatePayload: Record<string, any> = {
        status,
        review_notes,
        reviewed_at: new Date().toISOString(),
    };

    if (status === ApplicationStatusEnum.APPROVED) {
        const fee = Number(formObj?.fee || 0);
        if (fee === 0) {
            updatePayload.payment_status = PaymentStatusEnum.EXEMPT;
        }
    }

    const { error } = await supabase
        .from("applications")
        .update(updatePayload)
        .eq("id", id);

    if (error) throw error;

    // Update Role Logic
    if (status === ApplicationStatusEnum.APPROVED) {
        const targetSlug = formObj?.slug;
        if (targetSlug) {
            await supabase.from("users").update({ role: targetSlug }).eq("id", currentApp.user_id);
        }

        // Add user to catering_database when approved
        const { data: existingCatering } = await supabase
            .from("catering_logs")
            .select("user_id")
            .eq("user_id", currentApp.user_id)
            .maybeSingle();

        if (!existingCatering) {
            await supabase
                .from("catering_logs")
                .insert({
                    user_id: currentApp.user_id,
                    day1: false,
                    day2: false,
                    day3: false
                });
        }
    } else {
        await supabase.from("users").update({ role: ROLES.APPLICANT }).eq("id", currentApp.user_id);
    }

    // Construct precise objects for diffing
    const prevState = {
        status: currentApp.status,
        review_notes: currentApp.review_notes,
        payment_status: currentApp.payment_status
    };

    const nextState = {
        ...prevState,
        ...updatePayload
    };

    await Logger.audit(
        { userId: adminId, req: req },
        { 
            action: "update_application_status", 
            category: "business",
            resourceType: "application",
            resourceId: id,
            prevState: prevState,
            nextState: nextState,
            metadata: { user_id: currentApp.user_id }
        }
    );

    if (currentApp.status !== status) {
        await sendSystemNotification(currentApp.user_id, "application_status");
    }
}

export const GET = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ROLES.SUPERADMIN });
    if (!auth.ok) throw new Error("Unauthorized");

    const { searchParams } = new URL(request.url);
    const params = searchParamsSchema.parse(Object.fromEntries(searchParams));

    return NextResponse.json(await fetchApplications(params));
});

export const POST = apiHandler(async (request: Request) => {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const body = await request.json();

    await processApplicationSubmission(body, ip, request);

    return NextResponse.json({ success: true, message: "Başvuru başarıyla alındı." });
});

export const PUT = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: ROLES.SUPERADMIN });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");

    const body = await request.json();
    const validData = updateApplicationSchema.parse(body);

    await updateApplicationStatus(validData, auth.session.user.id, request);

    return NextResponse.json({ success: true, message: "Başvuru güncellendi." });
});