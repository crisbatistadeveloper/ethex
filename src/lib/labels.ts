import type { ClienteStatus, Finalidade, RegiaoAceita } from "@/lib/database.types";

export const FINALIDADE_LABELS: Record<Finalidade, string> = {
  moradia: "Moradia",
  investimento: "Investimento",
  temporada: "Temporada",
  sucessorio: "Sucessório",
  comercial: "Comercial",
  institucional: "Institucional",
  outro: "Outro",
};

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
