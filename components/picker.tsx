"use client";

import { useState } from "react";

export interface PickerOption {
  key: string;
  title: string;
  subtitle?: string;
}

/**
 * A search box whose dropdown narrows as you type. Enter adds the highlighted option,
 * a pasted or comma-separated list adds many at once, and Enter on an empty box continues.
 */
export function Picker({
  id,
  placeholder,
  search,
  onAdd,
  onBulk,
  onNoMatch,
  onDone,
}: {
  id: string;
  placeholder: string;
  search: (q: string) => PickerOption[];
  onAdd: (key: string) => void;
  onBulk: (text: string) => void;
  onNoMatch?: (text: string) => void;
  onDone: () => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const options = q.trim() && !/[,;\n]/.test(q) ? search(q) : [];
  const listId = `${id}-options`;

  const commit = () => {
    const text = q.trim();
    if (!text) return onDone();
    if (/[,;\n]/.test(text)) onBulk(text);
    else if (options[active]) onAdd(options[active].key);
    else if (onNoMatch) onNoMatch(text);
    else return;
    setQ("");
    setActive(0);
  };

  return (
    <div className="relative">
      <input
        id={id}
        autoFocus
        autoComplete="off"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-activedescendant={options[active] ? `${listId}-${active}` : undefined}
        value={q}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[,;\n]/.test(text)) {
            e.preventDefault();
            onBulk(text);
            setQ("");
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-[17px] text-ink caret-accent outline-none focus:border-accent"
      />
      {open && options.length > 0 && (
        <ul id={listId} role="listbox" className="anim-fade absolute inset-x-0 z-30 mt-1.5 overflow-hidden rounded-xl border border-line bg-raised py-1 shadow-float">
          {options.map((o, i) => (
            <li
              key={o.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                onAdd(o.key);
                setQ("");
                setActive(0);
              }}
              className={`flex cursor-pointer items-baseline justify-between gap-4 px-4 py-2.5 ${i === active ? "bg-accent-tint" : ""}`}
            >
              <span className="text-[15px] font-medium">{o.title}</span>
              {o.subtitle && <span className="truncate text-[13px] text-muted">{o.subtitle}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One picked item, shown as a row you can edit or remove before continuing. */
export function PickedRow({
  title,
  subtitle,
  warn,
  onRemove,
  children,
}: {
  title: string;
  subtitle?: string;
  warn?: boolean;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  return (
    <li className={`anim-rise flex items-center gap-3 rounded-xl border px-4 py-2 ${warn ? "border-dashed border-line bg-warn-tint/50" : "border-line bg-raised"}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{title}</p>
        {subtitle && <p className={`truncate text-[13px] ${warn ? "text-warn-ink" : "text-muted"}`}>{subtitle}</p>}
      </div>
      {children}
      <button onClick={onRemove} aria-label={`Remove ${title}`} className="grid size-8 flex-none place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}

/** Two-option toggle used for Declared / Potential. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: T[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-none rounded-lg bg-subtle p-0.5">
      {options.map((o) => (
        <button
          key={o}
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={`min-h-7 rounded-md px-2.5 text-[13px] capitalize ${value === o ? "bg-raised font-medium text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
