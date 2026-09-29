import Link from "next/link";
import { attachImovelToCliente } from "@/app/(app)/imoveis/actions";
import { StatusConstrucaoBadge } from "@/components/StatusConstrucao";
import { DiferenciaisTags } from "@/components/CaracteristicasImovel";
import { resumoQuantitativo } from "@/lib/imovel-caracteristicas";
import { tituloImovel } from "@/lib/imovel-titulo";
import type { ImovelRow } from "@/lib/database.types";

export function CatalogImovelCard({
  imovel,
  clientes,
}: {
  imovel: ImovelRow;
  clientes: { id: string; nome: string }[];
}) {
  const imagem = imovel.midia_propria?.[0] ?? imovel.caracteristicas?.imagem_anuncio;
  const titulo = tituloImovel(imovel);
  const acao = attachImovelToCliente.bind(null, imovel.id);

  return (
    <div className="flex gap-4 rounded-lg border border-[#e4e0d9] bg-white p-4">
      <Link
        href={`/imoveis/${imovel.id}`}
        className="h-24 w-32 shrink-0 overflow-hidden rounded-md bg-[#efe9e0]"
      >
        {imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagem} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[#5b6472]">
            sem imagem
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/imoveis/${imovel.id}`}
          className="font-medium text-[#0b1f34] hover:underline"
        >
          {titulo}
        </Link>
        <p className="text-xs text-[#5b6472]">
          {imovel.fonte} ·{" "}
          <a
            href={imovel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Ver anúncio ↗
          </a>
        </p>
        {imovel.status_construcao && (
          <div className="mt-1">
            <StatusConstrucaoBadge status={imovel.status_construcao} />
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5b6472]">
          {imovel.preco != null && (
            <span>
              {imovel.preco.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          )}
          {resumoQuantitativo(imovel).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <DiferenciaisTags imovel={imovel} />

        {imovel.endereco_texto && (
          <p className="mt-1 text-xs text-[#5b6472]">{imovel.endereco_texto}</p>
        )}

        {(imovel.nome_contato || imovel.telefone_contato) && (
          <p className="mt-1 text-xs text-[#5b6472]">
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
            className="rounded-md border border-[#e4e0d9] px-2 py-1.5 text-xs focus:border-[#b8925a] focus:outline-none"
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
            className="rounded-md border border-[#e4e0d9] px-2.5 py-1 text-xs hover:bg-[#efe9e0]"
          >
            Associar
          </button>
        </form>
      </div>
    </div>
  );
}
