import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CurrencyInput } from "@/components/CurrencyInput";
import {
  EVENTO_EXIGE_VALOR,
  EVENTO_LABELS,
  NEGOCIACAO_COMPRA_STATUS_COLORS,
  NEGOCIACAO_COMPRA_STATUS_LABELS,
  eventosPermitidos,
  formatBRL,
  negociacaoAtiva,
  valorAtual,
} from "@/lib/negociacao-compra";
import {
  NEGOCIACAO_STATUS_COLORS,
  NEGOCIACAO_STATUS_LABELS,
  PARCEIRO_TIPO_LABELS,
} from "@/lib/parceiros";
import { ETAPA_COLORS, ETAPA_LABELS, PIPELINE_ETAPAS, formatDateTime } from "@/lib/crm";
import { DueDiligenceFinalResumo } from "@/components/DueDiligenceFinalResumo";
import { dueDiligenceDaNegociacao } from "@/lib/due-diligence-final-dados";
import { iniciarDueDiligenceFinal } from "@/app/(app)/due-diligence/actions";
import {
  atualizarPlanoNegociacao,
  avancarOportunidadeParaNegociacao,
  registrarMovimentacao,
} from "../actions";
import { IMOVEL_TITULO_COLUNAS, tituloImovel, type ImovelParaTitulo } from "@/lib/imovel-titulo";
import type {
  NegociacaoCompraEventoRow,
  NegociacaoCompraRow,
  NegociacaoParceriaRow,
  OportunidadeEtapa,
  OportunidadeStatus,
  ParceiroRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";

export default async function NegociacaoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: n } = await supabase
    .from("negociacao_compra")
    .select("*")
    .eq("id", id)
    .returns<NegociacaoCompraRow[]>()
    .maybeSingle();
  if (!n) notFound();

  const { data: cliente } = await supabase
    .from("cliente")
    .select("nome")
    .eq("id", n.cliente_id)
    .maybeSingle();
  const { data: imovel } = await supabase
    .from("imovel")
    .select(`fonte, preco, endereco_texto, ${IMOVEL_TITULO_COLUNAS}`)
    .eq("id", n.imovel_id)
    .returns<(ImovelParaTitulo & { fonte: string; preco: number | null; endereco_texto: string | null })[]>()
    .maybeSingle();
  const { data: op } = await supabase
    .from("oportunidade")
    .select("etapa, status")
    .eq("id", n.oportunidade_id)
    .maybeSingle();
  const { data: parceiro } = n.parceiro_id
    ? await supabase
        .from("parceiro")
        .select("*")
        .eq("id", n.parceiro_id)
        .returns<ParceiroRow[]>()
        .maybeSingle()
    : { data: null };
  const { data: negParceria } = await supabase
    .from("negociacao_parceria")
    .select("*")
    .eq("imovel_encontrado_id", n.imovel_encontrado_id)
    .returns<NegociacaoParceriaRow[]>()
    .maybeSingle();
  const { data: eventos } = await supabase
    .from("negociacao_compra_evento")
    .select("*")
    .eq("negociacao_id", id)
    .order("criado_em", { ascending: false })
    .returns<NegociacaoCompraEventoRow[]>();

  const dueDiligence = await dueDiligenceDaNegociacao(supabase, id);

  const autorIds = [
    ...new Set([n.consultor_id, ...(eventos ?? []).map((e) => e.autor_id).filter(Boolean)]),
  ] as string[];
  const { data: autores } = await supabase.from("usuario").select("id, nome").in("id", autorIds);
  const nomeAutor = new Map((autores ?? []).map((a) => [a.id as string, a.nome as string]));

  const titulo = tituloImovel(imovel);
  const precoCatalogo = (imovel?.preco as number | null | undefined) ?? null;
  const etapa = (op?.etapa as OportunidadeEtapa | undefined) ?? null;
  const opStatus = (op?.status as OportunidadeStatus | undefined) ?? null;
  const podeAvancar =
    opStatus === "aberta" &&
    etapa != null &&
    PIPELINE_ETAPAS.indexOf(etapa) < PIPELINE_ETAPAS.indexOf("negociacao");
  const permitidos = eventosPermitidos(n.status);
  const ultimo = eventos?.[0];

  const movAction = registrarMovimentacao.bind(null, id);
  const planoAction = atualizarPlanoNegociacao.bind(null, id);
  const avancarAction = avancarOportunidadeParaNegociacao.bind(null, n.oportunidade_id);
  const curadoriaHref = `/clientes/${n.cliente_id}/imoveis/${n.imovel_encontrado_id}`;

  return (
    <div className="max-w-4xl">
      <Link href={`/crm/${n.oportunidade_id}`} className="text-sm text-[#5b6472] hover:underline">
        ← Oportunidade
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Negociação — {titulo}</h1>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${NEGOCIACAO_COMPRA_STATUS_COLORS[n.status]}`}
        >
          {NEGOCIACAO_COMPRA_STATUS_LABELS[n.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-[#5b6472]">
        Cliente:{" "}
        <Link href={`/clientes/${n.cliente_id}`} className="font-medium text-[#0b1f34] hover:underline">
          {cliente?.nome ?? "—"}
        </Link>{" "}
        · Consultor: {nomeAutor.get(n.consultor_id) ?? "—"} · Iniciada em {formatDateTime(n.iniciada_em)}
        {n.encerrada_em && ` · Encerrada em ${formatDateTime(n.encerrada_em)}`}
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        <Link href={curadoriaHref} className="underline-offset-2 hover:underline">
          Abrir imóvel (curadoria)
        </Link>
        <Link href={`/crm/${n.oportunidade_id}`} className="underline-offset-2 hover:underline">
          Abrir oportunidade
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Valor label="Preço anunciado" valor={n.preco_anunciado} nota="no início da negociação" />
        <Valor label="Última proposta" valor={n.valor_proposta} />
        <Valor label="Última contraproposta" valor={n.valor_contraproposta} />
        <Valor label="Valor final negociado" valor={n.valor_final} destaque={n.status === "aceita"} />
      </section>
      {precoCatalogo != null && precoCatalogo !== n.preco_anunciado && (
        <p className="mt-2 text-xs text-[#5b6472]">
          O preço no catálogo hoje é {formatBRL(precoCatalogo)} (o anúncio mudou depois do início).
        </p>
      )}

      {etapa && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e4e0d9] bg-white p-4 text-sm">
          <p>
            Etapa da oportunidade:{" "}
            <span className={`rounded-full border px-2 py-0.5 text-xs ${ETAPA_COLORS[etapa]}`}>
              {ETAPA_LABELS[etapa]}
            </span>
          </p>
          {podeAvancar && (
            <form action={avancarAction}>
              <input type="hidden" name="voltar" value={`/negociacoes/${id}`} />
              <button
                type="submit"
                className="rounded-md border border-orange-300 px-3 py-1.5 text-sm font-medium text-orange-800 hover:bg-orange-50"
              >
                Avançar oportunidade para Negociação
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mt-4">
        <DueDiligenceFinalResumo
          dados={dueDiligence}
          negociacaoStatus={n.status}
          iniciarAction={iniciarDueDiligenceFinal.bind(null, id)}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-lg border border-[#e4e0d9] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Registrar movimentação</h2>
            {negociacaoAtiva(n.status) ? null : (
              <p className="mt-1 text-xs text-[#5b6472]">
                Negociação encerrada — só é possível adicionar observações.
              </p>
            )}
            <form action={movAction} className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="tipo" className={labelClass}>Movimentação</label>
                  <select id="tipo" name="tipo" required className={inputClass} defaultValue={permitidos[0]}>
                    {permitidos.map((t) => (
                      <option key={t} value={t}>
                        {t === "proposta_enviada" && n.valor_proposta != null
                          ? "Nova proposta enviada"
                          : EVENTO_LABELS[t]}
                        {EVENTO_EXIGE_VALOR.includes(t) ? " (informe o valor)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Valor</label>
                  <CurrencyInput name="valor" className={inputClass} />
                  <p className="mt-1 text-[11px] text-[#5b6472]">
                    Obrigatório em proposta/contraproposta. Em “aceita”, vazio usa o valor em discussão.
                  </p>
                </div>
              </div>
              <div>
                <label htmlFor="observacao" className={labelClass}>Observação</label>
                <textarea id="observacao" name="observacao" rows={2} className={inputClass} />
              </div>
              <button
                type="submit"
                className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
              >
                Registrar
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-[#e4e0d9] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Histórico da negociação</h2>
            <p className="mt-1 text-xs text-[#5b6472]">Registros não podem ser editados nem apagados.</p>
            <ol className="mt-4 space-y-4 border-l border-[#e4e0d9] pl-4">
              {(eventos ?? []).map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#5b6472]" />
                  <p className="text-xs text-[#5b6472]">
                    {formatDateTime(e.criado_em)} · {e.autor_id ? (nomeAutor.get(e.autor_id) ?? "—") : "—"}
                  </p>
                  <p className="text-sm font-medium">
                    {EVENTO_LABELS[e.tipo]}
                    {e.valor != null && <span className="ml-2 tabular-nums">{formatBRL(e.valor)}</span>}
                  </p>
                  {e.observacao && (
                    <p className="whitespace-pre-line text-sm text-[#5b6472]">{e.observacao}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-[#e4e0d9] bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Situação</h2>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-xs text-[#5b6472]">Valor atual</dt>
                <dd className="text-lg font-semibold tabular-nums">{formatBRL(valorAtual(n))}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#5b6472]">Última movimentação</dt>
                <dd>
                  {ultimo
                    ? `${EVENTO_LABELS[ultimo.tipo]} · ${formatDateTime(ultimo.criado_em)}`
                    : "—"}
                </dd>
              </div>
            </dl>
            <form action={planoAction} className="mt-4 space-y-3 border-t border-[#e4e0d9] pt-4">
              <div>
                <label htmlFor="proxima_acao" className={labelClass}>Próxima ação</label>
                <input
                  id="proxima_acao"
                  name="proxima_acao"
                  defaultValue={n.proxima_acao ?? ""}
                  placeholder="Ex.: aguardar resposta do proprietário"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="proxima_acao_em" className={labelClass}>Até</label>
                <input
                  id="proxima_acao_em"
                  name="proxima_acao_em"
                  type="date"
                  defaultValue={n.proxima_acao_em ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="observacoes" className={labelClass}>Observações gerais</label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  rows={3}
                  defaultValue={n.observacoes ?? ""}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-xs hover:bg-[#faf8f5]"
              >
                Salvar
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-[#e4e0d9] bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Parceiro</h2>
            {!parceiro ? (
              <p className="mt-2 text-[#5b6472]">
                Nenhum parceiro vinculado a este imóvel.{" "}
                <Link href={curadoriaHref} className="underline">
                  Vincular na curadoria
                </Link>
              </p>
            ) : (
              <div className="mt-2 space-y-3">
                <div>
                  <Link href={`/parceiros/${parceiro.id}`} className="font-medium hover:underline">
                    {parceiro.nome}
                  </Link>
                  <p className="text-xs text-[#5b6472]">
                    {PARCEIRO_TIPO_LABELS[parceiro.tipo]}
                    {parceiro.imobiliaria_nome ? ` · ${parceiro.imobiliaria_nome}` : ""}
                  </p>
                  {(parceiro.whatsapp || parceiro.contato_telefone || parceiro.contato_email) && (
                    <p className="text-xs text-[#5b6472]">
                      {[parceiro.whatsapp ?? parceiro.contato_telefone, parceiro.contato_email]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5b6472]">
                    Política conhecida
                  </p>
                  <p>{parceiro.modelo_divisao ?? parceiro.politica_comissao ?? "—"}</p>
                  {parceiro.condicoes_parceria && (
                    <p className="text-xs text-[#5b6472]">{parceiro.condicoes_parceria}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5b6472]">
                    Parceria neste imóvel
                  </p>
                  {negParceria ? (
                    <>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${NEGOCIACAO_STATUS_COLORS[negParceria.status]}`}
                      >
                        {NEGOCIACAO_STATUS_LABELS[negParceria.status]}
                      </span>
                      <p className="mt-1">
                        Comissão: {negParceria.comissao_negociada ?? negParceria.comissao_solicitada ?? "—"}
                        {negParceria.modelo_divisao ? ` · ${negParceria.modelo_divisao}` : ""}
                      </p>
                    </>
                  ) : (
                    <p className="text-[#5b6472]">Não registrada.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Valor({
  label,
  valor,
  nota,
  destaque,
}: {
  label: string;
  valor: number | null;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${destaque ? "border-green-300 bg-green-50" : "border-[#e4e0d9] bg-white"}`}
    >
      <p className="text-xs text-[#5b6472]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{formatBRL(valor)}</p>
      {nota && <p className="text-[11px] text-[#5b6472]">{nota}</p>}
    </div>
  );
}
