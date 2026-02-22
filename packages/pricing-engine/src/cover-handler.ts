/**
 * Cover handler for pjoin-based cover structure.
 *
 * - pjoin=0 (unified): All options under coverCd=0
 * - pjoin=1 (separated): Options split by coverCd (1=Cover, 2=Inner Pages, 3=Divider)
 *
 * Key rules:
 * - Sizes are ALWAYS shared across all cover types
 * - Papers are INDEPENDENT per cover type
 * - Colors are INDEPENDENT per cover type
 * - Post-processes are INDEPENDENT per cover type
 */
import type {
  ProductSize,
  ProductPaper,
  ProductColor,
  ProductPostProcess,
} from "@widget-creator/shared";

import type { ProductData } from "./types.js";

/** Cover type descriptor */
export interface CoverType {
  coverCd: number;
  name: string;
}

/** Options available for a specific cover type */
export interface CoverOptions {
  sizes: ProductSize[];
  papers: ProductPaper[];
  colors: ProductColor[];
  postProcesses: ProductPostProcess[];
}

/**
 * Handles the pjoin-based cover structure.
 * Provides cover-filtered views of product options.
 */
export class CoverHandler {
  private readonly data: ProductData;

  constructor(productData: ProductData) {
    this.data = productData;
  }

  /**
   * Get available cover types for this product.
   * - pjoin=0: Single unified cover (coverCd=0)
   * - pjoin=1: Multiple covers from coverInfo
   */
  getCoverTypes(): CoverType[] {
    if (this.data.product.pjoin === 0) {
      return [{ coverCd: 0, name: "Unified" }];
    }

    // Extract cover types from coverInfo
    const coverInfo = this.data.product.coverInfo as {
      covers?: Array<{ covercd: number; covername: string }>;
    } | null;

    if (coverInfo?.covers && Array.isArray(coverInfo.covers)) {
      return coverInfo.covers.map((c) => ({
        coverCd: c.covercd,
        name: c.covername,
      }));
    }

    // Fallback: derive cover types from the data itself
    const coverCds = new Set<number>();
    for (const paper of this.data.papers) {
      if (paper.coverCd !== 0) coverCds.add(paper.coverCd);
    }
    for (const color of this.data.colors) {
      if (color.coverCd !== 0) coverCds.add(color.coverCd);
    }

    return Array.from(coverCds)
      .sort()
      .map((cd) => ({
        coverCd: cd,
        name: `Cover ${cd}`,
      }));
  }

  /**
   * Get option tree for a specific cover type.
   * Sizes are always shared (global); papers, colors, post-processes
   * are filtered by coverCd.
   */
  getOptionsForCover(coverCd: number): CoverOptions {
    return {
      sizes: this.data.sizes, // Always shared across covers
      papers: this.data.papers.filter((p) => p.coverCd === coverCd),
      colors: this.data.colors.filter((c) => c.coverCd === coverCd),
      postProcesses: this.data.postProcesses.filter(
        (pp) => pp.coverCd === coverCd,
      ),
    };
  }

  /**
   * Check if size is shared across covers.
   * Always true: sizes are global in the WowPress model.
   */
  isSizeShared(): boolean {
    return true;
  }
}
