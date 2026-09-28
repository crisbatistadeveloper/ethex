import type { SupabaseClient } from "@supabase/supabase-js";
import { isVideoUrl } from "@/lib/apresentacao";
import type {
  ImovelRow,
  VisitaPreviaMidiaRow,
  VisitaPreviaRow,
} from "@/lib/database.types";

export type OrigemMidia = "visita" | "propria" | "anuncio";

export interface MidiaImovel {
  url: string;
  video: boolean;
  origem: OrigemMidia;
  /** Ex.: "Visita prévia · 12/09/2026" */
  legenda: string;
  descricao?: string | null;
  visitaId?: string;
}

/**
 * Junta num só lugar as mídias do imóvel: fotos/vídeos das visitas prévias,
 * mídia própria e a imagem do anúncio (nessa ordem de prioridade).
 */
export async function midiasDoImovel(
  supabase: SupabaseClient,
  imovel: Pick<ImovelRow, "id" | "midia_propria" | "caracteristicas">
): Promise<MidiaImovel[]> {
  const { data: visitas } = await supabase
    .from("visita_previa")
    .select("id, data_visita")
    .eq("imovel_id", imovel.id)
    .order("data_visita", { ascending: false, nullsFirst: false })
    .returns<Pick<VisitaPreviaRow, "id" | "data_visita">[]>();

  const visitaIds = (visitas ?? []).map((v) => v.id);
  let midiasVisita: VisitaPreviaMidiaRow[] = [];
  if (visitaIds.length > 0) {
    const { data } = await supabase
      .from("visita_previa_midia")
      .select("*")
      .in("visita_id", visitaIds)
      .order("ordem", { ascending: true })
      .returns<VisitaPreviaMidiaRow[]>();
    midiasVisita = data ?? [];
  }

  const resultado: MidiaImovel[] = [];
  const vistas = new Set<string>();
  const add = (m: MidiaImovel) => {
    if (!m.url || vistas.has(m.url)) return;
    vistas.add(m.url);
    resultado.push(m);
  };

  for (const v of visitas ?? []) {
    const data = v.data_visita
      ? new Date(v.data_visita).toLocaleDateString("pt-BR")
      : null;
    for (const m of midiasVisita.filter((x) => x.visita_id === v.id)) {
      add({
        url: m.url,
        video: m.tipo === "video" || isVideoUrl(m.url),
        origem: "visita",
        legenda: data ? `Visita prévia · ${data}` : "Visita prévia",
        descricao: m.descricao,
        visitaId: v.id,
      });
    }
  }
  for (const url of imovel.midia_propria ?? []) {
    add({ url, video: isVideoUrl(url), origem: "propria", legenda: "Mídia própria" });
  }
  const anuncio = imovel.caracteristicas?.imagem_anuncio;
  if (anuncio) {
    add({ url: anuncio, video: false, origem: "anuncio", legenda: "Anúncio" });
  }
  return resultado;
}
