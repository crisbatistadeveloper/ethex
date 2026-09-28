import { formatFaixaValores, formatRegiao } from "@/lib/labels";
import { labelCriterio } from "@/lib/scoring-criteria";
import { buildGoogleSearchUrl } from "@/lib/search-query";
import type { PerfilRow } from "@/lib/database.types";

function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** Critérios da entrevista sempre visíveis durante o garimpo (lidos do perfil). */
export function ContextoBusca({
  clienteNome,
  perfil,
  totalNaCuradoria,
}: {
  clienteNome: string;
  perfil: PerfilRow;
  totalNaCuradoria: number;
}) {
  const orcamento =
    perfil.orcamento_min != null || perfil.orcamento_max != null
      ? formatFaixaValores(perfil.orcamento_min, perfil.orcamento_max)
      : null;

  const linha1 = [
    orcamento,
    perfil.quartos_min ? `${perfil.quartos_min}+ quartos` : null,
    perfil.vagas_min ? `${perfil.vagas_min}+ vagas` : null,
    ...(perfil.regioes_aceitas ?? []).map(formatRegiao),
  ].filter(Boolean);

  const linha2 = [
    perfil.tipo_imovel?.trim() || null,
    perfil.prazo_compra?.trim() ? `Prazo: ${perfil.prazo_compra.trim()}` : null,
  ].filter(Boolean);

  const prioridades = (perfil.criterios_priorizados ?? []).map(
    (c, i) => `${i + 1}º ${labelCriterio(c)}`
  );

  return (
    <div className="sticky top-0 z-10 -mx-2 mt-4 bg-[#faf8f5]/95 px-2 py-2 backdrop-blur">
      <div className="rounded-lg border border-[#e4e0d9] bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#5b6472]">
              Contexto da busca
            </p>
            <p className="mt-1 font-semibold text-[#0b1f34]">{clienteNome}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <a
              href={buildGoogleSearchUrl(perfil)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#efe9e0]"
            >
              Buscar imóvel ↗
            </a>
            <span className="text-xs text-[#5b6472]">
              {plural(totalNaCuradoria, "imóvel", "imóveis")} na curadoria
            </span>
          </div>
        </div>

        <div className="mt-2 space-y-0.5 text-sm text-[#0b1f34]">
          {linha1.length > 0 && <p>{linha1.join(" · ")}</p>}
          {linha2.length > 0 && <p>{linha2.join(" · ")}</p>}
          {prioridades.length > 0 && (
            <p className="text-[#5b6472]">
              Prioridades: {prioridades.join(" · ")}
            </p>
          )}
          {linha1.length === 0 && linha2.length === 0 && prioridades.length === 0 && (
            <p className="text-[#5b6472]">Entrevista sem critérios preenchidos.</p>
          )}
        </div>
      </div>
    </div>
  );
}
