import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type Option = { value: string; label: string };

// Platform-wide standard for dropdown/combobox triggers built on <Button variant="outline">.
// Overrides the outline variant's teal border/text so every form control reads the same:
//   rest = gray border · hover = soft fresco · focus/open = fresco border + lake ring.
const TRIGGER_CLS =
  "h-9 w-full justify-between rounded-lg border-input bg-white font-normal text-foreground transition-colors hover:bg-white hover:border-fresco/40 aria-expanded:border-fresco aria-expanded:ring-2 aria-expanded:ring-lake/30";

// Same focus/hover language for native inputs/textareas.
const FIELD_CLS =
  "w-full rounded-lg border border-input bg-white text-sm transition-colors hover:border-fresco/40 focus:border-fresco focus:outline-none focus:ring-2 focus:ring-lake/30";

/* ---------- labeled wrapper ---------- */
export function Labeled({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

/* ---------- text input ---------- */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  className,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  className?: string;
  step?: string;
}) {
  return (
    <Labeled label={label} required={required} className={className}>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(FIELD_CLS, "h-9 px-3")}
      />
    </Labeled>
  );
}

export function NumberField(props: Omit<Parameters<typeof TextField>[0], "type" | "onChange"> & { onChange: (v: number) => void }) {
  const { onChange, value, step = "any", ...rest } = props;
  return (
    <TextField
      {...rest}
      type="number"
      step={step}
      value={String(value ?? "")}
      onChange={(v) => onChange(Number(v) || 0)}
    />
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <Labeled label={label} className={className}>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(FIELD_CLS, "p-2")}
      />
    </Labeled>
  );
}

/* ---------- simple select ---------- */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "เลือก…",
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[] | Option[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const opts: Option[] = (options as any[]).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <Labeled label={label} required={required} className={className}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full bg-white">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {opts.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Labeled>
  );
}

/* ---------- searchable combobox (company / contact picker) ---------- */
export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder = "เลือก…",
  searchPlaceholder = "ค้นหา…",
  emptyText = "ไม่พบรายการ",
  required,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  const trigger = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={TRIGGER_CLS}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value === value ? "" : o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === o.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  if (!label) return <div className={className}>{trigger}</div>;
  return (
    <Labeled label={label} required={required} className={className}>
      {trigger}
    </Labeled>
  );
}

/* ---------- searchable combobox grouped by category (industry picker) ---------- */
export function GroupedCombobox({
  label,
  value,
  onChange,
  groups,
  placeholder = "เลือก…",
  searchPlaceholder = "ค้นหา…",
  emptyText = "ไม่พบรายการ",
  required,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  groups: { label: string; options: readonly string[] }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className={TRIGGER_CLS}>
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g.label} heading={g.label}>
                {g.options.map((o) => (
                  <CommandItem key={o} value={`${o} ${g.label}`} onSelect={() => { onChange(o === value ? "" : o); setOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", value === o ? "opacity-100" : "opacity-0")} />
                    {o}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  if (!label) return <div className={className}>{trigger}</div>;
  return <Labeled label={label} required={required} className={className}>{trigger}</Labeled>;
}

/* ---------- multi-select dropdown (checkbox list + Clear) ---------- */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string;
  options: readonly string[] | Option[];
  selected: string[];
  onChange: (v: string[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const opts: Option[] = (options as any[]).map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const labelFor = (v: string) => opts.find((o) => o.value === v)?.label ?? v;
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={TRIGGER_CLS}
          >
            <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
              {label}
              {selected.length > 0 && <span className="ml-1 rounded-full bg-fresco px-1.5 text-[10px] font-semibold text-white">{selected.length}</span>}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="max-h-64 overflow-y-auto p-1">
            {opts.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                <Checkbox checked={selected.includes(o.value)} className="pointer-events-none" />
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange([])}>Clear</button>
            <button type="button" className="text-xs font-medium text-fresco" onClick={() => setOpen(false)}>Done</button>
          </div>
        </PopoverContent>
      </Popover>

      {/* preview of selected values */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-fresco/10 px-2 py-0.5 text-[11px] font-medium text-fresco">
              <span className="max-w-[140px] truncate">{labelFor(v)}</span>
              <button type="button" onClick={() => toggle(v)} className="hover:text-rose-600"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- single-select (same look/hover as MultiSelect, pick one) ---------- */
export function SingleSelect({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly string[] | Option[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const opts: Option[] = (options as any[]).map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const labelFor = (v: string) => opts.find((o) => o.value === v)?.label ?? v;

  const pick = (v: string) => { onChange(v); setOpen(false); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(TRIGGER_CLS, !value && "text-muted-foreground", className)}
        >
          <span className="truncate">{value ? labelFor(value) : label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="max-h-64 overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => pick("")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
          >
            <Check className={cn("h-4 w-4 shrink-0 text-fresco", value === "" ? "opacity-100" : "opacity-0")} />
            <span className="truncate">{label}</span>
          </button>
          {opts.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
            >
              <Check className={cn("h-4 w-4 shrink-0 text-fresco", value === o.value ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- delete confirmation ---------- */
export function DeleteConfirm({
  onConfirm,
  title = "ยืนยันการลบ?",
  description = "การลบนี้ย้อนกลับไม่ได้",
  trigger,
}: {
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  trigger?: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50">
            <Trash2 className="h-4 w-4" /> ลบ
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700"
            onClick={() => onConfirm()}
          >
            ลบ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
