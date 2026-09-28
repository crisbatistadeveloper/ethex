import type {
  DueDiligenceChecklist,
  DueDiligenceStatus,
  ImovelDocumentoStatus,
  ImovelDocumentoTipo,
} from "@/lib/database.types";

export const DOCUMENTOS_IMOVEIS_BUCKET = "documentos-imoveis";

export const DOCUMENTO_TIPOS: ImovelDocumentoTipo[] = [
  "matricula",
  "iptu",
  "outro",
];

export const DOCUMENTO_TIPO_LABELS: Record<ImovelDocumentoTipo, string> = {
  matricula: "Certidão de matrícula / inteiro teor",
  iptu: "IPTU",
  outro: "Outros documentos",
};

export const DOCUMENTO_STATUS: ImovelDocumentoStatus[] = [
  "pendente",
  "solicitado",
  "recebido",
  "aprovado",
  "rejeitado",
];

export const DOCUMENTO_STATUS_LABELS: Record<ImovelDocumentoStatus, string> = {
  pendente: "Pendente",
  solicitado: "Solicitado",
  recebido: "Recebido",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export const DOCUMENTO_STATUS_ICONS: Record<ImovelDocumentoStatus, string> = {
  pendente: "○",
  solicitado: "…",
  recebido: "↓",
  aprovado: "✓",
  rejeitado: "✕",
};

export const DUE_DILIGENCE_STATUS: DueDiligenceStatus[] = [
  "pendente",
  "em_analise",
  "aprovado",
  "aprovado_com_ressalvas",
  "reprovado",
];

export const DUE_DILIGENCE_STATUS_LABELS: Record<DueDiligenceStatus, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  aprovado_com_ressalvas: "Aprovado com ressalvas",
  reprovado: "Reprovado",
};

export const DUE_DILIGENCE_STATUS_COLORS: Record<DueDiligenceStatus, string> = {
  pendente: "bg-neutral-100 text-neutral-700 border-neutral-300",
  em_analise: "bg-amber-100 text-amber-800 border-amber-300",
  aprovado: "bg-green-100 text-green-800 border-green-300",
  aprovado_com_ressalvas: "bg-teal-100 text-teal-800 border-teal-300",
  reprovado: "bg-red-100 text-red-800 border-red-300",
};

export const CHECKLIST_KEYS = [
  "matricula_atualizada",
  "iptu",
  "documentacao_recebida",
  "analise_inicial",
] as const;

export const CHECKLIST_LABELS: Record<
  (typeof CHECKLIST_KEYS)[number],
  string
> = {
  matricula_atualizada: "Matrícula / inteiro teor atualizada",
  iptu: "IPTU",
  documentacao_recebida: "Documentação recebida",
  analise_inicial: "Análise inicial realizada",
};

export const CHECKLIST_DEFAULT: DueDiligenceChecklist = {
  matricula_atualizada: false,
  iptu: false,
  documentacao_recebida: false,
  analise_inicial: false,
};

export function normalizeChecklist(
  raw: unknown
): DueDiligenceChecklist {
  const base = { ...CHECKLIST_DEFAULT };
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  for (const key of CHECKLIST_KEYS) {
    base[key] = Boolean(obj[key]);
  }
  return base;
}

export function checklistProgress(checklist: DueDiligenceChecklist): {
  done: number;
  total: number;
} {
  const total = CHECKLIST_KEYS.length;
  const done = CHECKLIST_KEYS.filter((k) => checklist[k]).length;
  return { done, total };
}
