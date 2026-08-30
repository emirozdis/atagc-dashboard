import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "This delegation flow has been retired. Use the RavenMUN email invitation flow." }, { status: 410 });
}
