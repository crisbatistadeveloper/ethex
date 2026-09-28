import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  PipelineBoard,
  type PipelineCardData,
} from "@/app/(app)/crm/PipelineBoard";
import type { AtividadeRow, OportunidadeRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function CrmPipelinePage() {
  const supabase = await createClient();

  const { data: oportunidades, error } = await supabase
    .from("oportunidade")
    .select(
      "id, cliente_id, consultor_id, titulo, etapa, status, valor_estimado, criado_em, atualizado_em"
    )
    .eq("status", "aberta")
    .order("atualizado_em", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Não foi possível carregar o pipeline.
        </p>
        <p className="mt-2 text-xs text-[#5b6472]">{error.message}</p>
      </div>
    );
  }

  const ops = (oportunidades ?? []) as OportunidadeRow[];
  const opIds = ops.map((o) => o.id);
  const clienteIds = [...new Set(ops.map((o) => o.cliente_id))];
  const consultorIds = [...new Set(ops.map((o) => o.consultor_id))];

  let clienteNome = new Map<string, string>();
  let consultorNome = new Map<string, string>();
  let atividades: Pick<
    AtividadeRow,
    "id" | "oportunidade_id" | "titulo" | "data_hora" | "status"
  >[] = [];

  if (clienteIds.length > 0) {
    const { data } = await supabase
      .from("cliente")
      .select("id, nome")
      .in("id", clienteIds);
    clienteNome = new Map(
      (data ?? []).map((c) => [c.id as string, c.nome as string])
    );
  }

  if (consultorIds.length > 0) {
    const { data } = await supabase
      .from("usuario")
      .select("id, nome")
      .in("id", consultorIds);
    consultorNome = new Map(
      (data ?? []).map((c) => [c.id as string, c.nome as string])
    );
  }

  if (opIds.length > 0) {
    const { data } = await supabase
      .from("atividade")
      .select("id, oportunidade_id, titulo, data_hora, status")
      .in("oportunidade_id", opIds)
      .eq("status", "pendente")
      .order("data_hora", { ascending: true });
    atividades = (data ?? []) as typeof atividades;
  }

  const proximaPorOp = new Map<string, (typeof atividades)[number]>();
  for (const a of atividades) {
    if (!proximaPorOp.has(a.oportunidade_id)) {
      proximaPorOp.set(a.oportunidade_id, a);
    }
  }

  const cards: PipelineCardData[] = ops.map((op) => {
    const proxima = proximaPorOp.get(op.id) ?? null;
    return {
      id: op.id,
      titulo: op.titulo,
      etapa: op.etapa,
      valor_estimado: op.valor_estimado,
      cliente: {
        id: op.cliente_id,
        nome: clienteNome.get(op.cliente_id) ?? "Cliente",
      },
      consultor: consultorNome.has(op.consultor_id)
        ? { nome: consultorNome.get(op.consultor_id)! }
        : null,
      proxima_atividade: proxima
        ? { titulo: proxima.titulo, data_hora: proxima.data_hora }
        : null,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="mt-1 text-sm text-[#5b6472]">
            Arraste os cards entre etapas. A alteração é salva na hora.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/crm"
            className="rounded-md border border-[#e4e0d9] px-4 py-2 text-sm hover:bg-[#efe9e0]"
          >
            Dashboard
          </Link>
          <Link
            href="/crm/novo"
            className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
          >
            Nova oportunidade
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <PipelineBoard initialCards={cards} />
      </div>
    </div>
  );
}
