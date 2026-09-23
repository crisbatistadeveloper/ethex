export type Finalidade =
  | "moradia"
  | "investimento"
  | "temporada"
  | "sucessorio"
  | "comercial"
  | "institucional"
  | "outro";

export type ClienteStatus =
  | "em_entrevista"
  | "em_busca"
  | "em_curadoria"
  | "fechado";

export type BuscaStatus = "pendente" | "rodando" | "concluida" | "erro";

export type CuradoriaStatus = "pendente" | "aprovado" | "rejeitado";

export type PapelUsuario = "admin" | "consultor";

export type LeadStatus = "novo" | "atribuido" | "convertido" | "descartado";

export interface RegiaoAceita {
  uf: string;
  cidade: string;
  bairro?: string;
}

export interface UsuarioRow {
  id: string;
  nome: string;
  papel: PapelUsuario;
  ativo: boolean;
  criado_em: string;
}

export interface LeadRow {
  id: string;
  email: string | null;
  nome: string | null;
  telefone: string | null;
  finalidade: Finalidade | null;
  orcamento_min: number | null;
  orcamento_max: number | null;
  origem: string;
  status: LeadStatus;
  consultor_id: string | null;
  cliente_id: string | null;
  consentimento_lgpd: boolean;
  criado_em: string;
}

export interface ClienteRow {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem_lead: string | null;
  status: ClienteStatus;
  consultor_id: string;
  criado_em: string;
  atualizado_em: string;
}

export interface PerfilRow {
  id: string;
  cliente_id: string;
  finalidade: Finalidade;
  orcamento_min: number | null;
  orcamento_max: number | null;
  tem_entrada: boolean | null;
  credito_aprovado: boolean | null;
  regioes_aceitas: RegiaoAceita[];
  tipo_imovel: string | null;
  quartos_min: number | null;
  vagas_min: number | null;
  prazo_compra: string | null;
  motivacao: string | null;
  aspiracoes: string | null;
  restricoes: string | null;
  criterios_priorizados: CriterioKey[];
  detalhes_finalidade: DetalhesFinalidade;
  entrevista_em: string | null;
  atualizado_em: string;
}

export interface BuscaRow {
  id: string;
  perfil_id: string;
  disparada_em: string;
  status: BuscaStatus;
}

export interface Caracteristicas {
  m2?: number;
  quartos?: number;
  vagas?: number;
  titulo?: string;
  imagem_anuncio?: string;
  descricao?: string;
}

export interface ImovelRow {
  id: string;
  url: string;
  fonte: string;
  preco: number | null;
  caracteristicas: Caracteristicas;
  latitude: number | null;
  longitude: number | null;
  endereco_texto: string | null;
  midia_propria: string[];
  nome_contato: string | null;
  telefone_contato: string | null;
  tipo_contato: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ImovelEncontradoRow {
  id: string;
  busca_id: string;
  imovel_id: string;
  score: number | null;
  status_curadoria: CuradoriaStatus;
  comissao_combinada: boolean;
}

export interface ImovelComCuradoria extends ImovelRow {
  curadoria_id: string;
  curadoria_score: number | null;
  status_curadoria: CuradoriaStatus;
  comissao_combinada: boolean;
}

export type CriterioKey =
  | "orcamento"
  | "regiao"
  | "tamanho_m2"
  | "quartos"
  | "vagas";

export interface DetalhesMoradia {
  composicao_familiar?: string;
  tem_pets?: boolean;
  precisa_acessibilidade?: boolean;
  proximidade_desejada?: string;
}

export interface DetalhesInvestimento {
  objetivo?: "renda_aluguel" | "valorizacao" | "ambos";
  yield_minimo_esperado?: number;
  prazo_retorno_anos?: number;
  aceita_reforma?: boolean;
}

export interface DetalhesTemporada {
  epoca_uso?: "verao" | "inverno" | "ano_todo";
  aceita_airbnb_sublocacao?: boolean;
  frequencia_uso_estimada?: string;
}

export interface DetalhesSucessorio {
  num_herdeiros?: number;
  urgencia_partilha?: boolean;
  imovel_atual_sera_vendido?: boolean;
}

export interface DetalhesComercial {
  tipo_atividade?: string;
  fluxo_pessoas_esperado?: "baixo" | "medio" | "alto";
  precisa_estacionamento_clientes?: boolean;
}

export interface DetalhesInstitucional {
  tipo_instituicao?: string;
  capacidade_pessoas?: number;
  exigencias_normativas?: string;
}

export interface DetalhesOutro {
  descricao_livre?: string;
}

export type DetalhesFinalidade =
  | DetalhesMoradia
  | DetalhesInvestimento
  | DetalhesTemporada
  | DetalhesSucessorio
  | DetalhesComercial
  | DetalhesInstitucional
  | DetalhesOutro
  | Record<string, never>;
