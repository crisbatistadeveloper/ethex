"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { moveOportunidadeEtapa } from "@/app/(app)/crm/actions";
import {
  ETAPA_COLORS,
  ETAPA_LABELS,
  PIPELINE_ETAPAS,
  formatCurrencyBRL,
  formatDateTime,
} from "@/lib/crm";
import type { OportunidadeEtapa } from "@/lib/database.types";

export interface PipelineCardData {
  id: string;
  titulo: string;
  etapa: OportunidadeEtapa;
  valor_estimado: number | null;
  cliente: { id: string; nome: string };
  consultor: { nome: string } | null;
  proxima_atividade: {
    titulo: string;
    data_hora: string;
  } | null;
}

export function PipelineBoard({
  initialCards,
}: {
  initialCards: PipelineCardData[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cards, setOptimisticCards] = useOptimistic(
    initialCards,
    (
      current: PipelineCardData[],
      update: { id: string; etapa: OportunidadeEtapa }
    ) =>
      current.map((c) =>
        c.id === update.id ? { ...c, etapa: update.etapa } : c
      )
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function onDrop(etapa: OportunidadeEtapa) {
    if (!draggingId) return;
    const card = cards.find((c) => c.id === draggingId);
    const id = draggingId;
    setDraggingId(null);
    if (!card || card.etapa === etapa) return;

    startTransition(async () => {
      setOptimisticCards({ id, etapa });
      const result = await moveOportunidadeEtapa(id, etapa);
      if (!result.ok) {
        setError(result.error);
        router.refresh();
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {isPending && (
        <p className="mb-2 text-xs text-[#5b6472]">Atualizando pipeline…</p>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_ETAPAS.map((etapa) => {
          const columnCards = cards.filter((c) => c.etapa === etapa);
          return (
            <div
              key={etapa}
              className="flex w-64 shrink-0 flex-col rounded-lg border border-[#e4e0d9] bg-[#faf8f5]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(etapa)}
            >
              <div className="border-b border-[#e4e0d9] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${ETAPA_COLORS[etapa]}`}
                  >
                    {ETAPA_LABELS[etapa]}
                  </span>
                  <span className="text-xs text-[#5b6472]">
                    {columnCards.length}
                  </span>
                </div>
              </div>

              <div className="flex min-h-32 flex-1 flex-col gap-2 p-2">
                {columnCards.map((card) => (
                  <article
                    key={card.id}
                    draggable
                    onDragStart={() => setDraggingId(card.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className="cursor-grab rounded-md border border-[#e4e0d9] bg-white p-3 shadow-sm active:cursor-grabbing"
                  >
                    <Link
                      href={`/crm/${card.id}`}
                      className="font-medium text-[#0b1f34] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {card.titulo}
                    </Link>
                    <p className="mt-1 text-sm text-[#0b1f34]">
                      {card.cliente.nome}
                    </p>
                    <p className="mt-0.5 text-xs text-[#5b6472]">
                      {card.consultor?.nome ?? "—"}
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#0b1f34]">
                      {formatCurrencyBRL(card.valor_estimado)}
                    </p>
                    {card.proxima_atividade ? (
                      <p className="mt-2 border-t border-[#e4e0d9] pt-2 text-xs text-[#5b6472]">
                        Próx.: {card.proxima_atividade.titulo}
                        <br />
                        <span className="text-[#5b6472]">
                          {formatDateTime(card.proxima_atividade.data_hora)}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-2 border-t border-[#e4e0d9] pt-2 text-xs text-amber-700">
                        Sem próxima atividade
                      </p>
                    )}
                  </article>
                ))}
                {columnCards.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-[#5b6472]">
                    Arraste aqui
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
