import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  NEGOCIACAO_COMPRA_STATUS_COLORS,
  NEGOCIACAO_COMPRA_STATUS_LABELS,
  formatBRL,
  negociacaoAtiva,
  valorAtual,
} from "@/lib/negociacao-compra";
import { formatDateTime } from "@/lib/crm";
import type { NegociacaoCompraRow } from "@/lib/database.types";
import {
  IMOVEL_TITULO_COLUNAS,
  tituloImovel as gerarTituloImovel,
  type ImovelParaTitulo,
} from "@/lib/imovel-titulo";

export const dynamic = "force-dynamic";

export default async function NegociacoesPage() {
  const supabase = await createClient();

  const { data: raw, error } = await supabase
    .from("negociacao_compra")
    .select("*")
    .order("atualizado_em", { ascending: false })
    .limit(100)
    .returns<NegociacaoCompraRow[]>();

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Negociações</h1>
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Não foi possível carregar as negociações. A migration 0015 foi aplicada?
        </p>
        <p className="mt-2 text-xs text-[#5b6472]">{error.message}</p>
      </div>
    );
  }

  const negociacoes = raw ?? [];
  const clienteIds = [...new Set(negociacoes.map((n) => n.cliente_id))];
  const imovelIds = [...new Set(negociacoes.map((n) => n.imovel_id))];
  const { data: clientes } = clienteIds.length
    ? await supabase.from("cliente").select("id, nome").in("id", clienteIds)
    : { data: [] };
  const { data: imoveis } = imovelIds.length
    ? await supabase
        .from("imovel")
        .select(`id, ${IMOVEL_TITULO_COLUNAS}`)
        .in("id", imovelIds)
        .returns<(ImovelParaTitulo & { id: string })[]>()
    : { data: [] };
  const nomeCliente = new Map((clientes ?? []).map((c) => [c.id as string, c.nome as string]));
  const tituloImovel = new Map((imoveis ?? []).map((i) => [i.id, gerarTituloImovel(i)]));

  const ativas = negociacoes.filter((n) => negociacaoAtiva(n.status));
  const encerradas = negociacoes.filter((n) => !negociacaoAtiva(n.status));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Negociações de compra</h1>
      <p className="mt-1 text-sm text-[#5b6472]">
        Processo comercial do cliente para o imóvel escolhido. Inicie uma
        negociação pela curadoria do imóvel (decisão “Escolhido”).
      </p>

      {[
        { titulo: "Em andamento", lista: ativas, vazio: "Nenhuma negociação em andamento." },
        { titulo: "Encerradas", lista: encerradas, vazio: "Nenhuma negociação encerrada." },
      ].map((grupo) => (
        <section key={grupo.titulo} className="mt-8">
          <h2 className="text-lg font-semibold">
            {grupo.titulo}{" "}
            <span className="text-sm font-normal text-[#5b6472]">({grupo.lista.length})</span>
          </h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-[#e4e0d9] bg-white">
            {grupo.lista.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#5b6472]">{grupo.vazio}</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e4e0d9] bg-[#faf8f5] text-[#5b6472]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Imóvel</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Anunciado</th>
                    <th className="px-4 py-3 font-medium">Valor atual</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Atualizada</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.lista.map((n) => (
                    <tr key={n.id} className="border-b border-[#e4e0d9] last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/negociacoes/${n.id}`} className="font-medium hover:underline">
                          {tituloImovel.get(n.imovel_id) ?? "Imóvel"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/crm/${n.oportunidade_id}`} className="hover:underline">
                          {nomeCliente.get(n.cliente_id) ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#5b6472]">
                        {formatBRL(n.preco_anunciado)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">{formatBRL(valorAtual(n))}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${NEGOCIACAO_COMPRA_STATUS_COLORS[n.status]}`}
                        >
                          {NEGOCIACAO_COMPRA_STATUS_LABELS[n.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5b6472]">{formatDateTime(n.atualizado_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
