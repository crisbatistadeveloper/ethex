import type {
  ComissaoTipo,
  FechamentoMotivoPerda,
  FechamentoResultado,
  FechamentoRow,
} from "@/lib/database.types";

export const RESULTADO_LABELS: Record<FechamentoResultado, string> = {
  ganho: "Ganho",
  perdido: "Perdido",
};

export const RESULTADO_COLORS: Record<FechamentoResultado | "aberto", string> = {
  aberto: "bg-blue-100 text-blue-800 border-blue-300",
  ganho: "bg-green-100 text-green-800 border-green-300",
  perdido: "bg-neutral-100 text-neutral-600 border-neutral-300",
};

export const MOTIVOS_PERDA: FechamentoMotivoPerda[] = [
  "cliente_desistiu",
  "imovel_reprovado",
  "negociacao_nao_avancou",
  "preco",
  "documentacao",
  "parceiro",
  "escolheu_outro_imovel",
  "outro",
];

export const MOTIVO_PERDA_LABELS: Record<FechamentoMotivoPerda, string> = {
  cliente_desistiu: "Cliente desistiu",
  imovel_reprovado: "Imóvel reprovado",
  negociacao_nao_avancou: "Negociação não avançou",
  preco: "Preço",
  documentacao: "Documentação",
  parceiro: "Parceiro",
  escolheu_outro_imovel: "Escolheu outro imóvel",
  outro: "Outro",
};

/** Comissão prevista pelo percentual sobre o valor fechado, arredondada em centavos. */
export function calcularComissaoPercentual(valorFechado: number, percentual: number): number {
  return Math.round(valorFechado * percentual) / 100;
}

export const COMISSAO_TIPO_LABELS: Record<ComissaoTipo, string> = {
  percentual: "Percentual sobre o valor fechado",
  valor: "Valor fixo",
};

/** Comissão para exibição: efetiva, senão prevista. */
export function comissaoExibida(
  f: Pick<FechamentoRow, "comissao_efetiva" | "comissao_prevista">
): { valor: number | null; efetiva: boolean } {
  if (f.comissao_efetiva != null) return { valor: f.comissao_efetiva, efetiva: true };
  return { valor: f.comissao_prevista, efetiva: false };
}

export function formatDataCurta(d: string | null | undefined): string {
  return d ? d.slice(0, 10).split("-").reverse().join("/") : "—";
}
