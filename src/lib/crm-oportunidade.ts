import { createClient } from "@/lib/supabase/server";
import type {
  OportunidadeEtapa,
  OportunidadeStatus,
} from "@/lib/database.types";

/**
 * Cria oportunidade padrão ao cadastrar/converter cliente.
 * Falha silenciosa se a tabela CRM ainda não existir — não quebra fluxos atuais.
 */
export async function ensureOportunidadeForCliente(params: {
  clienteId: string;
  consultorId: string;
  nomeCliente: string;
  etapa?: OportunidadeEtapa;
  valorEstimado?: number | null;
  leadId?: string | null;
}): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data: existente, error: selectError } = await supabase
      .from("oportunidade")
      .select("id")
      .eq("cliente_id", params.clienteId)
      .eq("status", "aberta")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) return null;
    if (existente) return existente.id as string;

    const etapa = params.etapa ?? "novo_lead";
    const { data, error } = await supabase
      .from("oportunidade")
      .insert({
        cliente_id: params.clienteId,
        consultor_id: params.consultorId,
        lead_id: params.leadId ?? null,
        titulo: `Oportunidade — ${params.nomeCliente}`,
        etapa,
        status: "aberta" as OportunidadeStatus,
        valor_estimado: params.valorEstimado ?? null,
      })
      .select("id")
      .single();

    if (error || !data) return null;

    await supabase.from("oportunidade_historico").insert({
      oportunidade_id: data.id,
      autor_id: params.consultorId,
      tipo: "criacao",
      etapa_nova: etapa,
      status_novo: "aberta",
      detalhe: "Oportunidade criada automaticamente",
    });

    return data.id as string;
  } catch {
    return null;
  }
}
