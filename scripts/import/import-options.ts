// @MX:NOTE: [AUTO] Option definitions and choices import script — SPEC-IM-002 Phase 1
// @MX:NOTE: [AUTO] Target tables: option_definitions (59 records), option_choices (~1,198 records)
// @MX:REASON: Phase 1 master lookup data — no FK dependencies on products/processes; must run before product_options

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import {
  optionDefinitions,
  optionChoices,
} from "../../packages/shared/src/db/schema/huni-options.schema.js";

// ---------------------------------------------------------------------------
// CLI Flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VALIDATE_ONLY = args.includes("--validate-only");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LABEL = "[import-options]";
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OptionDefinitionRecord = {
  key: string;
  name: string;
  optionClass: string;
  optionType: string;
  uiComponent: string;
  displayOrder: number;
  isActive: boolean;
  sectionKey: string;
  labelKo: string;
  layoutWidth: string;
  chipColumns: string;
  collapsedDefault: boolean;
};

type OptionChoiceRecord = {
  optionKey: string; // used to look up optionDefinitionId
  code: string;
  name: string;
  priceKey: string | null;
  displayOrder: number;
  isActive: boolean;
  badgeType: string | null;
  sublabelKo: string | null;
  swatchColor: string | null;
};

// ---------------------------------------------------------------------------
// 59 OPTION_DEFINITIONS — Section 4, Section 12.5
// ---------------------------------------------------------------------------
// @MX:NOTE: [AUTO] display_order follows Section 12.3.3 design: absolute order across all options.
// @MX:NOTE: [AUTO] section_key follows Section 12.5.2 mapping table.
// @MX:NOTE: [AUTO] collapsedDefault=true for finish_post and misc sections per Section 12.2.1.

const OPTION_DEFINITIONS: OptionDefinitionRecord[] = [
  // === core section (display_order 10-590) ===
  {
    key: "size",
    name: "사이즈",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 10,
    isActive: true,
    sectionKey: "core",
    labelKo: "사이즈",
    layoutWidth: "full",
    chipColumns: "2",
    collapsedDefault: false,
  },
  {
    key: "paper_type",
    name: "종이",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "select",
    displayOrder: 20,
    isActive: true,
    sectionKey: "core",
    labelKo: "종이",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "print_side",
    name: "인쇄",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 30,
    isActive: true,
    sectionKey: "core",
    labelKo: "인쇄",
    layoutWidth: "full",
    chipColumns: "4",
    collapsedDefault: false,
  },
  {
    key: "print_run",
    name: "건수",
    optionClass: "core",
    optionType: "numeric",
    uiComponent: "stepper",
    displayOrder: 40,
    isActive: true,
    sectionKey: "core",
    labelKo: "건수",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "quantity",
    name: "제작수량",
    optionClass: "core",
    optionType: "numeric",
    uiComponent: "stepper",
    displayOrder: 50,
    isActive: true,
    sectionKey: "core",
    labelKo: "제작수량",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "piece_count",
    name: "조각수",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "select",
    displayOrder: 55,
    isActive: true,
    sectionKey: "core",
    labelKo: "조각수",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "binding_type",
    name: "제본",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 57,
    isActive: true,
    sectionKey: "core",
    labelKo: "제본",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "binding_direction",
    name: "제본방향",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 58,
    isActive: true,
    sectionKey: "core",
    labelKo: "제본방향",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "ring_color",
    name: "링컬러",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "color_chip",
    displayOrder: 59,
    isActive: true,
    sectionKey: "core",
    labelKo: "링컬러",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "ring_size",
    name: "링선택",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "image_chip",
    displayOrder: 60,
    isActive: true,
    sectionKey: "core",
    labelKo: "링선택",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "endpaper",
    name: "면지",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 61,
    isActive: true,
    sectionKey: "core",
    labelKo: "면지",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "cover_type",
    name: "커버타입",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 62,
    isActive: true,
    sectionKey: "core",
    labelKo: "커버타입",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "sheet_count",
    name: "장수",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "select",
    displayOrder: 63,
    isActive: true,
    sectionKey: "core",
    labelKo: "장수",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "stand_color",
    name: "삼각대 컬러",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "color_chip",
    displayOrder: 64,
    isActive: true,
    sectionKey: "core",
    labelKo: "삼각대 컬러",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "calendar_finishing",
    name: "캘린더 가공",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 65,
    isActive: true,
    sectionKey: "core",
    labelKo: "캘린더 가공",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "custom_size",
    name: "크기 직접입력",
    optionClass: "core",
    optionType: "dual",
    uiComponent: "dual_input",
    displayOrder: 66,
    isActive: true,
    sectionKey: "core",
    labelKo: "크기 직접입력",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "page_count",
    name: "내지 페이지",
    optionClass: "interior",
    optionType: "numeric",
    uiComponent: "stepper",
    displayOrder: 120,
    isActive: true,
    sectionKey: "interior",
    labelKo: "내지 페이지",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "inner_type",
    name: "내지",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 67,
    isActive: true,
    sectionKey: "core",
    labelKo: "내지",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "binding_option",
    name: "제본옵션",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 68,
    isActive: true,
    sectionKey: "core",
    labelKo: "제본옵션",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  // === finish_basic section (display_order 60-89) ===
  {
    key: "coating",
    name: "코팅",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 80,
    isActive: true,
    sectionKey: "finish_basic",
    labelKo: "코팅",
    layoutWidth: "full",
    chipColumns: "3",
    collapsedDefault: false,
  },
  {
    key: "special_color_white",
    name: "별색인쇄(화이트)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 82,
    isActive: true,
    sectionKey: "finish_basic",
    labelKo: "별색인쇄 (화이트)",
    layoutWidth: "full",
    chipColumns: "4",
    collapsedDefault: false,
  },
  {
    key: "special_color_clear",
    name: "별색인쇄(클리어)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 83,
    isActive: true,
    sectionKey: "finish_basic",
    labelKo: "별색인쇄 (클리어)",
    layoutWidth: "full",
    chipColumns: "4",
    collapsedDefault: false,
  },
  {
    key: "special_color_pink",
    name: "별색인쇄(핑크)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 84,
    isActive: true,
    sectionKey: "finish_basic",
    labelKo: "별색인쇄 (핑크)",
    layoutWidth: "full",
    chipColumns: "4",
    collapsedDefault: false,
  },
  {
    key: "special_color_gold",
    name: "별색인쇄(금색)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 85,
    isActive: true,
    sectionKey: "finish_basic",
    labelKo: "별색인쇄 (금색)",
    layoutWidth: "full",
    chipColumns: "4",
    collapsedDefault: false,
  },
  {
    key: "special_color_silver",
    name: "별색인쇄(은색)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 86,
    isActive: true,
    sectionKey: "finish_basic",
    labelKo: "별색인쇄 (은색)",
    layoutWidth: "full",
    chipColumns: "4",
    collapsedDefault: false,
  },
  {
    key: "cutting",
    name: "커팅",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 87,
    isActive: true,
    sectionKey: "finish_basic",
    labelKo: "커팅",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "folding",
    name: "접지",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 88,
    isActive: true,
    sectionKey: "finish_basic",
    labelKo: "접지",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  // === finish_post section (display_order 90-199) — collapsedDefault=true ===
  {
    key: "rounded_corner",
    name: "귀돌이",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 90,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "귀돌이",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "scoring",
    name: "오시",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 91,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "오시",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "perforation",
    name: "미싱",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 92,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "미싱",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "variable_print_text",
    name: "가변인쇄(텍스트)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 93,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "가변인쇄(텍스트)",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "variable_print_image",
    name: "가변인쇄(이미지)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 94,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "가변인쇄(이미지)",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "foil_front",
    name: "박(앞면)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 100,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "박(앞면)",
    layoutWidth: "half",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "foil_front_size",
    name: "박(앞면)크기",
    optionClass: "finish",
    optionType: "dual",
    uiComponent: "dual_input",
    displayOrder: 101,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "박(앞면) 크기",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "foil_front_color",
    name: "박(앞면)칼라",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "color_chip",
    displayOrder: 102,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "박(앞면) 칼라",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "foil_back",
    name: "박(뒷면)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 103,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "박(뒷면)",
    layoutWidth: "half",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "foil_back_size",
    name: "박(뒷면)크기",
    optionClass: "finish",
    optionType: "dual",
    uiComponent: "dual_input",
    displayOrder: 104,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "박(뒷면) 크기",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "foil_back_color",
    name: "박(뒷면)칼라",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "color_chip",
    displayOrder: 105,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "박(뒷면) 칼라",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "emboss",
    name: "형압",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 106,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "형압",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "emboss_size",
    name: "형압크기",
    optionClass: "finish",
    optionType: "dual",
    uiComponent: "dual_input",
    displayOrder: 107,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "형압 크기",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "foil_cover",
    name: "박(표지)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 108,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "박(표지)",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "foil_cover_size",
    name: "박(표지)크기",
    optionClass: "finish",
    optionType: "dual",
    uiComponent: "dual_input",
    displayOrder: 109,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "박(표지) 크기",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "foil_cover_color",
    name: "박(표지)칼라",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "color_chip",
    displayOrder: 110,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "박(표지) 칼라",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "hook_type",
    name: "가공(고리)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 111,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "가공",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "label",
    name: "가공(라벨)",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 112,
    isActive: true,
    sectionKey: "finish_post",
    labelKo: "가공",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  // === interior section (display_order 120-139) ===
  {
    key: "inner_paper",
    name: "내지종이",
    optionClass: "interior",
    optionType: "single_select",
    uiComponent: "select",
    displayOrder: 121,
    isActive: true,
    sectionKey: "interior",
    labelKo: "내지종이",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "inner_print_side",
    name: "내지인쇄",
    optionClass: "interior",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 122,
    isActive: true,
    sectionKey: "interior",
    labelKo: "내지인쇄",
    layoutWidth: "full",
    chipColumns: "4",
    collapsedDefault: false,
  },
  // === cover section (display_order 140-159) ===
  {
    key: "cover_paper",
    name: "표지종이",
    optionClass: "cover",
    optionType: "single_select",
    uiComponent: "select",
    displayOrder: 141,
    isActive: true,
    sectionKey: "cover",
    labelKo: "표지종이",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  {
    key: "cover_print_side",
    name: "표지인쇄",
    optionClass: "cover",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 142,
    isActive: true,
    sectionKey: "cover",
    labelKo: "표지인쇄",
    layoutWidth: "full",
    chipColumns: "4",
    collapsedDefault: false,
  },
  {
    key: "cover_coating",
    name: "표지코팅",
    optionClass: "cover",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 143,
    isActive: true,
    sectionKey: "cover",
    labelKo: "표지코팅",
    layoutWidth: "full",
    chipColumns: "3",
    collapsedDefault: false,
  },
  {
    key: "clear_cover",
    name: "투명커버",
    optionClass: "cover",
    optionType: "single_select",
    uiComponent: "chip_group",
    displayOrder: 144,
    isActive: true,
    sectionKey: "cover",
    labelKo: "투명커버",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  // === material section (display_order 160-179) ===
  {
    key: "material",
    name: "소재",
    optionClass: "material",
    optionType: "single_select",
    uiComponent: "select",
    displayOrder: 161,
    isActive: true,
    sectionKey: "material",
    labelKo: "소재",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  // === misc section (display_order 180-219) — collapsedDefault=true ===
  {
    key: "individual_packaging",
    name: "개별포장",
    optionClass: "finish",
    optionType: "single_select",
    uiComponent: "select",
    displayOrder: 180,
    isActive: true,
    sectionKey: "misc",
    labelKo: "개별포장",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "calendar_envelope",
    name: "캘린더봉투",
    optionClass: "misc",
    optionType: "single_select",
    uiComponent: "select",
    displayOrder: 181,
    isActive: true,
    sectionKey: "misc",
    labelKo: "캘린더봉투",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "envelope_quantity",
    name: "봉투 수량",
    optionClass: "misc",
    optionType: "numeric",
    uiComponent: "select",
    displayOrder: 182,
    isActive: true,
    sectionKey: "misc",
    labelKo: "봉투 수량",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "ball_chain",
    name: "불체인",
    optionClass: "misc",
    optionType: "single_select",
    uiComponent: "select",
    displayOrder: 183,
    isActive: true,
    sectionKey: "misc",
    labelKo: "불체인",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  {
    key: "ball_chain_qty",
    name: "불체인 수량",
    optionClass: "misc",
    optionType: "numeric",
    uiComponent: "select",
    displayOrder: 184,
    isActive: true,
    sectionKey: "misc",
    labelKo: "불체인 수량",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: true,
  },
  // === core section continued — pouch_color ===
  {
    key: "pouch_color",
    name: "옵션(컬러)",
    optionClass: "core",
    optionType: "single_select",
    uiComponent: "color_chip",
    displayOrder: 69,
    isActive: true,
    sectionKey: "core",
    labelKo: "옵션 (컬러)",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
  // === pricing section (display_order 220+) ===
  {
    key: "volume_discount",
    name: "구간할인",
    optionClass: "pricing",
    optionType: "tier",
    uiComponent: "slider",
    displayOrder: 220,
    isActive: true,
    sectionKey: "pricing",
    labelKo: "구간할인",
    layoutWidth: "full",
    chipColumns: "auto",
    collapsedDefault: false,
  },
];

// ---------------------------------------------------------------------------
// OPTION_CHOICES — Section 5, Section 11
// ---------------------------------------------------------------------------
// @MX:NOTE: [AUTO] size choices are product-specific (Section 5.1) — handled in import-product-opts.ts
// @MX:NOTE: [AUTO] sheet_count, stand_color, ring_color choices are product-specific — listed here as shared
// @MX:NOTE: [AUTO] badgeType 'recommended' follows Section 12.4.3 badge system

const OPTION_CHOICES: OptionChoiceRecord[] = [
  // ── print_side (Section 5.2) ──
  {
    optionKey: "print_side",
    code: "SINGLE",
    name: "단면",
    priceKey: "SINGLE",
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "print_side",
    code: "DUPLEX",
    name: "양면",
    priceKey: "DUPLEX",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── coating (Section 5.3) ──
  // @MX:NOTE: [AUTO] Section 3.1 shows 5 coating choices; SILK was in original SPEC but not in Section 5.3 table
  {
    optionKey: "coating",
    code: "NONE",
    name: "코팅없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "coating",
    code: "MATTE",
    name: "무광코팅(단면)",
    priceKey: "COAT_MATTE",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "coating",
    code: "MATTE_DUPLEX",
    name: "무광코팅(양면)",
    priceKey: "COAT_MATTE",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "coating",
    code: "GLOSS",
    name: "유광코팅(단면)",
    priceKey: "COAT_GLOSS",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "coating",
    code: "GLOSS_DUPLEX",
    name: "유광코팅(양면)",
    priceKey: "COAT_GLOSS",
    displayOrder: 5,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "coating",
    code: "SILK",
    name: "실크코팅",
    priceKey: "COAT_SILK",
    displayOrder: 6,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── special_color_white (Section 5.8) ──
  {
    optionKey: "special_color_white",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "special_color_white",
    code: "SINGLE",
    name: "단면",
    priceKey: "SPEC_COLOR_WHITE_S",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "special_color_white",
    code: "DUPLEX",
    name: "양면",
    priceKey: "SPEC_COLOR_WHITE_D",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── special_color_clear (Section 5.8) ──
  {
    optionKey: "special_color_clear",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "special_color_clear",
    code: "SINGLE",
    name: "단면",
    priceKey: "SPEC_COLOR_CLEAR_S",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "special_color_clear",
    code: "DUPLEX",
    name: "양면",
    priceKey: "SPEC_COLOR_CLEAR_D",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── special_color_pink (Section 5.8) ──
  {
    optionKey: "special_color_pink",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "special_color_pink",
    code: "SINGLE",
    name: "단면",
    priceKey: "SPEC_COLOR_PINK_S",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "special_color_pink",
    code: "DUPLEX",
    name: "양면",
    priceKey: "SPEC_COLOR_PINK_D",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── special_color_gold (Section 5.8) ──
  {
    optionKey: "special_color_gold",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "special_color_gold",
    code: "SINGLE",
    name: "단면",
    priceKey: "SPEC_COLOR_GOLD_S",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "special_color_gold",
    code: "DUPLEX",
    name: "양면",
    priceKey: "SPEC_COLOR_GOLD_D",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── special_color_silver (Section 5.8) ──
  {
    optionKey: "special_color_silver",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "special_color_silver",
    code: "SINGLE",
    name: "단면",
    priceKey: "SPEC_COLOR_SILVER_S",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "special_color_silver",
    code: "DUPLEX",
    name: "양면",
    priceKey: "SPEC_COLOR_SILVER_D",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── binding_type (Section 5.4) ──
  {
    optionKey: "binding_type",
    code: "PERFECT_BIND",
    name: "무선제본",
    priceKey: "BIND_PERFECT",
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "binding_type",
    code: "SADDLE_STITCH",
    name: "중철제본",
    priceKey: "BIND_SADDLE",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "binding_type",
    code: "SPIRAL_BIND",
    name: "트윈링제본",
    priceKey: "BIND_SPIRAL",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "binding_type",
    code: "WIRE_O",
    name: "와이어링",
    priceKey: "BIND_WIREO",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── cover_type (Section 5.5) ──
  {
    optionKey: "cover_type",
    code: "HARD_COVER",
    name: "하드커버",
    priceKey: "PB_HARD",
    displayOrder: 1,
    isActive: true,
    badgeType: "recommended",
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "cover_type",
    code: "SOFT_COVER",
    name: "소프트커버",
    priceKey: "PB_SOFT",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "cover_type",
    code: "LEATHER_HARD_COVER",
    name: "레더하드커버",
    priceKey: "PB_LEATHER_HARD",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── pouch_color (Section 5.6) ──
  {
    optionKey: "pouch_color",
    code: "WHITE",
    name: "화이트",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FFFFFF",
  },
  {
    optionKey: "pouch_color",
    code: "GRAY",
    name: "그레이",
    priceKey: null,
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#808080",
  },
  {
    optionKey: "pouch_color",
    code: "BLACK",
    name: "블랙",
    priceKey: null,
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#000000",
  },
  {
    optionKey: "pouch_color",
    code: "PURPLE",
    name: "퍼플",
    priceKey: null,
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#800080",
  },
  {
    optionKey: "pouch_color",
    code: "RED",
    name: "레드",
    priceKey: null,
    displayOrder: 5,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FF0000",
  },
  {
    optionKey: "pouch_color",
    code: "DARK_BLACK",
    name: "블랙(dark)",
    priceKey: null,
    displayOrder: 6,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#1A1A1A",
  },
  {
    optionKey: "pouch_color",
    code: "SKY_BLUE",
    name: "스카이블루",
    priceKey: null,
    displayOrder: 7,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#87CEEB",
  },
  {
    optionKey: "pouch_color",
    code: "GREEN",
    name: "그린",
    priceKey: null,
    displayOrder: 8,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#008000",
  },
  {
    optionKey: "pouch_color",
    code: "PINK",
    name: "핑크",
    priceKey: null,
    displayOrder: 9,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FFC0CB",
  },
  {
    optionKey: "pouch_color",
    code: "YELLOW",
    name: "옐로우",
    priceKey: null,
    displayOrder: 10,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FFFF00",
  },

  // ── calendar_finishing (Section 5.7) ──
  {
    optionKey: "calendar_finishing",
    code: "TRIM_ONLY",
    name: "가공없음 (재단만)",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "calendar_finishing",
    code: "RING_BIND",
    name: "고리형 트윈링 제본",
    priceKey: "CAL_RING",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "calendar_finishing",
    code: "2HOLE_STRING",
    name: "2구타공+끈",
    priceKey: "CAL_HOLE",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── cutting (Section 3.1) ──
  // @MX:NOTE: [AUTO] PRINT cutting choices (shape-based). STICKER cutting is product-specific — in import-product-opts.ts.
  {
    optionKey: "cutting",
    code: "ROUND_ONE_SIDE",
    name: "한쪽라운딩",
    priceKey: "CUT_ROUND_1",
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "cutting",
    code: "LEAF",
    name: "나뭇잎",
    priceKey: "CUT_LEAF",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "cutting",
    code: "BIG_ROUND",
    name: "큰라운딩",
    priceKey: "CUT_ROUND_BIG",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "cutting",
    code: "CLASSIC",
    name: "클래식",
    priceKey: "CUT_CLASSIC",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── folding (Section 3.1) ──
  {
    optionKey: "folding",
    code: "FOLD_2H",
    name: "2단 가로접지",
    priceKey: "FOLD_2H",
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "folding",
    code: "FOLD_2V",
    name: "2단 세로접지",
    priceKey: "FOLD_2V",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "folding",
    code: "FOLD_3H",
    name: "3단 가로접지",
    priceKey: "FOLD_3H",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── rounded_corner (Section 3.1 후가공) ──
  {
    optionKey: "rounded_corner",
    code: "SQUARE",
    name: "직각모서리",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "rounded_corner",
    code: "ROUNDED",
    name: "둥근모서리",
    priceKey: "CORNER_ROUND",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── scoring (Section 3.1 후가공) ──
  {
    optionKey: "scoring",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "scoring",
    code: "ONE",
    name: "1개",
    priceKey: "SCORING_1",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "scoring",
    code: "TWO",
    name: "2개",
    priceKey: "SCORING_2",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "scoring",
    code: "THREE",
    name: "3개",
    priceKey: "SCORING_3",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── perforation (Section 3.1 후가공) ──
  {
    optionKey: "perforation",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "perforation",
    code: "ONE",
    name: "1개",
    priceKey: "PERF_1",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "perforation",
    code: "TWO",
    name: "2개",
    priceKey: "PERF_2",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "perforation",
    code: "THREE",
    name: "3개",
    priceKey: "PERF_3",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── variable_print_text (Section 3.1 후가공) ──
  {
    optionKey: "variable_print_text",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "variable_print_text",
    code: "ONE",
    name: "1개",
    priceKey: "VAR_TEXT_1",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "variable_print_text",
    code: "TWO",
    name: "2개",
    priceKey: "VAR_TEXT_2",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "variable_print_text",
    code: "THREE",
    name: "3개",
    priceKey: "VAR_TEXT_3",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── variable_print_image (Section 3.1 후가공) ──
  {
    optionKey: "variable_print_image",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "variable_print_image",
    code: "ONE",
    name: "1개",
    priceKey: "VAR_IMG_1",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "variable_print_image",
    code: "TWO",
    name: "2개",
    priceKey: "VAR_IMG_2",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "variable_print_image",
    code: "THREE",
    name: "3개",
    priceKey: "VAR_IMG_3",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── foil_front / foil_back / foil_cover (박있음/없음) ──
  {
    optionKey: "foil_front",
    code: "NONE",
    name: "박없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "foil_front",
    code: "YES",
    name: "박있음",
    priceKey: "FOIL_FRONT",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "foil_back",
    code: "NONE",
    name: "박없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "foil_back",
    code: "YES",
    name: "박있음",
    priceKey: "FOIL_BACK",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "foil_cover",
    code: "NONE",
    name: "박없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "foil_cover",
    code: "YES",
    name: "박있음",
    priceKey: "FOIL_COVER",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── foil_front_color / foil_back_color / foil_cover_color (Section 3.1, 3.3) ──
  // @MX:NOTE: [AUTO] 8 foil color choices: 금박, 은박, 먹유광, 브론즈, 빨간색, 파란색, 홀로그램, 홀로그램박
  {
    optionKey: "foil_front_color",
    code: "GOLD",
    name: "금박",
    priceKey: "FOIL_GOLD",
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FFD700",
  },
  {
    optionKey: "foil_front_color",
    code: "SILVER",
    name: "은박",
    priceKey: "FOIL_SILVER",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#C0C0C0",
  },
  {
    optionKey: "foil_front_color",
    code: "MATTE_BLACK",
    name: "먹유광",
    priceKey: "FOIL_MATTE_BLACK",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#1C1C1C",
  },
  {
    optionKey: "foil_front_color",
    code: "BRONZE",
    name: "브론즈",
    priceKey: "FOIL_BRONZE",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#CD7F32",
  },
  {
    optionKey: "foil_front_color",
    code: "RED",
    name: "빨간색",
    priceKey: "FOIL_RED",
    displayOrder: 5,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FF0000",
  },
  {
    optionKey: "foil_front_color",
    code: "BLUE",
    name: "파란색",
    priceKey: "FOIL_BLUE",
    displayOrder: 6,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#0000FF",
  },
  {
    optionKey: "foil_front_color",
    code: "HOLOGRAM",
    name: "홀로그램",
    priceKey: "FOIL_HOLO",
    displayOrder: 7,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "foil_front_color",
    code: "HOLOGRAM_FOIL",
    name: "홀로그램박",
    priceKey: "FOIL_HOLO_FOIL",
    displayOrder: 8,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  // foil_back_color — same 8 choices
  {
    optionKey: "foil_back_color",
    code: "GOLD",
    name: "금박",
    priceKey: "FOIL_GOLD",
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FFD700",
  },
  {
    optionKey: "foil_back_color",
    code: "SILVER",
    name: "은박",
    priceKey: "FOIL_SILVER",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#C0C0C0",
  },
  {
    optionKey: "foil_back_color",
    code: "MATTE_BLACK",
    name: "먹유광",
    priceKey: "FOIL_MATTE_BLACK",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#1C1C1C",
  },
  {
    optionKey: "foil_back_color",
    code: "BRONZE",
    name: "브론즈",
    priceKey: "FOIL_BRONZE",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#CD7F32",
  },
  {
    optionKey: "foil_back_color",
    code: "RED",
    name: "빨간색",
    priceKey: "FOIL_RED",
    displayOrder: 5,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FF0000",
  },
  {
    optionKey: "foil_back_color",
    code: "BLUE",
    name: "파란색",
    priceKey: "FOIL_BLUE",
    displayOrder: 6,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#0000FF",
  },
  {
    optionKey: "foil_back_color",
    code: "HOLOGRAM",
    name: "홀로그램",
    priceKey: "FOIL_HOLO",
    displayOrder: 7,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "foil_back_color",
    code: "HOLOGRAM_FOIL",
    name: "홀로그램박",
    priceKey: "FOIL_HOLO_FOIL",
    displayOrder: 8,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  // foil_cover_color — same 8 choices
  {
    optionKey: "foil_cover_color",
    code: "GOLD",
    name: "금박",
    priceKey: "FOIL_GOLD",
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FFD700",
  },
  {
    optionKey: "foil_cover_color",
    code: "SILVER",
    name: "은박",
    priceKey: "FOIL_SILVER",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#C0C0C0",
  },
  {
    optionKey: "foil_cover_color",
    code: "MATTE_BLACK",
    name: "먹유광",
    priceKey: "FOIL_MATTE_BLACK",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#1C1C1C",
  },
  {
    optionKey: "foil_cover_color",
    code: "BRONZE",
    name: "브론즈",
    priceKey: "FOIL_BRONZE",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#CD7F32",
  },
  {
    optionKey: "foil_cover_color",
    code: "RED",
    name: "빨간색",
    priceKey: "FOIL_RED",
    displayOrder: 5,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FF0000",
  },
  {
    optionKey: "foil_cover_color",
    code: "BLUE",
    name: "파란색",
    priceKey: "FOIL_BLUE",
    displayOrder: 6,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#0000FF",
  },
  {
    optionKey: "foil_cover_color",
    code: "HOLOGRAM",
    name: "홀로그램",
    priceKey: "FOIL_HOLO",
    displayOrder: 7,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "foil_cover_color",
    code: "HOLOGRAM_FOIL",
    name: "홀로그램박",
    priceKey: "FOIL_HOLO_FOIL",
    displayOrder: 8,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── emboss (Section 3.1, 3.3) ──
  {
    optionKey: "emboss",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "emboss",
    code: "EMBOSS",
    name: "양각",
    priceKey: "EMBOSS",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "emboss",
    code: "DEBOSS",
    name: "음각",
    priceKey: "DEBOSS",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── binding_direction (Section 3.3) ──
  {
    optionKey: "binding_direction",
    code: "LEFT",
    name: "좌철",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "binding_direction",
    code: "TOP",
    name: "상철",
    priceKey: null,
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── endpaper (Section 3.3) ──
  {
    optionKey: "endpaper",
    code: "WHITE",
    name: "화이트",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FFFFFF",
  },
  {
    optionKey: "endpaper",
    code: "GRAY",
    name: "그레이",
    priceKey: null,
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#808080",
  },
  {
    optionKey: "endpaper",
    code: "BLACK",
    name: "블랙",
    priceKey: null,
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#000000",
  },
  {
    optionKey: "endpaper",
    code: "PRINT",
    name: "인쇄",
    priceKey: "ENDPAPER_PRINT",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── cover_coating (Section 3.3) ──
  {
    optionKey: "cover_coating",
    code: "NONE",
    name: "코팅없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "cover_coating",
    code: "MATTE",
    name: "무광코팅(단면)",
    priceKey: "COAT_MATTE",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "cover_coating",
    code: "GLOSS",
    name: "유광코팅(단면)",
    priceKey: "COAT_GLOSS",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── clear_cover (Section 3.3) ──
  {
    optionKey: "clear_cover",
    code: "NONE",
    name: "투명커버없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "clear_cover",
    code: "GLOSS",
    name: "유광투명커버",
    priceKey: "CLEAR_GLOSS",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "clear_cover",
    code: "MATTE",
    name: "무광투명커버",
    priceKey: "CLEAR_MATTE",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── hook_type (Section 3.8 — ACRYLIC) ──
  {
    optionKey: "hook_type",
    code: "NONE",
    name: "고리없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "hook_type",
    code: "SILVER",
    name: "은색고리",
    priceKey: "HOOK_SILVER",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#C0C0C0",
  },
  {
    optionKey: "hook_type",
    code: "GOLD",
    name: "금색고리",
    priceKey: "HOOK_GOLD",
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FFD700",
  },

  // ── label (Section 3.9 — GOODS) ──
  {
    optionKey: "label",
    code: "NONE",
    name: "라벨없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "label",
    code: "YES",
    name: "라벨부착",
    priceKey: "LABEL",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── inner_type (Section 3.10 — NOTE) ──
  {
    optionKey: "inner_type",
    code: "PLAIN",
    name: "무지내지",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── binding_option (Section 3.10 — NOTE) ──
  {
    optionKey: "binding_option",
    code: "50P",
    name: "50장 1권",
    priceKey: "NOTE_50P",
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "binding_option",
    code: "100P",
    name: "100장 1권",
    priceKey: "NOTE_100P",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },

  // ── ring_color (Section 3.3, 3.5 CALENDAR, 3.10 NOTE) ──
  {
    optionKey: "ring_color",
    code: "BLACK",
    name: "블랙",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: "recommended",
    sublabelKo: null,
    swatchColor: "#000000",
  },
  {
    optionKey: "ring_color",
    code: "SILVER",
    name: "실버",
    priceKey: null,
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#C0C0C0",
  },
  {
    optionKey: "ring_color",
    code: "WHITE",
    name: "화이트",
    priceKey: null,
    displayOrder: 3,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#FFFFFF",
  },
  // @MX:NOTE: [AUTO] BOOK ring_color has 3rd option "제3컬러" which is a premium color service
  {
    optionKey: "ring_color",
    code: "THIRD_COLOR",
    name: "제3컬러",
    priceKey: "RING_THIRD_COLOR",
    displayOrder: 4,
    isActive: true,
    badgeType: null,
    sublabelKo: "별도 문의",
    swatchColor: null,
  },

  // ── ring_size (Section 3.3 — BOOK image_chip) ──
  {
    optionKey: "ring_size",
    code: "D_RING_31",
    name: "D링(31mm)",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: "D링 31mm",
    swatchColor: null,
  },

  // ── stand_color (Section 3.5 — CALENDAR) ──
  {
    optionKey: "stand_color",
    code: "BLACK",
    name: "블랙",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: "recommended",
    sublabelKo: null,
    swatchColor: "#000000",
  },
  {
    optionKey: "stand_color",
    code: "SILVER",
    name: "실버",
    priceKey: null,
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: "#C0C0C0",
  },

  // ── individual_packaging (Section 3.5, 3.10) ──
  {
    optionKey: "individual_packaging",
    code: "NONE",
    name: "개별포장없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "individual_packaging",
    code: "SHRINK",
    name: "수축포장",
    priceKey: "SHRINK_WRAP",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: "+500원",
    swatchColor: null,
  },

  // ── ball_chain (Section 3.8, 3.9) ──
  {
    optionKey: "ball_chain",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "ball_chain",
    code: "ORANGE_3EA",
    name: "불체인 (오렌지) 3개 1팩",
    priceKey: "BALL_CHAIN",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: "+1,000원",
    swatchColor: null,
  },

  // ── calendar_envelope (Section 3.5, 3.6) ──
  {
    optionKey: "calendar_envelope",
    code: "NONE",
    name: "없음",
    priceKey: null,
    displayOrder: 1,
    isActive: true,
    badgeType: null,
    sublabelKo: null,
    swatchColor: null,
  },
  {
    optionKey: "calendar_envelope",
    code: "ENV_240x230",
    name: "캘린더봉투 240×230mm 10장",
    priceKey: "CAL_ENVELOPE",
    displayOrder: 2,
    isActive: true,
    badgeType: null,
    sublabelKo: "+3,000원",
    swatchColor: null,
  },
];

// ---------------------------------------------------------------------------
// Validate Data Consistency
// ---------------------------------------------------------------------------
// @MX:NOTE: [AUTO] Validation function runs before DB ops to catch data issues early

function validateData(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all 59 definitions are present
  const definitionKeys = new Set(OPTION_DEFINITIONS.map((d) => d.key));
  if (OPTION_DEFINITIONS.length !== 59) {
    errors.push(
      `Expected 59 option_definitions, found ${OPTION_DEFINITIONS.length}`
    );
  }

  // Check for duplicate keys
  const keyCount = new Map<string, number>();
  for (const def of OPTION_DEFINITIONS) {
    keyCount.set(def.key, (keyCount.get(def.key) ?? 0) + 1);
  }
  for (const [key, count] of keyCount.entries()) {
    if (count > 1) {
      errors.push(`Duplicate option_definition key: "${key}" (${count} times)`);
    }
  }

  // Check all choice optionKeys reference valid definitions
  const choiceOptKeys = new Set(OPTION_CHOICES.map((c) => c.optionKey));
  for (const optKey of choiceOptKeys) {
    if (!definitionKeys.has(optKey)) {
      errors.push(
        `option_choice references unknown option_definition key: "${optKey}"`
      );
    }
  }

  // Check for duplicate (optionKey, code) pairs
  const choicePairCount = new Map<string, number>();
  for (const choice of OPTION_CHOICES) {
    const pair = `${choice.optionKey}::${choice.code}`;
    choicePairCount.set(pair, (choicePairCount.get(pair) ?? 0) + 1);
  }
  for (const [pair, count] of choicePairCount.entries()) {
    if (count > 1) {
      errors.push(
        `Duplicate option_choice (optionKey::code): "${pair}" (${count} times)`
      );
    }
  }

  // Validate option_class values
  const validClasses = new Set([
    "core",
    "interior",
    "cover",
    "finish",
    "material",
    "misc",
    "pricing",
  ]);
  for (const def of OPTION_DEFINITIONS) {
    if (!validClasses.has(def.optionClass)) {
      errors.push(
        `Invalid option_class "${def.optionClass}" for key "${def.key}"`
      );
    }
  }

  // Validate uiComponent values
  const validComponents = new Set([
    "chip_group",
    "select",
    "stepper",
    "dual_input",
    "color_chip",
    "image_chip",
    "slider",
  ]);
  for (const def of OPTION_DEFINITIONS) {
    if (!validComponents.has(def.uiComponent)) {
      errors.push(
        `Invalid ui_component "${def.uiComponent}" for key "${def.key}"`
      );
    }
  }

  // Validate section_key values
  const validSections = new Set([
    "core",
    "finish_basic",
    "finish_post",
    "interior",
    "cover",
    "material",
    "misc",
    "pricing",
  ]);
  for (const def of OPTION_DEFINITIONS) {
    if (!validSections.has(def.sectionKey)) {
      errors.push(
        `Invalid section_key "${def.sectionKey}" for key "${def.key}"`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Import Functions
// ---------------------------------------------------------------------------

// @MX:ANCHOR: [AUTO] importOptionDefinitions — Phase 1 upsert entry point for option_definitions
// @MX:REASON: Called by main(). ON CONFLICT (key) DO UPDATE ensures idempotent runs.

async function importOptionDefinitions(
  db: ReturnType<typeof drizzle>,
  dryRun: boolean
): Promise<{ processed: number; inserted: number; errors: string[] }> {
  const records = OPTION_DEFINITIONS;
  const errors: string[] = [];
  let inserted = 0;

  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batch = records.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = batchIdx + 1;

    console.log(
      `${LABEL}    batch ${batchNum}/${totalBatches} (${batch.length} definitions)...`
    );

    if (dryRun) {
      inserted += batch.length;
      continue;
    }

    try {
      await db
        .insert(optionDefinitions)
        .values(
          batch.map((r) => ({
            key: r.key,
            name: r.name,
            optionClass: r.optionClass,
            optionType: r.optionType,
            uiComponent: r.uiComponent,
            displayOrder: r.displayOrder,
            isActive: r.isActive,
            sectionKey: r.sectionKey,
            labelKo: r.labelKo,
            layoutWidth: r.layoutWidth,
            chipColumns: r.chipColumns,
            collapsedDefault: r.collapsedDefault,
          }))
        )
        .onConflictDoUpdate({
          target: optionDefinitions.key,
          set: {
            name: sql`excluded.name`,
            optionClass: sql`excluded.option_class`,
            optionType: sql`excluded.option_type`,
            uiComponent: sql`excluded.ui_component`,
            displayOrder: sql`excluded.display_order`,
            isActive: sql`excluded.is_active`,
            sectionKey: sql`excluded.section_key`,
            labelKo: sql`excluded.label_ko`,
            layoutWidth: sql`excluded.layout_width`,
            chipColumns: sql`excluded.chip_columns`,
            collapsedDefault: sql`excluded.collapsed_default`,
            updatedAt: sql`now()`,
          },
        });

      inserted += batch.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${LABEL}   ERROR in definitions batch ${batchNum}: ${message}`);
      errors.push(`definitions batch ${batchNum}: ${message}`);
    }
  }

  return { processed: records.length, inserted, errors };
}

// @MX:ANCHOR: [AUTO] importOptionChoices — Phase 1 upsert entry point for option_choices
// @MX:REASON: Called by main(). ON CONFLICT (option_definition_id, code) DO UPDATE ensures idempotent runs.

async function importOptionChoices(
  db: ReturnType<typeof drizzle>,
  dryRun: boolean
): Promise<{ processed: number; inserted: number; errors: string[] }> {
  // Build key->id lookup map
  const keyToId = new Map<string, number>();

  if (!dryRun) {
    const existingDefs = await db
      .select({ id: optionDefinitions.id, key: optionDefinitions.key })
      .from(optionDefinitions);

    for (const def of existingDefs) {
      keyToId.set(def.key, def.id);
    }
  }

  const errors: string[] = [];
  let inserted = 0;
  const skipped: string[] = [];

  // Build resolved records, skipping any with unknown optionKey
  type ResolvedChoice = {
    optionDefinitionId: number;
    code: string;
    name: string;
    priceKey: string | null;
    displayOrder: number;
    isActive: boolean;
    badgeType: string | null;
    sublabelKo: string | null;
    swatchColor: string | null;
  };

  const resolvedChoices: ResolvedChoice[] = [];

  for (const choice of OPTION_CHOICES) {
    if (dryRun) {
      // In dry-run, use placeholder id 0
      resolvedChoices.push({
        optionDefinitionId: 0,
        code: choice.code,
        name: choice.name,
        priceKey: choice.priceKey,
        displayOrder: choice.displayOrder,
        isActive: choice.isActive,
        badgeType: choice.badgeType,
        sublabelKo: choice.sublabelKo,
        swatchColor: choice.swatchColor,
      });
      continue;
    }

    const defId = keyToId.get(choice.optionKey);
    if (defId === undefined) {
      skipped.push(choice.optionKey);
      console.log(
        `${LABEL}   SKIP choice (${choice.optionKey}::${choice.code}): definition not found in DB`
      );
      continue;
    }

    resolvedChoices.push({
      optionDefinitionId: defId,
      code: choice.code,
      name: choice.name,
      priceKey: choice.priceKey,
      displayOrder: choice.displayOrder,
      isActive: choice.isActive,
      badgeType: choice.badgeType,
      sublabelKo: choice.sublabelKo,
      swatchColor: choice.swatchColor,
    });
  }

  if (skipped.length > 0) {
    const uniqueSkipped = [...new Set(skipped)];
    console.log(
      `${LABEL}   Skipped choices for missing definitions: ${uniqueSkipped.join(", ")}`
    );
  }

  const totalBatches = Math.ceil(resolvedChoices.length / BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batch = resolvedChoices.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = batchIdx + 1;

    console.log(
      `${LABEL}    batch ${batchNum}/${totalBatches} (${batch.length} choices)...`
    );

    if (dryRun) {
      inserted += batch.length;
      continue;
    }

    try {
      await db
        .insert(optionChoices)
        .values(
          batch.map((r) => ({
            optionDefinitionId: r.optionDefinitionId,
            code: r.code,
            name: r.name,
            priceKey: r.priceKey,
            displayOrder: r.displayOrder,
            isActive: r.isActive,
            badgeType: r.badgeType,
            sublabelKo: r.sublabelKo,
            swatchColor: r.swatchColor,
          }))
        )
        .onConflictDoUpdate({
          target: [optionChoices.optionDefinitionId, optionChoices.code],
          set: {
            name: sql`excluded.name`,
            priceKey: sql`excluded.price_key`,
            displayOrder: sql`excluded.display_order`,
            isActive: sql`excluded.is_active`,
            badgeType: sql`excluded.badge_type`,
            sublabelKo: sql`excluded.sublabel_ko`,
            swatchColor: sql`excluded.swatch_color`,
            updatedAt: sql`now()`,
          },
        });

      inserted += batch.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${LABEL}   ERROR in choices batch ${batchNum}: ${message}`);
      errors.push(`choices batch ${batchNum}: ${message}`);
    }
  }

  return {
    processed: OPTION_CHOICES.length,
    inserted,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(
    `${LABEL} Starting option definitions + choices import${DRY_RUN ? " (DRY RUN)" : ""}${VALIDATE_ONLY ? " (VALIDATE ONLY)" : ""}...`
  );

  // Step 1: Validate data consistency before any DB operations
  console.log(`${LABEL} Validating data consistency...`);
  const validation = validateData();

  if (!validation.valid) {
    console.error(`${LABEL} Validation FAILED:`);
    for (const err of validation.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `${LABEL} Validation passed: ${OPTION_DEFINITIONS.length} definitions, ${OPTION_CHOICES.length} choices`
  );

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} --validate-only: exiting without DB operations.`);
    return;
  }

  // Step 2: Connect to DB
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(`${LABEL} ERROR: DATABASE_URL environment variable is not set`);
    process.exit(1);
  }

  const client = DRY_RUN ? null : postgres(connectionString, { max: 5 });
  const db = DRY_RUN
    ? (null as unknown as ReturnType<typeof drizzle>)
    : drizzle(client!);

  // Step 3: Import option_definitions
  console.log(`${LABEL} ── option_definitions`);
  const defResult = await importOptionDefinitions(db, DRY_RUN);
  console.log(
    `${LABEL}    ${defResult.processed} processed, ${defResult.inserted} inserted/updated, 0 skipped, ${defResult.errors.length} errors`
  );

  if (defResult.errors.length > 0 && !DRY_RUN) {
    console.error(`${LABEL} Aborting choices import due to definition errors.`);
    await client?.end();
    process.exit(1);
  }

  // Step 4: Import option_choices (depends on option_definitions being in DB)
  console.log(`${LABEL} ── option_choices`);
  const choiceResult = await importOptionChoices(db, DRY_RUN);
  console.log(
    `${LABEL}    ${choiceResult.processed} processed, ${choiceResult.inserted} inserted/updated, ${choiceResult.processed - choiceResult.inserted - choiceResult.errors.length} skipped, ${choiceResult.errors.length} errors`
  );

  // Step 5: Cleanup
  if (client) {
    await client.end();
  }

  console.log(`${LABEL} Done.`);

  const totalErrors = defResult.errors.length + choiceResult.errors.length;
  if (totalErrors > 0) {
    console.error(`${LABEL} Completed with ${totalErrors} error(s).`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
