import type {
  VisitaClienteOrigem,
  VisitaClienteResultado,
  VisitaClienteStatus,
} from "@/lib/database.types";

export const VISITA_CLIENTE_STATUS_LABELS: Record<VisitaClienteStatus, string> = {
  solicitada: "Solicitada",
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  nao_compareceu: "Não compareceu",
};

export const VISITA_CLIENTE_STATUS_COLORS: Record<VisitaClienteStatus, string> = {
  solicitada: "bg-amber-100 text-amber-800 border-amber-300",
  agendada: "bg-blue-100 text-blue-800 border-blue-300",
  realizada: "bg-green-100 text-green-800 border-green-300",
  cancelada: "bg-neutral-100 text-neutral-600 border-neutral-300",
  nao_compareceu: "bg-red-100 text-red-800 border-red-300",
};

export const VISITA_CLIENTE_RESULTADOS: VisitaClienteResultado[] = [
  "gostou",
  "gostou_com_ressalvas",
  "nao_gostou",
  "quer_negociar",
  "quer_pensar",
  "descartado",
];

export const VISITA_CLIENTE_RESULTADO_LABELS: Record<VisitaClienteResultado, string> = {
  gostou: "Gostou",
  gostou_com_ressalvas: "Gostou com ressalvas",
  nao_gostou: "Não gostou",
  quer_negociar: "Quer negociar",
  quer_pensar: "Quer pensar",
  descartado: "Descartado",
};

/** Frase registrada no histórico ao salvar o resultado. */
export const VISITA_CLIENTE_RESULTADO_FRASE: Record<VisitaClienteResultado, string> = {
  gostou: "Cliente gostou do imóvel.",
  gostou_com_ressalvas: "Cliente gostou do imóvel, com ressalvas.",
  nao_gostou: "Cliente não gostou do imóvel.",
  quer_negociar: "Cliente demonstrou interesse em negociar.",
  quer_pensar: "Cliente quer pensar.",
  descartado: "Imóvel descartado pelo cliente.",
};

export const VISITA_CLIENTE_ORIGEM_LABELS: Record<VisitaClienteOrigem, string> = {
  apresentacao: "Apresentação (cliente)",
  consultor: "Consultor",
};

/** "28/09/2026 às 15:00" a partir de date + time do Postgres (sem fuso). */
export function formatDataHorario(
  data: string | null,
  horario: string | null
): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  const base = `${dia}/${mes}/${ano}`;
  return horario ? `${base} às ${horario.slice(0, 5)}` : base;
}

/** Versão curta para histórico: "28/09 às 15:00". */
export function formatDataHorarioCurto(data: string, horario: string | null): string {
  const [, mes, dia] = data.split("-");
  return horario ? `${dia}/${mes} às ${horario.slice(0, 5)}` : `${dia}/${mes}`;
}

/** Combina date + time no fuso de Brasília (sem horário de verão desde 2019). */
export function dataHorarioParaIso(data: string, horario: string | null): string {
  return new Date(`${data}T${(horario ?? "09:00").slice(0, 5)}:00-03:00`).toISOString();
}

export const VISITA_ABERTA: VisitaClienteStatus[] = ["solicitada", "agendada"];
