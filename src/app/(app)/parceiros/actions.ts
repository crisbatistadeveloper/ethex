"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { boolField, strField } from "@/lib/form-utils";
import { PARCEIRO_HISTORICO_TIPOS, PARCEIRO_TIPOS } from "@/lib/parceiros";
import type { ParceiroHistoricoTipo } from "@/lib/database.types";

function revalidateParceiros(id?: string) {
  revalidatePath("/parceiros");
  if (id) revalidatePath(`/parceiros/${id}`);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

const parceiroSchema = z.object({
  tipo: z.enum(["corretor", "imobiliaria", "proprietario", "incorporadora"]),
  nome: z.string().min(1, "Nome é obrigatório"),
  imobiliaria_nome: z.string().nullable(),
  creci: z.string().nullable(),
  contato_nome: z.string().nullable(),
  contato_telefone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  contato_email: z.string().nullable(),
  cidade_regiao: z.string().nullable(),
  politica_comissao: z.string().nullable(),
  modelo_divisao: z.string().nullable(),
  condicoes_parceria: z.string().nullable(),
  observacoes: z.string().nullable(),
  ativo: z.boolean(),
});

function parseParceiroForm(formData: FormData) {
  const tipoRaw = strField(formData, "tipo") ?? "corretor";
  return parceiroSchema.safeParse({
    tipo: PARCEIRO_TIPOS.includes(tipoRaw as (typeof PARCEIRO_TIPOS)[number])
      ? tipoRaw
      : "corretor",
    nome: strField(formData, "nome"),
    imobiliaria_nome: strField(formData, "imobiliaria_nome"),
    creci: strField(formData, "creci"),
    contato_nome: strField(formData, "contato_nome"),
    contato_telefone: strField(formData, "contato_telefone"),
    whatsapp: strField(formData, "whatsapp"),
    contato_email: strField(formData, "contato_email"),
    cidade_regiao: strField(formData, "cidade_regiao"),
    politica_comissao: strField(formData, "politica_comissao"),
    modelo_divisao: strField(formData, "modelo_divisao"),
    condicoes_parceria: strField(formData, "condicoes_parceria"),
    observacoes: strField(formData, "observacoes"),
    ativo: formData.get("ativo") !== "off" && formData.get("ativo") !== "false",
  });
}

export async function createParceiro(formData: FormData) {
  const parsed = parseParceiroForm(formData);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados inválidos";
    redirect(`/parceiros/novo?error=${encodeURIComponent(message)}`);
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("parceiro")
    .insert({ ...parsed.data, ativo: true })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/parceiros/novo?error=${encodeURIComponent(error?.message ?? "Erro ao criar")}`
    );
  }

  revalidateParceiros(data.id);
  redirect(`/parceiros/${data.id}`);
}

export async function updateParceiro(parceiroId: string, formData: FormData) {
  const parsed = parseParceiroForm(formData);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados inválidos";
    redirect(
      `/parceiros/${parceiroId}?error=${encodeURIComponent(message)}`
    );
  }

  const ativo = boolField(formData, "ativo");
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("parceiro")
    .update({ ...parsed.data, ativo })
    .eq("id", parceiroId);

  if (error) {
    redirect(
      `/parceiros/${parceiroId}?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidateParceiros(parceiroId);
  redirect(`/parceiros/${parceiroId}`);
}

export async function createParceiroHistorico(
  parceiroId: string,
  formData: FormData
) {
  const tipoRaw = strField(formData, "tipo") ?? "observacao";
  const titulo = strField(formData, "titulo");
  const detalhe = strField(formData, "detalhe");

  if (!titulo) {
    redirect(
      `/parceiros/${parceiroId}?error=${encodeURIComponent("Título é obrigatório")}`
    );
  }

  const tipo = (
    PARCEIRO_HISTORICO_TIPOS.includes(
      tipoRaw as (typeof PARCEIRO_HISTORICO_TIPOS)[number]
    )
      ? tipoRaw
      : "observacao"
  ) as ParceiroHistoricoTipo;

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("parceiro_historico").insert({
    parceiro_id: parceiroId,
    autor_id: user.id,
    tipo,
    titulo,
    detalhe,
  });

  if (error) {
    redirect(
      `/parceiros/${parceiroId}?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidateParceiros(parceiroId);
  redirect(`/parceiros/${parceiroId}`);
}
