// @MX:NOTE: [AUTO] Excel extraction script — 1회 실행 후 JSON 기반 작업으로 전환하여 토큰 절감
// Extracts all formatting, colors, merged cells, and notes from Excel files into JSON

import ExcelJS from "exceljs";
import * as fs from "fs";
import * as path from "path";

interface ExtractedCell {
  col: string;
  colIndex: number;
  value: unknown;
  type: string;
  bgColor?: string;
  fontColor?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  isMergedCell?: boolean;
  mergedRef?: string;
  note?: string;
}

interface ExtractedRow {
  rowIndex: number;
  cells: ExtractedCell[];
}

interface ExtractedSheet {
  name: string;
  totalRows: number;
  totalCols: number;
  merges: string[];
  columnHeaders: { col: string; header: string }[];
  colorLegend: Record<string, number>;
  rows: ExtractedRow[];
}

interface ExtractedFile {
  filename: string;
  extractedAt: string;
  sheets: ExtractedSheet[];
}

function colIndexToLetter(index: number): string {
  // index is 1-based
  let result = "";
  let n = index;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function getArgbColor(argb: string | undefined): string | undefined {
  if (!argb) return undefined;
  // ARGB is like "FFFF0000" — remove the alpha (first 2 chars)
  if (argb.length === 8) return argb.slice(2);
  if (argb.length === 6) return argb;
  return undefined;
}

function getCellType(cell: ExcelJS.Cell): string {
  switch (cell.type) {
    case ExcelJS.ValueType.Null:
      return "null";
    case ExcelJS.ValueType.Number:
      return "number";
    case ExcelJS.ValueType.String:
      return "string";
    case ExcelJS.ValueType.Date:
      return "date";
    case ExcelJS.ValueType.Boolean:
      return "boolean";
    case ExcelJS.ValueType.Formula:
      return "formula";
    case ExcelJS.ValueType.Hyperlink:
      return "hyperlink";
    case ExcelJS.ValueType.RichText:
      return "richtext";
    case ExcelJS.ValueType.Error:
      return "error";
    default:
      return "unknown";
  }
}

function getCellValue(cell: ExcelJS.Cell): unknown {
  if (cell.type === ExcelJS.ValueType.Formula) {
    // Return calculated result if available
    const fv = cell.value as ExcelJS.CellFormulaValue;
    return fv.result !== undefined ? fv.result : `=${fv.formula}`;
  }
  if (cell.type === ExcelJS.ValueType.RichText) {
    const rv = cell.value as ExcelJS.CellRichTextValue;
    return rv.richText?.map((t) => t.text).join("") ?? null;
  }
  if (cell.type === ExcelJS.ValueType.Hyperlink) {
    const hv = cell.value as ExcelJS.CellHyperlinkValue;
    return hv.text ?? hv.hyperlink ?? null;
  }
  return cell.value;
}

function isCellEmpty(cell: ExcelJS.Cell): boolean {
  if (cell.type === ExcelJS.ValueType.Null) return true;
  const v = getCellValue(cell);
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  return false;
}

async function extractFile(filePath: string, outputName: string): Promise<void> {
  console.log(`\n=== Extracting: ${path.basename(filePath)} ===`);

  if (!fs.existsSync(filePath)) {
    console.error(`  File not found: ${filePath}`);
    return;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const result: ExtractedFile = {
    filename: path.basename(filePath),
    extractedAt: new Date().toISOString(),
    sheets: [],
  };

  for (const worksheet of workbook.worksheets) {
    console.log(`  Sheet: "${worksheet.name}" (${worksheet.rowCount} rows x ${worksheet.columnCount} cols)`);

    const merges: string[] = [];

    // Collect merge ranges
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mergeRanges: Record<string, string> = {};
    // ExcelJS stores merges in worksheet.mergeCells — access via internal property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = worksheet as any;
    if (ws._merges) {
      for (const [key, mergeRange] of Object.entries(ws._merges)) {
        const rangeStr = typeof mergeRange === "string" ? mergeRange : (mergeRange as any).range ?? key;
        merges.push(rangeStr);
        // Map each cell address in the range to the master cell address
        // key is like "A1:C3" or just the master "A1"
        // We'll populate mergedRef during cell iteration
        (void rangeStr);
      }
    }

    // Also try the public API for merges
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (ws.model && ws.model.merges) {
      for (const mergeRange of ws.model.merges as string[]) {
        if (!merges.includes(mergeRange)) {
          merges.push(mergeRange);
        }
      }
    }

    // Build a lookup: cell address -> master address of its merge range
    for (const mergeRange of merges) {
      const parts = mergeRange.split(":");
      if (parts.length === 2) {
        const masterAddr = parts[0];
        // Parse range to enumerate all cells
        const rangeParsed = worksheet.getCell(mergeRange);
        (void rangeParsed);
        // For now, we mark cells via isMergedCell flag from ExcelJS
        // ExcelJS cell.isMerged = true for cells part of a merge
        // We store the full range as mergedRef
        // We need to figure out which cells are in this range
        // Parse addresses: parts[0] = top-left, parts[1] = bottom-right
        const topLeft = worksheet.getCell(parts[0]);
        const { col: startCol, row: startRow } = topLeft;
        const bottomRight = worksheet.getCell(parts[1]);
        const { col: endCol, row: endRow } = bottomRight;
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const addr = `${colIndexToLetter(c)}${r}`;
            mergeRanges[addr] = masterAddr;
          }
        }
      }
    }

    const colorLegend: Record<string, number> = {};
    const rows: ExtractedRow[] = [];
    let columnHeaders: { col: string; header: string }[] = [];

    const totalRows = worksheet.rowCount;
    const totalCols = worksheet.columnCount;

    // First pass: find column headers (first row with bold cells or first non-empty row)
    let headerRowFound = false;
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (headerRowFound) return;
      const hasBold = row.eachCell && (() => {
        let found = false;
        row.eachCell({ includeEmpty: false }, (cell) => {
          if (cell.font?.bold) found = true;
        });
        return found;
      })();
      // Use this row as header if it has bold cells or it's the first non-empty row
      if (hasBold || rowNumber === 1) {
        const headers: { col: string; header: string }[] = [];
        row.eachCell({ includeEmpty: false }, (cell) => {
          const v = getCellValue(cell);
          if (v !== null && v !== undefined && String(v).trim() !== "") {
            headers.push({
              col: colIndexToLetter(cell.col),
              header: String(v).trim(),
            });
          }
        });
        if (headers.length > 0) {
          columnHeaders = headers;
          headerRowFound = true;
        }
      }
    });

    // Second pass: extract all non-empty rows
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: ExtractedCell[] = [];
      let hasNonEmpty = false;

      row.eachCell({ includeEmpty: true }, (cell) => {
        if (isCellEmpty(cell) && !cell.fill && !cell.font?.color) return;

        const colLetter = colIndexToLetter(cell.col);
        const addr = `${colLetter}${rowNumber}`;

        // Background color
        let bgColor: string | undefined;
        const fill = cell.fill as ExcelJS.FillPattern | undefined;
        if (fill?.type === "pattern") {
          bgColor = getArgbColor(fill.fgColor?.argb) ?? getArgbColor(fill.bgColor?.argb);
        }

        // Font color
        const fontColor = getArgbColor(cell.font?.color?.argb);

        // Note / comment
        let note: string | undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cellAny = cell as any;
        if (cellAny.note) {
          if (typeof cellAny.note === "string") {
            note = cellAny.note;
          } else if (cellAny.note?.texts) {
            note = cellAny.note.texts.map((t: { text?: string }) => t.text ?? "").join("");
          } else if (cellAny.note?.richText) {
            note = cellAny.note.richText.map((t: { text?: string }) => t.text ?? "").join("");
          }
        }

        const isEmpty = isCellEmpty(cell);
        if (!isEmpty) hasNonEmpty = true;

        // Track bgColor in legend
        if (bgColor && bgColor !== "FFFFFF" && bgColor !== "000000") {
          colorLegend[bgColor] = (colorLegend[bgColor] ?? 0) + 1;
        }

        const extractedCell: ExtractedCell = {
          col: colLetter,
          colIndex: cell.col,
          value: getCellValue(cell),
          type: getCellType(cell),
        };

        if (bgColor) extractedCell.bgColor = bgColor;
        if (fontColor) extractedCell.fontColor = fontColor;
        if (cell.font?.bold) extractedCell.fontBold = true;
        if (cell.font?.italic) extractedCell.fontItalic = true;
        if (cell.isMerged) {
          extractedCell.isMergedCell = true;
          if (mergeRanges[addr]) {
            extractedCell.mergedRef = mergeRanges[addr];
          }
        }
        if (note) extractedCell.note = note;

        // Only include cell if it has value OR formatting info
        if (!isEmpty || bgColor || note) {
          cells.push(extractedCell);
        }
      });

      if (hasNonEmpty || cells.length > 0) {
        rows.push({ rowIndex: rowNumber, cells });
      }
    });

    const sheet: ExtractedSheet = {
      name: worksheet.name,
      totalRows,
      totalCols,
      merges,
      columnHeaders,
      colorLegend,
      rows,
    };

    result.sheets.push(sheet);
    console.log(`    -> ${rows.length} non-empty rows, ${merges.length} merge ranges, ${Object.keys(colorLegend).length} distinct colors`);
    console.log(`    -> Headers: ${columnHeaders.map((h) => h.header).join(", ").slice(0, 100)}`);
  }

  const outputPath = path.join(__dirname, "..", "ref", "huni", "extracted", `${outputName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

  const stats = fs.statSync(outputPath);
  console.log(`  Saved to: ${outputPath}`);
  console.log(`  File size: ${(stats.size / 1024).toFixed(1)} KB`);
}

async function main(): Promise<void> {
  const baseDir = path.join(__dirname, "..", "ref", "huni");

  const files = [
    {
      path: path.join(baseDir, "후니프린팅_상품마스터_260209.xlsx"),
      output: "상품마스터_extracted",
    },
    {
      path: path.join(baseDir, "후니프린팅_인쇄상품_가격표_260214.xlsx"),
      output: "가격표_extracted",
    },
    {
      path: path.join(baseDir, "품목관리.xlsx"),
      output: "품목관리_extracted",
    },
  ];

  console.log("Starting Excel extraction...");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  for (const file of files) {
    await extractFile(file.path, file.output);
  }

  console.log("\nExtraction complete.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
