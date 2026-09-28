import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/auth";
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
  const usuario = await getUsuarioAtual();
  const supabase = await createClient();
  const { data: clientes, error } = await supabase
    .from("cliente")
    .select("id, nome, status, atualizado_em, perfil(finalidade)")
    .order("atualizado_em", { ascending: false })
    .returns<ClienteListItem[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0b1f34]">
          {usuario?.papel === "admin" ? "Todos os clientes" : "Meus clientes"}
        </h1>
        <Link
          href="/clientes/novo"
          className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-semibold text-[#0b1f34] hover:brightness-105"
        >
          Novo cliente
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-[#e4e0d9] bg-white">
        {error && (
          <p className="p-4 text-sm text-red-700">
            Erro ao carregar clientes: {error.message}
          </p>
        )}

        {!error && (!clientes || clientes.length === 0) && (
          <p className="p-8 text-center text-sm text-[#5b6472]">
            Nenhum cliente cadastrado ainda.
          </p>
        )}

        {!error && clientes && clientes.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e4e0d9] bg-[#faf8f5] text-[#5b6472]">
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
                    className="border-b border-[#e4e0d9] last:border-0 hover:bg-[#faf8f5]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="font-medium text-[#0b1f34] hover:underline"
                      >
                        {cliente.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#5b6472]">
                      {finalidade ? FINALIDADE_LABELS[finalidade] : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[cliente.status]}`}
                      >
                        {STATUS_LABELS[cliente.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5b6472]">
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
