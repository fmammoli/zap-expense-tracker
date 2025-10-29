import { NextResponse } from "next/server";
import sendMessage from "./sendMessage";
import { GoogleGenAI, Type } from "@google/genai";

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
- Se a imagem estiver muito ruim para identificar as informações, returne null.
`;

export async function parseImageMessage(imageId: string, from: string) {
  try {
    if (!GEMINI_API_KEY) {
      return;
    }

    // 1. Get image URL from WhatsApp
    const imageUrl = await getWhatsAppMedia(imageId);
    console.log(`WA Image url: ${imageUrl}`);
    // 2. Download image
    const imageResponse = await fetch(imageUrl, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    });
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64ImageData = Buffer.from(imageBuffer).toString("base64");
    // 3. Process with Gemini
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64ImageData,
          },
        },
        { text: receiptSystemPrompt },
      ],
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
      jsonData.base64ImageData = imageBuffer;
      return jsonData;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error processing receipt:", error);

    return NextResponse.json(
      {
        error:
          "❌ Não consegui processar este recibo. Por favor, envie uma foto mais clara ou digite as informações manualmente.",
      },
      { status: 400 }
    );
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
