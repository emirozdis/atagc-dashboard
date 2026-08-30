import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "RavenMUN uses the passwordless authentication challenge endpoint." }, { status: 410 });
}

export async function PUT() {
  return NextResponse.json({ error: "RavenMUN uses the passwordless authentication challenge endpoint." }, { status: 410 });
}
