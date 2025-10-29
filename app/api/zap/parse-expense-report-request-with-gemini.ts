import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

export default async function parseExpenseReportRequestWithGemini(
  message: string
) {
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
