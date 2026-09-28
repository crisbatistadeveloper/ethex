import type { ParceiroRow } from "@/lib/database.types";

export const PARCEIRO_TIPOS = [
  "corretor",
  "imobiliaria",
  "proprietario",
  "incorporadora",
] as const;

export const PARCEIRO_TIPO_LABELS: Record<ParceiroRow["tipo"], string> = {
  corretor: "Corretor",
  imobiliaria: "Imobiliária",
  proprietario: "Proprietário",
  incorporadora: "Incorporadora",
};

export const PARCEIRO_HISTORICO_TIPOS = [
  "negociacao_comissao",
  "documentacao",
  "atendimento",
  "velocidade_resposta",
  "observacao",
  "outro",
] as const;

export type ParceiroHistoricoTipo = (typeof PARCEIRO_HISTORICO_TIPOS)[number];

export const PARCEIRO_HISTORICO_LABELS: Record<ParceiroHistoricoTipo, string> = {
  negociacao_comissao: "Negociação de comissão",
  documentacao: "Documentação",
  atendimento: "Qualidade do atendimento",
  velocidade_resposta: "Velocidade de resposta",
  observacao: "Observação",
  outro: "Outro",
};

export function formatParceiroResumo(p: {
  nome: string;
  imobiliaria_nome?: string | null;
  modelo_divisao?: string | null;
  politica_comissao?: string | null;
  ultima_negociacao_em?: string | null;
}): string {
  const nomeLinha = p.imobiliaria_nome
    ? `${p.nome} / ${p.imobiliaria_nome}`
    : p.nome;
  const comissao =
    p.modelo_divisao || p.politica_comissao
      ? `Comissão habitual: ${p.modelo_divisao ?? p.politica_comissao}`
      : null;
  const ultima = p.ultima_negociacao_em
    ? `Última negociação: ${new Date(p.ultima_negociacao_em).toLocaleDateString("pt-BR")}`
    : null;
  return [`Parceiro: ${nomeLinha}`, comissao, ultima].filter(Boolean).join("\n");
}

export function formatParceiroLinhaCurta(p: {
  nome: string;
  imobiliaria_nome?: string | null;
}): string {
  return p.imobiliaria_nome ? `${p.nome} / ${p.imobiliaria_nome}` : p.nome;
}

export const NEGOCIACAO_STATUS = [
  "pendente",
  "em_negociacao",
  "aprovado",
  "recusado",
] as const;

export const NEGOCIACAO_STATUS_LABELS: Record<
  (typeof NEGOCIACAO_STATUS)[number],
  string
> = {
  pendente: "Pendente",
  em_negociacao: "Em negociação",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export const NEGOCIACAO_STATUS_COLORS: Record<
  (typeof NEGOCIACAO_STATUS)[number],
  string
> = {
  pendente: "bg-amber-100 text-amber-800 border-amber-300",
  em_negociacao: "bg-blue-100 text-blue-800 border-blue-300",
  aprovado: "bg-green-100 text-green-800 border-green-300",
  recusado: "bg-red-100 text-red-800 border-red-300",
};
