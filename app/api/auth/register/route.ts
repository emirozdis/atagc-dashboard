import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Accounts are created automatically after email verification." }, { status: 410 });
}
