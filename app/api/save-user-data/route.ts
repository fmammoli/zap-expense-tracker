import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// util to extract spreadsheetId from URL
function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { phone, sheetOption, sheetLink } = await req.json();

    // normalize phone (remove spaces, parentheses, dashes)
    const normalizedPhone = phone.replace(/[\s()-]/g, "");

    let spreadsheetId: string | null = null;

    if (sheetOption === "link") {
      spreadsheetId = extractSpreadsheetId(sheetLink);
      if (!spreadsheetId) {
        return NextResponse.json(
          { error: "Invalid spreadsheet link" },
          { status: 400 }
        );
      }
    } else if (sheetOption === "new") {
      // TODO: call Google Sheets API to create new spreadsheet
      // for now, fake ID for demonstration
      spreadsheetId = "new-sheet-" + Date.now();
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update Clerk public metadata
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        phone: normalizedPhone,
        spreadsheetId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ err }, { status: 500 });
  }
}
