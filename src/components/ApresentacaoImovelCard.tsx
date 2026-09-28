import {
  RECOMENDACAO_TEXTO,
  estrelas,
  formatPreco,
  type ApresentacaoImovelConteudo,
} from "@/lib/apresentacao";
import { DUE_DILIGENCE_STATUS_LABELS } from "@/lib/due-diligence";
import { STATUS_CONSTRUCAO_LABELS } from "@/lib/labels";
import { resumoQuantitativo } from "@/lib/imovel-caracteristicas";
import { DiferenciaisTags } from "@/components/CaracteristicasImovel";

const DUE_DILIGENCE_TEXTO_CLIENTE: Partial<
  Record<NonNullable<ApresentacaoImovelConteudo["due_diligence_status"]>, string>
> = {
  aprovado: "Documentação preliminar analisada pela ETHEX",
  aprovado_com_ressalvas:
    "Documentação preliminar analisada pela ETHEX, com ressalvas",
};

export function ApresentacaoImovelCard({
  conteudo,
  posicao,
  destaque,
  observacao,
  visao,
  children,
}: {
  conteudo: ApresentacaoImovelConteudo;
  posicao: number;
  destaque: boolean;
  observacao: string | null;
  visao: "interna" | "cliente";
  children?: React.ReactNode;
}) {
  const preco = formatPreco(conteudo.preco);
  const [capa, ...demaisFotos] = conteudo.fotos;
  const caracteristicas = [
    conteudo.status_construcao
      ? STATUS_CONSTRUCAO_LABELS[conteudo.status_construcao]
      : null,
    ...resumoQuantitativo(conteudo.estrutura),
  ].filter(Boolean);
  const mapsUrl =
    conteudo.latitude != null && conteudo.longitude != null
      ? `https://www.google.com/maps?q=${conteudo.latitude},${conteudo.longitude}`
      : conteudo.endereco_texto
        ? `https://www.google.com/maps/search/${encodeURIComponent(conteudo.endereco_texto)}`
        : null;
  const ddTexto =
    conteudo.due_diligence_status == null
      ? null
      : visao === "cliente"
        ? (DUE_DILIGENCE_TEXTO_CLIENTE[conteudo.due_diligence_status] ?? null)
        : `Due diligence: ${DUE_DILIGENCE_STATUS_LABELS[conteudo.due_diligence_status]}`;

  return (
    <article
      className={`overflow-hidden rounded-lg border bg-white ${
        destaque ? "border-amber-400 ring-1 ring-amber-300" : "border-[#e4e0d9]"
      }`}
    >
      {capa ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={capa} alt="" className="h-64 w-full object-cover sm:h-80" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-[#efe9e0] text-sm text-[#5b6472]">
          sem imagem
        </div>
      )}

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#5b6472]">
              Opção {posicao}
              {destaque && (
                <span className="ml-2 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800">
                  Destaque ETHEX
                </span>
              )}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{conteudo.titulo}</h2>
            {preco && <p className="mt-1 text-lg font-medium">{preco}</p>}
          </div>
          {conteudo.recomendacao && (
            <div className="text-right">
              <p className="text-lg leading-none text-amber-500">
                {estrelas(conteudo.recomendacao)}
              </p>
              <p className="mt-1 text-xs text-[#5b6472]">
                {RECOMENDACAO_TEXTO[conteudo.recomendacao]}
              </p>
            </div>
          )}
        </div>

        {caracteristicas.length > 0 && (
          <p className="text-sm text-[#0b1f34]">{caracteristicas.join(" · ")}</p>
        )}
        <DiferenciaisTags imovel={conteudo.estrutura} />

        {conteudo.endereco_texto && (
          <p className="text-sm text-[#5b6472]">
            📍 {conteudo.endereco_texto}
            {mapsUrl && (
              <>
                {" "}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5b6472] underline hover:text-[#0b1f34]"
                >
                  ver no mapa
                </a>
              </>
            )}
          </p>
        )}

        {conteudo.descricao && (
          <p className="whitespace-pre-line text-sm text-[#5b6472]">
            {conteudo.descricao}
          </p>
        )}

        {demaisFotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {demaisFotos.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden rounded-md bg-[#efe9e0]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        )}

        {conteudo.videos.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {conteudo.videos.map((url) => (
              <video
                key={url}
                src={url}
                controls
                preload="metadata"
                className="w-full rounded-md bg-black"
              />
            ))}
          </div>
        )}

        {(observacao ||
          conteudo.avaliacao_geral ||
          conteudo.pontos_positivos ||
          conteudo.pontos_negativos) && (
          <div className="space-y-2 rounded-md border border-[#e4e0d9] bg-[#faf8f5] p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5b6472]">
              Observações da ETHEX
            </p>
            {observacao && <p className="whitespace-pre-line">{observacao}</p>}
            {conteudo.avaliacao_geral && (
              <p className="whitespace-pre-line text-[#0b1f34]">
                {conteudo.avaliacao_geral}
              </p>
            )}
            {conteudo.pontos_positivos && (
              <p className="whitespace-pre-line">
                <span className="font-medium text-green-700">Pontos positivos: </span>
                {conteudo.pontos_positivos}
              </p>
            )}
            {conteudo.pontos_negativos && (
              <p className="whitespace-pre-line">
                <span className="font-medium text-red-700">Pontos de atenção: </span>
                {conteudo.pontos_negativos}
              </p>
            )}
            {conteudo.visita_data && (
              <p className="text-xs text-[#5b6472]">
                Visitado pela ETHEX em{" "}
                {new Date(conteudo.visita_data).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        )}

        {ddTexto && <p className="text-xs text-[#5b6472]">✓ {ddTexto}</p>}

        {children}
      </div>
    </article>
  );
}
