"use client";

import { useState } from "react";
import { CriteriaRanking } from "@/components/CriteriaRanking";
import { CurrencyInput } from "@/components/CurrencyInput";
import { RegioesAceitasPicker } from "@/components/RegioesAceitasPicker";
import { FINALIDADE_LABELS } from "@/lib/labels";
import type {
  DetalhesComercial,
  DetalhesInstitucional,
  DetalhesInvestimento,
  DetalhesMoradia,
  DetalhesOutro,
  DetalhesSucessorio,
  DetalhesTemporada,
  Finalidade,
  PerfilRow,
} from "@/lib/database.types";

const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "block text-sm font-medium text-neutral-700";
const checkboxRowClass = "flex items-center gap-2 text-sm text-neutral-700";

const FINALIDADES: Finalidade[] = [
  "moradia",
  "investimento",
  "temporada",
  "sucessorio",
  "comercial",
  "institucional",
  "outro",
];

export function InterviewForm({
  action,
  perfil,
  error,
}: {
  action: (formData: FormData) => void;
  perfil: PerfilRow | null;
  error?: string;
}) {
  const [finalidade, setFinalidade] = useState<Finalidade | "">(
    perfil?.finalidade ?? ""
  );

  return (
    <form action={action} className="mt-6 space-y-8">
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Finalidade</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Define quais perguntas específicas aparecem a seguir.
        </p>
        <select
          name="finalidade"
          required
          value={finalidade}
          onChange={(e) => setFinalidade(e.target.value as Finalidade)}
          className={`${inputClass} mt-4 max-w-xs`}
        >
          <option value="" disabled>
            Selecione...
          </option>
          {FINALIDADES.map((f) => (
            <option key={f} value={f}>
              {FINALIDADE_LABELS[f]}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Orçamento e condições</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Orçamento mínimo</label>
            <CurrencyInput
              name="orcamento_min"
              defaultValue={perfil?.orcamento_min ?? null}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Orçamento máximo</label>
            <CurrencyInput
              name="orcamento_max"
              defaultValue={perfil?.orcamento_max ?? null}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              name="tem_entrada"
              defaultChecked={perfil?.tem_entrada ?? false}
            />
            Tem entrada
          </label>
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              name="credito_aprovado"
              defaultChecked={perfil?.credito_aprovado ?? false}
            />
            Crédito aprovado
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Imóvel desejado</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Regiões aceitas</label>
            <div className="mt-1">
              <RegioesAceitasPicker
                name="regioes_aceitas_json"
                initial={perfil?.regioes_aceitas ?? []}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Tipo de imóvel</label>
            <input
              name="tipo_imovel"
              defaultValue={perfil?.tipo_imovel ?? ""}
              placeholder="Ex: apartamento, casa, terreno"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Prazo de compra</label>
            <input
              name="prazo_compra"
              defaultValue={perfil?.prazo_compra ?? ""}
              placeholder="Ex: até 3 meses"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Quartos (mínimo)</label>
            <input
              type="number"
              name="quartos_min"
              min={0}
              defaultValue={perfil?.quartos_min ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Vagas (mínimo)</label>
            <input
              type="number"
              name="vagas_min"
              min={0}
              defaultValue={perfil?.vagas_min ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {finalidade && (
        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">
            Detalhes — {FINALIDADE_LABELS[finalidade]}
          </h2>
          <div className="mt-4">
            <DetalhesFinalidadeFields
              finalidade={finalidade}
              perfil={perfil}
            />
          </div>
        </section>
      )}

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Critérios priorizados</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Escolha os 3 critérios mais importantes para o cliente, em ordem.
        </p>
        <div className="mt-4">
          <CriteriaRanking initial={perfil?.criterios_priorizados ?? []} />
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Motivação e contexto</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Motivação</label>
            <textarea
              name="motivacao"
              rows={2}
              defaultValue={perfil?.motivacao ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Aspirações</label>
            <textarea
              name="aspiracoes"
              rows={2}
              defaultValue={perfil?.aspiracoes ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Restrições</label>
            <textarea
              name="restricoes"
              rows={2}
              defaultValue={perfil?.restricoes ?? ""}
              className={inputClass}
            />
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
        Salvar perfil
      </button>
    </form>
  );
}

function DetalhesFinalidadeFields({
  finalidade,
  perfil,
}: {
  finalidade: Finalidade;
  perfil: PerfilRow | null;
}) {
  const d = (perfil?.finalidade === finalidade ? perfil?.detalhes_finalidade : {}) ?? {};

  switch (finalidade) {
    case "moradia": {
      const detalhes = d as DetalhesMoradia;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Composição familiar</label>
            <input
              name="df_composicao_familiar"
              defaultValue={detalhes.composicao_familiar ?? ""}
              placeholder="Ex: casal com 2 filhos"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Proximidade desejada</label>
            <input
              name="df_proximidade_desejada"
              defaultValue={detalhes.proximidade_desejada ?? ""}
              placeholder="Ex: perto do trabalho ou da escola"
              className={inputClass}
            />
          </div>
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              name="df_tem_pets"
              defaultChecked={detalhes.tem_pets ?? false}
            />
            Tem pets
          </label>
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              name="df_precisa_acessibilidade"
              defaultChecked={detalhes.precisa_acessibilidade ?? false}
            />
            Precisa de acessibilidade
          </label>
        </div>
      );
    }
    case "investimento": {
      const detalhes = d as DetalhesInvestimento;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Objetivo</label>
            <select
              name="df_objetivo"
              defaultValue={detalhes.objetivo ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="renda_aluguel">Renda por aluguel</option>
              <option value="valorizacao">Valorização</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Yield mínimo esperado (%)</label>
            <input
              type="number"
              step="0.1"
              name="df_yield_minimo_esperado"
              defaultValue={detalhes.yield_minimo_esperado ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Prazo de retorno (anos)</label>
            <input
              type="number"
              name="df_prazo_retorno_anos"
              defaultValue={detalhes.prazo_retorno_anos ?? ""}
              className={inputClass}
            />
          </div>
          <label className={`${checkboxRowClass} self-end`}>
            <input
              type="checkbox"
              name="df_aceita_reforma"
              defaultChecked={detalhes.aceita_reforma ?? false}
            />
            Aceita reforma
          </label>
        </div>
      );
    }
    case "temporada": {
      const detalhes = d as DetalhesTemporada;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Época de uso</label>
            <select
              name="df_epoca_uso"
              defaultValue={detalhes.epoca_uso ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="verao">Verão</option>
              <option value="inverno">Inverno</option>
              <option value="ano_todo">Ano todo</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Frequência de uso estimada</label>
            <input
              name="df_frequencia_uso_estimada"
              defaultValue={detalhes.frequencia_uso_estimada ?? ""}
              placeholder="Ex: 1 fim de semana por mês"
              className={inputClass}
            />
          </div>
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              name="df_aceita_airbnb_sublocacao"
              defaultChecked={detalhes.aceita_airbnb_sublocacao ?? false}
            />
            Aceita Airbnb/sublocação
          </label>
        </div>
      );
    }
    case "sucessorio": {
      const detalhes = d as DetalhesSucessorio;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Número de herdeiros</label>
            <input
              type="number"
              min={0}
              name="df_num_herdeiros"
              defaultValue={detalhes.num_herdeiros ?? ""}
              className={inputClass}
            />
          </div>
          <label className={`${checkboxRowClass} self-end`}>
            <input
              type="checkbox"
              name="df_urgencia_partilha"
              defaultChecked={detalhes.urgencia_partilha ?? false}
            />
            Urgência na partilha
          </label>
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              name="df_imovel_atual_sera_vendido"
              defaultChecked={detalhes.imovel_atual_sera_vendido ?? false}
            />
            Imóvel atual será vendido
          </label>
        </div>
      );
    }
    case "comercial": {
      const detalhes = d as DetalhesComercial;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Tipo de atividade</label>
            <input
              name="df_tipo_atividade"
              defaultValue={detalhes.tipo_atividade ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fluxo de pessoas esperado</label>
            <select
              name="df_fluxo_pessoas_esperado"
              defaultValue={detalhes.fluxo_pessoas_esperado ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="baixo">Baixo</option>
              <option value="medio">Médio</option>
              <option value="alto">Alto</option>
            </select>
          </div>
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              name="df_precisa_estacionamento_clientes"
              defaultChecked={detalhes.precisa_estacionamento_clientes ?? false}
            />
            Precisa de estacionamento para clientes
          </label>
        </div>
      );
    }
    case "institucional": {
      const detalhes = d as DetalhesInstitucional;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Tipo de instituição</label>
            <input
              name="df_tipo_instituicao"
              defaultValue={detalhes.tipo_instituicao ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Capacidade de pessoas</label>
            <input
              type="number"
              min={0}
              name="df_capacidade_pessoas"
              defaultValue={detalhes.capacidade_pessoas ?? ""}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Exigências normativas</label>
            <textarea
              name="df_exigencias_normativas"
              rows={2}
              defaultValue={detalhes.exigencias_normativas ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      );
    }
    case "outro": {
      const detalhes = d as DetalhesOutro;
      return (
        <div>
          <label className={labelClass}>Descrição livre</label>
          <textarea
            name="df_descricao_livre"
            rows={3}
            defaultValue={detalhes.descricao_livre ?? ""}
            className={inputClass}
          />
        </div>
      );
    }
    default:
      return null;
  }
}
