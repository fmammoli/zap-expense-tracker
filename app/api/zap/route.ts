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

function checkIfNumberMatches(clerkNumber: string, waNumber: string) {
  const normalizedClerkNumber = clerkNumber.replace("+", "");
  const normalizedWaNumber = waNumber.replace("+", "");

  if (normalizedClerkNumber === normalizedWaNumber) {
    return true;
  }

  if (normalizedClerkNumber.length > normalizedWaNumber.length) {
    const adjustedWaNumber = `${normalizedClerkNumber.slice(
      0,
      4
    )}${normalizedClerkNumber.slice(5)}`;
    if (adjustedWaNumber === normalizedWaNumber) {
      return true;
    }
  }
  if (normalizedClerkNumber.length < normalizedWaNumber.length) {
    const adjustedWaNumber = `${normalizedWaNumber.slice(
      0,
      4
    )}${normalizedWaNumber.slice(5)}`;
    if (adjustedWaNumber === normalizedClerkNumber) {
      return true;
    }
  }
  return false;
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
      console.log(`Checking `);

      const res = checkIfNumberMatches(
        user.publicMetadata.whatsappNumber as string,
        from
      );
      return res;
    });
    if (!matchedUser) {
      console.log(`No user found with this WhatsApp number: ${from}`);
      return NextResponse.json(
        { error: `No user found with this WhatsApp number: ${from}` },
        { status: 404 }
      );
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
      //   A1       B1        C1.      D1         E1.           F1            G1                  H1
      // "Data"   "Valor"   "Tipo"   "Quem"   "Categoria"   "Descrição" "Forma de Pagamento" "Observações",

      await sheets.spreadsheets.values.append({
        spreadsheetId: matchedUser.publicMetadata.sheetId as string,
        range: `Extrato!A1:H1`,
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
              llmResponse.forma_pagamento,
              llmResponse.observacoes,
            ],
          ],
        },
      });
    }

    try {
      const bodyText = `
💸 *Transação registrada com sucesso!* 🎉  

👤 *Quem:* ${matchedUser.firstName} ${matchedUser.lastName}  
📆 *Data:* ${new Date().toLocaleDateString("pt-BR")}  
📂 *Tipo:* ${llmResponse.tipo === "receita" ? "📈 Receita" : "📉 Despesa"}  
💰 *Valor:* R$ ${Number(llmResponse.valor).toFixed(2)}  
🏷️ *Categoria:* ${llmResponse.categoria || "—"}  
📝 *Descrição:* ${llmResponse.descricao || "—"}
${
  llmResponse.forma_pagamento !== "null" && llmResponse.forma_pagamento !== null
    ? `💳 *Pagamento:* ${llmResponse.forma_pagamento || "—"}\n`
    : ""
}
${
  llmResponse.observacoes !== "null" && llmResponse.observacoes !== null
    ? `💭 *Observações:* ${llmResponse.observacoes || "—"}\n`
    : ""
}

Tudo anotadinho na planilha! 📊✨  
Quer ver o extrato completo? É só me pedir!
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

Entrada:
Uma mensagem em linguagem natural, por exemplo:  
- "Almoço 10 reais"  
- "Jantar 20 cartão Nubank"  
- "Uber 25 débito"  
- "Recebi 300 do João"  
- "Pix mercado 85"  

Saída:
Retorne somente JSON válido, no formato:

{
  "data": "YYYY-MM-DD" | null,
  "descricao": string | null,
  "categoria": string | null,
  "forma_pagamento": string | null,
  "valor": number | null,
  "tipo": "despesa" | "receita" | null,
  "observacoes": string | null
}

Regras:
1. Tipo:
   - Se for gasto, use "despesa".
   - Se for entrada (ex.: recebi, salário, venda), use "receita".
   - Caso não indique claramente, use null.

2. Data:
   - Se a mensagem contiver uma data explícita (ex.: "ontem", "15/10"), converter para formato ISO YYYY-MM-DD.
   - Caso não haja data, retornar null.

3. Valor:
   - Extrair número, convertendo vírgulas em pontos (ex.: "10,50" → 10.50).
   - Se não houver valor explícito, retornar null.

4. Moeda:
   - Se não houver especificação, assumir "BRL". (pode ser omitido se não for essencial)

5. Categoria (despesas):
   - alimentação (almoço, jantar, lanche, café, mercado)
   - transporte (uber, gasolina, passagem, estacionamento)
   - compras (roupas, eletrônicos, supermercado)
   - entretenimento (cinema, show, netflix)
   - aluguel
   - contas (energia, internet, telefone, água)
   - saúde (farmácia, consulta)
   - educação (curso, mensalidade)
   - outros

   Categoria (receitas):
   - salário
   - presente
   - reembolso
   - investimento
   - outros

6. Forma de pagamento:
   - Detectar se houver menção (ex.: "pix", "cartão nubank", "crédito", "débito", "dinheiro").
   - Se não houver, retornar null.

7. Observações:
   - Guardar qualquer informação adicional que não se encaixe nos campos acima (ex.: nomes de pessoas, lugares, comentários).

8. Importante:
   - Retorne somente o JSON, sem texto explicativo.
   - Preencha null para campos ausentes.
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
          data: { type: Type.STRING },
          descricao: { type: Type.STRING },
          categoria: { type: Type.STRING },
          forma_pagamento: { type: Type.STRING },
          valor: { type: Type.NUMBER },
          tipo: { type: Type.STRING },
          observacoes: { type: Type.STRING },
        },
        required: [
          "data",
          "descricao",
          "categoria",
          "forma_pagamento",
          "valor",
          "tipo",
          "observacoes",
        ],
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
