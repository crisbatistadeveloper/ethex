import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FINALIDADE_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/labels";
import type { ClienteStatus, Finalidade } from "@/lib/database.types";

interface ClienteListItem {
  id: string;
  nome: string;
  status: ClienteStatus;
  atualizado_em: string;
  perfil: { finalidade: Finalidade }[] | null;
}

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes, error } = await supabase
    .from("cliente")
    .select("id, nome, status, atualizado_em, perfil(finalidade)")
    .order("atualizado_em", { ascending: false })
    .returns<ClienteListItem[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Link
          href="/clientes/novo"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Novo cliente
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {error && (
          <p className="p-4 text-sm text-red-700">
            Erro ao carregar clientes: {error.message}
          </p>
        )}

        {!error && (!clientes || clientes.length === 0) && (
          <p className="p-8 text-center text-sm text-neutral-500">
            Nenhum cliente cadastrado ainda.
          </p>
        )}

        {!error && clientes && clientes.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Finalidade</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Última atualização</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => {
                const finalidade = cliente.perfil?.[0]?.finalidade;
                return (
                  <tr
                    key={cliente.id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {cliente.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {finalidade ? FINALIDADE_LABELS[finalidade] : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[cliente.status]}`}
                      >
                        {STATUS_LABELS[cliente.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(cliente.atualizado_em).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
