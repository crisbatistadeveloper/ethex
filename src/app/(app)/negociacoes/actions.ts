"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { numField, strField } from "@/lib/form-utils";
import { moveOportunidadeEtapa } from "@/app/(app)/crm/actions";
import { oportunidadeDoCliente } from "@/lib/oportunidade-do-cliente";
import {
  DECISOES,
  EVENTO_EXIGE_VALOR,
  EVENTO_STATUS,
  eventosPermitidos,
  formatBRL,
  negociacaoAtiva,
  valorAtual,
} from "@/lib/negociacao-compra";
import { IMOVEL_TITULO_COLUNAS, tituloImovel, type ImovelParaTitulo } from "@/lib/imovel-titulo";
import type {
  DecisaoImovelRow,
  DecisaoImovelStatus,
  NegociacaoCompraEventoTipo,
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

function destino(formData: FormData, fallback: string, erro?: string): string {
  const voltar = strField(formData, "voltar");
  return comErro(voltar && voltar.startsWith("/") ? voltar : fallback, erro);
}

async function tituloDaCuradoria(supabase: Supabase, curadoriaId: string) {
  const { data } = await supabase
    .from("imovel_encontrado")
    .select(`imovel_id, parceiro_id, imovel(preco, ${IMOVEL_TITULO_COLUNAS})`)
    .eq("id", curadoriaId)
    .returns<
      {
        imovel_id: string;
        parceiro_id: string | null;
        imovel: ImovelParaTitulo & { preco: number | null };
      }[]
    >()
    .maybeSingle();
  if (!data) return null;
  return {
    imovel_id: data.imovel_id,
    parceiro_id: data.parceiro_id,
    preco: data.imovel.preco,
    titulo: tituloImovel(data.imovel),
  };
}

async function registrarEvento(
  supabase: Supabase,
  params: {
    oportunidadeId: string;
    curadoriaId: string;
    autorId: string;
    tipoOportunidade: "decisao" | "negociacao";
    tipoCuradoria: "decisao" | "compra";
    detalhe: string;
  }
) {
  await supabase.from("oportunidade_historico").insert({
    oportunidade_id: params.oportunidadeId,
    autor_id: params.autorId,
    tipo: params.tipoOportunidade,
    detalhe: params.detalhe,
  });
  await supabase.from("imovel_encontrado_historico").insert({
    imovel_encontrado_id: params.curadoriaId,
    autor_id: params.autorId,
    tipo: params.tipoCuradoria,
    detalhe: params.detalhe,
  });
}

function revalidarTudo(clienteId: string, curadoriaId: string, oportunidadeId: string, negociacaoId?: string) {
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
  revalidatePath(`/crm/${oportunidadeId}`);
  revalidatePath("/crm");
  revalidatePath("/negociacoes");
  if (negociacaoId) revalidatePath(`/negociacoes/${negociacaoId}`);
}

// ---------------------------------------------------------------------------
// Decisão do cliente
// ---------------------------------------------------------------------------

export async function registrarDecisaoImovel(
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();
  const fallback = `/clientes/${clienteId}/imoveis/${curadoriaId}`;
  const decisaoRaw = strField(formData, "decisao");
  if (!decisaoRaw || !DECISOES.includes(decisaoRaw as DecisaoImovelStatus)) {
    redirect(destino(formData, fallback, "Escolha a decisão do cliente"));
  }
  const decisao = decisaoRaw as DecisaoImovelStatus;
  const observacao = strField(formData, "observacao");

  const op = await oportunidadeDoCliente(supabase, clienteId);
  if (!op) redirect(destino(formData, fallback, "Cliente sem oportunidade no CRM"));

  const info = await tituloDaCuradoria(supabase, curadoriaId);
  if (!info) redirect(destino(formData, fallback, "Curadoria não encontrada"));

  const { data: decisoes } = await supabase
    .from("decisao_imovel")
    .select("*")
    .eq("oportunidade_id", op.id)
    .returns<DecisaoImovelRow[]>();
  const atual = (decisoes ?? []).find((d) => d.imovel_encontrado_id === curadoriaId);
  const outroEscolhido = (decisoes ?? []).find(
    (d) => d.decisao === "escolhido" && d.imovel_encontrado_id !== curadoriaId
  );

  const { data: ativas } = await supabase
    .from("negociacao_compra")
    .select("id, imovel_encontrado_id, status")
    .eq("oportunidade_id", op.id)
    .in("status", ["iniciada", "proposta_enviada", "contraproposta"]);
  const ativa = (ativas ?? [])[0] as
    | { id: string; imovel_encontrado_id: string }
    | undefined;

  if (atual?.decisao === "escolhido" && decisao !== "escolhido" && ativa?.imovel_encontrado_id === curadoriaId) {
    redirect(destino(formData, fallback, "Existe negociação ativa para este imóvel. Cancele-a antes de mudar a decisão."));
  }

  if (decisao === "escolhido" && outroEscolhido) {
    if (ativa && ativa.imovel_encontrado_id === outroEscolhido.imovel_encontrado_id) {
      redirect(
        destino(formData, fallback, "Outro imóvel já está escolhido e com negociação ativa. Cancele aquela negociação antes.")
      );
    }
    // Só pode haver um escolhido: o anterior volta para "em consideração".
    await supabase
      .from("decisao_imovel")
      .update({ decisao: "em_consideracao", decidido_em: new Date().toISOString(), consultor_id: user.id })
      .eq("id", outroEscolhido.id);
    const anterior = await tituloDaCuradoria(supabase, outroEscolhido.imovel_encontrado_id);
    await registrarEvento(supabase, {
      oportunidadeId: op.id,
      curadoriaId: outroEscolhido.imovel_encontrado_id,
      autorId: user.id,
      tipoOportunidade: "decisao",
      tipoCuradoria: "decisao",
      detalhe: `Imóvel deixou de ser o escolhido (volta para em consideração): ${anterior?.titulo ?? "imóvel"}.`,
    });
  }

  if (atual?.decisao === decisao && (atual.observacao ?? null) === observacao) {
    redirect(destino(formData, fallback));
  }

  const { error } = await supabase.from("decisao_imovel").upsert(
    {
      oportunidade_id: op.id,
      imovel_encontrado_id: curadoriaId,
      decisao,
      observacao,
      consultor_id: user.id,
      decidido_em: new Date().toISOString(),
    },
    { onConflict: "oportunidade_id,imovel_encontrado_id" }
  );
  if (error) redirect(destino(formData, fallback, error.message));

  const frase =
    decisao === "escolhido"
      ? `Imóvel escolhido pelo cliente: ${info.titulo}.`
      : decisao === "descartado"
        ? `Imóvel descartado pelo cliente: ${info.titulo}.`
        : `Imóvel em consideração: ${info.titulo}.`;
  await registrarEvento(supabase, {
    oportunidadeId: op.id,
    curadoriaId,
    autorId: user.id,
    tipoOportunidade: "decisao",
    tipoCuradoria: "decisao",
    detalhe: observacao ? `${frase} ${observacao}` : frase,
  });

  revalidarTudo(clienteId, curadoriaId, op.id);
  redirect(destino(formData, fallback));
}

// ---------------------------------------------------------------------------
// Negociação
// ---------------------------------------------------------------------------

export async function iniciarNegociacao(
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();
  const fallback = `/clientes/${clienteId}/imoveis/${curadoriaId}`;

  const op = await oportunidadeDoCliente(supabase, clienteId);
  if (!op) redirect(destino(formData, fallback, "Cliente sem oportunidade no CRM"));

  const { data: decisao } = await supabase
    .from("decisao_imovel")
    .select("decisao")
    .eq("oportunidade_id", op.id)
    .eq("imovel_encontrado_id", curadoriaId)
    .maybeSingle();
  if (decisao?.decisao !== "escolhido") {
    redirect(destino(formData, fallback, "Marque o imóvel como escolhido antes de iniciar a negociação"));
  }

  const info = await tituloDaCuradoria(supabase, curadoriaId);
  if (!info) redirect(destino(formData, fallback, "Curadoria não encontrada"));

  const observacoes = strField(formData, "observacoes");
  const { data: nova, error } = await supabase
    .from("negociacao_compra")
    .insert({
      oportunidade_id: op.id,
      cliente_id: clienteId,
      imovel_id: info.imovel_id,
      imovel_encontrado_id: curadoriaId,
      parceiro_id: info.parceiro_id,
      consultor_id: user.id,
      status: "iniciada",
      preco_anunciado: info.preco,
      observacoes,
    })
    .select("id")
    .single();

  if (error || !nova) {
    const msg =
      error?.code === "23505"
        ? "Já existe uma negociação ativa nesta oportunidade"
        : (error?.message ?? "Erro ao iniciar negociação");
    redirect(destino(formData, fallback, msg));
  }

  await supabase.from("negociacao_compra_evento").insert({
    negociacao_id: nova.id,
    autor_id: user.id,
    tipo: "iniciada",
    valor: info.preco,
    observacao: observacoes,
  });

  await registrarEvento(supabase, {
    oportunidadeId: op.id,
    curadoriaId,
    autorId: user.id,
    tipoOportunidade: "negociacao",
    tipoCuradoria: "compra",
    detalhe: `Negociação iniciada — ${info.titulo} (anunciado ${formatBRL(info.preco)}).`,
  });

  revalidarTudo(clienteId, curadoriaId, op.id, nova.id);
  redirect(`/negociacoes/${nova.id}`);
}

async function carregarNegociacao(supabase: Supabase, id: string) {
  const { data } = await supabase
    .from("negociacao_compra")
    .select("*")
    .eq("id", id)
    .returns<NegociacaoCompraRow[]>()
    .maybeSingle();
  return data;
}

export async function registrarMovimentacao(negociacaoId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const base = `/negociacoes/${negociacaoId}`;
  const n = await carregarNegociacao(supabase, negociacaoId);
  if (!n) redirect(comErro("/negociacoes", "Negociação não encontrada"));

  const tipo = strField(formData, "tipo") as NegociacaoCompraEventoTipo | null;
  if (!tipo || !eventosPermitidos(n.status).includes(tipo)) {
    redirect(comErro(base, "Movimentação não permitida no status atual"));
  }

  let valor = numField(formData, "valor");
  if (EVENTO_EXIGE_VALOR.includes(tipo) && (valor == null || valor <= 0)) {
    redirect(comErro(base, "Informe o valor"));
  }
  if (tipo === "aceita" && valor == null) valor = valorAtual(n);

  const observacao = strField(formData, "observacao");
  if (tipo === "observacao" && !observacao) {
    redirect(comErro(base, "Escreva a observação"));
  }

  const { error } = await supabase.from("negociacao_compra_evento").insert({
    negociacao_id: negociacaoId,
    autor_id: user.id,
    tipo,
    valor: tipo === "recusada" || tipo === "cancelada" || tipo === "observacao" ? null : valor,
    observacao,
  });
  if (error) redirect(comErro(base, error.message));

  const novoStatus = EVENTO_STATUS[tipo];
  if (novoStatus) {
    const patch: Partial<NegociacaoCompraRow> = { status: novoStatus };
    if (tipo === "proposta_enviada") patch.valor_proposta = valor;
    if (tipo === "contraproposta_recebida") patch.valor_contraproposta = valor;
    if (tipo === "aceita") patch.valor_final = valor;
    if (!negociacaoAtiva(novoStatus)) patch.encerrada_em = new Date().toISOString();
    await supabase.from("negociacao_compra").update(patch).eq("id", negociacaoId);
  }

  if (tipo !== "observacao") {
    const info = await tituloDaCuradoria(supabase, n.imovel_encontrado_id);
    const titulo = info?.titulo ?? "imóvel";
    const frase =
      tipo === "proposta_enviada"
        ? `${n.valor_proposta != null ? "Nova proposta enviada" : "Proposta enviada"}: ${formatBRL(valor)}`
        : tipo === "contraproposta_recebida"
          ? `Contraproposta recebida: ${formatBRL(valor)}`
          : tipo === "aceita"
            ? `Proposta aceita: ${formatBRL(valor)}`
            : tipo === "recusada"
              ? "Negociação recusada"
              : "Negociação cancelada";
    await registrarEvento(supabase, {
      oportunidadeId: n.oportunidade_id,
      curadoriaId: n.imovel_encontrado_id,
      autorId: user.id,
      tipoOportunidade: "negociacao",
      tipoCuradoria: "compra",
      detalhe: `${frase} — ${titulo}.${observacao ? ` ${observacao}` : ""}`,
    });
  }

  revalidarTudo(n.cliente_id, n.imovel_encontrado_id, n.oportunidade_id, negociacaoId);
  redirect(base);
}

export async function atualizarPlanoNegociacao(negociacaoId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const n = await carregarNegociacao(supabase, negociacaoId);
  if (!n) redirect(comErro("/negociacoes", "Negociação não encontrada"));

  await supabase
    .from("negociacao_compra")
    .update({
      proxima_acao: strField(formData, "proxima_acao"),
      proxima_acao_em: strField(formData, "proxima_acao_em"),
      observacoes: strField(formData, "observacoes"),
    })
    .eq("id", negociacaoId);

  revalidarTudo(n.cliente_id, n.imovel_encontrado_id, n.oportunidade_id, negociacaoId);
  redirect(`/negociacoes/${negociacaoId}`);
}

/** Avanço MANUAL da oportunidade para a etapa Negociação (nunca automático). */
export async function avancarOportunidadeParaNegociacao(
  oportunidadeId: string,
  formData: FormData
) {
  const res = await moveOportunidadeEtapa(oportunidadeId, "negociacao");
  revalidatePath("/negociacoes");
  redirect(destino(formData, `/crm/${oportunidadeId}`, res.ok ? undefined : res.error));
}