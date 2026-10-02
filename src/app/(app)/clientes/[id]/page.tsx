import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteCliente } from "@/app/(app)/clientes/actions";
import { StatusSelect } from "@/components/StatusSelect";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import {
  FINALIDADE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatFaixaValores,
  formatRegiao,
} from "@/lib/labels";
import { labelCriterio } from "@/lib/scoring-criteria";
import { buildGoogleSearchUrl } from "@/lib/search-query";
import { ContatosDaBusca } from "@/components/ContatosDaBusca";
import { ImovelCard } from "@/components/ImovelCard";
import type { ImovelDaBusca } from "@/lib/contato-busca";
import { carregarContatosDaBusca } from "@/lib/contato-busca-dados";
import { oportunidadeDoCliente } from "@/lib/oportunidade-do-cliente";
import type {
  ClienteRow,
  ImovelComCuradoria,
  ImovelRow,
  PerfilRow,
  VisitaClienteRow,
} from "@/lib/database.types";

interface CuradoriaComImovel {
  id: string;
  score: number | null;
  status_curadoria: ImovelComCuradoria["status_curadoria"];
  comissao_combinada: boolean;
  selecionado_apresentacao: boolean | null;
  parceiro_id: string | null;
  imovel: ImovelRow;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClienteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ oportunidade?: string }>;
}) {
  const { id } = await params;
  const { oportunidade: oportunidadeParam } = await searchParams;
  const supabase = await createClient();

  // Só volta para a oportunidade se ela for deste cliente (e visível pela RLS).
  let voltarHref = "/clientes";
  let voltarLabel = "← Voltar";
  let oportunidadeOrigemId: string | null = null;
  if (oportunidadeParam && UUID.test(oportunidadeParam)) {
    const { data: origem } = await supabase
      .from("oportunidade")
      .select("id")
      .eq("id", oportunidadeParam)
      .eq("cliente_id", id)
      .maybeSingle();
    if (origem) {
      voltarHref = `/crm/${origem.id}`;
      voltarLabel = "← Voltar para oportunidade";
      oportunidadeOrigemId = origem.id as string;
    }
  }

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

  let imoveis: ImovelDaBusca[] = [];
  if (perfil) {
    const { data: buscas } = await supabase
      .from("busca")
      .select("id")
      .eq("perfil_id", perfil.id);
    const buscaIds = (buscas ?? []).map((b) => b.id as string);
    if (buscaIds.length > 0) {
      const { data } = await supabase
        .from("imovel_encontrado")
        .select(
          "id, score, status_curadoria, comissao_combinada, selecionado_apresentacao, parceiro_id, imovel(*)"
        )
        .in("busca_id", buscaIds)
        .order("id", { ascending: false })
        .returns<CuradoriaComImovel[]>();
      imoveis = (data ?? []).map((c) => ({
        ...c.imovel,
        curadoria_id: c.id,
        curadoria_score: c.score,
        status_curadoria: c.status_curadoria,
        comissao_combinada: c.comissao_combinada,
        selecionado_apresentacao: Boolean(c.selecionado_apresentacao),
        parceiro_id: c.parceiro_id,
      }));
    }
  }

  // O roteiro por contato é da oportunidade: a de origem, senão a de referência do cliente.
  const oportunidadeId =
    oportunidadeOrigemId ?? (await oportunidadeDoCliente(supabase, id))?.id ?? null;
  let contatosDaBusca: Awaited<ReturnType<typeof carregarContatosDaBusca>> | null = null;
  if (oportunidadeId && imoveis.length > 0) {
    const { data: visitasCliente } = await supabase
      .from("visita_cliente")
      .select("imovel_encontrado_id, status")
      .eq("cliente_id", id)
      .returns<Pick<VisitaClienteRow, "imovel_encontrado_id" | "status">[]>();
    contatosDaBusca = await carregarContatosDaBusca(supabase, {
      oportunidadeId,
      imoveis,
      visitasCliente: visitasCliente ?? [],
    });
  }

  return (
    <div>
      <Link
        href={voltarHref}
        className="text-sm text-[#5b6472] hover:underline"
      >
        {voltarLabel}
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{cliente.nome}</h1>
          <p className="mt-1 text-sm text-[#5b6472]">
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

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusSelect clienteId={cliente.id} status={cliente.status} />
        <Link
          href={`/crm/novo?cliente=${cliente.id}`}
          className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#faf8f5]"
        >
          Nova oportunidade
        </Link>
        <Link
          href={`/clientes/${cliente.id}/apresentacoes`}
          className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#faf8f5]"
        >
          Apresentações
          {imoveis.some((i) => i.selecionado_apresentacao) &&
            ` (${imoveis.filter((i) => i.selecionado_apresentacao).length} selecionados)`}
        </Link>
        <ConfirmSubmitButton
          action={deleteCliente.bind(null, cliente.id)}
          confirmMessage={`Excluir "${cliente.nome}"? Isso apaga permanentemente o perfil, buscas, imóveis da busca, oportunidades, visitas, negociações, due diligence e apresentações deste cliente. Não pode ser desfeito.`}
          className="ml-auto rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Excluir cliente
        </ConfirmSubmitButton>
      </div>

      <section className="mt-8 rounded-lg border border-[#e4e0d9] bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Perfil</h2>
          <Link
            href={`/clientes/${cliente.id}/entrevista`}
            className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
          >
            {perfil ? "Editar entrevista" : "Iniciar entrevista"}
          </Link>
        </div>

        {!perfil && (
          <p className="mt-4 text-sm text-[#5b6472]">
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
              <dt className="text-[#5b6472]">Regiões aceitas</dt>
              <dd className="mt-0.5 font-medium">
                {perfil.regioes_aceitas?.length
                  ? perfil.regioes_aceitas.map(formatRegiao).join(" · ")
                  : "—"}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-[#5b6472]">Critérios priorizados</dt>
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
                <dt className="text-[#5b6472]">Motivação</dt>
                <dd className="mt-0.5">{perfil.motivacao}</dd>
              </div>
            )}
            {perfil.aspiracoes && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-[#5b6472]">Aspirações</dt>
                <dd className="mt-0.5">{perfil.aspiracoes}</dd>
              </div>
            )}
            {perfil.restricoes && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-[#5b6472]">Restrições</dt>
                <dd className="mt-0.5">{perfil.restricoes}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <section
        id="imoveis"
        className="mt-6 scroll-mt-6 rounded-lg border border-[#e4e0d9] bg-white p-3 sm:p-6"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Imóveis</h2>
          <div className="flex gap-2">
            {perfil && (
              <a
                href={buildGoogleSearchUrl(perfil)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#efe9e0]"
              >
                Buscar imóvel
              </a>
            )}
            <Link
              href={`/clientes/${cliente.id}/imoveis/novo`}
              className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
            >
              Adicionar imóvel
            </Link>
          </div>
        </div>

        {!perfil && (
          <p className="mt-4 text-sm text-[#5b6472]">
            Finalize a entrevista antes de adicionar imóveis.
          </p>
        )}

        {perfil && imoveis.length === 0 && (
          <p className="mt-4 text-sm text-[#5b6472]">
            Nenhum imóvel adicionado ainda.
          </p>
        )}

        {imoveis.length > 0 && oportunidadeId && contatosDaBusca && (
          <ContatosDaBusca
            grupos={contatosDaBusca.grupos}
            contatos={contatosDaBusca.contatos}
            visitas={contatosDaBusca.visitas}
            oportunidadeId={oportunidadeId}
            clienteId={cliente.id}
            voltar={`/clientes/${cliente.id}`}
          />
        )}

        {imoveis.length > 0 && !contatosDaBusca && (
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
      <dt className="text-[#5b6472]">{label}</dt>
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
