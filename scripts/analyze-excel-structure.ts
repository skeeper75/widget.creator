// @MX:NOTE: [AUTO] Excel structure analysis script — reads extracted JSONs and produces DB mapping suggestions

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

interface ColumnAnalysis {
  col: string;
  header: string;
  dataTypes: Record<string, number>;
  sampleValues: unknown[];
  nullCount: number;
  totalCount: number;
  suggestedDbField: string;
  suggestedDbType: string;
}

interface SheetAnalysis {
  sheetName: string;
  totalRows: number;
  totalCols: number;
  mergeCount: number;
  colorDistribution: { color: string; count: number; meaning?: string }[];
  columns: ColumnAnalysis[];
  suggestedTable: string;
}

interface FileAnalysis {
  filename: string;
  sheets: SheetAnalysis[];
}

// Convert Korean/mixed header to a potential DB field name
function suggestDbField(header: string): string {
  // Remove special chars, replace spaces with underscores
  const cleaned = header
    .replace(/[()（）\[\]【】]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_가-힣]/g, "")
    .trim();

  // Korean keyword mappings
  const mappings: Record<string, string> = {
    구분: "category",
    ID: "id",
    코드: "code",
    code: "code",
    상품명: "product_name",
    품목명: "item_name",
    품목코드: "item_code",
    "MES ITEM_CD": "mes_item_code",
    "MESITEM_CD": "mes_item_code",
    사이즈: "size",
    종이: "paper",
    용지: "paper",
    가격: "price",
    단가: "unit_price",
    수량: "quantity",
    비고: "note",
    상태: "status",
    사용유무: "is_active",
    단위: "unit",
    품목그룹: "item_group",
    품목유형: "item_type",
    색상: "color",
    제본: "binding",
    인쇄: "print",
    후가공: "finishing",
    파일사양: "file_spec",
    주문방법: "order_method",
    "재단사이즈": "cut_size",
    "작업사이즈": "work_size",
  };

  // Check exact matches in mappings
  for (const [k, v] of Object.entries(mappings)) {
    if (header.includes(k)) return v;
  }

  // Fallback: convert to snake_case ASCII
  return cleaned
    .replace(/[가-힣]+/g, (m) => m) // keep Korean as-is for now
    .toLowerCase()
    .replace(/\s+/g, "_")
    .slice(0, 50);
}

function suggestDbType(dataTypes: Record<string, number>, header: string): string {
  const total = Object.values(dataTypes).reduce((a, b) => a + b, 0);
  if (total === 0) return "TEXT";

  const numCount = dataTypes["number"] ?? 0;
  const dateCount = dataTypes["date"] ?? 0;
  const boolCount = dataTypes["boolean"] ?? 0;

  if (header.toLowerCase().includes("date") || header.includes("일자") || header.includes("날짜") || dateCount > total * 0.5) {
    return "TIMESTAMP";
  }
  if (boolCount > total * 0.5 || header.includes("사용유무") || header.includes("여부")) {
    return "BOOLEAN";
  }
  if (numCount > total * 0.8) {
    return "NUMERIC";
  }
  return "TEXT";
}

// Suggest table name based on sheet name
function suggestTableName(sheetName: string): string {
  const mappings: Record<string, string> = {
    MAP: "product_category_map",
    디지털인쇄용지: "digital_paper_specs",
    디지털인쇄: "digital_print_products",
    스티커: "sticker_products",
    책자: "booklet_products",
    포토북: "photobook_products",
    캘린더: "calendar_products",
    디자인캘린더: "design_calendar_products",
    실사: "large_format_products",
    아크릴: "acrylic_products",
    굿즈: "goods_products",
    "문구(노트)": "stationery_products",
    상품악세사리: "product_accessories",
    "사이즈별 판걸이수": "size_plate_count",
    디지털용지: "digital_paper_prices",
    디지털출력비: "digital_print_costs",
    디지털출력비가수정: "digital_print_costs_v2",
    "후가공_박": "finishing_foil_costs",
    "후가공_박명함": "finishing_foil_card_costs",
    후가공: "finishing_costs",
    명함: "business_card_prices",
    옵션결합상품: "bundle_products",
    제본: "binding_costs",
    "포스터(실사)": "poster_large_format_prices",
    사인: "signage_prices",
    파우치: "pouch_prices",
    Sheet: "mes_items",
    Sheet2: "mes_item_types",
  };

  return mappings[sheetName] ?? sheetName.replace(/\s+/g, "_").toLowerCase();
}

function analyzeSheet(sheet: ExtractedSheet): SheetAnalysis {
  // Build column index: col letter -> header
  const headerMap = new Map<string, string>();
  for (const h of sheet.columnHeaders) {
    headerMap.set(h.col, h.header);
  }

  // Track data per column
  const columnData = new Map<
    string,
    {
      header: string;
      dataTypes: Record<string, number>;
      values: unknown[];
      nullCount: number;
      totalCount: number;
    }
  >();

  // Initialize from headers
  for (const h of sheet.columnHeaders) {
    columnData.set(h.col, {
      header: h.header,
      dataTypes: {},
      values: [],
      nullCount: 0,
      totalCount: 0,
    });
  }

  // Process rows (skip header row = first row)
  let headerRowIndex = -1;
  if (sheet.rows.length > 0) {
    headerRowIndex = sheet.rows[0].rowIndex;
  }

  for (const row of sheet.rows) {
    if (row.rowIndex === headerRowIndex) continue;

    for (const cell of row.cells) {
      const col = cell.col;
      if (!columnData.has(col)) {
        const header = headerMap.get(col) ?? col;
        columnData.set(col, {
          header,
          dataTypes: {},
          values: [],
          nullCount: 0,
          totalCount: 0,
        });
      }

      const cd = columnData.get(col)!;
      cd.totalCount++;

      if (cell.value === null || cell.value === undefined) {
        cd.nullCount++;
      } else {
        const t = cell.type === "null" ? "null" : cell.type;
        cd.dataTypes[t] = (cd.dataTypes[t] ?? 0) + 1;
        if (cd.values.length < 3 && cell.value !== null && cell.value !== undefined) {
          const strVal = String(cell.value).trim();
          if (strVal !== "" && !cd.values.includes(strVal)) {
            cd.values.push(strVal);
          }
        }
      }
    }
  }

  const columns: ColumnAnalysis[] = [];
  for (const [col, cd] of columnData.entries()) {
    columns.push({
      col,
      header: cd.header,
      dataTypes: cd.dataTypes,
      sampleValues: cd.values.slice(0, 3),
      nullCount: cd.nullCount,
      totalCount: cd.totalCount,
      suggestedDbField: suggestDbField(cd.header),
      suggestedDbType: suggestDbType(cd.dataTypes, cd.header),
    });
  }

  // Sort columns by colIndex
  columns.sort((a, b) => a.col.localeCompare(b.col));

  // Top 5 colors
  const colorEntries = Object.entries(sheet.colorLegend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([color, count]) => ({ color, count }));

  return {
    sheetName: sheet.name,
    totalRows: sheet.totalRows,
    totalCols: sheet.totalCols,
    mergeCount: sheet.merges.length,
    colorDistribution: colorEntries,
    columns,
    suggestedTable: suggestTableName(sheet.name),
  };
}

function printSummary(analyses: FileAnalysis[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("EXCEL STRUCTURE ANALYSIS SUMMARY");
  console.log("=".repeat(80));

  for (const fa of analyses) {
    console.log(`\n### File: ${fa.filename}`);
    console.log(`    Sheets: ${fa.sheets.length}`);

    for (const sa of fa.sheets) {
      console.log(`\n  [Sheet] ${sa.sheetName} -> table: ${sa.suggestedTable}`);
      console.log(`    Rows: ${sa.totalRows}, Cols: ${sa.totalCols}, Merges: ${sa.mergeCount}`);

      if (sa.colorDistribution.length > 0) {
        console.log(`    Top Colors:`);
        for (const c of sa.colorDistribution) {
          console.log(`      #${c.color} x${c.count}`);
        }
      }

      console.log(`    Columns (${sa.columns.length}):`);
      for (const col of sa.columns.slice(0, 10)) {
        const typeInfo = Object.entries(col.dataTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([t, n]) => `${t}:${n}`)
          .join(", ");
        const samples = col.sampleValues.slice(0, 2).map((v) => String(v).slice(0, 20)).join(" | ");
        console.log(`      ${col.col}: "${col.header}" -> ${col.suggestedDbField} (${col.suggestedDbType}) [${typeInfo}] eg: ${samples}`);
      }
      if (sa.columns.length > 10) {
        console.log(`      ... and ${sa.columns.length - 10} more columns`);
      }
    }
  }
}

async function main(): Promise<void> {
  const extractedDir = path.join(__dirname, "..", "ref", "huni", "extracted");

  const files = [
    { json: "상품마스터_extracted.json", label: "상품마스터" },
    { json: "가격표_extracted.json", label: "가격표" },
    { json: "품목관리_extracted.json", label: "품목관리" },
  ];

  const analyses: FileAnalysis[] = [];

  for (const f of files) {
    const jsonPath = path.join(extractedDir, f.json);
    if (!fs.existsSync(jsonPath)) {
      console.warn(`Missing: ${jsonPath}`);
      continue;
    }
    console.log(`Reading ${f.json}...`);
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as ExtractedFile;

    const sheetAnalyses: SheetAnalysis[] = [];
    for (const sheet of data.sheets) {
      sheetAnalyses.push(analyzeSheet(sheet));
    }

    analyses.push({ filename: data.filename, sheets: sheetAnalyses });
  }

  // Output to JSON
  const outputPath = path.join(extractedDir, "structure-analysis.json");
  fs.writeFileSync(outputPath, JSON.stringify(analyses, null, 2), "utf-8");
  console.log(`\nAnalysis saved to: ${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  // Print summary
  printSummary(analyses);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
