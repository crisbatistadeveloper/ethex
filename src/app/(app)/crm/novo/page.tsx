import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createOportunidade } from "@/app/(app)/crm/actions";
import { PIPELINE_ETAPAS, ETAPA_LABELS } from "@/lib/crm";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-sm font-medium text-[#0b1f34]";

export default async function NovaOportunidadePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cliente?: string }>;
}) {
  const { error, cliente: clientePrefill } = await searchParams;
  const supabase = await createClient();

  const { data: clientes } = await supabase
    .from("cliente")
    .select("id, nome")
    .order("nome");

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/crm" className="text-sm text-[#5b6472] hover:underline">
        ← CRM
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Nova oportunidade</h1>
      <p className="mt-1 text-sm text-[#5b6472]">
        Camada comercial sobre um cliente já cadastrado. Não substitui a
        entrevista nem a busca.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={createOportunidade} className="mt-6 space-y-4">
        <div>
          <label htmlFor="cliente_id" className={labelClass}>
            Cliente
          </label>
          <select
            id="cliente_id"
            name="cliente_id"
            required
            defaultValue={clientePrefill ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {(clientes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="titulo" className={labelClass}>
            Título
          </label>
          <input
            id="titulo"
            name="titulo"
            required
            className={inputClass}
            placeholder="Ex.: Compra moradia — zona sul"
          />
        </div>

        <div>
          <label htmlFor="etapa" className={labelClass}>
            Etapa inicial
          </label>
          <select
            id="etapa"
            name="etapa"
            defaultValue="novo_lead"
            className={inputClass}
          >
            {PIPELINE_ETAPAS.map((e) => (
              <option key={e} value={e}>
                {ETAPA_LABELS[e]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="valor_estimado" className={labelClass}>
            Valor estimado (R$)
          </label>
          <input
            id="valor_estimado"
            name="valor_estimado"
            type="number"
            min={0}
            step={1000}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="observacoes" className={labelClass}>
            Observações
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
        >
          Criar oportunidade
        </button>
      </form>
    </div>
  );
}
