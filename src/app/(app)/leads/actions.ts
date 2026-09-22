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
    .select("nome, email, telefone")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) {
    redirect(`/leads?error=${encodeURIComponent("Lead não encontrado")}`);
  }

  const { data: cliente, error } = await supabase
    .from("cliente")
    .insert({
      nome: lead.nome ?? lead.email,
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
