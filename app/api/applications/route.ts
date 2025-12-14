import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  personalInfoSchema,
  experienceSchema,
  motivationSchema
} from "@/types/application";
import { z } from "zod";

const submissionSchema = z.object({
  personalInfo: personalInfoSchema,
  experience: experienceSchema,
  motivation: motivationSchema,
});

const updateSchema = z.object({
  id: z.string().uuid(), // Changed to UUID
  status: z.enum(["approved", "rejected", "pending"]),
  review_notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const sortBy = searchParams.get("sort_by") || "submitted_at";
    const sortOrder = searchParams.get("sort_order") || "desc";

    // Calculate range
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Start building the query
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
          )
        )
      `, { count: "exact" });

    // Status filter
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Search filter
    // Note: Searching deeper into JSON or joined tables can be tricky in Supabase/PostgREST.
    // We can search on the joined user table fields if we use !inner join and apply filters on the foreign table.
    // However, basic text search across multiple fields might need a dedicated RPC or careful structure.
    // For now, let's try to filter by fields we can access.
    // Since we are joining `users`, we can filter on `users.full_name` etc.
    if (search) {
      // Supabase JS client doesn't support OR across different tables easily in one line without RPC or complex syntax.
      // But we can filter on the inner joined table columns.
      // Syntax for filtering on joined table: 'user.full_name.ilike.%search%'
      // OR logic across tables is hard. Let's prioritize Name and Email.
      // We will try a raw filter if possible, or simple separate filters if "OR" is needed.
      // Actually, PostgREST allows embedding resources. filtering on them works as AND.
      // To do OR across parent and child, it's hard.
      // Let's assume for now we primarily search on the user's name/email.
      // We can use the text search syntax for the joined table?
      // Unfortunately, standard `or` with foreign tables is tricky.
      // Let's stick to filtering on the `user` relation if possible, but the `or()` method applies to the main table usually.
      // Workaround: We might have to fetch more and filter in memory if the dataset is small, OR use a view.
      // BUT, given this is "Advanced Agentic Coding", let's try to do it right.
      // If we use `!inner` on users, we can filter users.
      // query = query.ilike('user.full_name', `%${search}%`) -- this syntax might not work directly as `user` is an alias/relationship.

      // Let's try to simple filter implementation first:
      // If the user searches, we might need a specific structure.
      // Actually, for simplicity and reliability without changing schema/adding indexes/RPCs right now:
      // We will fetch based on status/sort first, and if there is a search, we might rely on the frontend OR 
      // if we assume `users` is the main thing we search, we can filter `users.full_name` etc.

      // Correct PostgREST syntax for nested filter:
      // query = query.filter('user.full_name', 'ilike', `%${search}%`)
      // But we want OR (name OR email).
      // `users.or(full_name.ilike.%${search}%,email.ilike.%${search}%)` - this needs to be applied to the users join?
      // It's cleaner to just fetch matches.
    }

    // Let's implement searching by filtering on the client for now because of the complex join filtering limitation 
    // without using a Database Function (RPC) or complex text search configuration.
    // WAIT, I should do this server side as requested.
    // To do it server side with Supabase on joined tables:
    // We can filter the embedding resource.
    // .select('..., user:users!inner(...)')
    // .or('full_name.ilike.%search%,email.ilike.%search%', { foreignTable: 'users' })
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: 'users' });
    }

    // Sort
    // "user.full_name" sorting is also tricky. 
    // If sorting by a column in the main table:
    if (sortBy === 'submitted_at' || sortBy === 'status') {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'full_name') {
      // Sorting by foreign table column
      query = query.order('full_name', { foreignTable: 'users', ascending: sortOrder === 'asc' });
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Fetch applications error:", error);
      return NextResponse.json(
        { error: "Database error", message: "Başvurular yüklenirken hata oluştu." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = submissionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { personalInfo, experience, motivation } = validationResult.data;

    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("email", personalInfo.email)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    let userId: string; // UUID string

    if (existingUser) {
      userId = existingUser.id;
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

      if (createUserError || !newUser) {
        return NextResponse.json({ error: "Create user failed" }, { status: 500 });
      }
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

    if (appError) {
      return NextResponse.json({ error: "Application failed" }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: "Başvuru başarıyla alındı." },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validationResult = updateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { id, status, review_notes } = validationResult.data;

    const { data: currentApp, error: fetchError } = await supabase
      .from("applications")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError || !currentApp) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (currentApp.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending applications can be edited" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("applications")
      .update({
        status,
        review_notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Başvuru güncellendi." });

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}