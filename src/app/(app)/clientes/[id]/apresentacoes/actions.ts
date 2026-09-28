"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { boolField, strField } from "@/lib/form-utils";
import { APRESENTACAO_STATUS, ITEM_STATUS } from "@/lib/apresentacao";
import type {
  ApresentacaoItemStatus,
  ApresentacaoStatus,
} from "@/lib/database.types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function revalidateApresentacao(clienteId: string, apresentacaoId?: string) {
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${clienteId}/apresentacoes`);
  if (apresentacaoId) {
    revalidatePath(`/clientes/${clienteId}/apresentacoes/${apresentacaoId}`);
  }
}

function detalheUrl(clienteId: string, apresentacaoId: string, erro?: string) {
  const base = `/clientes/${clienteId}/apresentacoes/${apresentacaoId}`;
  return erro ? `${base}?error=${encodeURIComponent(erro)}` : base;
}

// ---------------------------------------------------------------------------
// Seleção na curadoria
// ---------------------------------------------------------------------------

export async function toggleSelecaoApresentacao(
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();
  const selecionado = formData.get("selecionado") === "1";

  await supabase
    .from("imovel_encontrado")
    .update({ selecionado_apresentacao: selecionado })
    .eq("id", curadoriaId);

  await supabase.from("imovel_encontrado_historico").insert({
    imovel_encontrado_id: curadoriaId,
    autor_id: user.id,
    tipo: "curadoria",
    detalhe: selecionado
      ? "Selecionado para apresentação"
      : "Removido da seleção para apresentação",
  });

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
  revalidatePath(`/clientes/${clienteId}/apresentacoes`);
  revalidatePath("/crm/[id]", "page");
}

// ---------------------------------------------------------------------------
// Apresentação
// ---------------------------------------------------------------------------

export async function criarApresentacao(clienteId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const buscaId = strField(formData, "busca_id");
  if (!buscaId) {
    redirect(
      `/clientes/${clienteId}/apresentacoes?error=${encodeURIComponent("Cliente sem busca")}`
    );
  }

  const { data: apresentacao, error } = await supabase
    .from("apresentacao")
    .insert({
      cliente_id: clienteId,
      busca_id: buscaId,
      consultor_id: user.id,
      observacoes: strField(formData, "observacoes"),
    })
    .select("id")
    .single();

  if (error || !apresentacao) {
    redirect(
      `/clientes/${clienteId}/apresentacoes?error=${encodeURIComponent(error?.message ?? "Erro ao criar apresentação")}`
    );
  }

  const { data: selecionados } = await supabase
    .from("imovel_encontrado")
    .select("id")
    .eq("busca_id", buscaId)
    .eq("selecionado_apresentacao", true)
    .order("score", { ascending: false, nullsFirst: false });

  if (selecionados && selecionados.length > 0) {
    await supabase.from("apresentacao_item").insert(
      selecionados.map((s, i) => ({
        apresentacao_id: apresentacao.id,
        imovel_encontrado_id: s.id as string,
        ordem: i,
      }))
    );
  }

  revalidateApresentacao(clienteId, apresentacao.id);
  redirect(detalheUrl(clienteId, apresentacao.id));
}

export async function updateApresentacao(
  apresentacaoId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();
  const statusRaw = strField(formData, "status");
  const status = APRESENTACAO_STATUS.includes(statusRaw as ApresentacaoStatus)
    ? (statusRaw as ApresentacaoStatus)
    : null;

  const { data: atual } = await supabase
    .from("apresentacao")
    .select("enviada_em")
    .eq("id", apresentacaoId)
    .maybeSingle();

  const patch: Record<string, string | null> = {
    observacoes: strField(formData, "observacoes"),
  };
  if (status) {
    patch.status = status;
    if (status !== "rascunho" && !atual?.enviada_em) {
      patch.enviada_em = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("apresentacao")
    .update(patch)
    .eq("id", apresentacaoId);

  revalidateApresentacao(clienteId, apresentacaoId);
  redirect(detalheUrl(clienteId, apresentacaoId, error?.message));
}

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------

export async function addItemApresentacao(
  apresentacaoId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();
  const curadoriaId = strField(formData, "imovel_encontrado_id");
  if (!curadoriaId) return;

  const { data: ultimo } = await supabase
    .from("apresentacao_item")
    .select("ordem")
    .eq("apresentacao_id", apresentacaoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("apresentacao_item").insert({
    apresentacao_id: apresentacaoId,
    imovel_encontrado_id: curadoriaId,
    ordem: ((ultimo?.ordem as number | undefined) ?? -1) + 1,
  });

  revalidateApresentacao(clienteId, apresentacaoId);
  redirect(detalheUrl(clienteId, apresentacaoId, error?.message));
}

export async function removeItemApresentacao(
  itemId: string,
  apresentacaoId: string,
  clienteId: string
) {
  const { supabase } = await requireUser();
  await supabase
    .from("apresentacao_item")
    .delete()
    .eq("id", itemId)
    .eq("apresentacao_id", apresentacaoId);

  revalidateApresentacao(clienteId, apresentacaoId);
}

export async function moverItemApresentacao(
  itemId: string,
  apresentacaoId: string,
  clienteId: string,
  direcao: "up" | "down"
) {
  const { supabase } = await requireUser();
  const { data: itens } = await supabase
    .from("apresentacao_item")
    .select("id, ordem")
    .eq("apresentacao_id", apresentacaoId)
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: true });

  const lista = (itens ?? []).map((i) => i.id as string);
  const idx = lista.indexOf(itemId);
  const alvo = direcao === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || alvo < 0 || alvo >= lista.length) return;

  [lista[idx], lista[alvo]] = [lista[alvo], lista[idx]];

  // Renumera tudo (0..n) para eliminar empates de ordem.
  await Promise.all(
    lista.map((id, ordem) =>
      supabase.from("apresentacao_item").update({ ordem }).eq("id", id)
    )
  );

  revalidateApresentacao(clienteId, apresentacaoId);
}

export async function updateItemApresentacao(
  itemId: string,
  apresentacaoId: string,
  clienteId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();
  const statusRaw = strField(formData, "status");
  const status = ITEM_STATUS.includes(statusRaw as ApresentacaoItemStatus)
    ? (statusRaw as ApresentacaoItemStatus)
    : "apresentado";

  await supabase
    .from("apresentacao_item")
    .update({
      observacao_consultor: strField(formData, "observacao_consultor"),
      destaque: boolField(formData, "destaque"),
      status,
    })
    .eq("id", itemId)
    .eq("apresentacao_id", apresentacaoId);

  revalidateApresentacao(clienteId, apresentacaoId);
}
