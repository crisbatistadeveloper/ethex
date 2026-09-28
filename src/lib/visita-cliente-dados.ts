import type { createClient } from "@/lib/supabase/server";
import type { OportunidadeEtapa, VisitaClienteRow } from "@/lib/database.types";
import { IMOVEL_TITULO_COLUNAS, tituloImovel, type ImovelParaTitulo } from "@/lib/imovel-titulo";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface VisitaClienteComContexto extends VisitaClienteRow {
  cliente_nome: string | null;
  imovel_titulo: string;
  imovel_endereco: string | null;
  oportunidade_etapa: OportunidadeEtapa | null;
  consultor_nome: string | null;
}

/** Enriquecimento com consultas separadas (sem joins embutidos — padrão do CRM). */
export async function comContexto(
  supabase: Supabase,
  visitas: VisitaClienteRow[]
): Promise<VisitaClienteComContexto[]> {
  if (visitas.length === 0) return [];

  const clienteIds = [...new Set(visitas.map((v) => v.cliente_id))];
  const imovelIds = [...new Set(visitas.map((v) => v.imovel_id))];
  const opIds = [
    ...new Set(visitas.map((v) => v.oportunidade_id).filter(Boolean)),
  ] as string[];
  const consultorIds = [...new Set(visitas.map((v) => v.consultor_id))];

  const { data: clientes } = await supabase
    .from("cliente")
    .select("id, nome")
    .in("id", clienteIds);
  const { data: imoveis } = await supabase
    .from("imovel")
    .select(`id, endereco_texto, ${IMOVEL_TITULO_COLUNAS}`)
    .in("id", imovelIds)
    .returns<(ImovelParaTitulo & { id: string; endereco_texto: string | null })[]>();
  const { data: ops } = opIds.length
    ? await supabase.from("oportunidade").select("id, etapa").in("id", opIds)
    : { data: [] };
  const { data: consultores } = await supabase
    .from("usuario")
    .select("id, nome")
    .in("id", consultorIds);

  const clienteNome = new Map(
    (clientes ?? []).map((c) => [c.id as string, c.nome as string])
  );
  const imovelInfo = new Map(
    (imoveis ?? []).map((i) => [
      i.id,
      { titulo: tituloImovel(i), endereco: i.endereco_texto ?? null },
    ])
  );
  const opEtapa = new Map(
    (ops ?? []).map((o) => [o.id as string, o.etapa as OportunidadeEtapa])
  );
  const consultorNome = new Map(
    (consultores ?? []).map((c) => [c.id as string, c.nome as string])
  );

  return visitas.map((v) => ({
    ...v,
    cliente_nome: clienteNome.get(v.cliente_id) ?? null,
    imovel_titulo: imovelInfo.get(v.imovel_id)?.titulo ?? "Imóvel",
    imovel_endereco: imovelInfo.get(v.imovel_id)?.endereco ?? null,
    oportunidade_etapa: v.oportunidade_id
      ? (opEtapa.get(v.oportunidade_id) ?? null)
      : null,
    consultor_nome: consultorNome.get(v.consultor_id) ?? null,
  }));
}
