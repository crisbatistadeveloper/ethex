import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createParceiroHistorico,
  updateParceiro,
} from "@/app/(app)/parceiros/actions";
import { ParceiroFormFields } from "@/app/(app)/parceiros/ParceiroFormFields";
import { IMOVEL_TITULO_COLUNAS, tituloImovel, type ImovelParaTitulo } from "@/lib/imovel-titulo";
import {
  PARCEIRO_HISTORICO_LABELS,
  PARCEIRO_HISTORICO_TIPOS,
  PARCEIRO_TIPO_LABELS,
  formatParceiroLinhaCurta,
} from "@/lib/parceiros";
import type {
  ParceiroHistoricoRow,
  ParceiroRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";

export default async function ParceiroDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { error, edit } = await searchParams;
  const editing = edit === "1";
  const supabase = await createClient();

  const { data: parceiro } = await supabase
    .from("parceiro")
    .select("*")
    .eq("id", id)
    .returns<ParceiroRow[]>()
    .maybeSingle();

  if (!parceiro) notFound();

  const { data: historico } = await supabase
    .from("parceiro_historico")
    .select("*")
    .eq("parceiro_id", id)
    .order("criado_em", { ascending: false })
    .limit(40)
    .returns<ParceiroHistoricoRow[]>();

  const { data: vinculosRaw } = await supabase
    .from("imovel_encontrado")
    .select("id, imovel_id")
    .eq("parceiro_id", id)
    .limit(20);

  const imovelIds = (vinculosRaw ?? [])
    .map((v) => v.imovel_id as string)
    .filter(Boolean);

  let imoveisPorId = new Map<
    string,
    { titulo: string; url: string; endereco: string | null }
  >();
  if (imovelIds.length > 0) {
    const { data: imoveis } = await supabase
      .from("imovel")
      .select(`id, endereco_texto, ${IMOVEL_TITULO_COLUNAS}`)
      .in("id", imovelIds)
      .returns<(ImovelParaTitulo & { id: string; url: string; endereco_texto: string | null })[]>();
    imoveisPorId = new Map(
      (imoveis ?? []).map((i) => [
        i.id,
        { titulo: tituloImovel(i), url: i.url, endereco: i.endereco_texto ?? null },
      ])
    );
  }

  const updateAction = updateParceiro.bind(null, id);
  const historicoAction = createParceiroHistorico.bind(null, id);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/parceiros"
            className="text-sm text-[#5b6472] hover:underline"
          >
            ← Parceiros
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            {formatParceiroLinhaCurta(parceiro)}
          </h1>
          <p className="mt-1 text-sm text-[#5b6472]">
            {PARCEIRO_TIPO_LABELS[parceiro.tipo]}
            {parceiro.creci ? ` · CRECI ${parceiro.creci}` : ""}
            {parceiro.cidade_regiao ? ` · ${parceiro.cidade_regiao}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              parceiro.ativo
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-[#e4e0d9] bg-[#faf8f5] text-[#5b6472]"
            }`}
          >
            {parceiro.ativo ? "Ativo" : "Inativo"}
          </span>
          {!editing && (
            <Link
              href={`/parceiros/${id}?edit=1`}
              className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#faf8f5]"
            >
              Editar
            </Link>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {editing ? (
        <form action={updateAction} className="mt-6 space-y-6">
          <ParceiroFormFields parceiro={parceiro} showAtivo />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
            >
              Salvar alterações
            </button>
            <Link
              href={`/parceiros/${id}`}
              className="rounded-md border border-[#e4e0d9] px-4 py-2 text-sm hover:bg-[#faf8f5]"
            >
              Cancelar
            </Link>
          </div>
        </form>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-lg border border-[#e4e0d9] bg-white p-5">
              <h2 className="text-sm font-semibold">Contato</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Field label="Telefone" value={parceiro.contato_telefone} />
                <Field label="WhatsApp" value={parceiro.whatsapp} />
                <Field label="E-mail" value={parceiro.contato_email} />
                <Field label="Pessoa de contato" value={parceiro.contato_nome} />
              </dl>
              {parceiro.observacoes && (
                <p className="mt-3 text-sm text-[#5b6472]">
                  {parceiro.observacoes}
                </p>
              )}
            </section>

            <section className="rounded-lg border border-[#e4e0d9] bg-white p-5">
              <h2 className="text-sm font-semibold">Política de parceria</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Field
                  label="Comissão / percentual"
                  value={parceiro.politica_comissao}
                />
                <Field label="Modelo de divisão" value={parceiro.modelo_divisao} />
                <Field
                  label="Última negociação"
                  value={
                    parceiro.ultima_negociacao_em
                      ? new Date(
                          parceiro.ultima_negociacao_em
                        ).toLocaleDateString("pt-BR")
                      : null
                  }
                />
              </dl>
              {parceiro.condicoes_parceria && (
                <p className="mt-3 text-sm text-[#5b6472] whitespace-pre-wrap">
                  {parceiro.condicoes_parceria}
                </p>
              )}
            </section>

            <section className="rounded-lg border border-[#e4e0d9] bg-white p-5">
              <h2 className="text-sm font-semibold">
                Imóveis vinculados ({vinculosRaw?.length ?? 0})
              </h2>
              {(vinculosRaw ?? []).length === 0 ? (
                <p className="mt-3 text-sm text-[#5b6472]">
                  Nenhum imóvel encontrado associado ainda. Vincule na curadoria
                  do cliente.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[#e4e0d9] text-sm">
                  {(vinculosRaw ?? []).map((v) => {
                    const imovel = imoveisPorId.get(v.imovel_id as string);
                    return (
                      <li key={v.id as string} className="py-2">
                        <p className="font-medium">
                          {imovel?.titulo ?? "Imóvel"}
                        </p>
                        {imovel?.url && (
                          <a
                            href={imovel.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#5b6472] hover:underline"
                          >
                            Ver anúncio ↗
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-lg border border-[#e4e0d9] bg-white p-5">
              <h2 className="text-sm font-semibold">Histórico</h2>
              <form action={historicoAction} className="mt-3 space-y-2">
                <div>
                  <label htmlFor="tipo" className={labelClass}>
                    Tipo
                  </label>
                  <select
                    id="tipo"
                    name="tipo"
                    defaultValue="observacao"
                    className={inputClass}
                  >
                    {PARCEIRO_HISTORICO_TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {PARCEIRO_HISTORICO_LABELS[t]}
                      </option>
                    ))}
                  </select>
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
                    placeholder="Ex.: Acordo 50/50 na venda X"
                  />
                </div>
                <div>
                  <label htmlFor="detalhe" className={labelClass}>
                    Detalhe
                  </label>
                  <textarea
                    id="detalhe"
                    name="detalhe"
                    rows={2}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
                >
                  Registrar
                </button>
              </form>

              <ul className="mt-4 space-y-3">
                {(historico ?? []).length === 0 && (
                  <li className="text-sm text-[#5b6472]">
                    Nenhum registro ainda.
                  </li>
                )}
                {(historico ?? []).map((h) => (
                  <li key={h.id} className="border-t border-[#e4e0d9] pt-3 text-sm">
                    <p className="text-xs text-[#5b6472]">
                      {PARCEIRO_HISTORICO_LABELS[h.tipo]} ·{" "}
                      {new Date(h.criado_em).toLocaleString("pt-BR")}
                    </p>
                    <p className="font-medium text-[#0b1f34]">{h.titulo}</p>
                    {h.detalhe && (
                      <p className="mt-0.5 text-[#5b6472]">{h.detalhe}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs text-[#5b6472]">{label}</dt>
      <dd className="mt-0.5">{value || "—"}</dd>
    </div>
  );
}
