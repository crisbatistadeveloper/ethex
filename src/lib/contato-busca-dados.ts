import type { createClient } from "@/lib/supabase/server";
import {
  agruparPorContato,
  type GrupoContato,
  type ImovelDaBusca,
  type ParceiroResumo,
  type VisitasDoGrupo,
} from "@/lib/contato-busca";
import type {
  ContatoOportunidadeRow,
  VisitaClienteRow,
  VisitaPreviaRow,
} from "@/lib/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface ContatosDaBuscaDados {
  grupos: GrupoContato[];
  contatos: Map<string, ContatoOportunidadeRow>;
  visitas: Map<string, VisitasDoGrupo>;
}

/**
 * Agrupa os imóveis da busca por contato e carrega o que o roteiro precisa:
 * o roteiro salvo da oportunidade e o andamento das visitas (prévia e do
 * cliente), que continuam nos módulos próprios.
 */
export async function carregarContatosDaBusca(
  supabase: Supabase,
  {
    oportunidadeId,
    imoveis,
    visitasCliente,
  }: {
    oportunidadeId: string;
    imoveis: ImovelDaBusca[];
    visitasCliente: Pick<VisitaClienteRow, "imovel_encontrado_id" | "status">[];
  }
): Promise<ContatosDaBuscaDados> {
  const parceiroIds = [
    ...new Set(
      imoveis.map((i) => i.parceiro_id).filter((p): p is string => Boolean(p))
    ),
  ];
  const parceirosPorId = new Map<string, ParceiroResumo>();
  if (parceiroIds.length > 0) {
    const { data } = await supabase
      .from("parceiro")
      .select("id, nome, imobiliaria_nome, modelo_divisao, whatsapp, contato_telefone")
      .in("id", parceiroIds)
      .returns<ParceiroResumo[]>();
    for (const p of data ?? []) parceirosPorId.set(p.id, p);
  }
  const grupos = agruparPorContato(imoveis, parceirosPorId);

  const { data: contatosRaw } = await supabase
    .from("contato_oportunidade")
    .select("*")
    .eq("oportunidade_id", oportunidadeId)
    .returns<ContatoOportunidadeRow[]>();
  const contatos = new Map((contatosRaw ?? []).map((c) => [c.chave, c] as const));

  let previas: Pick<VisitaPreviaRow, "imovel_id" | "status">[] = [];
  if (imoveis.length > 0) {
    const { data } = await supabase
      .from("visita_previa")
      .select("imovel_id, status")
      .in(
        "imovel_id",
        imoveis.map((i) => i.id)
      )
      .returns<Pick<VisitaPreviaRow, "imovel_id" | "status">[]>();
    previas = data ?? [];
  }

  const visitas = new Map<string, VisitasDoGrupo>();
  for (const g of grupos) {
    const imovelIds = new Set(g.imoveis.map((i) => i.id));
    const curadoriaIds = new Set(g.imoveis.map((i) => i.curadoria_id));
    const previaRealizada = new Set(
      previas
        .filter((p) => imovelIds.has(p.imovel_id) && p.status === "realizada")
        .map((p) => p.imovel_id)
    );
    const previaAgendada = new Set(
      previas
        .filter((p) => imovelIds.has(p.imovel_id) && p.status === "agendada")
        .map((p) => p.imovel_id)
    );
    for (const idRealizada of previaRealizada) previaAgendada.delete(idRealizada);
    const doGrupo = visitasCliente.filter((v) =>
      curadoriaIds.has(v.imovel_encontrado_id)
    );
    const imoveisComVisita = (status: string) =>
      new Set(
        doGrupo.filter((v) => v.status === status).map((v) => v.imovel_encontrado_id)
      ).size;
    visitas.set(g.chave, {
      total: g.imoveis.length,
      previaRealizada: previaRealizada.size,
      previaAgendada: previaAgendada.size,
      clienteAgendada: imoveisComVisita("agendada"),
      clienteRealizada: imoveisComVisita("realizada"),
    });
  }

  return { grupos, contatos, visitas };
}
