import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContatosDaBusca } from "@/components/ContatosDaBusca";
import {
  agruparPorContato,
  type ImovelDaBusca,
  type ParceiroResumo,
  type VisitasDoGrupo,
} from "@/lib/contato-busca";
import {
  createAtividade,
  toggleAtividadeStatus,
  updateOportunidadeObservacoes,
} from "@/app/(app)/crm/actions";
import { MoveEtapaSelect } from "@/app/(app)/crm/MoveEtapaSelect";
import {
  MOTIVO_PERDA_LABELS,
  RESULTADO_COLORS,
  RESULTADO_LABELS,
  comissaoExibida,
  formatDataCurta,
} from "@/lib/fechamento";
import { avancarOportunidadeParaVisita } from "@/app/(app)/visitas/actions";
import { VisitaResultadoTexto, VisitaStatusBadge } from "@/components/VisitaClienteBadges";
import { comContexto } from "@/lib/visita-cliente-dados";
import { VISITA_CLIENTE_ORIGEM_LABELS, formatDataHorario } from "@/lib/visita-cliente";
import { avancarOportunidadeParaNegociacao } from "@/app/(app)/negociacoes/actions";
import { formatParceiroLinhaCurta } from "@/lib/parceiros";
import { IMOVEL_TITULO_COLUNAS, tituloImovel, type ImovelParaTitulo } from "@/lib/imovel-titulo";
import { DueDiligenceFinalResumo } from "@/components/DueDiligenceFinalResumo";
import { dueDiligenceDaNegociacao } from "@/lib/due-diligence-final-dados";
import { iniciarDueDiligenceFinal } from "@/app/(app)/due-diligence/actions";
import {
  EVENTO_LABELS,
  NEGOCIACAO_COMPRA_STATUS_COLORS,
  NEGOCIACAO_COMPRA_STATUS_LABELS,
  formatBRL,
  negociacaoAtiva,
  valorAtual,
} from "@/lib/negociacao-compra";
import {
  ATIVIDADE_STATUS_LABELS,
  ATIVIDADE_TIPO_LABELS,
  ATIVIDADE_TIPOS,
  ETAPA_COLORS,
  ETAPA_LABELS,
  OPORTUNIDADE_STATUS_COLORS,
  OPORTUNIDADE_STATUS_LABELS,
  PIPELINE_ETAPAS,
  formatCurrencyBRL,
  formatDateTime,
} from "@/lib/crm";
import {
  FINALIDADE_LABELS,
  formatFaixaValores,
  formatRegiao,
} from "@/lib/labels";
import type {
  AtividadeRow,
  BuscaRow,
  ClienteRow,
  ContatoOportunidadeRow,
  ImovelComCuradoria,
  ImovelRow,
  VisitaPreviaRow,
  OportunidadeHistoricoRow,
  OportunidadeRow,
  PerfilRow,
  DecisaoImovelRow,
  FechamentoRow,
  NegociacaoCompraEventoRow,
  NegociacaoCompraRow,
  UsuarioRow,
  VisitaClienteRow,
  ApresentacaoItemRow,
  ApresentacaoRow,
} from "@/lib/database.types";
import {
  APRESENTACAO_STATUS_COLORS,
  APRESENTACAO_STATUS_LABELS,
  RESPOSTAS_CLIENTE,
} from "@/lib/apresentacao";

interface CuradoriaComImovel {
  id: string;
  score: number | null;
  status_curadoria: ImovelComCuradoria["status_curadoria"];
  comissao_combinada: boolean;
  selecionado_apresentacao: boolean | null;
  parceiro_id: string | null;
  imovel: ImovelRow;
}

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";

export default async function OportunidadeDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: oportunidade } = await supabase
    .from("oportunidade")
    .select("*")
    .eq("id", id)
    .returns<OportunidadeRow[]>()
    .maybeSingle();

  if (!oportunidade) notFound();

  const [{ data: cliente }, { data: consultor }, { data: perfil }] =
    await Promise.all([
      supabase
        .from("cliente")
        .select("*")
        .eq("id", oportunidade.cliente_id)
        .returns<ClienteRow[]>()
        .maybeSingle(),
      supabase
        .from("usuario")
        .select("id, nome")
        .eq("id", oportunidade.consultor_id)
        .returns<Pick<UsuarioRow, "id" | "nome">[]>()
        .maybeSingle(),
      supabase
        .from("perfil")
        .select("*")
        .eq("cliente_id", oportunidade.cliente_id)
        .returns<PerfilRow[]>()
        .maybeSingle(),
    ]);

  if (!cliente) notFound();

  let busca: BuscaRow | null = null;
  let imoveis: ImovelDaBusca[] = [];

  if (perfil) {
    const { data: buscas } = await supabase
      .from("busca")
      .select("*")
      .eq("perfil_id", perfil.id)
      .order("disparada_em", { ascending: false })
      .limit(1)
      .returns<BuscaRow[]>();
    busca = buscas?.[0] ?? null;

    if (busca) {
      const { data } = await supabase
        .from("imovel_encontrado")
        .select(
          "id, score, status_curadoria, comissao_combinada, selecionado_apresentacao, parceiro_id, imovel(*)"
        )
        .eq("busca_id", busca.id)
        .order("id", { ascending: false })
        .returns<CuradoriaComImovel[]>();
      imoveis = (data ?? []).map((c) => ({
        ...c.imovel,
        curadoria_id: c.id,
        curadoria_score: c.score,
        status_curadoria: c.status_curadoria,
        comissao_combinada: c.comissao_combinada,
        selecionado_apresentacao: Boolean(c.selecionado_apresentacao),
        parceiro_id: c.parceiro_id,
      }));
    }
  }

  const selecionadosApresentacao = imoveis.filter(
    (i) => i.selecionado_apresentacao
  ).length;

  const { data: atividades } = await supabase
    .from("atividade")
    .select("*")
    .eq("oportunidade_id", id)
    .order("data_hora", { ascending: false })
    .returns<AtividadeRow[]>();

  const { data: historico } = await supabase
    .from("oportunidade_historico")
    .select("*")
    .eq("oportunidade_id", id)
    .order("criado_em", { ascending: false })
    .limit(30)
    .returns<OportunidadeHistoricoRow[]>();

  const { data: visitasRaw } = await supabase
    .from("visita_cliente")
    .select("*")
    .or(
      `oportunidade_id.eq.${id},and(oportunidade_id.is.null,cliente_id.eq.${cliente.id})`
    )
    .order("criado_em", { ascending: false })
    .returns<VisitaClienteRow[]>();

  const { data: apresentacoesRaw } = await supabase
    .from("apresentacao")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("criado_em", { ascending: false })
    .returns<ApresentacaoRow[]>();
  const apresentacoes = apresentacoesRaw ?? [];
  let itensApresentacao: ApresentacaoItemRow[] = [];
  if (apresentacoes.length > 0) {
    const { data } = await supabase
      .from("apresentacao_item")
      .select("*")
      .in(
        "apresentacao_id",
        apresentacoes.map((a) => a.id)
      )
      .order("ordem", { ascending: true })
      .returns<ApresentacaoItemRow[]>();
    itensApresentacao = data ?? [];
  }
  const tituloPorCuradoria = new Map<string, string>();
  for (const i of imoveis) {
    tituloPorCuradoria.set(i.curadoria_id, tituloImovel(i));
  }
  const curadoriasSemTitulo = [
    ...new Set(
      itensApresentacao
        .map((it) => it.imovel_encontrado_id)
        .filter((ie) => !tituloPorCuradoria.has(ie))
    ),
  ];
  if (curadoriasSemTitulo.length > 0) {
    const { data } = await supabase
      .from("imovel_encontrado")
      .select(`id, imovel(${IMOVEL_TITULO_COLUNAS})`)
      .in("id", curadoriasSemTitulo)
      .returns<{ id: string; imovel: ImovelParaTitulo | null }[]>();
    for (const ie of data ?? []) {
      tituloPorCuradoria.set(ie.id, tituloImovel(ie.imovel));
    }
  }
  const visitasCliente = await comContexto(supabase, visitasRaw ?? []);
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
  const gruposContato = agruparPorContato(imoveis, parceirosPorId);

  const { data: contatosRaw } = await supabase
    .from("contato_oportunidade")
    .select("*")
    .eq("oportunidade_id", id)
    .returns<ContatoOportunidadeRow[]>();
  const contatosPorChave = new Map(
    (contatosRaw ?? []).map((c) => [c.chave, c] as const)
  );

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
  const visitasPorGrupo = new Map<string, VisitasDoGrupo>();
  for (const g of gruposContato) {
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
    const doGrupo = (visitasRaw ?? []).filter((v) =>
      curadoriaIds.has(v.imovel_encontrado_id)
    );
    visitasPorGrupo.set(g.chave, {
      total: g.imoveis.length,
      previaRealizada: previaRealizada.size,
      previaAgendada: previaAgendada.size,
      clienteAgendada: new Set(
        doGrupo.filter((v) => v.status === "agendada").map((v) => v.imovel_encontrado_id)
      ).size,
      clienteRealizada: new Set(
        doGrupo.filter((v) => v.status === "realizada").map((v) => v.imovel_encontrado_id)
      ).size,
    });
  }
  const visitasPendentes = visitasCliente.filter((v) => v.status === "solicitada").length;
  const podeAvancarVisita =
    oportunidade.status === "aberta" &&
    PIPELINE_ETAPAS.indexOf(oportunidade.etapa) < PIPELINE_ETAPAS.indexOf("visita");
  const avancarVisitaAction = avancarOportunidadeParaVisita.bind(null, id);

  const { data: escolhida } = await supabase
    .from("decisao_imovel")
    .select("*")
    .eq("oportunidade_id", id)
    .eq("decisao", "escolhido")
    .returns<DecisaoImovelRow[]>()
    .maybeSingle();
  let escolhidoInfo: {
    titulo: string;
    preco: number | null;
    parceiro: string | null;
  } | null = null;
  if (escolhida) {
    const { data: ie } = await supabase
      .from("imovel_encontrado")
      .select(`parceiro_id, imovel(preco, ${IMOVEL_TITULO_COLUNAS})`)
      .eq("id", escolhida.imovel_encontrado_id)
      .returns<
        {
          parceiro_id: string | null;
          imovel: ImovelParaTitulo & { preco: number | null };
        }[]
      >()
      .maybeSingle();
    let parceiroNome: string | null = null;
    if (ie?.parceiro_id) {
      const { data: p } = await supabase
        .from("parceiro")
        .select("nome, imobiliaria_nome")
        .eq("id", ie.parceiro_id)
        .maybeSingle();
      parceiroNome = p
        ? formatParceiroLinhaCurta(p as { nome: string; imobiliaria_nome: string | null })
        : null;
    }
    escolhidoInfo = {
      titulo: tituloImovel(ie?.imovel),
      preco: ie?.imovel.preco ?? null,
      parceiro: parceiroNome,
    };
  }

  const { data: negociacoesOp } = await supabase
    .from("negociacao_compra")
    .select("*")
    .eq("oportunidade_id", id)
    .order("iniciada_em", { ascending: false })
    .returns<NegociacaoCompraRow[]>();
  const negociacao =
    (negociacoesOp ?? []).find((n) => negociacaoAtiva(n.status)) ?? negociacoesOp?.[0] ?? null;
  let ultimoEvento: NegociacaoCompraEventoRow | null = null;
  if (negociacao) {
    const { data: ev } = await supabase
      .from("negociacao_compra_evento")
      .select("*")
      .eq("negociacao_id", negociacao.id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .returns<NegociacaoCompraEventoRow[]>();
    ultimoEvento = ev?.[0] ?? null;
  }
  const dueDiligence = negociacao ? await dueDiligenceDaNegociacao(supabase, negociacao.id) : null;
  const { data: fechamento } = await supabase
    .from("fechamento")
    .select("*")
    .eq("oportunidade_id", id)
    .returns<FechamentoRow[]>()
    .maybeSingle();
  const podeAvancarNegociacao =
    negociacao != null &&
    oportunidade.status === "aberta" &&
    PIPELINE_ETAPAS.indexOf(oportunidade.etapa) < PIPELINE_ETAPAS.indexOf("negociacao");
  const avancarNegociacaoAction = avancarOportunidadeParaNegociacao.bind(null, id);

  const proxima = (atividades ?? [])
    .filter((a) => a.status === "pendente")
    .sort(
      (a, b) =>
        new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
    )[0];

  const visitaPorAtividade = new Map<string, string>();
  if ((atividades ?? []).length > 0) {
    const { data: visitasDasAtividades } = await supabase
      .from("visita_cliente")
      .select("id, atividade_id")
      .in(
        "atividade_id",
        (atividades ?? []).map((a) => a.id)
      );
    for (const v of visitasDasAtividades ?? []) {
      if (v.atividade_id) visitaPorAtividade.set(v.atividade_id as string, v.id as string);
    }
  }
  const proximaVisitaId = proxima ? visitaPorAtividade.get(proxima.id) : undefined;

  const createAtividadeAction = createAtividade.bind(null, id);
  const updateObsAction = updateOportunidadeObservacoes.bind(null, id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/crm" className="text-sm text-[#5b6472] hover:underline">
            ← CRM
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{oportunidade.titulo}</h1>
          <p className="mt-1 text-sm text-[#5b6472]">
            Cliente:{" "}
            <Link
              href={`/clientes/${cliente.id}?oportunidade=${oportunidade.id}`}
              className="font-medium text-[#0b1f34] hover:underline"
            >
              {cliente.nome}
            </Link>
            {" · "}
            Consultor: {consultor?.nome ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${ETAPA_COLORS[oportunidade.etapa]}`}
          >
            {ETAPA_LABELS[oportunidade.etapa]}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${OPORTUNIDADE_STATUS_COLORS[oportunidade.status]}`}
          >
            {OPORTUNIDADE_STATUS_LABELS[oportunidade.status]}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-[#e4e0d9] bg-white p-4">
            <h2 className="text-sm font-semibold text-[#0b1f34]">Pipeline</h2>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              {oportunidade.status === "aberta" && (
                <div className="min-w-48 flex-1">
                  <p className={labelClass}>Mover etapa</p>
                  <MoveEtapaSelect
                    oportunidadeId={id}
                    etapaAtual={oportunidade.etapa}
                  />
                </div>
              )}
              <div className="min-w-40">
                <p className={labelClass}>Status</p>
                <p className="mt-1">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${OPORTUNIDADE_STATUS_COLORS[oportunidade.status]}`}
                  >
                    {OPORTUNIDADE_STATUS_LABELS[oportunidade.status]}
                  </span>
                  <Link href={`/crm/${id}/fechamento`} className="ml-2 text-xs text-[#5b6472] underline">
                    {oportunidade.status === "aberta" ? "ganha/perdida pelo fechamento" : "ver fechamento"}
                  </Link>
                </p>
              </div>
              <p className="text-sm text-[#5b6472]">
                Valor:{" "}
                <span className="font-medium">
                  {formatCurrencyBRL(oportunidade.valor_estimado)}
                </span>
              </p>
            </div>
            {proxima && (
              <p className="mt-3 text-sm text-[#5b6472]">
                Próxima atividade:{" "}
                {proximaVisitaId ? (
                  <Link
                    href={`/visitas/${proximaVisitaId}`}
                    className="font-medium hover:underline"
                  >
                    {proxima.titulo}
                  </Link>
                ) : (
                  <span className="font-medium">{proxima.titulo}</span>
                )}{" "}
                —{" "}
                {formatDateTime(proxima.data_hora)}
              </p>
            )}
          </section>

          <section className="rounded-lg border border-[#e4e0d9] bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Perfil / entrevista</h2>
              <Link
                href={`/clientes/${cliente.id}/entrevista`}
                className="text-xs text-[#5b6472] hover:underline"
              >
                {perfil ? "Editar entrevista" : "Fazer entrevista"}
              </Link>
            </div>
            {perfil ? (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[#5b6472]">Finalidade</dt>
                  <dd>{FINALIDADE_LABELS[perfil.finalidade]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5b6472]">Orçamento</dt>
                  <dd>
                    {formatFaixaValores(
                      perfil.orcamento_min,
                      perfil.orcamento_max
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-[#5b6472]">Regiões</dt>
                  <dd>
                    {perfil.regioes_aceitas?.length
                      ? perfil.regioes_aceitas.map(formatRegiao).join(" · ")
                      : "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-[#5b6472]">
                Ainda sem perfil de entrevista.
              </p>
            )}
          </section>

          <section id="imoveis-da-busca" className="scroll-mt-6 rounded-lg border border-[#e4e0d9] bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Imóveis da busca
                {busca ? (
                  <span className="ml-2 font-normal text-[#5b6472]">
                    ({imoveis.length})
                  </span>
                ) : null}
              </h2>
              <div className="flex items-center gap-3">
                <Link
                  href={`/clientes/${cliente.id}/imoveis/novo`}
                  className="text-xs text-[#5b6472] hover:underline"
                >
                  Adicionar imóvel
                </Link>
                {busca && imoveis.length > 0 && (
                  <Link
                    href={`/clientes/${cliente.id}/apresentacoes?oportunidade=${oportunidade.id}`}
                    className="rounded-md bg-[#d6b072] px-2.5 py-1 text-xs font-medium text-[#0b1f34] hover:brightness-105"
                  >
                    Criar apresentação
                    {selecionadosApresentacao > 0
                      ? ` (${selecionadosApresentacao})`
                      : ""}
                  </Link>
                )}
              </div>
            </div>
            {busca && imoveis.length > 0 && selecionadosApresentacao === 0 && (
              <p className="mt-2 text-xs text-[#5b6472]">
                Marque “☆ Selecionar p/ apresentação” nos imóveis que devem ir
                para o cliente e depois clique em “Criar apresentação”.
              </p>
            )}
            {!busca && (
              <p className="mt-3 text-sm text-[#5b6472]">
                Nenhuma busca vinculada ainda. Imóveis entram pela curadoria do
                cliente.
              </p>
            )}
            {busca && imoveis.length === 0 && (
              <p className="mt-3 text-sm text-[#5b6472]">
                Busca existente sem imóveis curados.
              </p>
            )}
            {imoveis.length > 0 && (
              <ContatosDaBusca
                grupos={gruposContato}
                contatos={contatosPorChave}
                visitas={visitasPorGrupo}
                oportunidadeId={id}
                clienteId={cliente.id}
                escolhidaCuradoriaId={escolhida?.imovel_encontrado_id ?? null}
                tituloPorCuradoria={tituloPorCuradoria}
                editavel={oportunidade.status === "aberta"}
              />
            )}
          </section>

          <section className="rounded-lg border border-[#e4e0d9] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Retorno das apresentações
              </h2>
              <Link
                href={`/clientes/${cliente.id}/apresentacoes?oportunidade=${oportunidade.id}`}
                className="text-xs text-[#5b6472] hover:underline"
              >
                Todas as apresentações
              </Link>
            </div>
            {apresentacoes.length === 0 ? (
              <p className="mt-3 text-sm text-[#5b6472]">
                Nenhuma apresentação criada. As respostas do cliente (“Quero
                visitar”, “Tenho interesse”, “Não tenho interesse”) aparecem
                aqui.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {apresentacoes.map((a) => {
                  const itens = itensApresentacao.filter(
                    (it) => it.apresentacao_id === a.id
                  );
                  const contagem = RESPOSTAS_CLIENTE.map((r) => ({
                    ...r,
                    n: itens.filter((it) => it.resposta_cliente === r.value).length,
                  }));
                  const semResposta = itens.filter((it) => !it.resposta_cliente).length;
                  return (
                    <div key={a.id} className="rounded-md border border-[#e4e0d9]">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4e0d9] px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Link
                            href={`/clientes/${cliente.id}/apresentacoes/${a.id}`}
                            className="font-medium hover:underline"
                          >
                            Apresentação de{" "}
                            {new Date(a.criado_em).toLocaleDateString("pt-BR")}
                          </Link>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] ${APRESENTACAO_STATUS_COLORS[a.status]}`}
                          >
                            {APRESENTACAO_STATUS_LABELS[a.status]}
                          </span>
                          {a.enviada_em && (
                            <span className="text-xs text-[#5b6472]">
                              enviada em {formatDateTime(a.enviada_em)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-[#5b6472]">
                          {contagem
                            .filter((c) => c.n > 0)
                            .map((c) => (
                              <span key={c.value}>
                                {c.icon} {c.n} {c.label.toLowerCase()}
                              </span>
                            ))}
                          {semResposta > 0 && (
                            <span className="text-[#5b6472]">
                              {semResposta} sem resposta
                            </span>
                          )}
                        </div>
                      </div>
                      {itens.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-[#5b6472]">
                          Sem imóveis nesta apresentação.
                        </p>
                      ) : (
                        <ul className="divide-y divide-[#e4e0d9]">
                          {itens.map((it) => {
                            const resposta = RESPOSTAS_CLIENTE.find(
                              (r) => r.value === it.resposta_cliente
                            );
                            return (
                              <li
                                key={it.id}
                                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                              >
                                <Link
                                  href={`/clientes/${cliente.id}/imoveis/${it.imovel_encontrado_id}`}
                                  className="min-w-0 hover:underline"
                                >
                                  {tituloPorCuradoria.get(it.imovel_encontrado_id) ?? "Imóvel"}
                                </Link>
                                {resposta ? (
                                  <span className="text-xs">
                                    <span
                                      className={`rounded-full border px-2 py-0.5 font-medium ${
                                        resposta.value === "selecionado_visita"
                                          ? "border-green-300 bg-green-50 text-green-800"
                                          : resposta.value === "interessado"
                                            ? "border-rose-300 bg-rose-50 text-rose-800"
                                            : "border-[#e4e0d9] bg-[#efe9e0] text-[#5b6472]"
                                      }`}
                                    >
                                      {resposta.icon} {resposta.label}
                                    </span>
                                    {it.resposta_cliente_em && (
                                      <span className="ml-2 text-[#5b6472]">
                                        {formatDateTime(it.resposta_cliente_em)}
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-xs text-[#5b6472]">
                                    {a.status === "rascunho" ? "Não enviada" : "Aguardando resposta"}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-[#e4e0d9] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Visitas
                {visitasPendentes > 0 && (
                  <span className="ml-2 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-amber-800">
                    {visitasPendentes} solicitação(ões) pendente(s)
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                {podeAvancarVisita && visitasCliente.length > 0 && (
                  <form action={avancarVisitaAction}>
                    <button
                      type="submit"
                      className="rounded-md border border-teal-300 px-2.5 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50"
                    >
                      Avançar para etapa Visita
                    </button>
                  </form>
                )}
                <Link href="/visitas" className="text-xs text-[#5b6472] hover:underline">
                  Todas as visitas
                </Link>
              </div>
            </div>
            {visitasCliente.length === 0 ? (
              <p className="mt-3 text-sm text-[#5b6472]">
                Nenhuma visita nesta oportunidade. Solicitações chegam pela
                apresentação (“Quero visitar”) ou pela curadoria do imóvel.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#e4e0d9] text-xs text-[#5b6472]">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Imóvel</th>
                      <th className="py-2 pr-3 font-medium">Data / hora</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Resultado</th>
                      <th className="py-2 pr-3 font-medium">Origem</th>
                      <th className="py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {visitasCliente.map((v) => (
                      <tr key={v.id} className="border-b border-[#e4e0d9] last:border-0">
                        <td className="py-2 pr-3 font-medium">{v.imovel_titulo}</td>
                        <td className="py-2 pr-3 text-[#0b1f34]">
                          {formatDataHorario(v.data_visita, v.horario)}
                        </td>
                        <td className="py-2 pr-3">
                          <VisitaStatusBadge status={v.status} />
                        </td>
                        <td className="py-2 pr-3">
                          <VisitaResultadoTexto resultado={v.resultado} />
                        </td>
                        <td className="py-2 pr-3 text-xs text-[#5b6472]">
                          {VISITA_CLIENTE_ORIGEM_LABELS[v.origem]}
                        </td>
                        <td className="py-2 text-right">
                          <Link
                            href={`/visitas/${v.id}`}
                            className="whitespace-nowrap text-xs text-[#0b1f34] hover:underline"
                          >
                            Abrir visita →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-[#e4e0d9] bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Imóvel escolhido</h2>
            {!escolhida || !escolhidoInfo ? (
              <p className="mt-3 text-sm text-[#5b6472]">
                Nenhum imóvel escolhido. Registre a decisão do cliente na
                curadoria do imóvel (“Decisão do cliente”).
              </p>
            ) : (
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <dt className="text-xs text-[#5b6472]">Imóvel</dt>
                  <dd>
                    <Link
                      href={`/clientes/${cliente.id}/imoveis/${escolhida.imovel_encontrado_id}`}
                      className="font-medium hover:underline"
                    >
                      {escolhidoInfo.titulo}
                    </Link>
                    <p className="text-xs text-[#5b6472]">
                      Escolhido em {formatDateTime(escolhida.decidido_em)}
                      {escolhida.observacao ? ` · ${escolhida.observacao}` : ""}
                    </p>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5b6472]">Preço anunciado</dt>
                  <dd className="font-medium tabular-nums">{formatBRL(escolhidoInfo.preco)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5b6472]">Parceiro</dt>
                  <dd>{escolhidoInfo.parceiro ?? "—"}</dd>
                </div>
                <div className="sm:col-span-4">
                  <dt className="text-xs text-[#5b6472]">Status da negociação</dt>
                  <dd>
                    {negociacao && negociacao.imovel_encontrado_id === escolhida.imovel_encontrado_id ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${NEGOCIACAO_COMPRA_STATUS_COLORS[negociacao.status]}`}
                      >
                        {NEGOCIACAO_COMPRA_STATUS_LABELS[negociacao.status]}
                      </span>
                    ) : (
                      <span className="text-[#5b6472]">
                        Não iniciada —{" "}
                        <Link
                          href={`/clientes/${cliente.id}/imoveis/${escolhida.imovel_encontrado_id}`}
                          className="underline"
                        >
                          iniciar na curadoria
                        </Link>
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          {negociacao && (
            <section className="rounded-lg border border-[#e4e0d9] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide">Negociação</h2>
                <div className="flex items-center gap-2">
                  {podeAvancarNegociacao && (
                    <form action={avancarNegociacaoAction}>
                      <button
                        type="submit"
                        className="rounded-md border border-orange-300 px-2.5 py-1 text-xs font-medium text-orange-800 hover:bg-orange-50"
                      >
                        Avançar para etapa Negociação
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/negociacoes/${negociacao.id}`}
                    className="rounded-md bg-[#d6b072] px-3 py-1.5 text-xs font-medium text-[#0b1f34] hover:brightness-105"
                  >
                    Ver negociação
                  </Link>
                </div>
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-[#5b6472]">Valor atual</dt>
                  <dd className="text-lg font-semibold tabular-nums">{formatBRL(valorAtual(negociacao))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5b6472]">Última movimentação</dt>
                  <dd>
                    {ultimoEvento ? (
                      <>
                        {EVENTO_LABELS[ultimoEvento.tipo]}
                        <p className="text-xs text-[#5b6472]">{formatDateTime(ultimoEvento.criado_em)}</p>
                      </>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5b6472]">Status</dt>
                  <dd>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${NEGOCIACAO_COMPRA_STATUS_COLORS[negociacao.status]}`}
                    >
                      {NEGOCIACAO_COMPRA_STATUS_LABELS[negociacao.status]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5b6472]">Próxima ação</dt>
                  <dd>
                    {negociacao.proxima_acao ?? "—"}
                    {negociacao.proxima_acao_em && (
                      <p className="text-xs text-[#5b6472]">
                        até {negociacao.proxima_acao_em.split("-").reverse().join("/")}
                      </p>
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {negociacao && (
            <DueDiligenceFinalResumo
              dados={dueDiligence}
              negociacaoStatus={negociacao.status}
              negociacaoHref={`/negociacoes/${negociacao.id}`}
              iniciarAction={iniciarDueDiligenceFinal.bind(null, negociacao.id)}
            />
          )}

          <section className="rounded-lg border border-[#e4e0d9] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide">Fechamento</h2>
              <Link
                href={`/crm/${id}/fechamento`}
                className="rounded-md bg-[#d6b072] px-3 py-1.5 text-xs font-medium text-[#0b1f34] hover:brightness-105"
              >
                {fechamento ? "Ver fechamento" : "Abrir fechamento"}
              </Link>
            </div>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-5">
              <div>
                <dt className="text-xs text-[#5b6472]">Resultado</dt>
                <dd>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${RESULTADO_COLORS[fechamento?.resultado ?? "aberto"]}`}
                  >
                    {fechamento ? RESULTADO_LABELS[fechamento.resultado] : "Em aberto"}
                  </span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#5b6472]">Imóvel</dt>
                <dd>{escolhidoInfo?.titulo ?? "—"}</dd>
              </div>
              {fechamento?.resultado === "perdido" ? (
                <div>
                  <dt className="text-xs text-[#5b6472]">Motivo</dt>
                  <dd>{fechamento.motivo_perda ? MOTIVO_PERDA_LABELS[fechamento.motivo_perda] : "—"}</dd>
                </div>
              ) : (
                <div>
                  <dt className="text-xs text-[#5b6472]">Valor</dt>
                  <dd className="font-medium tabular-nums">{formatBRL(fechamento?.valor_fechado ?? null)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-[#5b6472]">Data</dt>
                <dd>{fechamento ? formatDataCurta(fechamento.data_fechamento) : "—"}</dd>
              </div>
              {fechamento?.resultado === "ganho" && (
                <div className="sm:col-span-5">
                  <dt className="text-xs text-[#5b6472]">Comissão ETHEX</dt>
                  <dd className="tabular-nums">
                    {(() => {
                      const c = comissaoExibida(fechamento);
                      return c.valor != null ? `${formatBRL(c.valor)} (${c.efetiva ? "efetiva" : "prevista"})` : "—";
                    })()}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border border-[#e4e0d9] bg-white p-4">
            <h2 className="text-sm font-semibold">Atividades</h2>
            <form action={createAtividadeAction} className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="tipo" className={labelClass}>
                    Tipo
                  </label>
                  <select
                    id="tipo"
                    name="tipo"
                    defaultValue="tarefa"
                    className={inputClass}
                  >
                    {ATIVIDADE_TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {ATIVIDADE_TIPO_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="data_hora" className={labelClass}>
                    Data/hora
                  </label>
                  <input
                    id="data_hora"
                    name="data_hora"
                    type="datetime-local"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="titulo" className={labelClass}>
                  Título
                </label>
                <input
                  id="titulo"
                  name="titulo"
                  required
                  className={inputClass}
                  placeholder="Ex.: Ligar para confirmar visita"
                />
              </div>
              <div>
                <label htmlFor="descricao" className={labelClass}>
                  Descrição
                </label>
                <textarea
                  id="descricao"
                  name="descricao"
                  rows={2}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
              >
                Adicionar atividade
              </button>
            </form>

            <ul className="mt-4 divide-y divide-[#e4e0d9]">
              {(atividades ?? []).length === 0 && (
                <li className="py-4 text-sm text-[#5b6472]">
                  Nenhuma atividade registrada.
                </li>
              )}
              {(atividades ?? []).map((a) => {
                const toggle = toggleAtividadeStatus.bind(null, a.id, id);
                return (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-3"
                  >
                    <div>
                      {visitaPorAtividade.has(a.id) ? (
                        <Link
                          href={`/visitas/${visitaPorAtividade.get(a.id)}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {a.titulo}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">{a.titulo}</p>
                      )}
                      <p className="text-xs text-[#5b6472]">
                        {ATIVIDADE_TIPO_LABELS[a.tipo]} ·{" "}
                        {formatDateTime(a.data_hora)} ·{" "}
                        {ATIVIDADE_STATUS_LABELS[a.status]}
                      </p>
                      {a.descricao && (
                        <p className="mt-1 text-sm text-[#5b6472]">
                          {a.descricao}
                        </p>
                      )}
                    </div>
                    <form action={toggle}>
                      <input
                        type="hidden"
                        name="status"
                        value={
                          a.status === "pendente" ? "concluida" : "pendente"
                        }
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-[#e4e0d9] px-2.5 py-1 text-xs hover:bg-[#faf8f5]"
                      >
                        {a.status === "pendente" ? "Concluir" : "Reabrir"}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-[#e4e0d9] bg-white p-4">
            <h2 className="text-sm font-semibold">Observações</h2>
            <form action={updateObsAction} className="mt-3 space-y-2">
              <textarea
                name="observacoes"
                rows={4}
                defaultValue={oportunidade.observacoes ?? ""}
                className={inputClass}
              />
              <button
                type="submit"
                className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-xs hover:bg-[#faf8f5]"
              >
                Salvar
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-[#e4e0d9] bg-white p-4">
            <h2 className="text-sm font-semibold">Histórico</h2>
            <ul className="mt-3 space-y-3">
              {(historico ?? []).length === 0 && (
                <li className="text-sm text-[#5b6472]">Sem eventos.</li>
              )}
              {(historico ?? []).map((h) => (
                <li key={h.id} className="text-sm">
                  <p className="text-[#0b1f34]">
                    {h.detalhe ??
                      (h.tipo === "etapa"
                        ? `Etapa → ${h.etapa_nova ? ETAPA_LABELS[h.etapa_nova] : "—"}`
                        : h.tipo === "status"
                          ? `Status → ${h.status_novo ? OPORTUNIDADE_STATUS_LABELS[h.status_novo] : "—"}`
                          : h.tipo)}
                  </p>
                  <p className="text-xs text-[#5b6472]">
                    {formatDateTime(h.criado_em)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-[#e4e0d9] bg-white p-4 text-sm">
            <h2 className="text-sm font-semibold">Links</h2>
            <ul className="mt-2 space-y-1 text-[#5b6472]">
              <li>
                <Link
                  href={`/clientes/${cliente.id}?oportunidade=${oportunidade.id}`}
                  className="hover:underline"
                >
                  Ficha do cliente
                </Link>
              </li>
              <li>
                <Link
                  href={`/clientes/${cliente.id}/apresentacoes?oportunidade=${oportunidade.id}`}
                  className="hover:underline"
                >
                  Apresentações do cliente
                </Link>
              </li>
              <li>
                <Link href="/crm/pipeline" className="hover:underline">
                  Ver no pipeline
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
