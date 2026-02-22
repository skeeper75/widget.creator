/**
 * Database seed script for Widget Creator.
 *
 * Reads parsed catalog data and bulk inserts it into
 * the PostgreSQL database via Prisma client.
 *
 * Usage: npx tsx prisma/seed.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import * as path from "node:path";
import {
  parseCatalogIndex,
  parseAllProducts,
} from "../packages/shared/src/parsers/catalog-parser.js";
import type {
  ParsedProduct,
  ParsedCatalogIndex,
  IndexCategory,
} from "../packages/shared/src/parsers/catalog-parser.js";

// ============================================================
// Category hierarchy builder
// ============================================================

export interface CategoryHierarchyEntry {
  id: string;
  slug: string;
  displayName: string;
  productCount: number;
  keywords: string[];
  level: number;
  parentSlug: string | null;
  sortOrder: number;
}

/**
 * Build parent-child category hierarchy from flat category list.
 *
 * Categories with multi-segment paths are children of the parent
 * path. For example, path ["sticker", "square"] has parent "sticker".
 */
export function buildCategoryHierarchy(
  categories: IndexCategory[],
): CategoryHierarchyEntry[] {
  // Build a map from path string to slug for parent lookup
  const pathToSlug = new Map<string, string>();
  for (const cat of categories) {
    // Use the first path segment as the root identifier
    if (cat.path.length === 1) {
      pathToSlug.set(cat.path[0], cat.slug);
    }
  }

  return categories.map((cat, index) => {
    let parentSlug: string | null = null;
    let level = 1;

    if (cat.path.length > 1) {
      // Parent is the category whose path matches all but the last segment
      const parentPath = cat.path[0];
      parentSlug = pathToSlug.get(parentPath) ?? null;
      level = cat.path.length;
    }

    return {
      id: cat.id,
      slug: cat.slug,
      displayName: cat.displayName,
      productCount: cat.productCount,
      keywords: cat.keywords,
      level,
      parentSlug,
      sortOrder: index,
    };
  });
}

// ============================================================
// Prisma create data builders
// ============================================================

/**
 * Build Prisma create data for a product category.
 */
export function buildCategoryCreateData(
  cat: CategoryHierarchyEntry,
  parentId: string | null,
): Omit<Prisma.ProductCategoryCreateInput, "parent" | "children" | "products"> & {
  parentId: string | null;
} {
  return {
    slug: cat.slug,
    displayName: cat.displayName,
    productCount: cat.productCount,
    keywords: cat.keywords,
    level: cat.level,
    sortOrder: cat.sortOrder,
    parentId,
  };
}

/**
 * Build Prisma create data for a product with all sub-records.
 */
export function buildProductCreateData(
  product: ParsedProduct,
  categoryId: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    externalId: product.externalId,
    name: product.name,
    categoryId,
    selType: product.selType,
    pjoin: product.pjoin,
    unit: product.unit,
    fileTypes: product.fileTypes,
    coverInfo: product.coverInfo as Prisma.InputJsonValue,
    deliveryGroupNo: product.deliveryGroupNo,
    deliveryGroupName: product.deliveryGroupName,
    deliveryPrepay: product.deliveryPrepay,
    cutoffTime: product.cutoffTime,
    syncedAt: new Date(),
    rawData: product.rawData as Prisma.InputJsonValue,

    // Nested creates for sub-records
    sizes: {
      create: product.sizes.map((s) => ({
        externalSizeNo: s.externalSizeNo,
        coverCd: s.coverCd,
        sizeName: s.sizeName,
        width: s.width,
        height: s.height,
        cutSize: s.cutSize,
        isNonStandard: s.isNonStandard,
        reqWidth: s.reqWidth as Prisma.InputJsonValue | undefined,
        reqHeight: s.reqHeight as Prisma.InputJsonValue | undefined,
        reqAwkjob: s.reqAwkjob as Prisma.InputJsonValue | undefined,
        rstOrdqty: s.rstOrdqty as Prisma.InputJsonValue | undefined,
        rstAwkjob: s.rstAwkjob as Prisma.InputJsonValue | undefined,
      })),
    },

    papers: {
      create: product.papers.map((p) => ({
        externalPaperNo: p.externalPaperNo,
        coverCd: p.coverCd,
        paperName: p.paperName,
        paperGroup: p.paperGroup,
        pGram: p.pGram,
        reqWidth: p.reqWidth as Prisma.InputJsonValue | undefined,
        reqHeight: p.reqHeight as Prisma.InputJsonValue | undefined,
        reqAwkjob: p.reqAwkjob as Prisma.InputJsonValue | undefined,
        rstOrdqty: p.rstOrdqty as Prisma.InputJsonValue | undefined,
        rstPrsjob: p.rstPrsjob as Prisma.InputJsonValue | undefined,
        rstAwkjob: p.rstAwkjob as Prisma.InputJsonValue | undefined,
      })),
    },

    colors: {
      create: product.colors.map((c) => ({
        externalColorNo: c.externalColorNo,
        coverCd: c.coverCd,
        pageCd: c.pageCd,
        colorName: c.colorName,
        pdfPage: c.pdfPage,
        isAdditional: c.isAdditional,
        reqPrsjob: c.reqPrsjob as Prisma.InputJsonValue | undefined,
        reqAwkjob: c.reqAwkjob as Prisma.InputJsonValue | undefined,
        rstPrsjob: c.rstPrsjob as Prisma.InputJsonValue | undefined,
        rstAwkjob: c.rstAwkjob as Prisma.InputJsonValue | undefined,
      })),
    },

    printMethods: {
      create: product.printMethods.map((pm) => ({
        externalJobPresetNo: pm.externalJobPresetNo,
        jobPreset: pm.jobPreset,
        prsjobList: pm.prsjobList as unknown as Prisma.InputJsonValue,
        reqColor: pm.reqColor as Prisma.InputJsonValue | undefined,
        rstPaper: pm.rstPaper as Prisma.InputJsonValue | undefined,
        rstAwkjob: pm.rstAwkjob as Prisma.InputJsonValue | undefined,
      })),
    },

    postProcesses: {
      create: product.postProcesses.map((pp) => ({
        coverCd: pp.coverCd,
        inputType: pp.inputType,
        jobGroupList: pp.jobGroupList as unknown as Prisma.InputJsonValue,
      })),
    },

    orderQtys: {
      create: product.orderQtys.map((oq) => ({
        displayType: oq.displayType,
        jobPresetNo: oq.jobPresetNo,
        sizeNo: oq.sizeNo,
        paperNo: oq.paperNo,
        optNo: oq.optNo,
        colorNo: oq.colorNo,
        colorNoAdd: oq.colorNoAdd,
        minQty: oq.minQty,
        maxQty: oq.maxQty,
        interval: oq.interval,
        qtyList: oq.qtyList ?? [],
      })),
    },
  };

  // Only include deliveryInfo if present
  if (product.deliveryInfo) {
    data.deliveryInfo = {
      create: {
        freeShipping: product.deliveryInfo.freeShipping as Prisma.InputJsonValue,
        methods: product.deliveryInfo.methods as Prisma.InputJsonValue,
        regions: (product.deliveryInfo.regions ?? {}) as Prisma.InputJsonValue,
      },
    };
  }

  return data;
}

// ============================================================
// Main seed function
// ============================================================

/**
 * Seeds the database with catalog data.
 */
async function main() {
  const prisma = new PrismaClient();
  const catalogDir = path.resolve(__dirname, "../ref/wowpress/catalog");
  const indexPath = path.join(catalogDir, "index.json");

  try {
    console.log("Reading catalog index...");
    const index = await parseCatalogIndex(indexPath);
    console.log(`Found ${index.categoryCount} categories, ${index.productCount} products`);

    console.log("Parsing all products...");
    const products = await parseAllProducts(catalogDir);
    console.log(`Parsed ${products.length} products successfully`);

    // Build category hierarchy
    const hierarchy = buildCategoryHierarchy(index.categories);

    // Seed in a transaction
    await prisma.$transaction(async (tx) => {
      // Clean existing data
      console.log("Cleaning existing data...");
      await tx.pricingTable.deleteMany();
      await tx.deliveryInfo.deleteMany();
      await tx.productOrderQty.deleteMany();
      await tx.productPostProcess.deleteMany();
      await tx.productPrintMethod.deleteMany();
      await tx.productColor.deleteMany();
      await tx.productPaper.deleteMany();
      await tx.productSize.deleteMany();
      await tx.printProduct.deleteMany();
      await tx.productCategory.deleteMany();

      // Create categories (parents first)
      console.log("Creating categories...");
      const slugToId = new Map<string, string>();

      // First pass: root categories (level 1)
      for (const cat of hierarchy.filter((c) => c.level === 1)) {
        const created = await tx.productCategory.create({
          data: buildCategoryCreateData(cat, null) as Prisma.ProductCategoryCreateInput,
        });
        slugToId.set(cat.slug, created.id);
      }

      // Second pass: child categories (level 2+)
      for (const cat of hierarchy.filter((c) => c.level > 1)) {
        const parentId = cat.parentSlug ? slugToId.get(cat.parentSlug) ?? null : null;
        const created = await tx.productCategory.create({
          data: buildCategoryCreateData(cat, parentId) as Prisma.ProductCategoryCreateInput,
        });
        slugToId.set(cat.slug, created.id);
      }
      console.log(`Created ${slugToId.size} categories`);

      // Create products
      console.log("Creating products...");
      let productCount = 0;

      for (const product of products) {
        // Find category for this product by matching categoryPath
        let categoryId: string | null = null;
        for (const cat of index.categories) {
          // Match by checking if all path segments appear in categoryPath
          if (
            cat.path.length > 0 &&
            cat.path.length === product.categoryPath.length &&
            cat.path.every((segment, i) => segment === product.categoryPath[i])
          ) {
            categoryId = slugToId.get(cat.slug) ?? null;
            break;
          }
        }

        // Fallback: find the most specific matching category
        if (!categoryId && product.categoryPath.length > 0) {
          for (const cat of index.categories) {
            if (cat.path[0] === product.categoryPath[0]) {
              categoryId = slugToId.get(cat.slug) ?? null;
              // Keep searching for a more specific match
            }
          }
        }

        if (!categoryId) {
          console.warn(`Warning: No category found for product ${product.externalId} (${product.name}), skipping`);
          continue;
        }

        try {
          await tx.printProduct.create({
            data: buildProductCreateData(product, categoryId) as Prisma.PrintProductCreateInput,
          });
          productCount++;

          if (productCount % 50 === 0) {
            console.log(`  Created ${productCount} products...`);
          }
        } catch (err) {
          console.warn(`Warning: Failed to create product ${product.externalId}: ${(err as Error).message}`);
        }
      }

      console.log(`Created ${productCount} products`);
    });

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
const isDirectRun =
  typeof require !== "undefined"
    ? require.main === module
    : import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  main();
}
