import { tituloImovel } from "@/lib/imovel-titulo";
import type {
  ContatoOportunidadeRow,
  ContatoParceriaStatus,
  ImovelComCuradoria,
  ParceiroRow,
} from "@/lib/database.types";

export const CHAVE_SEM_CONTATO = "sem-contato";

export const PARCERIA_STATUS_LABELS: Record<ContatoParceriaStatus, string> = {
  pendente: "Ainda não perguntei",
  confirmada: "Trabalha em parceria",
  recusada: "Não trabalha em parceria",
};

export const PARCERIA_STATUS_COLORS: Record<ContatoParceriaStatus, string> = {
  pendente: "border-[#e4e0d9] bg-[#efe9e0] text-[#5b6472]",
  confirmada: "border-green-300 bg-green-50 text-green-800",
  recusada: "border-red-300 bg-red-50 text-red-800",
};

export type ParceiroResumo = Pick<
  ParceiroRow,
  | "id"
  | "nome"
  | "imobiliaria_nome"
  | "modelo_divisao"
  | "whatsapp"
  | "contato_telefone"
>;

/** Imóvel da busca com o parceiro vinculado na curadoria (se houver). */
export type ImovelDaBusca = ImovelComCuradoria & { parceiro_id: string | null };

export interface EtapaContato {
  key: string;
  label: string;
  feita: boolean;
}

/** Contagem de visitas dos imóveis do grupo (vem dos módulos próprios). */
export interface VisitasDoGrupo {
  total: number;
  previaAgendada: number;
  previaRealizada: number;
  clienteAgendada: number;
  clienteRealizada: number;
}

export interface GrupoContato {
  chave: string;
  nome: string;
  telefone: string | null;
  parceiro: ParceiroResumo | null;
  imoveis: ImovelDaBusca[];
}

function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function nomeParceiro(p: ParceiroResumo): string {
  return p.imobiliaria_nome ? `${p.nome} / ${p.imobiliaria_nome}` : p.nome;
}

/**
 * Agrupa os imóveis por contato: parceiro vinculado na curadoria → nome do
 * contato do anúncio → "sem contato". Grupos em ordem alfabética, "sem
 * contato" por último; dentro do grupo, mantém a ordem recebida.
 */
export function agruparPorContato(
  imoveis: ImovelDaBusca[],
  parceiros: Map<string, ParceiroResumo>
): GrupoContato[] {
  const grupos = new Map<string, GrupoContato>();

  for (const imovel of imoveis) {
    const parceiro = imovel.parceiro_id
      ? (parceiros.get(imovel.parceiro_id) ?? null)
      : null;
    const nomeAnuncio = imovel.nome_contato?.trim() || null;

    let chave: string;
    let nome: string;
    if (parceiro) {
      chave = `parceiro:${parceiro.id}`;
      nome = nomeParceiro(parceiro);
    } else if (nomeAnuncio) {
      chave = `nome:${normalizarNome(nomeAnuncio)}`;
      nome = nomeAnuncio;
    } else {
      chave = CHAVE_SEM_CONTATO;
      nome = "Sem contato identificado";
    }

    let grupo = grupos.get(chave);
    if (!grupo) {
      grupo = { chave, nome, telefone: null, parceiro, imoveis: [] };
      grupos.set(chave, grupo);
    }
    grupo.imoveis.push(imovel);
    grupo.telefone ??=
      imovel.telefone_contato?.trim() ||
      parceiro?.whatsapp?.trim() ||
      parceiro?.contato_telefone?.trim() ||
      null;
  }

  return [...grupos.values()].sort((a, b) => {
    if (a.chave === CHAVE_SEM_CONTATO) return 1;
    if (b.chave === CHAVE_SEM_CONTATO) return -1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

/** Só dígitos, com DDI 55 quando vier no formato nacional (10/11 dígitos). */
export function telefoneParaWhatsapp(telefone: string | null): string | null {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    return digitos;
  }
  return null;
}

/** Mensagem inicial sugerida para o contato (o consultor revisa antes de enviar). */
export function mensagemWhatsappContato(imoveis: ImovelDaBusca[]): string {
  const lista = imoveis
    .map((i) => `• ${tituloImovel(i)}\n${i.url}`)
    .join("\n");
  return [
    "Olá! Tenho um cliente interessado em imóveis de vocês e queria confirmar alguns pontos:",
    "",
    lista,
    "",
    "Vocês trabalham com parceria 50/50?",
    "Os imóveis seguem disponíveis?",
  ].join("\n");
}

export function linkWhatsapp(telefone: string | null, texto: string): string | null {
  const numero = telefoneParaWhatsapp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/** Etapas do roteiro de abordagem (as que o consultor marca à mão). */
export function etapasDoContato(
  contato: ContatoOportunidadeRow | null,
  visitas: VisitasDoGrupo
): EtapaContato[] {
  return [
    { key: "contato", label: "Contato feito", feita: Boolean(contato?.contatado_em) },
    {
      key: "parceria",
      label: "Parceria confirmada",
      feita: contato?.parceria_status === "confirmada",
    },
    {
      key: "situacao",
      label: "Situação dos imóveis confirmada",
      feita: Boolean(contato?.situacao_confirmada_em),
    },
    {
      key: "chave",
      label: "Chave / acesso combinado",
      feita: Boolean(contato?.chave_combinada_em),
    },
    {
      key: "previa",
      label: "Visita prévia",
      feita: visitas.total > 0 && visitas.previaRealizada >= visitas.total,
    },
    {
      key: "cliente",
      label: "Visita com o cliente",
      feita: visitas.clienteRealizada > 0,
    },
  ];
}
