import { NextResponse } from "next/server";
import getAuthorization from "@/lib/getAuthorization";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api-handler";
import { deleteFile, getSignedUrl } from "@/lib/storage-utils";
import { updateProfileSchema } from "@/lib/schemas";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

type Relation<T> = T | T[] | null | undefined;
type ParticipantDetails = { profile_picture_url?: string | null; is_profile_picture_hidden?: boolean; [key: string]: unknown };
type ParticipantForm = { id?: string; slug?: string; title?: string; fee?: number; questions?: unknown[] };
type ParticipantApplication = { id?: string; application_type?: string; status?: string; payment_status?: string; submitted_at?: string; form_data?: Record<string, unknown>; form_snapshot?: Record<string, unknown>; form?: Relation<ParticipantForm> };
type ParticipantCommittee = { id?: string; name?: string; description?: string; slug?: string; admin_id?: string; topic?: Relation<unknown>; admin?: Relation<ParticipantAdmin> };
type ParticipantAdmin = { full_name?: string; user_details?: Relation<ParticipantDetails>; profile_picture_url?: string | null };
type ParticipantMember = { committee?: Relation<ParticipantCommittee>; can_write?: boolean };
type ParticipantDelegation = { id: string; name: string; leader?: Relation<{ full_name?: string }> };
type ParticipantUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at?: string;
  is_suspended?: boolean;
  user_details?: Relation<ParticipantDetails>;
  application?: Relation<ParticipantApplication>;
  committee_members?: ParticipantMember[];
  managed_committees?: ParticipantCommittee[];
  delegation_members?: { delegation?: Relation<ParticipantDelegation>; accepted?: boolean } | null;
  user_warnings?: Array<{ id: string; reason: string; category: string; created_at: string }>;
  [key: string]: unknown;
};

function firstRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function firstApplicationValue(applications: unknown[], keys: string[]) {
  for (const application of applications) {
    if (!application || typeof application !== "object") continue;
    const formData = (application as { form_data?: unknown }).form_data;
    if (!formData || typeof formData !== "object" || Array.isArray(formData)) continue;
    for (const key of keys) {
      const value = (formData as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return "";
}

export const GET = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(60, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error(auth.message || 'Unauthorized');

  const session = auth.session;
  const userId = session.user.id;

  const [{ data: directUser, error: directUserError }, { data: directDetails }, { data: directApplication }, { data: profileApplications }, { data: assignment }, { data: managedCommittees }, { data: delegationMember }, { data: warnings }] = await Promise.all([
      supabase.from("users").select("id, full_name, email, role, created_at, is_suspended").eq("id", userId).maybeSingle(),
      supabase.from("user_details").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("applications").select("id, application_type, status, payment_status, submitted_at, form_data, form_snapshot, form:application_forms(id, slug, title, fee, questions)").eq("user_id", userId).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("applications").select("form_data, submitted_at").eq("user_id", userId).order("submitted_at", { ascending: false }),
      supabase.from("conference_assignments").select("role, committee_id, committee:committees(id, name, description, slug, admin_id)").eq("user_id", userId).maybeSingle(),
      supabase.from("committees").select("id, name, description, slug, admin_id").eq("admin_id", userId),
      supabase.from("delegation_members").select("delegation_id, accepted").eq("user_id", userId).maybeSingle(),
      supabase.from("user_warnings").select("id, reason, category, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);
  if (directUserError || !directUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const participantUser = directUser as unknown as ParticipantUser;
  let delegationRecord: ParticipantDelegation | null = null;
    if (delegationMember?.delegation_id) {
      const { data: delegation } = await supabase.from("delegations").select("id, name, owner_id").eq("id", delegationMember.delegation_id).maybeSingle();
      if (delegation) {
        const { data: owner } = await supabase.from("users").select("full_name").eq("id", delegation.owner_id).maybeSingle();
        delegationRecord = { id: delegation.id, name: delegation.name, leader: owner };
      }
    }
  const user: ParticipantUser = {
    ...participantUser,
    user_details: directDetails as unknown as ParticipantDetails | null,
    application: directApplication as unknown as ParticipantApplication | null,
    committee_members: assignment?.committee_id ? [{ committee: assignment.committee as unknown as ParticipantCommittee, can_write: assignment.role === "committee_chairman" || assignment.role === "chair" }] : [],
    managed_committees: (managedCommittees || []) as unknown as ParticipantCommittee[],
    delegation_members: delegationRecord ? { delegation: delegationRecord, accepted: delegationMember?.accepted } : null,
    user_warnings: (warnings || []) as unknown as ParticipantUser["user_warnings"],
  };

  let details = firstRelation(user.user_details);
  const application = firstRelation(user.application);

  // Application types do not all ask the same questions. Keep profile fields
  // from an earlier application when the most recent form omitted them.
  if (details) {
    const historicalApplications = (profileApplications || []) as unknown[];
    const inheritedValues = {
      phone_number: firstApplicationValue(historicalApplications, ["phone_number", "phone", "phoneNumber"]),
      school: firstApplicationValue(historicalApplications, ["school", "schoolName", "school_name", "schoolOrOrganization", "manual_school_name"]),
      city: firstApplicationValue(historicalApplications, ["city", "cityName", "city_name"]),
      grade: firstApplicationValue(historicalApplications, ["grade", "gradeOrYear", "grade_or_year", "year", "schoolYear", "school_year"]),
    };
    details = {
      ...details,
      phone_number: details.phone_number || inheritedValues.phone_number || undefined,
      school: details.school || inheritedValues.school || undefined,
      city: details.city || inheritedValues.city || undefined,
      grade: details.grade || inheritedValues.grade || undefined,
    };
  }

  // Fetch Consents
  const { data: consents } = await supabase
    .from("user_consents")
    .select("id, consent_type, consent_version, action, created_at, ip_address")
    .eq("user_id", userId)
    .eq("action", "GRANTED")
    .order("created_at", { ascending: false });

  let committeeData: (ParticipantCommittee & { role: string; can_write: boolean }) | null = null;
  const memberRecord = user.committee_members?.[0];
  const managedRecord = user.managed_committees?.[0];

  if (managedRecord) {
    committeeData = {
      ...managedRecord,
      role: 'manager',
      can_write: true,
      topic: firstRelation(managedRecord.topic)
    };
  } else if (memberRecord?.committee) {
    const comm = firstRelation(memberRecord.committee);

    if (comm) {
      committeeData = {
        id: comm.id,
        name: comm.name,
        description: comm.description,
        role: 'member',
        can_write: memberRecord.can_write ?? false,
        topic: firstRelation(comm.topic),
        admin: firstRelation(comm.admin)
      };
    }
  }

  const delegationMembership = user.delegation_members;
  let delegationData: { id: string; name: string; leader_name: string; accepted?: boolean } | null = null;
  if (delegationMembership?.delegation) {
    const del = firstRelation(delegationMembership.delegation);
    if (!del) return NextResponse.json({ error: "Delegation not found" }, { status: 404 });
    const leader = del ? firstRelation(del.leader) : null;
    delegationData = {
      id: del.id,
      name: del.name || "Unknown delegation",
      leader_name: leader?.full_name || "Unknown",
      accepted: delegationMembership.accepted
    };
  }

  // Generate Signed URLs for private storage files
  if (details?.profile_picture_url) {
    details.profile_picture_url = await getSignedUrl("profile-pictures", details.profile_picture_url);
  }

  const committeeAdmin = firstRelation(committeeData?.admin);
  if (committeeAdmin?.user_details) {
    const adminDetails = firstRelation(committeeAdmin.user_details);

    if (adminDetails?.profile_picture_url && !adminDetails.is_profile_picture_hidden) {
      committeeAdmin.profile_picture_url = await getSignedUrl("profile-pictures", adminDetails.profile_picture_url);
    }
  }

  if (application && application.form) {
    application.form = Array.isArray(application.form) ? application.form[0] : application.form;
  }

  const response = {
    profile: {
      ...user,
      details,
      consents: consents || [],
      delegation: delegationData,
      user_details: undefined, 
      user_warnings: user.user_warnings,
      committee_members: undefined,
      managed_committees: undefined,
      delegation_members: undefined,
      application: undefined
    },
    application: application || null,
    committee: committeeData
  };

  return NextResponse.json(response);
});

export const DELETE = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  const body = await request.json().catch(() => ({}));
  if (body?.confirmation !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm account deletion." }, { status: 400 });
  }

  const { data: details } = await supabase
    .from("user_details")
    .select("profile_picture_url")
    .eq("user_id", auth.session.user.id)
    .maybeSingle();
  await deleteFile("profile-pictures", details?.profile_picture_url);

  const { error } = await supabase.from("users").delete().eq("id", auth.session.user.id);
  if (error) throw new Error("Unable to delete your account.");

  return NextResponse.json({ success: true });
});

export const PUT = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(10, ip);

  const auth = await getAuthorization({ requireAuth: true });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");
  const session = auth.session;

  const body = await request.json();
  const validData = updateProfileSchema.parse(body);

  if (validData.full_name) {
    const { error: userError } = await supabase
      .from("users")
      .update({ full_name: validData.full_name })
      .eq("id", session.user.id);
    if (userError) throw userError;
  }

  const { city, grade, two_factor_enabled, ...restDetails } = validData;
  const detailsUpdate: Record<string, unknown> = { ...restDetails };

  if (city) detailsUpdate.city = city;
  if (grade) detailsUpdate.grade = grade;

  Object.keys(detailsUpdate).forEach(key => detailsUpdate[key] === undefined && delete detailsUpdate[key]);
  delete detailsUpdate.full_name;

  if (Object.keys(detailsUpdate).length > 0 || two_factor_enabled !== undefined) {
    const { data: existingDetails } = await supabase
      .from("user_details")
      .select("id, additional_info")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (two_factor_enabled !== undefined) {
      detailsUpdate.additional_info = {
        ...(existingDetails?.additional_info || {}),
        two_factor_enabled
      };
    }

    if (existingDetails) {
      const { error } = await supabase
        .from("user_details")
        .update(detailsUpdate)
        .eq("user_id", session.user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("user_details")
        .insert({
          user_id: session.user.id,
          ...detailsUpdate
        });
      if (error) throw error;
    }
  }

  return NextResponse.json({ success: true, message: "Profile updated" });
});
