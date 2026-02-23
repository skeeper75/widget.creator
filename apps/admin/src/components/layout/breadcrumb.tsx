"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

/** Map URL segments to display labels */
const segmentLabels: Record<string, string> = {
  admin: "Admin",
  dashboard: "Dashboard",
  products: "Products",
  categories: "Categories",
  list: "List",
  materials: "Materials",
  papers: "Papers",
  mappings: "Mappings",
  processes: "Processes",
  "print-modes": "Print Modes",
  "post-processes": "Post Processes",
  bindings: "Bindings",
  imposition: "Imposition",
  pricing: "Pricing",
  tables: "Price Tables",
  tiers: "Price Tiers",
  fixed: "Fixed Prices",
  packages: "Package Prices",
  foil: "Foil Prices",
  loss: "Loss Config",
  options: "Options",
  definitions: "Definitions",
  choices: "Choices",
  constraints: "Constraints",
  dependencies: "Dependencies",
  integration: "Integration",
  mes: "MES Items",
  "mes-mapping": "MES Mapping",
  editors: "Editor Mapping",
  "mes-options": "MES Options",
  widgets: "Widgets",
  preview: "Preview",
  settings: "Settings",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items from path segments
  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = segmentLabels[segment] ?? segment;
    const isLast = index === segments.length - 1;
    // Skip numeric segments (dynamic route params) display; show as ID
    const isNumeric = /^\d+$/.test(segment);
    const displayLabel = isNumeric ? `#${segment}` : label;

    return { href, label: displayLabel, isLast };
  });

  // Skip the "admin" prefix in breadcrumb display
  const displayItems = items.filter((item) => item.label !== "Admin");

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm">
      <Link
        href="/admin/dashboard"
        className="text-muted-foreground hover:text-foreground"
      >
        <Home className="h-4 w-4" />
      </Link>
      {displayItems.map((item) => (
        <Fragment key={item.href}>
          <ChevronRight className="mx-2 h-3 w-3 text-muted-foreground" />
          {item.isLast ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
