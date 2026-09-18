import type { CriterioKey } from "@/lib/database.types";

export const CRITERIOS: { key: CriterioKey; label: string }[] = [
  { key: "orcamento", label: "Orçamento" },
  { key: "regiao", label: "Região" },
  { key: "tamanho_m2", label: "Tamanho (m²)" },
  { key: "quartos", label: "Quartos" },
  { key: "vagas", label: "Vagas" },
];

export const MAX_CRITERIOS_PRIORIZADOS = 3;

export function labelCriterio(key: CriterioKey): string {
  return CRITERIOS.find((c) => c.key === key)?.label ?? key;
}
