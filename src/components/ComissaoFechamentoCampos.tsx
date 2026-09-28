"use client";

import { useState, type ReactNode } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { COMISSAO_TIPO_LABELS, calcularComissaoPercentual } from "@/lib/fechamento";
import type { ComissaoTipo, FechamentoRow } from "@/lib/database.types";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paraRaw(v: number | null | undefined): string {
  return v == null ? "" : v.toFixed(2);
}

/**
 * Valor fechado + comissão ETHEX com cálculo ao vivo da comissão prevista
 * (percentual × valor fechado). O consultor pode sobrescrever o valor.
 */
export function ComissaoFechamentoCampos({
  f,
  valorFechadoInicial,
  editarValorFechado = false,
  valorNegociado = null,
  campoData,
}: {
  f?: Pick<
    FechamentoRow,
    "comissao_tipo" | "comissao_percentual" | "comissao_prevista" | "comissao_efetiva" | "comissao_observacao"
  >;
  valorFechadoInicial: number | null;
  /** Mostra o campo "Valor efetivamente fechado" (registro do ganho). */
  editarValorFechado?: boolean;
  valorNegociado?: number | null;
  /** Campo de data exibido ao lado do valor fechado. */
  campoData?: ReactNode;
}) {
  const [valorFechado, setValorFechado] = useState(paraRaw(valorFechadoInicial));
  const [tipo, setTipo] = useState<ComissaoTipo | "">(f?.comissao_tipo ?? "");
  const [percentual, setPercentual] = useState(
    f?.comissao_percentual != null ? String(f.comissao_percentual) : ""
  );

  const valorNum = valorFechado === "" ? null : Number(valorFechado);
  const pctNum = percentual === "" ? null : Number(percentual.replace(",", "."));
  const calculada =
    tipo === "percentual" && valorNum != null && valorNum > 0 && pctNum != null && pctNum > 0
      ? calcularComissaoPercentual(valorNum, pctNum)
      : null;

  const [previstaManual, setPrevistaManual] = useState<string | null>(() => {
    const salva = f?.comissao_prevista ?? null;
    if (salva == null) return null;
    const calcInicial =
      f?.comissao_tipo === "percentual" && valorFechadoInicial != null && f.comissao_percentual != null
        ? calcularComissaoPercentual(valorFechadoInicial, f.comissao_percentual)
        : null;
    return calcInicial != null && Math.abs(calcInicial - salva) < 0.005 ? null : paraRaw(salva);
  });
  const automatica = previstaManual === null && calculada != null;
  const previstaRaw = previstaManual ?? paraRaw(calculada);

  function alterarPercentual(v: string) {
    setPercentual(v);
    if (v !== "" && tipo === "") setTipo("percentual");
  }

  return (
    <>
      {editarValorFechado && (
        <div className="grid gap-3 sm:grid-cols-2">
          {campoData ?? <div />}
          <div>
            <label className={labelClass}>Valor efetivamente fechado</label>
            <CurrencyInput
              name="valor_fechado"
              value={valorFechado}
              onValueChange={setValorFechado}
              className={inputClass}
            />
            {valorNegociado != null && (
              <p className="mt-1 text-[11px] text-[#5b6472]">
                Sugerido: valor final negociado ({brl(valorNegociado)}). Altere se o valor fechado for diferente.
              </p>
            )}
          </div>
        </div>
      )}

      <fieldset className="rounded-md border border-[#e4e0d9] p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[#5b6472]">
          Comissão ETHEX (se conhecida)
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Tipo</label>
            <select
              name="comissao_tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as ComissaoTipo | "")}
              className={inputClass}
            >
              <option value="">— não informada —</option>
              {(Object.keys(COMISSAO_TIPO_LABELS) as ComissaoTipo[]).map((t) => (
                <option key={t} value={t}>
                  {COMISSAO_TIPO_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Percentual (%)</label>
            <input
              name="comissao_percentual"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={percentual}
              onChange={(e) => alterarPercentual(e.target.value)}
              disabled={tipo === "valor"}
              className={`${inputClass} disabled:bg-[#faf8f5] disabled:text-[#5b6472]`}
            />
          </div>
          <div>
            <label className={labelClass}>Comissão prevista</label>
            <CurrencyInput
              name="comissao_prevista"
              value={previstaRaw}
              onValueChange={(raw) => setPrevistaManual(raw)}
              className={`${inputClass} ${automatica ? "border-green-300 bg-green-50" : ""}`}
            />
            {automatica && valorNum != null && pctNum != null && calculada != null ? (
              <p className="mt-1 text-[11px] text-green-700">
                Calculada: {pctNum.toLocaleString("pt-BR")}% de {brl(valorNum)} = <strong>{brl(calculada)}</strong>
              </p>
            ) : previstaManual !== null && calculada != null ? (
              <p className="mt-1 text-[11px] text-[#5b6472]">
                Valor informado manualmente (cálculo: {brl(calculada)}).{" "}
                <button
                  type="button"
                  onClick={() => setPrevistaManual(null)}
                  className="font-medium text-green-700 underline"
                >
                  Usar cálculo automático
                </button>
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-[#5b6472]">
                {tipo === "valor"
                  ? "Informe o valor fixo combinado."
                  : "Escolha “Percentual” e informe o % para calcular automaticamente."}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Comissão efetiva</label>
            <CurrencyInput name="comissao_efetiva" defaultValue={f?.comissao_efetiva} className={inputClass} />
            <p className="mt-1 text-[11px] text-[#5b6472]">Preencha quando a comissão for recebida.</p>
          </div>
        </div>
        <div className="mt-3">
          <label className={labelClass}>Observação da comissão</label>
          <input name="comissao_observacao" defaultValue={f?.comissao_observacao ?? ""} className={inputClass} />
        </div>
      </fieldset>
    </>
  );
}
