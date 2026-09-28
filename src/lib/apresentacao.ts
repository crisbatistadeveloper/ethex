import type {
  ApresentacaoItemStatus,
  ApresentacaoStatus,
  Caracteristicas,
  DueDiligenceStatus,
  ImovelStatusConstrucao,
  VisitaPreviaRecomendacao,
} from "@/lib/database.types";
import {
  extrairCaracteristicas,
  type CaracteristicasImovel,
} from "@/lib/imovel-caracteristicas";
import { tituloImovel } from "@/lib/imovel-titulo";

export const APRESENTACAO_STATUS: ApresentacaoStatus[] = [
  "rascunho",
  "enviada",
  "em_avaliacao",
  "concluida",
];

export const APRESENTACAO_STATUS_LABELS: Record<ApresentacaoStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  em_avaliacao: "Em avaliação",
  concluida: "Concluída",
};

export const APRESENTACAO_STATUS_COLORS: Record<ApresentacaoStatus, string> = {
  rascunho: "bg-neutral-100 text-neutral-700 border-neutral-300",
  enviada: "bg-blue-100 text-blue-800 border-blue-300",
  em_avaliacao: "bg-amber-100 text-amber-800 border-amber-300",
  concluida: "bg-green-100 text-green-800 border-green-300",
};

export const ITEM_STATUS: ApresentacaoItemStatus[] = [
  "apresentado",
  "interessado",
  "nao_interessado",
  "selecionado_visita",
];

export const ITEM_STATUS_LABELS: Record<ApresentacaoItemStatus, string> = {
  apresentado: "Apresentado",
  interessado: "Interessado",
  nao_interessado: "Não interessado",
  selecionado_visita: "Selecionado para visita",
};

export const ITEM_STATUS_COLORS: Record<ApresentacaoItemStatus, string> = {
  apresentado: "bg-neutral-100 text-neutral-700 border-neutral-300",
  interessado: "bg-rose-100 text-rose-800 border-rose-300",
  nao_interessado: "bg-neutral-200 text-neutral-600 border-neutral-300",
  selecionado_visita: "bg-green-100 text-green-800 border-green-300",
};

export const RESPOSTAS_CLIENTE = [
  { value: "interessado", label: "Tenho interesse", icon: "❤️" },
  { value: "nao_interessado", label: "Não tenho interesse", icon: "❌" },
  { value: "selecionado_visita", label: "Quero visitar", icon: "📅" },
] as const satisfies ReadonlyArray<{
  value: ApresentacaoItemStatus;
  label: string;
  icon: string;
}>;

/** Estrelas derivadas só da recomendação da visita prévia (sem sistema de notas). */
export const RECOMENDACAO_ESTRELAS: Record<VisitaPreviaRecomendacao, number> = {
  recomendar: 5,
  recomendar_com_ressalvas: 4,
  nao_recomendar: 2,
};

export const RECOMENDACAO_TEXTO: Record<VisitaPreviaRecomendacao, string> = {
  recomendar: "Recomendado",
  recomendar_com_ressalvas: "Recomendado com ressalvas",
  nao_recomendar: "Não recomendado",
};

export function estrelas(rec: VisitaPreviaRecomendacao | null): string {
  if (!rec) return "";
  const n = RECOMENDACAO_ESTRELAS[rec];
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

export function formatPreco(preco: number | null): string | null {
  if (preco == null) return null;
  return preco.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/** Conteúdo exibido do imóvel — montado a partir de imovel + visita prévia, nunca gravado. */
export interface ApresentacaoImovelConteudo {
  curadoria_id: string;
  titulo: string;
  descricao: string | null;
  preco: number | null;
  status_construcao: ImovelStatusConstrucao | null;
  estrutura: CaracteristicasImovel;
  endereco_texto: string | null;
  latitude: number | null;
  longitude: number | null;
  fotos: string[];
  videos: string[];
  recomendacao: VisitaPreviaRecomendacao | null;
  visita_data: string | null;
  avaliacao_geral: string | null;
  pontos_positivos: string | null;
  pontos_negativos: string | null;
  due_diligence_status: DueDiligenceStatus | null;
}

export interface MidiaVisita {
  tipo: "foto" | "video";
  url: string;
}

export interface VisitaResumo {
  recomendacao: VisitaPreviaRecomendacao | null;
  data_visita: string | null;
  avaliacao_geral: string | null;
  pontos_positivos: string | null;
  pontos_negativos: string | null;
  midias: MidiaVisita[];
}

/** Ordem das mídias: visita prévia (ordenada) → mídia própria → imagem do anúncio. */
export function montarConteudo(input: {
  curadoria_id: string;
  preco: number | null;
  caracteristicas: Caracteristicas | null;
  status_construcao?: ImovelStatusConstrucao | null;
  estrutura?: Partial<CaracteristicasImovel> | null;
  endereco_texto: string | null;
  latitude: number | null;
  longitude: number | null;
  midia_propria: string[] | null;
  due_diligence_status: DueDiligenceStatus | null;
  visita: VisitaResumo | null;
  url?: string | null;
}): ApresentacaoImovelConteudo {
  const c = input.caracteristicas ?? {};
  const fotos: string[] = [];
  const videos: string[] = [];
  const push = (url: string, video: boolean) => {
    const lista = video ? videos : fotos;
    if (!lista.includes(url)) lista.push(url);
  };

  for (const m of input.visita?.midias ?? []) {
    push(m.url, m.tipo === "video");
  }
  for (const url of input.midia_propria ?? []) {
    push(url, isVideoUrl(url));
  }
  if (c.imagem_anuncio) push(c.imagem_anuncio, false);

  return {
    curadoria_id: input.curadoria_id,
    titulo: tituloImovel({
      ...input.estrutura,
      caracteristicas: c,
      url: input.url,
      status_construcao: input.status_construcao,
    }),
    descricao: c.descricao ?? null,
    preco: input.preco,
    status_construcao: input.status_construcao ?? null,
    estrutura: extrairCaracteristicas(input.estrutura),
    endereco_texto: input.endereco_texto,
    latitude: input.latitude,
    longitude: input.longitude,
    fotos,
    videos,
    recomendacao: input.visita?.recomendacao ?? null,
    visita_data: input.visita?.data_visita ?? null,
    avaliacao_geral: input.visita?.avaliacao_geral ?? null,
    pontos_positivos: input.visita?.pontos_positivos ?? null,
    pontos_negativos: input.visita?.pontos_negativos ?? null,
    due_diligence_status: input.due_diligence_status,
  };
}
