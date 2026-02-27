// @MX:NOTE: [AUTO] TOON conversion script — converts extracted JSON row data to pipe-delimited TOON format
// @MX:NOTE: [AUTO] TOON (Token-Oriented Object Notation) saves 30-60% tokens vs JSON for AI analysis
// @MX:REASON: Re-reading large JSON files repeatedly wastes context tokens; TOON is compact and scannable

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

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
  colorLegend: Record<string, number>;
  columnHeaders: Array<{ col: string; colIndex: number; header: string }>;
  rows: ExtractedRow[];
}

interface ExtractedFile {
  filename: string;
  extractedAt?: string;
  sheets: ExtractedSheet[];
}

/**
 * Simple TOON encoder for uniform row arrays.
 * Format: header1|header2|header3\nval1|val2|val3
 */
function toToon(rows: Array<Record<string, unknown>>): string {
  if (!rows || rows.length === 0) return "";

  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  const lines: string[] = [];
  lines.push(keys.join("|")); // Header line

  for (const row of rows) {
    const values = keys.map((key) => {
      const val = row[key];
      if (val === null || val === undefined) return "";
      if (typeof val === "boolean") return val ? "1" : "0";
      const str = String(val);
      return str.replace(/\|/g, "\\|").replace(/\n/g, " ").replace(/\r/g, "");
    });
    lines.push(values.join("|"));
  }

  return lines.join("\n");
}

function convertFileToToon(
  jsonPath: string,
  outputPath: string,
  label: string
): void {
  const raw = readFileSync(jsonPath, "utf-8");
  const data: ExtractedFile = JSON.parse(raw);

  const toonSections: string[] = [];
  toonSections.push(`# TOON: ${data.filename}`);
  toonSections.push(`# Label: ${label}`);
  toonSections.push(`# Converted: ${new Date().toISOString()}`);
  toonSections.push(
    `# Format: pipe-delimited rows with header; color suffix _clr = background color hex`
  );
  toonSections.push("");

  for (const sheet of data.sheets) {
    if (sheet.rows.length === 0) continue;

    toonSections.push(
      `## Sheet: ${sheet.name} (${sheet.rows.length} rows, ${sheet.columnHeaders.length} cols)`
    );

    // Color legend
    if (Object.keys(sheet.colorLegend ?? {}).length > 0) {
      const topColors = Object.entries(sheet.colorLegend)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
      toonSections.push(
        `## Colors: ${topColors.map(([c, n]) => `#${c}(${n})`).join(", ")}`
      );
    }
    toonSections.push("");

    // Build header map: col letter -> header name
    const headerMap: Record<string, string> = {};
    sheet.columnHeaders.forEach((h) => {
      headerMap[h.col] = h.header;
    });

    // Collect all columns present
    const allCols = Array.from(
      new Set(sheet.rows.flatMap((r) => r.cells.map((c) => c.col)))
    ).sort();

    // Build row objects
    const rowObjects = sheet.rows.map((row) => {
      const obj: Record<string, unknown> = { _row: row.rowIndex };
      for (const col of allCols) {
        const cell = row.cells.find((c) => c.col === col);
        const headerName = headerMap[col] || col;
        // Sanitize header name for TOON (remove newlines)
        const safeHeader = headerName
          .replace(/\n/g, "_")
          .replace(/\r/g, "")
          .replace(/\|/g, "/");
        obj[safeHeader] = cell?.value ?? "";
        // Include color info if present
        if (cell?.bgColor) {
          obj[`${safeHeader}_clr`] = cell.bgColor;
        }
      }
      return obj;
    });

    const toonData = toToon(rowObjects);
    toonSections.push(toonData);
    toonSections.push("");
  }

  const content = toonSections.join("\n");
  writeFileSync(outputPath, content, "utf-8");

  // Report compression stats
  const jsonBytes = Buffer.byteLength(raw, "utf-8");
  const toonBytes = Buffer.byteLength(content, "utf-8");
  const savings = Math.round((1 - toonBytes / jsonBytes) * 100);
  console.log(`  Saved: ${outputPath}`);
  console.log(
    `  Compression: ${(jsonBytes / 1024).toFixed(0)}KB -> ${(toonBytes / 1024).toFixed(0)}KB (~${savings}% reduction)`
  );
}

function main(): void {
  mkdirSync("ref/huni/toon", { recursive: true });

  const files = [
    {
      json: "ref/huni/extracted/상품마스터_extracted.json",
      toon: "ref/huni/toon/product-master.toon",
      label: "Product Master (상품마스터)",
    },
    {
      json: "ref/huni/extracted/가격표_extracted.json",
      toon: "ref/huni/toon/price-table.toon",
      label: "Price Table (가격표)",
    },
    {
      json: "ref/huni/extracted/품목관리_extracted.json",
      toon: "ref/huni/toon/item-management.toon",
      label: "Item Management (품목관리)",
    },
  ];

  console.log("\nConverting JSON -> TOON format for AI analysis...\n");

  for (const file of files) {
    console.log(`Processing: ${file.label}`);
    try {
      convertFileToToon(
        resolve(file.json),
        resolve(file.toon),
        file.label
      );
    } catch (err) {
      console.error(`  ERROR: ${(err as Error).message}`);
    }
  }

  console.log(
    "\nDone! TOON files in ref/huni/toon/ use 30-60% fewer tokens for AI analysis."
  );
}

main();
