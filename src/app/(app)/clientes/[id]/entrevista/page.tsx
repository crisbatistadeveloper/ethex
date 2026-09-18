import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InterviewForm } from "@/components/InterviewForm";
import { savePerfil } from "./actions";
import type { ClienteRow, PerfilRow } from "@/lib/database.types";

export default async function EntrevistaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
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

  const action = savePerfil.bind(null, id);

  return (
    <div className="max-w-3xl">
      <Link
        href={`/clientes/${id}`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">
        Entrevista — {cliente.nome}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Conduzida pelo consultor. Os campos variam conforme a finalidade
        selecionada.
      </p>

      <InterviewForm action={action} perfil={perfil ?? null} error={error} />
    </div>
  );
}
