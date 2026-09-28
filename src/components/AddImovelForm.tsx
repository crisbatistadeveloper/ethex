"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { fetchLinkPreview } from "@/app/(app)/clientes/[id]/imoveis/actions";
import { AreaInput } from "@/components/AreaInput";
import { CurrencyInput } from "@/components/CurrencyInput";
import { StatusConstrucaoRadios } from "@/components/StatusConstrucao";
import { DiferenciaisFields } from "@/components/CaracteristicasImovel";
import {
  DIFERENCIAIS,
  diferencialParaForm,
  type DiferencialKey,
  type DiferencialValor,
} from "@/lib/imovel-caracteristicas";
import type { ImovelStatusConstrucao } from "@/lib/database.types";

const DIFERENCIAIS_VAZIOS = Object.fromEntries(
  DIFERENCIAIS.map((d) => [d.key, ""])
) as Record<DiferencialKey, DiferencialValor>;

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-sm font-medium text-[#0b1f34]";

const TIPOS_CONTATO = ["Corretor", "Imobiliária", "Empreendimento", "Proprietário"];

interface Rascunho {
  url: string;
  titulo: string;
  imagem: string;
  preco: string;
  areaTotal: string;
  quartos: string;
  suites: string;
  banheiros: string;
  vagas: string;
  diferenciais: Record<DiferencialKey, DiferencialValor>;
  nomeContato: string;
  telefoneContato: string;
  tipoContato: string;
  statusConstrucao: ImovelStatusConstrucao | "";
  existente: boolean;
}

function lerRascunho(chave: string): Partial<Rascunho> | null {
  try {
    const bruto = window.sessionStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as Partial<Rascunho>) : null;
  } catch {
    return null;
  }
}

const naoInscrever = () => () => {};

interface AddImovelFormProps {
  action: (formData: FormData) => void;
  error?: string;
  /** Chave do sessionStorage: o formulário sobrevive a erro, voltar e navegação. */
  rascunhoKey?: string;
  /** Id do imóvel recém-salvo: descarta o rascunho uma única vez por inclusão. */
  limparRascunho?: string | null;
}

export function AddImovelForm(props: AddImovelFormProps) {
  // No servidor/hidratação renderiza vazio; no navegador remonta com o rascunho.
  const noNavegador = useSyncExternalStore(naoInscrever, () => true, () => false);
  const { rascunhoKey, limparRascunho } = props;

  let inicial: Partial<Rascunho> | null = null;
  if (noNavegador && rascunhoKey) {
    const jaLimpo =
      !limparRascunho ||
      sessionStorage.getItem(`${rascunhoKey}:limpo`) === limparRascunho;
    inicial = jaLimpo ? lerRascunho(rascunhoKey) : null;
  }

  return (
    <FormImovel
      key={noNavegador ? "navegador" : "servidor"}
      {...props}
      rascunhoKey={noNavegador ? rascunhoKey : undefined}
      inicial={inicial}
    />
  );
}

function FormImovel({
  action,
  error,
  rascunhoKey,
  limparRascunho,
  inicial,
}: AddImovelFormProps & { inicial: Partial<Rascunho> | null }) {
  const [url, setUrl] = useState(inicial?.url ?? "");
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [imagem, setImagem] = useState(inicial?.imagem ?? "");
  const [preco, setPreco] = useState(inicial?.preco ?? "");
  const [areaTotal, setAreaTotal] = useState(inicial?.areaTotal ?? "");
  const [quartos, setQuartos] = useState(inicial?.quartos ?? "");
  const [suites, setSuites] = useState(inicial?.suites ?? "");
  const [banheiros, setBanheiros] = useState(inicial?.banheiros ?? "");
  const [vagas, setVagas] = useState(inicial?.vagas ?? "");
  const [diferenciais, setDiferenciais] = useState<Record<DiferencialKey, DiferencialValor>>(
    () => ({ ...DIFERENCIAIS_VAZIOS, ...inicial?.diferenciais })
  );
  const [nomeContato, setNomeContato] = useState(inicial?.nomeContato ?? "");
  const [telefoneContato, setTelefoneContato] = useState(inicial?.telefoneContato ?? "");
  const [tipoContato, setTipoContato] = useState(inicial?.tipoContato ?? "");
  const [statusConstrucao, setStatusConstrucao] = useState<ImovelStatusConstrucao | "">(
    inicial?.statusConstrucao ?? ""
  );
  const [existente, setExistente] = useState(Boolean(inicial?.existente));
  const [buscaErro, setBuscaErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!rascunhoKey) return;
    if (limparRascunho) sessionStorage.setItem(`${rascunhoKey}:limpo`, limparRascunho);
    const rascunho: Rascunho = {
      url,
      titulo,
      imagem,
      preco,
      areaTotal,
      quartos,
      suites,
      banheiros,
      vagas,
      diferenciais,
      nomeContato,
      telefoneContato,
      tipoContato,
      statusConstrucao,
      existente,
    };
    const vazio = !url && !titulo && !preco && !areaTotal && !quartos && !suites &&
      !banheiros && !vagas && !nomeContato && !telefoneContato && !tipoContato &&
      !statusConstrucao && Object.values(diferenciais).every((v) => v === "");
    if (vazio) sessionStorage.removeItem(rascunhoKey);
    else sessionStorage.setItem(rascunhoKey, JSON.stringify(rascunho));
  }, [
    rascunhoKey,
    limparRascunho,
    url,
    titulo,
    imagem,
    preco,
    areaTotal,
    quartos,
    suites,
    banheiros,
    vagas,
    diferenciais,
    nomeContato,
    telefoneContato,
    tipoContato,
    statusConstrucao,
    existente,
  ]);

  const urlValida = /^https?:\/\/\S+$/i.test(url.trim());

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
      const c = meta.caracteristicas;
      if (c.area_total != null) setAreaTotal(String(c.area_total));
      if (c.quartos != null) setQuartos(String(c.quartos));
      if (c.suites != null) setSuites(String(c.suites));
      if (c.banheiros != null) setBanheiros(String(c.banheiros));
      if (c.vagas != null) setVagas(String(c.vagas));
      if (meta.existente) {
        setDiferenciais(
          Object.fromEntries(
            DIFERENCIAIS.map((d) => [d.key, diferencialParaForm(c[d.key])])
          ) as Record<DiferencialKey, DiferencialValor>
        );
      }
      if (meta.nome_contato) setNomeContato(meta.nome_contato);
      if (meta.telefone_contato) setTelefoneContato(meta.telefone_contato);
      if (meta.tipo_contato) setTipoContato(meta.tipo_contato);
      if (meta.status_construcao) setStatusConstrucao(meta.status_construcao);
    });
  }

  return (
    <form action={action} className="mt-6 space-y-6">
      <section className="rounded-lg border border-[#e4e0d9] bg-white p-6">
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
            className="rounded-md border border-[#e4e0d9] px-3 py-2 text-sm hover:bg-[#efe9e0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Buscando..." : "Buscar dados do link"}
          </button>
        </div>
        {urlValida && (
          <a
            href={url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-[#5b6472] underline-offset-2 hover:underline"
          >
            Ver anúncio original ↗
          </a>
        )}
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
              className="h-20 w-28 rounded-md border border-[#e4e0d9] object-cover"
            />
            <p className="text-sm text-[#5b6472]">{titulo}</p>
          </div>
        )}

        <input type="hidden" name="titulo" value={titulo} />
        <input type="hidden" name="imagem_anuncio" value={imagem} />
      </section>

      <section className="rounded-lg border border-[#e4e0d9] bg-white p-6">
        <h2 className="text-lg font-semibold">Características</h2>
        <div className="mt-4">
          <StatusConstrucaoRadios
            value={statusConstrucao}
            onChange={setStatusConstrucao}
            required
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Preço</label>
            <CurrencyInput
              name="preco"
              value={preco}
              onValueChange={setPreco}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Área total</label>
            <AreaInput
              name="area_total"
              value={areaTotal}
              onValueChange={setAreaTotal}
              className={inputClass}
            />
          </div>
          {(
            [
              ["quartos", "Quartos", quartos, setQuartos],
              ["suites", "Suítes", suites, setSuites],
              ["banheiros", "Banheiros", banheiros, setBanheiros],
              ["vagas", "Vagas", vagas, setVagas],
            ] as const
          ).map(([name, label, value, set]) => (
            <div key={name}>
              <label className={labelClass}>{label}</label>
              <input
                type="number"
                name={name}
                min={0}
                value={value}
                onChange={(e) => set(e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
        </div>
        <div className="mt-6">
          <DiferenciaisFields
            valores={diferenciais}
            onChange={(key, valor) =>
              setDiferenciais((atual) => ({ ...atual, [key]: valor }))
            }
          />
        </div>
      </section>

      <section className="rounded-lg border border-[#e4e0d9] bg-white p-6">
        <h2 className="text-lg font-semibold">Contato do anúncio</h2>
        <p className="mt-1 text-sm text-[#5b6472]">
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
        className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
      >
        Salvar imóvel
      </button>
    </form>
  );
}
