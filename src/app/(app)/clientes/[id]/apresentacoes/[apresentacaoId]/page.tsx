import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarConteudoCuradorias } from "@/lib/apresentacao-conteudo";
import {
  APRESENTACAO_STATUS,
  APRESENTACAO_STATUS_COLORS,
  APRESENTACAO_STATUS_LABELS,
  ITEM_STATUS,
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  RECOMENDACAO_TEXTO,
  estrelas,
  formatPreco,
} from "@/lib/apresentacao";
import { ApresentacaoImovelCard } from "@/components/ApresentacaoImovelCard";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { IMOVEL_TITULO_COLUNAS, tituloImovel, type ImovelParaTitulo } from "@/lib/imovel-titulo";
import {
  addItemApresentacao,
  moverItemApresentacao,
  removeItemApresentacao,
  updateApresentacao,
  updateItemApresentacao,
} from "../actions";
import type { ApresentacaoItemRow, ApresentacaoRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";
const smallBtn =
  "rounded-md border border-[#e4e0d9] px-2.5 py-1 text-xs hover:bg-[#efe9e0] disabled:opacity-40";

interface CuradoriaOpcao {
  id: string;
  selecionado_apresentacao: boolean | null;
  imovel: ImovelParaTitulo & { preco: number | null };
}

export default async function ApresentacaoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; apresentacaoId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: clienteId, apresentacaoId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: apresentacao } = await supabase
    .from("apresentacao")
    .select("*")
    .eq("id", apresentacaoId)
    .eq("cliente_id", clienteId)
    .returns<ApresentacaoRow[]>()
    .maybeSingle();
  if (!apresentacao) notFound();

  const [{ data: cliente }, { data: consultor }, { data: itensRaw }, { data: opcoesRaw }] =
    await Promise.all([
      supabase.from("cliente").select("nome").eq("id", clienteId).maybeSingle(),
      supabase
        .from("usuario")
        .select("nome")
        .eq("id", apresentacao.consultor_id)
        .maybeSingle(),
      supabase
        .from("apresentacao_item")
        .select("*")
        .eq("apresentacao_id", apresentacaoId)
        .order("ordem", { ascending: true })
        .order("criado_em", { ascending: true })
        .returns<ApresentacaoItemRow[]>(),
      supabase
        .from("imovel_encontrado")
        .select(`id, selecionado_apresentacao, imovel(preco, ${IMOVEL_TITULO_COLUNAS})`)
        .eq("busca_id", apresentacao.busca_id)
        .neq("status_curadoria", "rejeitado")
        .returns<CuradoriaOpcao[]>(),
    ]);

  const itens = itensRaw ?? [];
  const conteudos = await carregarConteudoCuradorias(
    supabase,
    itens.map((i) => i.imovel_encontrado_id)
  );

  const jaIncluidos = new Set(itens.map((i) => i.imovel_encontrado_id));
  const opcoes = (opcoesRaw ?? [])
    .filter((o) => !jaIncluidos.has(o.id))
    .sort(
      (a, b) =>
        Number(Boolean(b.selecionado_apresentacao)) -
        Number(Boolean(a.selecionado_apresentacao))
    );

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const linkPublico = `${proto}://${host}/apresentacao/${apresentacao.token}`;

  const updateAction = updateApresentacao.bind(null, apresentacaoId, clienteId);
  const addAction = addItemApresentacao.bind(null, apresentacaoId, clienteId);

  return (
    <div className="max-w-3xl">
      <Link
        href={`/clientes/${clienteId}/apresentacoes`}
        className="text-sm text-[#5b6472] hover:underline"
      >
        ← Apresentações
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold uppercase tracking-wide">
          Apresentação — {cliente?.nome ?? "Cliente"}
        </h1>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${APRESENTACAO_STATUS_COLORS[apresentacao.status]}`}
        >
          {APRESENTACAO_STATUS_LABELS[apresentacao.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-[#5b6472]">
        Consultor: {consultor?.nome ?? "—"} · criada em{" "}
        {new Date(apresentacao.criado_em).toLocaleDateString("pt-BR")}
        {apresentacao.enviada_em &&
          ` · enviada em ${new Date(apresentacao.enviada_em).toLocaleDateString("pt-BR")}`}
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="mt-6 space-y-4 rounded-lg border border-[#e4e0d9] bg-white p-5">
        <form action={updateAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="status" className={labelClass}>
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={apresentacao.status}
                className={inputClass}
              >
                {APRESENTACAO_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {APRESENTACAO_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="observacoes" className={labelClass}>
                Observações para o cliente
              </label>
              <textarea
                id="observacoes"
                name="observacoes"
                rows={2}
                defaultValue={apresentacao.observacoes ?? ""}
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
          >
            Salvar
          </button>
        </form>

        <div className="border-t border-[#e4e0d9] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5b6472]">
            Link do cliente
          </p>
          {apresentacao.status === "rascunho" ? (
            <p className="mt-1 text-sm text-[#5b6472]">
              O link só fica acessível depois de mudar o status para{" "}
              <strong>Enviada</strong>. Enquanto isso, use a pré-visualização
              abaixo.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                readOnly
                value={linkPublico}
                className="min-w-0 flex-1 rounded-md border border-[#e4e0d9] bg-[#faf8f5] px-3 py-1.5 text-xs text-[#0b1f34]"
              />
              <CopyLinkButton url={linkPublico} />
              <a
                href={linkPublico}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#faf8f5]"
              >
                Abrir ↗
              </a>
            </div>
          )}
          {apresentacao.status === "concluida" && (
            <p className="mt-1 text-xs text-[#5b6472]">
              Concluída: o cliente ainda vê o link, mas não pode mais responder.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-[#e4e0d9] bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0b1f34]">
          Resumo ({itens.length})
        </h2>
        {itens.length === 0 ? (
          <p className="mt-3 text-sm text-[#5b6472]">
            Nenhum imóvel ainda. Adicione abaixo.
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {itens.map((item, idx) => {
              const c = conteudos.get(item.imovel_encontrado_id);
              return (
                <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {idx + 1}. {c?.titulo ?? "Imóvel"}
                      {item.destaque && (
                        <span className="ml-2 text-xs text-amber-700">★ destaque</span>
                      )}
                    </p>
                    <p className="text-[#5b6472]">{formatPreco(c?.preco ?? null) ?? "Preço não informado"}</p>
                    {c?.recomendacao && (
                      <p className="text-xs">
                        <span className="text-amber-500">{estrelas(c.recomendacao)}</span>{" "}
                        {RECOMENDACAO_TEXTO[c.recomendacao].toLowerCase()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${ITEM_STATUS_COLORS[item.status]}`}
                    >
                      {ITEM_STATUS_LABELS[item.status]}
                    </span>
                    {item.resposta_cliente_em && (
                      <p className="mt-1 text-[11px] text-[#5b6472]">
                        cliente respondeu em{" "}
                        {new Date(item.resposta_cliente_em).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-[#e4e0d9] bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0b1f34]">
          Adicionar imóvel da curadoria
        </h2>
        {opcoes.length === 0 ? (
          <p className="mt-3 text-sm text-[#5b6472]">
            Todos os imóveis da curadoria (não rejeitados) já estão na
            apresentação.
          </p>
        ) : (
          <form action={addAction} className="mt-3 flex flex-wrap gap-2">
            <select
              name="imovel_encontrado_id"
              required
              className="min-w-0 flex-1 rounded-md border border-[#e4e0d9] px-3 py-2 text-sm"
            >
              {opcoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.selecionado_apresentacao ? "★ " : ""}
                  {tituloImovel(o.imovel)}
                  {o.imovel.preco != null ? ` — ${formatPreco(o.imovel.preco)}` : ""}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
            >
              Adicionar
            </button>
          </form>
        )}
      </section>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-[#5b6472]">
        Pré-visualização (como o cliente verá)
      </h2>
      <div className="mt-3 space-y-6">
        {itens.map((item, idx) => {
          const c = conteudos.get(item.imovel_encontrado_id);
          if (!c) return null;
          const subir = moverItemApresentacao.bind(null, item.id, apresentacaoId, clienteId, "up");
          const descer = moverItemApresentacao.bind(null, item.id, apresentacaoId, clienteId, "down");
          const remover = removeItemApresentacao.bind(null, item.id, apresentacaoId, clienteId);
          const salvarItem = updateItemApresentacao.bind(null, item.id, apresentacaoId, clienteId);
          return (
            <ApresentacaoImovelCard
              key={item.id}
              conteudo={c}
              posicao={idx + 1}
              destaque={item.destaque}
              observacao={item.observacao_consultor}
              visao="interna"
            >
              <div className="space-y-3 rounded-md border border-dashed border-[#e4e0d9] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-[#5b6472]">
                    Controles do consultor
                  </span>
                  <form action={subir}>
                    <button type="submit" className={smallBtn} disabled={idx === 0}>
                      ↑ Subir
                    </button>
                  </form>
                  <form action={descer}>
                    <button type="submit" className={smallBtn} disabled={idx === itens.length - 1}>
                      ↓ Descer
                    </button>
                  </form>
                  <form action={remover}>
                    <button
                      type="submit"
                      className="rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Remover
                    </button>
                  </form>
                  <Link
                    href={`/clientes/${clienteId}/imoveis/${item.imovel_encontrado_id}`}
                    className={smallBtn}
                  >
                    Abrir curadoria
                  </Link>
                </div>

                {item.resposta_cliente && (
                  <p className="text-xs text-[#5b6472]">
                    Resposta do cliente:{" "}
                    <strong>{ITEM_STATUS_LABELS[item.resposta_cliente]}</strong>
                    {item.resposta_cliente_em &&
                      ` · ${new Date(item.resposta_cliente_em).toLocaleString("pt-BR")}`}
                  </p>
                )}

                <form action={salvarItem} className="space-y-2">
                  <div>
                    <label className={labelClass} htmlFor={`obs-${item.id}`}>
                      Observação do consultor (aparece para o cliente)
                    </label>
                    <textarea
                      id={`obs-${item.id}`}
                      name="observacao_consultor"
                      rows={2}
                      defaultValue={item.observacao_consultor ?? ""}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="destaque" defaultChecked={item.destaque} />
                      Destaque
                    </label>
                    <div>
                      <label className={labelClass} htmlFor={`st-${item.id}`}>
                        Status da opção
                      </label>
                      <select
                        id={`st-${item.id}`}
                        name="status"
                        defaultValue={item.status}
                        className="mt-1 rounded-md border border-[#e4e0d9] px-2 py-1.5 text-sm"
                      >
                        {ITEM_STATUS.map((s) => (
                          <option key={s} value={s}>
                            {ITEM_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="rounded-md bg-[#d6b072] px-3 py-1.5 text-xs font-medium text-[#0b1f34] hover:brightness-105"
                    >
                      Salvar item
                    </button>
                  </div>
                </form>
              </div>
            </ApresentacaoImovelCard>
          );
        })}
      </div>
    </div>
  );
}
