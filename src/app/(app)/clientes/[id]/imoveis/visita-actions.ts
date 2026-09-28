"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { numField, strField } from "@/lib/form-utils";
import {
  VISITA_OBS_CAMPOS,
  VISITA_RECOMENDACOES,
  VISITA_STATUS,
} from "@/lib/visita-previa";
import type {
  VisitaMidiaTipo,
  VisitaPreviaRecomendacao,
  VisitaPreviaStatus,
} from "@/lib/database.types";

function revalidateVisita(
  clienteId: string,
  curadoriaId: string,
  visitaId?: string
) {
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
  if (visitaId) {
    revalidatePath(
      `/clientes/${clienteId}/imoveis/${curadoriaId}/visita/${visitaId}`
    );
  }
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

export async function agendarVisitaPrevia(
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

  const dataVisita = strField(formData, "data_visita");
  const observacoes = strField(formData, "observacoes_gerais");

  const { data, error } = await supabase
    .from("visita_previa")
    .insert({
      imovel_id: imovelId,
      imovel_encontrado_id: curadoriaId,
      consultor_id: user.id,
      status: "agendada" as VisitaPreviaStatus,
      data_visita: dataVisita
        ? new Date(dataVisita).toISOString()
        : new Date().toISOString(),
      observacoes_gerais: observacoes,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/clientes/${clienteId}/imoveis/${curadoriaId}?error=${encodeURIComponent(error?.message ?? "Erro ao agendar")}`
    );
  }

  await supabase.from("imovel_encontrado_historico").insert({
    imovel_encontrado_id: curadoriaId,
    autor_id: user.id,
    tipo: "observacao",
    detalhe: "Visita prévia ETHEX agendada",
  });

  revalidateVisita(clienteId, curadoriaId, data.id);
  redirect(
    `/clientes/${clienteId}/imoveis/${curadoriaId}/visita/${data.id}`
  );
}

export async function updateVisitaPrevia(
  visitaId: string,
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();

  const statusRaw = strField(formData, "status") ?? "agendada";
  const status = (
    VISITA_STATUS.includes(statusRaw as VisitaPreviaStatus)
      ? statusRaw
      : "agendada"
  ) as VisitaPreviaStatus;

  const recRaw = strField(formData, "recomendacao");
  const recomendacao = (
    recRaw &&
    VISITA_RECOMENDACOES.includes(recRaw as VisitaPreviaRecomendacao)
      ? recRaw
      : null
  ) as VisitaPreviaRecomendacao | null;

  const dataVisita = strField(formData, "data_visita");

  const patch: Record<string, string | null> = {
    status,
    recomendacao,
    observacoes_gerais: strField(formData, "observacoes_gerais"),
    avaliacao_geral: strField(formData, "avaliacao_geral"),
    pontos_positivos: strField(formData, "pontos_positivos"),
    pontos_negativos: strField(formData, "pontos_negativos"),
    observacoes_relatorio: strField(formData, "observacoes_relatorio"),
    data_visita: dataVisita
      ? new Date(dataVisita).toISOString()
      : null,
  };

  for (const campo of VISITA_OBS_CAMPOS) {
    patch[campo.key] = strField(formData, campo.key);
  }

  const { data: antes } = await supabase
    .from("visita_previa")
    .select("status")
    .eq("id", visitaId)
    .maybeSingle();

  const { error } = await supabase
    .from("visita_previa")
    .update(patch)
    .eq("id", visitaId);

  if (error) {
    redirect(
      `/clientes/${clienteId}/imoveis/${curadoriaId}/visita/${visitaId}?error=${encodeURIComponent(error.message)}`
    );
  }

  if (antes?.status !== status) {
    await supabase.from("imovel_encontrado_historico").insert({
      imovel_encontrado_id: curadoriaId,
      autor_id: user.id,
      tipo: "observacao",
      detalhe: `Visita prévia: ${antes?.status ?? "—"} → ${status}`,
    });
  }

  revalidateVisita(clienteId, curadoriaId, visitaId);
  redirect(
    `/clientes/${clienteId}/imoveis/${curadoriaId}/visita/${visitaId}`
  );
}

export async function addVisitaMidia(
  visitaId: string,
  curadoriaId: string,
  clienteId: string,
  payload: {
    tipo: VisitaMidiaTipo;
    url: string;
    storage_path: string;
    descricao?: string | null;
  }
) {
  const supabase = await createClient();

  const { data: maxOrd } = await supabase
    .from("visita_previa_midia")
    .select("ordem")
    .eq("visita_id", visitaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ordem = ((maxOrd?.ordem as number | undefined) ?? -1) + 1;

  await supabase.from("visita_previa_midia").insert({
    visita_id: visitaId,
    tipo: payload.tipo,
    url: payload.url,
    storage_path: payload.storage_path,
    descricao: payload.descricao ?? null,
    ordem,
  });

  revalidateVisita(clienteId, curadoriaId, visitaId);
}

export async function updateVisitaMidiaOrdem(
  visitaId: string,
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const midiaId = strField(formData, "midia_id");
  const ordem = numField(formData, "ordem");
  if (!midiaId || ordem == null) return;

  const supabase = await createClient();
  await supabase
    .from("visita_previa_midia")
    .update({ ordem })
    .eq("id", midiaId)
    .eq("visita_id", visitaId);

  revalidateVisita(clienteId, curadoriaId, visitaId);
}

export async function removeVisitaMidia(
  midiaId: string,
  visitaId: string,
  curadoriaId: string,
  clienteId: string
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visita_previa_midia")
    .select("storage_path")
    .eq("id", midiaId)
    .maybeSingle();

  await supabase.from("visita_previa_midia").delete().eq("id", midiaId);

  if (data?.storage_path) {
    await supabase.storage
      .from("visitas-imoveis")
      .remove([data.storage_path as string]);
  }

  revalidateVisita(clienteId, curadoriaId, visitaId);
}

/** Vincula visita existente (de outra curadoria) a esta curadoria só como referência no histórico. */
export async function vincularVisitaACuradoria(
  visitaId: string,
  curadoriaId: string,
  clienteId: string
) {
  const { supabase, user } = await requireUser();

  await supabase
    .from("visita_previa")
    .update({ imovel_encontrado_id: curadoriaId })
    .eq("id", visitaId)
    .is("imovel_encontrado_id", null);

  await supabase.from("imovel_encontrado_historico").insert({
    imovel_encontrado_id: curadoriaId,
    autor_id: user.id,
    tipo: "observacao",
    detalhe: "Visita prévia ETHEX existente vinculada a esta curadoria",
  });

  revalidateVisita(clienteId, curadoriaId, visitaId);
  redirect(
    `/clientes/${clienteId}/imoveis/${curadoriaId}/visita/${visitaId}`
  );
}
