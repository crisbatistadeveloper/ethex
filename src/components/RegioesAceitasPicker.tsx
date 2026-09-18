"use client";

import { useEffect, useState } from "react";
import { formatRegiao } from "@/lib/labels";
import type { RegiaoAceita } from "@/lib/database.types";

interface Estado {
  id: number;
  sigla: string;
  nome: string;
}

interface Cidade {
  id: number;
  nome: string;
}

const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

export function RegioesAceitasPicker({
  name,
  initial = [],
}: {
  name: string;
  initial?: RegiaoAceita[];
}) {
  const [items, setItems] = useState<RegiaoAceita[]>(initial);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data: Estado[]) => setEstados(data))
      .catch(() => setErro("Não foi possível carregar os estados (IBGE)."));
  }, []);

  useEffect(() => {
    if (!uf) return;

    let cancelado = false;
    async function carregarCidades() {
      setLoadingCidades(true);
      setCidade("");
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
        );
        const data: Cidade[] = await res.json();
        if (!cancelado) setCidades(data);
      } catch {
        if (!cancelado) setErro("Não foi possível carregar as cidades (IBGE).");
      } finally {
        if (!cancelado) setLoadingCidades(false);
      }
    }
    carregarCidades();

    return () => {
      cancelado = true;
    };
  }, [uf]);

  const cidadesDisponiveis = uf ? cidades : [];

  function addItem() {
    if (!uf || !cidade) return;
    const novo: RegiaoAceita = { uf, cidade, bairro: bairro.trim() || undefined };
    const jaExiste = items.some(
      (i) => i.uf === novo.uf && i.cidade === novo.cidade && i.bairro === novo.bairro
    );
    if (!jaExiste) setItems((prev) => [...prev, novo]);
    setBairro("");
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.5fr_1.5fr_auto]">
        <div>
          <label className="block text-xs font-medium text-neutral-500">
            Estado
          </label>
          <select
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {estados.map((e) => (
              <option key={e.id} value={e.sigla}>
                {e.sigla}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">
            Cidade
          </label>
          <select
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            disabled={!uf || loadingCidades}
            className={inputClass}
          >
            <option value="">{loadingCidades ? "Carregando..." : "—"}</option>
            {cidadesDisponiveis.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">
            Bairro (opcional)
          </label>
          <input
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            placeholder="Ex: Moema"
            className={inputClass}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={addItem}
            disabled={!uf || !cidade}
            className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
      </div>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}

      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <li
              key={`${item.uf}-${item.cidade}-${item.bairro ?? ""}`}
              className="flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1 text-sm"
            >
              {formatRegiao(item)}
              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label={`Remover ${formatRegiao(item)}`}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input type="hidden" name={name} value={JSON.stringify(items)} />
    </div>
  );
}
