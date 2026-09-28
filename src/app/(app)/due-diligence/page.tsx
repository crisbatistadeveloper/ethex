import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/crm";
import { formatBRL } from "@/lib/negociacao-compra";
import {
  AVISO_NAO_JURIDICO,
  DD_FINAL_STATUS_COLORS,
  DD_FINAL_STATUS_CONCLUSIVOS,
  DD_FINAL_STATUS_LABELS,
  RECOMENDACAO_LABELS,
} from "@/lib/due-diligence-final";
import { iniciarDueDiligenceFinal } from "./actions";
import {
  IMOVEL_TITULO_COLUNAS,
  tituloImovel as gerarTituloImovel,
  type ImovelParaTitulo,
} from "@/lib/imovel-titulo";
import type {
  DueDiligenceFinalRow,
  NegociacaoCompraRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function DueDiligenceListaPage() {
  const supabase = await createClient();

  const { data: raw, error } = await supabase
    .from("due_diligence_final")
    .select("*")
    .order("atualizado_em", { ascending: false })
    .limit(100)
    .returns<DueDiligenceFinalRow[]>();

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Due diligence final</h1>
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Não foi possível carregar. A migration 0016 foi aplicada?
        </p>
        <p className="mt-2 text-xs text-[#5b6472]">{error.message}</p>
      </div>
    );
  }

  const lista = raw ?? [];
  const { data: aceitasRaw } = await supabase
    .from("negociacao_compra")
    .select("*")
    .eq("status", "aceita")
    .order("encerrada_em", { ascending: false })
    .returns<NegociacaoCompraRow[]>();
  const comDD = new Set(lista.map((d) => d.negociacao_id));
  const aguardando = (aceitasRaw ?? []).filter((n) => !comDD.has(n.id));

  const clienteIds = [...new Set([...lista.map((d) => d.cliente_id), ...aguardando.map((n) => n.cliente_id)])];
  const imovelIds = [...new Set([...lista.map((d) => d.imovel_id), ...aguardando.map((n) => n.imovel_id)])];
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

  const emCurso = lista.filter((d) => !DD_FINAL_STATUS_CONCLUSIVOS.includes(d.status));
  const concluidas = lista.filter((d) => DD_FINAL_STATUS_CONCLUSIVOS.includes(d.status));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Due diligence final</h1>
      <p className="mt-1 text-sm text-[#5b6472]">
        Acompanhamento documental das operações com proposta aceita, antes do fechamento.
      </p>
      <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {AVISO_NAO_JURIDICO}
      </p>

      {aguardando.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            Propostas aceitas aguardando início{" "}
            <span className="text-sm font-normal text-[#5b6472]">({aguardando.length})</span>
          </h2>
          <ul className="mt-3 divide-y divide-[#e4e0d9] rounded-lg border border-[#e4e0d9] bg-white">
            {aguardando.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <Link href={`/negociacoes/${n.id}`} className="font-medium hover:underline">
                    {tituloImovel.get(n.imovel_id) ?? "Imóvel"}
                  </Link>
                  <p className="text-xs text-[#5b6472]">
                    {nomeCliente.get(n.cliente_id) ?? "—"} · Valor final {formatBRL(n.valor_final)}
                  </p>
                </div>
                <form action={iniciarDueDiligenceFinal.bind(null, n.id)}>
                  <button
                    type="submit"
                    className="rounded-md bg-[#d6b072] px-3 py-1.5 text-xs font-semibold text-[#0b1f34] hover:brightness-105"
                  >
                    INICIAR DUE DILIGENCE FINAL
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {[
        { titulo: "Em andamento", itens: emCurso, vazio: "Nenhuma due diligence em andamento." },
        { titulo: "Concluídas", itens: concluidas, vazio: "Nenhuma due diligence concluída." },
      ].map((grupo) => (
        <section key={grupo.titulo} className="mt-8">
          <h2 className="text-lg font-semibold">
            {grupo.titulo} <span className="text-sm font-normal text-[#5b6472]">({grupo.itens.length})</span>
          </h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-[#e4e0d9] bg-white">
            {grupo.itens.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#5b6472]">{grupo.vazio}</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e4e0d9] bg-[#faf8f5] text-[#5b6472]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Imóvel</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Recomendação</th>
                    <th className="px-4 py-3 font-medium">Atualizada</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.itens.map((d) => (
                    <tr key={d.id} className="border-b border-[#e4e0d9] last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/due-diligence/${d.id}`} className="font-medium hover:underline">
                          {tituloImovel.get(d.imovel_id) ?? "Imóvel"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/crm/${d.oportunidade_id}`} className="hover:underline">
                          {nomeCliente.get(d.cliente_id) ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${DD_FINAL_STATUS_COLORS[d.status]}`}>
                          {DD_FINAL_STATUS_LABELS[d.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5b6472]">
                        {d.recomendacao ? RECOMENDACAO_LABELS[d.recomendacao] : "Pendente"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5b6472]">{formatDateTime(d.atualizado_em)}</td>
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
