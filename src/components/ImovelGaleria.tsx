import Link from "next/link";
import type { MidiaImovel, OrigemMidia } from "@/lib/midias-imovel";

const ORIGEM_COLORS: Record<OrigemMidia, string> = {
  visita: "bg-emerald-600/90",
  propria: "bg-sky-600/90",
  anuncio: "bg-neutral-700/80",
};

export function ImovelGaleria({
  midias,
  visitaHref,
}: {
  midias: MidiaImovel[];
  /** Monta o link do relatório da visita a partir do id (opcional). */
  visitaHref?: (visitaId: string) => string;
}) {
  if (midias.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-[#e4e0d9] bg-[#faf8f5] text-sm text-[#5b6472]">
        Nenhuma foto ainda — adicione no relatório da visita prévia ou em
        “Mídia própria”.
      </div>
    );
  }

  const contagem = {
    visita: midias.filter((m) => m.origem === "visita").length,
    propria: midias.filter((m) => m.origem === "propria").length,
    anuncio: midias.filter((m) => m.origem === "anuncio").length,
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {midias.map((m, i) => (
          <figure
            key={m.url}
            className={`group relative overflow-hidden rounded-md bg-[#efe9e0] ${
              i === 0 ? "col-span-2 row-span-2" : "aspect-[4/3]"
            }`}
          >
            {m.video ? (
              <video
                src={m.url}
                controls
                preload="metadata"
                className="h-full w-full bg-black object-cover"
              />
            ) : (
              <a href={m.url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.descricao ?? m.legenda}
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              </a>
            )}
            <figcaption
              className={`pointer-events-none absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${ORIGEM_COLORS[m.origem]}`}
            >
              {m.legenda}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-[#5b6472]">
        {contagem.visita > 0 && <span>{contagem.visita} da visita prévia</span>}
        {contagem.propria > 0 && <span>{contagem.propria} de mídia própria</span>}
        {contagem.anuncio > 0 && <span>{contagem.anuncio} do anúncio</span>}
        {visitaHref &&
          [...new Set(midias.map((m) => m.visitaId).filter(Boolean))].map(
            (vid, idx) => (
              <Link
                key={vid}
                href={visitaHref(vid as string)}
                className="text-[#0b1f34] hover:underline"
              >
                {idx === 0 ? "Gerenciar fotos da visita →" : `Outra visita →`}
              </Link>
            )
          )}
      </p>
    </div>
  );
}
