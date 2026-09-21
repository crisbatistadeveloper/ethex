import { attachImovelToCliente } from "@/app/(app)/imoveis/actions";
import type { ImovelRow } from "@/lib/database.types";

export function CatalogImovelCard({
  imovel,
  clientes,
}: {
  imovel: ImovelRow;
  clientes: { id: string; nome: string }[];
}) {
  const imagem = imovel.midia_propria?.[0] ?? imovel.caracteristicas?.imagem_anuncio;
  const titulo = imovel.caracteristicas?.titulo ?? imovel.fonte;
  const acao = attachImovelToCliente.bind(null, imovel.id);

  return (
    <div className="flex gap-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="h-24 w-32 shrink-0 overflow-hidden rounded-md bg-neutral-100">
        {imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagem} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
            sem imagem
          </div>
        )}
      </div>

      <div className="flex-1">
        <a
          href={imovel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-neutral-900 hover:underline"
        >
          {titulo}
        </a>
        <p className="text-xs text-neutral-500">{imovel.fonte}</p>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
          {imovel.preco != null && (
            <span>
              {imovel.preco.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          )}
          {imovel.caracteristicas?.m2 && (
            <span>{imovel.caracteristicas.m2.toLocaleString("pt-BR")} m²</span>
          )}
          {imovel.caracteristicas?.quartos && (
            <span>{imovel.caracteristicas.quartos} quartos</span>
          )}
          {imovel.caracteristicas?.vagas && (
            <span>{imovel.caracteristicas.vagas} vagas</span>
          )}
        </div>

        {imovel.endereco_texto && (
          <p className="mt-1 text-xs text-neutral-500">{imovel.endereco_texto}</p>
        )}

        {(imovel.nome_contato || imovel.telefone_contato) && (
          <p className="mt-1 text-xs text-neutral-500">
            Contato: {[imovel.nome_contato, imovel.telefone_contato]
              .filter(Boolean)
              .join(" · ")}
            {imovel.tipo_contato ? ` (${imovel.tipo_contato})` : ""}
          </p>
        )}

        <form action={acao} className="mt-3 flex items-center gap-2">
          <select
            name="clienteId"
            required
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs focus:border-neutral-500 focus:outline-none"
          >
            <option value="">Associar a um cliente...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100"
          >
            Associar
          </button>
        </form>
      </div>
    </div>
  );
}
