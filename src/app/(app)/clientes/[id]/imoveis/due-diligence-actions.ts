"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { strField } from "@/lib/form-utils";
import {
  CHECKLIST_DEFAULT,
  CHECKLIST_KEYS,
  DOCUMENTO_STATUS,
  DOCUMENTO_TIPOS,
  DUE_DILIGENCE_STATUS,
  DOCUMENTO_TIPO_LABELS,
} from "@/lib/due-diligence";
import type {
  DueDiligenceChecklist,
  DueDiligenceStatus,
  ImovelDocumentoStatus,
  ImovelDocumentoTipo,
} from "@/lib/database.types";

function revalidateCuradoria(clienteId: string, curadoriaId: string) {
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function imovelIdDaCuradoria(curadoriaId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("imovel_encontrado")
    .select("imovel_id")
    .eq("id", curadoriaId)
    .maybeSingle();
  return (data?.imovel_id as string | null) ?? null;
}

export async function createImovelDocumento(
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();
  const imovelId = await imovelIdDaCuradoria(curadoriaId);
  if (!imovelId) {
    redirect(
      `/clientes/${clienteId}/imoveis/${curadoriaId}?error=${encodeURIComponent("Curadoria sem imóvel")}`
    );
  }

  const tipoRaw = strField(formData, "tipo") ?? "outro";
  const tipo = (
    DOCUMENTO_TIPOS.includes(tipoRaw as ImovelDocumentoTipo)
      ? tipoRaw
      : "outro"
  ) as ImovelDocumentoTipo;

  const titulo =
    strField(formData, "titulo") ?? DOCUMENTO_TIPO_LABELS[tipo];
  const statusRaw = strField(formData, "status") ?? "pendente";
  const status = (
    DOCUMENTO_STATUS.includes(statusRaw as ImovelDocumentoStatus)
      ? statusRaw
      : "pendente"
  ) as ImovelDocumentoStatus;

  const url = strField(formData, "url");
  const dataDocumento = strField(formData, "data_documento");
  const dataRecebimento = strField(formData, "data_recebimento");
  const observacoes = strField(formData, "observacoes");

  // Evita duplicar matricula/IPTU no mesmo imóvel
  if (tipo === "matricula" || tipo === "iptu") {
    const { data: existente } = await supabase
      .from("imovel_documento")
      .select("id")
      .eq("imovel_id", imovelId)
      .eq("tipo", tipo)
      .limit(1)
      .maybeSingle();
    if (existente) {
      redirect(
        `/clientes/${clienteId}/imoveis/${curadoriaId}?error=${encodeURIComponent(
          `Já existe ${DOCUMENTO_TIPO_LABELS[tipo]} neste imóvel. Atualize o documento existente.`
        )}`
      );
    }
  }

  const { error } = await supabase.from("imovel_documento").insert({
    imovel_id: imovelId,
    tipo,
    titulo,
    status,
    url,
    data_documento: dataDocumento,
    data_recebimento: dataRecebimento,
    observacoes,
  });

  if (error) {
    redirect(
      `/clientes/${clienteId}/imoveis/${curadoriaId}?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.from("imovel_encontrado_historico").insert({
    imovel_encontrado_id: curadoriaId,
    autor_id: user.id,
    tipo: "observacao",
    detalhe: `Documento adicionado: ${titulo} (${status})`,
  });

  revalidateCuradoria(clienteId, curadoriaId);
  redirect(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}

export async function updateImovelDocumento(
  documentoId: string,
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();

  const statusRaw = strField(formData, "status") ?? "pendente";
  const status = (
    DOCUMENTO_STATUS.includes(statusRaw as ImovelDocumentoStatus)
      ? statusRaw
      : "pendente"
  ) as ImovelDocumentoStatus;

  const titulo = strField(formData, "titulo");
  const url = strField(formData, "url");
  const dataDocumento = strField(formData, "data_documento");
  const dataRecebimento = strField(formData, "data_recebimento");
  const observacoes = strField(formData, "observacoes");

  const patch: Record<string, string | null> = { status };
  if (titulo) patch.titulo = titulo;
  if (formData.has("url")) patch.url = url;
  if (formData.has("data_documento")) patch.data_documento = dataDocumento;
  if (formData.has("data_recebimento"))
    patch.data_recebimento = dataRecebimento;
  if (formData.has("observacoes")) patch.observacoes = observacoes;

  const { data: doc, error } = await supabase
    .from("imovel_documento")
    .update(patch)
    .eq("id", documentoId)
    .select("titulo")
    .single();

  if (error) {
    redirect(
      `/clientes/${clienteId}/imoveis/${curadoriaId}?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.from("imovel_encontrado_historico").insert({
    imovel_encontrado_id: curadoriaId,
    autor_id: user.id,
    tipo: "observacao",
    detalhe: `Documento atualizado: ${doc?.titulo ?? "documento"} → ${status}`,
  });

  revalidateCuradoria(clienteId, curadoriaId);
  redirect(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}

export async function updateDueDiligenceCuradoria(
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();

  const statusRaw = strField(formData, "due_diligence_status") ?? "pendente";
  const status = (
    DUE_DILIGENCE_STATUS.includes(statusRaw as DueDiligenceStatus)
      ? statusRaw
      : "pendente"
  ) as DueDiligenceStatus;

  const observacoes = strField(formData, "due_diligence_observacoes");

  const checklist: DueDiligenceChecklist = { ...CHECKLIST_DEFAULT };
  for (const key of CHECKLIST_KEYS) {
    checklist[key] = formData.get(key) === "on";
  }

  const { data: atual } = await supabase
    .from("imovel_encontrado")
    .select("due_diligence_status, due_diligence_checklist")
    .eq("id", curadoriaId)
    .maybeSingle();

  const { error } = await supabase
    .from("imovel_encontrado")
    .update({
      due_diligence_status: status,
      due_diligence_observacoes: observacoes,
      due_diligence_checklist: checklist,
    })
    .eq("id", curadoriaId);

  if (error) {
    redirect(
      `/clientes/${clienteId}/imoveis/${curadoriaId}?error=${encodeURIComponent(error.message)}`
    );
  }

  const prevStatus = atual?.due_diligence_status as string | undefined;
  if (prevStatus !== status) {
    await supabase.from("imovel_encontrado_historico").insert({
      imovel_encontrado_id: curadoriaId,
      autor_id: user.id,
      tipo: "observacao",
      detalhe: `Due diligence prévia: ${prevStatus ?? "—"} → ${status}`,
    });
  }

  revalidateCuradoria(clienteId, curadoriaId);
  redirect(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}

/** Usado pelo uploader client após enviar ao Storage (bucket privado). */
export async function attachDocumentoArquivo(
  documentoId: string,
  curadoriaId: string,
  clienteId: string,
  storagePath: string
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser();

  const { data: doc } = await supabase
    .from("imovel_documento")
    .select("imovel_id")
    .eq("id", documentoId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Documento não encontrado" };
  if (!storagePath.startsWith(`${doc.imovel_id as string}/${documentoId}/`)) {
    return { ok: false, error: "Caminho de arquivo inválido" };
  }

  const { error } = await supabase
    .from("imovel_documento")
    .update({
      storage_path: storagePath,
      status: "recebido",
      data_recebimento: new Date().toISOString().slice(0, 10),
    })
    .eq("id", documentoId);
  if (error) return { ok: false, error: error.message };

  revalidateCuradoria(clienteId, curadoriaId);
  return { ok: true };
}
