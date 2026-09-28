import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { comContexto, type VisitaClienteComContexto } from "@/lib/visita-cliente-dados";
import {
  VISITA_CLIENTE_ORIGEM_LABELS,
  formatDataHorario,
} from "@/lib/visita-cliente";
import { formatDateTime } from "@/lib/crm";
import { VisitaResultadoTexto, VisitaStatusBadge } from "@/components/VisitaClienteBadges";
import { agendarVisitaCliente, cancelarVisitaCliente } from "./actions";
import type { VisitaClienteRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const smallInput =
  "rounded-md border border-[#e4e0d9] px-2 py-1 text-sm focus:border-[#b8925a] focus:outline-none";
const linkClass = "text-xs text-[#5b6472] underline-offset-2 hover:underline";

export default async function VisitasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  // Sequencial — mesmo padrão do /crm.
  const { data: abertasRaw, error: loadError } = await supabase
    .from("visita_cliente")
    .select("*")
    .in("status", ["solicitada", "agendada"])
    .order("data_visita", { ascending: true, nullsFirst: false })
    .order("horario", { ascending: true })
    .order("solicitada_em", { ascending: true })
    .returns<VisitaClienteRow[]>();

  if (loadError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Visitas</h1>
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Não foi possível carregar as visitas. A migration 0014 foi aplicada?
        </p>
        <p className="mt-2 text-xs text-[#5b6472]">{loadError.message}</p>
      </div>
    );
  }

  const { data: realizadasRaw } = await supabase
    .from("visita_cliente")
    .select("*")
    .eq("status", "realizada")
    .order("realizada_em", { ascending: false })
    .limit(30)
    .returns<VisitaClienteRow[]>();

  const { data: canceladasRaw } = await supabase
    .from("visita_cliente")
    .select("*")
    .in("status", ["cancelada", "nao_compareceu"])
    .order("atualizado_em", { ascending: false })
    .limit(30)
    .returns<VisitaClienteRow[]>();

  const todas = await comContexto(supabase, [
    ...(abertasRaw ?? []),
    ...(realizadasRaw ?? []),
    ...(canceladasRaw ?? []),
  ]);
  const solicitadas = todas
    .filter((v) => v.status === "solicitada")
    .sort((a, b) => a.solicitada_em.localeCompare(b.solicitada_em));
  const agendadas = todas.filter((v) => v.status === "agendada");
  const realizadas = todas.filter((v) => v.status === "realizada");
  const canceladas = todas.filter(
    (v) => v.status === "cancelada" || v.status === "nao_compareceu"
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">Visitas com cliente</h1>
      <p className="mt-1 text-sm text-[#5b6472]">
        Visitas acompanhadas pelo consultor. Não confundir com a visita prévia
        ETHEX (consultor sozinho). Nada aqui altera a etapa da oportunidade.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Solicitações pendentes" value={solicitadas.length} warn={solicitadas.length > 0} />
        <Stat label="Próximas visitas" value={agendadas.length} />
        <Stat label="Realizadas (últimas)" value={realizadas.length} />
        <Stat label="Canceladas / não compareceu" value={canceladas.length} />
      </div>

      <Secao titulo="Solicitações pendentes" vazio="Nenhuma solicitação aguardando agendamento.">
        {solicitadas.map((v) => {
          const agendar = agendarVisitaCliente.bind(null, v.id);
          const cancelar = cancelarVisitaCliente.bind(null, v.id);
          return (
            <li key={v.id} className="space-y-3 px-4 py-4">
              <Cabecalho v={v} />
              <p className="text-xs text-[#5b6472]">
                Solicitada em {formatDateTime(v.solicitada_em)} · Origem:{" "}
                {VISITA_CLIENTE_ORIGEM_LABELS[v.origem]}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <form action={agendar} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="voltar" value="/visitas" />
                  <label className="text-xs text-[#5b6472]">
                    Data
                    <input type="date" name="data_visita" required className={`mt-0.5 block ${smallInput}`} />
                  </label>
                  <label className="text-xs text-[#5b6472]">
                    Horário
                    <input type="time" name="horario" required className={`mt-0.5 block ${smallInput}`} />
                  </label>
                  <label className="text-xs text-[#5b6472]">
                    Observação
                    <input name="observacoes" placeholder="opcional" className={`mt-0.5 block w-48 ${smallInput}`} />
                  </label>
                  <button
                    type="submit"
                    className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
                  >
                    Confirmar / agendar
                  </button>
                </form>
                <form action={cancelar}>
                  <input type="hidden" name="voltar" value="/visitas" />
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    Cancelar
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </Secao>

      <Secao titulo="Próximas visitas" vazio="Nenhuma visita agendada.">
        {agendadas.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="space-y-1">
              <Cabecalho v={v} />
              <p className="text-sm font-medium text-blue-800">
                {formatDataHorario(v.data_visita, v.horario)}
              </p>
            </div>
            <Link
              href={`/visitas/${v.id}`}
              className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#faf8f5]"
            >
              Registrar resultado / reagendar
            </Link>
          </li>
        ))}
      </Secao>

      <Secao titulo="Visitas realizadas" vazio="Nenhuma visita realizada ainda.">
        {realizadas.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="space-y-1">
              <Cabecalho v={v} />
              <p className="text-xs text-[#5b6472]">
                {formatDataHorario(v.data_visita, v.horario)} · Resultado:{" "}
                <VisitaResultadoTexto resultado={v.resultado} />
              </p>
            </div>
            <Link href={`/visitas/${v.id}`} className={linkClass}>
              Ver feedback
            </Link>
          </li>
        ))}
      </Secao>

      <Secao titulo="Canceladas / não compareceu" vazio="Nenhuma visita cancelada.">
        {canceladas.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Cabecalho v={v} />
            <Link href={`/visitas/${v.id}`} className={linkClass}>
              Detalhes
            </Link>
          </li>
        ))}
      </Secao>
    </div>
  );
}

function Cabecalho({ v }: { v: VisitaClienteComContexto }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/visitas/${v.id}`} className="font-medium hover:underline">
          {v.imovel_titulo}
        </Link>
        <VisitaStatusBadge status={v.status} />
      </div>
      <p className="text-sm text-[#5b6472]">
        Cliente: {v.cliente_nome ?? "—"}
        {v.imovel_endereco ? ` · ${v.imovel_endereco}` : ""}
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        <Link href={`/clientes/${v.cliente_id}/imoveis/${v.imovel_encontrado_id}`} className={linkClass}>
          Abrir imóvel
        </Link>
        <Link href={`/clientes/${v.cliente_id}`} className={linkClass}>
          Abrir cliente
        </Link>
        {v.oportunidade_id && (
          <Link href={`/crm/${v.oportunidade_id}`} className={linkClass}>
            Abrir oportunidade
          </Link>
        )}
      </div>
    </div>
  );
}

function Secao({
  titulo,
  vazio,
  children,
}: {
  titulo: string;
  vazio: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">
        {titulo} <span className="text-sm font-normal text-[#5b6472]">({children.length})</span>
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-[#e4e0d9] bg-white">
        {children.length === 0 ? (
          <p className="p-6 text-center text-sm text-[#5b6472]">{vazio}</p>
        ) : (
          <ul className="divide-y divide-[#e4e0d9]">{children}</ul>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        warn ? "border-amber-200 bg-amber-50" : "border-[#e4e0d9] bg-white"
      }`}
    >
      <p className="text-xs text-[#5b6472]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
