import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import { accountCreationSchema, FullApplicationSubmission } from "@/types/application";
import { logAction } from "@/lib/logger";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { sendSystemNotification } from "@/lib/notification-service";
import { z } from "zod";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "pending"]),
  review_notes: z.string().optional(),
});

export const GET = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: "superadmin" });
  if (!auth.ok) throw new Error("Unauthorized");

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const sortBy = searchParams.get("sort_by") || "submitted_at";
  const sortOrder = searchParams.get("sort_order") || "desc";

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
      form:application_forms(title, slug),
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
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: 'user' });
  }

  if (sortBy === 'submitted_at' || sortBy === 'status') {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  } else if (sortBy === 'full_name') {
    query = query.order('full_name', { foreignTable: 'users', ascending: sortOrder === 'asc' });
  } else {
    query = query.order('submitted_at', { ascending: sortOrder === 'asc' });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return NextResponse.json({
    data,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  });
});

export const POST = apiHandler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(5, ip); 

  const { data: settings } = await supabase.from("system_settings").select("applications_open").single();
  if (settings && settings.applications_open === false) {
    return NextResponse.json({ error: "Başvurular kapalıdır." }, { status: 403 });
  }

  const body: FullApplicationSubmission = await request.json();
  
  // 1. Account Validation
  const accountData = accountCreationSchema.parse(body.account);

  // 2. Email Verification Check
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: verification } = await supabase
    .from("email_verifications")
    .select("id")
    .eq("email", accountData.email)
    .eq("verified", true)
    .gt("created_at", oneHourAgo)
    .limit(1)
    .maybeSingle();

  if (!verification) throw new Error("E-posta doğrulanmamış.");

  // 3. Check Existing User
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", accountData.email)
    .single();

  let userId: string;
  
  if (existingUser) {
    userId = existingUser.id;
    const { data: existingApp } = await supabase.from("applications").select("id").eq("user_id", userId).single();
    if (existingApp) {
        return NextResponse.json({ error: "Zaten bir başvurunuz var." }, { status: 409 });
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
        role: 'applicant', // Temporarily applicant, updated below
        created_at: now,
        updated_at: now
      })
      .select("id")
      .single();

    if (createUserError || !newUser) throw new Error("Kullanıcı hesabı oluşturulamadı.");
    userId = newUser.id;
  }

  // 4. Validate Form Data & Get Role Slug
  const { data: formTemplate } = await supabase
    .from("application_forms")
    .select("id, slug, steps")
    .eq("id", body.formId)
    .single();

  if (!formTemplate) throw new Error("Geçersiz başvuru formu.");

  // 5. Process Data Mappings
  const userDetailsUpdate: any = {};
  const additionalInfo: any = {};
  const cleanFormData: any = { ...body.formData };

  const steps = formTemplate.steps as any[];
  steps.forEach(step => {
      step.fields.forEach((field: any) => {
          const value = body.formData[field.id];
          if (value !== undefined) {
              if (field.system_map) {
                  if (['phone_number', 'school_name', 'birth_date'].includes(field.system_map)) {
                      userDetailsUpdate[field.system_map] = value;
                  } else {
                      additionalInfo[field.system_map] = value;
                  }
              }
          }
      });
  });

  userDetailsUpdate.notification_preferences = {
      application: true, committee: true, social: true, system: true
  };
  userDetailsUpdate.additional_info = additionalInfo;

  const { data: existingDetails } = await supabase
    .from("user_details")
    .select("id, additional_info")
    .eq("user_id", userId)
    .single();

  if (existingDetails) {
      userDetailsUpdate.additional_info = { 
          ...existingDetails.additional_info, 
          ...additionalInfo,
          kvkk_approved: body.kvkkApproved 
      };
      await supabase.from("user_details").update(userDetailsUpdate).eq("user_id", userId);
  } else {
      userDetailsUpdate.user_id = userId;
      userDetailsUpdate.additional_info.kvkk_approved = body.kvkkApproved;
      await supabase.from("user_details").insert(userDetailsUpdate);
  }

  // 6. Create Application
  const { error: appError } = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      form_id: body.formId,
      form_data: cleanFormData,
      status: 'pending',
      submitted_at: new Date().toISOString()
    });

  if (appError) throw appError;

  // 7. Update User Role based on Form Slug (Fix)
  if (formTemplate.slug) {
      const { error: roleError } = await supabase
          .from("users")
          .update({ role: formTemplate.slug })
          .eq("id", userId);
      
      if (roleError) console.error("Failed to update user role:", roleError);
  }

  await logAction(userId, "submit_application", { form_id: body.formId, role: formTemplate.slug }, request);
  await sendSystemNotification(userId, "application_received");

  return NextResponse.json({ success: true, message: "Başvuru alındı." });
});

export const PUT = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: "superadmin" });
  if (!auth.ok) throw new Error("Unauthorized");
  const session = auth.session;

  const body = await request.json();
  const { id, status, review_notes } = updateSchema.parse(body);

  const { data: currentApp, error: fetchError } = await supabase
    .from("applications")
    .select("status, user_id")
    .eq("id", id)
    .single();

  if (fetchError || !currentApp) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status,
      review_notes,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  await logAction(session?.user?.id, "update_application_status", { 
      application_id: id, 
      new_status: status,
      previous_state: currentApp 
  }, request);

  if (currentApp.status !== status) {
      await sendSystemNotification(currentApp.user_id, "application_status");
  }

  return NextResponse.json({ success: true, message: "Başvuru güncellendi." });
});

// Change Log:
// - Updated POST handler (Step 7) to automatically update the user's `role` in the `users` table to match the `form.slug` upon successful application submission.