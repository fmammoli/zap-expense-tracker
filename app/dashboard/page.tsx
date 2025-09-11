import { auth, clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const whatsappNumber = (await searchParams).whatsappNumber as string;
  const user = await auth();
  const userId = user.userId;
  let spreadsheetId: string = "";

  if (userId) {
    const provider = "google";
    const client = await clerkClient();

    await client.users.updateUserMetadata(userId, {
      publicMetadata: { whatsappNumber: whatsappNumber || "" },
    });

    const clarkResponse = await client.users.getUserOauthAccessToken(
      userId,
      provider
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

    if (search.data.files && search.data.files.length === 0) {
      //So here I send a message to the user on whatsapp asking if he wants to create a new spreadsheet or link to an existing one

      //Create sheet if not found
      const response = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: "minhas-contas-app" },
          sheets: [{ properties: { title: "Extrato" } }],
        },
      });
      spreadsheetId = response.data.spreadsheetId || "";
      const sheetTitle = response.data.sheets?.[0].properties?.title;
      console.log("Created new spreadsheet:", spreadsheetId);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A1:F1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [
            ["Data", "Valor", "Tipo", "Quem", "Categoria", "Description"],
          ],
        },
      });
    } else {
      //Found spreadsheet id
      spreadsheetId = search.data.files![0].id || "";
      console.log("Found spreadsheet:", spreadsheetId);
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
              "Test entry from app",
            ],
          ],
        },
      });
    }
  }

  return (
    <div>
      <h1>Dashboard - Protected Page</h1>
      <div>
        <h1>Welcome, {user.userId}</h1>
        <p>Spreadsheet ready.</p>
        <a
          href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open system-sheet
        </a>
        <p>Whatsapp Number: {whatsappNumber}</p>
      </div>
    </div>
  );
}
