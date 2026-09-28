import Link from "next/link";
import { agendarVisitaPrevia } from "@/app/(app)/clientes/[id]/imoveis/visita-actions";
import {
  VISITA_RECOMENDACAO_LABELS,
  VISITA_STATUS_COLORS,
  VISITA_STATUS_LABELS,
} from "@/lib/visita-previa";
import type { VisitaPreviaRow } from "@/lib/database.types";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";

type VisitaComConsultor = VisitaPreviaRow & {
  consultor_nome?: string | null;
};

export function VisitaPreviaSection({
  curadoriaId,
  clienteId,
  visitas,
}: {
  curadoriaId: string;
  clienteId: string;
  visitas: VisitaComConsultor[];
}) {
  const agendar = agendarVisitaPrevia.bind(null, curadoriaId, clienteId);
  const realizadas = visitas.filter((v) => v.status === "realizada");
  const agendadas = visitas.filter((v) => v.status === "agendada");
  const destaque = realizadas[0] ?? agendadas[0] ?? visitas[0] ?? null;

  return (
    <section className="mt-4 space-y-4 rounded-lg border border-[#e4e0d9] bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0b1f34]">
          Visita prévia ETHEX
        </h2>
        <p className="mt-1 text-xs text-[#5b6472]">
          Visita do <strong>consultor</strong> ao imóvel (não é a visita do
          cliente). Não altera a etapa do pipeline.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-[#5b6472]">Status:</span>
        {destaque ? (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${VISITA_STATUS_COLORS[destaque.status]}`}
          >
            {VISITA_STATUS_LABELS[destaque.status]}
          </span>
        ) : (
          <span className="rounded-full border border-[#e4e0d9] bg-[#faf8f5] px-2.5 py-0.5 text-xs text-[#5b6472]">
            Não realizada
          </span>
        )}
      </div>

      {destaque?.status === "realizada" && (
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-[#5b6472]">Data</dt>
            <dd className="font-medium">
              {destaque.data_visita
                ? new Date(destaque.data_visita).toLocaleDateString("pt-BR")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Consultor</dt>
            <dd className="font-medium">{destaque.consultor_nome ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Recomendação</dt>
            <dd className="font-medium">
              {destaque.recomendacao
                ? VISITA_RECOMENDACAO_LABELS[destaque.recomendacao]
                : "—"}
            </dd>
          </div>
        </dl>
      )}

      {destaque && (
        <Link
          href={`/clientes/${clienteId}/imoveis/${curadoriaId}/visita/${destaque.id}`}
          className="inline-block rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#faf8f5]"
        >
          Ver relatório
        </Link>
      )}

      {visitas.length > 1 && (
        <ul className="space-y-1 border-t border-[#e4e0d9] pt-3 text-sm">
          <li className="text-xs font-medium text-[#5b6472]">
            Histórico de visitas neste imóvel ({visitas.length})
          </li>
          {visitas.map((v) => (
            <li key={v.id}>
              <Link
                href={`/clientes/${clienteId}/imoveis/${curadoriaId}/visita/${v.id}`}
                className="hover:underline"
              >
                {VISITA_STATUS_LABELS[v.status]}
                {v.data_visita
                  ? ` — ${new Date(v.data_visita).toLocaleDateString("pt-BR")}`
                  : ""}
                {v.consultor_nome ? ` · ${v.consultor_nome}` : ""}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form
        action={agendar}
        className="space-y-3 border-t border-[#e4e0d9] pt-4"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5b6472]">
          Agendar visita
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="data_visita" className={labelClass}>
              Data / hora
            </label>
            <input
              id="data_visita"
              name="data_visita"
              type="datetime-local"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="observacoes_gerais" className={labelClass}>
              Observações
            </label>
            <textarea
              id="observacoes_gerais"
              name="observacoes_gerais"
              rows={2}
              className={inputClass}
              placeholder="Ex.: Combinado com o parceiro às 14h"
            />
          </div>
        </div>
        <button
          type="submit"
          className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
        >
          Agendar visita
        </button>
      </form>
    </section>
  );
}
