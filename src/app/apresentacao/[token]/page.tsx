import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApresentacaoImovelCard } from "@/components/ApresentacaoImovelCard";
import {
  ITEM_STATUS_LABELS,
  RESPOSTAS_CLIENTE,
  montarConteudo,
  type VisitaResumo,
} from "@/lib/apresentacao";
import { responderItem } from "./actions";
import type { CaracteristicasImovel } from "@/lib/imovel-caracteristicas";
import type {
  ApresentacaoItemStatus,
  ApresentacaoStatus,
  Caracteristicas,
  DueDiligenceStatus,
  ImovelStatusConstrucao,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Apresentação de imóveis — ETHEX",
  robots: { index: false, follow: false },
};

interface ApresentacaoPublica {
  apresentacao: {
    id: string;
    status: ApresentacaoStatus;
    observacoes: string | null;
    criado_em: string;
    cliente_nome: string | null;
    consultor_nome: string | null;
  };
  itens: {
    id: string;
    ordem: number;
    destaque: boolean;
    status: ApresentacaoItemStatus;
    resposta_cliente: ApresentacaoItemStatus | null;
    observacao_consultor: string | null;
    curadoria_id: string;
    due_diligence_status: DueDiligenceStatus | null;
    imovel: {
      id: string;
      preco: number | null;
      caracteristicas: Caracteristicas | null;
      status_construcao?: ImovelStatusConstrucao | null;
      endereco_texto: string | null;
      latitude: number | null;
      longitude: number | null;
      midia_propria: string[] | null;
    } & Partial<CaracteristicasImovel>;
    visita: VisitaResumo | null;
  }[];
}

export default async function ApresentacaoPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("apresentacao_publica", {
    p_token: token,
  });
  const payload = data as ApresentacaoPublica | null;
  if (!payload) notFound();

  const { apresentacao, itens } = payload;
  const podeResponder =
    apresentacao.status === "enviada" || apresentacao.status === "em_avaliacao";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold tracking-widest text-[#5b6472]">
          ETHEX
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {apresentacao.cliente_nome
            ? `${apresentacao.cliente_nome}, estas são as opções selecionadas para você`
            : "Opções selecionadas para você"}
        </h1>
        {apresentacao.consultor_nome && (
          <p className="mt-2 text-sm text-[#5b6472]">
            Curadoria de {apresentacao.consultor_nome}
          </p>
        )}
        {apresentacao.observacoes && (
          <p className="mt-4 whitespace-pre-line rounded-lg border border-[#e4e0d9] bg-white p-4 text-sm text-[#0b1f34]">
            {apresentacao.observacoes}
          </p>
        )}
        {podeResponder && (
          <p className="mt-4 text-sm text-[#5b6472]">
            Em cada imóvel, indique se tem interesse, se não tem, ou se quer
            visitar. Você pode mudar sua resposta quando quiser.
          </p>
        )}
      </header>

      {itens.length === 0 && (
        <p className="text-sm text-[#5b6472]">Nenhum imóvel nesta apresentação.</p>
      )}

      <div className="space-y-8">
        {itens.map((item, idx) => {
          const conteudo = montarConteudo({
            curadoria_id: item.curadoria_id,
            preco: item.imovel.preco,
            caracteristicas: item.imovel.caracteristicas,
            status_construcao: item.imovel.status_construcao,
            estrutura: item.imovel,
            endereco_texto: item.imovel.endereco_texto,
            latitude: item.imovel.latitude,
            longitude: item.imovel.longitude,
            midia_propria: item.imovel.midia_propria,
            due_diligence_status: item.due_diligence_status,
            visita: item.visita,
          });
          const responder = responderItem.bind(null, token, item.id);

          return (
            <ApresentacaoImovelCard
              key={item.id}
              conteudo={conteudo}
              posicao={idx + 1}
              destaque={item.destaque}
              observacao={item.observacao_consultor}
              visao="cliente"
            >
              {podeResponder ? (
                <form action={responder} className="flex flex-wrap gap-2 border-t border-[#e4e0d9] pt-4">
                  {RESPOSTAS_CLIENTE.map((r) => {
                    const ativo = item.resposta_cliente === r.value;
                    return (
                      <button
                        key={r.value}
                        type="submit"
                        name="resposta"
                        value={r.value}
                        className={
                          ativo
                            ? "rounded-full border border-[#d6b072] bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34]"
                            : "rounded-full border border-[#e4e0d9] px-4 py-2 text-sm hover:bg-[#efe9e0]"
                        }
                      >
                        {r.icon} {r.label}
                      </button>
                    );
                  })}
                </form>
              ) : (
                item.resposta_cliente && (
                  <p className="border-t border-[#e4e0d9] pt-4 text-sm text-[#5b6472]">
                    Sua resposta: <strong>{ITEM_STATUS_LABELS[item.resposta_cliente]}</strong>
                  </p>
                )
              )}
            </ApresentacaoImovelCard>
          );
        })}
      </div>

      <footer className="mt-12 text-center text-xs text-[#5b6472]">
        ETHEX — consultoria imobiliária que representa o comprador.
        <br />
        Análises documentais apresentadas são preliminares.
      </footer>
    </div>
  );
}
