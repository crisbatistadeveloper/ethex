import Link from "next/link";
import {
  NEGOCIACAO_STATUS,
  NEGOCIACAO_STATUS_COLORS,
  NEGOCIACAO_STATUS_LABELS,
  PARCEIRO_TIPO_LABELS,
  formatParceiroLinhaCurta,
} from "@/lib/parceiros";
import type {
  ImovelEncontradoHistoricoRow,
  NegociacaoParceriaRow,
  ParceiroRow,
} from "@/lib/database.types";
import { updateCuradoriaParceiro } from "@/app/(app)/clientes/[id]/imoveis/negociacao-actions";
import { upsertNegociacaoParceria } from "@/app/(app)/clientes/[id]/imoveis/negociacao-actions";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";

type ParceiroCuradoria = Pick<
  ParceiroRow,
  | "id"
  | "tipo"
  | "nome"
  | "imobiliaria_nome"
  | "contato_telefone"
  | "whatsapp"
  | "contato_email"
  | "modelo_divisao"
  | "politica_comissao"
  | "condicoes_parceria"
  | "ultima_negociacao_em"
  | "ativo"
>;

export function CuradoriaParceiroNegociacao({
  curadoriaId,
  clienteId,
  parceiroId,
  parceiros,
  negociacao,
  historico,
}: {
  curadoriaId: string;
  clienteId: string;
  parceiroId: string | null;
  parceiros: ParceiroCuradoria[];
  negociacao: NegociacaoParceriaRow | null;
  historico: ImovelEncontradoHistoricoRow[];
}) {
  const vincularAction = updateCuradoriaParceiro.bind(null, curadoriaId, clienteId);
  const negociarAction = upsertNegociacaoParceria.bind(
    null,
    curadoriaId,
    clienteId
  );
  const selecionado = parceiros.find((p) => p.id === parceiroId) ?? null;

  const negociadoEmDefault = negociacao?.negociado_em
    ? new Date(negociacao.negociado_em).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <section className="mt-4 space-y-4 rounded-lg border border-[#e4e0d9] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0b1f34]">
          Parceiro
        </h2>
        <Link
          href="/parceiros"
          className="text-xs text-[#5b6472] hover:underline"
        >
          Ver cadastro de parceiros
        </Link>
      </div>

      <form action={vincularAction} className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor="parceiro_id" className={labelClass}>
            Selecionar parceiro existente
          </label>
          <select
            id="parceiro_id"
            name="parceiro_id"
            defaultValue={parceiroId ?? ""}
            className={inputClass}
          >
            <option value="">Sem parceiro</option>
            {parceiros
              .filter((p) => p.ativo || p.id === parceiroId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {formatParceiroLinhaCurta(p)} · {PARCEIRO_TIPO_LABELS[p.tipo]}
                  {!p.ativo ? " (inativo)" : ""}
                </option>
              ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-[#e4e0d9] px-3 py-2 text-sm hover:bg-[#faf8f5]"
        >
          Salvar parceiro
        </button>
      </form>

      {selecionado && (
        <>
          <div className="grid gap-3 rounded-md border border-[#e4e0d9] bg-[#faf8f5] p-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-[#5b6472]">Nome</p>
              <p className="font-medium">{selecionado.nome}</p>
            </div>
            <div>
              <p className="text-xs text-[#5b6472]">Tipo</p>
              <p className="font-medium">
                {PARCEIRO_TIPO_LABELS[selecionado.tipo]}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5b6472]">Imobiliária / empresa</p>
              <p className="font-medium">
                {selecionado.imobiliaria_nome ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5b6472]">Contato</p>
              <p className="font-medium">
                {[
                  selecionado.whatsapp || selecionado.contato_telefone,
                  selecionado.contato_email,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <Link
                href={`/parceiros/${selecionado.id}`}
                className="text-xs text-[#5b6472] hover:underline"
              >
                Abrir ficha do parceiro →
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5b6472]">
              Política conhecida
            </h3>
            <p className="mt-1 text-xs text-[#5b6472]">
              Referência geral do parceiro — não é alterada por esta
              negociação.
            </p>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-[#5b6472]">Comissão habitual</dt>
                <dd className="font-medium">
                  {selecionado.modelo_divisao ??
                    selecionado.politica_comissao ??
                    "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#5b6472]">Última negociação</dt>
                <dd className="font-medium">
                  {selecionado.ultima_negociacao_em
                    ? new Date(
                        selecionado.ultima_negociacao_em
                      ).toLocaleDateString("pt-BR")
                    : "—"}
                </dd>
              </div>
              <div className="sm:col-span-3">
                <dt className="text-xs text-[#5b6472]">Condições</dt>
                <dd className="mt-0.5 text-[#0b1f34]">
                  {selecionado.condicoes_parceria || "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-[#e4e0d9] pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5b6472]">
              Negociação deste imóvel
            </h3>
            <p className="mt-1 text-xs text-[#5b6472]">
              Específica desta curadoria. Não sobrescreve a política geral do
              parceiro.
            </p>

            {negociacao && (
              <span
                className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${NEGOCIACAO_STATUS_COLORS[negociacao.status]}`}
              >
                {NEGOCIACAO_STATUS_LABELS[negociacao.status]}
              </span>
            )}

            <form action={negociarAction} className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="comissao_solicitada" className={labelClass}>
                    Comissão solicitada pelo parceiro
                  </label>
                  <input
                    id="comissao_solicitada"
                    name="comissao_solicitada"
                    defaultValue={negociacao?.comissao_solicitada ?? ""}
                    className={inputClass}
                    placeholder="Ex.: 50% ou 6%"
                  />
                </div>
                <div>
                  <label htmlFor="comissao_negociada" className={labelClass}>
                    Comissão negociada (ETHEX)
                  </label>
                  <input
                    id="comissao_negociada"
                    name="comissao_negociada"
                    defaultValue={negociacao?.comissao_negociada ?? ""}
                    className={inputClass}
                    placeholder="Ex.: 40% para a ETHEX"
                  />
                </div>
                <div>
                  <label htmlFor="modelo_divisao" className={labelClass}>
                    Modelo de divisão
                  </label>
                  <input
                    id="modelo_divisao"
                    name="modelo_divisao"
                    defaultValue={
                      negociacao?.modelo_divisao ??
                      selecionado.modelo_divisao ??
                      ""
                    }
                    className={inputClass}
                    placeholder="Ex.: 60/40"
                  />
                </div>
                <div>
                  <label htmlFor="status" className={labelClass}>
                    Status da negociação
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={negociacao?.status ?? "pendente"}
                    className={inputClass}
                  >
                    {NEGOCIACAO_STATUS.map((s) => (
                      <option key={s} value={s}>
                        {NEGOCIACAO_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="negociado_em" className={labelClass}>
                    Data da negociação
                  </label>
                  <input
                    id="negociado_em"
                    name="negociado_em"
                    type="date"
                    defaultValue={negociadoEmDefault}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="observacoes" className={labelClass}>
                    Observações
                  </label>
                  <textarea
                    id="observacoes"
                    name="observacoes"
                    rows={2}
                    defaultValue={negociacao?.observacoes ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
              >
                Salvar negociação deste imóvel
              </button>
            </form>
          </div>
        </>
      )}

      {historico.length > 0 && (
        <div className="border-t border-[#e4e0d9] pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5b6472]">
            Histórico desta curadoria
          </h3>
          <ul className="mt-2 space-y-2">
            {historico.map((h) => (
              <li key={h.id} className="text-sm">
                <p className="text-[#0b1f34]">{h.detalhe}</p>
                <p className="text-xs text-[#5b6472]">
                  {new Date(h.criado_em).toLocaleString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
