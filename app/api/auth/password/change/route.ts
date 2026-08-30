import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "RavenMUN uses passwordless email authentication." }, { status: 410 });
}
