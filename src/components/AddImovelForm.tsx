"use client";

import { useState, useTransition } from "react";
import { fetchLinkPreview } from "@/app/(app)/clientes/[id]/imoveis/actions";

const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "block text-sm font-medium text-neutral-700";

const TIPOS_CONTATO = ["Corretor", "Imobiliária", "Empreendimento", "Proprietário"];

export function AddImovelForm({
  action,
  error,
}: {
  action: (formData: FormData) => void;
  error?: string;
}) {
  const [url, setUrl] = useState("");
  const [titulo, setTitulo] = useState("");
  const [imagem, setImagem] = useState("");
  const [preco, setPreco] = useState("");
  const [m2, setM2] = useState("");
  const [quartos, setQuartos] = useState("");
  const [vagas, setVagas] = useState("");
  const [nomeContato, setNomeContato] = useState("");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [tipoContato, setTipoContato] = useState("");
  const [existente, setExistente] = useState(false);
  const [buscaErro, setBuscaErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buscarDados() {
    if (!url.trim()) return;
    setBuscaErro(null);
    startTransition(async () => {
      const meta = await fetchLinkPreview(url.trim());
      setExistente(meta.existente);
      if (!meta.existente && !meta.titulo && !meta.imagem && !meta.preco) {
        setBuscaErro(
          "Não encontramos metadados nessa página — preencha os campos manualmente."
        );
      }
      if (meta.titulo) setTitulo(meta.titulo);
      if (meta.imagem) setImagem(meta.imagem);
      if (meta.preco) setPreco(String(meta.preco));
      if (meta.m2) setM2(String(meta.m2));
      if (meta.quartos) setQuartos(String(meta.quartos));
      if (meta.vagas) setVagas(String(meta.vagas));
      if (meta.nome_contato) setNomeContato(meta.nome_contato);
      if (meta.telefone_contato) setTelefoneContato(meta.telefone_contato);
      if (meta.tipo_contato) setTipoContato(meta.tipo_contato);
    });
  }

  return (
    <form action={action} className="mt-6 space-y-6">
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <label className={labelClass}>Link do anúncio</label>
        <div className="mt-1 flex gap-2">
          <input
            name="url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className={`${inputClass} mt-0 flex-1`}
          />
          <button
            type="button"
            onClick={buscarDados}
            disabled={isPending || !url.trim()}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Buscando..." : "Buscar dados do link"}
          </button>
        </div>
        {buscaErro && <p className="mt-2 text-xs text-amber-700">{buscaErro}</p>}
        {existente && (
          <p className="mt-2 text-xs text-blue-700">
            Esse imóvel já está no catálogo — dados e mídia própria carregados
            automaticamente.
          </p>
        )}

        {imagem && (
          <div className="mt-4 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagem}
              alt=""
              className="h-20 w-28 rounded-md border border-neutral-200 object-cover"
            />
            <p className="text-sm text-neutral-600">{titulo}</p>
          </div>
        )}

        <input type="hidden" name="titulo" value={titulo} />
        <input type="hidden" name="imagem_anuncio" value={imagem} />
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Características</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className={labelClass}>Preço (R$)</label>
            <input
              type="number"
              name="preco"
              min={0}
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>m²</label>
            <input
              type="number"
              name="m2"
              min={0}
              value={m2}
              onChange={(e) => setM2(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Quartos</label>
            <input
              type="number"
              name="quartos"
              min={0}
              value={quartos}
              onChange={(e) => setQuartos(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Vagas</label>
            <input
              type="number"
              name="vagas"
              min={0}
              value={vagas}
              onChange={(e) => setVagas(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Contato do anúncio</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Quem procurar do outro lado — corretor, imobiliária ou empreendimento.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Nome</label>
            <input
              name="nome_contato"
              value={nomeContato}
              onChange={(e) => setNomeContato(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input
              name="telefone_contato"
              value={telefoneContato}
              onChange={(e) => setTelefoneContato(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <input
              name="tipo_contato"
              list="tipos-contato"
              value={tipoContato}
              onChange={(e) => setTipoContato(e.target.value)}
              className={inputClass}
            />
            <datalist id="tipos-contato">
              {TIPOS_CONTATO.map((tipo) => (
                <option key={tipo} value={tipo} />
              ))}
            </datalist>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Salvar imóvel
      </button>
    </form>
  );
}
