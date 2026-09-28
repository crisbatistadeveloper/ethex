"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { moveOportunidadeEtapa } from "@/app/(app)/crm/actions";
import { ETAPA_LABELS, PIPELINE_ETAPAS } from "@/lib/crm";
import type { OportunidadeEtapa } from "@/lib/database.types";

const selectClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";

export function MoveEtapaSelect({
  oportunidadeId,
  etapaAtual,
}: {
  oportunidadeId: string;
  etapaAtual: OportunidadeEtapa;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className={selectClass}
      defaultValue={etapaAtual}
      disabled={isPending}
      onChange={(e) => {
        const etapa = e.target.value as OportunidadeEtapa;
        startTransition(async () => {
          await moveOportunidadeEtapa(oportunidadeId, etapa);
          router.refresh();
        });
      }}
    >
      {PIPELINE_ETAPAS.map((e) => (
        <option key={e} value={e}>
          {ETAPA_LABELS[e]}
        </option>
      ))}
    </select>
  );
}
