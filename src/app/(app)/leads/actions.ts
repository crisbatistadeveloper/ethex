"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { strField } from "@/lib/form-utils";

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
    .select("nome, email, telefone, finalidade, orcamento_min, orcamento_max")
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
      origem_lead: "landing",
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

  revalidatePath("/leads");
  revalidatePath("/clientes");
  redirect(`/clientes/${cliente.id}`);
}

export async function descartarLead(leadId: string) {
  const supabase = await createClient();
  await supabase.from("lead").update({ status: "descartado" }).eq("id", leadId);
  revalidatePath("/leads");
}
