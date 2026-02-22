// Pricing engine type definitions

export type PricingModel =
  | 'formula'
  | 'formula_cutting'
  | 'fixed_unit'
  | 'package'
  | 'component'
  | 'fixed_size'
  | 'fixed_per_unit';

// === Lookup data types (injected by caller) ===

export interface PriceTier {
  optionCode: string;
  minQty: number;
  maxQty: number;
  unitPrice: number;
  sheetStandard: string | null;
}

export interface ImpositionRule {
  cutWidth: number;
  cutHeight: number;
  sheetStandard: string;
  impositionCount: number;
}

export interface LossQuantityConfig {
  scopeType: 'product' | 'category' | 'global';
  scopeId: number | null;
  lossRate: number;
  minLossQty: number;
}

export interface Paper {
  id: number;
  name: string;
  weight: number | null;
  costPer4Cut: number;
  sellingPer4Cut: number;
}

export interface PrintMode {
  id: number;
  name: string;
  priceCode: string;
  sides: 'single' | 'double';
  colorType: string;
}

export interface PostProcess {
  id: number;
  name: string;
  groupCode: string;
  processType: string;
  priceCode: string;
  priceBasis: 'per_sheet' | 'per_unit';
  sheetStandard: string | null;
}

export interface Binding {
  id: number;
  name: string;
  priceCode: string;
  minPages: number;
  maxPages: number;
  pageStep: number;
}

export interface FixedPriceRecord {
  productId: number;
  sizeId: number | null;
  paperId: number | null;
  printModeId: number | null;
  sellingPrice: number;
  costPrice: number;
  baseQty: number;
}

export interface PackagePriceRecord {
  productId: number;
  sizeId: number;
  printModeId: number;
  pageCount: number;
  minQty: number;
  maxQty: number;
  sellingPrice: number;
}

export interface FoilPriceRecord {
  foilType: string;
  width: number;
  height: number;
  sellingPrice: number;
}

export interface SizeSelection {
  sizeId: number;
  cutWidth: number;
  cutHeight: number;
  impositionCount: number | null;
  isCustom: boolean;
  customWidth?: number;
  customHeight?: number;
}

export interface SelectedOption {
  optionKey: string;
  choiceCode: string;
  choiceId?: number;
  refPaperId?: number;
  refPrintModeId?: number;
  refPostProcessId?: number;
  unitPrice?: number;
}

// === Pricing Engine input/output types ===

export interface PricingLookupData {
  priceTiers: PriceTier[];
  fixedPrices: FixedPriceRecord[];
  packagePrices: PackagePriceRecord[];
  foilPrices: FoilPriceRecord[];
  impositionRules: ImpositionRule[];
  lossConfigs: LossQuantityConfig[];
  papers: Paper[];
  printModes: PrintMode[];
  postProcesses: PostProcess[];
  bindings: Binding[];
}

export interface PriceBreakdown {
  printCost: number;
  paperCost: number;
  specialColorCost: number;
  coatingCost: number;
  postProcessCost: number;
  bindingCost: number;
  foilCost: number;
  packagingCost: number;
  cuttingCost: number;
  discountAmount: number;
}

export interface PricingInput {
  pricingModel: PricingModel;
  productId: number;
  categoryId: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  sizeSelection: SizeSelection;
  lookupData: PricingLookupData;
}

export interface PricingResult {
  totalPrice: number;
  totalPriceWithVat: number;
  unitPrice: number;
  breakdown: PriceBreakdown;
  model: PricingModel;
  calculatedAt: number;
}

export type PricingStrategy = (input: PricingInput) => PricingResult;

// === Model-specific input types ===

export interface FormulaInput extends PricingInput {
  pricingModel: 'formula';
  paper: Paper;
  printMode: PrintMode;
  specialColors: { priceCode: string }[];
  coating: { priceCode: string } | null;
  postProcesses: PostProcess[];
  sheetStandard: string;
}

export interface FormulaCuttingInput extends Omit<FormulaInput, 'pricingModel'> {
  pricingModel: 'formula_cutting';
  cuttingType: 'half_cut' | 'full_cut' | 'kiss_cut';
}

export interface FixedUnitInput extends PricingInput {
  pricingModel: 'fixed_unit';
  paper: { paperId: number } | null;
  printMode: { printModeId: number } | null;
}

export interface PackageInput extends PricingInput {
  pricingModel: 'package';
  printMode: { printModeId: number };
  pageCount: number;
}

export interface ComponentInput extends PricingInput {
  pricingModel: 'component';
  innerBody: {
    paper: Paper;
    printMode: PrintMode;
    pageCount: number;
    impositionCount: number | null;
    sheetStandard: string;
  };
  cover: {
    paper: Paper;
    printMode: PrintMode;
    impositionCount: number | null;
    sheetStandard: string;
  };
  binding: Binding & { priceCode: string };
  coverCoating: { priceCode: string } | null;
  foilEmboss: {
    foilType: string;
    width: number;
    height: number;
  } | null;
  packaging: { unitPrice: number } | null;
}

export interface FixedSizeInput extends PricingInput {
  pricingModel: 'fixed_size';
  additionalOptions: SelectedOption[];
}

export interface FixedPerUnitInput extends PricingInput {
  pricingModel: 'fixed_per_unit';
  processingOptions: SelectedOption[];
  additionalProducts: { unitPrice: number }[];
}
