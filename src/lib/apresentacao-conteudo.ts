import type { createClient } from "@/lib/supabase/server";
import {
  montarConteudo,
  type ApresentacaoImovelConteudo,
  type VisitaResumo,
} from "@/lib/apresentacao";
import type {
  DueDiligenceStatus,
  ImovelRow,
  VisitaPreviaMidiaRow,
  VisitaPreviaRow,
} from "@/lib/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface CuradoriaComImovel {
  id: string;
  imovel_id: string;
  due_diligence_status: DueDiligenceStatus | null;
  imovel: ImovelRow;
}

/** Conteúdo dos imóveis (visão interna, com RLS do consultor), por curadoria. */
export async function carregarConteudoCuradorias(
  supabase: Supabase,
  curadoriaIds: string[]
): Promise<Map<string, ApresentacaoImovelConteudo>> {
  const resultado = new Map<string, ApresentacaoImovelConteudo>();
  if (curadoriaIds.length === 0) return resultado;

  const { data: curadorias } = await supabase
    .from("imovel_encontrado")
    .select("id, imovel_id, due_diligence_status, imovel(*)")
    .in("id", curadoriaIds)
    .returns<CuradoriaComImovel[]>();

  const imovelIds = [...new Set((curadorias ?? []).map((c) => c.imovel_id))];

  const visitaPorImovel = new Map<string, VisitaPreviaRow>();
  if (imovelIds.length > 0) {
    const { data: visitas } = await supabase
      .from("visita_previa")
      .select("*")
      .in("imovel_id", imovelIds)
      .eq("status", "realizada")
      .order("data_visita", { ascending: false, nullsFirst: false })
      .returns<VisitaPreviaRow[]>();
    for (const v of visitas ?? []) {
      if (!visitaPorImovel.has(v.imovel_id)) visitaPorImovel.set(v.imovel_id, v);
    }
  }

  const visitaIds = [...visitaPorImovel.values()].map((v) => v.id);
  const midiasPorVisita = new Map<string, VisitaPreviaMidiaRow[]>();
  if (visitaIds.length > 0) {
    const { data: midias } = await supabase
      .from("visita_previa_midia")
      .select("*")
      .in("visita_id", visitaIds)
      .order("ordem", { ascending: true })
      .returns<VisitaPreviaMidiaRow[]>();
    for (const m of midias ?? []) {
      const lista = midiasPorVisita.get(m.visita_id) ?? [];
      lista.push(m);
      midiasPorVisita.set(m.visita_id, lista);
    }
  }

  for (const c of curadorias ?? []) {
    const v = visitaPorImovel.get(c.imovel_id);
    const visita: VisitaResumo | null = v
      ? {
          recomendacao: v.recomendacao,
          data_visita: v.data_visita,
          avaliacao_geral: v.avaliacao_geral,
          pontos_positivos: v.pontos_positivos,
          pontos_negativos: v.pontos_negativos,
          midias: (midiasPorVisita.get(v.id) ?? []).map((m) => ({
            tipo: m.tipo,
            url: m.url,
          })),
        }
      : null;

    resultado.set(
      c.id,
      montarConteudo({
        curadoria_id: c.id,
        preco: c.imovel.preco,
        caracteristicas: c.imovel.caracteristicas,
        status_construcao: c.imovel.status_construcao,
        estrutura: c.imovel,
        endereco_texto: c.imovel.endereco_texto,
        latitude: c.imovel.latitude,
        longitude: c.imovel.longitude,
        midia_propria: c.imovel.midia_propria,
        due_diligence_status: c.due_diligence_status,
        visita,
        url: c.imovel.url,
      })
    );
  }

  return resultado;
}
