"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { strField } from "@/lib/form-utils";
import { moveOportunidadeEtapa } from "@/app/(app)/crm/actions";
import {
  VISITA_CLIENTE_RESULTADOS,
  VISITA_CLIENTE_RESULTADO_FRASE,
  dataHorarioParaIso,
  formatDataHorarioCurto,
} from "@/lib/visita-cliente";
import type {
  Caracteristicas,
  VisitaClienteResultado,
  VisitaClienteRow,
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

function destino(formData: FormData, fallback: string, erro?: string): string {
  const voltar = strField(formData, "voltar");
  const base = voltar && voltar.startsWith("/") ? voltar : fallback;
  if (!erro) return base;
  return `${base}${base.includes("?") ? "&" : "?"}error=${encodeURIComponent(erro)}`;
}

function revalidateVisita(v: Pick<VisitaClienteRow, "id" | "cliente_id" | "imovel_encontrado_id" | "oportunidade_id">) {
  revalidatePath("/visitas");
  revalidatePath(`/visitas/${v.id}`);
  revalidatePath("/crm");
  if (v.oportunidade_id) revalidatePath(`/crm/${v.oportunidade_id}`);
  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath(`/clientes/${v.cliente_id}/imoveis/${v.imovel_encontrado_id}`);
}

async function carregarVisita(supabase: Supabase, visitaId: string) {
  const { data } = await supabase
    .from("visita_cliente")
    .select("*")
    .eq("id", visitaId)
    .returns<VisitaClienteRow[]>()
    .maybeSingle();
  return data;
}

async function tituloImovel(supabase: Supabase, imovelId: string): Promise<string> {
  const { data } = await supabase
    .from("imovel")
    .select("fonte, caracteristicas")
    .eq("id", imovelId)
    .maybeSingle();
  return (
    (data?.caracteristicas as Caracteristicas | undefined)?.titulo ??
    (data?.fonte as string | undefined) ??
    "imóvel"
  );
}

/** Registra o mesmo evento na oportunidade (se houver) e na curadoria. */
async function registrarEvento(
  supabase: Supabase,
  v: Pick<VisitaClienteRow, "oportunidade_id" | "imovel_encontrado_id">,
  autorId: string,
  detalheCuradoria: string,
  detalheOportunidade: string = detalheCuradoria
) {
  await supabase.from("imovel_encontrado_historico").insert({
    imovel_encontrado_id: v.imovel_encontrado_id,
    autor_id: autorId,
    tipo: "visita",
    detalhe: detalheCuradoria,
  });
  if (v.oportunidade_id) {
    await supabase.from("oportunidade_historico").insert({
      oportunidade_id: v.oportunidade_id,
      autor_id: autorId,
      tipo: "visita",
      detalhe: detalheOportunidade,
    });
  }
}

/** Atividade "visita" na oportunidade — aparece em Atividades pendentes do CRM. */
async function sincronizarAtividade(
  supabase: Supabase,
  v: VisitaClienteRow,
  userId: string,
  titulo: string,
  data: string,
  horario: string | null
): Promise<string | null> {
  if (!v.oportunidade_id) return v.atividade_id;
  const payload = {
    titulo: `Visita com cliente — ${titulo}`,
    data_hora: dataHorarioParaIso(data, horario),
    status: "pendente" as const,
  };
  if (v.atividade_id) {
    await supabase.from("atividade").update(payload).eq("id", v.atividade_id);
    return v.atividade_id;
  }
  const { data: nova } = await supabase
    .from("atividade")
    .insert({
      ...payload,
      oportunidade_id: v.oportunidade_id,
      cliente_id: v.cliente_id,
      responsavel_id: userId,
      tipo: "visita",
    })
    .select("id")
    .single();
  return (nova?.id as string | undefined) ?? null;
}

async function concluirAtividade(supabase: Supabase, atividadeId: string | null) {
  if (!atividadeId) return;
  await supabase.from("atividade").update({ status: "concluida" }).eq("id", atividadeId);
}

// ---------------------------------------------------------------------------

export async function agendarVisitaCliente(visitaId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const fallback = `/visitas/${visitaId}`;
  const data = strField(formData, "data_visita");
  const horario = strField(formData, "horario");
  if (!data || !horario) {
    redirect(destino(formData, fallback, "Informe data e horário"));
  }

  const v = await carregarVisita(supabase, visitaId);
  if (!v) redirect(destino(formData, "/visitas", "Visita não encontrada"));
  if (v.status !== "solicitada" && v.status !== "agendada") {
    redirect(destino(formData, fallback, "Só é possível agendar visitas solicitadas ou agendadas"));
  }

  const titulo = await tituloImovel(supabase, v.imovel_id);
  const atividadeId = await sincronizarAtividade(supabase, v, user.id, titulo, data, horario);
  const observacoes = strField(formData, "observacoes");

  const { error } = await supabase
    .from("visita_cliente")
    .update({
      status: "agendada",
      data_visita: data,
      horario,
      atividade_id: atividadeId,
      ...(observacoes !== null ? { observacoes } : {}),
    })
    .eq("id", visitaId);
  if (error) redirect(destino(formData, fallback, error.message));

  const quando = formatDataHorarioCurto(data, horario);
  const verbo = v.status === "agendada" ? "reagendada" : "agendada";
  await registrarEvento(
    supabase,
    v,
    user.id,
    `Visita ${verbo} para ${quando}.`,
    `Visita ${verbo} para ${quando} — ${titulo}.`
  );

  revalidateVisita(v);
  redirect(destino(formData, fallback));
}

export async function cancelarVisitaCliente(visitaId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const fallback = `/visitas/${visitaId}`;
  const v = await carregarVisita(supabase, visitaId);
  if (!v) redirect(destino(formData, "/visitas", "Visita não encontrada"));
  if (v.status !== "solicitada" && v.status !== "agendada") {
    redirect(destino(formData, fallback, "Visita já encerrada"));
  }

  const motivo = strField(formData, "motivo");
  await supabase
    .from("visita_cliente")
    .update({
      status: "cancelada",
      cancelada_em: new Date().toISOString(),
      ...(motivo
        ? { observacoes: [v.observacoes, `Cancelamento: ${motivo}`].filter(Boolean).join("\n") }
        : {}),
    })
    .eq("id", visitaId);
  await concluirAtividade(supabase, v.atividade_id);

  const titulo = await tituloImovel(supabase, v.imovel_id);
  await registrarEvento(
    supabase,
    v,
    user.id,
    motivo ? `Visita cancelada: ${motivo}` : "Visita cancelada.",
    `Visita cancelada — ${titulo}.${motivo ? ` Motivo: ${motivo}` : ""}`
  );

  revalidateVisita(v);
  redirect(destino(formData, fallback));
}

export async function marcarNaoCompareceu(visitaId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const fallback = `/visitas/${visitaId}`;
  const v = await carregarVisita(supabase, visitaId);
  if (!v) redirect(destino(formData, "/visitas", "Visita não encontrada"));
  if (v.status !== "agendada") {
    redirect(destino(formData, fallback, "Só visitas agendadas podem ser marcadas assim"));
  }

  await supabase
    .from("visita_cliente")
    .update({ status: "nao_compareceu" })
    .eq("id", visitaId);
  await concluirAtividade(supabase, v.atividade_id);

  const titulo = await tituloImovel(supabase, v.imovel_id);
  await registrarEvento(
    supabase,
    v,
    user.id,
    "Cliente não compareceu à visita.",
    `Cliente não compareceu à visita — ${titulo}.`
  );

  revalidateVisita(v);
  redirect(destino(formData, fallback));
}

export async function registrarResultadoVisita(visitaId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const fallback = `/visitas/${visitaId}`;
  const resultadoRaw = strField(formData, "resultado");
  if (!resultadoRaw || !VISITA_CLIENTE_RESULTADOS.includes(resultadoRaw as VisitaClienteResultado)) {
    redirect(destino(formData, fallback, "Escolha o resultado da visita"));
  }
  const resultado = resultadoRaw as VisitaClienteResultado;

  const v = await carregarVisita(supabase, visitaId);
  if (!v) redirect(destino(formData, "/visitas", "Visita não encontrada"));
  if (v.status === "cancelada" || v.status === "nao_compareceu") {
    redirect(destino(formData, fallback, "Visita cancelada ou sem comparecimento"));
  }

  const { error } = await supabase
    .from("visita_cliente")
    .update({
      status: "realizada",
      realizada_em: v.realizada_em ?? new Date().toISOString(),
      resultado,
      pontos_positivos: strField(formData, "pontos_positivos"),
      pontos_negativos: strField(formData, "pontos_negativos"),
      observacoes_resultado: strField(formData, "observacoes_resultado"),
      proximos_passos: strField(formData, "proximos_passos"),
    })
    .eq("id", visitaId);
  if (error) redirect(destino(formData, fallback, error.message));

  await concluirAtividade(supabase, v.atividade_id);

  const titulo = await tituloImovel(supabase, v.imovel_id);
  if (v.status !== "realizada") {
    await registrarEvento(supabase, v, user.id, "Visita realizada.", `Visita realizada — ${titulo}.`);
  }
  if (v.resultado !== resultado) {
    const frase = VISITA_CLIENTE_RESULTADO_FRASE[resultado];
    await registrarEvento(supabase, v, user.id, frase, `${frase} (${titulo})`);
  }

  revalidateVisita(v);
  redirect(destino(formData, fallback));
}

/** Consultor registra/agenda visita direto pela curadoria (origem "consultor"). */
export async function criarVisitaCliente(
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();
  const fallback = `/clientes/${clienteId}/imoveis/${curadoriaId}`;

  const { data: ie } = await supabase
    .from("imovel_encontrado")
    .select("imovel_id")
    .eq("id", curadoriaId)
    .maybeSingle();
  const { data: cliente } = await supabase
    .from("cliente")
    .select("consultor_id")
    .eq("id", clienteId)
    .maybeSingle();
  if (!ie || !cliente) redirect(destino(formData, fallback, "Curadoria não encontrada"));

  const { data: op } = await supabase
    .from("oportunidade")
    .select("id, status")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false })
    .limit(5);
  const oportunidadeId =
    ((op ?? []).find((o) => o.status === "aberta") ?? op?.[0])?.id ?? null;

  const data = strField(formData, "data_visita");
  const horario = strField(formData, "horario");
  const agendar = Boolean(data && horario);

  const { data: nova, error } = await supabase
    .from("visita_cliente")
    .insert({
      cliente_id: clienteId,
      oportunidade_id: oportunidadeId,
      imovel_id: ie.imovel_id,
      imovel_encontrado_id: curadoriaId,
      consultor_id: cliente.consultor_id,
      origem: "consultor",
      status: agendar ? "agendada" : "solicitada",
      data_visita: agendar ? data : null,
      horario: agendar ? horario : null,
      observacoes: strField(formData, "observacoes"),
    })
    .select("*")
    .returns<VisitaClienteRow[]>()
    .single();

  if (error || !nova) {
    const msg =
      error?.code === "23505"
        ? "Já existe uma visita aberta (solicitada ou agendada) para este imóvel"
        : (error?.message ?? "Erro ao registrar visita");
    redirect(destino(formData, fallback, msg));
  }

  const titulo = await tituloImovel(supabase, nova.imovel_id);
  if (agendar && data) {
    const atividadeId = await sincronizarAtividade(supabase, nova, user.id, titulo, data, horario);
    if (atividadeId) {
      await supabase.from("visita_cliente").update({ atividade_id: atividadeId }).eq("id", nova.id);
    }
    const quando = formatDataHorarioCurto(data, horario);
    await registrarEvento(
      supabase,
      nova,
      user.id,
      `Visita agendada para ${quando}.`,
      `Visita agendada para ${quando} — ${titulo}.`
    );
  } else {
    await registrarEvento(
      supabase,
      nova,
      user.id,
      "Visita solicitada pelo consultor.",
      `Visita solicitada pelo consultor — ${titulo}.`
    );
  }

  revalidateVisita(nova);
  redirect(destino(formData, fallback));
}

/** Avanço MANUAL da oportunidade para a etapa Visita (nunca automático). */
export async function avancarOportunidadeParaVisita(
  oportunidadeId: string,
  formData: FormData
) {
  const res = await moveOportunidadeEtapa(oportunidadeId, "visita");
  revalidatePath("/visitas");
  redirect(destino(formData, `/crm/${oportunidadeId}`, res.ok ? undefined : res.error));
}
