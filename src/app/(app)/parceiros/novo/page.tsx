import Link from "next/link";
import { createParceiro } from "@/app/(app)/parceiros/actions";
import { ParceiroFormFields } from "@/app/(app)/parceiros/ParceiroFormFields";

export default async function NovoParceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/parceiros"
        className="text-sm text-[#5b6472] hover:underline"
      >
        ← Parceiros
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Novo parceiro</h1>
      <p className="mt-1 text-sm text-[#5b6472]">
        Cadastre corretor, imobiliária, proprietário ou incorporadora e a
        política de parceria conhecida.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={createParceiro} className="mt-6 space-y-6">
        <ParceiroFormFields />
        <button
          type="submit"
          className="rounded-md bg-[#d6b072] px-4 py-2 text-sm font-medium text-[#0b1f34] hover:brightness-105"
        >
          Salvar parceiro
        </button>
      </form>
    </div>
  );
}
