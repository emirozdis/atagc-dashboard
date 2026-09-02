import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import {
    ApplicationStatusEnum,
} from "@/types/application";
import { PaymentStatusEnum } from "@/types/payment";
import { Logger } from "@/lib/logger";
import { apiHandler } from "@/lib/api-handler";
import { sendSystemNotification } from "@/lib/notification-service";
import { z } from "zod";
import { PUBLIC_APPLICATION_TYPES, ROLES } from "@/lib/roles";
import { searchParamsSchema, updateApplicationSchema } from "@/lib/schemas";
import { hashOpaqueToken } from "@/lib/passwordless";
import { essayWordCountError } from "@/lib/application-essays";

interface JoinedForm {
    title: string;
    slug: string;
    fee: number;
}

interface ApplicationData {
    status: string;
    user_id: string;
    application_type?: string;
    form_snapshot?: Record<string, unknown>;
    review_notes?: string;
    payment_status?: string;
    form: JoinedForm | JoinedForm[] | null;
}

const ravenApplicationSchema = z.object({
    applicationType: z.enum(["delegate", "chairboard", "delegation", "press", "observer"]),
    formData: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length <= 100, "Too many application fields.").refine((value) => JSON.stringify(value).length <= 100_000, "Application data is too large."),
    delegationInviteToken: z.string().min(16).max(200).optional(),
    delegationMagiclinkId: z.string().uuid().optional(),
});

function unwrapRelation<T>(data: T | T[] | null): T | null {
    if (!data) return null;
    if (Array.isArray(data)) return data[0] || null;
    return data;
}

async function fetchApplications(params: z.infer<typeof searchParamsSchema>) {
    const { page, limit, search, status, sort_by, sort_order } = params;

    let query = supabase
        .from("applications")
        .select(`
            id,
            user_id,
            form_id,
            application_type,
            form_version,
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
                    high_school_id,
                    city,
                    grade,
                    profile_picture_url,
                    additional_info,
                    high_schools(school_name)
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
            // Joined-field filters are applied after the Prisma compatibility
            // layer hydrates the applicant relation below.
            query = query.eq('status', 'approved');
        } else {
            query = query.eq("status", status);
        }
    }

    if (search) {
        const { data: matchingUsers, error: userSearchError } = await supabase
            .from("users")
            .select("id")
            .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
        if (userSearchError) throw new Error(userSearchError.message);
        const matchingUserIds = (matchingUsers || []).map((user) => user.id);
        if (matchingUserIds.length === 0) {
            return {
                data: [],
                meta: { total: 0, page, limit, totalPages: 0 },
            };
        }
        query = query.in("user_id", matchingUserIds);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    const asRecord = (value: unknown): Record<string, unknown> | null => (
        value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
    );
    const firstRecord = (value: unknown): Record<string, unknown> | null => {
        if (Array.isArray(value)) return asRecord(value[0]);
        return asRecord(value);
    };
    const getApplicant = (application: unknown) => firstRecord(asRecord(application)?.user);
    const getSchoolName = (application: unknown) => {
        const user = getApplicant(application);
        const details = firstRecord(user?.user_details);
        const highSchool = firstRecord(details?.high_schools);
        const school = typeof highSchool?.school_name === "string" ? highSchool.school_name : "";
        if (school) return school;
        const additional = asRecord(details?.additional_info);
        return typeof additional?.manual_school_name === "string" ? additional.manual_school_name : "";
    };

    let rows = (data || []) as unknown as Array<Record<string, unknown>>;
    const missingUserIds = rows
        .filter((application) => !getApplicant(application) && typeof application.user_id === "string")
        .map((application) => String(application.user_id));
    if (missingUserIds.length > 0) {
        const { data: fallbackUsers, error: fallbackUserError } = await supabase
            .from("users")
            .select(`
                id,
                full_name,
                email,
                user_details (
                    id,
                    phone_number,
                    high_school_id,
                    city,
                    grade,
                    profile_picture_url,
                    additional_info,
                    high_schools(school_name)
                ),
                committee_members (
                    id,
                    committee:committees (id, name)
                )
            `)
            .in("id", [...new Set(missingUserIds)]);
        if (fallbackUserError) throw new Error(fallbackUserError.message);
        const usersById = new Map((fallbackUsers || []).map((user) => [String(user.id), user]));
        rows = rows.map((application) => (
            getApplicant(application) || !usersById.has(String(application.user_id))
                ? application
                : { ...application, user: usersById.get(String(application.user_id)) }
        ));
    }
    if (status === "unassigned") {
        rows = rows.filter((application) => {
            const form = firstRecord(application.form);
            const user = getApplicant(application);
            const committeeMembers = user?.committee_members;
            return form?.slug === "delegate" && (!Array.isArray(committeeMembers) || committeeMembers.length === 0);
        });
    }

    rows.sort((left, right) => {
        const leftUser = getApplicant(left);
        const rightUser = getApplicant(right);
        const leftValue = sort_by === "full_name"
            ? String(leftUser?.full_name || "")
            : sort_by === "school_name"
                ? getSchoolName(left)
                : String(left[sort_by] || "");
        const rightValue = sort_by === "full_name"
            ? String(rightUser?.full_name || "")
            : sort_by === "school_name"
                ? getSchoolName(right)
                : String(right[sort_by] || "");
        const comparison = leftValue.localeCompare(rightValue, "en", { sensitivity: "base", numeric: true });
        return sort_order === "asc" ? comparison : -comparison;
    });

    const from = (page - 1) * limit;
    const paginatedRows = rows.slice(from, from + limit);
    const total = status === "unassigned" ? rows.length : count || rows.length;

    return {
        data: paginatedRows,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }
    };
}

async function processRavenApplicationSubmission(
    input: z.infer<typeof ravenApplicationSchema>,
    sessionUser: { id: string; email?: string | null },
) {
    const applicationType = input.applicationType;
    if (!PUBLIC_APPLICATION_TYPES.includes(applicationType)) {
        throw new Error("Invalid application type.");
    }

    const formData = input.formData;

    const { data: settings } = await supabase.from("ravenmun_settings").select("applications_open").eq("id", true).maybeSingle();
    if (settings?.applications_open === false) throw new Error("Applications are currently closed.");

    const { data: form, error: formError } = await supabase
        .from("application_forms")
        .select("id, application_type, title, description, fee, questions, version, is_active")
        .eq("application_type", applicationType)
        .eq("is_active", true)
        .maybeSingle();
    if (formError || !form) throw new Error("This application is not currently available.");

    const questions = Array.isArray(form.questions) ? form.questions as Array<{ id: string; label: string; type?: string; required?: boolean; minWords?: number; options?: Array<{ value: string }> }> : [];
    if (!questions.length || !questions.some((question) => question.type === "email")) throw new Error("This application form is missing an email field.");
    const sessionEmail = sessionUser.email?.trim().toLowerCase();
    const formEmailField = questions.find((question) => question.type === "email")?.id;
    const submittedEmailValue = formData[formEmailField || "email"];
    const submittedEmail = typeof submittedEmailValue === "string" ? submittedEmailValue.trim().toLowerCase() : "";
    if (!sessionEmail || !submittedEmail || sessionEmail !== submittedEmail) {
        throw new Error("The verified email must match the application email.");
    }
    const questionIds = new Set(questions.map((question) => question.id));
    const unknownFields = Object.keys(formData).filter((fieldId) => !questionIds.has(fieldId));
    if (unknownFields.length) throw new Error("The application contains unsupported fields.");
    const missing = questions.filter((question) => question.required && (formData[question.id] === undefined || formData[question.id] === null || formData[question.id] === "" || formData[question.id] === false));
    if (missing.length) throw new Error(`Please complete: ${missing.map((question) => question.label).join(", ")}`);
    for (const question of questions) {
        const value = formData[question.id];
        if (value === undefined || value === null || value === "") continue;
        const type = question.type || "text";
        if (["text", "email", "tel", "date", "url", "textarea", "select"].includes(type) && typeof value !== "string") throw new Error(`${question.label} must be text.`);
        if (type === "checkbox" && typeof value !== "boolean") throw new Error(`${question.label} must be checked or unchecked.`);
        if (type === "number" && !["number", "string"].includes(typeof value)) throw new Error(`${question.label} must be a number.`);
        const stringValue = typeof value === "string" ? value.trim() : String(value);
        if (["text", "email", "tel", "date", "url"].includes(question.type || "") && stringValue.length > 500) throw new Error(`${question.label} is too long.`);
        if (["textarea"].includes(question.type || "") && stringValue.length > 20000) throw new Error(`${question.label} is too long.`);
        const essayError = essayWordCountError(question, stringValue);
        if (essayError) throw new Error(essayError);
        if (question.type === "email" && !/^\S+@\S+\.\S+$/.test(stringValue)) throw new Error(`${question.label} must be a valid email address.`);
        if (question.type === "date" && Number.isNaN(Date.parse(stringValue))) throw new Error(`${question.label} must be a valid date.`);
        if (question.type === "url") { try { new URL(stringValue); } catch { throw new Error(`${question.label} must be a valid URL.`); } }
        if (question.type === "number" && !Number.isFinite(Number(value))) throw new Error(`${question.label} must be a number.`);
        if (question.type === "select" && question.options?.length && !question.options.some((option) => option.value === stringValue)) throw new Error(`${question.label} contains an invalid selection.`);
    }

    const { data: duplicate } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", sessionUser.id)
        .eq("application_type", applicationType)
        .maybeSingle();
    if (duplicate) throw new Error("You have already submitted this application type.");

    const now = new Date().toISOString();
    let invite: { id: string; delegation_id: string; email: string | null } | null = null;
    let legacyMagiclink: { id: string; delegation: string; sent_to: string; is_used: boolean } | null = null;
    if (input.delegationInviteToken && input.delegationMagiclinkId) {
        throw new Error("Only one delegation invitation can be used.");
    }
    if (input.delegationInviteToken) {
        if (applicationType !== "delegate") throw new Error("Delegation invitations are only valid for delegate applications.");
        const { data: inviteData } = await supabase
            .from("delegation_invites")
            .select("id, delegation_id, email, expires_at, used_at")
            .eq("token_hash", hashOpaqueToken(input.delegationInviteToken))
            .is("used_at", null)
            .gt("expires_at", now)
            .maybeSingle();
        if (!inviteData || inviteData.email?.toLowerCase() !== sessionEmail) throw new Error("This delegation invitation is invalid or belongs to another email.");
        invite = inviteData;
    }
    if (input.delegationMagiclinkId) {
        if (applicationType !== "delegate") throw new Error("Delegation invitations are only valid for delegate applications.");
        const { data: magiclink } = await supabase.from("delegation_magiclinks").select("id, delegation, sent_to, is_used").eq("id", input.delegationMagiclinkId).maybeSingle();
        if (!magiclink || magiclink.is_used || magiclink.sent_to.toLowerCase() !== sessionEmail) throw new Error("This delegation invitation is invalid or belongs to another email.");
        legacyMagiclink = magiclink;
    }

    // Some existing databases still have the first RavenMUN RPC version,
    // which writes omitted profile fields as NULL. Snapshot the profile before
    // submission so a chair/press form cannot erase data from an earlier form.
    const { data: existingDetails, error: existingDetailsError } = await supabase
        .from("user_details")
        .select("phone_number, school, city, grade, additional_info")
        .eq("user_id", sessionUser.id)
        .maybeSingle();
    if (existingDetailsError) throw new Error("Unable to load your profile.");

    const { data: application, error: applicationError } = await supabase.rpc("submit_ravenmun_application", {
        p_user_id: sessionUser.id,
        p_email: sessionEmail,
        p_application_type: applicationType,
        p_form_id: form.id,
        p_form_version: form.version,
        p_form_snapshot: { title: form.title, description: form.description, fee: form.fee, questions, version: form.version },
        p_form_data: formData,
        p_delegation_id: invite?.delegation_id || legacyMagiclink?.delegation || null,
        p_invite_id: invite?.id || null,
        p_magiclink_id: legacyMagiclink?.id || null,
        p_delegation_name: typeof formData.delegationName === "string" ? formData.delegationName : null,
    });
    if (applicationError || !application) throw applicationError || new Error("Unable to submit application.");

    if (existingDetails) {
        const submittedValue = (keys: string[]) => {
            for (const key of keys) {
                const value = formData[key];
                if (typeof value === "string" && value.trim()) return value.trim();
            }
            return null;
        };
        const existingAdditionalInfo = existingDetails.additional_info && typeof existingDetails.additional_info === "object" && !Array.isArray(existingDetails.additional_info)
            ? existingDetails.additional_info as Record<string, unknown>
            : {};
        const { error: profilePreservationError } = await supabase
            .from("user_details")
            .update({
                phone_number: submittedValue(["phone", "phoneNumber", "phone_number"]) || existingDetails.phone_number,
                school: submittedValue(["school", "schoolName", "school_name", "schoolOrOrganization", "manual_school_name"]) || existingDetails.school,
                city: submittedValue(["city", "cityName", "city_name"]) || existingDetails.city,
                grade: submittedValue(["grade", "gradeOrYear", "grade_or_year", "year", "schoolYear", "school_year"]) || existingDetails.grade,
                additional_info: { ...existingAdditionalInfo, ...formData },
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", sessionUser.id);
        if (profilePreservationError) throw new Error("Application submitted, but your profile could not be updated.");
    }

    try {
        await sendSystemNotification(sessionUser.id, "application_received");
    } catch (notificationError) {
        console.error("Application notification failed:", notificationError);
    }

    return application;
}

async function updateApplicationStatus(
    input: z.infer<typeof updateApplicationSchema>,
    adminId: string,
    req: Request
) {
    const { id, status, review_notes } = input;

    const { data: currentAppData, error: fetchError } = await supabase
        .from("applications")
        .select("status, review_notes, payment_status, user_id, application_type, form_snapshot, form:application_forms(slug, fee)")
        .eq("id", id)
        .single();

    if (fetchError || !currentAppData) throw new Error("Application not found.");

    const currentApp = currentAppData as unknown as ApplicationData;
    const formObj = unwrapRelation(currentApp.form);

    if ((status === ApplicationStatusEnum.APPROVED || status === ApplicationStatusEnum.ACCEPTED) && !currentApp.form_snapshot?.title) {
        const { data: member } = await supabase
            .from("delegation_members")
            .select("delegation")
            .eq("user_id", currentApp.user_id)
            .maybeSingle();

        if (member) {
            const { data: del } = await supabase.from("delegations").select("created_by").eq("id", member.delegation).single();
            if (del) {
                const { data: leaderApp } = await supabase.from("applications").select("status").eq("user_id", del.created_by).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
                if (leaderApp?.status !== 'approved') {
                    throw new Error("The leader of this user's delegation has not been approved yet. Members cannot be approved before the leader.");
                }
            }
        }
    }

    const updatePayload: {
        status: ApplicationStatusEnum;
        review_notes?: string;
        reviewed_at: string;
        payment_status?: PaymentStatusEnum;
    } = {
        status: status as ApplicationStatusEnum,
        review_notes,
        reviewed_at: new Date().toISOString(),
    };

    if (status === ApplicationStatusEnum.APPROVED || status === ApplicationStatusEnum.ACCEPTED) {
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

    if (status === ApplicationStatusEnum.APPROVED || status === ApplicationStatusEnum.ACCEPTED) {
        // RavenMUN acceptance is intentionally separate from conference role
        // assignment. Legacy applications retain their compatibility
        // behavior until the old review screens are retired.
        const targetSlug = formObj?.slug;
        if (targetSlug && !currentApp.form_snapshot?.title) {
            await supabase.from("users").update({ role: targetSlug }).eq("id", currentApp.user_id);
        }

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
    } else if (!currentApp.form_snapshot?.title) {
        await supabase.from("users").update({ role: ROLES.APPLICANT }).eq("id", currentApp.user_id);
    }

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
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
    if (!auth.ok) throw new Error("Unauthorized");

    const { searchParams } = new URL(request.url);
    const params = searchParamsSchema.parse(Object.fromEntries(searchParams));

    return NextResponse.json(await fetchApplications(params));
});

export const POST = apiHandler(async (request: Request) => {
    const body = await request.json();

    if (body && typeof body.applicationType === "string" && body.formData && typeof body.formData === "object") {
        const auth = await getAuthorization({ requireAuth: true });
        if (!auth.ok || !auth.session) throw new Error("Unauthorized");
        const input = ravenApplicationSchema.parse(body);
        const application = await processRavenApplicationSubmission(input, auth.session.user);
        return NextResponse.json({ success: true, application });
    }

    return NextResponse.json(
        { error: "The legacy application flow has been retired. Use the passwordless RavenMUN application form." },
        { status: 410 },
    );

});

export const PUT = apiHandler(async (request: Request) => {
    const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.SUPERADMIN, ROLES.ADMIN] });
    if (!auth.ok || !auth.session) throw new Error("Unauthorized");

    const body = await request.json();
    const validData = updateApplicationSchema.parse(body);

    await updateApplicationStatus(validData, auth.session.user.id, request);

    return NextResponse.json({ success: true, message: "Application updated." });
});
