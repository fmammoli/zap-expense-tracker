import { clerkClient } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const token = req.nextUrl.searchParams.get("hub.verify_token");

  const verifyToken = process.env.VERIFY_TOKEN; // set in .env.local
  console.log(verifyToken);
  console.log(token);
  if (mode === "subscribe" && token === verifyToken) {
    console.log("WEBHOOK VERIFIED");

    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse("Forbidden", { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(body, null, 2));

  try {
    const from = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
    const messageBody =
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text.body;

    if (from) {
      const client = await clerkClient();

      const users = await client.users.getUserList();
      console.log(users);
      const user = users.data.find((user) => {
        console.log(user.publicMetadata.whatasppNumber, from);
        if (user.publicMetadata.whatasppNumber === from) {
          return user;
        }
      });
      if (user) {
        const clarkResponse = await client.users.getUserOauthAccessToken(
          user.id,
          "google"
        );
        const token = clarkResponse.data[0].token || "";

        const googleAuthClient = new google.auth.OAuth2();
        googleAuthClient.setCredentials({ access_token: token });

        const drive = google.drive({ version: "v3", auth: googleAuthClient });
        const sheets = google.sheets({
          version: "v4",
          auth: googleAuthClient,
        });

        // 🔍 Step 1: Search for a spreadsheet named "system-sheet"
        const search = await drive.files.list({
          q: "name='minhas-contas-app' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
          fields: "files(id, name)",
          spaces: "drive",
        });

        let spreadsheetId: string = "";

        if (search.data.files && search.data.files.length > 0) {
          spreadsheetId = search.data.files[0].id || "";
          console.log("Found existing spreadsheet:", spreadsheetId);

          const resp = await sheets.spreadsheets.get({ spreadsheetId });
          const sheetTitle = resp.data.sheets?.[0].properties?.title;
          console.log("Sheet title:", sheetTitle);

          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetTitle}!A1:C1`,
            valueInputOption: "RAW",
            requestBody: {
              values: [
                [
                  new Date().toLocaleDateString(),
                  Math.random() * 100,
                  messageBody || "no body",
                ],
              ],
            },
          });
          const bodyText = `Achei o usuário!`;
          await sendMessage(from, bodyText);
        }
      } else {
        console.log("Message sent from number:", from);
        const bodyText = `Obrigado pela mensagem, entre no link: https://whatsapp-test-six.vercel.app/dashboard?whatsappNumber=${from}`;
        await sendMessage(from, bodyText);
      }
    } else {
      console.log("No 'from' field found in the message.");
    }
  } catch (err) {
    console.error("Error extracting sender number:", err);
  }

  // Always respond 200 so WhatsApp knows delivery worked
  return new NextResponse(null, { status: 200 });
}

async function sendMessage(to: string, bodyText: string) {
  const token = process.env.WHATSAPP_TOKEN; // set in .env.local
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID; // set in .env.local

  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: {
            preview_url: true,
            body: bodyText,
          },
        }),
      }
    );

    const result = await response.json();
    console.log("WhatsApp API response:", result);

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("Error sending WhatsApp message:", err);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
