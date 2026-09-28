import {
  createImovelDocumento,
  updateDueDiligenceCuradoria,
  updateImovelDocumento,
} from "@/app/(app)/clientes/[id]/imoveis/due-diligence-actions";
import { DocumentoUploader } from "@/components/DocumentoUploader";
import {
  CHECKLIST_KEYS,
  CHECKLIST_LABELS,
  DOCUMENTO_STATUS,
  DOCUMENTO_STATUS_ICONS,
  DOCUMENTO_STATUS_LABELS,
  DOCUMENTO_TIPOS,
  DOCUMENTO_TIPO_LABELS,
  DUE_DILIGENCE_STATUS,
  DUE_DILIGENCE_STATUS_COLORS,
  DUE_DILIGENCE_STATUS_LABELS,
  checklistProgress,
  normalizeChecklist,
} from "@/lib/due-diligence";
import type {
  DueDiligenceStatus,
  ImovelDocumentoRow,
  ImovelDocumentoStatus,
} from "@/lib/database.types";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-xs font-medium text-[#5b6472]";
const stepClass =
  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d6b072] text-[11px] font-semibold text-[#0b1f34]";

const DOCUMENTO_STATUS_COLORS: Record<ImovelDocumentoStatus, string> = {
  pendente: "bg-[#efe9e0] text-[#0b1f34] border-[#e4e0d9]",
  solicitado: "bg-amber-50 text-amber-800 border-amber-200",
  recebido: "bg-sky-50 text-sky-800 border-sky-200",
  aprovado: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejeitado: "bg-red-50 text-red-800 border-red-200",
};

type ChecklistKey = (typeof CHECKLIST_KEYS)[number];

function documentoEmMaos(d: ImovelDocumentoRow): boolean {
  return d.status === "recebido" || d.status === "aprovado";
}

/** Itens do checklist que os documentos cadastrados já indicam como atendidos. */
function sugestoesDosDocumentos(
  documentos: ImovelDocumentoRow[]
): Partial<Record<ChecklistKey, string>> {
  const s: Partial<Record<ChecklistKey, string>> = {};
  const matricula = documentos.find(
    (d) => d.tipo === "matricula" && documentoEmMaos(d)
  );
  if (matricula) {
    s.matricula_atualizada = `matrícula ${DOCUMENTO_STATUS_LABELS[matricula.status].toLowerCase()}`;
  }
  const iptu = documentos.find((d) => d.tipo === "iptu" && documentoEmMaos(d));
  if (iptu) {
    s.iptu = `IPTU ${DOCUMENTO_STATUS_LABELS[iptu.status].toLowerCase()}`;
  }
  if (documentos.length > 0 && documentos.every(documentoEmMaos)) {
    s.documentacao_recebida = "todos os documentos em mãos";
  }
  return s;
}

function formatData(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function DueDiligenceSection({
  curadoriaId,
  clienteId,
  imovelId,
  status,
  observacoes,
  checklistRaw,
  documentos,
  urlsArquivos,
}: {
  curadoriaId: string;
  clienteId: string;
  imovelId: string;
  status: DueDiligenceStatus;
  observacoes: string | null;
  checklistRaw: unknown;
  documentos: ImovelDocumentoRow[];
  /** URL assinada temporária por id do documento. */
  urlsArquivos: Record<string, string>;
}) {
  const checklist = normalizeChecklist(checklistRaw);
  const { done, total } = checklistProgress(checklist);
  const sugestoes = sugestoesDosDocumentos(documentos);
  const updateDd = updateDueDiligenceCuradoria.bind(null, curadoriaId, clienteId);
  const createDoc = createImovelDocumento.bind(null, curadoriaId, clienteId);
  const emMaos = documentos.filter(documentoEmMaos).length;

  return (
    <section className="mt-4 rounded-lg border border-[#e4e0d9] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0b1f34]">
            Due diligence
          </h2>
          <p className="mt-1 text-xs text-[#5b6472]">
            Verificação <strong>preliminar</strong> do imóvel antes de
            apresentá-lo ao cliente. Não substitui análise jurídica profissional.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#5b6472]">
          <span
            className={`rounded-full border px-2.5 py-0.5 font-medium ${DUE_DILIGENCE_STATUS_COLORS[status]}`}
          >
            {DUE_DILIGENCE_STATUS_LABELS[status]}
          </span>
          <span>
            Documentos: {emMaos}/{documentos.length} em mãos
          </span>
          <span>·</span>
          <span>
            Checklist: {done}/{total}
          </span>
        </div>
      </div>

      {/* 1. Documentos */}
      <div className="mt-5">
        <div className="flex items-center gap-2">
          <span className={stepClass}>1</span>
          <h3 className="text-sm font-semibold text-[#0b1f34]">Documentos</h3>
        </div>
        <p className="mt-1 pl-7 text-xs text-[#5b6472]">
          Ficam no imóvel do catálogo e são reaproveitados em outras curadorias
          do mesmo imóvel. Cada documento é salvo individualmente.
        </p>

        <ul className="mt-3 divide-y divide-[#e4e0d9] rounded-md border border-[#e4e0d9]">
          {documentos.length === 0 && (
            <li className="px-3 py-4 text-sm text-[#5b6472]">
              Nenhum documento cadastrado ainda. Comece adicionando a matrícula
              e o IPTU.
            </li>
          )}
          {documentos.map((d) => {
            const updateDoc = updateImovelDocumento.bind(
              null,
              d.id,
              curadoriaId,
              clienteId
            );
            const tipoLabel = DOCUMENTO_TIPO_LABELS[d.tipo] ?? d.titulo;
            const arquivoUrl = urlsArquivos[d.id] ?? d.url;
            const recebidoEm = formatData(d.data_recebimento);
            return (
              <li key={d.id} className="px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0b1f34]">
                      {tipoLabel}
                    </p>
                    {d.titulo && d.titulo !== tipoLabel && (
                      <p className="text-xs text-[#5b6472]">{d.titulo}</p>
                    )}
                    <p className="mt-0.5 text-xs text-[#5b6472]">
                      {recebidoEm ? `Recebido em ${recebidoEm}` : "Sem data de recebimento"}
                      {arquivoUrl ? " · arquivo anexado" : " · sem arquivo"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${DOCUMENTO_STATUS_COLORS[d.status]}`}
                  >
                    {DOCUMENTO_STATUS_ICONS[d.status]}{" "}
                    {DOCUMENTO_STATUS_LABELS[d.status]}
                  </span>
                </div>

                <details className="group mt-2">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-[#0b1f34] hover:text-[#0b1f34]">
                    <span className="transition-transform group-open:rotate-90">›</span>
                    Editar / anexar arquivo
                  </summary>
                  <div className="mt-3 space-y-3 rounded-md bg-[#faf8f5] p-3">
                    <div>
                      <span className={labelClass}>Arquivo</span>
                      <p className="text-[11px] text-[#5b6472]">
                        O envio é salvo na hora e marca o documento como recebido.
                      </p>
                      <DocumentoUploader
                        documentoId={d.id}
                        curadoriaId={curadoriaId}
                        clienteId={clienteId}
                        imovelId={imovelId}
                        currentUrl={arquivoUrl}
                      />
                    </div>
                    <form action={updateDoc} className="space-y-3 border-t border-[#e4e0d9] pt-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`status-${d.id}`} className={labelClass}>
                            Status
                          </label>
                          <select
                            id={`status-${d.id}`}
                            name="status"
                            defaultValue={d.status}
                            className={inputClass}
                          >
                            {DOCUMENTO_STATUS.map((s) => (
                              <option key={s} value={s}>
                                {DOCUMENTO_STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`receb-${d.id}`} className={labelClass}>
                            Data de recebimento
                          </label>
                          <input
                            id={`receb-${d.id}`}
                            type="date"
                            name="data_recebimento"
                            defaultValue={d.data_recebimento ?? ""}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`obs-${d.id}`} className={labelClass}>
                          Observações
                        </label>
                        <textarea
                          id={`obs-${d.id}`}
                          name="observacoes"
                          rows={2}
                          defaultValue={d.observacoes ?? ""}
                          className={inputClass}
                        />
                      </div>
                      <input type="hidden" name="titulo" value={d.titulo} />
                      <button
                        type="submit"
                        className="rounded-md border border-[#e4e0d9] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#efe9e0]"
                      >
                        Salvar documento
                      </button>
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>

        <details className="group mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-dashed border-[#e4e0d9] px-3 py-1.5 text-sm text-[#0b1f34] hover:bg-[#faf8f5]">
            + Adicionar documento
          </summary>
          <form
            action={createDoc}
            className="mt-3 space-y-3 rounded-md border border-[#e4e0d9] p-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="novo-doc-tipo" className={labelClass}>
                  Tipo
                </label>
                <select
                  id="novo-doc-tipo"
                  name="tipo"
                  defaultValue="matricula"
                  className={inputClass}
                >
                  {DOCUMENTO_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {DOCUMENTO_TIPO_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="novo-doc-status" className={labelClass}>
                  Status
                </label>
                <select
                  id="novo-doc-status"
                  name="status"
                  defaultValue="pendente"
                  className={inputClass}
                >
                  {DOCUMENTO_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {DOCUMENTO_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="novo-doc-titulo" className={labelClass}>
                  Nome / descrição
                </label>
                <input
                  id="novo-doc-titulo"
                  name="titulo"
                  className={inputClass}
                  placeholder="Opcional — usa o nome do tipo se vazio"
                />
              </div>
              <div>
                <label htmlFor="novo-doc-data" className={labelClass}>
                  Data do documento
                </label>
                <input
                  id="novo-doc-data"
                  name="data_documento"
                  type="date"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="novo-doc-receb" className={labelClass}>
                  Data de recebimento
                </label>
                <input
                  id="novo-doc-receb"
                  name="data_recebimento"
                  type="date"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="novo-doc-obs" className={labelClass}>
                  Observações
                </label>
                <textarea
                  id="novo-doc-obs"
                  name="observacoes"
                  rows={2}
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-[11px] text-[#5b6472]">
              O arquivo pode ser anexado depois de registrar, em “Editar / anexar
              arquivo”.
            </p>
            <button
              type="submit"
              className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
            >
              Registrar documento
            </button>
          </form>
        </details>
      </div>

      {/* 2. Análise */}
      <form action={updateDd} className="mt-6 border-t border-[#e4e0d9] pt-5">
        <div className="flex items-center gap-2">
          <span className={stepClass}>2</span>
          <h3 className="text-sm font-semibold text-[#0b1f34]">
            Análise preliminar
          </h3>
        </div>
        <p className="mt-1 pl-7 text-xs text-[#5b6472]">
          Conclusão do consultor para esta curadoria. Itens sugeridos pelos
          documentos já vêm marcados — confira e salve para confirmar.
        </p>

        <ul className="mt-3 space-y-2 pl-7">
          {CHECKLIST_KEYS.map((key) => {
            const sugestao = sugestoes[key];
            const pendenteDeConfirmar = Boolean(sugestao) && !checklist[key];
            return (
              <li key={key} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <input
                  type="checkbox"
                  id={key}
                  name={key}
                  defaultChecked={checklist[key] || Boolean(sugestao)}
                />
                <label htmlFor={key}>{CHECKLIST_LABELS[key]}</label>
                {sugestao && (
                  <span
                    className={`text-[11px] ${pendenteDeConfirmar ? "text-amber-700" : "text-[#5b6472]"}`}
                  >
                    {pendenteDeConfirmar
                      ? `sugerido: ${sugestao} — salve para confirmar`
                      : sugestao}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 grid gap-3 pl-7 sm:grid-cols-2">
          <div>
            <label htmlFor="due_diligence_status" className={labelClass}>
              Resultado da análise
            </label>
            <select
              id="due_diligence_status"
              name="due_diligence_status"
              defaultValue={status}
              className={inputClass}
            >
              {DUE_DILIGENCE_STATUS.map((s) => (
                <option key={s} value={s}>
                  {DUE_DILIGENCE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="due_diligence_observacoes" className={labelClass}>
              Observações da análise
            </label>
            <textarea
              id="due_diligence_observacoes"
              name="due_diligence_observacoes"
              rows={3}
              defaultValue={observacoes ?? ""}
              className={inputClass}
              placeholder="Ex.: Documentação inicial recebida. Não foram identificados impedimentos nesta análise preliminar…"
            />
          </div>
        </div>

        <div className="mt-4 pl-7">
          <button
            type="submit"
            className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
          >
            Salvar análise
          </button>
          <span className="ml-3 text-[11px] text-[#5b6472]">
            Salva checklist, resultado e observações.
          </span>
        </div>
      </form>
    </section>
  );
}
