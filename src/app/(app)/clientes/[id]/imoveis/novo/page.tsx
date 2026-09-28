import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddImovelForm } from "@/components/AddImovelForm";
import { ContextoBusca } from "@/components/ContextoBusca";
import { createImovel } from "../actions";
import type { PerfilRow } from "@/lib/database.types";
import { IMOVEL_TITULO_COLUNAS, tituloImovel, type ImovelParaTitulo } from "@/lib/imovel-titulo";

interface CuradoriaAdicionada {
  id: string;
  imovel: ImovelParaTitulo | null;
}

export default async function NovoImovelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; adicionado?: string; ja?: string }>;
}) {
  const { id } = await params;
  const { error, adicionado, ja } = await searchParams;
  const action = createImovel.bind(null, id);
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("cliente")
    .select("id, nome")
    .eq("id", id)
    .maybeSingle();
  if (!cliente) notFound();

  const { data: perfil } = await supabase
    .from("perfil")
    .select("*")
    .eq("cliente_id", id)
    .returns<PerfilRow[]>()
    .maybeSingle();

  let totalNaCuradoria = 0;
  let recemAdicionado: CuradoriaAdicionada | null = null;
  if (perfil) {
    const { data: buscas } = await supabase
      .from("busca")
      .select("id")
      .eq("perfil_id", perfil.id);
    const buscaIds = (buscas ?? []).map((b) => b.id as string);
    if (buscaIds.length > 0) {
      const { count } = await supabase
        .from("imovel_encontrado")
        .select("id", { count: "exact", head: true })
        .in("busca_id", buscaIds);
      totalNaCuradoria = count ?? 0;

      if (adicionado) {
        const { data } = await supabase
          .from("imovel_encontrado")
          .select(`id, imovel(${IMOVEL_TITULO_COLUNAS})`)
          .eq("id", adicionado)
          .in("busca_id", buscaIds)
          .returns<CuradoriaAdicionada[]>()
          .maybeSingle();
        recemAdicionado = data;
      }
    }
  }

  const tituloAdicionado = tituloImovel(recemAdicionado?.imovel);

  return (
    <div className="max-w-2xl">
      <Link
        href={`/clientes/${id}`}
        className="text-sm text-[#5b6472] hover:underline"
      >
        ← Voltar para {cliente.nome}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Busca de imóveis</h1>

      {perfil && (
        <ContextoBusca
          clienteNome={cliente.nome}
          perfil={perfil}
          totalNaCuradoria={totalNaCuradoria}
        />
      )}

      {!perfil && (
        <p className="mt-6 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Finalize a entrevista de {cliente.nome} antes de adicionar imóveis.
        </p>
      )}

      {recemAdicionado && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            {ja
              ? `✓ ${tituloAdicionado} já estava na curadoria de ${cliente.nome}`
              : `✓ ${tituloAdicionado} adicionado à curadoria de ${cliente.nome}`}
          </p>
          <p className="mt-1 text-xs text-green-700">
            {totalNaCuradoria}{" "}
            {totalNaCuradoria === 1 ? "imóvel" : "imóveis"} na curadoria deste
            cliente.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="#novo-imovel"
              className="rounded-md bg-[#d6b072] px-3 py-1.5 text-sm font-medium text-[#0b1f34] hover:brightness-105"
            >
              Continuar buscando
            </a>
            <Link
              href={`/clientes/${id}#imoveis`}
              className="rounded-md border border-[#e4e0d9] bg-white px-3 py-1.5 text-sm hover:bg-[#efe9e0]"
            >
              Ver curadoria
            </Link>
            <Link
              href={`/clientes/${id}/imoveis/${recemAdicionado.id}`}
              className="rounded-md border border-[#e4e0d9] bg-white px-3 py-1.5 text-sm hover:bg-[#efe9e0]"
            >
              Ver este imóvel
            </Link>
          </div>
        </div>
      )}

      <p id="novo-imovel" className="mt-6 scroll-mt-52 text-sm text-[#5b6472]">
        Cole o link do anúncio para pré-preencher com os dados públicos da
        página, depois ajuste o que faltar. Após salvar, você continua nesta
        tela para adicionar o próximo.
      </p>

      <AddImovelForm
        key={adicionado ?? "novo"}
        action={action}
        error={error}
        rascunhoKey={`ethex:busca:${id}:rascunho`}
        limparRascunho={recemAdicionado?.id ?? null}
      />
    </div>
  );
}
