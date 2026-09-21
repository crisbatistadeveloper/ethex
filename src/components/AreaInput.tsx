"use client";

import { useState } from "react";
import { formatArea, sanitizeArea } from "@/lib/masks";

export function AreaInput({
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
  const [interno, setInterno] = useState(() =>
    defaultValue != null ? String(defaultValue).replace(".", ",") : ""
  );
  const texto = value !== undefined ? value.replace(".", ",") : interno;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const proximo = sanitizeArea(e.target.value);
    if (value === undefined) setInterno(proximo);
    onValueChange?.(proximo.replace(",", "."));
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={formatArea(texto)}
        onChange={handleChange}
        placeholder="0"
        className={`${className ?? ""} pr-9`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
        m²
      </span>
      <input
        type="hidden"
        name={name}
        value={texto.replace(/,$/, "").replace(",", ".")}
      />
    </div>
  );
}
