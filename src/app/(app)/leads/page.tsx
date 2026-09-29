import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/auth";
import {
  FINALIDADE_LABELS,
  formatFaixaValores,
  origemLeadLabel,
} from "@/lib/labels";
import { assignLead, convertLead, descartarLead } from "./actions";
import type { LeadRow } from "@/lib/database.types";

const STATUS_LABELS: Record<LeadRow["status"], string> = {
  novo: "Novo",
  atribuido: "Atribuído",
  convertido: "Convertido",
  descartado: "Descartado",
};

const STATUS_COLORS: Record<LeadRow["status"], string> = {
  novo: "bg-blue-100 text-blue-800 border-blue-300",
  atribuido: "bg-amber-100 text-amber-800 border-amber-300",
  convertido: "bg-green-100 text-green-800 border-green-300",
  descartado: "bg-[#efe9e0] text-[#5b6472] border-[#e4e0d9]",
};

interface LeadComConsultor extends LeadRow {
  usuario: { nome: string } | null;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sucesso?: string }>;
}) {
  const { error, sucesso } = await searchParams;
  const usuarioAtual = await getUsuarioAtual();
  const supabase = await createClient();
  const isAdmin = usuarioAtual?.papel === "admin";

  const { data: leads } = await supabase
    .from("lead")
    .select("*, usuario:consultor_id(nome)")
    .order("criado_em", { ascending: false })
    .returns<LeadComConsultor[]>();

  const { data: consultores } = isAdmin
    ? await supabase.from("usuario").select("id, nome").order("nome")
    : { data: null };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {isAdmin ? "Leads" : "Meus leads"}
        </h1>
        <Link
          href="/leads/novo"
          className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
        >
          + Novo Lead
        </Link>
      </div>
      <p className="mt-1 text-sm text-[#5b6472]">
        {isAdmin
          ? "Captados pela landing page ou cadastrados manualmente. Atribua a um consultor para iniciar o contato."
          : "Leads atribuídos a você. Converta em cliente para iniciar a entrevista."}
      </p>

      {sucesso && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {sucesso}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {(!leads || leads.length === 0) && (
          <p className="text-sm text-[#5b6472]">Nenhum lead por aqui.</p>
        )}

        {leads?.map((lead) => (
          <div
            key={lead.id}
            className="rounded-lg border border-[#e4e0d9] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-[#0b1f34]">
                  {lead.nome || lead.email}
                </p>
                <p className="text-xs text-[#5b6472]">
                  {[lead.email, lead.telefone].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status]}`}
              >
                {STATUS_LABELS[lead.status]}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5b6472]">
              {lead.finalidade && <span>{FINALIDADE_LABELS[lead.finalidade]}</span>}
              <span>{formatFaixaValores(lead.orcamento_min, lead.orcamento_max)}</span>
              <span>Origem: {origemLeadLabel(lead.origem)}</span>
              {lead.usuario && <span>Consultor: {lead.usuario.nome}</span>}
            </div>

            {isAdmin && lead.status !== "convertido" && (
              <form
                action={assignLead.bind(null, lead.id)}
                className="mt-3 flex flex-wrap items-center gap-2"
              >
                <select
                  name="consultorId"
                  defaultValue={lead.consultor_id ?? ""}
                  className="min-w-0 flex-1 rounded-md border border-[#e4e0d9] px-2 py-1.5 text-xs focus:border-[#b8925a] focus:outline-none"
                >
                  <option value="">Atribuir a...</option>
                  {consultores?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="shrink-0 rounded-md border border-[#e4e0d9] px-2.5 py-1 text-xs hover:bg-[#efe9e0]"
                >
                  Atribuir
                </button>
              </form>
            )}

            {lead.status === "atribuido" && (
              <div className="mt-3 flex gap-2">
                <form action={convertLead.bind(null, lead.id)}>
                  <button
                    type="submit"
                    className="rounded-md bg-[#d6b072] px-2.5 py-1 text-xs font-medium text-[#0b1f34] hover:brightness-105"
                  >
                    Converter em cliente
                  </button>
                </form>
                <form action={descartarLead.bind(null, lead.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Descartar
                  </button>
                </form>
              </div>
            )}

            {lead.status === "convertido" && lead.cliente_id && (
              <Link
                href={`/clientes/${lead.cliente_id}`}
                className="mt-3 inline-block text-xs text-[#5b6472] hover:underline"
              >
                Ver cliente →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
