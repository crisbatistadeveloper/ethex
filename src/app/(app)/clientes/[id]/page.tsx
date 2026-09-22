import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusSelect } from "@/components/StatusSelect";
import {
  FINALIDADE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatFaixaValores,
  formatRegiao,
} from "@/lib/labels";
import { labelCriterio } from "@/lib/scoring-criteria";
import { buildGoogleSearchUrl } from "@/lib/search-query";
import { ImovelCard } from "@/components/ImovelCard";
import type {
  ClienteRow,
  ImovelComCuradoria,
  ImovelRow,
  PerfilRow,
} from "@/lib/database.types";

interface CuradoriaComImovel {
  id: string;
  score: number | null;
  status_curadoria: ImovelComCuradoria["status_curadoria"];
  comissao_combinada: boolean;
  imovel: ImovelRow;
}

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("cliente")
    .select("*")
    .eq("id", id)
    .returns<ClienteRow[]>()
    .maybeSingle();

  if (!cliente) notFound();

  const { data: perfil } = await supabase
    .from("perfil")
    .select("*")
    .eq("cliente_id", id)
    .returns<PerfilRow[]>()
    .maybeSingle();

  let imoveis: ImovelComCuradoria[] = [];
  if (perfil) {
    const { data: buscas } = await supabase
      .from("busca")
      .select("id")
      .eq("perfil_id", perfil.id);
    const buscaIds = (buscas ?? []).map((b) => b.id as string);
    if (buscaIds.length > 0) {
      const { data } = await supabase
        .from("imovel_encontrado")
        .select("id, score, status_curadoria, comissao_combinada, imovel(*)")
        .in("busca_id", buscaIds)
        .order("id", { ascending: false })
        .returns<CuradoriaComImovel[]>();
      imoveis = (data ?? []).map((c) => ({
        ...c.imovel,
        curadoria_id: c.id,
        curadoria_score: c.score,
        status_curadoria: c.status_curadoria,
        comissao_combinada: c.comissao_combinada,
      }));
    }
  }

  return (
    <div>
      <Link
        href="/clientes"
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Voltar
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{cliente.nome}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {[cliente.telefone, cliente.email, cliente.origem_lead]
              .filter(Boolean)
              .join(" · ") || "Sem dados de contato adicionais"}
          </p>
        </div>
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[cliente.status]}`}
        >
          {STATUS_LABELS[cliente.status]}
        </span>
      </div>

      <div className="mt-4">
        <StatusSelect clienteId={cliente.id} status={cliente.status} />
      </div>

      <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Perfil</h2>
          <Link
            href={`/clientes/${cliente.id}/entrevista`}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {perfil ? "Editar entrevista" : "Iniciar entrevista"}
          </Link>
        </div>

        {!perfil && (
          <p className="mt-4 text-sm text-neutral-500">
            Entrevista ainda não realizada.
          </p>
        )}

        {perfil && (
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Finalidade" value={FINALIDADE_LABELS[perfil.finalidade]} />
            <Field
              label="Orçamento"
              value={formatFaixaValores(perfil.orcamento_min, perfil.orcamento_max)}
            />
            <Field label="Tipo de imóvel" value={perfil.tipo_imovel} />
            <Field label="Quartos (mín.)" value={perfil.quartos_min} />
            <Field label="Vagas (mín.)" value={perfil.vagas_min} />
            <Field label="Prazo de compra" value={perfil.prazo_compra} />
            <Field label="Tem entrada" value={formatBool(perfil.tem_entrada)} />
            <Field
              label="Crédito aprovado"
              value={formatBool(perfil.credito_aprovado)}
            />
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-neutral-500">Regiões aceitas</dt>
              <dd className="mt-0.5 font-medium">
                {perfil.regioes_aceitas?.length
                  ? perfil.regioes_aceitas.map(formatRegiao).join(" · ")
                  : "—"}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-neutral-500">Critérios priorizados</dt>
              <dd className="mt-0.5 font-medium">
                {perfil.criterios_priorizados?.length
                  ? perfil.criterios_priorizados
                      .map((c, i) => `${i + 1}º ${labelCriterio(c)}`)
                      .join(" · ")
                  : "—"}
              </dd>
            </div>
            {perfil.motivacao && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-neutral-500">Motivação</dt>
                <dd className="mt-0.5">{perfil.motivacao}</dd>
              </div>
            )}
            {perfil.aspiracoes && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-neutral-500">Aspirações</dt>
                <dd className="mt-0.5">{perfil.aspiracoes}</dd>
              </div>
            )}
            {perfil.restricoes && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-neutral-500">Restrições</dt>
                <dd className="mt-0.5">{perfil.restricoes}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Imóveis</h2>
          <div className="flex gap-2">
            {perfil && (
              <a
                href={buildGoogleSearchUrl(perfil)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
              >
                Buscar no Google
              </a>
            )}
            <Link
              href={`/clientes/${cliente.id}/imoveis/novo`}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Adicionar imóvel
            </Link>
          </div>
        </div>

        {!perfil && (
          <p className="mt-4 text-sm text-neutral-500">
            Finalize a entrevista antes de adicionar imóveis.
          </p>
        )}

        {perfil && imoveis.length === 0 && (
          <p className="mt-4 text-sm text-neutral-500">
            Nenhum imóvel adicionado ainda.
          </p>
        )}

        {imoveis.length > 0 && (
          <div className="mt-4 space-y-3">
            {imoveis.map((imovel) => (
              <ImovelCard
                key={imovel.curadoria_id}
                imovel={imovel}
                clienteId={cliente.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="mt-0.5 font-medium">
        {value === null || value === undefined || value === "" ? "—" : value}
      </dd>
    </div>
  );
}

function formatBool(value: boolean | null): string {
  if (value === null) return "—";
  return value ? "Sim" : "Não";
}
