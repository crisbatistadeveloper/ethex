"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { strField } from "@/lib/form-utils";
import type { ClienteStatus } from "@/lib/database.types";
import { ensureOportunidadeForCliente } from "@/lib/crm-oportunidade";
import { etapaFromClienteStatus } from "@/lib/crm";

const novoClienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  telefone: z.string().nullable(),
  email: z.string().email().nullable().or(z.literal(null)),
  origem_lead: z.string().nullable(),
});

export async function createCliente(formData: FormData) {
  const parsed = novoClienteSchema.safeParse({
    nome: strField(formData, "nome"),
    telefone: strField(formData, "telefone"),
    email: strField(formData, "email"),
    origem_lead: strField(formData, "origem_lead"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados inválidos";
    redirect(`/clientes/novo?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("cliente")
    .insert({
      nome: parsed.data.nome,
      telefone: parsed.data.telefone,
      email: parsed.data.email,
      origem_lead: parsed.data.origem_lead,
      consultor_id: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/clientes/novo?error=${encodeURIComponent(
        error?.message ?? "Erro ao criar cliente"
      )}`
    );
  }

  await ensureOportunidadeForCliente({
    clienteId: data.id,
    consultorId: user.id,
    nomeCliente: parsed.data.nome,
    etapa: etapaFromClienteStatus("em_entrevista"),
  });

  revalidatePath("/clientes");
  revalidatePath("/crm");
  redirect(`/clientes/${data.id}`);
}

const STATUS_VALUES: ClienteStatus[] = [
  "em_entrevista",
  "em_busca",
  "em_curadoria",
  "fechado",
];

export async function updateClienteStatus(
  clienteId: string,
  formData: FormData
) {
  const status = String(formData.get("status") ?? "");
  if (!STATUS_VALUES.includes(status as ClienteStatus)) return;

  const supabase = await createClient();
  await supabase
    .from("cliente")
    .update({ status: status as ClienteStatus })
    .eq("id", clienteId);

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
}

export async function deleteCliente(clienteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cliente").delete().eq("id", clienteId);

  if (error) {
    redirect(
      `/clientes/${clienteId}?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/clientes");
  revalidatePath("/crm");
  revalidatePath("/leads");
  redirect("/clientes");
}
