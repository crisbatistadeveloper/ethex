import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { comContexto } from "@/lib/visita-cliente-dados";
import {
  VISITA_CLIENTE_ORIGEM_LABELS,
  VISITA_CLIENTE_RESULTADOS,
  VISITA_CLIENTE_RESULTADO_LABELS,
  formatDataHorario,
} from "@/lib/visita-cliente";
import { ETAPA_COLORS, ETAPA_LABELS, PIPELINE_ETAPAS, formatDateTime } from "@/lib/crm";
import { VisitaStatusBadge } from "@/components/VisitaClienteBadges";
import {
  agendarVisitaCliente,
  avancarOportunidadeParaVisita,
  cancelarVisitaCliente,
  marcarNaoCompareceu,
  registrarResultadoVisita,
} from "../actions";
import type { OportunidadeStatus, VisitaClienteRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-sm font-medium text-[#0b1f34]";

export default async function VisitaClienteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("visita_cliente")
    .select("*")
    .eq("id", id)
    .returns<VisitaClienteRow[]>()
    .maybeSingle();
  if (!raw) notFound();

  const [v] = await comContexto(supabase, [raw]);

  let opStatus: OportunidadeStatus | null = null;
  if (v.oportunidade_id) {
    const { data: op } = await supabase
      .from("oportunidade")
      .select("status")
      .eq("id", v.oportunidade_id)
      .maybeSingle();
    opStatus = (op?.status as OportunidadeStatus | undefined) ?? null;
  }

  let apresentacaoId: string | null = null;
  if (v.apresentacao_item_id) {
    const { data: item } = await supabase
      .from("apresentacao_item")
      .select("apresentacao_id")
      .eq("id", v.apresentacao_item_id)
      .maybeSingle();
    apresentacaoId = (item?.apresentacao_id as string | undefined) ?? null;
  }

  const aberta = v.status === "solicitada" || v.status === "agendada";
  const podeResultado = v.status !== "cancelada" && v.status !== "nao_compareceu";
  const podeAvancar =
    v.oportunidade_id != null &&
    opStatus === "aberta" &&
    v.oportunidade_etapa != null &&
    PIPELINE_ETAPAS.indexOf(v.oportunidade_etapa) < PIPELINE_ETAPAS.indexOf("visita");

  const agendar = agendarVisitaCliente.bind(null, id);
  const cancelar = cancelarVisitaCliente.bind(null, id);
  const naoCompareceu = marcarNaoCompareceu.bind(null, id);
  const resultado = registrarResultadoVisita.bind(null, id);
  const avancar = v.oportunidade_id
    ? avancarOportunidadeParaVisita.bind(null, v.oportunidade_id)
    : null;

  return (
    <div className="max-w-2xl">
      <Link href="/visitas" className="text-sm text-[#5b6472] hover:underline">
        ← Visitas
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Visita — {v.imovel_titulo}</h1>
        <VisitaStatusBadge status={v.status} />
      </div>
      <p className="mt-1 text-sm text-[#5b6472]">
        Cliente: {v.cliente_nome ?? "—"} · Consultor: {v.consultor_nome ?? "—"}
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        <Link href={`/clientes/${v.cliente_id}/imoveis/${v.imovel_encontrado_id}`} className="underline-offset-2 hover:underline">
          Abrir imóvel
        </Link>
        <Link href={`/clientes/${v.cliente_id}`} className="underline-offset-2 hover:underline">
          Abrir cliente
        </Link>
        {v.oportunidade_id && (
          <Link href={`/crm/${v.oportunidade_id}`} className="underline-offset-2 hover:underline">
            Abrir oportunidade
          </Link>
        )}
        {apresentacaoId && (
          <Link
            href={`/clientes/${v.cliente_id}/apresentacoes/${apresentacaoId}`}
            className="underline-offset-2 hover:underline"
          >
            Abrir apresentação
          </Link>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="mt-6 rounded-lg border border-[#e4e0d9] bg-white p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[#5b6472]">Data / horário</dt>
            <dd className="font-medium">{formatDataHorario(v.data_visita, v.horario)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Origem</dt>
            <dd>{VISITA_CLIENTE_ORIGEM_LABELS[v.origem]}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#5b6472]">Solicitada em</dt>
            <dd>{formatDateTime(v.solicitada_em)}</dd>
          </div>
          {v.imovel_endereco && (
            <div>
              <dt className="text-xs text-[#5b6472]">Endereço</dt>
              <dd>{v.imovel_endereco}</dd>
            </div>
          )}
          {v.observacoes && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-[#5b6472]">Observações</dt>
              <dd className="whitespace-pre-line">{v.observacoes}</dd>
            </div>
          )}
        </dl>
      </section>

      {v.oportunidade_id && v.oportunidade_etapa && (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e4e0d9] bg-white p-4 text-sm">
          <p>
            Etapa da oportunidade:{" "}
            <span className={`rounded-full border px-2 py-0.5 text-xs ${ETAPA_COLORS[v.oportunidade_etapa]}`}>
              {ETAPA_LABELS[v.oportunidade_etapa]}
            </span>
          </p>
          {podeAvancar && avancar && (
            <form action={avancar}>
              <input type="hidden" name="voltar" value={`/visitas/${id}`} />
              <button
                type="submit"
                className="rounded-md border border-teal-300 px-3 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
              >
                Avançar oportunidade para Visita
              </button>
            </form>
          )}
        </section>
      )}

      {aberta && (
        <section className="mt-4 space-y-4 rounded-lg border border-[#e4e0d9] bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            {v.status === "solicitada" ? "Confirmar / agendar" : "Reagendar"}
          </h2>
          <form action={agendar} className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="data_visita" className={labelClass}>Data</label>
              <input
                id="data_visita"
                name="data_visita"
                type="date"
                required
                defaultValue={v.data_visita ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="horario" className={labelClass}>Horário</label>
              <input
                id="horario"
                name="horario"
                type="time"
                required
                defaultValue={v.horario?.slice(0, 5) ?? ""}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="observacoes" className={labelClass}>Observação (opcional)</label>
              <textarea
                id="observacoes"
                name="observacoes"
                rows={2}
                defaultValue={v.observacoes ?? ""}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
              >
                {v.status === "solicitada" ? "Agendar visita" : "Salvar novo horário"}
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-end gap-3 border-t border-[#e4e0d9] pt-4">
            <form action={cancelar} className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-[#5b6472]">
                Motivo do cancelamento (opcional)
                <input
                  name="motivo"
                  className="mt-0.5 block w-64 rounded-md border border-[#e4e0d9] px-2 py-1.5 text-sm"
                />
              </label>
              <button
                type="submit"
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
              >
                Cancelar visita
              </button>
            </form>
            {v.status === "agendada" && (
              <form action={naoCompareceu}>
                <button
                  type="submit"
                  className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#faf8f5]"
                >
                  Cliente não compareceu
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {podeResultado && (
        <section className="mt-4 space-y-4 rounded-lg border border-[#e4e0d9] bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            {v.status === "realizada" ? "Resultado e feedback" : "Registrar visita realizada"}
          </h2>
          {v.status !== "realizada" && (
            <p className="text-xs text-[#5b6472]">
              Ao salvar, a visita passa para <strong>Realizada</strong>.
            </p>
          )}
          <form action={resultado} className="space-y-4">
            <div>
              <label htmlFor="resultado" className={labelClass}>Resultado</label>
              <select
                id="resultado"
                name="resultado"
                required
                defaultValue={v.resultado ?? ""}
                className={inputClass}
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {VISITA_CLIENTE_RESULTADOS.map((r) => (
                  <option key={r} value={r}>
                    {VISITA_CLIENTE_RESULTADO_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            {(
              [
                ["pontos_positivos", "Pontos positivos", v.pontos_positivos],
                ["pontos_negativos", "Pontos negativos", v.pontos_negativos],
                ["observacoes_resultado", "Observações", v.observacoes_resultado],
                ["proximos_passos", "Próximos passos", v.proximos_passos],
              ] as const
            ).map(([name, label, valor]) => (
              <div key={name}>
                <label htmlFor={name} className={labelClass}>{label}</label>
                <textarea
                  id={name}
                  name={name}
                  rows={2}
                  defaultValue={valor ?? ""}
                  className={inputClass}
                />
              </div>
            ))}
            <button
              type="submit"
              className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
            >
              {v.status === "realizada" ? "Salvar feedback" : "Registrar visita realizada"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
