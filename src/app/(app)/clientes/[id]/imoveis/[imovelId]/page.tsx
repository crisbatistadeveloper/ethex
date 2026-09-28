import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddressMapPicker } from "@/components/AddressMapPickerLoader";
import { AreaInput } from "@/components/AreaInput";
import { CurrencyInput } from "@/components/CurrencyInput";
import { MediaUploader } from "@/components/MediaUploader";
import { ImovelGaleria } from "@/components/ImovelGaleria";
import { midiasDoImovel } from "@/lib/midias-imovel";
import {
  StatusConstrucaoBadge,
  StatusConstrucaoRadios,
} from "@/components/StatusConstrucao";
import {
  CaracteristicasResumo,
  DiferenciaisFields,
} from "@/components/CaracteristicasImovel";
import {
  updateComissaoCombinada,
  updateImovel,
  updateStatusCuradoria,
} from "../actions";
import { CuradoriaParceiroNegociacao } from "@/components/CuradoriaParceiroNegociacao";
import { DueDiligenceSection } from "@/components/DueDiligenceSection";
import { gerarUrlsAssinadas } from "@/lib/storage-assinado";
import { DOCUMENTOS_IMOVEIS_BUCKET } from "@/lib/due-diligence";
import { VisitaPreviaSection } from "@/components/VisitaPreviaSection";
import { VisitasClienteSection } from "@/components/VisitasClienteSection";
import { DecisaoNegociacaoSection } from "@/components/DecisaoNegociacaoSection";
import { oportunidadeDoCliente } from "@/lib/oportunidade-do-cliente";
import { IMOVEL_TITULO_COLUNAS, tituloImovel, type ImovelParaTitulo } from "@/lib/imovel-titulo";
import { AnuncioOriginal } from "@/components/AnuncioOriginal";
import { toggleSelecaoApresentacao } from "../../apresentacoes/actions";
import type {
  CuradoriaStatus,
  DecisaoImovelRow,
  DueDiligenceStatus,
  NegociacaoCompraRow,
  ImovelDocumentoRow,
  ImovelEncontradoHistoricoRow,
  ImovelRow,
  NegociacaoParceriaRow,
  ParceiroRow,
  VisitaClienteRow,
  VisitaPreviaRow,
} from "@/lib/database.types";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-sm font-medium text-[#0b1f34]";

interface CuradoriaComImovel {
  id: string;
  imovel_id: string;
  status_curadoria: CuradoriaStatus;
  comissao_combinada: boolean;
  parceiro_id: string | null;
  due_diligence_status: DueDiligenceStatus;
  due_diligence_observacoes: string | null;
  due_diligence_checklist: unknown;
  selecionado_apresentacao: boolean | null;
  imovel: ImovelRow;
}

export default async function ImovelDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; imovelId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, imovelId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: curadoria } = await supabase
    .from("imovel_encontrado")
    .select(
      "id, imovel_id, status_curadoria, comissao_combinada, parceiro_id, due_diligence_status, due_diligence_observacoes, due_diligence_checklist, selecionado_apresentacao, imovel(*)"
    )
    .eq("id", imovelId)
    .returns<CuradoriaComImovel[]>()
    .maybeSingle();

  if (!curadoria) notFound();

  const { data: parceiros } = await supabase
    .from("parceiro")
    .select(
      "id, tipo, nome, imobiliaria_nome, contato_telefone, whatsapp, contato_email, modelo_divisao, politica_comissao, condicoes_parceria, ultima_negociacao_em, ativo"
    )
    .order("nome")
    .limit(200)
    .returns<
      Pick<
        ParceiroRow,
        | "id"
        | "tipo"
        | "nome"
        | "imobiliaria_nome"
        | "contato_telefone"
        | "whatsapp"
        | "contato_email"
        | "modelo_divisao"
        | "politica_comissao"
        | "condicoes_parceria"
        | "ultima_negociacao_em"
        | "ativo"
      >[]
    >();

  const { data: negociacao } = await supabase
    .from("negociacao_parceria")
    .select("*")
    .eq("imovel_encontrado_id", imovelId)
    .returns<NegociacaoParceriaRow[]>()
    .maybeSingle();

  const { data: historico } = await supabase
    .from("imovel_encontrado_historico")
    .select("*")
    .eq("imovel_encontrado_id", imovelId)
    .order("criado_em", { ascending: false })
    .limit(30)
    .returns<ImovelEncontradoHistoricoRow[]>();

  const { data: documentos } = await supabase
    .from("imovel_documento")
    .select("*")
    .eq("imovel_id", curadoria.imovel_id)
    .order("criado_em", { ascending: false })
    .returns<ImovelDocumentoRow[]>();
  const urlPorPath = await gerarUrlsAssinadas(
    supabase,
    DOCUMENTOS_IMOVEIS_BUCKET,
    (documentos ?? []).map((d) => d.storage_path)
  );
  const urlsDocumentos: Record<string, string> = {};
  for (const d of documentos ?? []) {
    const assinada = d.storage_path ? urlPorPath.get(d.storage_path) : undefined;
    if (assinada) urlsDocumentos[d.id] = assinada;
  }

  const { data: visitasRaw } = await supabase
    .from("visita_previa")
    .select("*")
    .eq("imovel_id", curadoria.imovel_id)
    .order("data_visita", { ascending: false })
    .returns<VisitaPreviaRow[]>();

  const consultorIds = [
    ...new Set((visitasRaw ?? []).map((v) => v.consultor_id)),
  ];
  let consultorNomes = new Map<string, string>();
  if (consultorIds.length > 0) {
    const { data: consultores } = await supabase
      .from("usuario")
      .select("id, nome")
      .in("id", consultorIds);
    consultorNomes = new Map(
      (consultores ?? []).map((c) => [c.id as string, c.nome as string])
    );
  }
  const visitas = (visitasRaw ?? []).map((v) => ({
    ...v,
    consultor_nome: consultorNomes.get(v.consultor_id) ?? null,
  }));

  const { data: visitasCliente } = await supabase
    .from("visita_cliente")
    .select("*")
    .eq("imovel_encontrado_id", imovelId)
    .order("criado_em", { ascending: false })
    .returns<VisitaClienteRow[]>();

  const oportunidade = await oportunidadeDoCliente(supabase, id);
  let decisao: DecisaoImovelRow | null = null;
  let outroEscolhidoTitulo: string | null = null;
  let negociacoesCompra: NegociacaoCompraRow[] = [];
  let ativaEmOutroImovel = false;
  if (oportunidade) {
    const { data: decisoes } = await supabase
      .from("decisao_imovel")
      .select("*")
      .eq("oportunidade_id", oportunidade.id)
      .returns<DecisaoImovelRow[]>();
    decisao = (decisoes ?? []).find((d) => d.imovel_encontrado_id === imovelId) ?? null;
    const outro = (decisoes ?? []).find(
      (d) => d.decisao === "escolhido" && d.imovel_encontrado_id !== imovelId
    );
    if (outro) {
      const { data: ie } = await supabase
        .from("imovel_encontrado")
        .select(`imovel(${IMOVEL_TITULO_COLUNAS})`)
        .eq("id", outro.imovel_encontrado_id)
        .returns<{ imovel: ImovelParaTitulo }[]>()
        .maybeSingle();
      outroEscolhidoTitulo = ie ? tituloImovel(ie.imovel) : "outro imóvel";
    }
    const { data: negs } = await supabase
      .from("negociacao_compra")
      .select("*")
      .eq("oportunidade_id", oportunidade.id)
      .order("iniciada_em", { ascending: false })
      .returns<NegociacaoCompraRow[]>();
    negociacoesCompra = (negs ?? []).filter((n) => n.imovel_encontrado_id === imovelId);
    ativaEmOutroImovel = (negs ?? []).some(
      (n) =>
        n.imovel_encontrado_id !== imovelId &&
        ["iniciada", "proposta_enviada", "contraproposta"].includes(n.status)
    );
  }

  const imovel = curadoria.imovel;
  const updateAction = updateImovel.bind(null, imovelId, id);
  const statusAction = updateStatusCuradoria.bind(null, imovelId, id);
  const comissaoAction = updateComissaoCombinada.bind(null, imovelId, id);
  const selecaoAction = toggleSelecaoApresentacao.bind(null, imovelId, id);
  const selecionado = Boolean(curadoria.selecionado_apresentacao);
  const midias = await midiasDoImovel(supabase, imovel);

  return (
    <div className="max-w-2xl">
      <Link
        href={`/clientes/${id}`}
        className="text-sm text-[#5b6472] hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{tituloImovel(imovel)}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <StatusConstrucaoBadge status={imovel.status_construcao} />
        <a
          href={imovel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-[#5b6472] hover:underline"
        >
          Ver anúncio original ↗
        </a>
      </div>
      <AnuncioOriginal imovel={imovel} />
      <div className="mt-3">
        <CaracteristicasResumo imovel={imovel} mostrarAusentes />
      </div>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#0b1f34]">
          Fotos e vídeos
        </h2>
        <ImovelGaleria
          midias={midias}
          visitaHref={(visitaId) =>
            `/clientes/${id}/imoveis/${imovelId}/visita/${visitaId}`
          }
        />
      </section>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={statusAction}>
          <input type="hidden" name="status" value="aprovado" />
          <button
            type="submit"
            className="rounded-md border border-green-300 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
          >
            Aprovar
          </button>
        </form>
        <form action={statusAction}>
          <input type="hidden" name="status" value="rejeitado" />
          <button
            type="submit"
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Rejeitar
          </button>
        </form>
        <form action={selecaoAction}>
          <input type="hidden" name="selecionado" value={selecionado ? "0" : "1"} />
          <button
            type="submit"
            className={
              selecionado
                ? "rounded-md border border-amber-400 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
                : "rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:bg-[#faf8f5]"
            }
          >
            {selecionado
              ? "★ Selecionado para apresentação"
              : "☆ Selecionar para apresentação"}
          </button>
        </form>
      </div>

      <form
        action={comissaoAction}
        className="mt-4 flex items-center gap-2 text-sm text-[#0b1f34]"
      >
        <input
          type="checkbox"
          id="comissao_combinada"
          name="comissao_combinada"
          defaultChecked={curadoria.comissao_combinada}
        />
        <label htmlFor="comissao_combinada">
          Divisão de comissão combinada com o corretor/imobiliária
        </label>
        <button
          type="submit"
          className="ml-1 rounded-md border border-[#e4e0d9] px-2.5 py-1 text-xs hover:bg-[#efe9e0]"
        >
          Salvar
        </button>
      </form>

      <div id="decisao-negociacao" className="scroll-mt-6">
        <DecisaoNegociacaoSection
          curadoriaId={imovelId}
          clienteId={id}
          oportunidadeId={oportunidade?.id ?? null}
          decisao={decisao}
          outroEscolhidoTitulo={outroEscolhidoTitulo}
          negociacoes={negociacoesCompra}
          ativaEmOutroImovel={ativaEmOutroImovel}
        />
      </div>

      <CuradoriaParceiroNegociacao
        curadoriaId={imovelId}
        clienteId={id}
        parceiroId={curadoria.parceiro_id}
        parceiros={parceiros ?? []}
        negociacao={negociacao}
        historico={historico ?? []}
      />

      <DueDiligenceSection
        curadoriaId={imovelId}
        clienteId={id}
        imovelId={curadoria.imovel_id}
        status={curadoria.due_diligence_status ?? "pendente"}
        observacoes={curadoria.due_diligence_observacoes}
        checklistRaw={curadoria.due_diligence_checklist}
        documentos={documentos ?? []}
        urlsArquivos={urlsDocumentos}
      />

      <VisitaPreviaSection
        curadoriaId={imovelId}
        clienteId={id}
        visitas={visitas}
      />

      <VisitasClienteSection
        curadoriaId={imovelId}
        clienteId={id}
        visitas={visitasCliente ?? []}
      />

      <p className="mt-4 text-xs text-[#5b6472]">
        Este imóvel fica salvo no catálogo compartilhado — editar os campos
        abaixo atualiza os dados para qualquer outro cliente que também tenha
        esse imóvel associado. Aprovar/rejeitar afeta só este cliente.
      </p>

      <form action={updateAction} className="mt-4 space-y-6">
        <section className="rounded-lg border border-[#e4e0d9] bg-white p-6">
          <h2 className="text-lg font-semibold">Características</h2>
          <div className="mt-4">
            <StatusConstrucaoRadios defaultValue={imovel.status_construcao} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Preço</label>
              <CurrencyInput
                name="preco"
                defaultValue={imovel.preco}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Área total</label>
              <AreaInput
                name="area_total"
                defaultValue={imovel.area_total ?? undefined}
                className={inputClass}
              />
            </div>
            {(
              [
                ["quartos", "Quartos", imovel.quartos],
                ["suites", "Suítes", imovel.suites],
                ["banheiros", "Banheiros", imovel.banheiros],
                ["vagas", "Vagas", imovel.vagas],
              ] as const
            ).map(([name, label, valor]) => (
              <div key={name}>
                <label className={labelClass}>{label}</label>
                <input
                  type="number"
                  name={name}
                  min={0}
                  defaultValue={valor ?? ""}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <DiferenciaisFields defaults={imovel} />
          </div>
        </section>

        <section className="rounded-lg border border-[#e4e0d9] bg-white p-6">
          <h2 className="text-lg font-semibold">Contato do anúncio</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Nome</label>
              <input
                name="nome_contato"
                defaultValue={imovel.nome_contato ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input
                name="telefone_contato"
                defaultValue={imovel.telefone_contato ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tipo</label>
              <input
                name="tipo_contato"
                list="tipos-contato"
                defaultValue={imovel.tipo_contato ?? ""}
                className={inputClass}
              />
              <datalist id="tipos-contato">
                <option value="Corretor" />
                <option value="Imobiliária" />
                <option value="Empreendimento" />
                <option value="Proprietário" />
              </datalist>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#e4e0d9] bg-white p-6">
          <h2 className="text-lg font-semibold">Localização</h2>
          <div className="mt-4">
            <AddressMapPicker
              initialLat={imovel.latitude}
              initialLon={imovel.longitude}
              initialEndereco={imovel.endereco_texto}
            />
          </div>
        </section>

        <button
          type="submit"
          className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
        >
          Salvar alterações
        </button>
      </form>

      <section className="mt-6 rounded-lg border border-[#e4e0d9] bg-white p-6">
        <h2 className="text-lg font-semibold">Mídia própria</h2>
        <p className="mt-1 text-sm text-[#5b6472]">
          Fotos e vídeos extras do imóvel, fora de uma visita prévia (ex.:
          enviados pelo corretor). Compartilhada entre clientes que tenham
          este imóvel. As fotos da visita prévia são enviadas no relatório da
          visita e já aparecem em “Fotos e vídeos”, no topo da página.
        </p>
        <div className="mt-4">
          <MediaUploader
            imovelId={curadoria.id}
            clienteId={id}
            initialUrls={imovel.midia_propria ?? []}
          />
        </div>
      </section>
    </div>
  );
}
