/**
 * Non-standard size validation handler.
 *
 * Validates user-provided width/height values against the
 * min/max range constraints defined in the size's req_width
 * and req_height fields.
 */
import type {
  ProductSize,
  ConstraintViolation,
} from "@widget-creator/shared";

/** User input for non-standard size dimensions */
export interface NonStandardSizeInput {
  width: number;
  height: number;
}

/** Validation result for non-standard size input */
export interface NonStandardSizeValidation {
  valid: boolean;
  violations: ConstraintViolation[];
}

/**
 * Validate a non-standard size input against the size's
 * req_width and req_height constraints.
 *
 * @param sizeData - The size definition with req_width/req_height constraints
 * @param input - The user-provided width and height values
 * @returns Validation result with any constraint violations
 */
export function validateNonStandardSize(
  sizeData: ProductSize,
  input: NonStandardSizeInput,
): NonStandardSizeValidation {
  const violations: ConstraintViolation[] = [];
  const sizeRef = `size:${sizeData.externalSizeNo}`;

  // Validate width
  if (sizeData.reqWidth === null) {
    violations.push({
      type: "required",
      source: sizeRef,
      target: "width",
      message: "No width constraint defined for non-standard size",
    });
  } else {
    const { min, max } = sizeData.reqWidth;
    if (input.width < min || input.width > max) {
      violations.push({
        type: "required",
        source: sizeRef,
        target: "width",
        message: `Width must be between ${min} and ${max} ${sizeData.reqWidth.unit}`,
      });
    }
  }

  // Validate height
  if (sizeData.reqHeight === null) {
    violations.push({
      type: "required",
      source: sizeRef,
      target: "height",
      message: "No height constraint defined for non-standard size",
    });
  } else {
    const { min, max } = sizeData.reqHeight;
    if (input.height < min || input.height > max) {
      violations.push({
        type: "required",
        source: sizeRef,
        target: "height",
        message: `Height must be between ${min} and ${max} ${sizeData.reqHeight.unit}`,
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
