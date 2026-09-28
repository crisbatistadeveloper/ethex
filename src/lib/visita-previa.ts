import type {
  VisitaPreviaRecomendacao,
  VisitaPreviaStatus,
} from "@/lib/database.types";

export const VISITA_STATUS: VisitaPreviaStatus[] = [
  "agendada",
  "realizada",
  "cancelada",
];

export const VISITA_STATUS_LABELS: Record<VisitaPreviaStatus, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export const VISITA_STATUS_COLORS: Record<VisitaPreviaStatus, string> = {
  agendada: "bg-amber-100 text-amber-800 border-amber-300",
  realizada: "bg-green-100 text-green-800 border-green-300",
  cancelada: "bg-neutral-100 text-neutral-600 border-neutral-300",
};

export const VISITA_RECOMENDACOES: VisitaPreviaRecomendacao[] = [
  "recomendar",
  "recomendar_com_ressalvas",
  "nao_recomendar",
];

export const VISITA_RECOMENDACAO_LABELS: Record<
  VisitaPreviaRecomendacao,
  string
> = {
  recomendar: "Recomendar",
  recomendar_com_ressalvas: "Recomendar com ressalvas",
  nao_recomendar: "Não recomendar",
};

/** Campos de observação livre (todos opcionais). */
export const VISITA_OBS_CAMPOS = [
  { key: "obs_conservacao", label: "Conservação" },
  { key: "obs_iluminacao", label: "Iluminação" },
  { key: "obs_ventilacao", label: "Ventilação" },
  { key: "obs_ruido", label: "Ruído" },
  { key: "obs_vizinhanca", label: "Vizinhança" },
  { key: "obs_condominio", label: "Condomínio" },
  { key: "obs_acesso", label: "Acesso" },
  { key: "obs_localizacao", label: "Localização" },
  { key: "obs_nao_constam_anuncio", label: "Não constam no anúncio" },
] as const;

export type VisitaObsKey = (typeof VISITA_OBS_CAMPOS)[number]["key"];
