"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { numField, strField } from "@/lib/form-utils";
import { moveOportunidadeEtapa } from "@/app/(app)/crm/actions";
import { carregarContextoFechamento } from "@/lib/fechamento-dados";
import { formatBRL } from "@/lib/negociacao-compra";
import { MOTIVOS_PERDA, MOTIVO_PERDA_LABELS, calcularComissaoPercentual } from "@/lib/fechamento";
import type {
  ComissaoTipo,
  FechamentoMotivoPerda,
  FechamentoRow,
  OportunidadeEtapa,
} from "@/lib/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function base(oportunidadeId: string) {
  return `/crm/${oportunidadeId}/fechamento`;
}

function comErro(url: string, erro?: string): string {
  if (!erro) return url;
  return `${url}${url.includes("?") ? "&" : "?"}error=${encodeURIComponent(erro)}`;
}

function revalidar(oportunidadeId: string, clienteId?: string) {
  revalidatePath(base(oportunidadeId));
  revalidatePath(`/crm/${oportunidadeId}`);
  revalidatePath("/crm");
  revalidatePath("/crm/pipeline");
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

async function historico(
  supabase: Supabase,
  params: {
    oportunidadeId: string;
    autorId: string;
    tipo: "status" | "fechamento" | "etapa";
    detalhe: string;
    statusAnterior?: string | null;
    statusNovo?: string | null;
    etapaAnterior?: OportunidadeEtapa | null;
    etapaNova?: OportunidadeEtapa | null;
  }
) {
  await supabase.from("oportunidade_historico").insert({
    oportunidade_id: params.oportunidadeId,
    autor_id: params.autorId,
    tipo: params.tipo,
    detalhe: params.detalhe,
    status_anterior: params.statusAnterior ?? null,
    status_novo: params.statusNovo ?? null,
    etapa_anterior: params.etapaAnterior ?? null,
    etapa_nova: params.etapaNova ?? null,
  });
}

function lerComissao(formData: FormData, valorFechado: number | null) {
  const tipoRaw = strField(formData, "comissao_tipo");
  const tipo: ComissaoTipo | null = tipoRaw === "percentual" || tipoRaw === "valor" ? tipoRaw : null;
  const percentual = tipo === "percentual" ? numField(formData, "comissao_percentual") : null;
  let prevista = numField(formData, "comissao_prevista");
  if (prevista == null && tipo === "percentual" && percentual != null && valorFechado != null) {
    prevista = calcularComissaoPercentual(valorFechado, percentual);
  }
  return {
    comissao_tipo: tipo,
    comissao_percentual: percentual,
    comissao_prevista: prevista,
    comissao_efetiva: numField(formData, "comissao_efetiva"),
    comissao_observacao: strField(formData, "comissao_observacao"),
  };
}

function fraseComissao(c: ReturnType<typeof lerComissao>): string | null {
  if (c.comissao_prevista == null && c.comissao_efetiva == null) return null;
  const partes: string[] = [];
  if (c.comissao_percentual != null) partes.push(`${c.comissao_percentual}%`);
  if (c.comissao_prevista != null) partes.push(`prevista ${formatBRL(c.comissao_prevista)}`);
  if (c.comissao_efetiva != null) partes.push(`efetiva ${formatBRL(c.comissao_efetiva)}`);
  return `Comissão ETHEX registrada: ${partes.join(" · ")}.`;
}

// ---------------------------------------------------------------------------
// Ganho
// ---------------------------------------------------------------------------

export async function registrarGanho(oportunidadeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const url = base(oportunidadeId);
  const ctx = await carregarContextoFechamento(supabase, oportunidadeId);
  if (!ctx) redirect(comErro("/crm", "Oportunidade não encontrada"));
  if (ctx.fechamento) redirect(comErro(url, "Esta operação já tem fechamento registrado"));
  if (!ctx.podeGanhar || !ctx.negociacao || !ctx.dueDiligence) {
    redirect(comErro(url, `Não é possível marcar como ganha. Falta: ${ctx.faltando.join("; ") || "oportunidade aberta"}.`));
  }

  const valorFechado = numField(formData, "valor_fechado");
  if (valorFechado == null || valorFechado <= 0) redirect(comErro(url, "Informe o valor efetivamente fechado"));
  const comissao = lerComissao(formData, valorFechado);
  const n = ctx.negociacao;

  const { error } = await supabase.from("fechamento").insert({
    oportunidade_id: oportunidadeId,
    cliente_id: ctx.oportunidade.cliente_id,
    consultor_id: user.id,
    resultado: "ganho",
    data_fechamento: strField(formData, "data_fechamento") ?? new Date().toISOString().slice(0, 10),
    negociacao_id: n.id,
    imovel_id: n.imovel_id,
    imovel_encontrado_id: n.imovel_encontrado_id,
    due_diligence_id: ctx.dueDiligence.id,
    valor_fechado: valorFechado,
    observacoes: strField(formData, "observacoes"),
    ...comissao,
  });
  if (error) redirect(comErro(url, error.message));

  await historico(supabase, {
    oportunidadeId,
    autorId: user.id,
    tipo: "status",
    detalhe: "Operação fechada — ganho.",
    statusAnterior: ctx.oportunidade.status,
    statusNovo: "ganha",
    etapaAnterior: ctx.oportunidade.etapa,
    etapaNova: "fechamento",
  });
  const difere = n.valor_final != null && n.valor_final !== valorFechado;
  await historico(supabase, {
    oportunidadeId,
    autorId: user.id,
    tipo: "fechamento",
    detalhe: `Valor final registrado: ${formatBRL(valorFechado)}${difere ? ` (negociado ${formatBRL(n.valor_final)})` : ""}.`,
  });
  const fc = fraseComissao(comissao);
  if (fc) await historico(supabase, { oportunidadeId, autorId: user.id, tipo: "fechamento", detalhe: fc });
  await supabase.from("imovel_encontrado_historico").insert({
    imovel_encontrado_id: n.imovel_encontrado_id,
    autor_id: user.id,
    tipo: "fechamento",
    detalhe: `Operação fechada — ganho (${formatBRL(valorFechado)}).`,
  });

  revalidar(oportunidadeId, ctx.oportunidade.cliente_id);
  redirect(url);
}

// ---------------------------------------------------------------------------
// Perda
// ---------------------------------------------------------------------------

export async function registrarPerda(oportunidadeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const url = base(oportunidadeId);
  const ctx = await carregarContextoFechamento(supabase, oportunidadeId);
  if (!ctx) redirect(comErro("/crm", "Oportunidade não encontrada"));
  if (ctx.fechamento) redirect(comErro(url, "Esta operação já tem fechamento registrado"));
  if (ctx.oportunidade.status !== "aberta") redirect(comErro(url, "Só oportunidades abertas podem ser fechadas"));

  const motivoRaw = strField(formData, "motivo_perda");
  if (!motivoRaw || !MOTIVOS_PERDA.includes(motivoRaw as FechamentoMotivoPerda)) {
    redirect(comErro(url, "Informe o motivo da perda"));
  }
  const motivo = motivoRaw as FechamentoMotivoPerda;
  const observacoes = strField(formData, "observacoes");
  if (motivo === "outro" && !observacoes) redirect(comErro(url, "Descreva o motivo nas observações"));
  const n = ctx.negociacao;

  const { error } = await supabase.from("fechamento").insert({
    oportunidade_id: oportunidadeId,
    cliente_id: ctx.oportunidade.cliente_id,
    consultor_id: user.id,
    resultado: "perdido",
    data_fechamento: strField(formData, "data_fechamento") ?? new Date().toISOString().slice(0, 10),
    negociacao_id: n?.id ?? null,
    imovel_id: n?.imovel_id ?? null,
    imovel_encontrado_id: n?.imovel_encontrado_id ?? null,
    due_diligence_id: ctx.dueDiligence?.id ?? null,
    motivo_perda: motivo,
    observacoes,
  });
  if (error) redirect(comErro(url, error.message));

  const frase = `Operação perdida — ${MOTIVO_PERDA_LABELS[motivo].toLowerCase()}.`;
  await historico(supabase, {
    oportunidadeId,
    autorId: user.id,
    tipo: "status",
    detalhe: observacoes ? `${frase} ${observacoes}` : frase,
    statusAnterior: ctx.oportunidade.status,
    statusNovo: "perdida",
  });
  if (n) {
    await supabase.from("imovel_encontrado_historico").insert({
      imovel_encontrado_id: n.imovel_encontrado_id,
      autor_id: user.id,
      tipo: "fechamento",
      detalhe: frase,
    });
  }

  revalidar(oportunidadeId, ctx.oportunidade.cliente_id);
  redirect(url);
}

// ---------------------------------------------------------------------------
// Comissão (completar depois do ganho)
// ---------------------------------------------------------------------------

export async function atualizarComissao(oportunidadeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const url = base(oportunidadeId);
  const { data: f } = await supabase
    .from("fechamento")
    .select("*")
    .eq("oportunidade_id", oportunidadeId)
    .returns<FechamentoRow[]>()
    .maybeSingle();
  if (!f || f.resultado !== "ganho") redirect(comErro(url, "Comissão só pode ser registrada em operação ganha"));

  const comissao = lerComissao(formData, f.valor_fechado);
  const { error } = await supabase
    .from("fechamento")
    .update({ ...comissao, observacoes: strField(formData, "observacoes") })
    .eq("id", f.id);
  if (error) redirect(comErro(url, error.message));

  const mudou =
    comissao.comissao_prevista !== f.comissao_prevista ||
    comissao.comissao_efetiva !== f.comissao_efetiva ||
    comissao.comissao_percentual !== f.comissao_percentual ||
    comissao.comissao_tipo !== f.comissao_tipo;
  if (mudou) {
    await historico(supabase, {
      oportunidadeId,
      autorId: user.id,
      tipo: "fechamento",
      detalhe: fraseComissao(comissao) ?? "Comissão ETHEX removida.",
    });
  }

  revalidar(oportunidadeId);
  redirect(url);
}

// ---------------------------------------------------------------------------
// Etapa e atividade
// ---------------------------------------------------------------------------

/** Avanço MANUAL para a etapa Fechamento (status continua aberta). */
export async function encaminharParaFechamento(oportunidadeId: string) {
  const { supabase, user } = await requireUser();
  const url = base(oportunidadeId);
  const res = await moveOportunidadeEtapa(oportunidadeId, "fechamento");
  if (!res.ok) redirect(comErro(url, res.error));
  await historico(supabase, {
    oportunidadeId,
    autorId: user.id,
    tipo: "fechamento",
    detalhe: "Operação encaminhada para fechamento.",
  });
  revalidar(oportunidadeId);
  redirect(url);
}

export async function criarAtividadeFechamento(oportunidadeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const url = base(oportunidadeId);
  const titulo = strField(formData, "titulo");
  if (!titulo) redirect(comErro(url, "Informe o título da atividade"));
  const dataHora = strField(formData, "data_hora");

  const { data: op } = await supabase
    .from("oportunidade")
    .select("cliente_id")
    .eq("id", oportunidadeId)
    .maybeSingle();
  if (!op) redirect(comErro("/crm", "Oportunidade não encontrada"));

  const { error } = await supabase.from("atividade").insert({
    oportunidade_id: oportunidadeId,
    cliente_id: op.cliente_id,
    responsavel_id: user.id,
    tipo: "tarefa",
    titulo,
    descricao: strField(formData, "descricao"),
    data_hora: dataHora ? new Date(dataHora).toISOString() : new Date().toISOString(),
    status: "pendente",
  });
  if (error) redirect(comErro(url, error.message));

  revalidar(oportunidadeId);
  redirect(url);
}
