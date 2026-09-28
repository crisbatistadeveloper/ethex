"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RESPOSTAS_CLIENTE } from "@/lib/apresentacao";

export async function responderItem(
  token: string,
  itemId: string,
  formData: FormData
) {
  const resposta = String(formData.get("resposta") ?? "");
  if (!RESPOSTAS_CLIENTE.some((r) => r.value === resposta)) return;

  const supabase = await createClient();
  await supabase.rpc("apresentacao_responder", {
    p_token: token,
    p_item_id: itemId,
    p_resposta: resposta,
  });

  revalidatePath(`/apresentacao/${token}`);
}
