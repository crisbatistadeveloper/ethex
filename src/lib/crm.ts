import type {
  AtividadeStatus,
  AtividadeTipo,
  OportunidadeEtapa,
  OportunidadeStatus,
} from "@/lib/database.types";

export const PIPELINE_ETAPAS: OportunidadeEtapa[] = [
  "novo_lead",
  "entrevista",
  "busca",
  "curadoria",
  "visita",
  "negociacao",
  "fechamento",
];

export const ETAPA_LABELS: Record<OportunidadeEtapa, string> = {
  novo_lead: "Novo Lead",
  entrevista: "Entrevista",
  busca: "Busca",
  curadoria: "Curadoria",
  visita: "Visita",
  negociacao: "Negociação",
  fechamento: "Fechamento",
};

export const ETAPA_COLORS: Record<OportunidadeEtapa, string> = {
  novo_lead: "bg-sky-100 text-sky-800 border-sky-300",
  entrevista: "bg-amber-100 text-amber-800 border-amber-300",
  busca: "bg-blue-100 text-blue-800 border-blue-300",
  curadoria: "bg-violet-100 text-violet-800 border-violet-300",
  visita: "bg-teal-100 text-teal-800 border-teal-300",
  negociacao: "bg-orange-100 text-orange-800 border-orange-300",
  fechamento: "bg-green-100 text-green-800 border-green-300",
};

export const OPORTUNIDADE_STATUS_LABELS: Record<OportunidadeStatus, string> = {
  aberta: "Aberta",
  ganha: "Ganha",
  perdida: "Perdida",
};

export const OPORTUNIDADE_STATUS_COLORS: Record<OportunidadeStatus, string> = {
  aberta: "bg-blue-100 text-blue-800 border-blue-300",
  ganha: "bg-green-100 text-green-800 border-green-300",
  perdida: "bg-neutral-100 text-neutral-600 border-neutral-300",
};

export const ATIVIDADE_TIPO_LABELS: Record<AtividadeTipo, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  reuniao: "Reunião",
  entrevista: "Entrevista",
  visita: "Visita",
  tarefa: "Tarefa",
  observacao: "Observação",
};

export const ATIVIDADE_TIPOS: AtividadeTipo[] = [
  "ligacao",
  "whatsapp",
  "reuniao",
  "entrevista",
  "visita",
  "tarefa",
  "observacao",
];

export const ATIVIDADE_STATUS_LABELS: Record<AtividadeStatus, string> = {
  pendente: "Pendente",
  concluida: "Concluída",
};

export function etapaFromClienteStatus(status: string): OportunidadeEtapa {
  switch (status) {
    case "em_entrevista":
      return "entrevista";
    case "em_busca":
      return "busca";
    case "em_curadoria":
      return "curadoria";
    case "fechado":
      return "fechamento";
    default:
      return "novo_lead";
  }
}

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
