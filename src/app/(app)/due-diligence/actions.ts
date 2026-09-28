"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { strField } from "@/lib/form-utils";
import { formatBRL } from "@/lib/negociacao-compra";
import { moveOportunidadeEtapa } from "@/app/(app)/crm/actions";
import {
  CATEGORIAS,
  CATEGORIA_LABELS,
  CHECKLIST_INICIAL,
  DD_FINAL_STATUS,
  DD_FINAL_STATUS_CONCLUSIVOS,
  DD_FINAL_STATUS_LABELS,
  ITEM_STATUS,
  ITEM_STATUS_LABELS,
  PENDENCIA_STATUS,
  PENDENCIA_STATUS_LABELS,
  RECOMENDACOES,
  RECOMENDACAO_LABELS,
} from "@/lib/due-diligence-final";
import {
  IMOVEL_TITULO_COLUNAS,
  tituloImovel as gerarTituloImovel,
  type ImovelParaTitulo,
} from "@/lib/imovel-titulo";
import type {
  DueDiligenceFinalCategoria,
  DueDiligenceFinalEventoTipo,
  DueDiligenceFinalItemRow,
  DueDiligenceFinalItemStatus,
  DueDiligenceFinalPendenciaRow,
  DueDiligenceFinalPendenciaStatus,
  DueDiligenceFinalRecomendacao,
  DueDiligenceFinalRow,
  DueDiligenceFinalStatus,
  NegociacaoCompraRow,
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

function comErro(base: string, erro?: string): string {
  if (!erro) return base;
  return `${base}${base.includes("?") ? "&" : "?"}error=${encodeURIComponent(erro)}`;
}

function categoriaDe(formData: FormData): DueDiligenceFinalCategoria {
  const raw = strField(formData, "categoria");
  return CATEGORIAS.includes(raw as DueDiligenceFinalCategoria)
    ? (raw as DueDiligenceFinalCategoria)
    : "outros";
}

async function carregarDD(supabase: Supabase, id: string) {
  const { data } = await supabase
    .from("due_diligence_final")
    .select("*")
    .eq("id", id)
    .returns<DueDiligenceFinalRow[]>()
    .maybeSingle();
  return data;
}

async function tituloImovel(supabase: Supabase, imovelId: string) {
  const { data } = await supabase
    .from("imovel")
    .select(IMOVEL_TITULO_COLUNAS)
    .eq("id", imovelId)
    .returns<ImovelParaTitulo[]>()
    .maybeSingle();
  return gerarTituloImovel(data);
}

async function registrar(
  supabase: Supabase,
  dd: Pick<DueDiligenceFinalRow, "id" | "oportunidade_id" | "imovel_encontrado_id">,
  autorId: string,
  tipo: DueDiligenceFinalEventoTipo,
  detalhe: string,
  noCrm = false
) {
  await supabase.from("due_diligence_final_evento").insert({
    due_diligence_id: dd.id,
    autor_id: autorId,
    tipo,
    detalhe,
  });
  if (noCrm) {
    await supabase.from("oportunidade_historico").insert({
      oportunidade_id: dd.oportunidade_id,
      autor_id: autorId,
      tipo: "due_diligence",
      detalhe,
    });
    await supabase.from("imovel_encontrado_historico").insert({
      imovel_encontrado_id: dd.imovel_encontrado_id,
      autor_id: autorId,
      tipo: "due_diligence",
      detalhe,
    });
  }
}

function revalidar(dd: Pick<DueDiligenceFinalRow, "id" | "oportunidade_id" | "negociacao_id" | "cliente_id" | "imovel_encontrado_id">) {
  revalidatePath(`/due-diligence/${dd.id}`);
  revalidatePath("/due-diligence");
  revalidatePath(`/crm/${dd.oportunidade_id}`);
  revalidatePath(`/negociacoes/${dd.negociacao_id}`);
  revalidatePath(`/clientes/${dd.cliente_id}/imoveis/${dd.imovel_encontrado_id}`);
}

// ---------------------------------------------------------------------------
// Início (manual, só com negociação aceita)
// ---------------------------------------------------------------------------

export async function iniciarDueDiligenceFinal(negociacaoId: string) {
  const { supabase, user } = await requireUser();
  const base = `/negociacoes/${negociacaoId}`;

  const { data: n } = await supabase
    .from("negociacao_compra")
    .select("*")
    .eq("id", negociacaoId)
    .returns<NegociacaoCompraRow[]>()
    .maybeSingle();
  if (!n) redirect(comErro("/negociacoes", "Negociação não encontrada"));
  if (n.status !== "aceita") {
    redirect(comErro(base, "A due diligence final só pode ser iniciada com a proposta aceita"));
  }

  const { data: existente } = await supabase
    .from("due_diligence_final")
    .select("id")
    .eq("negociacao_id", negociacaoId)
    .maybeSingle();
  if (existente) redirect(`/due-diligence/${existente.id}`);

  const { data: dd, error } = await supabase
    .from("due_diligence_final")
    .insert({
      negociacao_id: n.id,
      oportunidade_id: n.oportunidade_id,
      cliente_id: n.cliente_id,
      imovel_id: n.imovel_id,
      imovel_encontrado_id: n.imovel_encontrado_id,
      consultor_id: user.id,
      status: "em_andamento",
    })
    .select("*")
    .returns<DueDiligenceFinalRow[]>()
    .single();
  if (error || !dd) redirect(comErro(base, error?.message ?? "Erro ao iniciar due diligence"));

  const { data: docs } = await supabase
    .from("imovel_documento")
    .select("id, tipo, storage_path, url")
    .eq("imovel_id", n.imovel_id);
  const docPorTipo = new Map(
    (docs ?? []).map((d) => [d.tipo as string, d as { id: string; storage_path: string | null; url: string | null }])
  );

  await supabase.from("due_diligence_final_item").insert(
    CHECKLIST_INICIAL.map((item, idx) => {
      const doc = item.documentoTipo ? docPorTipo.get(item.documentoTipo) : undefined;
      return {
        due_diligence_id: dd.id,
        categoria: item.categoria,
        titulo: item.titulo,
        ordem: idx,
        imovel_documento_id: doc?.id ?? null,
        status: "pendente",
        observacao: doc
          ? "Documento do imóvel já cadastrado na curadoria — confirmar se está atualizado para esta operação."
          : null,
      };
    })
  );

  const titulo = await tituloImovel(supabase, n.imovel_id);
  await registrar(
    supabase,
    dd,
    user.id,
    "iniciada",
    `Due diligence final iniciada — ${titulo} (valor negociado ${formatBRL(n.valor_final)}).`,
    true
  );

  revalidar(dd);
  redirect(`/due-diligence/${dd.id}`);
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export async function alterarStatusDueDiligence(ddId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const base = `/due-diligence/${ddId}`;
  const dd = await carregarDD(supabase, ddId);
  if (!dd) redirect(comErro("/due-diligence", "Due diligence não encontrada"));

  const raw = strField(formData, "status");
  if (!raw || !DD_FINAL_STATUS.includes(raw as DueDiligenceFinalStatus)) {
    redirect(comErro(base, "Status inválido"));
  }
  const status = raw as DueDiligenceFinalStatus;
  const observacao = strField(formData, "observacao");
  if (status === dd.status && !observacao) redirect(base);

  const conclusivo = DD_FINAL_STATUS_CONCLUSIVOS.includes(status);
  const { error } = await supabase
    .from("due_diligence_final")
    .update({
      status,
      concluida_em: conclusivo ? (dd.concluida_em ?? new Date().toISOString()) : null,
    })
    .eq("id", ddId);
  if (error) redirect(comErro(base, error.message));

  const frase =
    status === dd.status
      ? `Observação sobre o status (${DD_FINAL_STATUS_LABELS[status]}).`
      : status === "aprovada"
        ? "Due diligence aprovada."
        : status === "aprovada_com_ressalvas"
          ? "Due diligence aprovada com ressalvas."
          : status === "reprovada"
            ? "Due diligence reprovada."
            : `Status da due diligence: ${DD_FINAL_STATUS_LABELS[dd.status]} → ${DD_FINAL_STATUS_LABELS[status]}.`;
  await registrar(
    supabase,
    dd,
    user.id,
    "status",
    observacao ? `${frase} ${observacao}` : frase,
    status !== dd.status
  );

  revalidar(dd);
  redirect(base);
}

// ---------------------------------------------------------------------------
// Checklist / documentos
// ---------------------------------------------------------------------------

export async function adicionarItemDueDiligence(ddId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const base = `/due-diligence/${ddId}`;
  const dd = await carregarDD(supabase, ddId);
  if (!dd) redirect(comErro("/due-diligence", "Due diligence não encontrada"));

  const titulo = strField(formData, "titulo");
  if (!titulo) redirect(comErro(base, "Informe o nome do documento"));
  const categoria = categoriaDe(formData);

  const { count } = await supabase
    .from("due_diligence_final_item")
    .select("id", { count: "exact", head: true })
    .eq("due_diligence_id", ddId);

  const { error } = await supabase.from("due_diligence_final_item").insert({
    due_diligence_id: ddId,
    categoria,
    titulo,
    status: "pendente",
    observacao: strField(formData, "observacao"),
    ordem: (count ?? 0) + 1,
  });
  if (error) redirect(comErro(base, error.message));

  await registrar(supabase, dd, user.id, "item", `Documento adicionado ao checklist: ${titulo} (${CATEGORIA_LABELS[categoria]}).`);
  revalidar(dd);
  redirect(`${base}#checklist`);
}

export async function atualizarItemDueDiligence(itemId: string, ddId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const base = `/due-diligence/${ddId}`;
  const dd = await carregarDD(supabase, ddId);
  if (!dd) redirect(comErro("/due-diligence", "Due diligence não encontrada"));

  const { data: item } = await supabase
    .from("due_diligence_final_item")
    .select("*")
    .eq("id", itemId)
    .eq("due_diligence_id", ddId)
    .returns<DueDiligenceFinalItemRow[]>()
    .maybeSingle();
  if (!item) redirect(comErro(base, "Item não encontrado"));

  const raw = strField(formData, "status");
  const status = (
    ITEM_STATUS.includes(raw as DueDiligenceFinalItemStatus) ? raw : item.status
  ) as DueDiligenceFinalItemStatus;
  const observacao = strField(formData, "observacao");

  let imovelDocumentoId = item.imovel_documento_id;
  if (formData.has("imovel_documento_id")) {
    const docId = strField(formData, "imovel_documento_id");
    if (docId) {
      const { data: doc } = await supabase
        .from("imovel_documento")
        .select("id")
        .eq("id", docId)
        .eq("imovel_id", dd.imovel_id)
        .maybeSingle();
      if (!doc) redirect(comErro(base, "Documento não pertence a este imóvel"));
    }
    imovelDocumentoId = docId;
  }

  const recebido = status === "recebido" || status === "aprovado";
  const { error } = await supabase
    .from("due_diligence_final_item")
    .update({
      status,
      observacao,
      imovel_documento_id: imovelDocumentoId,
      recebido_em: recebido ? (item.recebido_em ?? new Date().toISOString().slice(0, 10)) : null,
    })
    .eq("id", itemId);
  if (error) redirect(comErro(base, error.message));

  const mudancas: string[] = [];
  if (status !== item.status) mudancas.push(ITEM_STATUS_LABELS[status].toLowerCase());
  if (imovelDocumentoId !== item.imovel_documento_id) {
    mudancas.push(imovelDocumentoId ? "vinculado ao documento do imóvel" : "vínculo com documento do imóvel removido");
  }
  if (mudancas.length > 0) {
    await registrar(supabase, dd, user.id, "documento", `${item.titulo}: ${mudancas.join(", ")}.`);
  }

  revalidar(dd);
  redirect(`${base}#item-${itemId}`);
}

/** Chamado pelo uploader após enviar ao bucket privado. */
export async function anexarArquivoItem(
  itemId: string,
  ddId: string,
  storagePath: string,
  nomeArquivo: string
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  const dd = await carregarDD(supabase, ddId);
  if (!dd) return { ok: false, error: "Due diligence não encontrada" };
  if (!storagePath.startsWith(`${dd.cliente_id}/${dd.id}/${itemId}/`)) {
    return { ok: false, error: "Caminho de arquivo inválido" };
  }

  const { data: item } = await supabase
    .from("due_diligence_final_item")
    .select("titulo, status, recebido_em")
    .eq("id", itemId)
    .eq("due_diligence_id", ddId)
    .maybeSingle();
  if (!item) return { ok: false, error: "Item não encontrado" };

  const statusAtual = item.status as DueDiligenceFinalItemStatus;
  const novoStatus: DueDiligenceFinalItemStatus =
    statusAtual === "pendente" || statusAtual === "solicitado" ? "recebido" : statusAtual;

  const { error } = await supabase
    .from("due_diligence_final_item")
    .update({
      storage_path: storagePath,
      nome_arquivo: nomeArquivo,
      status: novoStatus,
      recebido_em: (item.recebido_em as string | null) ?? new Date().toISOString().slice(0, 10),
    })
    .eq("id", itemId);
  if (error) return { ok: false, error: error.message };

  await registrar(
    supabase,
    dd,
    user.id,
    "documento",
    `${item.titulo as string} recebido (arquivo: ${nomeArquivo}).`
  );
  revalidar(dd);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Pendências
// ---------------------------------------------------------------------------

export async function criarPendencia(ddId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const base = `/due-diligence/${ddId}`;
  const dd = await carregarDD(supabase, ddId);
  if (!dd) redirect(comErro("/due-diligence", "Due diligence não encontrada"));

  const descricao = strField(formData, "descricao");
  if (!descricao) redirect(comErro(base, "Descreva a pendência"));
  const raw = strField(formData, "status");
  const status = (
    PENDENCIA_STATUS.includes(raw as DueDiligenceFinalPendenciaStatus) ? raw : "aberta"
  ) as DueDiligenceFinalPendenciaStatus;

  const { error } = await supabase.from("due_diligence_final_pendencia").insert({
    due_diligence_id: ddId,
    descricao,
    categoria: categoriaDe(formData),
    responsavel: strField(formData, "responsavel"),
    status,
    prazo: strField(formData, "prazo"),
    observacao: strField(formData, "observacao"),
    criado_por: user.id,
  });
  if (error) redirect(comErro(base, error.message));

  await registrar(supabase, dd, user.id, "pendencia", `Pendência criada: ${descricao}.`);
  revalidar(dd);
  redirect(`${base}#pendencias`);
}

export async function atualizarPendencia(pendenciaId: string, ddId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const base = `/due-diligence/${ddId}`;
  const dd = await carregarDD(supabase, ddId);
  if (!dd) redirect(comErro("/due-diligence", "Due diligence não encontrada"));

  const { data: p } = await supabase
    .from("due_diligence_final_pendencia")
    .select("*")
    .eq("id", pendenciaId)
    .eq("due_diligence_id", ddId)
    .returns<DueDiligenceFinalPendenciaRow[]>()
    .maybeSingle();
  if (!p) redirect(comErro(base, "Pendência não encontrada"));

  const raw = strField(formData, "status");
  const status = (
    PENDENCIA_STATUS.includes(raw as DueDiligenceFinalPendenciaStatus) ? raw : p.status
  ) as DueDiligenceFinalPendenciaStatus;
  const encerrada = status === "resolvida" || status === "dispensada";

  const { error } = await supabase
    .from("due_diligence_final_pendencia")
    .update({
      status,
      responsavel: strField(formData, "responsavel"),
      prazo: strField(formData, "prazo"),
      observacao: strField(formData, "observacao"),
      concluida_em: encerrada ? (p.concluida_em ?? new Date().toISOString()) : null,
    })
    .eq("id", pendenciaId);
  if (error) redirect(comErro(base, error.message));

  if (status !== p.status) {
    const frase =
      status === "resolvida"
        ? `Pendência resolvida: ${p.descricao}.`
        : status === "dispensada"
          ? `Pendência dispensada: ${p.descricao}.`
          : `Pendência “${p.descricao}”: ${PENDENCIA_STATUS_LABELS[p.status]} → ${PENDENCIA_STATUS_LABELS[status]}.`;
    await registrar(supabase, dd, user.id, "pendencia", frase);
  }

  revalidar(dd);
  redirect(`${base}#pendencia-${pendenciaId}`);
}

// ---------------------------------------------------------------------------
// Análise (registro operacional)
// ---------------------------------------------------------------------------

export async function registrarAnalise(ddId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const base = `/due-diligence/${ddId}`;
  const dd = await carregarDD(supabase, ddId);
  if (!dd) redirect(comErro("/due-diligence", "Due diligence não encontrada"));

  const recRaw = strField(formData, "recomendacao");
  const recomendacao = RECOMENDACOES.includes(recRaw as DueDiligenceFinalRecomendacao)
    ? (recRaw as DueDiligenceFinalRecomendacao)
    : null;

  const { error } = await supabase
    .from("due_diligence_final")
    .update({
      parecer_resumo: strField(formData, "parecer_resumo"),
      pontos_atencao: strField(formData, "pontos_atencao"),
      ressalvas: strField(formData, "ressalvas"),
      recomendacao,
      observacoes: strField(formData, "observacoes"),
      analise_registrada_em: new Date().toISOString(),
    })
    .eq("id", ddId);
  if (error) redirect(comErro(base, error.message));

  const mudouRecomendacao = recomendacao !== dd.recomendacao;
  await registrar(
    supabase,
    dd,
    user.id,
    "analise",
    recomendacao
      ? `Análise registrada — recomendação: ${RECOMENDACAO_LABELS[recomendacao]}.`
      : "Análise atualizada (sem recomendação definida).",
    mudouRecomendacao && recomendacao != null
  );

  revalidar(dd);
  redirect(`${base}#analise`);
}

export async function registrarObservacaoDueDiligence(ddId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const base = `/due-diligence/${ddId}`;
  const dd = await carregarDD(supabase, ddId);
  if (!dd) redirect(comErro("/due-diligence", "Due diligence não encontrada"));
  const texto = strField(formData, "texto");
  if (!texto) redirect(comErro(base, "Escreva a observação"));
  await registrar(supabase, dd, user.id, "observacao", texto);
  revalidar(dd);
  redirect(`${base}#historico`);
}

/**
 * Avanço MANUAL Negociação → Fechamento a partir da due diligence com
 * resultado "Prosseguir". Reaproveita moveOportunidadeEtapa (histórico + revalidação do CRM).
 */
export async function avancarOportunidadeParaFechamento(ddId: string) {
  const { supabase, user } = await requireUser();
  const base = `/due-diligence/${ddId}`;
  const dd = await carregarDD(supabase, ddId);
  if (!dd) redirect(comErro("/due-diligence", "Due diligence não encontrada"));

  if (dd.recomendacao !== "prosseguir") {
    redirect(comErro(base, "O resultado da due diligence precisa ser “Prosseguir” para avançar."));
  }

  const { data: op } = await supabase
    .from("oportunidade")
    .select("etapa")
    .eq("id", dd.oportunidade_id)
    .maybeSingle();
  const fechamentoHref = `/crm/${dd.oportunidade_id}/fechamento`;
  if (op?.etapa === "fechamento") redirect(fechamentoHref);
  if (op?.etapa !== "negociacao") {
    redirect(comErro(base, "A oportunidade precisa estar na etapa Negociação para avançar."));
  }

  const res = await moveOportunidadeEtapa(dd.oportunidade_id, "fechamento");
  if (!res.ok) redirect(comErro(base, res.error));

  await registrar(
    supabase,
    dd,
    user.id,
    "observacao",
    "Oportunidade avançada para Fechamento (due diligence: Prosseguir)."
  );
  revalidar(dd);
  revalidatePath(fechamentoHref);
  redirect(fechamentoHref);
}
