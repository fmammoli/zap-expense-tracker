import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
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

export default async function parseMessageTypeWithGemini(message: string) {
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
