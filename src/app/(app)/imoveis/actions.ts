"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { strField } from "@/lib/form-utils";
import { ensureBusca } from "@/lib/busca";

export async function attachImovelToCliente(
  imovelId: string,
  formData: FormData
) {
  const clienteId = strField(formData, "clienteId");
  if (!clienteId) {
    redirect(`/imoveis?error=${encodeURIComponent("Selecione um cliente")}`);
  }

  const supabase = await createClient();
  const { data: perfil } = await supabase
    .from("perfil")
    .select("id")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (!perfil) {
    redirect(
      `/imoveis?error=${encodeURIComponent("Esse cliente ainda não tem perfil — finalize a entrevista antes")}`
    );
  }

  const buscaId = await ensureBusca(perfil.id);

  const { data: curadoriaExistente } = await supabase
    .from("imovel_encontrado")
    .select("id")
    .eq("busca_id", buscaId)
    .eq("imovel_id", imovelId)
    .maybeSingle();

  if (!curadoriaExistente) {
    await supabase
      .from("imovel_encontrado")
      .insert({ busca_id: buscaId, imovel_id: imovelId });
  }

  revalidatePath(`/clientes/${clienteId}`);
  redirect(`/clientes/${clienteId}`);
}
