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
import { applicationQuestionsSchema } from "@/lib/application-form-schema";
import { HttpError } from "@/lib/http-error";
import { fetchApplications } from "@/lib/applications-query";

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

// postgres reports unique-constraint violations with code 23505, but the
// submission rpc also surfaces rule failures as plain message text.
const DUPLICATE_APPLICATION_ERROR = /duplicate key|unique constraint|already exists|\b23505\b/i;
const INVALID_APPLICATION_ERROR = /already submitted|invitation is invalid|applications are closed/i;

// the rpc enforces the conference rules itself, so its error message is the
// only description the applicant gets. map it onto a real http error instead
// of letting an opaque database error surface as a 500.
function applicationSubmissionError(applicationError: { message: string; code?: string }) {
    const message = applicationError.message || "Unable to submit application.";
    const conflict = applicationError.code === "23505" || DUPLICATE_APPLICATION_ERROR.test(message);
    if (conflict && !INVALID_APPLICATION_ERROR.test(message)) {
        return new HttpError(409, "This application conflicts with an existing submission.");
    }
    return new HttpError(400, message);
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

    const parsedQuestions = applicationQuestionsSchema.safeParse(form.questions);
    if (!parsedQuestions.success) throw new Error("This application form is temporarily unavailable.");
    const questions = parsedQuestions.data;
    if (!questions.length || !questions.some((question) => question.type === "email")) throw new Error("This application form is missing an email field.");
    if (questions.filter((question) => question.type === "email").length !== 1) throw new Error("This application form must have exactly one email field.");
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
    const missing = questions.filter((question) => {
        const value = formData[question.id];
        return question.required && (value === undefined || value === null || value === false || (typeof value === "string" && value.trim() === ""));
    });
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

    // delegation applications are repeatable - a leader may lead several of
    // them - so only the single-application types are guarded here. the
    // existence check is a limited list query because maybeSingle() resolves
    // to null plus a "Multiple rows found" error once a user has more than
    // one application of the same type.
    if (applicationType !== "delegation") {
        const { data: duplicates, error: duplicateError } = await supabase
            .from("applications")
            .select("id")
            .eq("user_id", sessionUser.id)
            .eq("application_type", applicationType)
            .limit(1);
        if (!duplicateError && duplicates && duplicates.length > 0) {
            throw new HttpError(409, "You have already submitted this application type.");
        }
    }

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
    if (applicationError || !application) {
        // keep the raw database failure in the logs, but never let it reach the
        // applicant as an opaque 500.
        if (applicationError) {
            await Logger.error({ userId: sessionUser.id }, "RavenMUN application submission failed", new Error(applicationError.message));
            throw applicationSubmissionError(applicationError);
        }
        throw new HttpError(400, "Unable to submit application.");
    }

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
        await sendSystemNotification(sessionUser.id, "application_received", {
            applicationType,
            applicationId: typeof application.id === "string" ? application.id : undefined,
        });
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

    if (status === ApplicationStatusEnum.APPROVED || status === ApplicationStatusEnum.ACCEPTED) {
        const { data: memberships, error: membershipError } = await supabase
            .from("delegation_members")
            .select("delegation_id")
            .eq("user_id", currentApp.user_id);

        // a user may belong to several delegations, so the leader check below
        // has to run for each of them. maybeSingle() resolves to null plus a
        // "Multiple rows found" error once that becomes possible, which would
        // silently skip the check entirely.
        for (const membership of membershipError || !memberships ? [] : memberships) {
            const delegationId = membership.delegation_id || (membership as { delegation?: string | null }).delegation;
            if (!delegationId) continue;
            const { data: del } = await supabase.from("delegations").select("owner_id, application_id").eq("id", delegationId).single();
            if (!del) continue;
            // the delegation's own application_id identifies the leader's own
            // application. the newest-application fallback is only correct for
            // legacy rows that predate that link.
            const leaderApplicationQuery = supabase.from("applications").select("status");
            const { data: leaderApp } = del.application_id
                ? await leaderApplicationQuery.eq("id", del.application_id).maybeSingle()
                : await leaderApplicationQuery.eq("user_id", del.owner_id).eq("application_type", "delegation").order("submitted_at", { ascending: false }).limit(1).maybeSingle();
            if (!leaderApp || !["approved", "accepted"].includes(leaderApp.status)) {
                throw new Error("The leader of this user's delegation has not been approved yet. Members cannot be approved before the leader.");
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
        await sendSystemNotification(currentApp.user_id, "application_status", {
            applicationId: id,
            applicationType: currentApp.application_type,
            previousStatus: currentApp.status,
            status,
            reviewNotes: review_notes,
        });
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
