import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Invitation codes are retired. Use the RavenMUN email invitation flow." }, { status: 410 });
}
