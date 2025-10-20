import { TypographyH1 } from "@/components/ui/typography_h1";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";
import BrPhoneInput from "./br-phone-input";
import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataForm from "./data-form";

async function actionZap(formData: FormData) {
  "use server";
  console.log("Form data:", formData);
  const user = await auth();
  const userId = user.userId;
  const rawPhone = formData.get("phone");
  const cleanedPhone = rawPhone?.toString().replace(/\D/g, "");

  const client = await clerkClient();

  await client.users.updateUserMetadata(userId!, {
    publicMetadata: { whatsappNumber: cleanedPhone || "" },
  });
}

async function actionSheet(formData: FormData) {
  "use server";
  console.log("Form data:", formData);
  const user = await auth();
  const userId = user.userId;

  const url = formData.get("sheetLink")?.toString() || "";
  const spreadSheetId = url.split("/d/")[1].split("/")[0];

  const client = await clerkClient();

  await client.users.updateUserMetadata(userId!, {
    publicMetadata: { spreadSheetId: spreadSheetId || "" },
  });
}

async function createSheet() {
  "use server";
  const user = await auth();
  const userId = user.userId;

  const client = await clerkClient();
  const token = await client.users.getUserOauthAccessToken(userId!, "google");

  const googleAuthClient = new google.auth.OAuth2();
  googleAuthClient.setCredentials({ access_token: token.data[0].token || "" });

  const drive = google.drive({ version: "v3", auth: googleAuthClient });
  const sheets = google.sheets({
    version: "v4",
    auth: googleAuthClient,
  });

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "minhas-contas-app" },
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
}

export async function Page2({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const whatsappNumber = (await searchParams).whatsappNumber as string;
  const user = await auth();
  const userId = user.userId;
  const spreadsheetId: string = "";

  // if (userId) {
  //   const provider = "google";
  //   const client = await clerkClient();

  //   // await client.users.updateUserMetadata(userId, {
  //   //   publicMetadata: { whatsappNumber: whatsappNumber || "" },
  //   // });

  //   const clarkResponse = await client.users.getUserOauthAccessToken(
  //     userId,
  //     provider
  //   );

  //   const token = clarkResponse.data[0].token || "";

  //   const googleAuthClient = new google.auth.OAuth2();
  //   googleAuthClient.setCredentials({ access_token: token });

  //   const drive = google.drive({ version: "v3", auth: googleAuthClient });
  //   const sheets = google.sheets({
  //     version: "v4",
  //     auth: googleAuthClient,
  //   });

  //   // 🔍 Step 1: Search for a spreadsheet named "system-sheet"
  //   const search = await drive.files.list({
  //     q: "name='minhas-contas-app' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
  //     fields: "files(id, name)",
  //     spaces: "drive",
  //   });

  //   if (search.data.files && search.data.files.length === 0) {
  //     //So here I send a message to the user on whatsapp asking if he wants to create a new spreadsheet or link to an existing one

  //     //Create sheet if not found
  //     const response = await sheets.spreadsheets.create({
  //       requestBody: {
  //         properties: { title: "minhas-contas-app" },
  //         sheets: [{ properties: { title: "Extrato" } }],
  //       },
  //     });
  //     spreadsheetId = response.data.spreadsheetId || "";
  //     const sheetTitle = response.data.sheets?.[0].properties?.title;
  //     console.log("Created new spreadsheet:", spreadsheetId);

  //     await sheets.spreadsheets.values.update({
  //       spreadsheetId,
  //       range: `${sheetTitle}!A1:F1`,
  //       valueInputOption: "RAW",
  //       requestBody: {
  //         values: [
  //           ["Data", "Valor", "Tipo", "Quem", "Categoria", "Description"],
  //         ],
  //       },
  //     });
  //   } else {
  //     //Found spreadsheet id
  //     spreadsheetId = search.data.files![0].id || "";
  //     console.log("Found spreadsheet:", spreadsheetId);
  //     const resp = await sheets.spreadsheets.get({ spreadsheetId });
  //     const sheetTitle = resp.data.sheets?.[0].properties?.title;
  //     console.log("Sheet title:", sheetTitle);

  //     await sheets.spreadsheets.values.append({
  //       spreadsheetId,
  //       range: `${sheetTitle}!A1:C1`,
  //       valueInputOption: "RAW",
  //       requestBody: {
  //         values: [
  //           [
  //             new Date().toLocaleDateString(),
  //             Math.random() * 100,
  //             "Test entry from app",
  //           ],
  //         ],
  //       },
  //     });
  //   }
  // }

  if (!userId) {
    return <div>Faça o login para acessar seu painel</div>;
  }

  return (
    <div className=" bg-slate-200 p-4">
      <div className="max-w-3xl mx-auto p-4 bg-white flex flex-col gap-8">
        <Form action={actionZap}>
          <TypographyH1>1. Seu WhatsApp:</TypographyH1>
          <div className="flex justify-center mt-8 gap-2">
            <BrPhoneInput name="phone" />
            <Button type="submit">Salvar</Button>
          </div>
        </Form>
        <TypographyH1>2. Conecte sua tabela de contas:</TypographyH1>
        <Form action={actionSheet}>
          <div className="flex justify-center w-sm mx-auto items-center gap-2">
            <Input
              type="email"
              placeholder="link da tabela compartilhada"
              name="sheetLink"
            />
            <Button type="submit" variant="outline">
              Salvar
            </Button>
          </div>
        </Form>
        <div>
          <TypographyH1> - Ou -</TypographyH1>
          <div className="flex justify-center mt-8">
            <Button>Criar uma tabla de contas no google drive!</Button>
          </div>
        </div>

        <div></div>
      </div>

      <div>
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
    </div>
  );
}

export default async function Page() {
  const user = await auth();
  const userId = user.userId;

  if (!userId) {
    return <div>Faça o login para acessar seu painel</div>;
  }

  return <DataForm></DataForm>;
}
