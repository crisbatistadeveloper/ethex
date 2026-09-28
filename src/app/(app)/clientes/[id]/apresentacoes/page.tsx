import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarApresentacao } from "./actions";
import {
  APRESENTACAO_STATUS_COLORS,
  APRESENTACAO_STATUS_LABELS,
} from "@/lib/apresentacao";
import type {
  ApresentacaoRow,
  BuscaRow,
  ClienteRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-sm font-medium text-[#0b1f34]";

export default async function ApresentacoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; oportunidade?: string }>;
}) {
  const { id } = await params;
  const { error, oportunidade: oportunidadeParam } = await searchParams;
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("cliente")
    .select("*")
    .eq("id", id)
    .returns<ClienteRow[]>()
    .maybeSingle();
  if (!cliente) notFound();

  let voltarHref = `/clientes/${id}`;
  let voltarLabel = "← Voltar ao cliente";
  if (oportunidadeParam && UUID.test(oportunidadeParam)) {
    const { data: op } = await supabase
      .from("oportunidade")
      .select("id")
      .eq("id", oportunidadeParam)
      .eq("cliente_id", id)
      .maybeSingle();
    if (op) {
      voltarHref = `/crm/${op.id}`;
      voltarLabel = "← Voltar para oportunidade";
    }
  }

  const { data: perfil } = await supabase
    .from("perfil")
    .select("id")
    .eq("cliente_id", id)
    .maybeSingle();

  let buscas: BuscaRow[] = [];
  if (perfil) {
    const { data } = await supabase
      .from("busca")
      .select("*")
      .eq("perfil_id", perfil.id)
      .order("disparada_em", { ascending: false })
      .returns<BuscaRow[]>();
    buscas = data ?? [];
  }

  const buscaIds = buscas.map((b) => b.id);
  const selecionadosPorBusca = new Map<string, number>();
  if (buscaIds.length > 0) {
    const { data } = await supabase
      .from("imovel_encontrado")
      .select("busca_id")
      .in("busca_id", buscaIds)
      .eq("selecionado_apresentacao", true);
    for (const row of data ?? []) {
      const b = row.busca_id as string;
      selecionadosPorBusca.set(b, (selecionadosPorBusca.get(b) ?? 0) + 1);
    }
  }

  const { data: apresentacoes } = await supabase
    .from("apresentacao")
    .select("*")
    .eq("cliente_id", id)
    .order("criado_em", { ascending: false })
    .returns<ApresentacaoRow[]>();

  const apresentacaoIds = (apresentacoes ?? []).map((a) => a.id);
  const itensPorApresentacao = new Map<string, number>();
  if (apresentacaoIds.length > 0) {
    const { data } = await supabase
      .from("apresentacao_item")
      .select("apresentacao_id")
      .in("apresentacao_id", apresentacaoIds);
    for (const row of data ?? []) {
      const a = row.apresentacao_id as string;
      itensPorApresentacao.set(a, (itensPorApresentacao.get(a) ?? 0) + 1);
    }
  }

  const criarAction = criarApresentacao.bind(null, id);
  const buscaPadrao = buscas[0];

  return (
    <div className="max-w-3xl">
      <Link
        href={voltarHref}
        className="text-sm text-[#5b6472] hover:underline"
      >
        {voltarLabel}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">
        Apresentações — {cliente.nome}
      </h1>
      <p className="mt-1 text-sm text-[#5b6472]">
        Seleção de imóveis da curadoria para o cliente avaliar. Marque os
        imóveis com “☆ Selecionar p/ apresentação” na curadoria antes de
        criar.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="mt-6 rounded-lg border border-[#e4e0d9] bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0b1f34]">
          Nova apresentação
        </h2>
        {!buscaPadrao ? (
          <p className="mt-3 text-sm text-[#5b6472]">
            Este cliente ainda não tem busca/curadoria. Adicione imóveis
            primeiro.
          </p>
        ) : (
          <form action={criarAction} className="mt-3 space-y-3">
            {buscas.length > 1 ? (
              <div>
                <label htmlFor="busca_id" className={labelClass}>
                  Busca
                </label>
                <select
                  id="busca_id"
                  name="busca_id"
                  defaultValue={buscaPadrao.id}
                  className={inputClass}
                >
                  {buscas.map((b) => (
                    <option key={b.id} value={b.id}>
                      Busca de{" "}
                      {new Date(b.disparada_em).toLocaleDateString("pt-BR")} —{" "}
                      {selecionadosPorBusca.get(b.id) ?? 0} selecionado(s)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <input type="hidden" name="busca_id" value={buscaPadrao.id} />
                <p className="text-sm text-[#5b6472]">
                  {selecionadosPorBusca.get(buscaPadrao.id) ?? 0} imóvel(is)
                  selecionado(s) na curadoria serão incluídos. Você pode
                  adicionar ou remover depois.
                </p>
              </>
            )}
            <div>
              <label htmlFor="observacoes" className={labelClass}>
                Observações (opcional)
              </label>
              <textarea
                id="observacoes"
                name="observacoes"
                rows={2}
                className={inputClass}
                placeholder="Mensagem de abertura para o cliente"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
            >
              Criar apresentação
            </button>
          </form>
        )}
      </section>

      <section className="mt-6 space-y-3">
        {(apresentacoes ?? []).length === 0 && (
          <p className="text-sm text-[#5b6472]">
            Nenhuma apresentação criada ainda.
          </p>
        )}
        {(apresentacoes ?? []).map((a) => (
          <Link
            key={a.id}
            href={`/clientes/${id}/apresentacoes/${a.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#e4e0d9] bg-white p-4 hover:bg-[#faf8f5]"
          >
            <div>
              <p className="font-medium">
                Apresentação de{" "}
                {new Date(a.criado_em).toLocaleDateString("pt-BR")}
              </p>
              <p className="text-xs text-[#5b6472]">
                {itensPorApresentacao.get(a.id) ?? 0} imóvel(is)
                {a.enviada_em &&
                  ` · enviada em ${new Date(a.enviada_em).toLocaleDateString("pt-BR")}`}
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${APRESENTACAO_STATUS_COLORS[a.status]}`}
            >
              {APRESENTACAO_STATUS_LABELS[a.status]}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
