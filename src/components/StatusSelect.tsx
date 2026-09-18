import { updateClienteStatus } from "@/app/(app)/clientes/actions";
import { STATUS_LABELS } from "@/lib/labels";
import type { ClienteStatus } from "@/lib/database.types";

const STATUS_ORDER: ClienteStatus[] = [
  "em_entrevista",
  "em_busca",
  "em_curadoria",
  "fechado",
];

export function StatusSelect({
  clienteId,
  status,
}: {
  clienteId: string;
  status: ClienteStatus;
}) {
  const action = updateClienteStatus.bind(null, clienteId);

  return (
    <form action={action} className="flex items-center gap-2">
      <select
        name="status"
        defaultValue={status}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
      >
        {STATUS_ORDER.map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
      >
        Atualizar
      </button>
    </form>
  );
}
