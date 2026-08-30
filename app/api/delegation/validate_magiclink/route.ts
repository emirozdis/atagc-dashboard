import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "This delegation flow has been retired. Use the RavenMUN invitation link." }, { status: 410 });
}
