"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { strField } from "@/lib/form-utils";
import { getUsuarioAtual } from "@/lib/auth";
import { ensureOportunidadeForCliente } from "@/lib/crm-oportunidade";
import { etapaFromClienteStatus } from "@/lib/crm";
import { ORIGENS_LEAD_MANUAL, origemLeadLabel } from "@/lib/labels";

const EMAIL_FORMATO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function createLead(formData: FormData) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const voltar: (msg: string) => never = (msg) =>
    redirect(`/leads/novo?error=${encodeURIComponent(msg)}`);

  const nome = strField(formData, "nome");
  const telefone = strField(formData, "telefone");
  const email = strField(formData, "email");
  const origem = strField(formData, "origem");

  if (!nome) voltar("Informe o nome do lead");
  if (!telefone && !email) voltar("Informe telefone ou e-mail");
  if (email && (email.length > 254 || !EMAIL_FORMATO.test(email))) {
    voltar("E-mail inválido");
  }
  if (!origem || !(ORIGENS_LEAD_MANUAL as readonly string[]).includes(origem)) {
    voltar("Selecione a origem do lead");
  }

  // Consultor só cria lead para si; admin escolhe (ou deixa sem responsável).
  const consultorId =
    usuario.papel === "admin" ? strField(formData, "consultorId") : usuario.id;

  const supabase = await createClient();
  const { error } = await supabase.from("lead").insert({
    nome,
    telefone,
    email,
    origem,
    consultor_id: consultorId,
    status: consultorId ? "atribuido" : "novo",
  });

  if (error) {
    voltar(
      error.code === "23505"
        ? "Já existe um lead com este e-mail."
        : error.message
    );
  }

  revalidatePath("/leads");
  redirect(`/leads?sucesso=${encodeURIComponent("Lead criado com sucesso.")}`);
}

export async function assignLead(leadId: string, formData: FormData) {
  const consultorId = strField(formData, "consultorId");
  if (!consultorId) {
    redirect(`/leads?error=${encodeURIComponent("Selecione um consultor")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("lead")
    .update({ consultor_id: consultorId, status: "atribuido" })
    .eq("id", leadId);

  if (error) {
    redirect(`/leads?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/leads");
}

export async function convertLead(leadId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lead } = await supabase
    .from("lead")
    .select("nome, email, telefone, origem, finalidade, orcamento_min, orcamento_max")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) {
    redirect(`/leads?error=${encodeURIComponent("Lead não encontrado")}`);
  }

  const { data: cliente, error } = await supabase
    .from("cliente")
    .insert({
      nome: lead.nome ?? lead.email ?? "Lead sem nome",
      email: lead.email,
      telefone: lead.telefone,
      origem_lead: origemLeadLabel(lead.origem),
      consultor_id: user.id,
    })
    .select("id")
    .single();

  if (error || !cliente) {
    redirect(
      `/leads?error=${encodeURIComponent(error?.message ?? "Erro ao converter lead")}`
    );
  }

  // A landing já pergunta motivo/orçamento — evita perguntar de novo na entrevista.
  if (lead.finalidade) {
    await supabase.from("perfil").insert({
      cliente_id: cliente.id,
      finalidade: lead.finalidade,
      orcamento_min: lead.orcamento_min,
      orcamento_max: lead.orcamento_max,
    });
  }

  await supabase
    .from("lead")
    .update({ status: "convertido", cliente_id: cliente.id })
    .eq("id", leadId);

  await ensureOportunidadeForCliente({
    clienteId: cliente.id,
    consultorId: user.id,
    nomeCliente: lead.nome ?? lead.email ?? "Lead sem nome",
    etapa: lead.finalidade
      ? etapaFromClienteStatus("em_entrevista")
      : "novo_lead",
    valorEstimado: lead.orcamento_max,
    leadId,
  });

  revalidatePath("/leads");
  revalidatePath("/clientes");
  revalidatePath("/crm");
  redirect(`/clientes/${cliente.id}`);
}

export async function descartarLead(leadId: string) {
  const supabase = await createClient();
  await supabase.from("lead").update({ status: "descartado" }).eq("id", leadId);
  revalidatePath("/leads");
}
