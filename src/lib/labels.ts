import type {
  ClienteStatus,
  Finalidade,
  ImovelStatusConstrucao,
  RegiaoAceita,
} from "@/lib/database.types";

export const FINALIDADE_LABELS: Record<Finalidade, string> = {
  moradia: "Moradia",
  investimento: "Investimento",
  temporada: "Temporada",
  sucessorio: "Sucessório",
  comercial: "Comercial",
  institucional: "Institucional",
  outro: "Outro",
};

export const STATUS_CONSTRUCAO_VALUES: ImovelStatusConstrucao[] = [
  "pronto",
  "em_construcao",
  "na_planta",
];

export const STATUS_CONSTRUCAO_LABELS: Record<ImovelStatusConstrucao, string> = {
  pronto: "Pronto",
  em_construcao: "Em construção",
  na_planta: "Na planta",
};

export const STATUS_CONSTRUCAO_COLORS: Record<ImovelStatusConstrucao, string> = {
  pronto: "bg-green-50 text-green-800 border-green-200",
  em_construcao: "bg-amber-50 text-amber-800 border-amber-200",
  na_planta: "bg-sky-50 text-sky-800 border-sky-200",
};

export function parseStatusConstrucao(
  value: string | null
): ImovelStatusConstrucao | null {
  return STATUS_CONSTRUCAO_VALUES.includes(value as ImovelStatusConstrucao)
    ? (value as ImovelStatusConstrucao)
    : null;
}

// lead.origem é texto livre: as landings gravam "landing-principal" e "em-breve".
export const ORIGEM_LEAD_LABELS: Record<string, string> = {
  "landing-principal": "Landing page",
  "em-breve": "Página em breve",
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  indicacao: "Indicação",
  plantao: "Plantão de vendas",
  presencial: "Atendimento presencial",
  instagram: "Instagram",
  outro: "Outro",
};

export const ORIGENS_LEAD_MANUAL = [
  "whatsapp",
  "telefone",
  "indicacao",
  "plantao",
  "presencial",
  "instagram",
  "landing-principal",
  "outro",
] as const;

export function origemLeadLabel(origem: string): string {
  return ORIGEM_LEAD_LABELS[origem] ?? origem;
}

export const STATUS_LABELS: Record<ClienteStatus, string> = {
  em_entrevista: "Em entrevista",
  em_busca: "Em busca",
  em_curadoria: "Em curadoria",
  fechado: "Fechado",
};

export const STATUS_COLORS: Record<ClienteStatus, string> = {
  em_entrevista: "bg-amber-100 text-amber-800 border-amber-300",
  em_busca: "bg-blue-100 text-blue-800 border-blue-300",
  em_curadoria: "bg-purple-100 text-purple-800 border-purple-300",
  fechado: "bg-green-100 text-green-800 border-green-300",
};

export function formatRegiao(regiao: RegiaoAceita): string {
  const local = [regiao.bairro, regiao.cidade].filter(Boolean).join(", ");
  return `${local} - ${regiao.uf}`;
}

export function formatFaixaValores(
  min: number | null,
  max: number | null
): string {
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (min === null && max === null) return "—";
  if (min !== null && max !== null) return `${fmt(min)} – ${fmt(max)}`;
  if (min !== null) return `a partir de ${fmt(min)}`;
  return `até ${fmt(max as number)}`;
}
