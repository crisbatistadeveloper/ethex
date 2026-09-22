import Link from "next/link";
import { updateStatusCuradoria } from "@/app/(app)/clientes/[id]/imoveis/actions";
import type { ImovelComCuradoria } from "@/lib/database.types";

const STATUS_LABELS: Record<ImovelComCuradoria["status_curadoria"], string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const STATUS_COLORS: Record<ImovelComCuradoria["status_curadoria"], string> = {
  pendente: "bg-amber-100 text-amber-800 border-amber-300",
  aprovado: "bg-green-100 text-green-800 border-green-300",
  rejeitado: "bg-red-100 text-red-800 border-red-300",
};

export function ImovelCard({
  imovel,
  clienteId,
}: {
  imovel: ImovelComCuradoria;
  clienteId: string;
}) {
  const imagem = imovel.midia_propria?.[0] ?? imovel.caracteristicas?.imagem_anuncio;
  const titulo = imovel.caracteristicas?.titulo ?? imovel.fonte;
  const acao = updateStatusCuradoria.bind(null, imovel.curadoria_id, clienteId);

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
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/clientes/${clienteId}/imoveis/${imovel.curadoria_id}`}
              className="font-medium text-neutral-900 hover:underline"
            >
              {titulo}
            </Link>
            <p className="text-xs text-neutral-500">{imovel.fonte}</p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[imovel.status_curadoria]}`}
          >
            {STATUS_LABELS[imovel.status_curadoria]}
          </span>
        </div>

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

        {imovel.comissao_combinada && (
          <p className="mt-1 text-xs font-medium text-green-700">
            ✓ Comissão combinada
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <form action={acao}>
            <input type="hidden" name="status" value="aprovado" />
            <button
              type="submit"
              className="rounded-md border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
            >
              Aprovar
            </button>
          </form>
          <form action={acao}>
            <input type="hidden" name="status" value="rejeitado" />
            <button
              type="submit"
              className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Rejeitar
            </button>
          </form>
          <a
            href={imovel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100"
          >
            Ver anúncio
          </a>
        </div>
      </div>
    </div>
  );
}
