import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "C:/Users/ROMULO_LIRA/Documents/ChatGPT/Automacao-Planilha/outputs/3-indicadores-normalizado-20260827/3-indicadores_normalizado.xlsx";
const outputDir = "C:/Users/ROMULO_LIRA/Documents/ChatGPT/Automacao-Planilha/outputs/3-indicadores-separados-20260827";
const previewDir = `${outputDir}/previews`;

const sourceWb = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));

const configs = [
  {
    sourceSheet: "Task Cost Reduction",
    fileName: "KPI_Task_Cost_Reduction_Logistics.xlsx",
    sheetName: "Task Cost Reduction",
    range: "A1:H33",
    endCol: "H",
    summaryEndCol: "E",
    statusCol: "H",
    numberFormats: [
      ["D5:E28", "#,##0"],
      ["F5:F28", "0.0%"],
      ["B32:C33", "#,##0"],
      ["D32:D33", "0.0%"],
    ],
    widths: { A: 15, B: 12, C: 10, D: 17, E: 17, F: 15, G: 16, H: 16 },
  },
  {
    sourceSheet: "Demurrage Cost TV",
    fileName: "KPI_Demurrage_Cost_TV.xlsx",
    sheetName: "Demurrage Cost TV",
    range: "A1:I33",
    endCol: "I",
    summaryEndCol: "D",
    statusCol: "I",
    numberFormats: [
      ["D5:E28", "#,##0"],
      ["F5:F28", '"$"#,##0.00'],
      ["B32:C33", "#,##0"],
      ["D32:D33", '"$"#,##0.00'],
    ],
    widths: { A: 15, B: 12, C: 10, D: 16, E: 16, F: 19, G: 16, H: 16, I: 16 },
  },
  {
    sourceSheet: "Resin Consolidation",
    fileName: "KPI_Logistics_Cost_Resin_Consolidation.xlsx",
    sheetName: "Resin Consolidation",
    range: "A1:J33",
    endCol: "J",
    summaryEndCol: "G",
    statusCol: "J",
    numberFormats: [
      ["D5:E28", "#,##0"],
      ["F5:I28", '"$"#,##0.00'],
      ["B32:C33", "#,##0"],
      ["D32:G33", '"$"#,##0.00'],
    ],
    widths: { A: 13, B: 12, C: 10, D: 16, E: 19, F: 21, G: 23, H: 22, I: 21, J: 14 },
  },
];

const colIndexToName = (index) => {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

for (const cfg of configs) {
  const srcSheet = sourceWb.worksheets.getItem(cfg.sourceSheet);
  const srcRange = srcSheet.getRange(cfg.range);
  const values = srcRange.values;
  const formulas = srcRange.formulas;

  const wb = Workbook.create();
  const sheet = wb.worksheets.add(cfg.sheetName);
  sheet.getRange(cfg.range).values = values;

  for (let r = 0; r < formulas.length; r++) {
    for (let c = 0; c < formulas[r].length; c++) {
      const formula = formulas[r][c];
      if (typeof formula === "string" && formula.startsWith("=")) {
        sheet.getRange(`${colIndexToName(c)}${r + 1}`).formulas = [[formula]];
      }
    }
  }

  sheet.mergeCells(`A1:${cfg.endCol}1`);
  sheet.mergeCells(`A2:${cfg.endCol}2`);
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(4);

  sheet.getRange(`A1:${cfg.endCol}1`).format = {
    fill: "#17365D",
    font: { bold: true, color: "#FFFFFF", size: 15 },
    verticalAlignment: "center",
  };
  sheet.getRange(`A1:${cfg.endCol}1`).format.rowHeight = 28;
  sheet.getRange(`A2:${cfg.endCol}2`).format = {
    fill: "#D9EAF7",
    font: { italic: true, color: "#404040" },
    wrapText: true,
  };
  sheet.getRange(`A2:${cfg.endCol}2`).format.rowHeight = 34;

  for (const [headerRow, headerEndCol] of [[4, cfg.endCol], [31, cfg.summaryEndCol]]) {
    sheet.getRange(`A${headerRow}:${headerEndCol}${headerRow}`).format = {
      fill: "#1F4E78",
      font: { bold: true, color: "#FFFFFF" },
      horizontalAlignment: "center",
      verticalAlignment: "center",
      wrapText: true,
      borders: { preset: "all", style: "thin", color: "#A6A6A6" },
    };
    sheet.getRange(`A${headerRow}:${headerEndCol}${headerRow}`).format.rowHeight = 28;
  }

  sheet.getRange(`A5:${cfg.endCol}28`).format.borders = { preset: "all", style: "thin", color: "#D9E1F2" };
  sheet.getRange(`A32:${cfg.summaryEndCol}33`).format.borders = { preset: "all", style: "thin", color: "#D9E1F2" };
  const body = sheet.getRange(`A5:${cfg.endCol}28`);
  body.conditionalFormats.addCustom(`=$${cfg.statusCol}5="Estimado"`, { fill: "#FFF2CC" });
  body.conditionalFormats.addCustom(`=$${cfg.statusCol}5="Informado"`, { fill: "#E2F0D9" });

  for (const [address, format] of cfg.numberFormats) sheet.getRange(address).format.numberFormat = format;
  for (const [col, width] of Object.entries(cfg.widths)) sheet.getRange(`${col}:${col}`).format.columnWidth = width;

  const errors = await wb.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: `formula errors - ${cfg.sheetName}`,
    maxChars: 3000,
  });
  const check = await wb.inspect({
    kind: "table",
    range: `${cfg.sheetName}!${cfg.range}`,
    include: "values,formulas",
    tableMaxRows: 35,
    tableMaxCols: 10,
    maxChars: 12000,
  });
  console.log(`${cfg.fileName}\n${errors.ndjson}\n${check.ndjson}`);

  const preview = await wb.render({ sheetName: cfg.sheetName, autoCrop: "all", scale: 1.2, format: "png" });
  await fs.writeFile(`${previewDir}/${cfg.fileName.replace(/\.xlsx$/i, ".png")}`, new Uint8Array(await preview.arrayBuffer()));

  const output = await SpreadsheetFile.exportXlsx(wb);
  await output.save(`${outputDir}/${cfg.fileName}`);
}

console.log(`OUTPUT_DIR=${outputDir}`);
