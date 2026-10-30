"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useAutoFilter } from "./AutoFilterForm";
type Option = { value: string; label: string };
export default function AdminSelect({
  value,
  onValueChange,
  options,
  label,
  name,
  id,
  disabled = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  label: string;
  name?: string;
  id?: string;
  disabled?: boolean;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const autoFilter = useAutoFilter();
  const selected = options.findIndex((option) => option.value === value);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);
  function choose(index: number) {
    const option = options[index];
    if (!option || disabled) return;
    onValueChange(option.value);
    setOpen(false);
    autoFilter?.(true);
    trigger.current?.focus();
  }
  return (
    <div
      ref={root}
      className="admin-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {name && (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      )}
      <button
        ref={trigger}
        disabled={disabled}
        id={id}
        type="button"
        className="admin-select-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setActive(Math.max(selected, 0));
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
            setActive((current) =>
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? options.length - 1
                  : !open
                    ? Math.max(selected, 0)
                    : (current +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        options.length) %
                      options.length,
            );
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          } else if (open && ["Enter", " "].includes(event.key)) {
            event.preventDefault();
            choose(active);
          }
        }}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
      >
        <span>{options[selected]?.label || label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && !disabled && (
        <div
          className="admin-select-menu"
          role="listbox"
          id={listId}
          aria-label={label}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`admin-select-option${index === active ? " is-active" : ""}`}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={15} aria-hidden="true" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
