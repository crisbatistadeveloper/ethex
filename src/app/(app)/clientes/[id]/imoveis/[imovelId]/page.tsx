import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddressMapPicker } from "@/components/AddressMapPickerLoader";
import { AreaInput } from "@/components/AreaInput";
import { CurrencyInput } from "@/components/CurrencyInput";
import { MediaUploader } from "@/components/MediaUploader";
import { updateImovel, updateStatusCuradoria } from "../actions";
import type { CuradoriaStatus, ImovelRow } from "@/lib/database.types";

const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "block text-sm font-medium text-neutral-700";

interface CuradoriaComImovel {
  id: string;
  status_curadoria: CuradoriaStatus;
  imovel: ImovelRow;
}

export default async function ImovelDetalhePage({
  params,
}: {
  params: Promise<{ id: string; imovelId: string }>;
}) {
  const { id, imovelId } = await params;
  const supabase = await createClient();

  const { data: curadoria } = await supabase
    .from("imovel_encontrado")
    .select("id, status_curadoria, imovel(*)")
    .eq("id", imovelId)
    .returns<CuradoriaComImovel[]>()
    .maybeSingle();

  if (!curadoria) notFound();

  const imovel = curadoria.imovel;
  const updateAction = updateImovel.bind(null, imovelId, id);
  const statusAction = updateStatusCuradoria.bind(null, imovelId, id);
  const caracteristicas = imovel.caracteristicas ?? {};

  return (
    <div className="max-w-2xl">
      <Link
        href={`/clientes/${id}`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">
        {caracteristicas.titulo ?? imovel.fonte}
      </h1>
      <a
        href={imovel.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-sm text-neutral-500 hover:underline"
      >
        Ver anúncio original ↗
      </a>

      <div className="mt-4 flex gap-2">
        <form action={statusAction}>
          <input type="hidden" name="status" value="aprovado" />
          <button
            type="submit"
            className="rounded-md border border-green-300 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
          >
            Aprovar
          </button>
        </form>
        <form action={statusAction}>
          <input type="hidden" name="status" value="rejeitado" />
          <button
            type="submit"
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Rejeitar
          </button>
        </form>
      </div>

      <p className="mt-4 text-xs text-neutral-500">
        Este imóvel fica salvo no catálogo compartilhado — editar os campos
        abaixo atualiza os dados para qualquer outro cliente que também tenha
        esse imóvel associado. Aprovar/rejeitar afeta só este cliente.
      </p>

      <form action={updateAction} className="mt-4 space-y-6">
        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Características</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelClass}>Preço</label>
              <CurrencyInput
                name="preco"
                defaultValue={imovel.preco}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Área</label>
              <AreaInput
                name="m2"
                defaultValue={caracteristicas.m2}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Quartos</label>
              <input
                type="number"
                name="quartos"
                min={0}
                defaultValue={caracteristicas.quartos ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Vagas</label>
              <input
                type="number"
                name="vagas"
                min={0}
                defaultValue={caracteristicas.vagas ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Contato do anúncio</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Nome</label>
              <input
                name="nome_contato"
                defaultValue={imovel.nome_contato ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input
                name="telefone_contato"
                defaultValue={imovel.telefone_contato ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tipo</label>
              <input
                name="tipo_contato"
                list="tipos-contato"
                defaultValue={imovel.tipo_contato ?? ""}
                className={inputClass}
              />
              <datalist id="tipos-contato">
                <option value="Corretor" />
                <option value="Imobiliária" />
                <option value="Empreendimento" />
                <option value="Proprietário" />
              </datalist>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Localização</h2>
          <div className="mt-4">
            <AddressMapPicker
              initialLat={imovel.latitude}
              initialLon={imovel.longitude}
              initialEndereco={imovel.endereco_texto}
            />
          </div>
        </section>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Salvar alterações
        </button>
      </form>

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Mídia própria</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Fotos e vídeos tirados numa visita presencial — priorizados na
          entrega final ao cliente, separados da imagem do anúncio. Também
          compartilhada entre clientes que tenham este imóvel.
        </p>
        <div className="mt-4">
          <MediaUploader
            imovelId={curadoria.id}
            clienteId={id}
            initialUrls={imovel.midia_propria ?? []}
          />
        </div>
      </section>
    </div>
  );
}
