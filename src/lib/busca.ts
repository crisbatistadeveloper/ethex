import { createClient } from "@/lib/supabase/server";

export async function ensureBusca(perfilId: string): Promise<string> {
  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("busca")
    .select("id")
    .eq("perfil_id", perfilId)
    .order("disparada_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existente) return existente.id as string;

  const { data: nova, error } = await supabase
    .from("busca")
    .insert({ perfil_id: perfilId, status: "concluida" })
    .select("id")
    .single();

  if (error || !nova) throw new Error(error?.message ?? "Erro ao criar busca");
  return nova.id as string;
}
