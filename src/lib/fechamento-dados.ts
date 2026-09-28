import type { createClient } from "@/lib/supabase/server";
import { situacaoDueDiligenceFechamento } from "@/lib/due-diligence-final";
import type {
  DecisaoImovelRow,
  DueDiligenceFinalRow,
  FechamentoRow,
  NegociacaoCompraRow,
  OportunidadeRow,
} from "@/lib/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface ContextoFechamento {
  oportunidade: OportunidadeRow;
  fechamento: FechamentoRow | null;
  escolhida: DecisaoImovelRow | null;
  negociacao: NegociacaoCompraRow | null;
  dueDiligence: DueDiligenceFinalRow | null;
  condicoes: {
    imovelEscolhido: boolean;
    negociacaoAceita: boolean;
    dueDiligenceAprovada: boolean;
  };
  podeGanhar: boolean;
  faltando: string[];
}

/**
 * Reúne o que já existe (decisão, negociação, due diligence) para o fechamento.
 * Negociação considerada: a aceita do imóvel escolhido; senão a mais recente.
 */
export async function carregarContextoFechamento(
  supabase: Supabase,
  oportunidadeId: string
): Promise<ContextoFechamento | null> {
  const { data: oportunidade } = await supabase
    .from("oportunidade")
    .select("*")
    .eq("id", oportunidadeId)
    .returns<OportunidadeRow[]>()
    .maybeSingle();
  if (!oportunidade) return null;

  const [{ data: fechamento }, { data: escolhida }, { data: negociacoes }] = await Promise.all([
    supabase
      .from("fechamento")
      .select("*")
      .eq("oportunidade_id", oportunidadeId)
      .returns<FechamentoRow[]>()
      .maybeSingle(),
    supabase
      .from("decisao_imovel")
      .select("*")
      .eq("oportunidade_id", oportunidadeId)
      .eq("decisao", "escolhido")
      .returns<DecisaoImovelRow[]>()
      .maybeSingle(),
    supabase
      .from("negociacao_compra")
      .select("*")
      .eq("oportunidade_id", oportunidadeId)
      .order("iniciada_em", { ascending: false })
      .returns<NegociacaoCompraRow[]>(),
  ]);

  const lista = negociacoes ?? [];
  const negociacao =
    lista.find(
      (n) => n.status === "aceita" && n.imovel_encontrado_id === escolhida?.imovel_encontrado_id
    ) ??
    lista[0] ??
    null;

  const { data: dueDiligence } = negociacao
    ? await supabase
        .from("due_diligence_final")
        .select("*")
        .eq("negociacao_id", negociacao.id)
        .returns<DueDiligenceFinalRow[]>()
        .maybeSingle()
    : { data: null };

  const condicoes = {
    imovelEscolhido: escolhida != null,
    negociacaoAceita:
      negociacao?.status === "aceita" && negociacao.imovel_encontrado_id === escolhida?.imovel_encontrado_id,
    dueDiligenceAprovada: situacaoDueDiligenceFechamento(dueDiligence ?? null).aprovada,
  };
  const faltando: string[] = [];
  if (!condicoes.imovelEscolhido) faltando.push("imóvel escolhido");
  if (!condicoes.negociacaoAceita) faltando.push("negociação de compra aceita para o imóvel escolhido");
  if (!condicoes.dueDiligenceAprovada) faltando.push("due diligence final aprovada (ou com ressalvas)");

  return {
    oportunidade,
    fechamento: fechamento ?? null,
    escolhida: escolhida ?? null,
    negociacao,
    dueDiligence: dueDiligence ?? null,
    condicoes,
    podeGanhar: oportunidade.status === "aberta" && faltando.length === 0,
    faltando,
  };
}
