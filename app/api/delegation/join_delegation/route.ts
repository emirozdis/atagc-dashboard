import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Delegation membership is created through a verified delegate application invitation." }, { status: 410 });
}
