import type {
  DueDiligenceFinalCategoria,
  DueDiligenceFinalItemRow,
  DueDiligenceFinalItemStatus,
  DueDiligenceFinalPendenciaRow,
  DueDiligenceFinalPendenciaStatus,
  DueDiligenceFinalRecomendacao,
  DueDiligenceFinalStatus,
} from "@/lib/database.types";

export const DD_FINAL_BUCKET = "documentos-operacao";

export const AVISO_NAO_JURIDICO =
  "Registro operacional da ETHEX para organizar documentos e pendências da operação. Não é parecer jurídico profissional e não substitui a análise de um advogado.";

export const DD_FINAL_STATUS: DueDiligenceFinalStatus[] = [
  "em_andamento",
  "pendente_documentos",
  "em_analise",
  "aprovada",
  "aprovada_com_ressalvas",
  "reprovada",
];

export const DD_FINAL_STATUS_LABELS: Record<DueDiligenceFinalStatus, string> = {
  em_andamento: "Em andamento",
  pendente_documentos: "Pendente de documentos",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  aprovada_com_ressalvas: "Aprovada com ressalvas",
  reprovada: "Reprovada",
};

export const DD_FINAL_STATUS_COLORS: Record<DueDiligenceFinalStatus, string> = {
  em_andamento: "bg-blue-100 text-blue-800 border-blue-300",
  pendente_documentos: "bg-amber-100 text-amber-800 border-amber-300",
  em_analise: "bg-violet-100 text-violet-800 border-violet-300",
  aprovada: "bg-green-100 text-green-800 border-green-300",
  aprovada_com_ressalvas: "bg-teal-100 text-teal-800 border-teal-300",
  reprovada: "bg-red-100 text-red-800 border-red-300",
};

export const NAO_INICIADA_LABEL = "Não iniciada";
export const NAO_INICIADA_COLOR = "bg-neutral-100 text-neutral-700 border-neutral-300";

export const DD_FINAL_STATUS_CONCLUSIVOS: DueDiligenceFinalStatus[] = [
  "aprovada",
  "aprovada_com_ressalvas",
  "reprovada",
];

export const RECOMENDACOES: DueDiligenceFinalRecomendacao[] = [
  "prosseguir",
  "prosseguir_com_ressalvas",
  "nao_prosseguir",
];

export const RECOMENDACAO_LABELS: Record<DueDiligenceFinalRecomendacao, string> = {
  prosseguir: "Prosseguir",
  prosseguir_com_ressalvas: "Prosseguir com ressalvas",
  nao_prosseguir: "Não prosseguir",
};

export const RECOMENDACAO_COLORS: Record<DueDiligenceFinalRecomendacao, string> = {
  prosseguir: "bg-green-100 text-green-800 border-green-300",
  prosseguir_com_ressalvas: "bg-teal-100 text-teal-800 border-teal-300",
  nao_prosseguir: "bg-red-100 text-red-800 border-red-300",
};

/**
 * Situação da due diligence para o fechamento. Aprovada quando o status é
 * aprovada/aprovada com ressalvas OU o resultado registrado é Prosseguir /
 * Prosseguir com ressalvas (status Reprovada sempre bloqueia).
 * Espelhada em validar_fechamento() (0022).
 */
export function situacaoDueDiligenceFechamento(
  dd: { status: DueDiligenceFinalStatus; recomendacao: DueDiligenceFinalRecomendacao | null } | null
): { aprovada: boolean; label: string; color: string } {
  if (!dd) return { aprovada: false, label: NAO_INICIADA_LABEL, color: NAO_INICIADA_COLOR };
  if (dd.status === "aprovada" || dd.status === "aprovada_com_ressalvas") {
    return { aprovada: true, label: DD_FINAL_STATUS_LABELS[dd.status], color: DD_FINAL_STATUS_COLORS[dd.status] };
  }
  if (dd.status !== "reprovada" && dd.recomendacao === "prosseguir") {
    return { aprovada: true, label: "Aprovada — Prosseguir", color: DD_FINAL_STATUS_COLORS.aprovada };
  }
  if (dd.status !== "reprovada" && dd.recomendacao === "prosseguir_com_ressalvas") {
    return {
      aprovada: true,
      label: "Aprovada com ressalvas — Prosseguir com ressalvas",
      color: DD_FINAL_STATUS_COLORS.aprovada_com_ressalvas,
    };
  }
  return { aprovada: false, label: DD_FINAL_STATUS_LABELS[dd.status], color: DD_FINAL_STATUS_COLORS[dd.status] };
}

export const CATEGORIAS: DueDiligenceFinalCategoria[] = [
  "imovel",
  "proprietario",
  "certidoes",
  "condominio",
  "outros",
];

export const CATEGORIA_LABELS: Record<DueDiligenceFinalCategoria, string> = {
  imovel: "Imóvel",
  proprietario: "Proprietário / vendedores",
  certidoes: "Certidões",
  condominio: "Condomínio",
  outros: "Outros",
};

export const CATEGORIA_DICAS: Partial<Record<DueDiligenceFinalCategoria, string>> = {
  certidoes:
    "Adicione as certidões conforme a orientação jurídica desta operação — o sistema não presume quais são obrigatórias.",
  condominio: "Quando aplicável. Se o imóvel não tiver condomínio, marque “Não se aplica”.",
};

export const ITEM_STATUS: DueDiligenceFinalItemStatus[] = [
  "pendente",
  "solicitado",
  "recebido",
  "aprovado",
  "rejeitado",
  "nao_aplicavel",
];

export const ITEM_STATUS_LABELS: Record<DueDiligenceFinalItemStatus, string> = {
  pendente: "Pendente",
  solicitado: "Solicitado",
  recebido: "Recebido",
  aprovado: "Conferido",
  rejeitado: "Com problema",
  nao_aplicavel: "Não se aplica",
};

export const ITEM_STATUS_COLORS: Record<DueDiligenceFinalItemStatus, string> = {
  pendente: "bg-neutral-100 text-neutral-700 border-neutral-300",
  solicitado: "bg-amber-100 text-amber-800 border-amber-300",
  recebido: "bg-blue-100 text-blue-800 border-blue-300",
  aprovado: "bg-green-100 text-green-800 border-green-300",
  rejeitado: "bg-red-100 text-red-800 border-red-300",
  nao_aplicavel: "bg-neutral-50 text-neutral-500 border-neutral-200",
};

export const PENDENCIA_STATUS: DueDiligenceFinalPendenciaStatus[] = [
  "aberta",
  "em_andamento",
  "resolvida",
  "dispensada",
];

export const PENDENCIA_STATUS_LABELS: Record<DueDiligenceFinalPendenciaStatus, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  resolvida: "Resolvida",
  dispensada: "Dispensada",
};

export const PENDENCIA_STATUS_COLORS: Record<DueDiligenceFinalPendenciaStatus, string> = {
  aberta: "bg-amber-100 text-amber-800 border-amber-300",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-300",
  resolvida: "bg-green-100 text-green-800 border-green-300",
  dispensada: "bg-neutral-100 text-neutral-500 border-neutral-300",
};

export const RESPONSAVEIS_SUGERIDOS = [
  "Consultor",
  "Parceiro",
  "Proprietário",
  "Cliente",
  "Advogado",
  "Imobiliária",
];

/** Checklist mínimo criado ao iniciar; nenhum item é obrigatório (pode virar "não se aplica"). */
export const CHECKLIST_INICIAL: {
  categoria: DueDiligenceFinalCategoria;
  titulo: string;
  documentoTipo?: "matricula" | "iptu";
}[] = [
  { categoria: "imovel", titulo: "Matrícula / inteiro teor atualizada", documentoTipo: "matricula" },
  { categoria: "imovel", titulo: "IPTU", documentoTipo: "iptu" },
  { categoria: "imovel", titulo: "Situação cadastral do imóvel" },
  { categoria: "imovel", titulo: "Dados do proprietário na matrícula" },
  { categoria: "proprietario", titulo: "Identificação dos proprietários / vendedores" },
  { categoria: "proprietario", titulo: "Documentação pessoal dos vendedores" },
  { categoria: "proprietario", titulo: "Estado civil / regime de bens (quando aplicável)" },
  { categoria: "condominio", titulo: "Declaração de débitos condominiais" },
  { categoria: "condominio", titulo: "Documentos relevantes do condomínio" },
];

export function itemConcluido(i: Pick<DueDiligenceFinalItemRow, "status">): boolean {
  return i.status === "aprovado" || i.status === "nao_aplicavel";
}

export function itemRecebido(
  i: Pick<DueDiligenceFinalItemRow, "status" | "storage_path" | "imovel_documento_id">
): boolean {
  return i.status === "recebido" || i.status === "aprovado";
}

export function pendenciaAberta(p: Pick<DueDiligenceFinalPendenciaRow, "status">): boolean {
  return p.status === "aberta" || p.status === "em_andamento";
}

export function resumoDueDiligence(
  itens: Pick<DueDiligenceFinalItemRow, "status" | "storage_path" | "imovel_documento_id">[],
  pendencias: Pick<DueDiligenceFinalPendenciaRow, "status">[]
) {
  const aplicaveis = itens.filter((i) => i.status !== "nao_aplicavel");
  return {
    checklistFeitos: itens.filter(itemConcluido).length,
    checklistTotal: itens.length,
    documentosRecebidos: aplicaveis.filter(itemRecebido).length,
    documentosEsperados: aplicaveis.length,
    pendenciasAbertas: pendencias.filter(pendenciaAberta).length,
  };
}
