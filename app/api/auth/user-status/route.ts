import { NextResponse } from "next/server";
import { supabase } from "@/lib/SERVER_supabase";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  try {
    await limiter.check(10, ip);
  } catch {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check Users table
    const { data: user } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("email", email)
      .single();

    if (!user) {
      // User does not exist -> New Registration
      return NextResponse.json({ status: "new_user" });
    }

    // User exists, check Application table
    const { data: application } = await supabase
      .from("applications")
      .select("id, status")
      .eq("user_id", user.id)
      .single();

    if (application) {
      // User exists AND has application -> Block (Redirect to dashboard)
      return NextResponse.json({ status: "has_application" });
    }

    // User exists BUT no application -> Resume (Login mode)
    return NextResponse.json({ 
        status: "resume_application", 
        user_name: user.full_name 
    });

  } catch (error) {
    console.error("User status check error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Change Log:
// - Created new endpoint to check user state based on email.
// - Returns 'new_user', 'resume_application', or 'has_application'.