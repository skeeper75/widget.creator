/**
 * Selections State - User selection signals
 * @see SPEC-WIDGET-SDK-001 Section 4.6
 */

import { signal, computed } from '@preact/signals';
import { widgetEvents } from '../utils/events';
import type { PostProcessGroup } from '../types';

/**
 * User selections state
 */
export interface Selections {
  sizeId: number | null;
  paperId: number | null;
  paperCoverId: number | null;
  options: Map<string, string>;
  quantity: number;
  customWidth: number | null;
  customHeight: number | null;
  postProcesses: Map<string, string>;
  accessories: Map<string, string>;
}

/**
 * Initial selections state
 */
const initialSelections: Selections = {
  sizeId: null,
  paperId: null,
  paperCoverId: null,
  options: new Map(),
  quantity: 1,
  customWidth: null,
  customHeight: null,
  postProcesses: new Map(),
  accessories: new Map(),
};

/**
 * Selections signal
 */
export const selections = signal<Selections>(structuredClone(initialSelections));

/**
 * Computed: All selections as plain object (for events)
 */
export const selectionsAsObject = computed(() => {
  const s = selections.value;
  const optionsObj: Record<string, string> = {};
  s.options.forEach((value, key) => {
    optionsObj[key] = value;
  });
  const postProcessesObj: Record<string, string> = {};
  s.postProcesses.forEach((value, key) => {
    postProcessesObj[key] = value;
  });
  const accessoriesObj: Record<string, string> = {};
  s.accessories.forEach((value, key) => {
    accessoriesObj[key] = value;
  });
  return {
    sizeId: s.sizeId,
    paperId: s.paperId,
    paperCoverId: s.paperCoverId,
    quantity: s.quantity,
    customWidth: s.customWidth,
    customHeight: s.customHeight,
    options: optionsObj,
    postProcesses: postProcessesObj,
    accessories: accessoriesObj,
  };
});

/**
 * Computed: Has required selections
 */
export const hasRequiredSelections = computed(() => {
  const s = selections.value;
  return s.sizeId !== null;
});

/**
 * Selection setters
 */
export function setSizeId(sizeId: number | null): void {
  const oldValue = selections.value.sizeId;
  selections.value = { ...selections.value, sizeId };
  if (oldValue !== sizeId) {
    dispatchOptionChange('size', oldValue, sizeId);
  }
}

export function setPaperId(paperId: number | null): void {
  const oldValue = selections.value.paperId;
  selections.value = { ...selections.value, paperId };
  if (oldValue !== paperId) {
    dispatchOptionChange('paper', oldValue, paperId);
  }
}

export function setPaperCoverId(paperCoverId: number | null): void {
  const oldValue = selections.value.paperCoverId;
  selections.value = { ...selections.value, paperCoverId };
  if (oldValue !== paperCoverId) {
    dispatchOptionChange('paperCover', oldValue, paperCoverId);
  }
}

export function setQuantity(quantity: number): void {
  const oldValue = selections.value.quantity;
  selections.value = { ...selections.value, quantity };
  if (oldValue !== quantity) {
    dispatchOptionChange('quantity', oldValue, quantity);
  }
}

export function setCustomDimensions(width: number, height: number): void {
  selections.value = {
    ...selections.value,
    customWidth: width,
    customHeight: height,
  };
}

export function setOption(optionKey: string, value: string): void {
  const oldOptions = selections.value.options;
  const oldValue = oldOptions.get(optionKey) ?? null;
  const newOptions = new Map(oldOptions);
  newOptions.set(optionKey, value);
  selections.value = { ...selections.value, options: newOptions };
  if (oldValue !== value) {
    dispatchOptionChange(optionKey, oldValue, value);
  }
}

export function setPostProcess(processKey: string, value: string): void {
  const oldProcesses = selections.value.postProcesses;
  const oldValue = oldProcesses.get(processKey) ?? null;
  const newProcesses = new Map(oldProcesses);
  if (value === '') {
    newProcesses.delete(processKey);
  } else {
    newProcesses.set(processKey, value);
  }
  selections.value = { ...selections.value, postProcesses: newProcesses };
  if (oldValue !== value) {
    dispatchOptionChange(`postProcess_${processKey}`, oldValue, value);
  }
}

export function setAccessory(accessoryKey: string, value: string): void {
  const oldAccessories = selections.value.accessories;
  const oldValue = oldAccessories.get(accessoryKey) ?? null;
  const newAccessories = new Map(oldAccessories);
  newAccessories.set(accessoryKey, value);
  selections.value = { ...selections.value, accessories: newAccessories };
  if (oldValue !== value) {
    dispatchOptionChange(`accessory_${accessoryKey}`, oldValue, value);
  }
}

/**
 * Reset all selections
 */
export function resetSelections(): void {
  selections.value = structuredClone(initialSelections);
}

/**
 * Dispatch option changed event
 */
function dispatchOptionChange(optionKey: string, oldValue: unknown, newValue: unknown): void {
  widgetEvents.optionChanged({
    optionKey,
    oldValue: oldValue !== null ? String(oldValue) : null,
    newValue: String(newValue),
    allSelections: selectionsAsObject.value.options,
  });
}
