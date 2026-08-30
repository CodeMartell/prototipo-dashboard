import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/ROMULO_LIRA/Documents/ChatGPT/Automacao-Planilha/outputs/3-indicadores-normalizado-20260827";
const outputPath = `${outputDir}/3-indicadores_normalizado.xlsx`;
const previewDir = `${outputDir}/previews`;

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const taskTarget25 = [1108, 1111, 996, 825, 786, 933, 933, 933, 933, 786, 786, 786];
const taskResult25 = [1108, 1111, 982, 832, 828, 1058, 1061, 861, 798, 769, 615, 690];
const taskTarget26Known = [750, 750, 641, 621, 621, 641, 661];

const demResult25 = [3, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0];
const demUsd25 = [500, 0, 0, 0, 0, 0, 0, 425, 0, 0, 0, 0];

const resin40_25 = [2, 3, 5, 14, 9, 5, 4, 3, 4, 5, 6, 5];
const resin20_25 = [1, 2, 3, 7, 5, 3, 2, 2, 2, 3, 3, 3];
const resinGross25 = [4.0, 5.9, 9.9, 27.7, 17.8, 9.9, 7.9, 5.9, 7.9, 9.9, 11.9, 9.9];
const resinCost25 = [0.88, 1.41, 2.55, 6.12, 2.78, 2.42, 0.88, 1.60, 1.90, 2.09, 2.39, 1.86];
const resinTax25 = [0.30, 0.48, 0.88, 2.10, 0.96, 0.83, 0.30, 0.55, 0.65, 0.72, 0.82, 0.64];
const resinSaving25 = [2.8, 4.0, 6.5, 19.5, 14.1, 6.6, 6.7, 3.8, 5.4, 7.1, 8.7, 7.4];
const resin40_26Known = [6, 9, 6, 8];
const resin20_26Known = [3, 5, 3, 4];
const resinGross26Known = [11.87, 17.81, 11.87, 15.83];
const resinCost26Known = [2.32, 3.83, 2.19, 3.34];
const resinTax26Known = [0.80, 1.32, 0.75, 1.15];
const resinSaving26Known = [8.75, 12.66, 8.93, 11.34];

const wb = Workbook.create();
const normalized = wb.worksheets.add("Dados_Normalizados");
const task = wb.worksheets.add("Task Cost Reduction");
const dem = wb.worksheets.add("Demurrage Cost TV");
const resin = wb.worksheets.add("Resin Consolidation");
const method = wb.worksheets.add("Metodologia");

const colors = {
  navy: "#17365D",
  blue: "#1F4E78",
  teal: "#0F6B78",
  header: "#D9EAF7",
  input: "#E2F0D9",
  estimate: "#FFF2CC",
  gray: "#E7E6E6",
  white: "#FFFFFF",
  red: "#C00000",
};

function title(sheet, text, subtitle, endCol = "I") {
  sheet.mergeCells(`A1:${endCol}1`);
  sheet.getRange("A1").values = [[text]];
  sheet.getRange(`A1:${endCol}1`).format = {
    fill: colors.navy,
    font: { bold: true, color: colors.white, size: 15 },
    verticalAlignment: "center",
  };
  sheet.getRange(`A1:${endCol}1`).format.rowHeight = 28;
  sheet.mergeCells(`A2:${endCol}2`);
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A2:${endCol}2`).format = {
    fill: colors.header,
    font: { italic: true, color: "#404040" },
    wrapText: true,
  };
  sheet.getRange(`A2:${endCol}2`).format.rowHeight = 34;
  sheet.showGridLines = false;
}

function styleHeader(range) {
  range.format = {
    fill: colors.blue,
    font: { bold: true, color: colors.white },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#A6A6A6" },
  };
  range.format.rowHeight = 28;
}

function styleBody(range) {
  range.format.borders = { preset: "all", style: "thin", color: "#D9E1F2" };
  range.format.verticalAlignment = "center";
}

function markStatus(sheet, rangeAddress, statusColLetter) {
  const range = sheet.getRange(rangeAddress);
  range.conditionalFormats.addCustom(`=$${statusColLetter}5="Estimado"`, { fill: colors.estimate });
  range.conditionalFormats.addCustom(`=$${statusColLetter}5="Informado"`, { fill: colors.input });
}

// Task Cost Reduction
title(task, "Task Cost Reduction (Logistics) — Internal Operation", "Truck Head / Reachstacker / Chassis | Valores em KBRL | Campos ausentes de 2026 estimados e identificados", "H");
task.getRange("A4:H4").values = [["Ano", "Mês nº", "Mês", "Target (KBRL)", "Result (KBRL)", "Atingimento", "Status Target", "Status Result"]];
styleHeader(task.getRange("A4:H4"));

const taskRows = [];
for (let m = 0; m < 12; m++) taskRows.push([2025, m + 1, months[m], taskTarget25[m], taskResult25[m], null, "Informado", "Informado"]);
for (let m = 0; m < 12; m++) taskRows.push([2026, m + 1, months[m], m < 7 ? taskTarget26Known[m] : null, m === 0 ? 720 : null, null, m < 7 ? "Informado" : "Estimado", m === 0 ? "Informado" : "Estimado"]);
task.getRange("A5:H28").values = taskRows;
for (let r = 5; r <= 16; r++) task.getRange(`F${r}`).formulas = [[`=IFERROR(E${r}/D${r},0)`]];
for (let r = 17; r <= 28; r++) {
  const m = r - 17;
  if (m >= 7) task.getRange(`D${r}`).formulas = [[`=ROUND(D${5 + m}*SUM($D$17:$D$23)/SUM($D$5:$D$11),0)`]];
  if (m >= 1) task.getRange(`E${r}`).formulas = [[`=ROUND(D${r}*E${5 + m}/D${5 + m},0)`]];
  task.getRange(`F${r}`).formulas = [[`=IFERROR(E${r}/D${r},0)`]];
}
styleBody(task.getRange("A5:H28"));
task.getRange("D5:E28").format.numberFormat = "#,##0";
task.getRange("F5:F28").format.numberFormat = "0.0%";
markStatus(task, "A5:H28", "H");
task.getRange("A31:E31").values = [["Ano", "Target Total", "Result Total", "Atingimento", "Observação"]];
styleHeader(task.getRange("A31:E31"));
task.getRange("A32:A33").values = [[2025], [2026]];
task.getRange("B32:D32").formulas = [["=SUM(D5:D16)", "=SUM(E5:E16)", "=IFERROR(C32/B32,0)"]];
task.getRange("B33:D33").formulas = [["=SUM(D17:D28)", "=SUM(E17:E28)", "=IFERROR(C33/B33,0)"]];
task.getRange("E32:E33").values = [["Dados informados no arquivo de origem"], ["Inclui estimativas identificadas para campos faltantes"]];
styleBody(task.getRange("A32:E33"));
task.getRange("B32:C33").format.numberFormat = "#,##0";
task.getRange("D32:D33").format.numberFormat = "0.0%";
task.freezePanes.freezeRows(4);
task.getRange("A:H").format.columnWidth = 15;
task.getRange("C:C").format.columnWidth = 10;
task.getRange("G:H").format.columnWidth = 16;

// Demurrage
title(dem, "KPI — Demurrage Cost (TV)", "Target e Result em quantidade de contêineres; gasto em USD. Lacunas Jul–Dez/2026 preenchidas com zero esperado e identificadas como estimativa.", "I");
dem.getRange("A4:I4").values = [["Ano", "Mês nº", "Mês", "Target (CTNR)", "Result (CTNR)", "Valor gasto (USD)", "Status Target", "Status Result", "Status USD"]];
styleHeader(dem.getRange("A4:I4"));
const demRows = [];
for (let m = 0; m < 12; m++) demRows.push([2025, m + 1, months[m], 0, demResult25[m], demUsd25[m], "Informado", "Informado", "Informado"]);
for (let m = 0; m < 12; m++) demRows.push([2026, m + 1, months[m], 0, 0, 0, "Informado", m < 6 ? "Informado" : "Estimado", m < 6 ? "Informado" : "Estimado"]);
dem.getRange("A5:I28").values = demRows;
styleBody(dem.getRange("A5:I28"));
dem.getRange("D5:E28").format.numberFormat = "#,##0";
dem.getRange("F5:F28").format.numberFormat = '"$"#,##0.00';
markStatus(dem, "A5:I28", "I");
dem.getRange("A31:D31").values = [["Ano", "Target Total", "Result Total", "Valor gasto total (USD)"]];
styleHeader(dem.getRange("A31:D31"));
dem.getRange("A32:A33").values = [[2025], [2026]];
dem.getRange("B32:D32").formulas = [["=SUM(D5:D16)", "=SUM(E5:E16)", "=SUM(F5:F16)"]];
dem.getRange("B33:D33").formulas = [["=SUM(D17:D28)", "=SUM(E17:E28)", "=SUM(F17:F28)"]];
styleBody(dem.getRange("A32:D33"));
dem.getRange("D32:D33").format.numberFormat = '"$"#,##0.00';
dem.freezePanes.freezeRows(4);
dem.getRange("A:I").format.columnWidth = 15;
dem.getRange("F:F").format.columnWidth = 19;

// Resin Consolidation
title(resin, "Logistics Cost Resin Consolidation", "Valores financeiros em KUSD. Quantidades ausentes de 2026 seguem a sazonalidade de 2025 ajustada pelo desempenho Jan–Abr/2026; valores derivados permanecem em fórmulas.", "J");
resin.getRange("A4:J4").values = [["Ano", "Mês nº", "Mês", "CTNs 40 ft", "CTNs Saving 20 ft", "Saving Valor (KUSD)", "Consolidation Costs (KUSD)", "BR Tax 34,39% (KUSD)", "Saving líquido (KUSD)", "Status"]];
styleHeader(resin.getRange("A4:J4"));
const resinRows = [];
for (let m = 0; m < 12; m++) resinRows.push([2025, m + 1, months[m], resin40_25[m], resin20_25[m], resinGross25[m], resinCost25[m], resinTax25[m], resinSaving25[m], "Informado"]);
for (let m = 0; m < 12; m++) resinRows.push([2026, m + 1, months[m], m < 4 ? resin40_26Known[m] : null, m < 4 ? resin20_26Known[m] : null, m < 4 ? resinGross26Known[m] : null, m < 4 ? resinCost26Known[m] : null, m < 4 ? resinTax26Known[m] : null, m < 4 ? resinSaving26Known[m] : null, m < 4 ? "Informado" : "Estimado"]);
resin.getRange("A5:J28").values = resinRows;
for (let r = 17; r <= 28; r++) {
  const m = r - 17;
  if (m >= 4) {
    resin.getRange(`D${r}`).formulas = [[`=ROUND(D${5 + m}*SUM($D$17:$D$20)/SUM($D$5:$D$8),0)`]];
    resin.getRange(`E${r}`).formulas = [[`=ROUND(E${5 + m}*SUM($E$17:$E$20)/SUM($E$5:$E$8),0)`]];
    resin.getRange(`G${r}`).formulas = [[`=ROUND(D${r}*SUM($G$17:$G$20)/SUM($D$17:$D$20),2)`]];
    resin.getRange(`F${r}`).formulas = [[`=ROUND(E${r}*3.958,2)`]];
    resin.getRange(`H${r}`).formulas = [[`=ROUND(G${r}*34.39%,2)`]];
    resin.getRange(`I${r}`).formulas = [[`=ROUND(F${r}-G${r}-H${r},2)`]];
  }
}
styleBody(resin.getRange("A5:J28"));
resin.getRange("D5:E28").format.numberFormat = "#,##0";
resin.getRange("F5:I28").format.numberFormat = '"$"#,##0.00';
markStatus(resin, "A5:J28", "J");
resin.getRange("A31:G31").values = [["Ano", "CTNs 40 ft", "CTNs Saving 20 ft", "Saving Valor", "Costs", "BR Tax", "Saving líquido"]];
styleHeader(resin.getRange("A31:G31"));
resin.getRange("A32:A33").values = [[2025], [2026]];
resin.getRange("B32:G32").formulas = [["=SUM(D5:D16)", "=SUM(E5:E16)", "=SUM(F5:F16)", "=SUM(G5:G16)", "=SUM(H5:H16)", "=SUM(I5:I16)"]];
resin.getRange("B33:G33").formulas = [["=SUM(D17:D28)", "=SUM(E17:E28)", "=SUM(F17:F28)", "=SUM(G17:G28)", "=SUM(H17:H28)", "=SUM(I17:I28)"]];
styleBody(resin.getRange("A32:G33"));
resin.getRange("B32:C33").format.numberFormat = "#,##0";
resin.getRange("D32:G33").format.numberFormat = '"$"#,##0.00';
resin.freezePanes.freezeRows(4);
resin.getRange("A:J").format.columnWidth = 16;
resin.getRange("F:I").format.columnWidth = 21;

// Normalized long-form extract
title(normalized, "Base normalizada — 3 indicadores logísticos", "Uma linha por indicador, métrica, ano e mês. Ideal para filtros, Power Query, Python, BI ou exportação CSV.", "I");
normalized.getRange("A4:I4").values = [["Indicador", "Métrica", "Ano", "Mês nº", "Mês", "Valor", "Unidade", "Status do dado", "Origem / método"]];
styleHeader(normalized.getRange("A4:I4"));

const normalizedRows = [];
function addMetric(indicator, metric, unit, sheetName, col, statuses, methodText) {
  for (let i = 0; i < 24; i++) {
    const detailRow = 5 + i;
    normalizedRows.push([
      indicator,
      metric,
      i < 12 ? 2025 : 2026,
      (i % 12) + 1,
      months[i % 12],
      `='${sheetName}'!${col}${detailRow}`,
      unit,
      statuses[i],
      statuses[i] === "Informado" ? "Arquivo 3-indicadores.xlsx" : methodText,
    ]);
  }
}

const informed24 = Array(24).fill("Informado");
const taskTargetStatus = [...Array(12).fill("Informado"), ...Array(7).fill("Informado"), ...Array(5).fill("Estimado")];
const taskResultStatus = [...Array(12).fill("Informado"), "Informado", ...Array(11).fill("Estimado")];
addMetric("Task Cost Reduction (Logistics)", "Target", "KBRL", "Task Cost Reduction", "D", taskTargetStatus, "Sazonalidade 2025 × razão Target Jan–Jul 2026/2025");
addMetric("Task Cost Reduction (Logistics)", "Result", "KBRL", "Task Cost Reduction", "E", taskResultStatus, "Target 2026 × atingimento do mesmo mês de 2025");
addMetric("Task Cost Reduction (Logistics)", "Atingimento", "%", "Task Cost Reduction", "F", taskResultStatus, "Result / Target");

const demTargetStatus = informed24;
const demActualStatus = [...Array(18).fill("Informado"), ...Array(6).fill("Estimado")];
addMetric("KPI - Demurrage Cost (TV)", "Target", "CTNR", "Demurrage Cost TV", "D", demTargetStatus, "Meta zero preservada");
addMetric("KPI - Demurrage Cost (TV)", "Result", "CTNR", "Demurrage Cost TV", "E", demActualStatus, "Zero esperado, coerente com Jan–Jun/2026 e meta");
addMetric("KPI - Demurrage Cost (TV)", "Valor gasto", "USD", "Demurrage Cost TV", "F", demActualStatus, "Zero esperado quando Result = 0");

const resinStatus = [...Array(16).fill("Informado"), ...Array(8).fill("Estimado")];
addMetric("Logistics Cost Resin Consolidation", "QTY Consolidated CTNs 40 ft", "CTNR", "Resin Consolidation", "D", resinStatus, "Sazonalidade 2025 × razão Jan–Abr 2026/2025");
addMetric("Logistics Cost Resin Consolidation", "QTY Consolidated CTNs Saving 20 ft", "CTNR", "Resin Consolidation", "E", resinStatus, "Sazonalidade 2025 × razão Jan–Abr 2026/2025");
addMetric("Logistics Cost Resin Consolidation", "Saving Valor", "KUSD", "Resin Consolidation", "F", resinStatus, "QTY Saving 20 ft × USD 3.958 / 1.000");
addMetric("Logistics Cost Resin Consolidation", "Top Global Consolidation Costs", "KUSD", "Resin Consolidation", "G", resinStatus, "CTNs 40 ft × custo médio ponderado Jan–Abr/2026");
addMetric("Logistics Cost Resin Consolidation", "BR Tax 34,39%", "KUSD", "Resin Consolidation", "H", resinStatus, "Consolidation Costs × 34,39%");
addMetric("Logistics Cost Resin Consolidation", "Saving líquido", "KUSD", "Resin Consolidation", "I", resinStatus, "Saving Valor − Costs − BR Tax");

const dataValues = normalizedRows.map((r) => [r[0], r[1], r[2], r[3], r[4], null, r[6], r[7], r[8]]);
normalized.getRange(`A5:I${4 + dataValues.length}`).values = dataValues;
for (let i = 0; i < normalizedRows.length; i++) normalized.getRange(`F${5 + i}`).formulas = [[normalizedRows[i][5]]];
styleBody(normalized.getRange(`A5:I${4 + dataValues.length}`));
normalized.getRange(`F5:F${4 + dataValues.length}`).format.numberFormat = "#,##0.00";
normalized.getRange(`A4:I${4 + dataValues.length}`).format.wrapText = false;
normalized.tables.add(`A4:I${4 + dataValues.length}`, true, "DadosNormalizadosTable").style = "TableStyleMedium2";
normalized.freezePanes.freezeRows(4);
normalized.getRange("A:A").format.columnWidth = 35;
normalized.getRange("B:B").format.columnWidth = 36;
normalized.getRange("C:E").format.columnWidth = 11;
normalized.getRange("F:H").format.columnWidth = 16;
normalized.getRange("I:I").format.columnWidth = 55;

// Methodology and audit trail
title(method, "Metodologia e rastreabilidade", "O arquivo original foi preservado. Todas as estimativas estão explicitamente marcadas e podem ser substituídas quando os valores reais estiverem disponíveis.", "F");
method.getRange("A4:F4").values = [["Indicador", "Campos completados", "Período", "Método", "Premissa", "Observação"]];
styleHeader(method.getRange("A4:F4"));
method.getRange("A5:F8").values = [
  ["Task Cost Reduction", "Target", "Ago–Dez/2026", "Sazonalidade 2025 ajustada", "Razão Target Jan–Jul 2026 / Jan–Jul 2025", "Arredondado para KBRL inteiro"],
  ["Task Cost Reduction", "Result", "Fev–Dez/2026", "Atingimento do mesmo mês de 2025", "Result estimado = Target 2026 × Result 2025 / Target 2025", "Jan/2026 preservado em 720 KBRL"],
  ["Demurrage Cost (TV)", "Result e USD", "Jul–Dez/2026", "Zero esperado", "Jan–Jun/2026 sem ocorrência e target igual a zero", "Trocar por valores reais se ocorrer demurrage"],
  ["Resin Consolidation", "Todos os campos", "Mai–Dez/2026", "Sazonalidade + fórmulas operacionais", "Volumes ajustados pelo ritmo Jan–Abr; Saving = valor bruto − custos − impostos", "Taxa BR preservada em 34,39%"],
];
styleBody(method.getRange("A5:F8"));
method.getRange("A11:B16").values = [
  ["Parâmetro", "Valor"],
  ["Arquivo fonte", "C:/Users/ROMULO_LIRA/Desktop/dados-reais/3-indicadores.xlsx"],
  ["Data de preparação", "2026-08-27"],
  ["Valor unitário Saving 20 ft", "USD 3.958 por CTN"],
  ["BR Tax", 0.3439],
  ["Legenda", "Verde = informado | Amarelo = estimado"],
];
styleHeader(method.getRange("A11:B11"));
styleBody(method.getRange("A12:B16"));
method.getRange("B15").format.numberFormat = "0.00%";
method.getRange("A:A").format.columnWidth = 28;
method.getRange("B:B").format.columnWidth = 34;
method.getRange("C:C").format.columnWidth = 18;
method.getRange("D:F").format.columnWidth = 42;
method.getRange("A4:F16").format.wrapText = true;

await fs.mkdir(previewDir, { recursive: true });
for (const sheet of wb.worksheets.items) {
  const preview = await wb.render({ sheetName: sheet.name, autoCrop: "all", scale: 1.15, format: "png" });
  await fs.writeFile(`${previewDir}/${sheet.name.replace(/[^a-z0-9]+/gi, "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const checks = {
  normalized: (await wb.inspect({ kind: "table", range: "Dados_Normalizados!A1:I20", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 9, maxChars: 10000 })).ndjson,
  task: (await wb.inspect({ kind: "table", range: "'Task Cost Reduction'!A1:H33", include: "values,formulas", tableMaxRows: 35, tableMaxCols: 8, maxChars: 15000 })).ndjson,
  demurrage: (await wb.inspect({ kind: "table", range: "'Demurrage Cost TV'!A1:I33", include: "values,formulas", tableMaxRows: 35, tableMaxCols: 9, maxChars: 15000 })).ndjson,
  resin: (await wb.inspect({ kind: "table", range: "'Resin Consolidation'!A1:J33", include: "values,formulas", tableMaxRows: 35, tableMaxCols: 10, maxChars: 18000 })).ndjson,
  errors: (await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan", maxChars: 8000 })).ndjson,
};
console.log(JSON.stringify(checks, null, 2));

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(outputPath);
console.log(`OUTPUT=${outputPath}`);
