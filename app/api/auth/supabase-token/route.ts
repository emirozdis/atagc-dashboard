import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Your existing auth options
import { generateSupabaseToken } from "@/lib/supabase-token";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Generate a JWT signed with Supabase's secret
    // using the ID from your existing auth system
    const token = generateSupabaseToken(session.user.id, session.user.email || undefined);

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Token generation failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}