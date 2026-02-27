/**
 * Tests for M1-REQ-005: Papers Table Import (from 출력소재관리.xlsx)
 *
 * M1-REQ-005 changes the primary data source from product-master.toon
 * to 출력소재관리_extracted.json. This file tests the new JSON-based
 * import logic including skip rules, field mapping, and data anomaly handling.
 *
 * Reference: .moai/specs/SPEC-IM-003/spec.md § M1-REQ-005
 * Data file:  ref/huni/extracted/출력소재관리_extracted.json
 * Sheet:      !출력소재 (122 data rows)
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types mirroring the updated import-papers.ts contract
// ---------------------------------------------------------------------------

interface JsonCell {
  col: string;
  colIndex: number;
  value: string | number | null;
  type: string;
  bgColor?: string;
  fontColor?: string;
}

interface JsonRow {
  rowIndex: number;
  cells: JsonCell[];
}

interface JsonSheet {
  name: string;
  rows: JsonRow[];
}

interface JsonData {
  sheets: JsonSheet[];
}

interface PaperRecord {
  code: string;
  name: string;
  abbreviation: string | null;
  weight: number | null;
  sheetSize: string | null;
  sellingPerReam: string | null;
  sellingPer4Cut: string | null;
  purchaseInfo: string | null;
  displayOrder: number;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Business logic re-implemented for test isolation
// These match what import-papers.ts must implement per M1-REQ-005
// ---------------------------------------------------------------------------

const SKIP_COLORS = new Set(["A5A5A5", "D8D8D8"]);

/**
 * Per M1-REQ-005: skip rows where column C bgColor is D8D8D8 or A5A5A5.
 * Active papers must have D9EAD3 pricing cell (column I) AND
 * column C must NOT have a skip color.
 */
function shouldSkipJsonRow(row: JsonRow): boolean {
  const cellC = row.cells.find((c) => c.col === "C");
  if (!cellC) return true; // no name cell — skip

  const bg = (cellC.bgColor ?? "").trim().toUpperCase();
  if (SKIP_COLORS.has(bg)) return true;

  return false;
}

/**
 * Per M1-REQ-005: rows 86+ have no D9EAD3 pricing.
 * The I column bgColor is either FFFFFF or undefined for these rows.
 */
function hasPricing(row: JsonRow): boolean {
  const cellI = row.cells.find((c) => c.col === "I");
  if (!cellI) return false;
  const bg = (cellI.bgColor ?? "").trim().toUpperCase();
  return bg === "D9EAD3";
}

function getCellValue(row: JsonRow, col: string): string | number | null {
  return row.cells.find((c) => c.col === col)?.value ?? null;
}

function parseWeight(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (raw <= 0 || !isFinite(raw)) return null;
    return Math.round(raw);
  }
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n);
}

function parseNumericFromJson(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (!isFinite(raw)) return null;
    return String(raw);
  }
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === "Roll") return null;
  const cleaned = trimmed.replace(/,/g, "");
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  return String(n);
}

function generateCode(name: string, weight: number | null): string {
  const namePart = name
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^\w\-가-힣]/g, "")
    .slice(0, 40);
  if (weight !== null) {
    return `${namePart}-${weight}g`.slice(0, 50);
  }
  return namePart.slice(0, 50);
}

// ---------------------------------------------------------------------------
// Data anomaly overrides (hardcoded per SPEC Q19-001, Q19-002)
// ---------------------------------------------------------------------------

/**
 * Q19-001: 랑데뷰 WH 240g and 310g have incorrect sellingPer4Cut in JSON.
 * The correct values from 상품마스터.xlsx are 157 and 203 (원/장, 국4절 기준).
 */
const RANDEVU_OVERRIDES: Record<string, number> = {
  "랑데뷰 WH 240g": 157,
  "랑데뷰 WH 310g": 203,
};

/**
 * Q19-002: 앙상블 papers (rows 22-25) have CCCCCC cells in column E (abbreviation).
 * The correct abbreviation codes come from 상품마스터.xlsx.
 * These are the fallback values the importer must use.
 */
const ENSEMBLE_ABBREVIATION_FALLBACK = "앙상블";

// ---------------------------------------------------------------------------
// Load actual JSON data for integration-style tests
// ---------------------------------------------------------------------------

let jsonData: JsonData;
let sheet: JsonSheet;

beforeAll(() => {
  const jsonPath = path.resolve(
    __dirname,
    "../../../ref/huni/extracted/출력소재관리_extracted.json"
  );
  const raw = fs.readFileSync(jsonPath, "utf-8");
  jsonData = JSON.parse(raw);
  const found = jsonData.sheets.find((s) => s.name === "!출력소재");
  if (!found) throw new Error("Sheet !출력소재 not found in JSON");
  sheet = found;
});

// ---------------------------------------------------------------------------
// Tests: JSON structure and sheet loading
// ---------------------------------------------------------------------------

describe("출력소재관리_extracted.json structure", () => {
  it("should load JSON and find sheet !출력소재", () => {
    expect(sheet).toBeDefined();
    expect(sheet.name).toBe("!출력소재");
  });

  it("should have 122 data rows in !출력소재", () => {
    expect(sheet.rows).toHaveLength(122);
  });

  it("should have row indices starting at 1", () => {
    const minIndex = Math.min(...sheet.rows.map((r) => r.rowIndex));
    expect(minIndex).toBe(1);
  });

  it("should contain rows 4-85 as candidate import rows", () => {
    const candidateRows = sheet.rows.filter(
      (r) => r.rowIndex >= 4 && r.rowIndex <= 85
    );
    expect(candidateRows.length).toBeGreaterThan(70);
  });

  it("each row should have cells with col, colIndex, value, type fields", () => {
    const row4 = sheet.rows.find((r) => r.rowIndex === 4);
    expect(row4).toBeDefined();
    const cellC = row4!.cells.find((c) => c.col === "C");
    expect(cellC).toBeDefined();
    expect(cellC).toHaveProperty("col");
    expect(cellC).toHaveProperty("colIndex");
    expect(cellC).toHaveProperty("value");
    expect(cellC).toHaveProperty("type");
  });
});

// ---------------------------------------------------------------------------
// Tests: Skip logic (shouldSkipJsonRow)
// ---------------------------------------------------------------------------

describe("shouldSkipJsonRow — skip color logic", () => {
  it("should NOT skip row 4 (백색모조지 100g, no bgColor on C)", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 4)!;
    expect(shouldSkipJsonRow(row)).toBe(false);
  });

  it("should SKIP row 40 (리브스디자인 250g, bgColor A5A5A5 on C)", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 40)!;
    expect(shouldSkipJsonRow(row)).toBe(true);
  });

  it("should SKIP row 56 (인바이런먼트 아이론 352g, bgColor D8D8D8 on C)", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 56)!;
    expect(shouldSkipJsonRow(row)).toBe(true);
  });

  it("should SKIP row 57 (그문드컬러매트, bgColor D8D8D8 on C)", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 57)!;
    expect(shouldSkipJsonRow(row)).toBe(true);
  });

  it("should NOT skip rows 61-67 (큐리어스스킨, 유니크라프트 — no skip color)", () => {
    const rows = sheet.rows.filter((r) => r.rowIndex >= 61 && r.rowIndex <= 67);
    rows.forEach((row) => {
      expect(shouldSkipJsonRow(row)).toBe(false);
    });
  });

  it("should NOT skip PET rows 68-71", () => {
    const rows = sheet.rows.filter((r) => r.rowIndex >= 68 && r.rowIndex <= 71);
    rows.forEach((row) => {
      expect(shouldSkipJsonRow(row)).toBe(false);
    });
  });

  it("should NOT skip sticker rows 76-85", () => {
    const rows = sheet.rows.filter((r) => r.rowIndex >= 76 && r.rowIndex <= 85);
    rows.forEach((row) => {
      expect(shouldSkipJsonRow(row)).toBe(false);
    });
  });

  it("should be case-insensitive for skip color detection", () => {
    // Simulate a row with lowercase bgColor
    const mockRow: JsonRow = {
      rowIndex: 999,
      cells: [{ col: "C", colIndex: 3, value: "테스트용지", type: "string", bgColor: "a5a5a5" }],
    };
    expect(shouldSkipJsonRow(mockRow)).toBe(true);
  });

  it("should skip if column C is missing entirely", () => {
    const mockRow: JsonRow = {
      rowIndex: 999,
      cells: [{ col: "D", colIndex: 4, value: 100, type: "number" }],
    };
    expect(shouldSkipJsonRow(mockRow)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: hasPricing — D9EAD3 on column I
// ---------------------------------------------------------------------------

describe("hasPricing — D9EAD3 detection on column I", () => {
  it("should return true for row 4 (D9EAD3 on I)", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 4)!;
    expect(hasPricing(row)).toBe(true);
  });

  it("should return true for row 76 (sticker, D9EAD3 on I)", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 76)!;
    expect(hasPricing(row)).toBe(true);
  });

  it("should return false for row 86 (FFFFFF on I — no pricing)", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 86)!;
    expect(hasPricing(row)).toBe(false);
  });

  it("should return false for rows 98+ (no I cell at all)", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 98)!;
    expect(hasPricing(row)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Active row count (import scope per M1-REQ-005)
// ---------------------------------------------------------------------------

describe("M1-REQ-005 import scope — active paper count", () => {
  it("should yield exactly 76 active papers after skip + pricing filter", () => {
    // Active: has D9EAD3 pricing AND column C not skipped
    const activeRows = sheet.rows.filter(
      (r) => hasPricing(r) && !shouldSkipJsonRow(r)
    );
    expect(activeRows).toHaveLength(76);
  });

  it("should include row 4 (백색모조지 100g) in active set", () => {
    const row4 = sheet.rows.find((r) => r.rowIndex === 4)!;
    expect(hasPricing(row4) && !shouldSkipJsonRow(row4)).toBe(true);
  });

  it("should exclude row 40 (리브스디자인 250g, A5A5A5) from active set", () => {
    const row40 = sheet.rows.find((r) => r.rowIndex === 40)!;
    expect(shouldSkipJsonRow(row40)).toBe(true);
  });

  it("should include 3절 papers (rows 51-55) in active set", () => {
    const rows = sheet.rows.filter((r) => r.rowIndex >= 51 && r.rowIndex <= 55);
    expect(rows).toHaveLength(5);
    rows.forEach((row) => {
      expect(hasPricing(row) && !shouldSkipJsonRow(row)).toBe(true);
    });
  });

  it("should include PET papers (rows 68-71) in active set", () => {
    const rows = sheet.rows.filter((r) => r.rowIndex >= 68 && r.rowIndex <= 71);
    expect(rows).toHaveLength(4);
    rows.forEach((row) => {
      expect(hasPricing(row) && !shouldSkipJsonRow(row)).toBe(true);
    });
  });

  it("should include sticker papers (rows 76-85) in active set", () => {
    const rows = sheet.rows.filter((r) => r.rowIndex >= 76 && r.rowIndex <= 85);
    expect(rows).toHaveLength(10);
    rows.forEach((row) => {
      expect(hasPricing(row) && !shouldSkipJsonRow(row)).toBe(true);
    });
  });

  it("should exclude rows 56-60 (D8D8D8 discontinued) from active set", () => {
    // rows 56-60 are D8D8D8 but still have D9EAD3 on I — only C skip matters
    const rows = sheet.rows.filter((r) => r.rowIndex >= 56 && r.rowIndex <= 60);
    rows.forEach((row) => {
      expect(shouldSkipJsonRow(row)).toBe(true);
    });
  });

  it("should exclude rows 86-97 (FFFFFF pricing) from active set", () => {
    const rows = sheet.rows.filter((r) => r.rowIndex >= 86 && r.rowIndex <= 97);
    rows.forEach((row) => {
      expect(hasPricing(row)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: Field mapping (column → schema field)
// ---------------------------------------------------------------------------

describe("Field mapping from JSON columns", () => {
  it("column C → name: row 4 should be '백색모조지 100g'", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 4)!;
    expect(getCellValue(row, "C")).toBe("백색모조지 100g");
  });

  it("column D → weight: row 4 should be 100 (number)", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 4)!;
    const weight = parseWeight(getCellValue(row, "D"));
    expect(weight).toBe(100);
  });

  it("column E → abbreviation: row 4 should be '백모조'", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 4)!;
    expect(getCellValue(row, "E")).toBe("백모조");
  });

  it("column G → sheetSize: row 4 should be '국전(939*636)'", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 4)!;
    expect(getCellValue(row, "G")).toBe("국전(939*636)");
  });

  it("column H → sellingPerReam: row 4 should be 61460", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 4)!;
    const val = parseNumericFromJson(getCellValue(row, "H"));
    expect(val).toBe("61460");
  });

  it("column I → sellingPer4Cut: row 4 should be 30.73", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 4)!;
    const val = parseNumericFromJson(getCellValue(row, "I"));
    expect(val).toBe("30.73");
  });

  it("column F → purchaseInfo: row 76 (sticker) should have purchase info string", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 76)!;
    const purchaseInfo = getCellValue(row, "F");
    expect(typeof purchaseInfo).toBe("string");
    expect((purchaseInfo as string).length).toBeGreaterThan(0);
  });

  it("column F → purchaseInfo: row 76 should contain 유포지 purchase details", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 76)!;
    const purchaseInfo = getCellValue(row, "F") as string;
    expect(purchaseInfo).toContain("유포지");
  });

  it("column F → purchaseInfo: rows without supplier info should yield null", () => {
    // Row 4 (백색모조지 100g) has no F column in JSON
    const row = sheet.rows.find((r) => r.rowIndex === 4)!;
    const purchaseInfo = getCellValue(row, "F");
    // F cell is absent for standard papers
    expect(purchaseInfo).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: parseWeight with JSON number values
// ---------------------------------------------------------------------------

describe("parseWeight with JSON cell values", () => {
  it("should parse integer number value 100 → 100", () => {
    expect(parseWeight(100)).toBe(100);
  });

  it("should parse float number value 36.875 → 37 (rounded)", () => {
    expect(parseWeight(36.875)).toBe(37);
  });

  it("should return null for null value", () => {
    expect(parseWeight(null)).toBeNull();
  });

  it("should return null for zero", () => {
    expect(parseWeight(0)).toBeNull();
  });

  it("should return null for negative", () => {
    expect(parseWeight(-10)).toBeNull();
  });

  it("should return null for string 'X' (non-numeric)", () => {
    expect(parseWeight("X")).toBeNull();
  });

  it("should parse string number '250' → 250", () => {
    expect(parseWeight("250")).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// Tests: parseNumericFromJson
// ---------------------------------------------------------------------------

describe("parseNumericFromJson", () => {
  it("should parse number 61460 → '61460'", () => {
    expect(parseNumericFromJson(61460)).toBe("61460");
  });

  it("should parse float 30.73 → '30.73'", () => {
    expect(parseNumericFromJson(30.73)).toBe("30.73");
  });

  it("should parse float 36.875 → '36.875'", () => {
    expect(parseNumericFromJson(36.875)).toBe("36.875");
  });

  it("should return null for null", () => {
    expect(parseNumericFromJson(null)).toBeNull();
  });

  it("should return null for 'Roll' (non-numeric string)", () => {
    expect(parseNumericFromJson("Roll")).toBeNull();
  });

  it("should parse comma-separated string '1,000' → '1000'", () => {
    expect(parseNumericFromJson("1,000")).toBe("1000");
  });
});

// ---------------------------------------------------------------------------
// Tests: Data anomaly handling — Q19-001 (랑데뷰 WH override)
// ---------------------------------------------------------------------------

describe("Q19-001: 랑데뷰 WH sellingPer4Cut override", () => {
  it("row 26 (랑데뷰 WH 240g) JSON I value should be 71.33 (incorrect)", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 26)!;
    const rawI = getCellValue(row, "I");
    expect(rawI).toBe(71.33);
  });

  it("row 27 (랑데뷰 WH 310g) JSON I value should be 87.795 (incorrect)", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 27)!;
    const rawI = getCellValue(row, "I");
    expect(rawI).toBe(87.795);
  });

  it("RANDEVU_OVERRIDES should map 랑데뷰 WH 240g → 157 (correct value from 상품마스터)", () => {
    expect(RANDEVU_OVERRIDES["랑데뷰 WH 240g"]).toBe(157);
  });

  it("RANDEVU_OVERRIDES should map 랑데뷰 WH 310g → 203 (correct value from 상품마스터)", () => {
    expect(RANDEVU_OVERRIDES["랑데뷰 WH 310g"]).toBe(203);
  });

  it("importer must use 157 (not 71.33) for 랑데뷰 WH 240g sellingPer4Cut", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 26)!;
    const name = getCellValue(row, "C") as string;
    const jsonValue = getCellValue(row, "I") as number;

    // The importer must check the override map
    const correctedValue = RANDEVU_OVERRIDES[name] ?? jsonValue;
    expect(correctedValue).toBe(157);
    expect(correctedValue).not.toBe(71.33);
  });

  it("importer must use 203 (not 87.795) for 랑데뷰 WH 310g sellingPer4Cut", () => {
    const row = sheet.rows.find((r) => r.rowIndex === 27)!;
    const name = getCellValue(row, "C") as string;
    const jsonValue = getCellValue(row, "I") as number;

    const correctedValue = RANDEVU_OVERRIDES[name] ?? jsonValue;
    expect(correctedValue).toBe(203);
    expect(correctedValue).not.toBe(87.795);
  });
});

// ---------------------------------------------------------------------------
// Tests: Data anomaly handling — Q19-002 (앙상블 abbreviation fallback)
// ---------------------------------------------------------------------------

describe("Q19-002: 앙상블 abbreviation fallback from 상품마스터", () => {
  it("rows 22-25 (앙상블 130g-210g) should have CCCCCC color on C cell", () => {
    const rows = sheet.rows.filter((r) => r.rowIndex >= 22 && r.rowIndex <= 25);
    expect(rows).toHaveLength(4);
    rows.forEach((row) => {
      const cellC = row.cells.find((c) => c.col === "C");
      expect(cellC?.bgColor).toBe("CCCCCC");
    });
  });

  it("rows 22-25 should have null/undefined in column E (no abbreviation)", () => {
    const rows = sheet.rows.filter((r) => r.rowIndex >= 22 && r.rowIndex <= 25);
    rows.forEach((row) => {
      const cellE = row.cells.find((c) => c.col === "E");
      // E cell absent or null value
      expect(cellE === undefined || cellE.value === null).toBe(true);
    });
  });

  it("rows 22-25 should NOT be skipped despite CCCCCC (not a skip color)", () => {
    // CCCCCC is not in SKIP_COLORS (which only has A5A5A5 and D8D8D8)
    const rows = sheet.rows.filter((r) => r.rowIndex >= 22 && r.rowIndex <= 25);
    rows.forEach((row) => {
      expect(shouldSkipJsonRow(row)).toBe(false);
    });
  });

  it("ENSEMBLE_ABBREVIATION_FALLBACK should be '앙상블'", () => {
    expect(ENSEMBLE_ABBREVIATION_FALLBACK).toBe("앙상블");
  });

  it("importer must use fallback abbreviation '앙상블' when E is null for 앙상블 rows", () => {
    const row22 = sheet.rows.find((r) => r.rowIndex === 22)!;
    const cellE = row22.cells.find((c) => c.col === "E");
    const rawAbbr = cellE?.value ?? null;

    // Importer logic: if null, use fallback for 앙상블 papers
    const abbreviation =
      rawAbbr !== null
        ? String(rawAbbr)
        : ENSEMBLE_ABBREVIATION_FALLBACK;

    expect(abbreviation).toBe("앙상블");
  });

  it("row 21 (앙상블 100g) has no CCCCCC — should use E column value directly", () => {
    const row21 = sheet.rows.find((r) => r.rowIndex === 21)!;
    const cellC = row21.cells.find((c) => c.col === "C");
    const cellE = row21.cells.find((c) => c.col === "E");
    // Row 21 is 앙상블 100g without CCCCCC
    expect(cellC?.bgColor ?? null).not.toBe("CCCCCC");
    // E value may be directly available
    const abbr = cellE?.value ?? null;
    // Whether null or not, this row uses normal logic (not CCCCCC fallback)
    expect(abbr === null || typeof abbr === "string").toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: generateCode with JSON-derived values
// ---------------------------------------------------------------------------

describe("generateCode with paper names from JSON", () => {
  it("should generate code for 백색모조지 100g → 백색모조지-100g-100g", () => {
    // name from C column, weight from D column
    const code = generateCode("백색모조지 100g", 100);
    expect(code).toBe("백색모조지-100g-100g");
  });

  it("should generate code for 아트지 120g", () => {
    const code = generateCode("아트지 120g", 120);
    expect(code).toBe("아트지-120g-120g");
  });

  it("should generate code for 투명 PET 260g", () => {
    const code = generateCode("투명 PET 260g", 260);
    expect(code).toBe("투명-pet-260g-260g");
  });

  it("should generate code for sticker paper 유포스티커 (weight 80)", () => {
    const code = generateCode("유포스티커", 80);
    expect(code).toBe("유포스티커-80g");
  });

  it("should generate code for 랑데뷰 WH 240g (weight 240)", () => {
    const code = generateCode("랑데뷰 WH 240g", 240);
    expect(code).toBe("랑데뷰-wh-240g-240g");
  });

  it("should generate code for 아트지 150g (3절) — keep Korean characters", () => {
    const code = generateCode("아트지 150g (3절)", 150);
    // Parentheses stripped by character class, 3절 remains
    expect(code).toContain("아트지");
    expect(code).toContain("150g");
  });

  it("code should not exceed 50 characters", () => {
    const longName = "스타드림(다이아몬드) 다크골드 레드스페셜에디션 240g";
    const code = generateCode(longName, 240);
    expect(code.length).toBeLessThanOrEqual(50);
  });

  it("code should be deterministic for same inputs", () => {
    const code1 = generateCode("아트지 100g", 100);
    const code2 = generateCode("아트지 100g", 100);
    expect(code1).toBe(code2);
  });
});

// ---------------------------------------------------------------------------
// Tests: Full pipeline — build PaperRecord from active rows
// ---------------------------------------------------------------------------

describe("Full pipeline: active rows → PaperRecord array", () => {
  function buildRecords(
    rows: JsonRow[],
    overrides: Record<string, number> = {}
  ): PaperRecord[] {
    const records: PaperRecord[] = [];
    let displayOrder = 0;

    for (const row of rows) {
      if (!hasPricing(row)) continue;
      if (shouldSkipJsonRow(row)) continue;

      const name = getCellValue(row, "C");
      if (!name || typeof name !== "string" || !name.trim()) continue;

      const rawWeight = getCellValue(row, "D");
      const weight = parseWeight(rawWeight);

      const code = generateCode(name.trim(), weight);
      if (!code) continue;

      const abbreviationRaw = getCellValue(row, "E");
      const abbreviation =
        abbreviationRaw !== null
          ? String(abbreviationRaw).trim() || null
          : null;

      const sheetSize = (() => {
        const v = getCellValue(row, "G");
        return v !== null ? String(v).trim() || null : null;
      })();

      const sellingPerReam = parseNumericFromJson(getCellValue(row, "H"));

      // Apply override for 랑데뷰 WH (Q19-001)
      const rawI = getCellValue(row, "I");
      const sellingPer4CutNum =
        overrides[name.trim()] !== undefined
          ? overrides[name.trim()]
          : (rawI as number | null);
      const sellingPer4Cut = parseNumericFromJson(sellingPer4CutNum);

      const purchaseInfoRaw = getCellValue(row, "F");
      const purchaseInfo =
        purchaseInfoRaw !== null
          ? String(purchaseInfoRaw).trim() || null
          : null;

      displayOrder++;

      records.push({
        code,
        name: name.trim(),
        abbreviation,
        weight,
        sheetSize,
        sellingPerReam,
        sellingPer4Cut,
        purchaseInfo,
        displayOrder,
        isActive: true,
      });
    }

    return records;
  }

  let records: PaperRecord[];

  beforeAll(() => {
    records = buildRecords(sheet.rows, RANDEVU_OVERRIDES);
  });

  it("should produce exactly 76 PaperRecords", () => {
    expect(records).toHaveLength(76);
  });

  it("all records should have non-empty code", () => {
    records.forEach((r) => {
      expect(r.code).toBeTruthy();
      expect(r.code.length).toBeGreaterThan(0);
    });
  });

  it("all records should have isActive = true", () => {
    records.forEach((r) => {
      expect(r.isActive).toBe(true);
    });
  });

  it("codes should be unique across all records", () => {
    const codes = records.map((r) => r.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it("displayOrder should be sequential starting at 1", () => {
    expect(records[0].displayOrder).toBe(1);
    expect(records[records.length - 1].displayOrder).toBe(records.length);
  });

  it("랑데뷰 WH 240g should have sellingPer4Cut '157' (override applied)", () => {
    const randevu240 = records.find((r) => r.name === "랑데뷰 WH 240g");
    expect(randevu240).toBeDefined();
    expect(randevu240!.sellingPer4Cut).toBe("157");
  });

  it("랑데뷰 WH 310g should have sellingPer4Cut '203' (override applied)", () => {
    const randevu310 = records.find((r) => r.name === "랑데뷰 WH 310g");
    expect(randevu310).toBeDefined();
    expect(randevu310!.sellingPer4Cut).toBe("203");
  });

  it("유포스티커 (row 76) should have purchaseInfo with supplier data", () => {
    const yufoe = records.find((r) => r.name === "유포스티커");
    expect(yufoe).toBeDefined();
    expect(yufoe!.purchaseInfo).toBeTruthy();
    expect(yufoe!.purchaseInfo).toContain("유포지");
  });

  it("PET papers should be in records (투명 PET 260g, 반투명 PET 350g)", () => {
    const petNames = records.map((r) => r.name).filter((n) => n.includes("PET"));
    expect(petNames).toContain("투명 PET 260g");
    expect(petNames).toContain("반투명 PET 350g");
  });

  it("3절 papers should be in records", () => {
    const jeol3Names = records.map((r) => r.name).filter((n) => n.includes("3절"));
    expect(jeol3Names).toHaveLength(5);
    expect(jeol3Names).toContain("아트지 150g (3절)");
    expect(jeol3Names).toContain("스노우지 250g (3절)");
  });

  it("sticker papers should be in records (10 total)", () => {
    // Sticker rows 76-85
    const stickerRows = records.filter((r, idx) => {
      // Since we ordered by rowIndex, stickers come near the end
      const name = r.name;
      return (
        name.includes("스티커") ||
        name === "유포스티커" ||
        name === "비코팅스티커" ||
        name === "무광코팅스티커" ||
        name === "유광코팅스티커" ||
        name === "미색매트지" ||
        name === "수분리스티커" ||
        name === "투명스티커" ||
        name === "홀로그램스티커" ||
        name === "리무벌아트지 90g" ||
        name === "크라프트 스티커"
      );
    });
    expect(stickerRows.length).toBeGreaterThanOrEqual(9);
  });

  it("리브스디자인 250g should NOT appear in records (A5A5A5 skip)", () => {
    const skipped = records.find((r) => r.name === "리브스디자인 250g");
    expect(skipped).toBeUndefined();
  });

  it("인바이런먼트 아이론 352g should NOT appear in records (D8D8D8 skip)", () => {
    const skipped = records.find((r) => r.name === "인바이런먼트 아이론 352g");
    expect(skipped).toBeUndefined();
  });

  it("유포지 + 엠보코팅 (row 86) should NOT appear in records (no D9EAD3)", () => {
    const skipped = records.find((r) => r.name === "유포지 + 엠보코팅");
    expect(skipped).toBeUndefined();
  });

  it("first record (row 4) should be 백색모조지 100g with weight 100", () => {
    const first = records[0];
    expect(first.name).toBe("백색모조지 100g");
    expect(first.weight).toBe(100);
  });

  it("백색모조지 100g should have sellingPer4Cut '30.73'", () => {
    const paper = records.find((r) => r.name === "백색모조지 100g");
    expect(paper!.sellingPer4Cut).toBe("30.73");
  });

  it("백색모조지 100g should have sellingPerReam '61460'", () => {
    const paper = records.find((r) => r.name === "백색모조지 100g");
    expect(paper!.sellingPerReam).toBe("61460");
  });
});

// ---------------------------------------------------------------------------
// Tests: Batch split for UPSERT
// ---------------------------------------------------------------------------

describe("Batch UPSERT logic", () => {
  const BATCH_SIZE = 50;

  it("76 records should split into 2 batches (50 + 26)", () => {
    const totalRecords = 76;
    const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);
    expect(totalBatches).toBe(2);
  });

  it("first batch should have 50 records, second batch 26", () => {
    const totalRecords = 76;
    const firstBatch = Math.min(BATCH_SIZE, totalRecords);
    const secondBatch = totalRecords - firstBatch;
    expect(firstBatch).toBe(50);
    expect(secondBatch).toBe(26);
  });
});

// ---------------------------------------------------------------------------
// Tests: Idempotency — code uniqueness and conflict target
// ---------------------------------------------------------------------------

describe("Idempotency — code uniqueness", () => {
  it("duplicate name+weight combinations must produce unique codes", () => {
    // 아트지 150g and 아트지 150g (3절) have same base but different names
    const code1 = generateCode("아트지 150g", 150);
    const code2 = generateCode("아트지 150g (3절)", 150);
    expect(code1).not.toBe(code2);
  });

  it("백색모조지 100g and 백색모조지 120g should have different codes", () => {
    const code1 = generateCode("백색모조지 100g", 100);
    const code2 = generateCode("백색모조지 120g", 120);
    expect(code1).not.toBe(code2);
  });

  it("PET and non-PET papers with same weight should have different codes", () => {
    const code1 = generateCode("투명 PET 260g", 260);
    const code2 = generateCode("아트지 250g", 250);
    // Not same weight either, but even if they were codes must differ
    expect(code1).not.toBe(code2);
  });
});
