import { clerkClient } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { google, type sheets_v4 } from "googleapis";
import { GoogleGenAI, Type } from "@google/genai";
import { summarizeUserExpenses } from "./summerizeUserExpenses";
import sendMessage from "./sendMessage";

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

export async function POST(req: NextRequest) {
  const body = await req.json();

  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`\n\nWebhook received: ${timestamp}\n`);
  console.log(JSON.stringify(body, null, 2));

  const from = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
  const messageBody =
    body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text.body;

  if (!from || !messageBody) {
    console.log("No 'from' or 'messageBody' field found in the message.");
    return new NextResponse(null, { status: 200 });
  }

  // Query Clerk for user with matching whatsappNumber in public metadata
  let matchedUser = null;
  let token = null;
  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({
      limit: 100, // adjust as needed
    });
    matchedUser = users.data.find((user) => {
      console.log(user.publicMetadata.whatsappNumber);
      if (
        (user.publicMetadata.whatsappNumber as string).replace(/\D/g, "") ===
        from
      ) {
        return true;
      }
    });
    if (!matchedUser) {
      console.log("No user found with this WhatsApp number");
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }
    console.log(
      "Matched user:",
      matchedUser.id,
      matchedUser.emailAddresses?.[0]?.emailAddress,
      matchedUser.firstName,
      matchedUser.lastName,
      matchedUser.publicMetadata.whatsappNumber,
      matchedUser.publicMetadata.sheetId
    );

    // Here you can continue: save message to Google Sheet, etc.
    const clarkResponse = await client.users.getUserOauthAccessToken(
      matchedUser.id,
      "google"
    );

    token = clarkResponse.data[0].token;
  } catch (err) {
    console.error("Error fetching users from Clerk:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  if (!token) {
    console.log("No Google OAuth token found for this user.");
    sendMessage(
      from,
      "Desculpe, não consegui encontrar suas informações. Tente logar novamente no serviço usando sua conta do google."
    );
    return NextResponse.json(
      { error: "No Google OAuth token found" },
      { status: 403 }
    );
  }

  let sheets: sheets_v4.Sheets | null = null;
  try {
    const googleAuthClient = new google.auth.OAuth2();
    googleAuthClient.setCredentials({ access_token: token });
    sheets = google.sheets({
      version: "v4",
      auth: googleAuthClient,
    });
  } catch (err) {
    console.error("Error setting up Google Auth client:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  if (!sheets) {
    console.log("Google Sheets client not initialized.");
    return NextResponse.json(
      { error: "Google Sheets client not initialized" },
      { status: 500 }
    );
  }

  const typeSwitch = await parseMessageTypeWithGemini(messageBody);
  console.log(typeSwitch);

  // Case weird message
  if (typeSwitch?.tipo === null) {
    const helpText = `Olá, ${matchedUser.firstName}! Não consegui entender sua mensagem.`;
    sendMessage(from, helpText);
    return NextResponse.json(null, { status: 200 });
  }

  // Case help message
  if (typeSwitch?.tipo === "ajuda") {
    const helpText = `
Olá, ${matchedUser.firstName}! Aqui estão alguns exemplos de como você pode registrar suas transações financeiras:

1. Para registrar uma despesa, envie uma mensagem no formato:
  "Descrição Valor"
  Exemplo: "Uber 23,50"

2. Para registrar uma receita, envie uma mensagem no formato:
  "Descrição Valor"
  Exemplo: "Salário 1000"

3. Para obter um relatório de gastos, envie a mensagem:
  "Quanto eu gastei no último mês?"

Estou aqui para ajudar você a gerenciar suas finanças de forma descomplicada!  🐊`;

    await sendMessage(from, helpText);
    return NextResponse.json(null, { status: 200 });
  }

  // Case expense report request
  if (typeSwitch?.tipo === "relatorio") {
    const reportRequest = await parseExpenseReportRequestWithGemini(
      messageBody
    );

    if (reportRequest) {
      let month = reportRequest.mes;
      const year = reportRequest.ano || new Date().getFullYear();
      if (month === null || month === 0) {
        month = new Date().getMonth() + 1;
      }
      if (month < 0) {
        month = new Date().getMonth() + Number(month) + 1;
      }
      console.log("Generating report for:", month, year);
      const reportMessage = await summarizeUserExpenses({
        sheets,
        sheetId: matchedUser.publicMetadata.sheetId as string,
        userName: `${matchedUser.firstName} ${matchedUser.lastName}`,
        month: month,
        year: year,
      });
      await sendMessage(from, reportMessage);
      return NextResponse.json(null, { status: 200 });
    }
  }

  // Case expense or income registration
  if (
    typeSwitch?.tipo === "registrar_despesa" ||
    typeSwitch?.tipo === "registrar_receita"
  ) {
    const llmResponse = await parseNewRegisterWithGemini(messageBody);

    if (llmResponse.tipo === null && llmResponse.valor === null) {
      console.log("Message does not describe a financial transaction.");
      return NextResponse.json({ ok: true, userId: matchedUser.id });
    }

    if (llmResponse && matchedUser.publicMetadata.sheetId) {
      // This is the table format
      //   A1       B1      C1.     D1         E1.          F1
      //["Data", "Valor", "Tipo", "Quem", "Categoria", "Descrição"]
      await sheets.spreadsheets.values.append({
        spreadsheetId: matchedUser.publicMetadata.sheetId as string,
        range: `Extrato!A1:F1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              new Date().toLocaleDateString("pt-BR"),
              llmResponse.valor,
              llmResponse.tipo,
              `${matchedUser.firstName} ${matchedUser.lastName}`,
              llmResponse.categoria,
              llmResponse.descricao,
            ],
          ],
        },
      });
    }

    try {
      const bodyText = `
✅ *Gasto registrado com sucesso!* ✅

👤 *Usuário:* ${matchedUser.firstName} ${matchedUser.lastName}
📌 *Tipo:* ${llmResponse.tipo}
💰 *Valor:* R$ ${llmResponse.valor.toFixed(2)}
🏷️ *Categoria:* ${llmResponse.categoria}
📝 *Descrição:* ${llmResponse.descricao}

🐊 
  `;

      await sendMessage(from, bodyText);
    } catch (err) {
      console.error("Erro registrando gasto:", err);
      await sendMessage(
        from,
        "⚠️ Ocorreu um erro ao registrar seu gasto. Tente novamente!"
      );
    }

    // Always respond 200 so WhatsApp knows delivery worked
    return new NextResponse(null, { status: 200 });
  }
  return new NextResponse(null, { status: 200 });
}

const expenseReportSystemPrompt = `
Você é um assistente financeiro pessoal que ajuda o usuário com relatório de despesas mensais.
Sua tarefa é identificar o mês e ano na mensagem do usuário e gerar um resumo das despesas daquele período.

Regras
- Entrada: uma mensagem em linguagem natural (ex.: "Quanto eu gastei em março de 2023?", "Me mostre meu relatório de despesas para o último mês").
- Se a mensagem não especificar o ano, retorne 2025.
- Se a mensagem dizer "esse mês" ou "último mês" retorne null.
- Se a mensagem dizer "mês passado" retorne -1 e se a mensagem disser "dois meses atrás" retorne -2 e assim por diante
- Saída: JSON com os seguintes campos:

{
  "mes": number | null,  
  "ano": number | null   
}
`;

async function parseExpenseReportRequestWithGemini(message: string) {
  if (!GEMINI_API_KEY) {
    return;
  }
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-lite",
    contents: message,
    config: {
      systemInstruction: expenseReportSystemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mes: { type: Type.NUMBER },
          ano: { type: Type.NUMBER },
        },
        required: ["mes", "ano"],
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
const systemSwitchPrompt = `
Você é um analisador de transações financeiras pessoais.
Sua tarefa é enquadrar a mensagem do usuário em um desses 4 tipo: 
1. Ajuda
2. Registrar Despesa
3. Registrar Receita
4. Relatório de Gastos

- Entrada: uma mensagem em linguagem natural (ex.: "Como funciona?", "Uber 23,50", "Salário 5000", "Quanto eu gastei no último mês?").
- Saída: JSON com os seguintes campos:

{
  "tipo": "ajuda" | "registrar_despesa" | "registrar_receita" | "relatorio" | null
}
`;

async function parseMessageTypeWithGemini(message: string) {
  if (!GEMINI_API_KEY) {
    return;
  }
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-lite",
    contents: message,
    config: {
      systemInstruction: systemSwitchPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tipo: { type: Type.STRING },
        },
        required: ["tipo"],
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
  - Despesas: alimentação (comidas e bebidas), transporte, compras, entretenimento, aluguel, contas, saúde, educação, outros.  
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
