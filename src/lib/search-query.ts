import { formatRegiao } from "@/lib/labels";
import type { CriterioKey, PerfilRow } from "@/lib/database.types";

const MAX_PALAVRAS = 10;

function formatCompactCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function buildGoogleSearchQuery(perfil: PerfilRow): string {
  const parts: string[] = [perfil.tipo_imovel?.trim() || "imóvel", "à venda"];

  const textoPorCriterio: Partial<Record<CriterioKey, string>> = {
    orcamento: perfil.orcamento_max
      ? `até R$ ${formatCompactCurrency(perfil.orcamento_max)}`
      : perfil.orcamento_min
        ? `a partir de R$ ${formatCompactCurrency(perfil.orcamento_min)}`
        : undefined,
    regiao: perfil.regioes_aceitas?.[0]
      ? formatRegiao(perfil.regioes_aceitas[0])
      : undefined,
    quartos: perfil.quartos_min ? `${perfil.quartos_min}+ quartos` : undefined,
    vagas: perfil.vagas_min
      ? `${perfil.vagas_min} vaga${perfil.vagas_min > 1 ? "s" : ""}`
      : undefined,
    // tamanho_m2: não é capturado no perfil hoje, então não entra na busca.
  };

  const ordem: CriterioKey[] = [
    ...perfil.criterios_priorizados,
    "orcamento",
    "regiao",
    "quartos",
    "vagas",
  ];

  const usados = new Set<CriterioKey>();
  for (const criterio of ordem) {
    if (usados.has(criterio)) continue;
    usados.add(criterio);
    const texto = textoPorCriterio[criterio];
    if (!texto) continue;
    if (countWords(parts.join(" ") + " " + texto) > MAX_PALAVRAS) break;
    parts.push(texto);
  }

  return parts.join(" ");
}

export function buildGoogleSearchUrl(perfil: PerfilRow): string {
  const query = buildGoogleSearchQuery(perfil);
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
