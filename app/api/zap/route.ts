import { clerkClient, User } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { google, type sheets_v4 } from "googleapis";
import { summarizeUserExpenses } from "./summerizeUserExpenses";
import sendMessage from "./sendMessage";
import checkIfNumberMatches from "./check-if-wa-numbers-matches";
import parseExpenseReportRequestWithGemini from "./parse-expense-report-request-with-gemini";
import parseMessageTypeWithGemini from "./parse-message-type-with-gemini";
import parseNewRegisterWithGemini from "./parse-new-register-with-gemini";
import { parseImageMessage } from "./parse-image-message";

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

  const type = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type;

  const from = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
  if (type !== "text" || type !== "image") {
    return new NextResponse(
      `Cannot process message type: ${type}, can only process text or image`,
      { status: 400 }
    );
  }

  if (!from) {
    console.log("No 'from' field found in the message.");
    return new NextResponse(null, { status: 200 });
  }

  // Query Clerk for user with matching whatsappNumber in public metadata
  let matchedUser: null | undefined | User = null;
  let token = null;
  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({
      limit: 100, // adjust as needed
    });
    matchedUser = users.data.find((user) => {
      console.log(
        `Checking: ${JSON.stringify(user.publicMetadata, null, 2)} and ${from}`
      );
      if (user.publicMetadata.whatsappNumber && from) {
        const res = checkIfNumberMatches(
          user.publicMetadata.whatsappNumber as string,
          from
        );
        return res;
      }
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

  if (type === "image") {
    const imageId =
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.image.id;
    const jsonData = await parseImageMessage(imageId, from);
    if (jsonData) {
      // Format the response message with emoji and markdown
      const responseMessage = `
📸 *Recibo Processado com Sucesso!* 

📅 *Data:* ${
        jsonData.data
          ? new Date(jsonData.data).toLocaleDateString("pt-BR")
          : "Não identificada"
      }
🏪 *Estabelecimento:* ${jsonData.descricao || "Não identificado"}
💰 *Valor Total:* R$ ${jsonData.valor?.toFixed(2) || "Não identificado"}
🏷️ *Categoria:* ${jsonData.categoria || "Não identificada"}
${
  jsonData.forma_pagamento
    ? `💳 *Forma de Pagamento:* ${jsonData.forma_pagamento}\n`
    : ""
}
📝 *Detalhes:* ${jsonData.observacoes || "Nenhum detalhe adicional"}

✅ Recibo registrado com sucesso para reembolso!
`;

      await sendMessage(from, responseMessage);
    } else {
      console.error("Was not able to process the script.");
      await sendMessage(
        from,
        "❌ Não consegui processar este recibo. Por favor, envie uma foto mais clara ou digite as informações manualmente."
      );
      return new NextResponse(null, { status: 200 });
    }
    console.log(jsonData);
  }

  const messageBody =
    body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text.body;

  //Parse the type of text message message
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
