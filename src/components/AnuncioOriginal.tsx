import { tituloAnuncio, type ImovelParaTitulo } from "@/lib/imovel-titulo";

/** Título original do anúncio (imobiliária/portal) — referência interna para a parceria. */
export function AnuncioOriginal({ imovel }: { imovel: ImovelParaTitulo & { fonte?: string | null } }) {
  const titulo = tituloAnuncio(imovel);
  if (!titulo && !imovel.fonte) return null;
  return (
    <p className="mt-1 text-xs text-[#5b6472]">
      <span className="font-medium text-[#5b6472]">Anúncio original (uso interno):</span>{" "}
      {titulo ?? "—"}
      {imovel.fonte ? ` · ${imovel.fonte}` : ""}
    </p>
  );
}
