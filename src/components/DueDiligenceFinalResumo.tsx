import Link from "next/link";
import {
  DD_FINAL_STATUS_COLORS,
  DD_FINAL_STATUS_LABELS,
  NAO_INICIADA_COLOR,
  NAO_INICIADA_LABEL,
  RECOMENDACAO_COLORS,
  RECOMENDACAO_LABELS,
} from "@/lib/due-diligence-final";
import type { ResumoDueDiligence } from "@/lib/due-diligence-final-dados";
import type { DueDiligenceFinalRow, NegociacaoCompraStatus } from "@/lib/database.types";

export function DueDiligenceFinalResumo({
  dados,
  negociacaoStatus,
  negociacaoHref,
  iniciarAction,
}: {
  dados: { dd: DueDiligenceFinalRow; resumo: ResumoDueDiligence } | null;
  negociacaoStatus: NegociacaoCompraStatus | null;
  negociacaoHref?: string;
  iniciarAction?: () => Promise<void>;
}) {
  const dd = dados?.dd ?? null;
  const resumo = dados?.resumo ?? null;
  const aceita = negociacaoStatus === "aceita";

  return (
    <section className="rounded-lg border border-[#e4e0d9] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Due diligence final</h2>
        {dd ? (
          <Link
            href={`/due-diligence/${dd.id}`}
            className="rounded-md bg-[#d6b072] px-3 py-1.5 text-xs font-medium text-[#0b1f34] hover:brightness-105"
          >
            Ver Due Diligence
          </Link>
        ) : aceita && iniciarAction ? (
          <form action={iniciarAction}>
            <button
              type="submit"
              className="rounded-md bg-[#d6b072] px-3 py-1.5 text-xs font-semibold text-[#0b1f34] hover:brightness-105"
            >
              INICIAR DUE DILIGENCE FINAL
            </button>
          </form>
        ) : aceita && negociacaoHref ? (
          <Link href={negociacaoHref} className="text-xs underline">
            Iniciar na negociação
          </Link>
        ) : null}
      </div>

      {!dd || !resumo ? (
        <p className="mt-3 text-sm text-[#5b6472]">
          <span className={`mr-2 rounded-full border px-2 py-0.5 text-xs ${NAO_INICIADA_COLOR}`}>
            {NAO_INICIADA_LABEL}
          </span>
          {aceita
            ? "Proposta aceita — a due diligence final pode ser iniciada pelo consultor."
            : "Disponível depois que a proposta de compra for aceita."}
        </p>
      ) : (
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-5">
          <div>
            <dt className="text-xs text-[#5b6472]">Status</dt>
            <dd>
              <span className={`rounded-full border px-2 py-0.5 text-xs ${DD_FINAL_STATUS_COLORS[dd.status]}`}>
                {DD_FINAL_STATUS_LABELS[dd.status]}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Checklist</dt>
            <dd className="font-medium tabular-nums">
              {resumo.checklistFeitos}/{resumo.checklistTotal} concluídos
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Pendências</dt>
            <dd className={`font-medium ${resumo.pendenciasAbertas > 0 ? "text-amber-700" : ""}`}>
              {resumo.pendenciasAbertas} aberta(s)
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Documentos</dt>
            <dd className="font-medium tabular-nums">
              {resumo.documentosRecebidos} de {resumo.documentosEsperados} recebidos
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Resultado</dt>
            <dd>
              {dd.recomendacao ? (
                <span className={`rounded-full border px-2 py-0.5 text-xs ${RECOMENDACAO_COLORS[dd.recomendacao]}`}>
                  {RECOMENDACAO_LABELS[dd.recomendacao]}
                </span>
              ) : (
                <span className="text-[#5b6472]">Pendente</span>
              )}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
