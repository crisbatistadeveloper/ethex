import { createClient } from "@/lib/supabase/server";
import { CatalogImovelCard } from "@/components/CatalogImovelCard";
import type { ImovelRow } from "@/lib/database.types";

const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "block text-xs font-medium text-neutral-500";

export default async function CatalogoImoveisPage({
  searchParams,
}: {
  searchParams: Promise<{
    regiao?: string;
    preco_min?: string;
    preco_max?: string;
    error?: string;
  }>;
}) {
  const { regiao, preco_min, preco_max, error } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("imovel")
    .select("*")
    .order("atualizado_em", { ascending: false })
    .limit(100);

  if (regiao) query = query.ilike("endereco_texto", `%${regiao}%`);
  if (preco_min) query = query.gte("preco", Number(preco_min));
  if (preco_max) query = query.lte("preco", Number(preco_max));

  const { data: imoveis } = await query.returns<ImovelRow[]>();

  const { data: clientes } = await supabase
    .from("cliente")
    .select("id, nome")
    .order("nome");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Catálogo de imóveis</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Todos os imóveis já salvos, de qualquer cliente. Reaproveite um imóvel
        já visitado associando-o a um novo cliente.
      </p>

      <form
        method="get"
        className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-4"
      >
        <div>
          <label className={labelClass}>Região / endereço</label>
          <input
            name="regiao"
            defaultValue={regiao ?? ""}
            placeholder="Ex: Ipatinga"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Preço mínimo</label>
          <input
            type="number"
            name="preco_min"
            min={0}
            defaultValue={preco_min ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Preço máximo</label>
          <input
            type="number"
            name="preco_max"
            min={0}
            defaultValue={preco_max ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Filtrar
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {(!imoveis || imoveis.length === 0) && (
          <p className="text-sm text-neutral-500">
            Nenhum imóvel encontrado com esses filtros.
          </p>
        )}
        {imoveis?.map((imovel) => (
          <CatalogImovelCard
            key={imovel.id}
            imovel={imovel}
            clientes={clientes ?? []}
          />
        ))}
      </div>
    </div>
  );
}
