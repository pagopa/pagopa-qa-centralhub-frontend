"use client";

import { useId } from "react";

interface SegmentedControlProps<T extends string> {
  /** Visible caption and accessible name of the group. */
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Shows only the selected option as a chip: nothing to edit. */
  readOnly?: boolean;
}

/** A small radio group drawn as connected pills; native radios keep arrow-key navigation and focus. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  readOnly = false,
}: SegmentedControlProps<T>) {
  const id = useId();
  const labelId = `${id}-label`;
  const selected = options.find((o) => o.value === value);

  return (
    <div className="flex flex-col gap-1">
      <span id={labelId} className="text-xs text-text-dim">
        {label}
      </span>
      {readOnly ? (
        <span
          role="group"
          aria-labelledby={labelId}
          className="inline-flex h-9 w-fit items-center rounded-[var(--radius-sm)] border border-border bg-subtle px-3 text-[14px] text-text"
        >
          {selected?.label ?? value}
        </span>
      ) : (
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          className="inline-flex h-9 w-fit items-stretch gap-0.5 rounded-[var(--radius-sm)] border border-border-strong bg-subtle p-0.5"
        >
          {options.map((option) => (
            <label
              key={option.value}
              className={`inline-flex items-center rounded-[5px] px-3 text-[13px] text-text-dim transition ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:text-text"
              } has-[:checked]:bg-surface has-[:checked]:font-medium has-[:checked]:text-text has-[:checked]:shadow-[var(--shadow-sm)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40`}
            >
              <input
                type="radio"
                name={id}
                value={option.value}
                checked={option.value === value}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
