// Simulation and Admin Console types
// SPEC-WB-005

export interface CompletenessItem {
  item: 'options' | 'pricing' | 'constraints' | 'mesMapping';
  completed: boolean;
  message: string;
}

export interface CompletenessResult {
  items: CompletenessItem[];
  publishable: boolean;
  completedCount: number;
  totalCount: number;
}

export interface SimulationCaseResult {
  selections: Record<string, string>;
  resultStatus: 'pass' | 'warn' | 'error';
  totalPrice: number | null;
  constraintViolations: unknown[] | null;
  priceBreakdown: unknown | null;
  message: string | null;
}

export interface SimulationResult {
  total: number;
  passed: number;
  warned: number;
  errored: number;
  cases: SimulationCaseResult[];
}

// @MX:NOTE: [AUTO] TooLargeResult is returned when combinations exceed 10K and forceRun is not set
export interface TooLargeResult {
  tooLarge: true;
  total: number;
  sampleSize: number;
}

export type SimulationRunResult = SimulationResult | TooLargeResult;

export interface SimulationOptions {
  sample?: boolean;
  forceRun?: boolean;
  onProgress?: (current: number, total: number) => void;
}

export interface PublishOptions {
  simulationRunId?: number;
  createdBy?: string;
}
