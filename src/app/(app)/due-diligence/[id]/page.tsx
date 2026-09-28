import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentoOperacaoUploader } from "@/components/DocumentoOperacaoUploader";
import { ETAPA_COLORS, ETAPA_LABELS, formatDateTime } from "@/lib/crm";
import { formatBRL } from "@/lib/negociacao-compra";
import { formatParceiroLinhaCurta } from "@/lib/parceiros";
import { DOCUMENTOS_IMOVEIS_BUCKET, DOCUMENTO_TIPO_LABELS } from "@/lib/due-diligence";
import { gerarUrlsAssinadas } from "@/lib/storage-assinado";
import {
  AVISO_NAO_JURIDICO,
  CATEGORIAS,
  CATEGORIA_DICAS,
  CATEGORIA_LABELS,
  DD_FINAL_BUCKET,
  DD_FINAL_STATUS,
  DD_FINAL_STATUS_COLORS,
  DD_FINAL_STATUS_LABELS,
  ITEM_STATUS,
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  PENDENCIA_STATUS,
  PENDENCIA_STATUS_COLORS,
  PENDENCIA_STATUS_LABELS,
  RECOMENDACOES,
  RECOMENDACAO_COLORS,
  RECOMENDACAO_LABELS,
  RESPONSAVEIS_SUGERIDOS,
  pendenciaAberta,
  resumoDueDiligence,
  situacaoDueDiligenceFechamento,
} from "@/lib/due-diligence-final";
import {
  adicionarItemDueDiligence,
  alterarStatusDueDiligence,
  atualizarItemDueDiligence,
  atualizarPendencia,
  criarPendencia,
  registrarAnalise,
  registrarObservacaoDueDiligence,
  avancarOportunidadeParaFechamento,
} from "../actions";
import { IMOVEL_TITULO_COLUNAS, tituloImovel, type ImovelParaTitulo } from "@/lib/imovel-titulo";
import type {
  DueDiligenceFinalEventoRow,
  DueDiligenceFinalItemRow,
  DueDiligenceFinalPendenciaRow,
  DueDiligenceFinalRow,
  ImovelDocumentoRow,
  NegociacaoCompraRow,
  OportunidadeEtapa,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";

function formatData(d: string | null): string {
  return d ? d.slice(0, 10).split("-").reverse().join("/") : "—";
}

export default async function DueDiligenceFinalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: dd } = await supabase
    .from("due_diligence_final")
    .select("*")
    .eq("id", id)
    .returns<DueDiligenceFinalRow[]>()
    .maybeSingle();
  if (!dd) notFound();

  const [
    { data: cliente },
    { data: imovel },
    { data: negociacao },
    { data: op },
    { data: ie },
    { data: itensRaw },
    { data: pendenciasRaw },
    { data: eventos },
    { data: documentosImovel },
  ] = await Promise.all([
    supabase.from("cliente").select("nome").eq("id", dd.cliente_id).maybeSingle(),
    supabase
      .from("imovel")
      .select(`fonte, endereco_texto, ${IMOVEL_TITULO_COLUNAS}`)
      .eq("id", dd.imovel_id)
      .returns<(ImovelParaTitulo & { fonte: string; endereco_texto: string | null })[]>()
      .maybeSingle(),
    supabase
      .from("negociacao_compra")
      .select("*")
      .eq("id", dd.negociacao_id)
      .returns<NegociacaoCompraRow[]>()
      .maybeSingle(),
    supabase.from("oportunidade").select("etapa, status").eq("id", dd.oportunidade_id).maybeSingle(),
    supabase.from("imovel_encontrado").select("parceiro_id").eq("id", dd.imovel_encontrado_id).maybeSingle(),
    supabase
      .from("due_diligence_final_item")
      .select("*")
      .eq("due_diligence_id", id)
      .order("ordem")
      .returns<DueDiligenceFinalItemRow[]>(),
    supabase
      .from("due_diligence_final_pendencia")
      .select("*")
      .eq("due_diligence_id", id)
      .order("criado_em")
      .returns<DueDiligenceFinalPendenciaRow[]>(),
    supabase
      .from("due_diligence_final_evento")
      .select("*")
      .eq("due_diligence_id", id)
      .order("criado_em", { ascending: false })
      .returns<DueDiligenceFinalEventoRow[]>(),
    supabase
      .from("imovel_documento")
      .select("*")
      .eq("imovel_id", dd.imovel_id)
      .order("criado_em")
      .returns<ImovelDocumentoRow[]>(),
  ]);

  const itens = itensRaw ?? [];
  const pendencias = pendenciasRaw ?? [];
  const docsImovel = documentosImovel ?? [];
  const docPorId = new Map(docsImovel.map((d) => [d.id, d]));

  const parceiroId = (ie?.parceiro_id as string | null | undefined) ?? null;
  const { data: parceiro } = parceiroId
    ? await supabase.from("parceiro").select("nome, imobiliaria_nome").eq("id", parceiroId).maybeSingle()
    : { data: null };

  const urlPorPath = await gerarUrlsAssinadas(
    supabase,
    DD_FINAL_BUCKET,
    itens.map((i) => i.storage_path)
  );
  const urlDocImovelPorPath = await gerarUrlsAssinadas(
    supabase,
    DOCUMENTOS_IMOVEIS_BUCKET,
    itens
      .map((i) => (i.imovel_documento_id ? docPorId.get(i.imovel_documento_id)?.storage_path : null))
  );

  const autorIds = [
    ...new Set(
      [dd.consultor_id, ...(eventos ?? []).map((e) => e.autor_id), ...pendencias.map((p) => p.criado_por)].filter(
        (v): v is string => Boolean(v)
      )
    ),
  ];
  const { data: autores } = await supabase.from("usuario").select("id, nome").in("id", autorIds);
  const nomeAutor = new Map((autores ?? []).map((a) => [a.id as string, a.nome as string]));

  const titulo = tituloImovel(imovel);
  const etapa = (op?.etapa as OportunidadeEtapa | undefined) ?? null;
  const resumo = resumoDueDiligence(itens, pendencias);
  const hoje = new Date().toISOString().slice(0, 10);

  const statusAction = alterarStatusDueDiligence.bind(null, id);
  const addItemAction = adicionarItemDueDiligence.bind(null, id);
  const pendenciaAction = criarPendencia.bind(null, id);
  const analiseAction = registrarAnalise.bind(null, id);
  const observacaoAction = registrarObservacaoDueDiligence.bind(null, id);
  const avancarFechamentoAction = avancarOportunidadeParaFechamento.bind(null, id);
  const podeAvancarFechamento =
    dd.recomendacao === "prosseguir" && etapa === "negociacao" && op?.status === "aberta";
  const aguardandoEtapaNegociacao =
    dd.recomendacao === "prosseguir" &&
    op?.status === "aberta" &&
    etapa !== null &&
    etapa !== "negociacao" &&
    etapa !== "fechamento";
  const oportunidadeHref = `/crm/${dd.oportunidade_id}`;
  const jaEmFechamento = dd.recomendacao === "prosseguir" && etapa === "fechamento";
  const fechamentoHref = `/crm/${dd.oportunidade_id}/fechamento`;
  const curadoriaHref = `/clientes/${dd.cliente_id}/imoveis/${dd.imovel_encontrado_id}`;

  return (
    <div className="max-w-5xl">
      <Link href={`/negociacoes/${dd.negociacao_id}`} className="text-sm text-[#5b6472] hover:underline">
        ← Negociação
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Due diligence final — {titulo}</h1>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${DD_FINAL_STATUS_COLORS[dd.status]}`}>
          {DD_FINAL_STATUS_LABELS[dd.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-[#5b6472]">
        Iniciada em {formatDateTime(dd.iniciada_em)} por {nomeAutor.get(dd.consultor_id) ?? "—"}
        {dd.concluida_em && ` · Concluída em ${formatDateTime(dd.concluida_em)}`}
      </p>

      <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {AVISO_NAO_JURIDICO}
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="mt-6 rounded-lg border border-[#e4e0d9] bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Resumo da operação</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-[#5b6472]">Cliente</dt>
            <dd>
              <Link href={`/clientes/${dd.cliente_id}`} className="font-medium hover:underline">
                {(cliente?.nome as string | undefined) ?? "—"}
              </Link>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[#5b6472]">Imóvel</dt>
            <dd>
              <Link href={curadoriaHref} className="font-medium hover:underline">
                {titulo}
              </Link>
              {imovel?.endereco_texto && (
                <p className="text-xs text-[#5b6472]">{imovel.endereco_texto as string}</p>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Parceiro</dt>
            <dd>
              {parceiro
                ? formatParceiroLinhaCurta(parceiro as { nome: string; imobiliaria_nome: string | null })
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Valor final negociado</dt>
            <dd className="font-semibold tabular-nums">{formatBRL(negociacao?.valor_final ?? null)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Preço anunciado</dt>
            <dd className="tabular-nums">{formatBRL(negociacao?.preco_anunciado ?? null)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Negociação</dt>
            <dd>
              <Link href={`/negociacoes/${dd.negociacao_id}`} className="underline-offset-2 hover:underline">
                Ver negociação
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Etapa da oportunidade</dt>
            <dd>
              {etapa ? (
                <Link href={`/crm/${dd.oportunidade_id}`}>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${ETAPA_COLORS[etapa]}`}>
                    {ETAPA_LABELS[etapa]}
                  </span>
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-[#5b6472]">
          A due diligence não altera os valores da negociação nem a etapa da oportunidade (avanço manual no CRM).
        </p>
        {situacaoDueDiligenceFechamento(dd).aprovada && !podeAvancarFechamento && !jaEmFechamento && (
          <Link
            href={`/crm/${dd.oportunidade_id}/fechamento`}
            className="mt-3 inline-block rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50"
          >
            Ir para o fechamento
          </Link>
        )}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Checklist" valor={`${resumo.checklistFeitos}/${resumo.checklistTotal}`} nota="concluídos" />
        <Stat
          label="Pendências"
          valor={String(resumo.pendenciasAbertas)}
          nota="abertas"
          alerta={resumo.pendenciasAbertas > 0}
        />
        <Stat
          label="Documentos"
          valor={`${resumo.documentosRecebidos}/${resumo.documentosEsperados}`}
          nota="recebidos"
        />
        <div
          className={`rounded-lg border p-4 ${
            podeAvancarFechamento || jaEmFechamento
              ? "border-green-300 bg-green-50"
              : aguardandoEtapaNegociacao
                ? "border-amber-300 bg-amber-50"
                : "border-[#e4e0d9] bg-white"
          }`}
        >
          <p className="text-xs text-[#5b6472]">Resultado</p>
          <p className="mt-1">
            {dd.recomendacao ? (
              <span className={`rounded-full border px-2 py-0.5 text-xs ${RECOMENDACAO_COLORS[dd.recomendacao]}`}>
                {RECOMENDACAO_LABELS[dd.recomendacao]}
              </span>
            ) : (
              <span className="text-lg font-semibold text-[#5b6472]">Pendente</span>
            )}
          </p>
          {podeAvancarFechamento && (
            <BotaoAvancarFechamento action={avancarFechamentoAction} compacto />
          )}
          {jaEmFechamento && (
            <Link
              href={fechamentoHref}
              className="mt-2 block w-full rounded-md bg-green-700 px-2 py-1.5 text-center text-xs font-medium text-white hover:bg-green-800"
            >
              Ir para o Fechamento →
            </Link>
          )}
          {aguardandoEtapaNegociacao && etapa && (
            <p className="mt-2 text-xs text-amber-900">
              Avanço para Fechamento bloqueado: a oportunidade está em{" "}
              <strong>{ETAPA_LABELS[etapa]}</strong> e precisa estar em <strong>Negociação</strong>.{" "}
              <Link href={oportunidadeHref} className="font-medium underline">
                Ajustar etapa →
              </Link>
            </p>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section id="checklist" className="rounded-lg border border-[#e4e0d9] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Checklist e documentos</h2>
            <p className="mt-1 text-xs text-[#5b6472]">
              Documentos permanentes do imóvel (ex.: matrícula, IPTU) podem ser vinculados sem duplicar o arquivo.
              Documentos da operação (ex.: documentos pessoais, certidões) ficam em armazenamento privado.
            </p>

            <div className="mt-4 space-y-5">
              {CATEGORIAS.map((cat) => {
                const doGrupo = itens.filter((i) => i.categoria === cat);
                return (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5b6472]">
                      {CATEGORIA_LABELS[cat]}
                    </h3>
                    {CATEGORIA_DICAS[cat] && (
                      <p className="text-[11px] text-[#5b6472]">{CATEGORIA_DICAS[cat]}</p>
                    )}
                    {doGrupo.length === 0 ? (
                      <p className="mt-1 text-sm text-[#5b6472]">Nenhum item.</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-[#e4e0d9] rounded-md border border-[#e4e0d9]">
                        {doGrupo.map((item) => {
                          const doc = item.imovel_documento_id ? docPorId.get(item.imovel_documento_id) : undefined;
                          const arquivoUrl = item.storage_path ? urlPorPath.get(item.storage_path) : undefined;
                          const docUrl =
                            (doc?.storage_path ? urlDocImovelPorPath.get(doc.storage_path) : undefined) ??
                            doc?.url ??
                            null;
                          const updateAction = atualizarItemDueDiligence.bind(null, item.id, id);
                          return (
                            <li key={item.id} id={`item-${item.id}`} className="p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className={`text-sm font-medium ${item.status === "nao_aplicavel" ? "text-[#5b6472] line-through" : ""}`}>
                                    {item.titulo}
                                  </p>
                                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-[#5b6472]">
                                    {item.recebido_em && <span>Recebido em {formatData(item.recebido_em)}</span>}
                                    {arquivoUrl && (
                                      <a href={arquivoUrl} target="_blank" rel="noopener noreferrer" className="underline">
                                        Ver arquivo da operação{item.nome_arquivo ? ` (${item.nome_arquivo})` : ""}
                                      </a>
                                    )}
                                    {doc && (
                                      <span>
                                        Doc. do imóvel: {doc.titulo || DOCUMENTO_TIPO_LABELS[doc.tipo]}
                                        {docUrl && (
                                          <>
                                            {" "}
                                            <a href={docUrl} target="_blank" rel="noopener noreferrer" className="underline">
                                              abrir
                                            </a>
                                          </>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  {item.observacao && (
                                    <p className="mt-1 whitespace-pre-line text-xs text-[#5b6472]">{item.observacao}</p>
                                  )}
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-xs ${ITEM_STATUS_COLORS[item.status]}`}>
                                  {ITEM_STATUS_LABELS[item.status]}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-start gap-3">
                                <DocumentoOperacaoUploader
                                  clienteId={dd.cliente_id}
                                  dueDiligenceId={dd.id}
                                  itemId={item.id}
                                  temArquivo={Boolean(item.storage_path)}
                                />
                                <details className="text-xs">
                                  <summary className="cursor-pointer rounded-md border border-[#e4e0d9] px-2 py-1 hover:bg-[#faf8f5]">
                                    Atualizar
                                  </summary>
                                  <form action={updateAction} className="mt-2 space-y-2">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <div>
                                        <label className={labelClass}>Status</label>
                                        <select name="status" defaultValue={item.status} className={inputClass}>
                                          {ITEM_STATUS.map((s) => (
                                            <option key={s} value={s}>
                                              {ITEM_STATUS_LABELS[s]}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className={labelClass}>Documento do imóvel</label>
                                        <select
                                          name="imovel_documento_id"
                                          defaultValue={item.imovel_documento_id ?? ""}
                                          className={inputClass}
                                        >
                                          <option value="">— nenhum —</option>
                                          {docsImovel.map((d) => (
                                            <option key={d.id} value={d.id}>
                                              {d.titulo || DOCUMENTO_TIPO_LABELS[d.tipo]}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                    <div>
                                      <label className={labelClass}>Observação</label>
                                      <textarea
                                        name="observacao"
                                        rows={2}
                                        defaultValue={item.observacao ?? ""}
                                        className={inputClass}
                                      />
                                    </div>
                                    <button
                                      type="submit"
                                      className="rounded-md bg-[#d6b072] px-3 py-1.5 text-xs font-medium text-[#0b1f34] hover:brightness-105"
                                    >
                                      Salvar
                                    </button>
                                  </form>
                                </details>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            <form action={addItemAction} className="mt-5 space-y-2 border-t border-[#e4e0d9] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5b6472]">Adicionar documento</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Documento / certidão</label>
                  <input
                    name="titulo"
                    required
                    placeholder="Ex.: Certidão solicitada pelo advogado"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Categoria</label>
                  <select name="categoria" defaultValue="certidoes" className={inputClass}>
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORIA_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Observação</label>
                <input name="observacao" className={inputClass} />
              </div>
              <button
                type="submit"
                className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-xs font-medium hover:bg-[#faf8f5]"
              >
                Adicionar
              </button>
            </form>
          </section>

          <section id="pendencias" className="rounded-lg border border-[#e4e0d9] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Pendências</h2>
            {pendencias.length === 0 ? (
              <p className="mt-2 text-sm text-[#5b6472]">Nenhuma pendência registrada.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[#e4e0d9] rounded-md border border-[#e4e0d9]">
                {pendencias.map((p) => {
                  const atrasada = pendenciaAberta(p) && p.prazo != null && p.prazo < hoje;
                  const updateAction = atualizarPendencia.bind(null, p.id, id);
                  return (
                    <li key={p.id} id={`pendencia-${p.id}`} className="p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-medium ${pendenciaAberta(p) ? "" : "text-[#5b6472]"}`}>
                            {p.descricao}
                          </p>
                          <p className="mt-0.5 text-xs text-[#5b6472]">
                            {CATEGORIA_LABELS[p.categoria]}
                            {p.responsavel ? ` · Responsável: ${p.responsavel}` : ""}
                            {p.prazo && (
                              <span className={atrasada ? "font-medium text-red-600" : ""}>
                                {" "}
                                · Prazo {formatData(p.prazo)}
                                {atrasada ? " (vencido)" : ""}
                              </span>
                            )}
                            {p.concluida_em ? ` · Concluída em ${formatDateTime(p.concluida_em)}` : ""}
                          </p>
                          {p.observacao && (
                            <p className="mt-1 whitespace-pre-line text-xs text-[#5b6472]">{p.observacao}</p>
                          )}
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${PENDENCIA_STATUS_COLORS[p.status]}`}>
                          {PENDENCIA_STATUS_LABELS[p.status]}
                        </span>
                      </div>
                      <details className="mt-2 text-xs">
                        <summary className="inline-block cursor-pointer rounded-md border border-[#e4e0d9] px-2 py-1 hover:bg-[#faf8f5]">
                          Atualizar
                        </summary>
                        <form action={updateAction} className="mt-2 space-y-2">
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div>
                              <label className={labelClass}>Status</label>
                              <select name="status" defaultValue={p.status} className={inputClass}>
                                {PENDENCIA_STATUS.map((s) => (
                                  <option key={s} value={s}>
                                    {PENDENCIA_STATUS_LABELS[s]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>Responsável</label>
                              <input
                                name="responsavel"
                                list="responsaveis-dd"
                                defaultValue={p.responsavel ?? ""}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Prazo</label>
                              <input name="prazo" type="date" defaultValue={p.prazo ?? ""} className={inputClass} />
                            </div>
                          </div>
                          <div>
                            <label className={labelClass}>Observação</label>
                            <textarea name="observacao" rows={2} defaultValue={p.observacao ?? ""} className={inputClass} />
                          </div>
                          <button
                            type="submit"
                            className="rounded-md bg-[#d6b072] px-3 py-1.5 text-xs font-medium text-[#0b1f34] hover:brightness-105"
                          >
                            Salvar
                          </button>
                        </form>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}

            <datalist id="responsaveis-dd">
              {RESPONSAVEIS_SUGERIDOS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>

            <form action={pendenciaAction} className="mt-5 space-y-2 border-t border-[#e4e0d9] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5b6472]">Nova pendência</p>
              <div>
                <label className={labelClass}>Descrição</label>
                <input
                  name="descricao"
                  required
                  placeholder="Ex.: Solicitar certidão atualizada do proprietário"
                  className={inputClass}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <div>
                  <label className={labelClass}>Categoria</label>
                  <select name="categoria" defaultValue="outros" className={inputClass}>
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORIA_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Responsável</label>
                  <input name="responsavel" list="responsaveis-dd" placeholder="Ex.: Parceiro" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select name="status" defaultValue="aberta" className={inputClass}>
                    {PENDENCIA_STATUS.filter((s) => s === "aberta" || s === "em_andamento").map((s) => (
                      <option key={s} value={s}>
                        {PENDENCIA_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Prazo (opcional)</label>
                  <input name="prazo" type="date" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Observação</label>
                <input name="observacao" className={inputClass} />
              </div>
              <button
                type="submit"
                className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-xs font-medium hover:bg-[#faf8f5]"
              >
                Criar pendência
              </button>
            </form>
          </section>

          <section id="analise" className="rounded-lg border border-[#e4e0d9] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Análise</h2>
            <p className="mt-1 text-xs text-amber-800">
              Registro operacional da ETHEX — não é parecer jurídico profissional.
            </p>
            {dd.analise_registrada_em && (
              <p className="mt-1 text-xs text-[#5b6472]">
                Última atualização: {formatDateTime(dd.analise_registrada_em)}
              </p>
            )}
            <form action={analiseAction} className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>Resumo da análise</label>
                <textarea name="parecer_resumo" rows={3} defaultValue={dd.parecer_resumo ?? ""} className={inputClass} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Pontos de atenção</label>
                  <textarea name="pontos_atencao" rows={3} defaultValue={dd.pontos_atencao ?? ""} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Ressalvas</label>
                  <textarea name="ressalvas" rows={3} defaultValue={dd.ressalvas ?? ""} className={inputClass} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Recomendação</label>
                  <select name="recomendacao" defaultValue={dd.recomendacao ?? ""} className={inputClass}>
                    <option value="">— ainda não definida —</option>
                    {RECOMENDACOES.map((r) => (
                      <option key={r} value={r}>
                        {RECOMENDACAO_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Observações</label>
                <textarea name="observacoes" rows={2} defaultValue={dd.observacoes ?? ""} className={inputClass} />
              </div>
              <button
                type="submit"
                className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
              >
                Salvar análise
              </button>
            </form>
          </section>

          {podeAvancarFechamento && (
            <section className="rounded-lg border border-green-300 bg-green-50 p-5">
              <p className="text-sm font-semibold text-green-900">
                Due diligence concluída — resultado: Prosseguir
              </p>
              <p className="mt-1 text-xs text-green-800">
                Próximo passo: avançar a oportunidade para a etapa Fechamento.
              </p>
              <BotaoAvancarFechamento action={avancarFechamentoAction} />
            </section>
          )}

          {aguardandoEtapaNegociacao && etapa && (
            <section className="rounded-lg border border-amber-300 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-900">
                Due diligence concluída — resultado: Prosseguir
              </p>
              <p className="mt-1 text-sm text-amber-900">
                O botão <strong>“Avançar oportunidade para Fechamento”</strong> ainda não está disponível porque a
                oportunidade está na etapa <strong>{ETAPA_LABELS[etapa]}</strong>. O avanço para Fechamento só é
                liberado a partir da etapa <strong>Negociação</strong>.
              </p>
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-amber-900">
                <li>Abra a oportunidade e avance a etapa para Negociação.</li>
                <li>Volte a esta due diligence e clique em “Avançar oportunidade para Fechamento”.</li>
              </ol>
              <Link
                href={oportunidadeHref}
                className="mt-3 inline-block rounded-md border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
              >
                Abrir oportunidade para ajustar a etapa →
              </Link>
            </section>
          )}

          {jaEmFechamento && (
            <section className="rounded-lg border border-green-300 bg-green-50 p-5">
              <p className="text-sm font-semibold text-green-900">
                Oportunidade já está na etapa Fechamento
              </p>
              <p className="mt-1 text-xs text-green-800">
                A due diligence foi concluída com resultado Prosseguir. Registre o fechamento da operação.
              </p>
              <Link
                href={fechamentoHref}
                className="mt-3 inline-block rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Ir para o Fechamento →
              </Link>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-[#e4e0d9] bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Status</h2>
            <form action={statusAction} className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>Status da due diligence</label>
                <select name="status" defaultValue={dd.status} className={inputClass}>
                  {DD_FINAL_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {DD_FINAL_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Observação (vai para o histórico)</label>
                <textarea name="observacao" rows={2} className={inputClass} />
              </div>
              <button
                type="submit"
                className="rounded-md bg-[#d6b072] px-3 py-1.5 text-xs font-medium text-[#0b1f34] hover:brightness-105"
              >
                Atualizar status
              </button>
            </form>
          </section>

          <section id="historico" className="rounded-lg border border-[#e4e0d9] bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Histórico</h2>
            <p className="mt-1 text-xs text-[#5b6472]">Registros não podem ser editados nem apagados.</p>
            <form action={observacaoAction} className="mt-3 flex gap-2">
              <input name="texto" placeholder="Adicionar observação…" className={`${inputClass} mt-0`} />
              <button
                type="submit"
                className="shrink-0 rounded-md border border-[#e4e0d9] px-3 py-1.5 text-xs hover:bg-[#faf8f5]"
              >
                Registrar
              </button>
            </form>
            <ol className="mt-4 space-y-3 border-l border-[#e4e0d9] pl-4">
              {(eventos ?? []).map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#5b6472]" />
                  <p className="text-xs text-[#5b6472]">
                    {formatDateTime(e.criado_em)} · {e.autor_id ? (nomeAutor.get(e.autor_id) ?? "—") : "—"}
                  </p>
                  <p className="whitespace-pre-line">{e.detalhe}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

function BotaoAvancarFechamento({
  action,
  compacto,
}: {
  action: () => Promise<void>;
  compacto?: boolean;
}) {
  return (
    <form action={action} className={compacto ? "mt-2" : "mt-3"}>
      <button
        type="submit"
        className={`rounded-md bg-green-700 font-medium text-white hover:bg-green-800 ${
          compacto ? "w-full px-2 py-1.5 text-xs" : "px-4 py-2 text-sm"
        }`}
      >
        Avançar oportunidade para Fechamento →
      </button>
    </form>
  );
}

function Stat({ label, valor, nota, alerta }: { label: string; valor: string; nota: string; alerta?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${alerta ? "border-amber-300 bg-amber-50" : "border-[#e4e0d9] bg-white"}`}>
      <p className="text-xs text-[#5b6472]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{valor}</p>
      <p className="text-[11px] text-[#5b6472]">{nota}</p>
    </div>
  );
}
