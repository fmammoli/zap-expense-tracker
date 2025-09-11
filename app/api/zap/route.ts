import { clerkClient } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { GoogleGenAI, Type } from "@google/genai";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

export async function POST2(req: NextRequest) {
  const body = await req.json();

  const from = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
  const messageBody =
    body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text.body;

  const senderName = body.entry?.[0]?.changes?.[0]?.contacts?.[0]?.profile.name;

  if (!from) {
    console.log("No 'from' field found in the message.");
    return new NextResponse(null, { status: 200 });
  }
  if (!messageBody) {
    console.log("No 'messageBody' field found in the message.");
    return new NextResponse(null, { status: 200 });
  }

  const response = await parseNewRegisterWithGemini(messageBody);

  const bodyText = `
              Mensagem registrada!\n
              ${senderName}\n
              Tipo: ${response.tipo}\n
              Valor: \$ ${response.valor}\n
              Categoria: ${response.categoria}\n
              Descrição: ${response.descricao}\n
              `;
  await sendMessage(from, bodyText);

  // Always respond 200 so WhatsApp knows delivery worked
  return new NextResponse(null, { status: 200 });
}

async function addNewRegister(whatsappNumber: string, messageBody: string) {
  const client = await clerkClient();

  const users = await client.users.getUserList();
  const user = users.data.find(
    (user) => user.publicMetadata.whatsappNumber === whatsappNumber
  );

  if (!user) {
    //Should send a message suggesting log in on google
    throw new Error("No user found with this whatsapp number");
  }

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

  if (!search.data.files || search.data.files.length === 0) {
    throw new Error("No spreadsheet found with this name");
  }

  spreadsheetId = search.data.files[0].id as string;
  console.log("Found existing spreadsheet:", spreadsheetId);

  const resp = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTitle = resp.data.sheets?.[0].properties?.title;

  const llmResponse = await parseNewRegisterWithGemini(messageBody);

  if (llmResponse) {
    // This is the table format
    //   A1       B1      C1.     D1         E1.          F1
    //["Data", "Valor", "Tipo", "Quem", "Categoria", "Descrição"]
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetTitle}!A1:F1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            new Date().toLocaleDateString("pt-BR"),
            llmResponse.valor,
            llmResponse.tipo,
            `${user.firstName} ${user.lastName}`,
            llmResponse.categoria,
            llmResponse.descricao,
          ],
        ],
      },
    });
    return { newRegister: llmResponse, user: user };
  }
  throw new Error("LLM could not parse the message");
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(body, null, 2));

  const from = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
  const messageBody =
    body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text.body;

  if (!from || !messageBody) {
    console.log("No 'from' or 'messageBody' field found in the message.");
    return new NextResponse(null, { status: 200 });
  }

  try {
    const response = await addNewRegister(from, messageBody);
    const bodyText = `
              Mensagem registrada!\n
              ${response.user.firstName} ${response.user.lastName}\n
              Tipo: ${response.newRegister.tipo}\n
              Valor: \$ ${response.newRegister.valor}\n
              Categoria: ${response.newRegister.categoria}\n
              Descrição: ${response.newRegister.descricao}\n
              `;
    await sendMessage(from, bodyText);
  } catch (error) {
    const message = `Something went wrong adding the message: ${error}`;
    return new NextResponse(message, { status: 200 });
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

const systemPrompt = `
Você é um analisador de transações financeiras pessoais.  
Sua tarefa é extrair dados estruturados de mensagens curtas do WhatsApp sobre finanças.  

- Entrada: uma mensagem em linguagem natural (ex.: "Uber 23,50", "Salário 5000", "Almoço 45", "Netflix 39,90", "Recebi 200").  
- Saída: JSON com os seguintes campos:
  {
    "tipo": "despesa" | "receita" | null,
    "descricao": string | null,
    "valor": number | null,
    "moeda": string | null,
    "categoria": string | null
  }

Regras:
- Identifique se é uma DESPESA ou RECEITA.
- Se não houver moeda, usar "BRL".
- Deduzir categoria a partir da descrição:
  - Despesas: alimentação, transporte, compras, entretenimento, aluguel, contas, saúde, educação, outros.  
  - Receitas: salário, presente, investimento, reembolso, outros.  
- A categoria deve sempre ser preenchida se for despesa ou receita.
- Retorne somente JSON válido, sem explicações extras.
- Se a mensagem não descrever uma transação financeira, retorne todos os campos como null.
`;

async function parseNewRegisterWithGemini(message: string) {
  if (!GEMINI_API_KEY) {
    return;
  }
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-lite",
    contents: message,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tipo: { type: Type.STRING },
          descricao: { type: Type.STRING },
          valor: { type: Type.NUMBER },
          moeda: { type: Type.STRING },
          categoria: { type: Type.STRING },
        },
        required: ["tipo", "descricao", "valor", "moeda", "categoria"],
      },
    },
  });
  console.log("!!!!!!!!!!LLM RESPONSE!!!!!!!!!!");
  const responseText = response.candidates?.[0].content?.parts?.[0].text;
  console.log(responseText);
  if (responseText) {
    const jsonData = await JSON.parse(responseText);
    return jsonData;
  } else {
    return null;
  }
}
