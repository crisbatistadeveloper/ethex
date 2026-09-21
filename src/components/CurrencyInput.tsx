"use client";

import { useState } from "react";

function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CurrencyInput({
  name,
  defaultValue,
  value,
  onValueChange,
  className,
}: {
  name: string;
  defaultValue?: number | null;
  value?: string;
  onValueChange?: (raw: string) => void;
  className?: string;
}) {
  const [internalCents, setInternalCents] = useState(() =>
    defaultValue ? Math.round(defaultValue * 100) : 0
  );
  const cents =
    value !== undefined
      ? value === ""
        ? 0
        : Math.round(Number(value) * 100)
      : internalCents;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const next = digits === "" ? 0 : parseInt(digits, 10);
    if (value === undefined) setInternalCents(next);
    onValueChange?.(next === 0 ? "" : (next / 100).toFixed(2));
  }

  const display = cents === 0 ? "" : centsToDisplay(cents);
  const rawValue = cents === 0 ? "" : (cents / 100).toFixed(2);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder="0,00"
        className={`${className ?? ""} pl-9`}
      />
      <input type="hidden" name={name} value={rawValue} />
    </div>
  );
}
