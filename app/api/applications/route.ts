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

// --- VALIDATION SCHEMAS ---
const submissionSchema = z.object({
  personalInfo: personalInfoSchema,
  experience: experienceSchema,
  motivation: motivationSchema,
});

const updateSchema = z.object({
  id: z.number(),
  status: z.enum(["approved", "rejected", "pending"]),
  review_notes: z.string().optional(),
});

// --- GET: List Applications (Admin Only) ---
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch applications with joined user and user_details data
    const { data, error } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        submitted_at,
        review_notes,
        user:users (
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
      `)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Fetch applications error:", error);
      return NextResponse.json(
        { error: "Database error", message: "Başvurular yüklenirken hata oluştu." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// --- POST: Submit Application (Public/User) ---
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validation
    const validationResult = submissionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { personalInfo, experience, motivation } = validationResult.data;

    // 2. Check or Create User
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("email", personalInfo.email)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error("User check error:", userCheckError);
      return NextResponse.json(
        { error: "Database error", message: "Kullanıcı kontrolü sırasında hata oluştu." },
        { status: 500 }
      );
    }

    let userId: number;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user with random password hash
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
        console.error("Create user error:", createUserError);
        return NextResponse.json(
          { error: "Database error", message: "Kullanıcı oluşturulurken hata oluştu." },
          { status: 500 }
        );
      }
      userId = newUser.id;
    }

    // 3. Upsert User Details
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

    let detailsError;
    if (existingDetails) {
      const { error } = await supabase
        .from("user_details")
        .update(userDetailsData)
        .eq("user_id", userId);
      detailsError = error;
    } else {
      const { error } = await supabase
        .from("user_details")
        .insert(userDetailsData);
      detailsError = error;
    }

    if (detailsError) {
      console.error("User details error:", detailsError);
      return NextResponse.json(
        { error: "Database error", message: "Kullanıcı detayları kaydedilirken hata oluştu." },
        { status: 500 }
      );
    }

    // 4. Create Application Record
    const { error: appError } = await supabase
      .from("applications")
      .insert({
        user_id: userId,
        status: 'pending',
        submitted_at: new Date().toISOString()
      });

    if (appError) {
      console.error("Supabase Error:", appError);
      return NextResponse.json(
        { error: "Database error", message: "Başvuru kaydedilirken bir hata oluştu." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Başvuru başarıyla alındı." },
      { status: 200 }
    );

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// --- PUT: Update Application Status (Admin Only) ---
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate Update Body
    const validationResult = updateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { id, status, review_notes } = validationResult.data;

    const { error } = await supabase
      .from("applications")
      .update({
        status,
        review_notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Update application error:", error);
      return NextResponse.json(
        { error: "Database error", message: "Başvuru güncellenirken hata oluştu." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Başvuru güncellendi." });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Change Log:
// - Created new file `app/api/applications/route.ts` to centralize application logic.
// - Moved POST logic from `submit-application` here (handling User + UserDetails + Application creation).
// - Added GET method: Protected by Admin session, fetches applications joining users and details.
// - Added PUT method: Protected by Admin session, updates application status and review notes.