import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import getAuthorization from "@/lib/getAuthorization";
import {
  personalInfoSchema,
  experienceSchema,
  motivationSchema
} from "@/types/application";
import { z } from "zod";
import { logAction } from "@/lib/logger";
import { apiHandler } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";

// Limit: 5 requests per minute per IP
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

const submissionSchema = z.object({
  personalInfo: personalInfoSchema,
  experience: experienceSchema,
  motivation: motivationSchema,
});

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
      user:users!inner (
        id,
        full_name,
        email,
        user_details (
          id,
          phone_number,
          school_name,
          birth_date,
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

  // 1. Status Filter Logic
  if (status === 'unassigned') {
    // Logic: Status is 'approved' AND User is NOT in any committee
    
    // First, get all users who ARE in a committee
    const { data: assignedMembers } = await supabase
      .from("committee_members")
      .select("user_id");
    
    const assignedUserIds = assignedMembers?.map(m => m.user_id) || [];

    query = query.eq("status", "approved");
    
    if (assignedUserIds.length > 0) {
      // Exclude these users
      query = query.not("user_id", "in", `(${assignedUserIds.join(',')})`);
    }
  } else if (status !== "all") {
    query = query.eq("status", status);
  }

  // 2. Search Logic (Name, Email, School) - Turkish Case Insensitive
  if (search) {
    // Sanitize search term to prevent syntax errors in .or()
    const safeSearch = search.replace(/[,()]/g, " ").trim();

    if (safeSearch) {
      // Create variations to handle Turkish casing issues (i/İ, ı/I)
      // Standard Postgres ilike doesn't always map 'i' to 'İ' without specific collation.
      // We manually check lowercase and uppercase variations.
      const terms = [
        safeSearch, 
        safeSearch.toLocaleLowerCase('tr-TR'), 
        safeSearch.toLocaleUpperCase('tr-TR')
      ];
      
      // Deduplicate terms
      const uniqueTerms = Array.from(new Set(terms));

      // Construct OR clauses
      // For Users table: check full_name AND email for all variations
      const userSearchConditions = uniqueTerms
        .map(t => `full_name.ilike.%${t}%,email.ilike.%${t}%`)
        .join(',');

      // For User Details table: check school_name for all variations
      const schoolSearchConditions = uniqueTerms
        .map(t => `school_name.ilike.%${t}%`)
        .join(',');

      // Execute parallel search to get IDs
      const [usersRes, detailsRes] = await Promise.all([
        supabase
          .from('users')
          .select('id')
          .or(userSearchConditions),
        supabase
          .from('user_details')
          .select('user_id')
          .or(schoolSearchConditions)
      ]);

      const userIdsFromName = usersRes.data?.map(u => u.id) || [];
      const userIdsFromSchool = detailsRes.data?.map(d => d.user_id) || [];
      
      // Unique list of User IDs matching search
      const matchingUserIds = Array.from(new Set([...userIdsFromName, ...userIdsFromSchool]));

      if (matchingUserIds.length > 0) {
        query = query.in('user_id', matchingUserIds);
      } else {
        // No matches found, force empty result
        query = query.eq('id', '00000000-0000-0000-0000-000000000000'); 
      }
    }
  }

  // 3. Sorting Logic
  if (sortBy === 'submitted_at' || sortBy === 'status') {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  } else if (sortBy === 'full_name') {
    query = query.order('full_name', { foreignTable: 'users', ascending: sortOrder === 'asc' });
  } else if (sortBy === 'school_name') {
    // Fallback: Default to submitted_at as simple sort
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
  // 1. Rate Limiting
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  await limiter.check(5, ip); 

  // 2. Check System Settings
  const { data: settings } = await supabase
    .from("system_settings")
    .select("applications_open")
    .single();

  if (settings && settings.applications_open === false) {
    return NextResponse.json(
      { error: "Başvurular şu an kapalıdır. İlginiz için teşekkür ederiz." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { personalInfo, experience, motivation } = submissionSchema.parse(body);

  // 3. Email Verification Check
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: verification } = await supabase
    .from("email_verifications")
    .select("id")
    .eq("email", personalInfo.email)
    .eq("verified", true)
    .gt("created_at", oneHourAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!verification) {
    return NextResponse.json(
      { error: "E-posta adresi doğrulanmamış veya doğrulama zaman aşımına uğramış." },
      { status: 400 }
    );
  }

  // 4. Duplicate Checks
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", personalInfo.email)
    .single();

  const { data: existingPhone } = await supabase
    .from("user_details")
    .select("user_id")
    .eq("phone_number", personalInfo.telefon)
    .single();

  if (existingPhone && (!existingUser || existingPhone.user_id !== existingUser.id)) {
    return NextResponse.json(
      { error: "Bu telefon numarası ile daha önce başvuru yapılmış." },
      { status: 409 }
    );
  }

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    const { data: existingApp } = await supabase.from("applications").select("id").eq("user_id", userId).single();
    if (existingApp) {
        return NextResponse.json({ error: "Zaten bir başvurunuz bulunmaktadır." }, { status: 409 });
    }
  } else {
    const randomHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const { data: newUser, error: createUserError } = await supabase
      .from("users")
      .insert({
        full_name: personalInfo.adSoyad,
        email: personalInfo.email,
        password_hash: randomHash, 
        role: 'applicant'
      })
      .select("id")
      .single();

    if (createUserError) throw createUserError;
    userId = newUser.id;
  }

  const additionalInfo = {
    grade: personalInfo.sinif,
    city: personalInfo.sehir,
    mun_experience: experience.munDeneyimi,
    previous_conferences: experience.oncekiKonferanslar || null,
    committee_pref_1: experience.komiteTercihi1,
    committee_pref_2: experience.komiteTercihi2 || null,
    delegation_type: experience.delegasyonTercihi,
    english_level: experience.ingilizce,
    reason_for_joining: motivation.katilimNedeni,
    expectations: motivation.beklentiler,
    self_introduction: motivation.kendinizTanitin,
    kvkk_approved: motivation.kvkkOnay,
  };

  const userDetailsData = {
    user_id: userId,
    birth_date: personalInfo.dogumTarihi,
    phone_number: personalInfo.telefon,
    school_name: personalInfo.okul,
    additional_info: additionalInfo,
  };

  const { data: existingDetails } = await supabase
    .from("user_details")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existingDetails) {
    await supabase.from("user_details").update(userDetailsData).eq("user_id", userId);
  } else {
    await supabase.from("user_details").insert(userDetailsData);
  }

  const { error: appError } = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      status: 'pending',
      submitted_at: new Date().toISOString()
    });

  if (appError) throw appError;

  await logAction(userId, "submit_application", { 
      email: personalInfo.email,
      previous_state: null
  }, request);

  return NextResponse.json(
    { success: true, message: "Başvuru başarıyla alındı." },
    { status: 200 }
  );
});

export const PUT = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: "superadmin" });
  if (!auth.ok) throw new Error("Unauthorized");
  const session = auth.session;

  const body = await request.json();
  const { id, status, review_notes } = updateSchema.parse(body);

  const { data: currentApp, error: fetchError } = await supabase
    .from("applications")
    .select("status")
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

  return NextResponse.json({ success: true, message: "Başvuru güncellendi." });
});

// Change Log:
// - Enhanced search logic: Manually creating Turkish lowercase/uppercase variations of the search term and using them in an OR query.
// - This fixes matches for "İTÜ" vs "itü" where the standard database collation might fail.
// - Fixed school name search by applying the same logic to `school_name` in `user_details` and joining the results.