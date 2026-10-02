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

/** Termos genéricos que não distinguem um contato de outro ("Loccus" = "Loccus Imóveis Ltda"). */
const TERMOS_GENERICOS = new Set([
  "imovel", "imoveis", "imobiliaria", "imobiliarias", "corretor", "corretora",
  "corretores", "negocios", "ltda", "me", "eireli", "epp", "sa", "cia",
  "e", "de", "da", "do", "dos", "das", "com", "br", "www",
]);

function semAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Nome comparável: sem acento/caixa/pontuação e sem termos genéricos. */
export function normalizarNome(nome: string): string {
  const palavras = semAcentos(nome)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
  const distintivas = palavras.filter((p) => !TERMOS_GENERICOS.has(p));
  return (distintivas.length > 0 ? distintivas : palavras).join(" ");
}

/** Chave de comparação de telefone: só dígitos, sem DDI 55; null se curto demais. */
function chaveTelefone(telefone: string | null | undefined): string | null {
  if (!telefone) return null;
  let digitos = telefone.replace(/\D/g, "");
  if (digitos.length > 11 && digitos.startsWith("55")) digitos = digitos.slice(2);
  return digitos.length >= 8 ? digitos : null;
}

function nomeParceiro(p: ParceiroResumo): string {
  return p.imobiliaria_nome ? `${p.nome} / ${p.imobiliaria_nome}` : p.nome;
}

interface GrupoBruto {
  chave: string;
  nome: string;
  parceiro: ParceiroResumo | null;
  imoveis: ImovelDaBusca[];
  telefones: string[];
}

/**
 * Agrupa os imóveis por contato. Chave inicial: parceiro vinculado na curadoria
 * → nome do contato do anúncio (normalizado) → telefone → "sem contato".
 * Depois une grupos que compartilham o mesmo telefone (mesma imobiliária com o
 * nome escrito de formas diferentes). A chave final é estável: a do parceiro,
 * ou a menor em ordem alfabética. Grupos em ordem alfabética, "sem contato"
 * por último; dentro do grupo, mantém a ordem recebida.
 */
export function agruparPorContato(
  imoveis: ImovelDaBusca[],
  parceiros: Map<string, ParceiroResumo>
): GrupoContato[] {
  const brutos = new Map<string, GrupoBruto>();

  // Nome do anúncio igual ao da imobiliária (ou do parceiro) já vinculado nesta busca.
  const parceiroPorNome = new Map<string, ParceiroResumo>();
  for (const p of parceiros.values()) {
    for (const n of [p.imobiliaria_nome, p.nome]) {
      const k = n ? normalizarNome(n) : "";
      if (k && !parceiroPorNome.has(k)) parceiroPorNome.set(k, p);
    }
  }

  for (const imovel of imoveis) {
    const nomeAnuncio = imovel.nome_contato?.trim() || null;
    const parceiro =
      (imovel.parceiro_id ? parceiros.get(imovel.parceiro_id) : null) ??
      (nomeAnuncio ? parceiroPorNome.get(normalizarNome(nomeAnuncio)) : null) ??
      null;
    const telAnuncio = imovel.telefone_contato?.trim() || null;

    let chave: string;
    let nome: string;
    if (parceiro) {
      chave = `parceiro:${parceiro.id}`;
      nome = nomeParceiro(parceiro);
    } else if (nomeAnuncio) {
      chave = `nome:${normalizarNome(nomeAnuncio)}`;
      nome = nomeAnuncio;
    } else if (chaveTelefone(telAnuncio)) {
      chave = `tel:${chaveTelefone(telAnuncio)}`;
      nome = `Contato ${telAnuncio}`;
    } else {
      chave = CHAVE_SEM_CONTATO;
      nome = "Sem contato identificado";
    }

    let grupo = brutos.get(chave);
    if (!grupo) {
      grupo = { chave, nome, parceiro, imoveis: [], telefones: [] };
      brutos.set(chave, grupo);
    }
    grupo.imoveis.push(imovel);
    for (const t of [
      telAnuncio,
      parceiro?.whatsapp?.trim(),
      parceiro?.contato_telefone?.trim(),
    ]) {
      if (t && !grupo.telefones.includes(t)) grupo.telefones.push(t);
    }
  }

  // União de grupos que compartilham telefone (nunca junta dois parceiros).
  const lista = [...brutos.values()];
  const pai = lista.map((_, i) => i);
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const donoDoTelefone = new Map<string, number>();
  lista.forEach((g, i) => {
    if (g.chave === CHAVE_SEM_CONTATO) return;
    for (const t of g.telefones) {
      const k = chaveTelefone(t);
      if (!k) continue;
      const outro = donoDoTelefone.get(k);
      if (outro === undefined) {
        donoDoTelefone.set(k, i);
        continue;
      }
      const a = raiz(i);
      const b = raiz(outro);
      if (a === b) continue;
      const doisParceiros = lista[a].parceiro && lista[b].parceiro;
      if (!doisParceiros) pai[b] = a;
    }
  });

  const finais = new Map<number, GrupoBruto[]>();
  lista.forEach((g, i) => {
    const r = raiz(i);
    finais.set(r, [...(finais.get(r) ?? []), g]);
  });

  const grupos: GrupoContato[] = [];
  for (const partes of finais.values()) {
    const comParceiro = partes.find((g) => g.parceiro);
    const ordenadas = [...partes].sort((a, b) => a.chave.localeCompare(b.chave));
    const principal = comParceiro ?? ordenadas[0];
    const imoveisDoGrupo = lista
      .flatMap((g) => (partes.includes(g) ? g.imoveis : []))
      .sort((a, b) => imoveis.indexOf(a) - imoveis.indexOf(b));
    const telefones = partes.flatMap((g) => g.telefones);
    grupos.push({
      chave: principal.chave,
      nome: principal.nome,
      telefone: telefones[0] ?? null,
      parceiro: comParceiro?.parceiro ?? null,
      imoveis: imoveisDoGrupo,
    });
  }

  return grupos.sort((a, b) => {
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
