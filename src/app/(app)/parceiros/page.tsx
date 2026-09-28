import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  PARCEIRO_TIPO_LABELS,
  formatParceiroLinhaCurta,
} from "@/lib/parceiros";
import type { ParceiroRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function ParceirosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tipo?: string;
    ativo?: string;
    error?: string;
  }>;
}) {
  const { q, tipo, ativo, error } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("parceiro")
    .select(
      "id, tipo, nome, imobiliaria_nome, creci, cidade_regiao, modelo_divisao, politica_comissao, ativo, atualizado_em"
    )
    .order("nome")
    .limit(100);

  if (
    tipo === "corretor" ||
    tipo === "imobiliaria" ||
    tipo === "proprietario" ||
    tipo === "incorporadora"
  ) {
    query = query.eq("tipo", tipo);
  }
  if (ativo === "1") query = query.eq("ativo", true);
  if (ativo === "0") query = query.eq("ativo", false);
  if (q?.trim()) {
    const safe = q.trim().replace(/[%_,]/g, " ");
    const term = `%${safe}%`;
    query = query.or(
      `nome.ilike.${term},imobiliaria_nome.ilike.${term},creci.ilike.${term},cidade_regiao.ilike.${term}`
    );
  }

  const { data, error: loadError } = await query;

  if (loadError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Parceiros</h1>
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Não foi possível carregar parceiros. Aplique a migration{" "}
          <code className="rounded bg-amber-100 px-1">0008_parceiros.sql</code>{" "}
          no <strong>ethex-dev</strong>.
        </p>
        <p className="mt-2 text-xs text-[#5b6472]">{loadError.message}</p>
      </div>
    );
  }

  const parceiros = (data ?? []) as Pick<
    ParceiroRow,
    | "id"
    | "tipo"
    | "nome"
    | "imobiliaria_nome"
    | "creci"
    | "cidade_regiao"
    | "modelo_divisao"
    | "politica_comissao"
    | "ativo"
    | "atualizado_em"
  >[];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Parceiros</h1>
          <p className="mt-1 text-sm text-[#5b6472]">
            Corretores e imobiliárias com quem a Ethex negocia imóveis.
          </p>
        </div>
        <Link
          href="/parceiros/novo"
          className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
        >
          Novo parceiro
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        method="get"
        className="mt-6 grid grid-cols-1 gap-3 rounded-lg border border-[#e4e0d9] bg-white p-4 sm:grid-cols-4"
      >
        <div className="sm:col-span-2">
          <label htmlFor="q" className="block text-xs font-medium text-[#5b6472]">
            Busca
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nome, CRECI, cidade…"
            className="mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="tipo" className="block text-xs font-medium text-[#5b6472]">
            Tipo
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={tipo ?? ""}
            className="mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="corretor">Corretor</option>
            <option value="imobiliaria">Imobiliária</option>
            <option value="proprietario">Proprietário</option>
            <option value="incorporadora">Incorporadora</option>
          </select>
        </div>
        <div>
          <label htmlFor="ativo" className="block text-xs font-medium text-[#5b6472]">
            Status
          </label>
          <select
            id="ativo"
            name="ativo"
            defaultValue={ativo ?? ""}
            className="mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="1">Ativos</option>
            <option value="0">Inativos</option>
          </select>
        </div>
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="rounded-md border border-[#e4e0d9] px-4 py-2 text-sm hover:bg-[#faf8f5]"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-[#e4e0d9] bg-white">
        {parceiros.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#5b6472]">
            Nenhum parceiro encontrado.{" "}
            <Link href="/parceiros/novo" className="underline">
              Cadastrar o primeiro
            </Link>
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e4e0d9] bg-[#faf8f5] text-[#5b6472]">
              <tr>
                <th className="px-4 py-3 font-medium">Parceiro</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Cidade/região</th>
                <th className="px-4 py-3 font-medium">Política</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {parceiros.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[#e4e0d9] last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/parceiros/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {formatParceiroLinhaCurta(p)}
                    </Link>
                    {p.creci && (
                      <p className="text-xs text-[#5b6472]">CRECI {p.creci}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">{PARCEIRO_TIPO_LABELS[p.tipo]}</td>
                  <td className="px-4 py-3 text-[#5b6472]">
                    {p.cidade_regiao ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[#5b6472]">
                    {p.modelo_divisao ?? p.politica_comissao ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        p.ativo
                          ? "border-green-300 bg-green-50 text-green-800"
                          : "border-[#e4e0d9] bg-[#faf8f5] text-[#5b6472]"
                      }`}
                    >
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
