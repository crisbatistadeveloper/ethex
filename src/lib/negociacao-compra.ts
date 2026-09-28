import type {
  DecisaoImovelStatus,
  NegociacaoCompraEventoTipo,
  NegociacaoCompraRow,
  NegociacaoCompraStatus,
} from "@/lib/database.types";

export const DECISOES: DecisaoImovelStatus[] = ["em_consideracao", "escolhido", "descartado"];

export const DECISAO_LABELS: Record<DecisaoImovelStatus, string> = {
  em_consideracao: "Em consideração",
  escolhido: "Escolhido",
  descartado: "Descartado",
};

export const DECISAO_COLORS: Record<DecisaoImovelStatus, string> = {
  em_consideracao: "bg-amber-100 text-amber-800 border-amber-300",
  escolhido: "bg-green-100 text-green-800 border-green-300",
  descartado: "bg-neutral-100 text-neutral-600 border-neutral-300",
};

export const NEGOCIACAO_COMPRA_STATUS_LABELS: Record<NegociacaoCompraStatus, string> = {
  iniciada: "Iniciada",
  proposta_enviada: "Proposta enviada",
  contraproposta: "Contraproposta",
  aceita: "Aceita",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

export const NEGOCIACAO_COMPRA_STATUS_COLORS: Record<NegociacaoCompraStatus, string> = {
  iniciada: "bg-neutral-100 text-neutral-700 border-neutral-300",
  proposta_enviada: "bg-blue-100 text-blue-800 border-blue-300",
  contraproposta: "bg-orange-100 text-orange-800 border-orange-300",
  aceita: "bg-green-100 text-green-800 border-green-300",
  recusada: "bg-red-100 text-red-800 border-red-300",
  cancelada: "bg-neutral-200 text-neutral-600 border-neutral-300",
};

export const NEGOCIACAO_ATIVA: NegociacaoCompraStatus[] = [
  "iniciada",
  "proposta_enviada",
  "contraproposta",
];

export function negociacaoAtiva(status: NegociacaoCompraStatus): boolean {
  return NEGOCIACAO_ATIVA.includes(status);
}

export const EVENTO_LABELS: Record<NegociacaoCompraEventoTipo, string> = {
  iniciada: "Negociação iniciada",
  proposta_enviada: "Proposta enviada",
  contraproposta_recebida: "Contraproposta recebida",
  aceita: "Proposta aceita",
  recusada: "Negociação recusada",
  cancelada: "Negociação cancelada",
  observacao: "Observação",
};

/** Movimentações que o consultor pode registrar em cada status. */
export function eventosPermitidos(status: NegociacaoCompraStatus): NegociacaoCompraEventoTipo[] {
  switch (status) {
    case "iniciada":
      return ["proposta_enviada", "contraproposta_recebida", "cancelada", "observacao"];
    case "proposta_enviada":
    case "contraproposta":
      return [
        "proposta_enviada",
        "contraproposta_recebida",
        "aceita",
        "recusada",
        "cancelada",
        "observacao",
      ];
    default:
      return ["observacao"];
  }
}

export const EVENTO_EXIGE_VALOR: NegociacaoCompraEventoTipo[] = [
  "proposta_enviada",
  "contraproposta_recebida",
];

export const EVENTO_STATUS: Partial<Record<NegociacaoCompraEventoTipo, NegociacaoCompraStatus>> = {
  proposta_enviada: "proposta_enviada",
  contraproposta_recebida: "contraproposta",
  aceita: "aceita",
  recusada: "recusada",
  cancelada: "cancelada",
};

/** Valor em discussão agora: final (se aceita) → último lado a se manifestar → anunciado. */
export function valorAtual(n: NegociacaoCompraRow): number | null {
  if (n.status === "aceita") return n.valor_final;
  if (n.status === "contraproposta") return n.valor_contraproposta ?? n.valor_proposta;
  if (n.status === "proposta_enviada") return n.valor_proposta;
  return n.valor_proposta ?? n.preco_anunciado;
}

export function formatBRL(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
