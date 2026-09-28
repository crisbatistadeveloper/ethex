import {
  VISITA_CLIENTE_RESULTADO_LABELS,
  VISITA_CLIENTE_STATUS_COLORS,
  VISITA_CLIENTE_STATUS_LABELS,
} from "@/lib/visita-cliente";
import type {
  VisitaClienteResultado,
  VisitaClienteStatus,
} from "@/lib/database.types";

export function VisitaStatusBadge({ status }: { status: VisitaClienteStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${VISITA_CLIENTE_STATUS_COLORS[status]}`}
    >
      {VISITA_CLIENTE_STATUS_LABELS[status]}
    </span>
  );
}

export function VisitaResultadoTexto({
  resultado,
}: {
  resultado: VisitaClienteResultado | null;
}) {
  if (!resultado) return <span className="text-[#5b6472]">—</span>;
  return <span className="font-medium">{VISITA_CLIENTE_RESULTADO_LABELS[resultado]}</span>;
}
