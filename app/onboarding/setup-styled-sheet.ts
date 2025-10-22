import { sheets_v4 } from "googleapis";

export async function createStyledTable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<void> {
  // Cabeçalho da tabela
  const headers = [
    [
      "Data",
      "Valor",
      "Tipo",
      "Quem",
      "Categoria",
      "Descrição",
      "Forma de Pagamento",
      "Observações",
    ],
  ];

  // Ensure we have the correct sheetId for the "Extrato" sheet (or fallback to first sheet)
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });
  const sheetsList = meta.data.sheets ?? [];
  if (sheetsList.length === 0) throw new Error("Spreadsheet has no sheets");
  const targetSheet =
    sheetsList.find((s) => s.properties?.title === "Extrato") ?? sheetsList[0];
  const sheetId = targetSheet.properties!.sheetId!;
  console.log("Using sheetId:", sheetId);

  // 1️⃣ Escreve o cabeçalho na planilha
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Extrato!A1:H1",
    valueInputOption: "RAW",
    requestBody: { values: headers },
  });

  // 2️⃣ Estilos, linhas alternadas e filtro
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        // Set explicit column widths (A..H => indices 0..7)
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: 1,
            },
            properties: { pixelSize: 120 }, // A - Data
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 1,
              endIndex: 2,
            },
            properties: { pixelSize: 110 }, // B - Valor
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 2,
              endIndex: 3,
            },
            properties: { pixelSize: 100 }, // C - Tipo
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 3,
              endIndex: 4,
            },
            properties: { pixelSize: 140 }, // D - Quem
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 4,
              endIndex: 5,
            },
            properties: { pixelSize: 140 }, // E - Categoria
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 5,
              endIndex: 6,
            },
            properties: { pixelSize: 320 }, // F - Descrição (wrappable, wider)
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 6,
              endIndex: 7,
            },
            properties: { pixelSize: 160 }, // G - Forma de Pagamento
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 7,
              endIndex: 8,
            },
            properties: { pixelSize: 220 }, // H - Observações (wrappable)
            fields: "pixelSize",
          },
        },

        // Estilo do cabeçalho (azul com texto branco) + vertical alignment
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                },
              },
            },
            fields:
              "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
          },
        },

        // Enable wrapping for Descrição (F) and Observações (H) and center vertical alignment for body
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              startColumnIndex: 5,
              endColumnIndex: 6,
            },
            cell: {
              userEnteredFormat: {
                wrapStrategy: "WRAP",
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              startColumnIndex: 7,
              endColumnIndex: 8,
            },
            cell: {
              userEnteredFormat: {
                wrapStrategy: "WRAP",
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
          },
        },

        // Linhas alternadas (branca e cinza clara)
        {
          addBanding: {
            bandedRange: {
              range: {
                sheetId,
                startRowIndex: 0,
                startColumnIndex: 0,
                endColumnIndex: 8,
              },
              rowProperties: {
                headerColor: { red: 0.2, green: 0.4, blue: 0.8 },
                firstBandColor: { red: 1, green: 1, blue: 1 },
                secondBandColor: { red: 0.95, green: 0.95, blue: 0.95 },
              },
            },
          },
        },
        // Filtro automático no cabeçalho
        {
          setBasicFilter: {
            filter: {
              range: {
                sheetId,
                startRowIndex: 0,
                startColumnIndex: 0,
                endColumnIndex: 8,
              },
            },
          },
        },
      ],
    },
  });

  console.log("✅ Tabela criada e estilizada com sucesso!");
}
