import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComissaoFechamentoCampos } from "@/components/ComissaoFechamentoCampos";
import {
  ETAPA_COLORS,
  ETAPA_LABELS,
  OPORTUNIDADE_STATUS_COLORS,
  OPORTUNIDADE_STATUS_LABELS,
  formatDateTime,
} from "@/lib/crm";
import { formatBRL } from "@/lib/negociacao-compra";
import { formatParceiroLinhaCurta } from "@/lib/parceiros";
import { situacaoDueDiligenceFechamento } from "@/lib/due-diligence-final";
import {
  MOTIVOS_PERDA,
  MOTIVO_PERDA_LABELS,
  RESULTADO_COLORS,
  RESULTADO_LABELS,
  comissaoExibida,
  formatDataCurta,
} from "@/lib/fechamento";
import { carregarContextoFechamento } from "@/lib/fechamento-dados";
import { reabrirOportunidadeSemFechamento } from "@/app/(app)/crm/actions";
import {
  atualizarComissao,
  criarAtividadeFechamento,
  encaminharParaFechamento,
  registrarGanho,
  registrarPerda,
} from "@/app/(app)/crm/fechamento-actions";
import {
  IMOVEL_TITULO_COLUNAS,
  tituloImovel as gerarTituloImovel,
  type ImovelParaTitulo,
} from "@/lib/imovel-titulo";
import type {
  AtividadeRow,
  FechamentoRow,
  OportunidadeHistoricoRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";

export default async function FechamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const ctx = await carregarContextoFechamento(supabase, id);
  if (!ctx) notFound();
  const { oportunidade: op, fechamento: f, negociacao: n, dueDiligence: dd, escolhida } = ctx;

  const curadoriaId = f?.imovel_encontrado_id ?? n?.imovel_encontrado_id ?? escolhida?.imovel_encontrado_id ?? null;
  const [{ data: cliente }, { data: ie }, { data: historico }, { data: atividades }] = await Promise.all([
    supabase.from("cliente").select("nome").eq("id", op.cliente_id).maybeSingle(),
    curadoriaId
      ? supabase
          .from("imovel_encontrado")
          .select(`parceiro_id, imovel(preco, ${IMOVEL_TITULO_COLUNAS})`)
          .eq("id", curadoriaId)
          .returns<
            {
              parceiro_id: string | null;
              imovel: ImovelParaTitulo & { preco: number | null };
            }[]
          >()
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("oportunidade_historico")
      .select("*")
      .eq("oportunidade_id", id)
      .order("criado_em", { ascending: false })
      .limit(60)
      .returns<OportunidadeHistoricoRow[]>(),
    supabase
      .from("atividade")
      .select("*")
      .eq("oportunidade_id", id)
      .eq("status", "pendente")
      .order("data_hora", { ascending: true })
      .returns<AtividadeRow[]>(),
  ]);

  const { data: parceiro } = ie?.parceiro_id
    ? await supabase.from("parceiro").select("nome, imobiliaria_nome").eq("id", ie.parceiro_id).maybeSingle()
    : { data: null };

  const autorIds = [
    ...new Set(
      [op.consultor_id, f?.consultor_id, ...(historico ?? []).map((h) => h.autor_id)].filter(
        (v): v is string => Boolean(v)
      )
    ),
  ];
  const { data: autores } = await supabase.from("usuario").select("id, nome").in("id", autorIds);
  const nomeAutor = new Map((autores ?? []).map((a) => [a.id as string, a.nome as string]));

  const tituloImovel = ie ? gerarTituloImovel(ie.imovel) : null;
  const resultadoChave = f?.resultado ?? "aberto";
  const resultadoLabel = f ? RESULTADO_LABELS[f.resultado] : "Em aberto";
  const legadoSemFechamento = !f && op.status !== "aberta";
  const hoje = new Date().toISOString().slice(0, 10);
  const valorSugerido = n?.status === "aceita" ? n.valor_final : null;

  const imovelEscolhidoHref = escolhida
    ? `/clientes/${op.cliente_id}/imoveis/${escolhida.imovel_encontrado_id}`
    : null;
  const negociacaoDoEscolhido =
    n && escolhida && n.imovel_encontrado_id === escolhida.imovel_encontrado_id ? n : null;

  const linkImovel: LinkCondicao = imovelEscolhidoHref
    ? { href: imovelEscolhidoHref, acao: "Ver imóvel" }
    : { href: `/crm/${id}#imoveis-da-busca`, acao: "Escolher imóvel na oportunidade →" };

  const linkNegociacao: LinkCondicao = ctx.condicoes.negociacaoAceita && n
    ? { href: `/negociacoes/${n.id}`, acao: "Ver negociação" }
    : negociacaoDoEscolhido
      ? { href: `/negociacoes/${negociacaoDoEscolhido.id}`, acao: "Abrir negociação →" }
      : imovelEscolhidoHref
        ? { href: `${imovelEscolhidoHref}#decisao-negociacao`, acao: "Iniciar negociação do imóvel escolhido →" }
        : { dica: "Escolha o imóvel primeiro" };

  const linkDueDiligence: LinkCondicao = dd
    ? { href: `/due-diligence/${dd.id}`, acao: ctx.condicoes.dueDiligenceAprovada ? "Ver due diligence" : "Abrir due diligence →" }
    : ctx.condicoes.negociacaoAceita && n
      ? { href: `/negociacoes/${n.id}`, acao: "Iniciar due diligence na negociação →" }
      : { dica: "Disponível após a negociação aceita" };

  const ganhoAction = registrarGanho.bind(null, id);
  const perdaAction = registrarPerda.bind(null, id);
  const comissaoAction = atualizarComissao.bind(null, id);
  const encaminharAction = encaminharParaFechamento.bind(null, id);
  const atividadeAction = criarAtividadeFechamento.bind(null, id);
  const reabrirAction = reabrirOportunidadeSemFechamento.bind(null, id);

  return (
    <div className="max-w-5xl">
      <Link href={`/crm/${id}`} className="text-sm text-[#5b6472] hover:underline">
        ← Oportunidade
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Fechamento — {op.titulo}</h1>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${ETAPA_COLORS[op.etapa]}`}>
            {ETAPA_LABELS[op.etapa]}
          </span>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${RESULTADO_COLORS[resultadoChave]}`}>
            {resultadoLabel}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="mt-6 rounded-lg border border-[#e4e0d9] bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Resumo da operação</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
          <Item label="Cliente">
            <Link href={`/clientes/${op.cliente_id}?oportunidade=${op.id}`} className="font-medium hover:underline">
              {(cliente?.nome as string | undefined) ?? "—"}
            </Link>
          </Item>
          <Item label="Imóvel" span>
            {tituloImovel && curadoriaId ? (
              <Link href={`/clientes/${op.cliente_id}/imoveis/${curadoriaId}`} className="font-medium hover:underline">
                {tituloImovel}
              </Link>
            ) : (
              <span className="text-[#5b6472]">Nenhum imóvel escolhido</span>
            )}
          </Item>
          <Item label="Consultor">{nomeAutor.get(op.consultor_id) ?? "—"}</Item>
          <Item label="Parceiro">
            {parceiro ? formatParceiroLinhaCurta(parceiro as { nome: string; imobiliaria_nome: string | null }) : "—"}
          </Item>
          <Item label="Valor anunciado">
            <span className="tabular-nums">{formatBRL(n?.preco_anunciado ?? ie?.imovel.preco ?? null)}</span>
          </Item>
          <Item label="Valor negociado">
            {n ? (
              <Link href={`/negociacoes/${n.id}`} className="font-medium tabular-nums hover:underline">
                {formatBRL(n.valor_final)}
              </Link>
            ) : (
              "—"
            )}
          </Item>
          <Item label="Due diligence final">
            {dd ? (
              <Link href={`/due-diligence/${dd.id}`}>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${situacaoDueDiligenceFechamento(dd).color}`}>
                  {situacaoDueDiligenceFechamento(dd).label}
                </span>
              </Link>
            ) : (
              <span className="text-[#5b6472]">Não iniciada</span>
            )}
          </Item>
        </dl>
      </section>

      {legadoSemFechamento && (
        <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            Esta oportunidade está marcada como{" "}
            <span className={`rounded-full border px-2 py-0.5 text-xs ${OPORTUNIDADE_STATUS_COLORS[op.status]}`}>
              {OPORTUNIDADE_STATUS_LABELS[op.status]}
            </span>{" "}
            sem fechamento registrado (marcação anterior a este módulo). Reabra para registrar o fechamento corretamente.
          </p>
          <form action={reabrirAction} className="mt-3">
            <button
              type="submit"
              className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-medium hover:bg-amber-100"
            >
              Reabrir oportunidade
            </button>
          </form>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {f ? (
            <ResultadoRegistrado f={f} valorNegociado={n?.valor_final ?? null} nomeAutor={nomeAutor} comissaoAction={comissaoAction} />
          ) : op.status === "aberta" ? (
            <>
              <section className="rounded-lg border border-[#e4e0d9] bg-white p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide">Condições para ganho</h2>
                <ul className="mt-3 space-y-1.5 text-sm">
                  <Condicao ok={ctx.condicoes.imovelEscolhido} texto="Imóvel escolhido pelo cliente" {...linkImovel} />
                  <Condicao
                    ok={ctx.condicoes.negociacaoAceita}
                    texto="Negociação de compra aceita (imóvel escolhido)"
                    {...linkNegociacao}
                  />
                  <Condicao
                    ok={ctx.condicoes.dueDiligenceAprovada}
                    texto="Due diligence final aprovada ou aprovada com ressalvas"
                    {...linkDueDiligence}
                  />
                </ul>
                {ctx.podeGanhar && op.etapa !== "fechamento" && (
                  <form action={encaminharAction} className="mt-4">
                    <button
                      type="submit"
                      className="rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50"
                    >
                      Encaminhar para etapa Fechamento
                    </button>
                  </form>
                )}
              </section>

              <section className="rounded-lg border border-green-200 bg-white p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-green-800">Ganho</h2>
                {!ctx.podeGanhar ? (
                  <p className="mt-2 text-sm text-[#5b6472]">
                    Disponível quando todas as condições acima estiverem cumpridas. Falta: {ctx.faltando.join("; ")}.
                  </p>
                ) : (
                  <form action={ganhoAction} className="mt-3 space-y-3">
                    <ComissaoFechamentoCampos
                      editarValorFechado
                      valorFechadoInicial={valorSugerido ?? null}
                      valorNegociado={valorSugerido ?? null}
                      campoData={
                        <div>
                          <label className={labelClass}>Data do fechamento</label>
                          <input name="data_fechamento" type="date" required defaultValue={hoje} className={inputClass} />
                        </div>
                      }
                    />
                    <div>
                      <label className={labelClass}>Observações</label>
                      <textarea name="observacoes" rows={2} className={inputClass} />
                    </div>
                    <button
                      type="submit"
                      className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                    >
                      Registrar operação GANHA
                    </button>
                  </form>
                )}
              </section>

              <section className="rounded-lg border border-[#e4e0d9] bg-white p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0b1f34]">Perdido</h2>
                <form action={perdaAction} className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Motivo da perda</label>
                      <select name="motivo_perda" required defaultValue="" className={inputClass}>
                        <option value="" disabled>
                          Selecione…
                        </option>
                        {MOTIVOS_PERDA.map((m) => (
                          <option key={m} value={m}>
                            {MOTIVO_PERDA_LABELS[m]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Data</label>
                      <input name="data_fechamento" type="date" required defaultValue={hoje} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Observações (obrigatório se motivo “Outro”)</label>
                    <textarea name="observacoes" rows={2} className={inputClass} />
                  </div>
                  <p className="text-[11px] text-[#5b6472]">
                    Nada é apagado: negociação, due diligence e histórico permanecem registrados.
                  </p>
                  <button
                    type="submit"
                    className="rounded-md border border-[#e4e0d9] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:bg-[#faf8f5]"
                  >
                    Registrar operação PERDIDA
                  </button>
                </form>
              </section>
            </>
          ) : null}
        </div>

        <aside className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-[#e4e0d9] bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Próximas atividades</h2>
            {(atividades ?? []).length === 0 ? (
              <p className="mt-2 text-[#5b6472]">Nenhuma atividade pendente.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {(atividades ?? []).map((a) => (
                  <li key={a.id}>
                    <span className="font-medium">{a.titulo}</span>
                    <span className="block text-xs text-[#5b6472]">{formatDateTime(a.data_hora)}</span>
                  </li>
                ))}
              </ul>
            )}
            <form action={atividadeAction} className="mt-4 space-y-2 border-t border-[#e4e0d9] pt-4">
              <div>
                <label className={labelClass}>Nova atividade</label>
                <input name="titulo" required placeholder="Ex.: Confirmar data da assinatura" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Quando</label>
                <input name="data_hora" type="datetime-local" className={inputClass} />
              </div>
              <button
                type="submit"
                className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-xs hover:bg-[#faf8f5]"
              >
                Adicionar
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-[#e4e0d9] bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Histórico da operação</h2>
            <ol className="mt-3 space-y-3 border-l border-[#e4e0d9] pl-4">
              {(historico ?? []).map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#5b6472]" />
                  <p className="text-xs text-[#5b6472]">
                    {formatDateTime(h.criado_em)} · {h.autor_id ? (nomeAutor.get(h.autor_id) ?? "—") : "—"}
                  </p>
                  <p>
                    {h.detalhe ??
                      (h.tipo === "etapa" && h.etapa_nova
                        ? `Etapa → ${ETAPA_LABELS[h.etapa_nova]}`
                        : h.tipo === "status" && h.status_novo
                          ? `Status → ${OPORTUNIDADE_STATUS_LABELS[h.status_novo]}`
                          : h.tipo)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Item({ label, span, children }: { label: string; span?: boolean; children: React.ReactNode }) {
  return (
    <div className={span ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-[#5b6472]">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

interface LinkCondicao {
  href?: string;
  acao?: string;
  dica?: string;
}

function Condicao({ ok, texto, href, acao, dica }: { ok: boolean; texto: string } & LinkCondicao) {
  return (
    <li className={`flex flex-wrap items-baseline gap-x-3 ${ok ? "text-green-800" : "text-[#5b6472]"}`}>
      <span>
        <span className="mr-2 inline-block w-4 text-center">{ok ? "✓" : "✕"}</span>
        {texto}
      </span>
      {href && acao ? (
        <Link
          href={href}
          className={
            ok
              ? "text-xs text-green-700 hover:underline"
              : "text-xs font-medium text-amber-700 hover:underline"
          }
        >
          {acao}
        </Link>
      ) : dica ? (
        <span className="text-xs text-[#5b6472]">{dica}</span>
      ) : null}
    </li>
  );
}

function ResultadoRegistrado({
  f,
  valorNegociado,
  nomeAutor,
  comissaoAction,
}: {
  f: FechamentoRow;
  valorNegociado: number | null;
  nomeAutor: Map<string, string>;
  comissaoAction: (formData: FormData) => Promise<void>;
}) {
  const comissao = comissaoExibida(f);
  return (
    <section
      className={`rounded-lg border p-5 ${f.resultado === "ganho" ? "border-green-300 bg-green-50" : "border-[#e4e0d9] bg-[#faf8f5]"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Resultado</h2>
        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${RESULTADO_COLORS[f.resultado]}`}>
          {RESULTADO_LABELS[f.resultado].toUpperCase()}
        </span>
      </div>
      <p className="mt-1 text-xs text-[#5b6472]">
        Registrado em {formatDateTime(f.criado_em)} por {nomeAutor.get(f.consultor_id) ?? "—"}. Registro final — resultado,
        data, valor e motivo não podem ser alterados.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <Item label="Data">{formatDataCurta(f.data_fechamento)}</Item>
        {f.resultado === "ganho" ? (
          <>
            <Item label="Valor efetivamente fechado">
              <span className="text-lg font-semibold tabular-nums">{formatBRL(f.valor_fechado)}</span>
              {valorNegociado != null && valorNegociado !== f.valor_fechado && (
                <span className="block text-xs text-[#5b6472]">Negociado: {formatBRL(valorNegociado)}</span>
              )}
            </Item>
            <Item label="Comissão ETHEX">
              <span className="font-medium tabular-nums">{formatBRL(comissao.valor)}</span>
              {comissao.valor != null && (
                <span className="block text-xs text-[#5b6472]">{comissao.efetiva ? "efetiva" : "prevista"}</span>
              )}
            </Item>
          </>
        ) : (
          <Item label="Motivo da perda">
            <span className="font-medium">{f.motivo_perda ? MOTIVO_PERDA_LABELS[f.motivo_perda] : "—"}</span>
          </Item>
        )}
      </dl>
      {f.observacoes && <p className="mt-3 whitespace-pre-line text-sm text-[#0b1f34]">{f.observacoes}</p>}

      {f.resultado === "ganho" && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-[#0b1f34] hover:underline">
            Atualizar comissão / observações
          </summary>
          <form action={comissaoAction} className="mt-3 space-y-3">
            <ComissaoFechamentoCampos f={f} valorFechadoInicial={f.valor_fechado} />
            <div>
              <label className={labelClass}>Observações</label>
              <textarea name="observacoes" rows={2} defaultValue={f.observacoes ?? ""} className={inputClass} />
            </div>
            <button
              type="submit"
              className="rounded-md bg-[#d6b072] px-3 py-1.5 text-xs font-medium text-[#0b1f34] hover:brightness-105"
            >
              Salvar
            </button>
          </form>
        </details>
      )}
    </section>
  );
}
