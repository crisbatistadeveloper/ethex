import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/auth";
import {
  ETAPA_COLORS,
  ETAPA_LABELS,
  PIPELINE_ETAPAS,
  formatCurrencyBRL,
  formatDateTime,
} from "@/lib/crm";
import { comContexto } from "@/lib/visita-cliente-dados";
import { VISITA_CLIENTE_ORIGEM_LABELS } from "@/lib/visita-cliente";
import { VisitaStatusBadge } from "@/components/VisitaClienteBadges";
import type {
  AtividadeRow,
  FechamentoRow,
  OportunidadeEtapa,
  OportunidadeRow,
  VisitaClienteRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const usuario = await getUsuarioAtual();
  const supabase = await createClient();

  // Queries sequenciais — no plano Nano, Promise.all + RLS costuma travar.
  const { data: oportunidades, error: opError } = await supabase
    .from("oportunidade")
    .select(
      "id, cliente_id, consultor_id, titulo, etapa, status, valor_estimado, criado_em, atualizado_em"
    )
    .eq("status", "aberta")
    .order("atualizado_em", { ascending: false })
    .limit(50);

  if (opError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">CRM</h1>
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Não foi possível carregar oportunidades.
        </p>
        <p className="mt-2 text-xs text-[#5b6472]">{opError.message}</p>
      </div>
    );
  }

  const abertas = (oportunidades ?? []) as OportunidadeRow[];

  // Atividades de oportunidades ganhas/perdidas ficam no histórico, mas não contam como pendentes.
  const { count: pendentesCount } = await supabase
    .from("atividade")
    .select("id, oportunidade!inner(status)", { count: "exact", head: true })
    .eq("status", "pendente")
    .eq("oportunidade.status", "aberta");

  const { data: atividadesPendentes } = await supabase
    .from("atividade")
    .select("id, oportunidade_id, titulo, data_hora, status, oportunidade!inner(status)")
    .eq("status", "pendente")
    .eq("oportunidade.status", "aberta")
    .order("data_hora", { ascending: true })
    .limit(20);

  const pendentes = (atividadesPendentes ?? []) as unknown as Pick<
    AtividadeRow,
    "id" | "oportunidade_id" | "titulo" | "data_hora" | "status"
  >[];

  const { data: opsComPendenteRaw } = await supabase
    .from("atividade")
    .select("oportunidade_id, oportunidade!inner(status)")
    .eq("status", "pendente")
    .eq("oportunidade.status", "aberta");

  const visitaPorAtividade = new Map<string, string>();
  if (pendentes.length > 0) {
    const { data: visitasDasAtividades } = await supabase
      .from("visita_cliente")
      .select("id, atividade_id")
      .in(
        "atividade_id",
        pendentes.map((a) => a.id)
      );
    for (const v of visitasDasAtividades ?? []) {
      if (v.atividade_id) visitaPorAtividade.set(v.atividade_id as string, v.id as string);
    }
  }

  const { data: visitasAbertasRaw } = await supabase
    .from("visita_cliente")
    .select("*")
    .in("status", ["solicitada", "agendada"])
    .order("solicitada_em", { ascending: true })
    .limit(30)
    .returns<VisitaClienteRow[]>();
  const visitasAbertas = await comContexto(supabase, visitasAbertasRaw ?? []);
  const solicitacoesVisita = visitasAbertas.filter((v) => v.status === "solicitada");
  const visitasAgendadas = visitasAbertas.filter((v) => v.status === "agendada");

  const { count: ganhasCount } = await supabase
    .from("oportunidade")
    .select("id", { count: "exact", head: true })
    .eq("status", "ganha");
  const { count: perdidasCount } = await supabase
    .from("oportunidade")
    .select("id", { count: "exact", head: true })
    .eq("status", "perdida");
  const { data: fechamentosGanhos } = await supabase
    .from("fechamento")
    .select("valor_fechado, comissao_prevista, comissao_efetiva")
    .eq("resultado", "ganho")
    .returns<Pick<FechamentoRow, "valor_fechado" | "comissao_prevista" | "comissao_efetiva">[]>();
  const ganhos = fechamentosGanhos ?? [];
  const valorGanho = ganhos.reduce((s, f) => s + (f.valor_fechado ?? 0), 0);
  const comissaoPrevista = ganhos.reduce((s, f) => s + (f.comissao_prevista ?? 0), 0);
  const comissaoEfetiva = ganhos.reduce((s, f) => s + (f.comissao_efetiva ?? 0), 0);

  const clienteIds = [...new Set(abertas.map((o) => o.cliente_id))];
  let clienteNome = new Map<string, string>();
  if (clienteIds.length > 0) {
    const { data: clientes } = await supabase
      .from("cliente")
      .select("id, nome")
      .in("id", clienteIds);
    clienteNome = new Map((clientes ?? []).map((c) => [c.id as string, c.nome as string]));
  }

  const opsComAtividade = new Set(
    (opsComPendenteRaw ?? []).map((a) => a.oportunidade_id as string)
  );
  const semProxima = abertas.filter((o) => !opsComAtividade.has(o.id));

  const porEtapa = PIPELINE_ETAPAS.map((etapa) => ({
    etapa,
    count: abertas.filter((o) => o.etapa === etapa).length,
  }));

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">CRM</h1>
          <p className="mt-1 text-sm text-[#5b6472]">
            Camada comercial sobre Clientes —{" "}
            {usuario?.papel === "admin"
              ? "visão de todas as oportunidades"
              : "suas oportunidades e próximas atividades"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/crm/pipeline"
            className="rounded-md border border-[#e4e0d9] px-4 py-2 text-sm hover:bg-[#efe9e0]"
          >
            Pipeline
          </Link>
          <Link
            href="/crm/novo"
            className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
          >
            Nova oportunidade
          </Link>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Abertas" value={abertas.length} />
        <StatCard label="Atividades pendentes" value={pendentesCount ?? pendentes.length} />
        <StatCard
          label="Sem próxima atividade"
          value={semProxima.length}
          warn={semProxima.length > 0}
        />
        <StatCard
          label="Em fechamento"
          value={abertas.filter((o) => o.etapa === "fechamento").length}
        />
        <StatCard
          label="Solicitações de visita"
          value={solicitacoesVisita.length}
          warn={solicitacoesVisita.length > 0}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Operações ganhas" value={ganhasCount ?? 0} href="/crm/encerradas?status=ganha" />
        <StatCard label="Operações perdidas" value={perdidasCount ?? 0} href="/crm/encerradas?status=perdida" />
        <StatCard label="Valor total ganho" value={formatCurrencyBRL(valorGanho)} />
        <StatCard
          label="Comissão ETHEX (efetiva / prevista)"
          value={`${formatCurrencyBRL(comissaoEfetiva)} / ${formatCurrencyBRL(comissaoPrevista)}`}
          small
        />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Solicitações de visita
            <span className="ml-2 text-sm font-normal text-[#5b6472]">
              ({solicitacoesVisita.length} pendente(s) · {visitasAgendadas.length} agendada(s))
            </span>
          </h2>
          <Link href="/visitas" className="text-sm text-[#5b6472] hover:underline">
            Abrir visitas
          </Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-[#e4e0d9] bg-white">
          {solicitacoesVisita.length === 0 ? (
            <p className="p-6 text-center text-sm text-[#5b6472]">
              Nenhuma solicitação aguardando agendamento.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e4e0d9] bg-[#faf8f5] text-[#5b6472]">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Imóvel</th>
                  <th className="px-4 py-3 font-medium">Solicitada em</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoesVisita.slice(0, 8).map((v) => (
                  <tr key={v.id} className="border-b border-[#e4e0d9] last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/clientes/${v.cliente_id}`} className="hover:underline">
                        {v.cliente_nome ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/visitas/${v.id}`} className="font-medium hover:underline">
                        {v.imovel_titulo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#0b1f34]">
                      {formatDateTime(v.solicitada_em)}
                    </td>
                    <td className="px-4 py-3 text-[#0b1f34]">
                      {VISITA_CLIENTE_ORIGEM_LABELS[v.origem]}
                    </td>
                    <td className="px-4 py-3">
                      <VisitaStatusBadge status={v.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-[#5b6472]">
          Oportunidades por etapa
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {porEtapa.map(({ etapa, count }) => (
            <span
              key={etapa}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${ETAPA_COLORS[etapa as OportunidadeEtapa]}`}
            >
              {ETAPA_LABELS[etapa as OportunidadeEtapa]}: {count}
            </span>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Oportunidades abertas</h2>
            <Link
              href="/crm/pipeline"
              className="text-sm text-[#5b6472] hover:underline"
            >
              Ver kanban
            </Link>
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-[#e4e0d9] bg-white">
            {abertas.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#5b6472]">
                Nenhuma oportunidade aberta.{" "}
                <Link href="/crm/novo" className="underline">
                  Criar agora
                </Link>
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e4e0d9] bg-[#faf8f5] text-[#5b6472]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Oportunidade</th>
                    <th className="px-4 py-3 font-medium">Etapa</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {abertas.slice(0, 12).map((op) => (
                    <tr
                      key={op.id}
                      className="border-b border-[#e4e0d9] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/crm/${op.id}`}
                          className="font-medium hover:underline"
                        >
                          {op.titulo}
                        </Link>
                        <p className="text-xs text-[#5b6472]">
                          {clienteNome.get(op.cliente_id) ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${ETAPA_COLORS[op.etapa]}`}
                        >
                          {ETAPA_LABELS[op.etapa]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#0b1f34]">
                        {formatCurrencyBRL(op.valor_estimado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Atividades pendentes</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-[#e4e0d9] bg-white">
            {pendentes.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#5b6472]">
                Nenhuma atividade pendente.
              </p>
            ) : (
              <ul className="divide-y divide-[#e4e0d9]">
                {pendentes.map((a) => {
                  const visitaId = visitaPorAtividade.get(a.id);
                  return (
                  <li key={a.id} className="px-4 py-3">
                    <Link
                      href={visitaId ? `/visitas/${visitaId}` : `/crm/${a.oportunidade_id}`}
                      className="font-medium hover:underline"
                    >
                      {a.titulo}
                    </Link>
                    <p className="text-xs text-[#5b6472]">
                      {formatDateTime(a.data_hora)}
                      {visitaId && (
                        <>
                          {" · "}
                          <Link
                            href={`/crm/${a.oportunidade_id}`}
                            className="hover:underline"
                          >
                            ver oportunidade
                          </Link>
                        </>
                      )}
                    </p>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>

          {semProxima.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-amber-800">
                Sem próxima atividade ({semProxima.length})
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {semProxima.slice(0, 8).map((op) => (
                  <li key={op.id}>
                    <Link
                      href={`/crm/${op.id}`}
                      className="text-[#0b1f34] hover:underline"
                    >
                      {op.titulo} — {clienteNome.get(op.cliente_id) ?? "—"}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  warn,
  small,
  href,
}: {
  label: string;
  value: number | string;
  warn?: boolean;
  small?: boolean;
  href?: string;
}) {
  const className = `block rounded-lg border p-4 ${
    warn ? "border-amber-200 bg-amber-50" : "border-[#e4e0d9] bg-white"
  } ${href ? "transition hover:border-[#e4e0d9] hover:shadow-sm" : ""}`;
  const conteudo = (
    <>
      <p className="text-xs text-[#5b6472]">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${small ? "text-base" : "text-2xl"}`}>{value}</p>
      {href && <p className="mt-1 text-xs text-[#5b6472]">Ver todas →</p>}
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {conteudo}
    </Link>
  ) : (
    <div className={className}>{conteudo}</div>
  );
}
