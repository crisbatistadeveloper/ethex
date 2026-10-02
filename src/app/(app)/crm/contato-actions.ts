"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { boolField, strField } from "@/lib/form-utils";
import type {
  ContatoOportunidadeRow,
  ContatoParceriaStatus,
} from "@/lib/database.types";

const PARCERIA_STATUS: ContatoParceriaStatus[] = [
  "pendente",
  "confirmada",
  "recusada",
];

/** Marcado agora → grava a data (mantém a original se já estava marcado); desmarcado → limpa. */
function carimbo(marcado: boolean, atual: string | null | undefined): string | null {
  if (!marcado) return null;
  return atual ?? new Date().toISOString();
}

export async function salvarContatoOportunidade(
  oportunidadeId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const volta = `/crm/${oportunidadeId}`;
  const chave = strField(formData, "chave");
  const nome = strField(formData, "nome");
  if (!chave || !nome) {
    redirect(`${volta}?error=${encodeURIComponent("Contato inválido")}`);
  }

  const parceriaRaw = strField(formData, "parceria_status") ?? "pendente";
  const parceria = PARCERIA_STATUS.includes(parceriaRaw as ContatoParceriaStatus)
    ? (parceriaRaw as ContatoParceriaStatus)
    : "pendente";

  const { data: atual } = await supabase
    .from("contato_oportunidade")
    .select("contatado_em, situacao_confirmada_em, chave_combinada_em")
    .eq("oportunidade_id", oportunidadeId)
    .eq("chave", chave)
    .returns<
      Pick<
        ContatoOportunidadeRow,
        "contatado_em" | "situacao_confirmada_em" | "chave_combinada_em"
      >[]
    >()
    .maybeSingle();

  const { error } = await supabase.from("contato_oportunidade").upsert(
    {
      oportunidade_id: oportunidadeId,
      chave,
      nome,
      telefone: strField(formData, "telefone"),
      contatado_em: carimbo(boolField(formData, "contatado"), atual?.contatado_em),
      parceria_status: parceria,
      parceria_detalhe: strField(formData, "parceria_detalhe"),
      situacao_confirmada_em: carimbo(
        boolField(formData, "situacao_confirmada"),
        atual?.situacao_confirmada_em
      ),
      chave_combinada_em: carimbo(
        boolField(formData, "chave_combinada"),
        atual?.chave_combinada_em
      ),
      chave_detalhe: strField(formData, "chave_detalhe"),
      observacoes: strField(formData, "observacoes"),
    },
    { onConflict: "oportunidade_id,chave" }
  );

  if (error) {
    redirect(`${volta}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(volta);
}
