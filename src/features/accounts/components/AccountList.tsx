import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Company } from "@/lib/mock-data";
import { AccountListCard, type AccountCardSummary } from "./AccountListCard";
import {
  ACCOUNT_FILTERS,
  ACCOUNT_SORTS,
  type AccountFilter,
  type AccountSort,
} from "../constants/accountOptions";

export function AccountList({
  rows,
  summaryFor,
  selectedId,
  onSelect,
  query,
  onQuery,
  filter,
  onFilter,
  sort,
  onSort,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onClearSel,
  onBulkDelete,
}: {
  rows: Company[];
  summaryFor: (id: string) => AccountCardSummary;
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQuery: (v: string) => void;
  filter: AccountFilter;
  onFilter: (v: AccountFilter) => void;
  sort: AccountSort;
  onSort: (v: AccountSort) => void;
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: () => void;
  onClearSel: () => void;
  onBulkDelete: () => void;
}) {
  const allSelected = rows.length > 0 && rows.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="flex w-[340px] shrink-0 flex-col rounded-2xl border border-border bg-slate-50/60">
      {/* search + sort */}
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="ค้นหาบริษัท…"
            className="h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm focus:border-fresco focus:outline-none focus:ring-2 focus:ring-lake/30"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">{rows.length} accounts</span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as AccountSort)}
            className="h-8 rounded-md border border-input bg-white px-2 text-xs focus:border-fresco focus:outline-none"
          >
            {ACCOUNT_SORTS.map((s) => (
              <option key={s.value} value={s.value}>เรียง: {s.label}</option>
            ))}
          </select>
        </div>
        {/* filters */}
        <div className="flex flex-wrap gap-1">
          {ACCOUNT_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => onFilter(f)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                filter === f ? "bg-fresco text-white" : "bg-white text-slate-600 hover:bg-slate-100",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* select-all / bulk delete */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={onToggleAll}
              aria-label="เลือกทั้งหมด"
            />
            เลือกทั้งหมด
          </label>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5">
              <button onClick={onClearSel} className="text-[11px] text-muted-foreground hover:text-foreground">ยกเลิก</button>
              <Button size="sm" className="h-7 bg-rose-600 px-2 text-white hover:bg-rose-700" onClick={onBulkDelete}>
                <Trash2 className="h-3.5 w-3.5" /> ลบ ({selectedIds.size})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* list */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">ไม่พบบริษัทที่ตรงเงื่อนไข</p>
        ) : (
          rows.map((c) => (
            <AccountListCard
              key={c.id}
              company={c}
              summary={summaryFor(c.id)}
              selected={selectedId === c.id}
              onClick={() => onSelect(c.id)}
              checked={selectedIds.has(c.id)}
              onToggle={() => onToggleOne(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
