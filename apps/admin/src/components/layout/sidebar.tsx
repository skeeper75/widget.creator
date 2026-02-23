"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Layers,
  Settings2,
  DollarSign,
  Sliders,
  Link as LinkIcon,
  Code,
  Cog,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

/**
 * Navigation groups matching SPEC Section 4.6.
 * REQ-U-008: Responsive sidebar navigation with 6 domain groups + icons.
 */
const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Product Management",
    href: "/admin/products",
    icon: Package,
    children: [
      { label: "Categories", href: "/admin/products/categories" },
      { label: "Products", href: "/admin/products/list" },
    ],
  },
  {
    label: "Material Management",
    href: "/admin/materials",
    icon: Layers,
    children: [
      { label: "Papers", href: "/admin/materials/papers" },
      { label: "Materials", href: "/admin/materials/materials" },
      { label: "Paper-Product Mapping", href: "/admin/materials/mappings" },
    ],
  },
  {
    label: "Process Management",
    href: "/admin/processes",
    icon: Settings2,
    children: [
      { label: "Print Modes", href: "/admin/processes/print-modes" },
      { label: "Post Processes", href: "/admin/processes/post-processes" },
      { label: "Bindings", href: "/admin/processes/bindings" },
      { label: "Imposition Rules", href: "/admin/processes/imposition" },
    ],
  },
  {
    label: "Price Management",
    href: "/admin/pricing",
    icon: DollarSign,
    children: [
      { label: "Price Tables", href: "/admin/pricing/tables" },
      { label: "Price Tiers", href: "/admin/pricing/tiers" },
      { label: "Fixed Prices", href: "/admin/pricing/fixed" },
      { label: "Package Prices", href: "/admin/pricing/packages" },
      { label: "Foil Prices", href: "/admin/pricing/foil" },
      { label: "Loss Config", href: "/admin/pricing/loss" },
    ],
  },
  {
    label: "Option Management",
    href: "/admin/options",
    icon: Sliders,
    children: [
      { label: "Definitions", href: "/admin/options/definitions" },
      { label: "Choices", href: "/admin/options/choices" },
      { label: "Constraints", href: "/admin/options/constraints" },
      { label: "Dependencies", href: "/admin/options/dependencies" },
    ],
  },
  {
    label: "System Integration",
    href: "/admin/integration",
    icon: LinkIcon,
    children: [
      { label: "MES Items", href: "/admin/integration/mes" },
      { label: "MES Mapping", href: "/admin/integration/mes-mapping" },
      { label: "Editor Mapping", href: "/admin/integration/editors" },
      { label: "MES Options", href: "/admin/integration/mes-options" },
    ],
  },
  {
    label: "Widget Management",
    href: "/admin/widgets",
    icon: Code,
    children: [
      { label: "Widgets", href: "/admin/widgets/list" },
      { label: "Preview", href: "/admin/widgets/preview" },
    ],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Cog,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Auto-expand the group matching the current path
    const initial = new Set<string>();
    for (const item of navItems) {
      if (item.children && pathname.startsWith(item.href)) {
        initial.add(item.href);
      }
    }
    return initial;
  });

  const toggleGroup = (href: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  const isActive = (href: string) => pathname === href;
  const isGroupActive = (item: NavItem) =>
    item.children
      ? item.children.some((child) => pathname.startsWith(child.href))
      : pathname === item.href;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r bg-card transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!collapsed && (
            <span className="text-lg font-semibold text-primary">
              Admin
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const groupActive = isGroupActive(item);
            const expanded = expandedGroups.has(item.href);

            if (!item.children) {
              // Simple link (no children)
              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.href}>{linkContent}</div>;
            }

            // Group with children
            const groupButton = (
              <button
                onClick={() => {
                  if (collapsed) {
                    setCollapsed(false);
                    setExpandedGroups((prev) => new Set(prev).add(item.href));
                  } else {
                    toggleGroup(item.href);
                  }
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  groupActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </>
                )}
              </button>
            );

            return (
              <div key={item.href}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{groupButton}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  groupButton
                )}
                {!collapsed && expanded && item.children && (
                  <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block rounded-md px-3 py-1.5 text-sm transition-colors",
                          isActive(child.href)
                            ? "font-medium text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
