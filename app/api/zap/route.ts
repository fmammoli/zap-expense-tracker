import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const token = req.nextUrl.searchParams.get("hub.verify_token");

  const verifyToken = process.env.VERIFY_TOKEN; // set in .env.local

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WEBHOOK VERIFIED");
    return NextResponse.json(challenge, { status: 200 });
  } else {
    return NextResponse.json("Forbidden", { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(body, null, 2));

  // Always respond 200 so WhatsApp knows delivery worked
  return new NextResponse(null, { status: 200 });
}
