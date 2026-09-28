import type { createClient } from "@/lib/supabase/server";
import type { OportunidadeEtapa, OportunidadeStatus } from "@/lib/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface OportunidadeResumo {
  id: string;
  etapa: OportunidadeEtapa;
  status: OportunidadeStatus;
  titulo: string;
}

/** Oportunidade de referência do cliente: a aberta mais recente, senão a mais recente. */
export async function oportunidadeDoCliente(
  supabase: Supabase,
  clienteId: string
): Promise<OportunidadeResumo | null> {
  const { data } = await supabase
    .from("oportunidade")
    .select("id, etapa, status, titulo")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false })
    .limit(10)
    .returns<OportunidadeResumo[]>();
  const lista = data ?? [];
  return lista.find((o) => o.status === "aberta") ?? lista[0] ?? null;
}
