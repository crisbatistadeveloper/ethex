import Link from "next/link";
import { iniciarNegociacao, registrarDecisaoImovel } from "@/app/(app)/negociacoes/actions";
import {
  DECISAO_COLORS,
  DECISAO_LABELS,
  DECISOES,
  NEGOCIACAO_COMPRA_STATUS_COLORS,
  NEGOCIACAO_COMPRA_STATUS_LABELS,
  formatBRL,
  negociacaoAtiva,
  valorAtual,
} from "@/lib/negociacao-compra";
import type { DecisaoImovelRow, NegociacaoCompraRow } from "@/lib/database.types";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";

export function DecisaoNegociacaoSection({
  curadoriaId,
  clienteId,
  oportunidadeId,
  decisao,
  outroEscolhidoTitulo,
  negociacoes,
  ativaEmOutroImovel,
}: {
  curadoriaId: string;
  clienteId: string;
  oportunidadeId: string | null;
  decisao: DecisaoImovelRow | null;
  outroEscolhidoTitulo: string | null;
  negociacoes: NegociacaoCompraRow[];
  ativaEmOutroImovel: boolean;
}) {
  const decidir = registrarDecisaoImovel.bind(null, curadoriaId, clienteId);
  const iniciar = iniciarNegociacao.bind(null, curadoriaId, clienteId);
  const ativa = negociacoes.find((n) => negociacaoAtiva(n.status)) ?? null;

  return (
    <section className="mt-4 space-y-4 rounded-lg border border-[#e4e0d9] bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0b1f34]">
          Decisão do cliente
        </h2>
        <p className="mt-1 text-xs text-[#5b6472]">
          Registra se o cliente quer tentar comprar este imóvel. Apenas um
          imóvel pode estar “Escolhido” por oportunidade. Não altera a etapa do
          pipeline.
        </p>
      </div>

      {!oportunidadeId ? (
        <p className="text-sm text-[#5b6472]">
          Este cliente não tem oportunidade no CRM.{" "}
          <Link href={`/crm/novo?cliente=${clienteId}`} className="underline">
            Criar oportunidade
          </Link>
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs text-[#5b6472]">Decisão atual:</span>
            {decisao ? (
              <>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${DECISAO_COLORS[decisao.decisao]}`}
                >
                  {DECISAO_LABELS[decisao.decisao]}
                </span>
                <span className="text-xs text-[#5b6472]">
                  em {new Date(decisao.decidido_em).toLocaleString("pt-BR")}
                </span>
              </>
            ) : (
              <span className="text-xs text-[#5b6472]">nenhuma</span>
            )}
          </div>
          {decisao?.observacao && (
            <p className="whitespace-pre-line text-sm text-[#0b1f34]">{decisao.observacao}</p>
          )}

          <form action={decidir} className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="decisao" className={labelClass}>Decisão</label>
              <select
                id="decisao"
                name="decisao"
                defaultValue={decisao?.decisao ?? "em_consideracao"}
                className={inputClass}
              >
                {DECISOES.map((d) => (
                  <option key={d} value={d}>
                    {DECISAO_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="observacao_decisao" className={labelClass}>Observação</label>
              <input
                id="observacao_decisao"
                name="observacao"
                defaultValue={decisao?.observacao ?? ""}
                placeholder="Ex.: cliente decidiu após a segunda visita"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-3">
              {outroEscolhidoTitulo && decisao?.decisao !== "escolhido" && (
                <p className="mb-2 text-xs text-amber-700">
                  “{outroEscolhidoTitulo}” está como escolhido. Se escolher este,
                  aquele volta para “Em consideração”.
                </p>
              )}
              <button
                type="submit"
                className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
              >
                Salvar decisão
              </button>
            </div>
          </form>

          {decisao?.decisao === "escolhido" && (
            <div className="border-t border-[#e4e0d9] pt-4">
              {ativa ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p>
                    Negociação{" "}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${NEGOCIACAO_COMPRA_STATUS_COLORS[ativa.status]}`}
                    >
                      {NEGOCIACAO_COMPRA_STATUS_LABELS[ativa.status]}
                    </span>{" "}
                    · valor atual <strong>{formatBRL(valorAtual(ativa))}</strong>
                  </p>
                  <Link
                    href={`/negociacoes/${ativa.id}`}
                    className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
                  >
                    Ver negociação
                  </Link>
                </div>
              ) : ativaEmOutroImovel ? (
                <p className="text-sm text-amber-700">
                  Já existe negociação ativa em outro imóvel desta oportunidade.
                </p>
              ) : (
                <form action={iniciar} className="flex flex-wrap items-end gap-2">
                  <label className="flex-1 text-xs text-[#5b6472]">
                    Observação inicial (opcional)
                    <input name="observacoes" className={inputClass} />
                  </label>
                  <button
                    type="submit"
                    className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white hover:bg-green-800"
                  >
                    Iniciar negociação
                  </button>
                </form>
              )}
            </div>
          )}

          {negociacoes.filter((n) => !negociacaoAtiva(n.status)).length > 0 && (
            <ul className="space-y-1 border-t border-[#e4e0d9] pt-3 text-sm">
              <li className="text-xs font-medium text-[#5b6472]">Negociações anteriores</li>
              {negociacoes
                .filter((n) => !negociacaoAtiva(n.status))
                .map((n) => (
                  <li key={n.id}>
                    <Link href={`/negociacoes/${n.id}`} className="hover:underline">
                      {NEGOCIACAO_COMPRA_STATUS_LABELS[n.status]} ·{" "}
                      {new Date(n.iniciada_em).toLocaleDateString("pt-BR")} ·{" "}
                      {formatBRL(valorAtual(n))}
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
