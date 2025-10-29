import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

export default async function parseNewRegisterWithGemini(message: string) {
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
