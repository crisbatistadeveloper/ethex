import Link from "next/link";
import { updateStatusCuradoria } from "@/app/(app)/clientes/[id]/imoveis/actions";
import { toggleSelecaoApresentacao } from "@/app/(app)/clientes/[id]/apresentacoes/actions";
import { registrarDecisaoImovel } from "@/app/(app)/negociacoes/actions";
import { StatusConstrucaoBadge } from "@/components/StatusConstrucao";
import { DiferenciaisTags } from "@/components/CaracteristicasImovel";
import { resumoQuantitativo } from "@/lib/imovel-caracteristicas";
import { tituloImovel } from "@/lib/imovel-titulo";
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

export interface EscolhaImovelCard {
  escolhido: boolean;
  /** Título do outro imóvel já escolhido nesta oportunidade, se houver. */
  outroEscolhidoTitulo: string | null;
  /** Rota para onde a action volta após salvar. */
  voltar: string;
  /** false quando a oportunidade não está aberta (só exibe o destaque). */
  editavel: boolean;
}

export function ImovelCard({
  imovel,
  clienteId,
  escolha,
}: {
  imovel: ImovelComCuradoria;
  clienteId: string;
  escolha?: EscolhaImovelCard;
}) {
  const decidir = registrarDecisaoImovel.bind(null, imovel.curadoria_id, clienteId);
  const escolhido = Boolean(escolha?.escolhido);
  const imagem = imovel.midia_propria?.[0] ?? imovel.caracteristicas?.imagem_anuncio;
  const titulo = tituloImovel(imovel);
  const acao = updateStatusCuradoria.bind(null, imovel.curadoria_id, clienteId);
  const selecaoAcao = toggleSelecaoApresentacao.bind(
    null,
    imovel.curadoria_id,
    clienteId
  );
  const selecionado = Boolean(imovel.selecionado_apresentacao);

  return (
    <div
      className={`relative flex gap-4 rounded-lg border bg-white p-4 ${
        escolhido
          ? "border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-200"
          : "border-[#e4e0d9]"
      }`}
    >
      {escolhido && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
          ✓ Imóvel escolhido pelo cliente
        </span>
      )}
      <div className="h-24 w-32 shrink-0 overflow-hidden rounded-md bg-[#efe9e0]">
        {imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagem} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[#5b6472]">
            sem imagem
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/clientes/${clienteId}/imoveis/${imovel.curadoria_id}`}
              className="font-medium text-[#0b1f34] hover:underline"
            >
              {titulo}
            </Link>
            <p className="text-xs text-[#5b6472]">{imovel.fonte}</p>
            {imovel.status_construcao && (
              <div className="mt-1">
                <StatusConstrucaoBadge status={imovel.status_construcao} />
              </div>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[imovel.status_curadoria]}`}
          >
            {STATUS_LABELS[imovel.status_curadoria]}
          </span>
        </div>

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

        {imovel.comissao_combinada && (
          <p className="mt-1 text-xs font-medium text-green-700">
            ✓ Comissão combinada
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <form action={selecaoAcao}>
            <input type="hidden" name="selecionado" value={selecionado ? "0" : "1"} />
            <button
              type="submit"
              className={
                selecionado
                  ? "rounded-md border border-amber-400 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                  : "rounded-md border border-[#e4e0d9] px-2.5 py-1 text-xs hover:bg-[#efe9e0]"
              }
            >
              {selecionado ? "★ Selecionado p/ apresentação" : "☆ Selecionar p/ apresentação"}
            </button>
          </form>
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
            className="rounded-md border border-[#e4e0d9] px-2.5 py-1 text-xs hover:bg-[#efe9e0]"
          >
            Ver anúncio
          </a>
          {escolha?.editavel && (
            <form action={decidir} className="contents">
              <input type="hidden" name="voltar" value={escolha.voltar} />
              <input
                type="hidden"
                name="decisao"
                value={escolhido ? "em_consideracao" : "escolhido"}
              />
              <button
                type="submit"
                title={
                  !escolhido && escolha.outroEscolhidoTitulo
                    ? `“${escolha.outroEscolhidoTitulo}” deixará de ser o escolhido`
                    : undefined
                }
                className={
                  escolhido
                    ? "rounded-md border border-[#e4e0d9] px-2.5 py-1 text-xs text-[#5b6472] hover:bg-[#efe9e0]"
                    : "rounded-md border border-emerald-500 bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                }
              >
                {escolhido ? "Desfazer escolha" : "✓ Confirmar como escolhido"}
              </button>
            </form>
          )}
        </div>
        {escolha?.editavel && !escolhido && escolha.outroEscolhidoTitulo && (
          <p className="mt-1.5 text-[11px] text-[#5b6472]">
            Ao confirmar, “{escolha.outroEscolhidoTitulo}” volta para “Em
            consideração”.
          </p>
        )}
      </div>
    </div>
  );
}
