import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ETAPA_LABELS, formatCurrencyBRL } from "@/lib/crm";
import { MOTIVO_PERDA_LABELS, comissaoExibida, formatDataCurta } from "@/lib/fechamento";
import type { FechamentoRow, OportunidadeRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type Filtro = "ganha" | "perdida";

export default async function OportunidadesEncerradasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filtro: Filtro = status === "perdida" ? "perdida" : "ganha";
  const supabase = await createClient();

  const { data: oportunidadesRaw, error } = await supabase
    .from("oportunidade")
    .select("id, cliente_id, consultor_id, titulo, etapa, status, valor_estimado, atualizado_em")
    .eq("status", filtro)
    .order("atualizado_em", { ascending: false })
    .limit(200);

  const oportunidades = (oportunidadesRaw ?? []) as Pick<
    OportunidadeRow,
    "id" | "cliente_id" | "consultor_id" | "titulo" | "etapa" | "status" | "valor_estimado" | "atualizado_em"
  >[];
  const opIds = oportunidades.map((o) => o.id);
  const clienteIds = [...new Set(oportunidades.map((o) => o.cliente_id))];
  const consultorIds = [...new Set(oportunidades.map((o) => o.consultor_id))];

  // Queries sequenciais — no plano Nano, Promise.all + RLS costuma travar.
  const { data: fechamentos } =
    opIds.length > 0
      ? await supabase
          .from("fechamento")
          .select(
            "oportunidade_id, data_fechamento, valor_fechado, motivo_perda, comissao_prevista, comissao_efetiva"
          )
          .in("oportunidade_id", opIds)
          .returns<
            Pick<
              FechamentoRow,
              | "oportunidade_id"
              | "data_fechamento"
              | "valor_fechado"
              | "motivo_perda"
              | "comissao_prevista"
              | "comissao_efetiva"
            >[]
          >()
      : { data: [] };
  const fechamentoPorOp = new Map((fechamentos ?? []).map((f) => [f.oportunidade_id, f]));

  const { data: clientes } =
    clienteIds.length > 0
      ? await supabase.from("cliente").select("id, nome").in("id", clienteIds)
      : { data: [] };
  const clienteNome = new Map((clientes ?? []).map((c) => [c.id as string, c.nome as string]));

  const { data: consultores } =
    consultorIds.length > 0
      ? await supabase.from("usuario").select("id, nome").in("id", consultorIds)
      : { data: [] };
  const consultorNome = new Map((consultores ?? []).map((u) => [u.id as string, u.nome as string]));

  const linhas = oportunidades
    .map((op) => ({ op, f: fechamentoPorOp.get(op.id) ?? null }))
    .sort((a, b) => (b.f?.data_fechamento ?? "").localeCompare(a.f?.data_fechamento ?? ""));

  const totalValor = linhas.reduce((s, l) => s + (l.f?.valor_fechado ?? 0), 0);
  const totalComissao = linhas.reduce((s, l) => s + (l.f ? (comissaoExibida(l.f).valor ?? 0) : 0), 0);

  return (
    <div>
      <Link href="/crm" className="text-sm text-[#5b6472] hover:underline">
        ← CRM
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Oportunidades encerradas</h1>
      <p className="mt-1 text-sm text-[#5b6472]">
        Consulta das operações registradas como ganhas ou perdidas. Nada é alterado nesta tela.
      </p>

      <div className="mt-6 flex gap-2">
        <Aba href="/crm/encerradas?status=ganha" ativa={filtro === "ganha"}>
          Ganhas
        </Aba>
        <Aba href="/crm/encerradas?status=perdida" ativa={filtro === "perdida"}>
          Perdidas
        </Aba>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Não foi possível carregar as oportunidades. {error.message}
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-[#5b6472]">
            {linhas.length} operação(ões) {filtro === "ganha" ? "ganha(s)" : "perdida(s)"}
            {filtro === "ganha" && linhas.length > 0 && (
              <>
                {" · "}Valor fechado: <strong>{formatCurrencyBRL(totalValor)}</strong>
                {" · "}Comissão: <strong>{formatCurrencyBRL(totalComissao)}</strong>
              </>
            )}
          </p>

          <div className="mt-3 overflow-hidden rounded-lg border border-[#e4e0d9] bg-white">
            {linhas.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#5b6472]">
                Nenhuma operação {filtro === "ganha" ? "ganha" : "perdida"} registrada.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e4e0d9] bg-[#faf8f5] text-[#5b6472]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Oportunidade</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    {filtro === "ganha" ? (
                      <>
                        <th className="px-4 py-3 font-medium">Valor fechado</th>
                        <th className="px-4 py-3 font-medium">Comissão ETHEX</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 font-medium">Motivo da perda</th>
                        <th className="px-4 py-3 font-medium">Última etapa</th>
                      </>
                    )}
                    <th className="px-4 py-3 font-medium">Consultor</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(({ op, f }) => {
                    const comissao = f ? comissaoExibida(f) : null;
                    return (
                      <tr key={op.id} className="border-b border-[#e4e0d9] last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/crm/${op.id}`} className="font-medium hover:underline">
                            {op.titulo}
                          </Link>
                          <p className="text-xs text-[#5b6472]">
                            <Link href={`/clientes/${op.cliente_id}`} className="hover:underline">
                              {clienteNome.get(op.cliente_id) ?? "—"}
                            </Link>
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[#0b1f34]">
                          {f ? formatDataCurta(f.data_fechamento) : "—"}
                        </td>
                        {filtro === "ganha" ? (
                          <>
                            <td className="px-4 py-3 tabular-nums text-[#0b1f34]">
                              {f ? formatCurrencyBRL(f.valor_fechado) : "—"}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-[#0b1f34]">
                              {comissao?.valor != null ? (
                                <>
                                  {formatCurrencyBRL(comissao.valor)}
                                  <span className="block text-xs text-[#5b6472]">
                                    {comissao.efetiva ? "efetiva" : "prevista"}
                                  </span>
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-[#0b1f34]">
                              {f?.motivo_perda ? MOTIVO_PERDA_LABELS[f.motivo_perda] : "—"}
                            </td>
                            <td className="px-4 py-3 text-[#0b1f34]">{ETAPA_LABELS[op.etapa]}</td>
                          </>
                        )}
                        <td className="px-4 py-3 text-[#0b1f34]">{consultorNome.get(op.consultor_id) ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/crm/${op.id}/fechamento`}
                            className="text-xs text-[#5b6472] hover:underline"
                          >
                            {f ? "Ver fechamento →" : "Sem fechamento registrado →"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Aba({ href, ativa, children }: { href: string; ativa: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-md border px-4 py-1.5 text-sm ${
        ativa
          ? "border-[#d6b072] bg-[#d6b072] font-medium text-[#0b1f34]"
          : "border-[#e4e0d9] text-[#0b1f34] hover:bg-[#efe9e0]"
      }`}
    >
      {children}
    </Link>
  );
}
