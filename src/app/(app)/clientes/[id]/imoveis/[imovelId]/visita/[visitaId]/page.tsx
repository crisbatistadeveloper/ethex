import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateVisitaPrevia } from "@/app/(app)/clientes/[id]/imoveis/visita-actions";
import { VisitaMidiaUploader } from "@/components/VisitaMidiaUploader";
import {
  VISITA_OBS_CAMPOS,
  VISITA_RECOMENDACOES,
  VISITA_RECOMENDACAO_LABELS,
  VISITA_STATUS,
  VISITA_STATUS_COLORS,
  VISITA_STATUS_LABELS,
} from "@/lib/visita-previa";
import type {
  VisitaPreviaMidiaRow,
  VisitaPreviaRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-sm font-medium text-[#0b1f34]";

export default async function VisitaPreviaRelatorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; imovelId: string; visitaId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: clienteId, imovelId: curadoriaId, visitaId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: visita } = await supabase
    .from("visita_previa")
    .select("*")
    .eq("id", visitaId)
    .returns<VisitaPreviaRow[]>()
    .maybeSingle();

  if (!visita) notFound();

  const { data: consultor } = await supabase
    .from("usuario")
    .select("nome")
    .eq("id", visita.consultor_id)
    .maybeSingle();

  const { data: midias } = await supabase
    .from("visita_previa_midia")
    .select("*")
    .eq("visita_id", visitaId)
    .order("ordem", { ascending: true })
    .returns<VisitaPreviaMidiaRow[]>();

  const updateAction = updateVisitaPrevia.bind(
    null,
    visitaId,
    curadoriaId,
    clienteId
  );

  const dataLocal = visita.data_visita
    ? new Date(visita.data_visita)
    : null;
  const dataInput = dataLocal
    ? new Date(dataLocal.getTime() - dataLocal.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/clientes/${clienteId}/imoveis/${curadoriaId}`}
        className="text-sm text-[#5b6472] hover:underline"
      >
        ← Voltar ao imóvel
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Relatório da visita prévia</h1>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${VISITA_STATUS_COLORS[visita.status]}`}
        >
          {VISITA_STATUS_LABELS[visita.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-[#5b6472]">
        Consultor: {consultor?.nome ?? "—"} · Material reutilizável para
        apresentação futura ao cliente
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={updateAction} className="mt-6 space-y-6">
        <section className="rounded-lg border border-[#e4e0d9] bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold">Visita</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className={labelClass}>
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={visita.status}
                className={inputClass}
              >
                {VISITA_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {VISITA_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="data_visita" className={labelClass}>
                Data / hora
              </label>
              <input
                id="data_visita"
                name="data_visita"
                type="datetime-local"
                defaultValue={dataInput}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="observacoes_gerais" className={labelClass}>
                Observações gerais
              </label>
              <textarea
                id="observacoes_gerais"
                name="observacoes_gerais"
                rows={2}
                defaultValue={visita.observacoes_gerais ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#e4e0d9] bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold">Relatório</h2>
          <div>
            <label htmlFor="avaliacao_geral" className={labelClass}>
              Avaliação geral
            </label>
            <textarea
              id="avaliacao_geral"
              name="avaliacao_geral"
              rows={3}
              defaultValue={visita.avaliacao_geral ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="pontos_positivos" className={labelClass}>
              Pontos positivos
            </label>
            <textarea
              id="pontos_positivos"
              name="pontos_positivos"
              rows={3}
              defaultValue={visita.pontos_positivos ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="pontos_negativos" className={labelClass}>
              Pontos negativos
            </label>
            <textarea
              id="pontos_negativos"
              name="pontos_negativos"
              rows={3}
              defaultValue={visita.pontos_negativos ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="observacoes_relatorio" className={labelClass}>
              Observações do relatório
            </label>
            <textarea
              id="observacoes_relatorio"
              name="observacoes_relatorio"
              rows={2}
              defaultValue={visita.observacoes_relatorio ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="recomendacao" className={labelClass}>
              Recomendação do consultor
            </label>
            <select
              id="recomendacao"
              name="recomendacao"
              defaultValue={visita.recomendacao ?? ""}
              className={inputClass}
            >
              <option value="">Sem recomendação</option>
              {VISITA_RECOMENDACOES.map((r) => (
                <option key={r} value={r}>
                  {VISITA_RECOMENDACAO_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-lg border border-[#e4e0d9] bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold">Informações observadas</h2>
          <p className="text-xs text-[#5b6472]">
            Campos opcionais — texto livre.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {VISITA_OBS_CAMPOS.map((campo) => (
              <div key={campo.key} className="sm:col-span-2">
                <label htmlFor={campo.key} className={labelClass}>
                  {campo.label}
                </label>
                <textarea
                  id={campo.key}
                  name={campo.key}
                  rows={2}
                  defaultValue={
                    (visita[campo.key as keyof VisitaPreviaRow] as
                      | string
                      | null) ?? ""
                  }
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </section>

        <button
          type="submit"
          className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
        >
          Salvar relatório
        </button>
      </form>

      <section className="mt-6 rounded-lg border border-[#e4e0d9] bg-white p-5">
        <h2 className="text-sm font-semibold">Fotos e vídeos</h2>
        <p className="mt-1 text-xs text-[#5b6472]">
          Ordem usada depois na apresentação ao cliente. Arquivos no bucket{" "}
          <code className="rounded bg-[#efe9e0] px-1">visitas-imoveis</code>.
        </p>
        <div className="mt-4">
          <VisitaMidiaUploader
            visitaId={visitaId}
            curadoriaId={curadoriaId}
            clienteId={clienteId}
            initialMidias={midias ?? []}
          />
        </div>
      </section>
    </div>
  );
}
