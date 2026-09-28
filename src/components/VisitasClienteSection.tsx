import Link from "next/link";
import { criarVisitaCliente } from "@/app/(app)/visitas/actions";
import {
  VISITA_CLIENTE_ORIGEM_LABELS,
  formatDataHorario,
} from "@/lib/visita-cliente";
import { VisitaResultadoTexto, VisitaStatusBadge } from "@/components/VisitaClienteBadges";
import type { VisitaClienteRow } from "@/lib/database.types";

const smallInput =
  "mt-0.5 block rounded-md border border-[#e4e0d9] px-2 py-1.5 text-sm focus:border-[#b8925a] focus:outline-none";

/** Visitas do cliente a este imóvel da curadoria (≠ visita prévia ETHEX). */
export function VisitasClienteSection({
  curadoriaId,
  clienteId,
  visitas,
}: {
  curadoriaId: string;
  clienteId: string;
  visitas: VisitaClienteRow[];
}) {
  const criar = criarVisitaCliente.bind(null, curadoriaId, clienteId);
  const temAberta = visitas.some(
    (v) => v.status === "solicitada" || v.status === "agendada"
  );

  return (
    <section className="mt-4 space-y-4 rounded-lg border border-[#e4e0d9] bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0b1f34]">
          Visitas com o cliente
        </h2>
        <p className="mt-1 text-xs text-[#5b6472]">
          Cliente visita o imóvel acompanhado pelo consultor. Não altera a
          etapa da oportunidade.
        </p>
      </div>

      {visitas.length === 0 ? (
        <p className="text-sm text-[#5b6472]">Nenhuma visita com o cliente ainda.</p>
      ) : (
        <ul className="divide-y divide-[#e4e0d9] text-sm">
          {visitas.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <VisitaStatusBadge status={v.status} />
                  <span>{formatDataHorario(v.data_visita, v.horario)}</span>
                </p>
                <p className="text-xs text-[#5b6472]">
                  {VISITA_CLIENTE_ORIGEM_LABELS[v.origem]} · Resultado:{" "}
                  <VisitaResultadoTexto resultado={v.resultado} />
                </p>
              </div>
              <Link
                href={`/visitas/${v.id}`}
                className="rounded-md border border-[#e4e0d9] px-2.5 py-1 text-xs hover:bg-[#faf8f5]"
              >
                Abrir
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!temAberta && (
        <form action={criar} className="flex flex-wrap items-end gap-2 border-t border-[#e4e0d9] pt-4">
          <label className="text-xs text-[#5b6472]">
            Data
            <input type="date" name="data_visita" className={smallInput} />
          </label>
          <label className="text-xs text-[#5b6472]">
            Horário
            <input type="time" name="horario" className={smallInput} />
          </label>
          <label className="text-xs text-[#5b6472]">
            Observação
            <input name="observacoes" placeholder="opcional" className={`${smallInput} w-48`} />
          </label>
          <button
            type="submit"
            className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
          >
            Registrar visita
          </button>
          <p className="w-full text-xs text-[#5b6472]">
            Com data e horário: já fica agendada. Sem: fica como solicitação.
          </p>
        </form>
      )}
    </section>
  );
}
