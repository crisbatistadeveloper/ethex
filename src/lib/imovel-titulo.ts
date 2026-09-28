import type { Caracteristicas, ImovelStatusConstrucao } from "@/lib/database.types";

/**
 * Campos usados para montar o título do imóvel. O título do anúncio (caracteristicas.titulo)
 * costuma trazer nome de imobiliária/portal — fica guardado só como referência interna.
 */
export interface ImovelParaTitulo {
  caracteristicas?: Caracteristicas | null;
  url?: string | null;
  quartos?: number | null;
  suites?: number | null;
  area_total?: number | null;
  status_construcao?: ImovelStatusConstrucao | null;
  condominio_fechado?: boolean | null;
}

/** Colunas de `imovel` necessárias para `tituloImovel` — usar nos selects. */
export const IMOVEL_TITULO_COLUNAS =
  "caracteristicas, url, quartos, suites, area_total, status_construcao, condominio_fechado";

const TIPOS: { re: RegExp; label: string }[] = [
  { re: /\bcoberturas?\b/, label: "Cobertura" },
  { re: /\b(studios?|estudios?|kitnets?|kitinetes?|quitinetes?)\b/, label: "Studio" },
  { re: /\blofts?\b/, label: "Loft" },
  { re: /\bflats?\b/, label: "Flat" },
  { re: /\bsobrados?\b/, label: "Sobrado" },
  { re: /\bcasas? (de|em) condominio\b/, label: "Casa em condomínio" },
  { re: /\b(apartamentos?|aptos?|apto)\b/, label: "Apartamento" },
  { re: /\bcasas?\b/, label: "Casa" },
  { re: /\b(terrenos?|lotes?)\b/, label: "Terreno" },
  { re: /\bchacaras?\b/, label: "Chácara" },
  { re: /\bsitios?\b/, label: "Sítio" },
  { re: /\bfazendas?\b/, label: "Fazenda" },
  { re: /\b(salas? comercia(l|is)|conjuntos? comercia(l|is))\b/, label: "Sala comercial" },
  { re: /\blojas?\b/, label: "Loja" },
  { re: /\bgalp(ao|oes)\b/, label: "Galpão" },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ");
}

/** Tipo inferido do anúncio (título → link → descrição); null se não identificado. */
export function tipoDoImovel(imovel: ImovelParaTitulo): string | null {
  const fontes = [imovel.caracteristicas?.titulo, imovel.url, imovel.caracteristicas?.descricao];
  for (const fonte of fontes) {
    if (!fonte) continue;
    const texto = normalizar(fonte);
    const tipo = TIPOS.find((t) => t.re.test(texto));
    if (tipo) return tipo.label;
  }
  return null;
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

/** "Apartamento com 3 quartos (1 suíte), 120 m² — na planta" — só com o que foi informado. */
export function tituloImovel(imovel: ImovelParaTitulo | null | undefined): string {
  if (!imovel) return "Imóvel";
  let tipo = tipoDoImovel(imovel) ?? "Imóvel";
  if (tipo === "Casa" && imovel.condominio_fechado) tipo = "Casa em condomínio";

  let titulo = tipo;
  if (imovel.quartos != null && imovel.quartos > 0) {
    titulo += ` com ${plural(imovel.quartos, "quarto", "quartos")}`;
    if (imovel.suites != null && imovel.suites > 0) {
      titulo += ` (${plural(imovel.suites, "suíte", "suítes")})`;
    }
  }
  if (imovel.area_total != null) {
    titulo += `, ${imovel.area_total.toLocaleString("pt-BR")} m²`;
  }
  if (imovel.status_construcao === "na_planta") titulo += " — na planta";
  else if (imovel.status_construcao === "em_construcao") titulo += " — em construção";
  return titulo;
}

/** Título original do anúncio (uso interno: parceria/corretor). Nunca exibir ao cliente. */
export function tituloAnuncio(imovel: ImovelParaTitulo | null | undefined): string | null {
  return imovel?.caracteristicas?.titulo?.trim() || null;
}
