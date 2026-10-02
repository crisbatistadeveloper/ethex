import Link from "next/link";
import { ImovelCard } from "@/components/ImovelCard";
import { salvarContatoOportunidade } from "@/app/(app)/crm/contato-actions";
import { formatDateTime } from "@/lib/crm";
import {
  PARCERIA_STATUS_COLORS,
  PARCERIA_STATUS_LABELS,
  etapasDoContato,
  linkWhatsapp,
  mensagemWhatsappContato,
  type GrupoContato,
  type VisitasDoGrupo,
} from "@/lib/contato-busca";
import type { ContatoOportunidadeRow, ContatoParceriaStatus } from "@/lib/database.types";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";

function resumoVisitas(partes: [number, string][]): string {
  const ativas = partes.filter(([n]) => n > 0).map(([n, rotulo]) => `${n} ${rotulo}`);
  return ativas.length > 0 ? ativas.join(" · ") : "nenhuma ainda";
}

export function ContatosDaBusca({
  grupos,
  contatos,
  visitas,
  oportunidadeId,
  clienteId,
  escolhidaCuradoriaId,
  tituloPorCuradoria,
  editavel,
}: {
  grupos: GrupoContato[];
  contatos: Map<string, ContatoOportunidadeRow>;
  visitas: Map<string, VisitasDoGrupo>;
  oportunidadeId: string;
  clienteId: string;
  escolhidaCuradoriaId: string | null;
  tituloPorCuradoria: Map<string, string>;
  editavel: boolean;
}) {
  const salvar = salvarContatoOportunidade.bind(null, oportunidadeId);

  return (
    <div className="mt-3 space-y-4">
      {grupos.map((grupo) => {
        const contato = contatos.get(grupo.chave) ?? null;
        const v = visitas.get(grupo.chave) ?? {
          total: grupo.imoveis.length,
          previaAgendada: 0,
          previaRealizada: 0,
          clienteAgendada: 0,
          clienteRealizada: 0,
        };
        const etapas = etapasDoContato(contato, v);
        const feitas = etapas.filter((e) => e.feita).length;
        const parceria: ContatoParceriaStatus = contato?.parceria_status ?? "pendente";
        const telefone = contato?.telefone?.trim() || grupo.telefone;
        const whatsapp = linkWhatsapp(
          telefone,
          mensagemWhatsappContato(grupo.imoveis)
        );

        return (
          <details
            key={grupo.chave}
            open
            className="group rounded-lg border border-[#e4e0d9] bg-[#faf8f5]"
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#0b1f34]">
                  <span className="mr-1.5 inline-block text-xs text-[#5b6472] transition-transform group-open:rotate-90">
                    ▶
                  </span>
                  {grupo.nome}
                </p>
                <p className="ml-5 text-xs text-[#5b6472]">
                  {grupo.imoveis.length}{" "}
                  {grupo.imoveis.length === 1 ? "imóvel" : "imóveis"}
                  {telefone ? ` · ${telefone}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${PARCERIA_STATUS_COLORS[parceria]}`}
                >
                  {PARCERIA_STATUS_LABELS[parceria]}
                </span>
                <span className="rounded-full border border-[#e4e0d9] bg-white px-2.5 py-0.5 text-xs font-medium text-[#0b1f34]">
                  {feitas}/{etapas.length} etapas
                </span>
              </div>
            </summary>

            <div className="space-y-4 border-t border-[#e4e0d9] bg-white p-4">
              <ol className="flex flex-wrap gap-1.5">
                {etapas.map((e) => (
                  <li
                    key={e.key}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      e.feita
                        ? "border-green-300 bg-green-50 text-green-800"
                        : "border-[#e4e0d9] bg-white text-[#5b6472]"
                    }`}
                  >
                    {e.feita ? "✓" : "○"} {e.label}
                  </li>
                ))}
              </ol>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                {whatsapp ? (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-[#d6b072] px-3 py-1.5 text-xs font-medium text-[#0b1f34] hover:brightness-105"
                  >
                    Chamar no WhatsApp
                  </a>
                ) : (
                  <span className="rounded-md border border-dashed border-[#d6b072] bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                    {telefone
                      ? "Telefone sem DDD — informe com DDD abaixo para liberar o WhatsApp."
                      : "Sem telefone — informe abaixo para liberar o WhatsApp."}
                  </span>
                )}
                {telefone && (
                  <a
                    href={`tel:${telefone.replace(/[^\d+]/g, "")}`}
                    className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-xs hover:bg-[#faf8f5]"
                  >
                    Ligar
                  </a>
                )}
                {grupo.parceiro && (
                  <Link
                    href={`/parceiros/${grupo.parceiro.id}`}
                    className="text-xs text-[#5b6472] hover:underline"
                  >
                    Ver parceiro
                    {grupo.parceiro.modelo_divisao
                      ? ` (divisão habitual: ${grupo.parceiro.modelo_divisao})`
                      : ""}
                  </Link>
                )}
              </div>

              <form
                key={contato?.atualizado_em ?? "novo"}
                action={salvar}
                className="space-y-3 rounded-md border border-[#e4e0d9] p-3"
              >
                <input type="hidden" name="chave" value={grupo.chave} />
                <input type="hidden" name="nome" value={grupo.nome} />

                <div>
                  <label className={labelClass} htmlFor={`telefone-${grupo.chave}`}>
                    Telefone / WhatsApp do contato
                  </label>
                  <input
                    id={`telefone-${grupo.chave}`}
                    name="telefone"
                    type="tel"
                    defaultValue={contato?.telefone ?? grupo.telefone ?? ""}
                    placeholder="(31) 99999-9999"
                    className={inputClass}
                  />
                </div>

                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="contatado"
                    defaultChecked={Boolean(contato?.contatado_em)}
                    className="mt-0.5"
                  />
                  <span>
                    Contato feito
                    {contato?.contatado_em && (
                      <span className="ml-1 text-xs text-[#5b6472]">
                        ({formatDateTime(contato.contatado_em)})
                      </span>
                    )}
                  </span>
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelClass} htmlFor={`parceria-${grupo.chave}`}>
                      Parceria 50/50
                    </label>
                    <select
                      id={`parceria-${grupo.chave}`}
                      name="parceria_status"
                      defaultValue={parceria}
                      className={inputClass}
                    >
                      {(Object.keys(PARCERIA_STATUS_LABELS) as ContatoParceriaStatus[]).map(
                        (s) => (
                          <option key={s} value={s}>
                            {PARCERIA_STATUS_LABELS[s]}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor={`parceria-detalhe-${grupo.chave}`}>
                      Condições combinadas
                    </label>
                    <input
                      id={`parceria-detalhe-${grupo.chave}`}
                      name="parceria_detalhe"
                      defaultValue={contato?.parceria_detalhe ?? ""}
                      placeholder="Ex.: 50/50 sobre a comissão, pago na escritura"
                      className={inputClass}
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="situacao_confirmada"
                    defaultChecked={Boolean(contato?.situacao_confirmada_em)}
                    className="mt-0.5"
                  />
                  <span>
                    Situação dos imóveis confirmada
                    <span className="ml-1 text-xs text-[#5b6472]">
                      (disponibilidade, preço, documentação)
                    </span>
                    {contato?.situacao_confirmada_em && (
                      <span className="ml-1 text-xs text-[#5b6472]">
                        — {formatDateTime(contato.situacao_confirmada_em)}
                      </span>
                    )}
                  </span>
                </label>

                <div className="space-y-2">
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="chave_combinada"
                      defaultChecked={Boolean(contato?.chave_combinada_em)}
                      className="mt-0.5"
                    />
                    <span>
                      Chave / acesso combinado para a visita prévia
                      {contato?.chave_combinada_em && (
                        <span className="ml-1 text-xs text-[#5b6472]">
                          — {formatDateTime(contato.chave_combinada_em)}
                        </span>
                      )}
                    </span>
                  </label>
                  <input
                    name="chave_detalhe"
                    defaultValue={contato?.chave_detalhe ?? ""}
                    placeholder="Onde, quando e com quem retirar a chave"
                    aria-label="Detalhes da retirada da chave"
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-1 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-xs text-[#5b6472]">Visita prévia: </span>
                    {resumoVisitas([
                      [v.previaRealizada, `de ${v.total} realizada(s)`],
                      [v.previaAgendada, "agendada(s)"],
                    ])}
                  </p>
                  <p>
                    <span className="text-xs text-[#5b6472]">Visita com o cliente: </span>
                    {resumoVisitas([
                      [v.clienteRealizada, "realizada(s)"],
                      [v.clienteAgendada, "agendada(s)"],
                    ])}
                  </p>
                </div>

                <div>
                  <label className={labelClass} htmlFor={`obs-${grupo.chave}`}>
                    Observações do contato
                  </label>
                  <textarea
                    id={`obs-${grupo.chave}`}
                    name="observacoes"
                    rows={2}
                    defaultValue={contato?.observacoes ?? ""}
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
                >
                  Salvar roteiro
                </button>
              </form>

              <div className="space-y-3">
                {[...grupo.imoveis]
                  .sort(
                    (a, b) =>
                      Number(b.curadoria_id === escolhidaCuradoriaId) -
                      Number(a.curadoria_id === escolhidaCuradoriaId)
                  )
                  .map((imovel) => (
                    <ImovelCard
                      key={imovel.curadoria_id}
                      imovel={imovel}
                      clienteId={clienteId}
                      escolha={{
                        escolhido: imovel.curadoria_id === escolhidaCuradoriaId,
                        outroEscolhidoTitulo:
                          escolhidaCuradoriaId &&
                          escolhidaCuradoriaId !== imovel.curadoria_id
                            ? (tituloPorCuradoria.get(escolhidaCuradoriaId) ?? "outro imóvel")
                            : null,
                        voltar: `/crm/${oportunidadeId}`,
                        editavel,
                      }}
                    />
                  ))}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
