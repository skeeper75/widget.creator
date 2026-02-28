"use client";

import { Badge } from "@/components/ui/badge";

// MES status type matches wbOrders.mesStatus column values
export type MesStatus = "pending" | "sent" | "confirmed" | "failed" | "not_linked";

interface MesStatusBadgeProps {
  status: MesStatus | string | null | undefined;
}

const MES_STATUS_CONFIG: Record<MesStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  not_linked: {
    label: "Not Linked",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

// @MX:NOTE: [AUTO] MesStatusBadge — visual indicator for MES dispatch status
export function MesStatusBadge({ status }: MesStatusBadgeProps) {
  const config =
    status && status in MES_STATUS_CONFIG
      ? MES_STATUS_CONFIG[status as MesStatus]
      : { label: status ?? "Unknown", className: "bg-gray-100 text-gray-700 border-gray-200" };

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}
