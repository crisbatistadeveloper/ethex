"use client";

import { useState } from "react";
import { CRITERIOS, MAX_CRITERIOS_PRIORIZADOS } from "@/lib/scoring-criteria";
import type { CriterioKey } from "@/lib/database.types";

export function CriteriaRanking({
  initial = [],
}: {
  initial?: CriterioKey[];
}) {
  const [selection, setSelection] = useState<(CriterioKey | "")[]>([
    initial[0] ?? "",
    initial[1] ?? "",
    initial[2] ?? "",
  ]);

  function update(index: number, value: string) {
    setSelection((prev) => {
      const next = [...prev] as (CriterioKey | "")[];
      next[index] = value as CriterioKey | "";
      return next;
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {Array.from({ length: MAX_CRITERIOS_PRIORIZADOS }).map((_, index) => {
        const usedElsewhere = selection.filter((_, i) => i !== index);
        return (
          <div key={index}>
            <label className="block text-xs font-medium text-neutral-500">
              {index + 1}º mais importante
            </label>
            <select
              name={`criterio_${index + 1}`}
              value={selection[index]}
              onChange={(e) => update(index, e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            >
              <option value="">—</option>
              {CRITERIOS.filter(
                (c) => !usedElsewhere.includes(c.key) || selection[index] === c.key
              ).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
