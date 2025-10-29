import { NextResponse } from "next/server";
import sendMessage from "./sendMessage";
import { sheets_v4 } from "googleapis";
import { GoogleGenAI, Type } from "@google/genai";
import { User } from "@clerk/nextjs/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const receiptSystemPrompt = `
Você é um assistente especializado em analisar recibos e notas fiscais para reembolso.
Analise a imagem do recibo/nota fiscal e extraia as seguintes informações:

1. Data da compra
2. Valor total
3. Nome do estabelecimento
4. Forma de pagamento (se visível)
5. CNPJ do estabelecimento (se visível)
6. Itens comprados (se visível)
7. Número do documento fiscal (se visível)

Retorne um JSON no formato:
{
  "data": "YYYY-MM-DD",
  "descricao": string, // nome do estabelecimento
  "categoria": string, // baseado no tipo de estabelecimento/produtos
  "forma_pagamento": string | null,
  "valor": number,
  "tipo": "despesa",
  "observacoes": string, // formato: "NF/CF: xxx, CNPJ: xxx, Itens: xxx"
}

Regras:
- Se não conseguir identificar algum campo, use null
- Para categoria, use: alimentação, transporte, compras, entretenimento, saúde, educação, outros
- Valor deve ser em formato numérico (ex: 10.50)
- Mantenha observacoes organizado e legível
`;

export async function parseImageMessage(
  imageId: string,
  from: string,
  matchedUser: User,
  sheets: sheets_v4.Sheets
) {
  try {
    if (!GEMINI_API_KEY) {
      return;
    }

    // 1. Get image URL from WhatsApp
    const imageUrl = await getWhatsAppMedia(imageId);

    // 2. Download image
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64ImageData = Buffer.from(imageBuffer).toString("base64");
    // 3. Process with Gemini
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64ImageData,
        },
      },
      config: {
        systemInstruction: receiptSystemPrompt,
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

    // 4. Save to spreadsheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: matchedUser.publicMetadata.sheetId as string,
      range: `Extrato!A1:H1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            new Date(llmResponse.data).toLocaleDateString("pt-BR"),
            llmResponse.valor,
            "despesa",
            `${matchedUser.firstName} ${matchedUser.lastName}`,
            llmResponse.categoria,
            llmResponse.descricao,
            llmResponse.forma_pagamento,
            llmResponse.observacoes,
          ],
        ],
      },
    });

    // 5. Send confirmation
    const bodyText = `
📸 *Recibo processado com sucesso!* 🎉

👤 *Quem:* ${matchedUser.firstName} ${matchedUser.lastName}
📆 *Data:* ${new Date(llmResponse.data).toLocaleDateString("pt-BR")}
🏪 *Estabelecimento:* ${llmResponse.descricao}
💰 *Valor:* R$ ${Number(llmResponse.valor).toFixed(2)}
🏷️ *Categoria:* ${llmResponse.categoria}
${
  llmResponse.forma_pagamento
    ? `💳 *Pagamento:* ${llmResponse.forma_pagamento}\n`
    : ""
}
📝 *Detalhes:* ${llmResponse.observacoes}

✅ Registrado para reembolso!
`;

    await sendMessage(from, bodyText);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Error processing receipt:", error);
    await sendMessage(
      from,
      "❌ Não consegui processar este recibo. Por favor, envie uma foto mais clara ou digite as informações manualmente."
    );
    return new NextResponse(null, { status: 200 });
  }
}

async function getWhatsAppMedia(mediaId: string) {
  const response = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    },
  });

  const data = await response.json();
  return data.url;
}
