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
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    if (session?.user?.role !== "admin") {
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