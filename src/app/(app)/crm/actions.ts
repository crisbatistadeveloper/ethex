"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { numField, strField } from "@/lib/form-utils";
import { PIPELINE_ETAPAS } from "@/lib/crm";
import type {
  AtividadeStatus,
  AtividadeTipo,
  OportunidadeEtapa,
  OportunidadeStatus,
} from "@/lib/database.types";

const ETAPAS = new Set<string>(PIPELINE_ETAPAS);
const TIPOS_ATIVIDADE: AtividadeTipo[] = [
  "ligacao",
  "whatsapp",
  "reuniao",
  "entrevista",
  "visita",
  "tarefa",
  "observacao",
];

function revalidateCrm(oportunidadeId?: string) {
  revalidatePath("/crm");
  revalidatePath("/crm/pipeline");
  if (oportunidadeId) revalidatePath(`/crm/${oportunidadeId}`);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function registrarHistorico(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    oportunidade_id: string;
    autor_id: string;
    tipo: "criacao" | "etapa" | "status" | "nota";
    etapa_anterior?: OportunidadeEtapa | null;
    etapa_nova?: OportunidadeEtapa | null;
    status_anterior?: OportunidadeStatus | null;
    status_novo?: OportunidadeStatus | null;
    detalhe?: string | null;
  }
) {
  await supabase.from("oportunidade_historico").insert({
    oportunidade_id: params.oportunidade_id,
    autor_id: params.autor_id,
    tipo: params.tipo,
    etapa_anterior: params.etapa_anterior ?? null,
    etapa_nova: params.etapa_nova ?? null,
    status_anterior: params.status_anterior ?? null,
    status_novo: params.status_novo ?? null,
    detalhe: params.detalhe ?? null,
  });
}

const novaOportunidadeSchema = z.object({
  cliente_id: z.string().uuid("Cliente inválido"),
  titulo: z.string().min(1, "Título é obrigatório"),
  etapa: z.string(),
  valor_estimado: z.number().nullable(),
  observacoes: z.string().nullable(),
});

export async function createOportunidade(formData: FormData) {
  const etapaRaw = strField(formData, "etapa") ?? "novo_lead";
  const parsed = novaOportunidadeSchema.safeParse({
    cliente_id: strField(formData, "cliente_id"),
    titulo: strField(formData, "titulo"),
    etapa: etapaRaw,
    valor_estimado: numField(formData, "valor_estimado"),
    observacoes: strField(formData, "observacoes"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados inválidos";
    redirect(`/crm/novo?error=${encodeURIComponent(message)}`);
  }

  if (!ETAPAS.has(parsed.data.etapa)) {
    redirect(`/crm/novo?error=${encodeURIComponent("Etapa inválida")}`);
  }

  const { supabase, user } = await requireUser();

  const { data: cliente } = await supabase
    .from("cliente")
    .select("id, consultor_id, nome")
    .eq("id", parsed.data.cliente_id)
    .maybeSingle();

  if (!cliente) {
    redirect(`/crm/novo?error=${encodeURIComponent("Cliente não encontrado")}`);
  }

  const { data, error } = await supabase
    .from("oportunidade")
    .insert({
      cliente_id: parsed.data.cliente_id,
      consultor_id: cliente.consultor_id,
      titulo: parsed.data.titulo,
      etapa: parsed.data.etapa as OportunidadeEtapa,
      status: "aberta" as OportunidadeStatus,
      valor_estimado: parsed.data.valor_estimado,
      observacoes: parsed.data.observacoes,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/crm/novo?error=${encodeURIComponent(error?.message ?? "Erro ao criar")}`
    );
  }

  await registrarHistorico(supabase, {
    oportunidade_id: data.id,
    autor_id: user.id,
    tipo: "criacao",
    etapa_nova: parsed.data.etapa as OportunidadeEtapa,
    status_novo: "aberta",
    detalhe: `Oportunidade criada para ${cliente.nome}`,
  });

  revalidateCrm(data.id);
  redirect(`/crm/${data.id}`);
}

export async function moveOportunidadeEtapa(
  oportunidadeId: string,
  etapa: OportunidadeEtapa
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!ETAPAS.has(etapa)) {
    return { ok: false, error: "Etapa inválida" };
  }

  const { supabase, user } = await requireUser();

  const { data: atual } = await supabase
    .from("oportunidade")
    .select("id, etapa, status")
    .eq("id", oportunidadeId)
    .maybeSingle();

  if (!atual) return { ok: false, error: "Oportunidade não encontrada" };
  if (atual.status !== "aberta") {
    return { ok: false, error: "Só oportunidades abertas podem mudar de etapa" };
  }
  if (atual.etapa === etapa) return { ok: true };

  const { error } = await supabase
    .from("oportunidade")
    .update({ etapa })
    .eq("id", oportunidadeId);

  if (error) return { ok: false, error: error.message };

  await registrarHistorico(supabase, {
    oportunidade_id: oportunidadeId,
    autor_id: user.id,
    tipo: "etapa",
    etapa_anterior: atual.etapa as OportunidadeEtapa,
    etapa_nova: etapa,
    detalhe: `Etapa alterada de ${atual.etapa} para ${etapa}`,
  });

  revalidateCrm(oportunidadeId);
  return { ok: true };
}

/**
 * Ganha/perdida só pelo fechamento (/crm/[id]/fechamento). Aqui resta apenas
 * reabrir oportunidades antigas marcadas sem fechamento (o banco bloqueia as demais).
 */
export async function reabrirOportunidadeSemFechamento(oportunidadeId: string) {
  const { supabase, user } = await requireUser();

  const { data: atual } = await supabase
    .from("oportunidade")
    .select("status, etapa")
    .eq("id", oportunidadeId)
    .maybeSingle();
  if (!atual || atual.status === "aberta") redirect(`/crm/${oportunidadeId}`);

  const { error } = await supabase
    .from("oportunidade")
    .update({ status: "aberta" as OportunidadeStatus })
    .eq("id", oportunidadeId);
  if (error) {
    redirect(`/crm/${oportunidadeId}?error=${encodeURIComponent(error.message)}`);
  }

  await registrarHistorico(supabase, {
    oportunidade_id: oportunidadeId,
    autor_id: user.id,
    tipo: "status",
    status_anterior: atual.status as OportunidadeStatus,
    status_novo: "aberta",
    detalhe: "Oportunidade reaberta (não tinha fechamento registrado)",
  });

  revalidateCrm(oportunidadeId);
  redirect(`/crm/${oportunidadeId}`);
}

export async function updateOportunidadeObservacoes(
  oportunidadeId: string,
  formData: FormData
) {
  const observacoes = strField(formData, "observacoes");
  const { supabase, user } = await requireUser();

  await supabase
    .from("oportunidade")
    .update({ observacoes })
    .eq("id", oportunidadeId);

  await registrarHistorico(supabase, {
    oportunidade_id: oportunidadeId,
    autor_id: user.id,
    tipo: "nota",
    detalhe: observacoes
      ? "Observações atualizadas"
      : "Observações removidas",
  });

  revalidateCrm(oportunidadeId);
}

export async function createAtividade(
  oportunidadeId: string,
  formData: FormData
) {
  const tipo = (strField(formData, "tipo") ?? "tarefa") as AtividadeTipo;
  const titulo = strField(formData, "titulo");
  const descricao = strField(formData, "descricao");
  const dataHora = strField(formData, "data_hora");

  if (!titulo) {
    redirect(
      `/crm/${oportunidadeId}?error=${encodeURIComponent("Título da atividade é obrigatório")}`
    );
  }
  if (!TIPOS_ATIVIDADE.includes(tipo)) {
    redirect(
      `/crm/${oportunidadeId}?error=${encodeURIComponent("Tipo de atividade inválido")}`
    );
  }

  const { supabase, user } = await requireUser();

  const { data: op } = await supabase
    .from("oportunidade")
    .select("id, cliente_id")
    .eq("id", oportunidadeId)
    .maybeSingle();

  if (!op) {
    redirect(`/crm?error=${encodeURIComponent("Oportunidade não encontrada")}`);
  }

  const { error } = await supabase.from("atividade").insert({
    oportunidade_id: oportunidadeId,
    cliente_id: op.cliente_id,
    responsavel_id: user.id,
    tipo,
    titulo,
    descricao,
    data_hora: dataHora
      ? new Date(dataHora).toISOString()
      : new Date().toISOString(),
    status: "pendente" as AtividadeStatus,
  });

  if (error) {
    redirect(
      `/crm/${oportunidadeId}?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidateCrm(oportunidadeId);
  redirect(`/crm/${oportunidadeId}`);
}

export async function toggleAtividadeStatus(
  atividadeId: string,
  oportunidadeId: string,
  formData: FormData
) {
  const status = strField(formData, "status") as AtividadeStatus | null;
  if (status !== "pendente" && status !== "concluida") return;

  const { supabase } = await requireUser();
  await supabase.from("atividade").update({ status }).eq("id", atividadeId);

  revalidateCrm(oportunidadeId);
}
