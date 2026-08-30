import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const base = path.resolve("saidas_kpi");
const previewDir = path.join(base, "previews");
await fs.mkdir(previewDir, { recursive: true });

const files = [
  "KPI_War_Room_TV_AH_CG_sem_BP.xlsx",
];

for (const file of files) {
  const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(base, file)));
  const table = await wb.inspect({
    kind: "table",
    range: "Dados!A1:P12",
    include: "values,formulas",
    tableMaxRows: 12,
    tableMaxCols: 16,
    maxChars: 5000,
  });
  const errors = await wb.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: "formula error scan",
  });
  const preview = await wb.render({ sheetName: "Dados", autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(previewDir, file.replace(".xlsx", ".png")), new Uint8Array(await preview.arrayBuffer()));
  console.log(`FILE ${file}`);
  console.log(table.ndjson);
  console.log(errors.ndjson);
}
