"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { boolField, numField, strField } from "@/lib/form-utils";
import { MAX_CRITERIOS_PRIORIZADOS } from "@/lib/scoring-criteria";
import type {
  CriterioKey,
  DetalhesFinalidade,
  Finalidade,
  RegiaoAceita,
} from "@/lib/database.types";

function parseRegioesAceitas(formData: FormData): RegiaoAceita[] {
  const raw = strField(formData, "regioes_aceitas_json");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RegiaoAceita =>
        item &&
        typeof item === "object" &&
        typeof item.uf === "string" &&
        typeof item.cidade === "string"
    );
  } catch {
    return [];
  }
}

const FINALIDADES: Finalidade[] = [
  "moradia",
  "investimento",
  "temporada",
  "sucessorio",
  "comercial",
  "institucional",
  "outro",
];

function buildDetalhesFinalidade(
  finalidade: Finalidade,
  formData: FormData
): DetalhesFinalidade {
  switch (finalidade) {
    case "moradia":
      return {
        composicao_familiar: strField(formData, "df_composicao_familiar") ?? undefined,
        tem_pets: boolField(formData, "df_tem_pets"),
        precisa_acessibilidade: boolField(formData, "df_precisa_acessibilidade"),
        proximidade_desejada: strField(formData, "df_proximidade_desejada") ?? undefined,
      };
    case "investimento": {
      const objetivo = strField(formData, "df_objetivo");
      return {
        objetivo:
          objetivo === "renda_aluguel" ||
          objetivo === "valorizacao" ||
          objetivo === "ambos"
            ? objetivo
            : undefined,
        yield_minimo_esperado: numField(formData, "df_yield_minimo_esperado") ?? undefined,
        prazo_retorno_anos: numField(formData, "df_prazo_retorno_anos") ?? undefined,
        aceita_reforma: boolField(formData, "df_aceita_reforma"),
      };
    }
    case "temporada": {
      const epoca = strField(formData, "df_epoca_uso");
      return {
        epoca_uso:
          epoca === "verao" || epoca === "inverno" || epoca === "ano_todo"
            ? epoca
            : undefined,
        aceita_airbnb_sublocacao: boolField(formData, "df_aceita_airbnb_sublocacao"),
        frequencia_uso_estimada: strField(formData, "df_frequencia_uso_estimada") ?? undefined,
      };
    }
    case "sucessorio":
      return {
        num_herdeiros: numField(formData, "df_num_herdeiros") ?? undefined,
        urgencia_partilha: boolField(formData, "df_urgencia_partilha"),
        imovel_atual_sera_vendido: boolField(formData, "df_imovel_atual_sera_vendido"),
      };
    case "comercial": {
      const fluxo = strField(formData, "df_fluxo_pessoas_esperado");
      return {
        tipo_atividade: strField(formData, "df_tipo_atividade") ?? undefined,
        fluxo_pessoas_esperado:
          fluxo === "baixo" || fluxo === "medio" || fluxo === "alto"
            ? fluxo
            : undefined,
        precisa_estacionamento_clientes: boolField(
          formData,
          "df_precisa_estacionamento_clientes"
        ),
      };
    }
    case "institucional":
      return {
        tipo_instituicao: strField(formData, "df_tipo_instituicao") ?? undefined,
        capacidade_pessoas: numField(formData, "df_capacidade_pessoas") ?? undefined,
        exigencias_normativas: strField(formData, "df_exigencias_normativas") ?? undefined,
      };
    case "outro":
      return {
        descricao_livre: strField(formData, "df_descricao_livre") ?? undefined,
      };
    default:
      return {};
  }
}

export async function savePerfil(clienteId: string, formData: FormData) {
  const finalidadeRaw = strField(formData, "finalidade");
  const finalidade = FINALIDADES.includes(finalidadeRaw as Finalidade)
    ? (finalidadeRaw as Finalidade)
    : null;

  if (!finalidade) {
    redirect(
      `/clientes/${clienteId}/entrevista?error=${encodeURIComponent("Selecione a finalidade")}`
    );
  }

  const criteriosBrutos = [
    strField(formData, "criterio_1"),
    strField(formData, "criterio_2"),
    strField(formData, "criterio_3"),
  ].filter((c): c is string => Boolean(c));
  const criteriosPriorizados = Array.from(
    new Set(criteriosBrutos)
  ).slice(0, MAX_CRITERIOS_PRIORIZADOS) as CriterioKey[];

  const perfilPayload = {
    cliente_id: clienteId,
    finalidade,
    orcamento_min: numField(formData, "orcamento_min"),
    orcamento_max: numField(formData, "orcamento_max"),
    tem_entrada: boolField(formData, "tem_entrada"),
    credito_aprovado: boolField(formData, "credito_aprovado"),
    regioes_aceitas: parseRegioesAceitas(formData),
    tipo_imovel: strField(formData, "tipo_imovel"),
    quartos_min: numField(formData, "quartos_min"),
    vagas_min: numField(formData, "vagas_min"),
    prazo_compra: strField(formData, "prazo_compra"),
    motivacao: strField(formData, "motivacao"),
    aspiracoes: strField(formData, "aspiracoes"),
    restricoes: strField(formData, "restricoes"),
    criterios_priorizados: criteriosPriorizados,
    detalhes_finalidade: buildDetalhesFinalidade(finalidade, formData),
    entrevista_em: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("perfil")
    .upsert(perfilPayload, { onConflict: "cliente_id" });

  if (error) {
    redirect(
      `/clientes/${clienteId}/entrevista?error=${encodeURIComponent(error.message)}`
    );
  }

  const { data: cliente } = await supabase
    .from("cliente")
    .select("status")
    .eq("id", clienteId)
    .single();

  if (cliente?.status === "em_entrevista") {
    await supabase
      .from("cliente")
      .update({ status: "em_busca" })
      .eq("id", clienteId);
  }

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  redirect(`/clientes/${clienteId}`);
}
