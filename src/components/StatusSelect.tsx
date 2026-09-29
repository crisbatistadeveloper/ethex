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
    <form action={action} className="flex flex-wrap items-center gap-2">
      <select
        name="status"
        defaultValue={status}
        className="min-w-0 flex-1 rounded-md border border-[#e4e0d9] px-2 py-1.5 text-sm focus:border-[#b8925a] focus:outline-none"
      >
        {STATUS_ORDER.map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="shrink-0 rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#efe9e0]"
      >
        Atualizar
      </button>
    </form>
  );
}
