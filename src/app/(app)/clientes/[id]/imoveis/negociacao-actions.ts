"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { strField } from "@/lib/form-utils";
import {
  NEGOCIACAO_STATUS,
  NEGOCIACAO_STATUS_LABELS,
  formatParceiroLinhaCurta,
} from "@/lib/parceiros";
import type { NegociacaoParceriaStatus } from "@/lib/database.types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function registrarHistoricoCuradoria(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    imovel_encontrado_id: string;
    autor_id: string;
    tipo: "parceiro" | "negociacao" | "status_negociacao" | "curadoria" | "observacao";
    detalhe: string;
  }
) {
  await supabase.from("imovel_encontrado_historico").insert({
    imovel_encontrado_id: params.imovel_encontrado_id,
    autor_id: params.autor_id,
    tipo: params.tipo,
    detalhe: params.detalhe,
  });
}

function revalidateCuradoria(clienteId: string, curadoriaId: string) {
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}

/** Vincula/desvincula parceiro na curadoria + abre/atualiza negociação + histórico. */
export async function updateCuradoriaParceiro(
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const parceiroId = strField(formData, "parceiro_id");
  const { supabase, user } = await requireUser();

  const { data: atual } = await supabase
    .from("imovel_encontrado")
    .select("parceiro_id")
    .eq("id", curadoriaId)
    .maybeSingle();

  const anteriorId = (atual?.parceiro_id as string | null) ?? null;

  const { error } = await supabase
    .from("imovel_encontrado")
    .update({ parceiro_id: parceiroId })
    .eq("id", curadoriaId);

  if (error) {
    redirect(
      `/clientes/${clienteId}/imoveis/${curadoriaId}?error=${encodeURIComponent(error.message)}`
    );
  }

  if (parceiroId && parceiroId !== anteriorId) {
    const { data: parceiro } = await supabase
      .from("parceiro")
      .select("id, nome, imobiliaria_nome, modelo_divisao, politica_comissao")
      .eq("id", parceiroId)
      .maybeSingle();

    const nome = parceiro
      ? formatParceiroLinhaCurta(parceiro)
      : "Parceiro";

    // Upsert negociação deste imóvel (não altera política geral do parceiro)
    const { data: existente } = await supabase
      .from("negociacao_parceria")
      .select("id")
      .eq("imovel_encontrado_id", curadoriaId)
      .maybeSingle();

    if (existente) {
      await supabase
        .from("negociacao_parceria")
        .update({
          parceiro_id: parceiroId,
          responsavel_id: user.id,
        })
        .eq("id", existente.id);
    } else {
      await supabase.from("negociacao_parceria").insert({
        imovel_encontrado_id: curadoriaId,
        parceiro_id: parceiroId,
        status: "pendente",
        modelo_divisao: parceiro?.modelo_divisao ?? null,
        responsavel_id: user.id,
      });
    }

    await registrarHistoricoCuradoria(supabase, {
      imovel_encontrado_id: curadoriaId,
      autor_id: user.id,
      tipo: "parceiro",
      detalhe: anteriorId
        ? `Parceiro alterado para ${nome}`
        : `Parceiro vinculado: ${nome}`,
    });
  }

  if (!parceiroId && anteriorId) {
    await registrarHistoricoCuradoria(supabase, {
      imovel_encontrado_id: curadoriaId,
      autor_id: user.id,
      tipo: "parceiro",
      detalhe: "Parceiro removido desta curadoria",
    });
  }

  revalidateCuradoria(clienteId, curadoriaId);
  if (parceiroId) revalidatePath(`/parceiros/${parceiroId}`);
  redirect(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}

/** Salva a negociação específica deste imóvel (não sobrescreve política do parceiro). */
export async function upsertNegociacaoParceria(
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();

  const { data: curadoria } = await supabase
    .from("imovel_encontrado")
    .select("parceiro_id")
    .eq("id", curadoriaId)
    .maybeSingle();

  const parceiroId = curadoria?.parceiro_id as string | null;
  if (!parceiroId) {
    redirect(
      `/clientes/${clienteId}/imoveis/${curadoriaId}?error=${encodeURIComponent("Selecione um parceiro antes de negociar")}`
    );
  }

  const statusRaw = strField(formData, "status") ?? "pendente";
  const status = (
    NEGOCIACAO_STATUS.includes(
      statusRaw as (typeof NEGOCIACAO_STATUS)[number]
    )
      ? statusRaw
      : "pendente"
  ) as NegociacaoParceriaStatus;

  const comissaoSolicitada = strField(formData, "comissao_solicitada");
  const comissaoNegociada = strField(formData, "comissao_negociada");
  const modeloDivisao = strField(formData, "modelo_divisao");
  const observacoes = strField(formData, "observacoes");
  const dataNegociacao = strField(formData, "negociado_em");

  const { data: existente } = await supabase
    .from("negociacao_parceria")
    .select("id, status, comissao_negociada")
    .eq("imovel_encontrado_id", curadoriaId)
    .maybeSingle();

  const payload = {
    imovel_encontrado_id: curadoriaId,
    parceiro_id: parceiroId,
    comissao_solicitada: comissaoSolicitada,
    comissao_negociada: comissaoNegociada,
    modelo_divisao: modeloDivisao,
    status,
    observacoes,
    negociado_em: dataNegociacao
      ? new Date(dataNegociacao).toISOString()
      : new Date().toISOString(),
    responsavel_id: user.id,
  };

  let error;
  if (existente) {
    ({ error } = await supabase
      .from("negociacao_parceria")
      .update(payload)
      .eq("id", existente.id));
  } else {
    ({ error } = await supabase.from("negociacao_parceria").insert(payload));
  }

  if (error) {
    redirect(
      `/clientes/${clienteId}/imoveis/${curadoriaId}?error=${encodeURIComponent(error.message)}`
    );
  }

  const { data: parceiro } = await supabase
    .from("parceiro")
    .select("nome, imobiliaria_nome")
    .eq("id", parceiroId)
    .maybeSingle();

  const nomeParceiro = parceiro
    ? formatParceiroLinhaCurta(parceiro)
    : "Parceiro";

  if (comissaoNegociada) {
    await registrarHistoricoCuradoria(supabase, {
      imovel_encontrado_id: curadoriaId,
      autor_id: user.id,
      tipo: "negociacao",
      detalhe: `Parceiro ${nomeParceiro} — comissão negociada: ${comissaoNegociada}`,
    });
  }

  if (!existente || existente.status !== status) {
    await registrarHistoricoCuradoria(supabase, {
      imovel_encontrado_id: curadoriaId,
      autor_id: user.id,
      tipo: "status_negociacao",
      detalhe: `Status da negociação: ${NEGOCIACAO_STATUS_LABELS[status]}`,
    });
  }

  // Marca última negociação no parceiro (metadado), sem alterar política geral
  await supabase
    .from("parceiro")
    .update({ ultima_negociacao_em: new Date().toISOString() })
    .eq("id", parceiroId);

  revalidateCuradoria(clienteId, curadoriaId);
  revalidatePath(`/parceiros/${parceiroId}`);
  redirect(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}
