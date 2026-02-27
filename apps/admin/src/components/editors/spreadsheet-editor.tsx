"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import {
  Undo2,
  Redo2,
  Save,
  Plus,
  Trash2,
  Percent,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// --- Types ---

export interface PriceTierRow {
  id?: number;
  optionCode: string;
  minQty: number;
  maxQty: number;
  unitPrice: string;
  isActive: boolean;
}

export interface PriceTierChange {
  id?: number;
  optionCode: string;
  minQty: number;
  maxQty: number;
  unitPrice: string;
  isActive: boolean;
}

interface CellAddress {
  row: number;
  col: number;
}

interface SpreadsheetEditorProps {
  priceTableId: number;
  data: PriceTierRow[];
  costData?: PriceTierRow[];
  onSave: (changes: PriceTierChange[]) => void;
  isSaving?: boolean;
}

// --- State management with undo/redo ---

interface SpreadsheetState {
  rows: PriceTierRow[];
  past: PriceTierRow[][];
  future: PriceTierRow[][];
  modifiedCells: Set<string>;
}

type SpreadsheetAction =
  | { type: "SET_DATA"; rows: PriceTierRow[] }
  | { type: "UPDATE_CELL"; rowIndex: number; field: keyof PriceTierRow; value: string | number | boolean }
  | { type: "BULK_UPDATE"; updates: { rowIndex: number; field: keyof PriceTierRow; value: string | number | boolean }[] }
  | { type: "ADD_ROW"; row: PriceTierRow }
  | { type: "DELETE_ROW"; rowIndex: number }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR_MODIFICATIONS" };

function cellKey(rowIndex: number, field: string): string {
  return `${rowIndex}:${field}`;
}

function spreadsheetReducer(
  state: SpreadsheetState,
  action: SpreadsheetAction
): SpreadsheetState {
  switch (action.type) {
    case "SET_DATA":
      return {
        rows: action.rows,
        past: [],
        future: [],
        modifiedCells: new Set(),
      };

    case "UPDATE_CELL": {
      const newRows = state.rows.map((r, i) =>
        i === action.rowIndex ? { ...r, [action.field]: action.value } : r
      );
      const newModified = new Set(state.modifiedCells);
      newModified.add(cellKey(action.rowIndex, action.field));
      return {
        rows: newRows,
        past: [...state.past, state.rows],
        future: [],
        modifiedCells: newModified,
      };
    }

    case "BULK_UPDATE": {
      const newRows = [...state.rows];
      const newModified = new Set(state.modifiedCells);
      for (const upd of action.updates) {
        newRows[upd.rowIndex] = {
          ...newRows[upd.rowIndex],
          [upd.field]: upd.value,
        };
        newModified.add(cellKey(upd.rowIndex, upd.field));
      }
      return {
        rows: newRows,
        past: [...state.past, state.rows],
        future: [],
        modifiedCells: newModified,
      };
    }

    case "ADD_ROW": {
      const newRows = [...state.rows, action.row];
      const newModified = new Set(state.modifiedCells);
      const idx = newRows.length - 1;
      newModified.add(cellKey(idx, "optionCode"));
      newModified.add(cellKey(idx, "unitPrice"));
      return {
        rows: newRows,
        past: [...state.past, state.rows],
        future: [],
        modifiedCells: newModified,
      };
    }

    case "DELETE_ROW": {
      const newRows = state.rows.filter((_, i) => i !== action.rowIndex);
      return {
        rows: newRows,
        past: [...state.past, state.rows],
        future: [],
        modifiedCells: state.modifiedCells,
      };
    }

    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        rows: previous,
        past: state.past.slice(0, -1),
        future: [state.rows, ...state.future],
        modifiedCells: state.modifiedCells,
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        rows: next,
        past: [...state.past, state.rows],
        future: state.future.slice(1),
        modifiedCells: state.modifiedCells,
      };
    }

    case "CLEAR_MODIFICATIONS":
      return { ...state, modifiedCells: new Set(), past: [], future: [] };

    default:
      return state;
  }
}

// --- Component ---

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 40;

export function SpreadsheetEditor({
  priceTableId,
  data,
  costData,
  onSave,
  isSaving = false,
}: SpreadsheetEditorProps) {
  const [state, dispatch] = useReducer(spreadsheetReducer, {
    rows: data,
    past: [],
    future: [],
    modifiedCells: new Set<string>(),
  });

  const [activeCell, setActiveCell] = useState<CellAddress | null>(null);
  const [editingCell, setEditingCell] = useState<CellAddress | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionAnchor, setSelectionAnchor] = useState<CellAddress | null>(null);

  // Bulk operations
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"value" | "ratio">("value");
  const [bulkValue, setBulkValue] = useState("");

  // Add row dialog
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [newOptionCode, setNewOptionCode] = useState("");
  const [newMinQty, setNewMinQty] = useState("1");
  const [newMaxQty, setNewMaxQty] = useState("999999");

  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Sync external data changes
  useEffect(() => {
    dispatch({ type: "SET_DATA", rows: data });
  }, [data]);

  // Build cost lookup for REQ-C-002
  const costLookup = useMemo(() => {
    if (!costData) return null;
    const map = new Map<string, string>();
    for (const row of costData) {
      map.set(`${row.optionCode}:${row.minQty}:${row.maxQty}`, row.unitPrice);
    }
    return map;
  }, [costData]);

  // Column definitions
  const columns = useMemo(() => {
    const cols = [
      { key: "optionCode" as const, label: "Option Code", width: 120, editable: true },
      { key: "minQty" as const, label: "Min Qty", width: 90, editable: true },
      { key: "maxQty" as const, label: "Max Qty", width: 90, editable: true },
      { key: "unitPrice" as const, label: "Unit Price", width: 120, editable: true },
    ];
    if (costLookup) {
      cols.push({ key: "unitPrice" as const, label: "Cost Price (Ref)", width: 120, editable: false });
    }
    return cols;
  }, [costLookup]);

  // Virtual scrolling
  const virtualizer = useVirtualizer({
    count: state.rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z
      if (e.ctrlKey && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      }
      // Redo: Ctrl+Shift+Z
      if (e.ctrlKey && e.shiftKey && e.key === "Z") {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
      // Escape: cancel editing
      if (e.key === "Escape" && editingCell) {
        e.preventDefault();
        setEditingCell(null);
        setEditValue("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingCell]);

  // Focus input on edit start
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  const getCellValue = useCallback(
    (rowIndex: number, colIndex: number): string => {
      const row = state.rows[rowIndex];
      if (!row) return "";
      // Cost reference column
      if (costLookup && colIndex === 4) {
        const key = `${row.optionCode}:${row.minQty}:${row.maxQty}`;
        return costLookup.get(key) ?? "-";
      }
      const col = columns[colIndex];
      const val = row[col.key];
      return val?.toString() ?? "";
    },
    [state.rows, columns, costLookup]
  );

  const handleCellClick = useCallback(
    (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
      const col = columns[colIndex];

      // Cost column is not selectable/editable
      if (costLookup && colIndex === 4) return;

      const addr: CellAddress = { row: rowIndex, col: colIndex };
      setActiveCell(addr);

      // Shift+Click: range selection
      if (e.shiftKey && selectionAnchor) {
        const newSelection = new Set<string>();
        const minRow = Math.min(selectionAnchor.row, rowIndex);
        const maxRow = Math.max(selectionAnchor.row, rowIndex);
        const minCol = Math.min(selectionAnchor.col, colIndex);
        const maxCol = Math.max(selectionAnchor.col, colIndex);
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            if (!(costLookup && c === 4)) {
              newSelection.add(`${r}:${c}`);
            }
          }
        }
        setSelectedCells(newSelection);
      } else {
        setSelectionAnchor(addr);
        setSelectedCells(new Set([`${rowIndex}:${colIndex}`]));
      }
    },
    [columns, costLookup, selectionAnchor]
  );

  const handleCellDoubleClick = useCallback(
    (rowIndex: number, colIndex: number) => {
      const col = columns[colIndex];
      if (!col.editable) return;
      if (costLookup && colIndex === 4) return;

      setEditingCell({ row: rowIndex, col: colIndex });
      setEditValue(getCellValue(rowIndex, colIndex));
    },
    [columns, costLookup, getCellValue]
  );

  const confirmEdit = useCallback(() => {
    if (!editingCell) return;
    const col = columns[editingCell.col];

    // REQ-N-003: Block negative values for unitPrice
    if (col.key === "unitPrice") {
      const num = Number(editValue);
      if (isNaN(num) || num < 0) {
        toast.error("Unit price must not be negative");
        setEditingCell(null);
        setEditValue("");
        return;
      }
    }

    let value: string | number | boolean = editValue;
    if (col.key === "minQty" || col.key === "maxQty") {
      value = Number(editValue) || 0;
    }

    dispatch({
      type: "UPDATE_CELL",
      rowIndex: editingCell.row,
      field: col.key,
      value,
    });
    setEditingCell(null);
    setEditValue("");
  }, [editingCell, editValue, columns]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        confirmEdit();
        // Tab: move to next cell
        if (e.key === "Tab" && editingCell) {
          const nextCol = editingCell.col + 1;
          const editableCols = columns.filter((c) => c.editable);
          if (nextCol < editableCols.length) {
            setEditingCell({ row: editingCell.row, col: nextCol });
            setEditValue(getCellValue(editingCell.row, nextCol));
          }
        }
      }
      if (e.key === "Escape") {
        setEditingCell(null);
        setEditValue("");
      }
    },
    [confirmEdit, editingCell, columns, getCellValue]
  );

  // Bulk operations
  const handleBulkApply = useCallback(() => {
    if (selectedCells.size === 0 || !bulkValue) return;

    const updates: { rowIndex: number; field: keyof PriceTierRow; value: string | number | boolean }[] = [];

    for (const cellId of selectedCells) {
      const [r, c] = cellId.split(":").map(Number);
      const col = columns[c];
      if (!col.editable) continue;
      if (col.key !== "unitPrice") continue;

      if (bulkMode === "value") {
        const num = Number(bulkValue);
        if (isNaN(num) || num < 0) {
          toast.error("Value must not be negative");
          return;
        }
        updates.push({ rowIndex: r, field: "unitPrice", value: bulkValue });
      } else {
        // Ratio mode: +N% or -N%
        const percent = Number(bulkValue);
        if (isNaN(percent)) {
          toast.error("Invalid percentage");
          return;
        }
        const currentPrice = Number(state.rows[r].unitPrice) || 0;
        const newPrice = Math.max(0, currentPrice * (1 + percent / 100));
        updates.push({
          rowIndex: r,
          field: "unitPrice",
          value: newPrice.toFixed(2),
        });
      }
    }

    if (updates.length > 0) {
      dispatch({ type: "BULK_UPDATE", updates });
      toast.success(`Updated ${updates.length} cells`);
    }
    setBulkDialogOpen(false);
    setBulkValue("");
  }, [selectedCells, bulkValue, bulkMode, columns, state.rows]);

  const handleAddRow = useCallback(() => {
    if (!newOptionCode) {
      toast.error("Option code is required");
      return;
    }
    dispatch({
      type: "ADD_ROW",
      row: {
        optionCode: newOptionCode,
        minQty: Number(newMinQty) || 1,
        maxQty: Number(newMaxQty) || 999999,
        unitPrice: "0.00",
        isActive: true,
      },
    });
    setAddRowOpen(false);
    setNewOptionCode("");
    setNewMinQty("1");
    setNewMaxQty("999999");
  }, [newOptionCode, newMinQty, newMaxQty]);

  const handleDeleteRow = useCallback(
    (rowIndex: number) => {
      dispatch({ type: "DELETE_ROW", rowIndex });
    },
    []
  );

  const handleSave = useCallback(() => {
    // Only send modified rows
    const changes: PriceTierChange[] = state.rows.map((row) => ({
      id: row.id,
      optionCode: row.optionCode,
      minQty: row.minQty,
      maxQty: row.maxQty,
      unitPrice: row.unitPrice,
      isActive: row.isActive,
    }));

    // Filter to only changed rows
    const modifiedRowIndices = new Set<number>();
    for (const key of state.modifiedCells) {
      const rowIdx = Number(key.split(":")[0]);
      modifiedRowIndices.add(rowIdx);
    }

    const changedRows = changes.filter((_, i) => modifiedRowIndices.has(i));
    // Also include new rows (no id)
    const newRows = changes.filter((r) => !r.id);
    const allChanges = [...changedRows, ...newRows.filter((r) => !changedRows.includes(r))];

    if (allChanges.length === 0) {
      toast.info("No changes to save");
      return;
    }

    onSave(allChanges);
  }, [state.rows, state.modifiedCells, onSave]);

  const hasChanges = state.modifiedCells.size > 0;
  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0) + 50; // +50 for row number + delete col

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={state.past.length === 0}
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Undo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: "REDO" })}
          disabled={state.future.length === 0}
        >
          <Redo2 className="h-4 w-4 mr-1" />
          Redo
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button
          variant="outline"
          size="sm"
          disabled={selectedCells.size === 0}
          onClick={() => {
            setBulkMode("value");
            setBulkDialogOpen(true);
          }}
        >
          <PenLine className="h-4 w-4 mr-1" />
          Set Value ({selectedCells.size})
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={selectedCells.size === 0}
          onClick={() => {
            setBulkMode("ratio");
            setBulkDialogOpen(true);
          }}
        >
          <Percent className="h-4 w-4 mr-1" />
          Adjust %
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button variant="outline" size="sm" onClick={() => setAddRowOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Row
        </Button>

        <div className="flex-1" />

        {hasChanges && (
          <span className="text-sm text-muted-foreground">
            {state.modifiedCells.size} modified cells
          </span>
        )}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Spreadsheet grid */}
      <div className="rounded-md border overflow-hidden">
        {/* Header */}
        <div
          className="flex bg-muted/50 border-b"
          style={{ height: HEADER_HEIGHT, minWidth: totalWidth }}
        >
          <div className="flex items-center justify-center font-medium text-xs text-muted-foreground w-[30px] border-r shrink-0">
            #
          </div>
          {columns.map((col, colIdx) => (
            <div
              key={colIdx}
              className="flex items-center px-2 font-medium text-xs text-muted-foreground border-r shrink-0"
              style={{ width: col.width }}
            >
              {col.label}
            </div>
          ))}
          <div className="flex items-center justify-center w-[20px] shrink-0" />
        </div>

        {/* Virtual scrollable body */}
        <div
          ref={containerRef}
          className="overflow-auto"
          style={{ height: Math.min(600, state.rows.length * ROW_HEIGHT + 2) }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
              minWidth: totalWidth,
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const rowIndex = virtualRow.index;
              const row = state.rows[rowIndex];
              if (!row) return null;

              return (
                <div
                  key={virtualRow.key}
                  className="flex border-b hover:bg-muted/30"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: ROW_HEIGHT,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {/* Row number */}
                  <div className="flex items-center justify-center text-xs text-muted-foreground w-[30px] border-r shrink-0">
                    {rowIndex + 1}
                  </div>

                  {/* Data cells */}
                  {columns.map((col, colIdx) => {
                    const isEditing =
                      editingCell?.row === rowIndex &&
                      editingCell?.col === colIdx;
                    const isActive =
                      activeCell?.row === rowIndex &&
                      activeCell?.col === colIdx;
                    const isSelected = selectedCells.has(
                      `${rowIndex}:${colIdx}`
                    );
                    const isModified = state.modifiedCells.has(
                      cellKey(rowIndex, col.key)
                    );
                    const isCostRef = costLookup && colIdx === 4;

                    let displayValue: string;
                    if (isCostRef) {
                      const key = `${row.optionCode}:${row.minQty}:${row.maxQty}`;
                      displayValue = costLookup!.get(key) ?? "-";
                    } else {
                      displayValue = row[col.key]?.toString() ?? "";
                    }

                    return (
                      <div
                        key={colIdx}
                        className={cn(
                          "flex items-center px-2 border-r shrink-0 cursor-cell text-xs",
                          isActive && "ring-2 ring-primary ring-inset",
                          isSelected &&
                            !isActive &&
                            "bg-primary/10",
                          isModified && "bg-yellow-50",
                          isCostRef && "bg-muted/40 text-muted-foreground cursor-default"
                        )}
                        style={{ width: col.width, height: ROW_HEIGHT }}
                        onClick={(e) => handleCellClick(rowIndex, colIdx, e)}
                        onDoubleClick={() =>
                          handleCellDoubleClick(rowIndex, colIdx)
                        }
                      >
                        {isEditing ? (
                          <Input
                            ref={editInputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={confirmEdit}
                            className="h-7 text-xs p-1 border-0 focus-visible:ring-0"
                          />
                        ) : (
                          <span className="truncate">{displayValue}</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Delete button */}
                  <div className="flex items-center justify-center w-[20px] shrink-0">
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteRow(rowIndex)}
                      title="Delete row"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row count */}
      <p className="text-xs text-muted-foreground">
        {state.rows.length} rows | Price Table ID: {priceTableId}
      </p>

      {/* Bulk Value/Ratio Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {bulkMode === "value"
                ? "Set Value for Selected Cells"
                : "Adjust by Percentage"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {bulkMode === "value" ? (
              <div>
                <label className="text-sm font-medium">New Value</label>
                <Input
                  type="number"
                  min={0}
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder="Enter price value (>= 0)"
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">
                  Percentage Adjustment
                </label>
                <Input
                  type="number"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder="e.g. +10 or -5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter positive number to increase (e.g. 10 for +10%) or
                  negative to decrease (e.g. -5 for -5%)
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkApply}>
              Apply to {selectedCells.size} cells
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Row Dialog */}
      <Dialog open={addRowOpen} onOpenChange={setAddRowOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Row</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Option Code</label>
              <Input
                value={newOptionCode}
                onChange={(e) => setNewOptionCode(e.target.value)}
                placeholder="e.g. OPT_001"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Min Qty</label>
                <Input
                  type="number"
                  value={newMinQty}
                  onChange={(e) => setNewMinQty(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max Qty</label>
                <Input
                  type="number"
                  value={newMaxQty}
                  onChange={(e) => setNewMaxQty(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRowOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRow}>Add Row</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
