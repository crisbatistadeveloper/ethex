import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/auth";
import { ORIGENS_LEAD_MANUAL, origemLeadLabel } from "@/lib/labels";
import { createLead } from "../actions";

const INPUT =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";

export default async function NovoLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const usuarioAtual = await getUsuarioAtual();
  const isAdmin = usuarioAtual?.papel === "admin";

  const supabase = await createClient();
  const { data: consultores } = isAdmin
    ? await supabase
        .from("usuario")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome")
    : { data: null };

  return (
    <div className="max-w-lg">
      <Link href="/leads" className="text-sm text-[#5b6472] hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Novo lead</h1>
      <p className="mt-1 text-sm text-[#5b6472]">
        Para leads que chegam por WhatsApp, telefone, indicação, plantão ou
        outros canais. Depois, converta em cliente pela lista de leads.
      </p>

      <form
        action={createLead}
        className="mt-6 space-y-4 rounded-lg border border-[#e4e0d9] bg-white p-6"
      >
        <div>
          <label htmlFor="nome" className="block text-sm font-medium">
            Nome *
          </label>
          <input id="nome" name="nome" required className={INPUT} />
        </div>

        <div>
          <label htmlFor="telefone" className="block text-sm font-medium">
            Telefone
          </label>
          <input id="telefone" name="telefone" className={INPUT} />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            E-mail
          </label>
          <input id="email" name="email" type="email" className={INPUT} />
          <p className="mt-1 text-xs text-[#5b6472]">
            Informe telefone ou e-mail.
          </p>
        </div>

        <div>
          <label htmlFor="origem" className="block text-sm font-medium">
            Origem *
          </label>
          <select id="origem" name="origem" required defaultValue="" className={INPUT}>
            <option value="" disabled>
              Selecione...
            </option>
            {ORIGENS_LEAD_MANUAL.map((o) => (
              <option key={o} value={o}>
                {origemLeadLabel(o)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="consultorId" className="block text-sm font-medium">
            Consultor responsável
          </label>
          {isAdmin ? (
            <select
              id="consultorId"
              name="consultorId"
              defaultValue=""
              className={INPUT}
            >
              <option value="">Sem responsável (atribuir depois)</option>
              {consultores?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm text-[#0b1f34]">
              {usuarioAtual?.nome} (você)
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-[#d6b072] px-3 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
        >
          Criar lead
        </button>
      </form>
    </div>
  );
}
