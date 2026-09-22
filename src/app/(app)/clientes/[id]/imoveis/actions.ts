"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchLinkMetadata } from "@/lib/link-metadata";
import { geocodeAddress, type GeocodeResult } from "@/lib/geocode";
import { numField, strField } from "@/lib/form-utils";
import { ensureBusca } from "@/lib/busca";
import type { Caracteristicas, CuradoriaStatus, ImovelRow } from "@/lib/database.types";

export interface LinkPreview {
  existente: boolean;
  titulo: string | null;
  imagem: string | null;
  descricao: string | null;
  preco: number | null;
  m2: number | null;
  quartos: number | null;
  vagas: number | null;
  nome_contato: string | null;
  telefone_contato: string | null;
  tipo_contato: string | null;
  midia_propria: string[];
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  const vazio: LinkPreview = {
    existente: false,
    titulo: null,
    imagem: null,
    descricao: null,
    preco: null,
    m2: null,
    quartos: null,
    vagas: null,
    nome_contato: null,
    telefone_contato: null,
    tipo_contato: null,
    midia_propria: [],
  };

  if (!url || !/^https?:\/\//i.test(url)) return vazio;

  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("imovel")
    .select("*")
    .eq("url", url)
    .returns<ImovelRow[]>()
    .maybeSingle();

  if (existente) {
    return {
      existente: true,
      titulo: existente.caracteristicas?.titulo ?? null,
      imagem: existente.caracteristicas?.imagem_anuncio ?? null,
      descricao: existente.caracteristicas?.descricao ?? null,
      preco: existente.preco,
      m2: existente.caracteristicas?.m2 ?? null,
      quartos: existente.caracteristicas?.quartos ?? null,
      vagas: existente.caracteristicas?.vagas ?? null,
      nome_contato: existente.nome_contato,
      telefone_contato: existente.telefone_contato,
      tipo_contato: existente.tipo_contato,
      midia_propria: existente.midia_propria ?? [],
    };
  }

  const meta = await fetchLinkMetadata(url);
  return {
    ...vazio,
    titulo: meta.titulo,
    imagem: meta.imagem,
    descricao: meta.descricao,
    preco: meta.preco,
  };
}

export async function geocodeAddressAction(
  query: string
): Promise<GeocodeResult[]> {
  return geocodeAddress(query);
}

async function imovelIdDaCuradoria(curadoriaId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("imovel_encontrado")
    .select("imovel_id")
    .eq("id", curadoriaId)
    .maybeSingle();
  return (data?.imovel_id as string | undefined) ?? null;
}

export async function createImovel(clienteId: string, formData: FormData) {
  const url = strField(formData, "url");
  if (!url) {
    redirect(
      `/clientes/${clienteId}/imoveis/novo?error=${encodeURIComponent("Informe o link do anúncio")}`
    );
  }

  const supabase = await createClient();
  const { data: perfil } = await supabase
    .from("perfil")
    .select("id")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (!perfil) {
    redirect(
      `/clientes/${clienteId}?error=${encodeURIComponent("Finalize a entrevista antes de adicionar imóveis")}`
    );
  }

  const buscaId = await ensureBusca(perfil.id);

  const { data: existente } = await supabase
    .from("imovel")
    .select("id")
    .eq("url", url)
    .maybeSingle();

  let imovelId: string;

  if (existente) {
    imovelId = existente.id as string;
  } else {
    let fonte = "outro";
    try {
      fonte = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      // url sem protocolo válido — mantém fallback "outro"
    }

    const caracteristicas: Caracteristicas = {
      m2: numField(formData, "m2") ?? undefined,
      quartos: numField(formData, "quartos") ?? undefined,
      vagas: numField(formData, "vagas") ?? undefined,
      titulo: strField(formData, "titulo") ?? undefined,
      imagem_anuncio: strField(formData, "imagem_anuncio") ?? undefined,
      descricao: strField(formData, "descricao") ?? undefined,
    };

    const { data: novo, error } = await supabase
      .from("imovel")
      .insert({
        url,
        fonte,
        preco: numField(formData, "preco"),
        caracteristicas,
        nome_contato: strField(formData, "nome_contato"),
        telefone_contato: strField(formData, "telefone_contato"),
        tipo_contato: strField(formData, "tipo_contato"),
      })
      .select("id")
      .single();

    if (error || !novo) {
      redirect(
        `/clientes/${clienteId}/imoveis/novo?error=${encodeURIComponent(error?.message ?? "Erro ao salvar imóvel")}`
      );
    }
    imovelId = novo.id as string;
  }

  const { data: curadoriaExistente } = await supabase
    .from("imovel_encontrado")
    .select("id")
    .eq("busca_id", buscaId)
    .eq("imovel_id", imovelId)
    .maybeSingle();

  let curadoriaId = curadoriaExistente?.id as string | undefined;

  if (!curadoriaId) {
    const { data: curadoria, error } = await supabase
      .from("imovel_encontrado")
      .insert({ busca_id: buscaId, imovel_id: imovelId })
      .select("id")
      .single();

    if (error || !curadoria) {
      redirect(
        `/clientes/${clienteId}/imoveis/novo?error=${encodeURIComponent(error?.message ?? "Erro ao associar imóvel")}`
      );
    }
    curadoriaId = curadoria.id as string;
  }

  revalidatePath(`/clientes/${clienteId}`);
  redirect(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}

export async function updateImovel(
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const imovelId = await imovelIdDaCuradoria(curadoriaId);
  if (!imovelId) return;

  const supabase = await createClient();

  const { data: atual } = await supabase
    .from("imovel")
    .select("caracteristicas")
    .eq("id", imovelId)
    .maybeSingle();

  const caracteristicasAtual = (atual?.caracteristicas ?? {}) as Caracteristicas;

  const caracteristicas: Caracteristicas = {
    ...caracteristicasAtual,
    m2: numField(formData, "m2") ?? undefined,
    quartos: numField(formData, "quartos") ?? undefined,
    vagas: numField(formData, "vagas") ?? undefined,
  };

  await supabase
    .from("imovel")
    .update({
      preco: numField(formData, "preco"),
      caracteristicas,
      latitude: numField(formData, "latitude"),
      longitude: numField(formData, "longitude"),
      endereco_texto: strField(formData, "endereco_texto"),
      nome_contato: strField(formData, "nome_contato"),
      telefone_contato: strField(formData, "telefone_contato"),
      tipo_contato: strField(formData, "tipo_contato"),
    })
    .eq("id", imovelId);

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}

const STATUS_VALUES: CuradoriaStatus[] = ["pendente", "aprovado", "rejeitado"];

export async function updateStatusCuradoria(
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const status = String(formData.get("status") ?? "");
  if (!STATUS_VALUES.includes(status as CuradoriaStatus)) return;

  const supabase = await createClient();
  await supabase
    .from("imovel_encontrado")
    .update({ status_curadoria: status as CuradoriaStatus })
    .eq("id", curadoriaId);

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}

export async function updateComissaoCombinada(
  curadoriaId: string,
  clienteId: string,
  formData: FormData
) {
  const comissaoCombinada = formData.get("comissao_combinada") === "on";

  const supabase = await createClient();
  await supabase
    .from("imovel_encontrado")
    .update({ comissao_combinada: comissaoCombinada })
    .eq("id", curadoriaId);

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}

export async function addMidiaPropria(
  curadoriaId: string,
  clienteId: string,
  url: string
) {
  const imovelId = await imovelIdDaCuradoria(curadoriaId);
  if (!imovelId) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("imovel")
    .select("midia_propria")
    .eq("id", imovelId)
    .maybeSingle();

  const atual = (data?.midia_propria as string[] | undefined) ?? [];
  await supabase
    .from("imovel")
    .update({ midia_propria: [...atual, url] })
    .eq("id", imovelId);

  revalidatePath(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}

export async function removeMidiaPropria(
  curadoriaId: string,
  clienteId: string,
  url: string
) {
  const imovelId = await imovelIdDaCuradoria(curadoriaId);
  if (!imovelId) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("imovel")
    .select("midia_propria")
    .eq("id", imovelId)
    .maybeSingle();

  const atual = (data?.midia_propria as string[] | undefined) ?? [];
  await supabase
    .from("imovel")
    .update({ midia_propria: atual.filter((item) => item !== url) })
    .eq("id", imovelId);

  revalidatePath(`/clientes/${clienteId}/imoveis/${curadoriaId}`);
}
