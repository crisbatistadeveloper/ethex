import type { createClient } from "@/lib/supabase/server";
import { resumoDueDiligence } from "@/lib/due-diligence-final";
import type {
  DueDiligenceFinalItemRow,
  DueDiligenceFinalPendenciaRow,
  DueDiligenceFinalRow,
} from "@/lib/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ResumoDueDiligence = ReturnType<typeof resumoDueDiligence>;

export async function carregarResumoDueDiligence(
  supabase: Supabase,
  ddId: string
): Promise<ResumoDueDiligence> {
  const [{ data: itens }, { data: pendencias }] = await Promise.all([
    supabase
      .from("due_diligence_final_item")
      .select("status, storage_path, imovel_documento_id")
      .eq("due_diligence_id", ddId)
      .returns<Pick<DueDiligenceFinalItemRow, "status" | "storage_path" | "imovel_documento_id">[]>(),
    supabase
      .from("due_diligence_final_pendencia")
      .select("status")
      .eq("due_diligence_id", ddId)
      .returns<Pick<DueDiligenceFinalPendenciaRow, "status">[]>(),
  ]);
  return resumoDueDiligence(itens ?? [], pendencias ?? []);
}

/** Due diligence da negociação (null se ainda não iniciada ou 0016 não aplicada). */
export async function dueDiligenceDaNegociacao(supabase: Supabase, negociacaoId: string) {
  const { data } = await supabase
    .from("due_diligence_final")
    .select("*")
    .eq("negociacao_id", negociacaoId)
    .returns<DueDiligenceFinalRow[]>()
    .maybeSingle();
  if (!data) return null;
  return { dd: data, resumo: await carregarResumoDueDiligence(supabase, data.id) };
}
