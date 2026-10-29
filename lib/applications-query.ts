import { supabase } from "@/lib/SERVER_supabase";
import { z } from "zod";
import { searchParamsSchema } from "@/lib/schemas";

export async function fetchApplications(params: z.infer<typeof searchParamsSchema>) {
    const { page, limit, search, status, role, sort_by, sort_order } = params;

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
                    school,
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

    if (role !== "all") query = query.eq("application_type", role);

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
        const formData = asRecord(asRecord(application)?.form_data);
        for (const key of ["school", "schoolName", "school_name", "schoolOrOrganization", "school_or_organization", "manual_school_name"]) {
            const value = formData?.[key];
            if (typeof value === "string" && value.trim()) return value.trim();
        }
        const user = getApplicant(application);
        const details = firstRecord(user?.user_details);
        const highSchool = firstRecord(details?.high_schools);
        const school = typeof highSchool?.school_name === "string" ? highSchool.school_name : "";
        if (school) return school;
        if (typeof details?.school === "string" && details.school.trim()) return details.school.trim();
        const additional = asRecord(details?.additional_info);
        if (typeof additional?.manual_school_name === "string" && additional.manual_school_name.trim()) return additional.manual_school_name.trim();
        return "";
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
                    school,
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
    if (search.trim()) {
        const normalizedSearch = search.trim().toLocaleLowerCase("en");
        rows = rows.filter((application) => {
            const user = getApplicant(application);
            return [user?.full_name, user?.email, getSchoolName(application)]
                .some((value) => typeof value === "string" && value.toLocaleLowerCase("en").includes(normalizedSearch));
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
    const total = search.trim() || status === "unassigned" ? rows.length : count || rows.length;

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

