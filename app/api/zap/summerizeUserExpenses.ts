import { sheets_v4 } from "googleapis";

interface CategorySummary {
  categoria: string;
  total: number;
  percentage: number;
}

export function formatExpenseSummaryMessage(
  sheetId: string | null,
  name: string,
  month: number,
  year: number,
  total: number,
  byCategory: CategorySummary[]
) {
  // Some fun emojis by category keywords
  const emojiMap: Record<string, string> = {
    alimentação: "🍽️",
    comida: "🍲",
    mercado: "🛒",
    transporte: "🚗",
    gasolina: "⛽",
    lazer: "🎉",
    casa: "🏠",
    saúde: "💊",
    educação: "📚",
    roupas: "👕",
    outros: "💸",
  };

  const monthNames = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const monthName = monthNames[month - 1] || "";

  let message = `📊 *Resumo de gastos de ${name}*\n🗓️ ${monthName} de ${year}\n\n💰 *Total:* R$ ${total.toFixed(
    2
  )}\n\n`;

  if (byCategory.length === 0) {
    message += "Nenhum gasto registrado neste mês! 🌱";
    return message;
  }

  message += "📂 *Por categoria:*\n";
  byCategory.forEach((c) => {
    const emoji = emojiMap[c.categoria.toLowerCase()] || emojiMap["outros"];
    message += `${emoji} ${c.categoria}: R$ ${c.total.toFixed(
      2
    )} (${c.percentage.toFixed(1)}%)\n`;
  });

  message += `\n✅ Todos os seus gastos estão salvos na planilha do Google Sheets! 📈`;

  if (sheetId) {
    const sheetLink = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    message += `\n🔗 *Abrir planilha:* ${sheetLink}`;
  }

  return message;
}

export async function summarizeUserExpenses({
  sheets,
  sheetId,
  userName,
  month,
  year,
}: {
  sheets: sheets_v4.Sheets;
  sheetId: string;
  userName: string;
  month: number;
  year: number;
}) {
  // Read all values from the Extrato sheet
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Extrato!A2:F", // skip headers
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    return "Nenhum gasto encontrado 🪙";
  }

  // Columns: [Data, Valor, Tipo, Quem, Categoria, Descrição]
  const filtered = rows.filter((row) => {
    try {
      const date = row[0];
      const [day, monthStr, yearStr] = date.split("/");
      const rowMonth = parseInt(monthStr);
      const rowYear = parseInt(yearStr);
      return rowMonth === month && rowYear === year;
    } catch {
      return false;
    }
  });

  if (filtered.length === 0) {
    return `Nenhum gasto registrado em ${month}/${year}. 🌱`;
  }

  // Convert to numeric and group by category
  const categoryTotals: Record<string, number> = {};
  let total = 0;

  filtered.forEach((row) => {
    const valor = parseFloat(row[1]) || 0;
    const categoria = row[4]?.trim() || "Outros";
    total += valor;
    categoryTotals[categoria] = (categoryTotals[categoria] || 0) + valor;
  });

  // Compute percentages
  const byCategory = Object.entries(categoryTotals).map(
    ([categoria, totalValue]) => ({
      categoria,
      total: totalValue,
      percentage: (totalValue / total) * 100,
    })
  );

  // Generate WhatsApp message
  return formatExpenseSummaryMessage(
    sheetId,
    userName,
    month,
    year,
    total,
    byCategory
  );
}
