"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";

const createSheet = async (name: string) => {
  const user = await auth();
  const userId = user.userId;

  const client = await clerkClient();
  const token = await client.users.getUserOauthAccessToken(userId!, "google");

  const googleAuthClient = new google.auth.OAuth2();
  googleAuthClient.setCredentials({
    access_token: token.data[0].token || "",
  });

  //const drive = google.drive({ version: "v3", auth: googleAuthClient });
  const sheets = google.sheets({
    version: "v4",
    auth: googleAuthClient,
  });

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: name || "croco-contas" },
      sheets: [{ properties: { title: "Extrato" } }],
    },
  });
  const spreadsheetId = response.data.spreadsheetId || "";
  const sheetTitle = response.data.sheets?.[0].properties?.title;

  console.log("Created new spreadsheet:", spreadsheetId);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTitle}!A1:F1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [["Data", "Valor", "Tipo", "Quem", "Categoria", "Description"]],
    },
  });

  return spreadsheetId;
};

export { createSheet };
