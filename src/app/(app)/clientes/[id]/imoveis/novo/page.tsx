import Link from "next/link";
import { AddImovelForm } from "@/components/AddImovelForm";
import { createImovel } from "../actions";

export default async function NovoImovelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const action = createImovel.bind(null, id);

  return (
    <div className="max-w-2xl">
      <Link
        href={`/clientes/${id}`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Adicionar imóvel</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Cole o link do anúncio para pré-preencher com os dados públicos da
        página, depois ajuste o que faltar.
      </p>

      <AddImovelForm action={action} error={error} />
    </div>
  );
}
