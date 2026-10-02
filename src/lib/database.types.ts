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

export type DueDiligenceStatus =
  | "pendente"
  | "em_analise"
  | "aprovado"
  | "aprovado_com_ressalvas"
  | "reprovado";

export interface DueDiligenceChecklist {
  matricula_atualizada: boolean;
  iptu: boolean;
  documentacao_recebida: boolean;
  analise_inicial: boolean;
}

export type ImovelDocumentoTipo = "matricula" | "iptu" | "outro";

export type ImovelDocumentoStatus =
  | "pendente"
  | "solicitado"
  | "recebido"
  | "aprovado"
  | "rejeitado";

export type PapelUsuario = "admin" | "consultor";

export type LeadStatus = "novo" | "atribuido" | "convertido" | "descartado";

export type OportunidadeEtapa =
  | "novo_lead"
  | "entrevista"
  | "busca"
  | "curadoria"
  | "visita"
  | "negociacao"
  | "fechamento";

export type OportunidadeStatus = "aberta" | "ganha" | "perdida";

export type AtividadeTipo =
  | "ligacao"
  | "whatsapp"
  | "reuniao"
  | "entrevista"
  | "visita"
  | "tarefa"
  | "observacao";

export type AtividadeStatus = "pendente" | "concluida";

export type HistoricoTipo =
  | "criacao"
  | "etapa"
  | "status"
  | "nota"
  | "visita"
  | "decisao"
  | "negociacao"
  | "due_diligence"
  | "fechamento";

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

/** Dados do anúncio. Quartos/vagas/área são colunas do imóvel (0020). */
export interface Caracteristicas {
  titulo?: string;
  imagem_anuncio?: string;
  descricao?: string;
}

export type ImovelStatusConstrucao = "pronto" | "em_construcao" | "na_planta";

export interface ImovelRow {
  id: string;
  url: string;
  fonte: string;
  preco: number | null;
  caracteristicas: Caracteristicas;
  status_construcao: ImovelStatusConstrucao | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  area_total: number | null;
  /** Diferenciais: null = não informado, true = tem, false = não tem. */
  varanda: boolean | null;
  piscina: boolean | null;
  churrasqueira: boolean | null;
  quintal: boolean | null;
  jardim: boolean | null;
  lavabo: boolean | null;
  escritorio: boolean | null;
  closet: boolean | null;
  elevador: boolean | null;
  ar_condicionado: boolean | null;
  mobiliado: boolean | null;
  condominio_fechado: boolean | null;
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
  parceiro_id: string | null;
  due_diligence_status: DueDiligenceStatus;
  due_diligence_observacoes: string | null;
  due_diligence_checklist: DueDiligenceChecklist;
  selecionado_apresentacao: boolean;
}

export interface ImovelComCuradoria extends ImovelRow {
  curadoria_id: string;
  curadoria_score: number | null;
  status_curadoria: CuradoriaStatus;
  comissao_combinada: boolean;
  selecionado_apresentacao?: boolean;
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

export interface OportunidadeRow {
  id: string;
  cliente_id: string;
  consultor_id: string;
  lead_id: string | null;
  titulo: string;
  etapa: OportunidadeEtapa;
  status: OportunidadeStatus;
  valor_estimado: number | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface AtividadeRow {
  id: string;
  oportunidade_id: string;
  cliente_id: string;
  responsavel_id: string;
  tipo: AtividadeTipo;
  titulo: string;
  descricao: string | null;
  data_hora: string;
  status: AtividadeStatus;
  criado_em: string;
  atualizado_em: string;
}

export interface OportunidadeHistoricoRow {
  id: string;
  oportunidade_id: string;
  autor_id: string | null;
  tipo: HistoricoTipo;
  etapa_anterior: OportunidadeEtapa | null;
  etapa_nova: OportunidadeEtapa | null;
  status_anterior: OportunidadeStatus | null;
  status_novo: OportunidadeStatus | null;
  detalhe: string | null;
  criado_em: string;
}

export interface ParceiroRow {
  id: string;
  tipo: "corretor" | "imobiliaria" | "proprietario" | "incorporadora";
  nome: string;
  imobiliaria_nome: string | null;
  creci: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  whatsapp: string | null;
  contato_email: string | null;
  cidade_regiao: string | null;
  politica_comissao: string | null;
  modelo_divisao: string | null;
  condicoes_parceria: string | null;
  observacoes: string | null;
  ultima_negociacao_em: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export type ParceiroHistoricoTipo =
  | "negociacao_comissao"
  | "documentacao"
  | "atendimento"
  | "velocidade_resposta"
  | "observacao"
  | "outro";

export interface ParceiroHistoricoRow {
  id: string;
  parceiro_id: string;
  autor_id: string | null;
  tipo: ParceiroHistoricoTipo;
  titulo: string;
  detalhe: string | null;
  criado_em: string;
}

export type NegociacaoParceriaStatus =
  | "pendente"
  | "em_negociacao"
  | "aprovado"
  | "recusado";

export interface NegociacaoParceriaRow {
  id: string;
  imovel_encontrado_id: string;
  parceiro_id: string;
  comissao_solicitada: string | null;
  comissao_negociada: string | null;
  modelo_divisao: string | null;
  status: NegociacaoParceriaStatus;
  observacoes: string | null;
  negociado_em: string | null;
  responsavel_id: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type ImovelEncontradoHistoricoTipo =
  | "parceiro"
  | "negociacao"
  | "status_negociacao"
  | "curadoria"
  | "observacao"
  | "visita"
  | "decisao"
  | "compra"
  | "due_diligence"
  | "fechamento";

export interface ImovelEncontradoHistoricoRow {
  id: string;
  imovel_encontrado_id: string;
  autor_id: string | null;
  tipo: ImovelEncontradoHistoricoTipo;
  detalhe: string;
  criado_em: string;
}

export interface ImovelDocumentoRow {
  id: string;
  imovel_id: string;
  tipo: ImovelDocumentoTipo;
  titulo: string;
  url: string | null;
  storage_path: string | null;
  status: ImovelDocumentoStatus;
  data_documento: string | null;
  data_recebimento: string | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type VisitaPreviaStatus = "agendada" | "realizada" | "cancelada";

export type VisitaPreviaRecomendacao =
  | "recomendar"
  | "recomendar_com_ressalvas"
  | "nao_recomendar";

export type VisitaMidiaTipo = "foto" | "video";

export interface VisitaPreviaRow {
  id: string;
  imovel_id: string;
  imovel_encontrado_id: string | null;
  consultor_id: string;
  data_visita: string | null;
  status: VisitaPreviaStatus;
  observacoes_gerais: string | null;
  avaliacao_geral: string | null;
  pontos_positivos: string | null;
  pontos_negativos: string | null;
  observacoes_relatorio: string | null;
  recomendacao: VisitaPreviaRecomendacao | null;
  obs_conservacao: string | null;
  obs_iluminacao: string | null;
  obs_ventilacao: string | null;
  obs_ruido: string | null;
  obs_vizinhanca: string | null;
  obs_condominio: string | null;
  obs_acesso: string | null;
  obs_localizacao: string | null;
  obs_nao_constam_anuncio: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface VisitaPreviaMidiaRow {
  id: string;
  visita_id: string;
  tipo: VisitaMidiaTipo;
  storage_path: string;
  url: string;
  descricao: string | null;
  ordem: number;
  criado_em: string;
}

export type ApresentacaoStatus =
  | "rascunho"
  | "enviada"
  | "em_avaliacao"
  | "concluida";

export type ApresentacaoItemStatus =
  | "apresentado"
  | "interessado"
  | "nao_interessado"
  | "selecionado_visita";

export interface ApresentacaoRow {
  id: string;
  cliente_id: string;
  busca_id: string;
  consultor_id: string;
  status: ApresentacaoStatus;
  observacoes: string | null;
  token: string;
  enviada_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type VisitaClienteStatus =
  | "solicitada"
  | "agendada"
  | "realizada"
  | "cancelada"
  | "nao_compareceu";

export type VisitaClienteResultado =
  | "gostou"
  | "gostou_com_ressalvas"
  | "nao_gostou"
  | "quer_negociar"
  | "quer_pensar"
  | "descartado";

export type VisitaClienteOrigem = "apresentacao" | "consultor";

export interface VisitaClienteRow {
  id: string;
  cliente_id: string;
  oportunidade_id: string | null;
  imovel_id: string;
  imovel_encontrado_id: string;
  consultor_id: string;
  apresentacao_item_id: string | null;
  atividade_id: string | null;
  origem: VisitaClienteOrigem;
  status: VisitaClienteStatus;
  solicitada_em: string;
  data_visita: string | null;
  horario: string | null;
  observacoes: string | null;
  resultado: VisitaClienteResultado | null;
  pontos_positivos: string | null;
  pontos_negativos: string | null;
  observacoes_resultado: string | null;
  proximos_passos: string | null;
  realizada_em: string | null;
  cancelada_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type DecisaoImovelStatus = "em_consideracao" | "escolhido" | "descartado";

export interface DecisaoImovelRow {
  id: string;
  oportunidade_id: string;
  imovel_encontrado_id: string;
  decisao: DecisaoImovelStatus;
  observacao: string | null;
  consultor_id: string;
  decidido_em: string;
  criado_em: string;
  atualizado_em: string;
}

export type NegociacaoCompraStatus =
  | "iniciada"
  | "proposta_enviada"
  | "contraproposta"
  | "aceita"
  | "recusada"
  | "cancelada";

export type NegociacaoCompraEventoTipo =
  | "iniciada"
  | "proposta_enviada"
  | "contraproposta_recebida"
  | "aceita"
  | "recusada"
  | "cancelada"
  | "observacao";

export interface NegociacaoCompraRow {
  id: string;
  oportunidade_id: string;
  cliente_id: string;
  imovel_id: string;
  imovel_encontrado_id: string;
  parceiro_id: string | null;
  consultor_id: string;
  status: NegociacaoCompraStatus;
  preco_anunciado: number | null;
  valor_proposta: number | null;
  valor_contraproposta: number | null;
  valor_final: number | null;
  observacoes: string | null;
  proxima_acao: string | null;
  proxima_acao_em: string | null;
  iniciada_em: string;
  encerrada_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface NegociacaoCompraEventoRow {
  id: string;
  negociacao_id: string;
  autor_id: string | null;
  tipo: NegociacaoCompraEventoTipo;
  valor: number | null;
  observacao: string | null;
  criado_em: string;
}

export type DueDiligenceFinalStatus =
  | "em_andamento"
  | "pendente_documentos"
  | "em_analise"
  | "aprovada"
  | "aprovada_com_ressalvas"
  | "reprovada";

export type DueDiligenceFinalRecomendacao =
  | "prosseguir"
  | "prosseguir_com_ressalvas"
  | "nao_prosseguir";

export type DueDiligenceFinalCategoria =
  | "imovel"
  | "proprietario"
  | "certidoes"
  | "condominio"
  | "outros";

export type DueDiligenceFinalItemStatus =
  | "pendente"
  | "solicitado"
  | "recebido"
  | "aprovado"
  | "rejeitado"
  | "nao_aplicavel";

export type DueDiligenceFinalPendenciaStatus =
  | "aberta"
  | "em_andamento"
  | "resolvida"
  | "dispensada";

export type DueDiligenceFinalEventoTipo =
  | "iniciada"
  | "status"
  | "item"
  | "documento"
  | "pendencia"
  | "analise"
  | "observacao";

export interface DueDiligenceFinalRow {
  id: string;
  negociacao_id: string;
  oportunidade_id: string;
  cliente_id: string;
  imovel_id: string;
  imovel_encontrado_id: string;
  consultor_id: string;
  status: DueDiligenceFinalStatus;
  parecer_resumo: string | null;
  pontos_atencao: string | null;
  ressalvas: string | null;
  recomendacao: DueDiligenceFinalRecomendacao | null;
  observacoes: string | null;
  analise_registrada_em: string | null;
  iniciada_em: string;
  concluida_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface DueDiligenceFinalItemRow {
  id: string;
  due_diligence_id: string;
  categoria: DueDiligenceFinalCategoria;
  titulo: string;
  status: DueDiligenceFinalItemStatus;
  imovel_documento_id: string | null;
  storage_path: string | null;
  nome_arquivo: string | null;
  observacao: string | null;
  recebido_em: string | null;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

export interface DueDiligenceFinalPendenciaRow {
  id: string;
  due_diligence_id: string;
  descricao: string;
  categoria: DueDiligenceFinalCategoria;
  responsavel: string | null;
  status: DueDiligenceFinalPendenciaStatus;
  prazo: string | null;
  observacao: string | null;
  concluida_em: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface DueDiligenceFinalEventoRow {
  id: string;
  due_diligence_id: string;
  autor_id: string | null;
  tipo: DueDiligenceFinalEventoTipo;
  detalhe: string;
  criado_em: string;
}

export type FechamentoResultado = "ganho" | "perdido";

export type FechamentoMotivoPerda =
  | "cliente_desistiu"
  | "imovel_reprovado"
  | "negociacao_nao_avancou"
  | "preco"
  | "documentacao"
  | "parceiro"
  | "escolheu_outro_imovel"
  | "outro";

export type ComissaoTipo = "percentual" | "valor";

export interface FechamentoRow {
  id: string;
  oportunidade_id: string;
  cliente_id: string;
  consultor_id: string;
  resultado: FechamentoResultado;
  data_fechamento: string;
  negociacao_id: string | null;
  imovel_id: string | null;
  imovel_encontrado_id: string | null;
  due_diligence_id: string | null;
  valor_fechado: number | null;
  motivo_perda: FechamentoMotivoPerda | null;
  observacoes: string | null;
  comissao_tipo: ComissaoTipo | null;
  comissao_percentual: number | null;
  comissao_prevista: number | null;
  comissao_efetiva: number | null;
  comissao_observacao: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ApresentacaoItemRow {
  id: string;
  apresentacao_id: string;
  imovel_encontrado_id: string;
  ordem: number;
  observacao_consultor: string | null;
  destaque: boolean;
  status: ApresentacaoItemStatus;
  resposta_cliente: ApresentacaoItemStatus | null;
  resposta_cliente_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type ContatoParceriaStatus = "pendente" | "confirmada" | "recusada";

export interface ContatoOportunidadeRow {
  id: string;
  oportunidade_id: string;
  chave: string;
  nome: string;
  telefone: string | null;
  contatado_em: string | null;
  parceria_status: ContatoParceriaStatus;
  parceria_detalhe: string | null;
  situacao_confirmada_em: string | null;
  chave_combinada_em: string | null;
  chave_detalhe: string | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}
