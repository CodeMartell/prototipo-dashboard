import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = "C:/Users/ROMULO_LIRA/Desktop/dados-reais/3-indicadores.xlsx";
const previewDir = "C:/Users/ROMULO_LIRA/Documents/ChatGPT/Automacao-Planilha/tmp_3_indicadores_preview";

await fs.mkdir(previewDir, { recursive: true });
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));

const sheets = await workbook.inspect({
  kind: "sheet",
  include: "id,name",
  maxChars: 12000,
});
console.log("SHEETS");
console.log(sheets.ndjson);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 20000,
  tableMaxRows: 30,
  tableMaxCols: 30,
  tableMaxCellChars: 100,
});
console.log("OVERVIEW");
console.log(overview.ndjson);

for (let i = 0; i < workbook.worksheets.items.length; i++) {
  const sheet = workbook.worksheets.getItemAt(i);
  const used = sheet.getUsedRange();
  console.log(`USED ${i} ${sheet.name}: ${used?.address ?? "empty"}`);
  if (!used) continue;
  const region = await workbook.inspect({
    kind: "region",
    sheetId: sheet.name,
    range: used.address,
    maxChars: 30000,
    tableMaxRows: 200,
    tableMaxCols: 80,
    tableMaxCellChars: 100,
  });
  console.log(`REGION ${sheet.name}`);
  console.log(region.ndjson);
  const image = await workbook.render({
    sheetName: sheet.name,
    autoCrop: "all",
    scale: 1.2,
    format: "png",
  });
  await fs.writeFile(`${previewDir}/sheet_${String(i + 1).padStart(2, "0")}.png`, new Uint8Array(await image.arrayBuffer()));
}
