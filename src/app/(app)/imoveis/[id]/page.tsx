import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { attachImovelToCliente } from "../actions";
import { StatusConstrucaoBadge } from "@/components/StatusConstrucao";
import { CaracteristicasResumo } from "@/components/CaracteristicasImovel";
import { formatPreco } from "@/lib/apresentacao";
import { ImovelGaleria } from "@/components/ImovelGaleria";
import { midiasDoImovel } from "@/lib/midias-imovel";
import { tituloImovel } from "@/lib/imovel-titulo";
import { AnuncioOriginal } from "@/components/AnuncioOriginal";
import type { CuradoriaStatus, ImovelRow } from "@/lib/database.types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CURADORIA_LABELS: Record<CuradoriaStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const CURADORIA_COLORS: Record<CuradoriaStatus, string> = {
  pendente: "bg-amber-100 text-amber-800 border-amber-300",
  aprovado: "bg-green-100 text-green-800 border-green-300",
  rejeitado: "bg-red-100 text-red-800 border-red-300",
};

interface CuradoriaDoImovel {
  id: string;
  status_curadoria: CuradoriaStatus;
  busca: { perfil: { cliente: { id: string; nome: string } | null } | null } | null;
}

export default async function ImovelCatalogoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: imovel } = await supabase
    .from("imovel")
    .select("*")
    .eq("id", id)
    .returns<ImovelRow[]>()
    .maybeSingle();
  if (!imovel) notFound();

  // RLS: só aparecem as curadorias de clientes visíveis ao usuário.
  const [{ data: curadorias }, { data: clientes }] = await Promise.all([
    supabase
      .from("imovel_encontrado")
      .select("id, status_curadoria, busca:busca_id(perfil:perfil_id(cliente:cliente_id(id, nome)))")
      .eq("imovel_id", id)
      .returns<CuradoriaDoImovel[]>(),
    supabase.from("cliente").select("id, nome").order("nome"),
  ]);

  const c = imovel.caracteristicas ?? {};
  const titulo = tituloImovel(imovel);
  const preco = formatPreco(imovel.preco);
  const midias = await midiasDoImovel(supabase, imovel);
  const vinculadas = (curadorias ?? []).filter((cu) => cu.busca?.perfil?.cliente);
  const acao = attachImovelToCliente.bind(null, imovel.id);

  return (
    <div className="max-w-3xl">
      <Link href="/imoveis" className="text-sm text-[#5b6472] hover:underline">
        ← Catálogo
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">{titulo}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[#5b6472]">
        <StatusConstrucaoBadge status={imovel.status_construcao} />
        <span>{imovel.fonte}</span>
        <a
          href={imovel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Ver anúncio original ↗
        </a>
      </div>
      <AnuncioOriginal imovel={imovel} />

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6">
        <ImovelGaleria midias={midias} />
      </div>

      <section className="mt-6 rounded-lg border border-[#e4e0d9] bg-white p-6">
        <h2 className="text-lg font-semibold">Características</h2>
        {preco && <p className="mt-2 text-xl font-medium">{preco}</p>}
        <div className="mt-2">
          <CaracteristicasResumo imovel={imovel} mostrarAusentes />
        </div>
        {imovel.endereco_texto && (
          <p className="mt-3 text-sm text-[#5b6472]">📍 {imovel.endereco_texto}</p>
        )}
        {c.descricao && (
          <p className="mt-3 whitespace-pre-line text-sm text-[#5b6472]">{c.descricao}</p>
        )}
        {(imovel.nome_contato || imovel.telefone_contato) && (
          <p className="mt-3 text-sm text-[#5b6472]">
            Contato:{" "}
            {[imovel.nome_contato, imovel.telefone_contato].filter(Boolean).join(" · ")}
            {imovel.tipo_contato ? ` (${imovel.tipo_contato})` : ""}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-[#e4e0d9] bg-white p-6">
        <h2 className="text-lg font-semibold">Curadorias com este imóvel</h2>
        {vinculadas.length === 0 ? (
          <p className="mt-2 text-sm text-[#5b6472]">
            Nenhuma curadoria sua com este imóvel.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[#e4e0d9]">
            {vinculadas.map((cu) => {
              const cliente = cu.busca!.perfil!.cliente!;
              return (
                <li key={cu.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-medium text-[#0b1f34]">{cliente.nome}</span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${CURADORIA_COLORS[cu.status_curadoria]}`}
                    >
                      {CURADORIA_LABELS[cu.status_curadoria]}
                    </span>
                    <Link
                      href={`/clientes/${cliente.id}/imoveis/${cu.id}`}
                      className="text-[#5b6472] hover:underline"
                    >
                      Abrir curadoria →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form action={acao} className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e4e0d9] pt-4">
          <input type="hidden" name="origem" value={`/imoveis/${imovel.id}`} />
          <select
            name="clienteId"
            required
            className="rounded-md border border-[#e4e0d9] px-2 py-1.5 text-sm focus:border-[#b8925a] focus:outline-none"
          >
            <option value="">Associar a um cliente...</option>
            {(clientes ?? []).map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.nome}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#efe9e0]"
          >
            Associar
          </button>
        </form>
      </section>
    </div>
  );
}
