import type { ImovelRow } from "@/lib/database.types";

export const DIFERENCIAIS = [
  { key: "varanda", label: "Varanda / sacada" },
  { key: "piscina", label: "Piscina" },
  { key: "churrasqueira", label: "Churrasqueira" },
  { key: "quintal", label: "Quintal" },
  { key: "jardim", label: "Jardim" },
  { key: "lavabo", label: "Lavabo" },
  { key: "escritorio", label: "Escritório" },
  { key: "closet", label: "Closet" },
  { key: "elevador", label: "Elevador" },
  { key: "ar_condicionado", label: "Ar-condicionado" },
  { key: "mobiliado", label: "Mobiliado" },
  { key: "condominio_fechado", label: "Condomínio fechado" },
] as const;

export type DiferencialKey = (typeof DIFERENCIAIS)[number]["key"];

/** Valor do formulário: "" = não informado, "sim" = tem, "nao" = não tem. */
export type DiferencialValor = "" | "sim" | "nao";

export type CaracteristicasImovel = Pick<
  ImovelRow,
  "quartos" | "suites" | "banheiros" | "vagas" | "area_total" | DiferencialKey
>;

export function diferencialParaForm(valor: boolean | null | undefined): DiferencialValor {
  if (valor === true) return "sim";
  if (valor === false) return "nao";
  return "";
}

function diferencialDoForm(valor: FormDataEntryValue | null): boolean | null {
  if (valor === "sim") return true;
  if (valor === "nao") return false;
  return null;
}

function inteiroDoForm(formData: FormData, nome: string): number | null {
  const bruto = formData.get(nome);
  if (typeof bruto !== "string" || bruto.trim() === "") return null;
  const n = Math.floor(Number(bruto));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function areaDoForm(formData: FormData, nome: string): number | null {
  const bruto = formData.get(nome);
  if (typeof bruto !== "string" || bruto.trim() === "") return null;
  const n = Number(bruto);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Lê do formulário de cadastro/edição as colunas estruturais do imóvel. */
export function caracteristicasDoForm(formData: FormData): CaracteristicasImovel {
  const quartos = inteiroDoForm(formData, "quartos");
  let suites = inteiroDoForm(formData, "suites");
  if (suites != null && quartos != null && suites > quartos) suites = quartos;

  const diferenciais = Object.fromEntries(
    DIFERENCIAIS.map((d) => [d.key, diferencialDoForm(formData.get(`dif_${d.key}`))])
  ) as Record<DiferencialKey, boolean | null>;

  return {
    quartos,
    suites,
    banheiros: inteiroDoForm(formData, "banheiros"),
    vagas: inteiroDoForm(formData, "vagas"),
    area_total: areaDoForm(formData, "area_total"),
    ...diferenciais,
  };
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

/** "3 quartos · 2 suítes · 2 banheiros · 2 vagas · 120 m²" — só o que foi preenchido. */
export function resumoQuantitativo(
  i: Partial<Pick<CaracteristicasImovel, "quartos" | "suites" | "banheiros" | "vagas" | "area_total">>
): string[] {
  return [
    i.quartos != null ? plural(i.quartos, "quarto", "quartos") : null,
    i.suites != null ? plural(i.suites, "suíte", "suítes") : null,
    i.banheiros != null ? plural(i.banheiros, "banheiro", "banheiros") : null,
    i.vagas != null ? plural(i.vagas, "vaga", "vagas") : null,
    i.area_total != null ? `${i.area_total.toLocaleString("pt-BR")} m²` : null,
  ].filter((x): x is string => x !== null);
}

export function diferenciaisComValor(
  i: Partial<Record<DiferencialKey, boolean | null>>,
  valor: boolean
): string[] {
  return DIFERENCIAIS.filter((d) => i[d.key] === valor).map((d) => d.label);
}

export function extrairCaracteristicas(
  i: Partial<CaracteristicasImovel> | null | undefined
): CaracteristicasImovel {
  const src = i ?? {};
  return {
    quartos: src.quartos ?? null,
    suites: src.suites ?? null,
    banheiros: src.banheiros ?? null,
    vagas: src.vagas ?? null,
    area_total: src.area_total ?? null,
    ...(Object.fromEntries(DIFERENCIAIS.map((d) => [d.key, src[d.key] ?? null])) as Record<
      DiferencialKey,
      boolean | null
    >),
  };
}
