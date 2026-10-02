# Projetos Supabase — Ethex

Referência local, não versionada. As variáveis reais ficam em `.env.local`
(aqui) e nas variáveis de ambiente configuradas direto no painel da Hostinger
(produção) — nunca neste arquivo.

## Produção (`main` → consultoria.ethex.com.br, via Hostinger)

- Projeto: `cris.4mind@gmail.com's Project`
- URL: `https://dpfiugqvozouoyfcsjbj.supabase.co`
- Migrações aplicadas: `0001` a `0024`

## Dev/staging (`dev` → só local)

- Projeto: `ethex-dev`
- URL: `https://eljinryrsmqcsjwrucyi.supabase.co`
- Migrações aplicadas: `0001` a `0024`

## Fluxo

1. Trabalho e migrações novas sempre primeiro no `ethex-dev`, testado aqui local.
2. Só depois de validado: aplico a mesma migração em produção **e** faço o
   merge `dev` → `main` juntos, para nunca ficarem descompassados.

## CRM (`0007_crm.sql`)

Camada comercial sobre Cliente existente.
Tabelas: `oportunidade`, `atividade`, `oportunidade_historico`,
`parceiro` (stub estendido em 0008), `imovel_documento` (stub).
Coluna: `imovel_encontrado.parceiro_id`.

## Parceiros (`0008_parceiros.sql` + `0009_parceiro_tipos.sql`)

- Estende `parceiro` (imobiliária, WhatsApp, cidade, política, última negociação)
- Tipos: corretor, imobiliária, proprietário, incorporadora
- Tabela `parceiro_historico` (timeline)

## Negociação na curadoria (`0010_negociacao_parceria.sql`)

- `negociacao_parceria` — negociação específica por `imovel_encontrado`
- `imovel_encontrado_historico` — timeline da curadoria

## Due diligence prévia (`0011_due_diligence.sql`)

- Estende `imovel_documento` (status, datas, storage_path)
- Colunas em `imovel_encontrado`: due_diligence_status, observações, checklist
- Bucket Storage `documentos-imoveis`

## Visita prévia ETHEX (`0012_visita_previa.sql`)

- `visita_previa` + `visita_previa_midia` (fotos/vídeos ordenados)
- Bucket `visitas-imoveis`
- Reutilizável por `imovel_id`; opcionalmente ligada a `imovel_encontrado`
- Não altera etapa da oportunidade
- Aplicada no **ethex-dev**

## Apresentação ao cliente (`0013_apresentacao.sql`)

- `imovel_encontrado.selecionado_apresentacao` (seleção por busca/cliente)
- `apresentacao` (cliente, busca, consultor, status, observações, `token`) + `apresentacao_item` (ordem, destaque, observação, status, `resposta_cliente`)
- RLS pelo dono do cliente (padrão 0005)
- Link público `/apresentacao/[token]` via funções `security definer`: `apresentacao_publica(token)` (leitura) e `apresentacao_responder(token, item, resposta)`; rascunho nunca é público, concluída não aceita resposta
- Conteúdo do imóvel não é duplicado (lido de `imovel`, `visita_previa`, `visita_previa_midia`)
- Não altera etapa da oportunidade
- Requer 0011 e 0012. Aplicada no **ethex-dev**

## Visita acompanhada com o cliente (`0014_visita_cliente.sql`)

- `visita_cliente` (cliente, oportunidade, imóvel, imovel_encontrado, consultor, apresentacao_item, atividade; status solicitada/agendada/realizada/cancelada/nao_compareceu; data + horário; resultado + feedback)
- Índice único parcial: 1 visita aberta (solicitada/agendada) por `imovel_encontrado`
- Históricos (`oportunidade_historico`, `imovel_encontrado_historico`) aceitam tipo `visita`
- `apresentacao_responder` atualizada: "Quero visitar" cria solicitação (sem agendar); mudar de ideia cancela solicitação ainda não agendada
- Não altera etapa da oportunidade (avanço para "Visita" é manual)
- Requer 0013. Aplicada no **ethex-dev**

## Escolha do imóvel e negociação de compra (`0015_negociacao_compra.sql`)

- `decisao_imovel` (oportunidade × imovel_encontrado: em_consideracao/escolhido/descartado, observação, consultor, data); índice único parcial: 1 `escolhido` por oportunidade
- `negociacao_compra` (oportunidade, cliente, imóvel, imovel_encontrado, parceiro, consultor; status iniciada/proposta_enviada/contraproposta/aceita/recusada/cancelada; `preco_anunciado` como snapshot, `valor_proposta`, `valor_contraproposta`, `valor_final` separados; próxima ação); índice único parcial: 1 negociação ativa por oportunidade
- `negociacao_compra_evento`: timeline imutável (RLS só select/insert)
- Não altera `imovel.preco` nem a etapa da oportunidade (avanço para "Negociação" é manual)
- Históricos aceitam `decisao`/`negociacao` (oportunidade) e `decisao`/`compra` (curadoria)
- Requer 0014. Aplicada no **ethex-dev**

## Due diligence jurídica final (`0016_due_diligence_final.sql`)

- Registro operacional da ETHEX (não é parecer jurídico)
- `due_diligence_final`: 1 por `negociacao_compra` aceita (unique `negociacao_id`); status em_andamento/pendente_documentos/em_analise/aprovada/aprovada_com_ressalvas/reprovada; análise (resumo, pontos de atenção, ressalvas, recomendação, observações)
- `due_diligence_final_item`: checklist/documentos da transação por categoria; vínculo opcional com `imovel_documento` (sem copiar arquivo) ou arquivo próprio no bucket privado
- `due_diligence_final_pendencia`: descrição, categoria, responsável, status, prazo, observação, conclusão
- `due_diligence_final_evento`: histórico imutável (só select/insert)
- RLS: dono do cliente ou admin; sem delete (itens/pendências encerrados por status); insert exige negociação `aceita`
- Storage **privado** `documentos-operacao` (`{cliente_id}/{dd_id}/{item_id}/…`), leitura só por URL assinada (10 min)
- Não altera valores da negociação nem etapa da oportunidade
- Requer 0015. Aplicada no **ethex-dev**

## Hardening: documentos do imóvel privados (`0017_storage_documentos_imoveis_private.sql`)

- Bucket `documentos-imoveis` passa a **privado**; removidas as policies `public_read_*` e as amplas `authenticated_*` da 0011
- Função `pode_acessar_documentos_do_imovel(imovel_id)`: admin, ou consultor com o imóvel na curadoria de um cliente seu
- `imovel_documento`: substitui `authenticated_all_imovel_documento` (0007) por select/insert/update pela mesma regra; delete só admin
- Storage `documentos-imoveis`: select/insert/update/delete pela mesma regra (1ª pasta do caminho = `imovel_id`); anônimo sem acesso
- Limpa URLs públicas gravadas em `imovel_documento.url` (mantém `storage_path`); a tela gera URL assinada (10 min)
- Não altera `midia-imoveis`, `visitas-imoveis` nem `documentos-operacao`
- Verificação: `supabase/tests/0017_verificacao_documentos_imoveis.sql` (simula papéis e desfaz tudo)
- Requer 0011. Aplicada e verificada no **ethex-dev** (script de verificação 14/14 ok)

## Fechamento da operação (`0018_fechamento.sql`)

- `fechamento`: 1 por oportunidade (ganho/perdido, data, valor efetivamente fechado, motivo de perda, observações, comissão ETHEX prevista/efetiva/tipo/percentual)
- Ganho exige (trigger no banco): imóvel escolhido + `negociacao_compra` aceita desse imóvel + `due_diligence_final` aprovada/aprovada com ressalvas + oportunidade aberta
- Perda exige motivo (lista fixa); negociação/imóvel vinculados só como contexto
- Trigger aplica o resultado na mesma transação: ganho → oportunidade `ganha` + etapa `fechamento` + cliente `fechado`; perdido → `perdida` (etapa preservada)
- Oportunidade só vira ganha/perdida com fechamento correspondente; com fechamento não reabre
- Registro final: resultado/data/valor/motivo imutáveis; só comissão e observações atualizáveis; sem delete
- Não altera negociação, due diligence nem preço do imóvel
- Verificação: `supabase/tests/0018_verificacao_fechamento.sql`
- Requer 0016. Aplicada no **ethex-dev**

## Situação do imóvel (`0019_imovel_status_construcao.sql`)

- Enum `imovel_status_construcao` (`pronto`, `em_construcao`, `na_planta`) + coluna `imovel.status_construcao` (nula = não informado nos imóveis antigos)
- Característica do catálogo compartilhado — não altera curadoria, oportunidade nem CRM
- `apresentacao_publica` recriada igual à 0013, só acrescentando `status_construcao` do imóvel
- Independente da 0018. Aplicada no **ethex-dev**

## Características do imóvel (`0020_imovel_caracteristicas.sql`)

- Colunas no `imovel` (catálogo compartilhado, não em `imovel_encontrado`): `quartos`, `suites`, `banheiros`, `vagas`, `area_total` (≥ 0 / > 0; suítes ≤ quartos)
- `quartos`, `vagas` e `m2` (→ `area_total`) migrados do JSON `caracteristicas` e removidos dele — sem duplicidade
- Diferenciais booleanos (null = não informado, true = tem, false = não tem): `varanda` (varanda/sacada), `piscina`, `churrasqueira`, `quintal`, `jardim`, `lavabo`, `escritorio`, `closet`, `elevador`, `ar_condicionado`, `mobiliado`, `condominio_fechado`
- `apresentacao_publica` recriada (igual à 0019 + características)
- Requer 0019. Aplicada no **ethex-dev**

## Correção de acentos (`0021_corrige_acentos_apresentacao_responder.sql`)

- `apresentacao_responder` recriada com o mesmo corpo da 0014, em UTF-8 (a versão aplicada no dev gravava "imÃ³vel")
- Corrige textos já gravados em `oportunidade_historico`, `imovel_encontrado_historico` e `visita_cliente.observacoes`
- Sem mudança de estrutura/RLS. **Aplicada no ethex-dev**

## Fechamento × resultado da due diligence (`0022_fechamento_resultado_due_diligence.sql`)

- `validar_fechamento()` recriada: ganho aceita DD com status aprovada/aprovada com ressalvas **ou** resultado (`recomendacao`) Prosseguir / Prosseguir com ressalvas; status Reprovada continua bloqueando
- Mesma regra da tela: `situacaoDueDiligenceFechamento` (`src/lib/due-diligence-final.ts`)
- Sem mudança de dados/estrutura/RLS. **Aplicada no ethex-dev**

## Exclusão de cliente/lead (`0023_cliente_lead_exclusao.sql`)

- `lead.cliente_id` não tinha `on delete` (ficava `no action`/restrict), então excluir um cliente já convertido de um lead falhava com violação de FK
- Troca a constraint para `on delete set null`: o lead sobrevive como histórico de captação, só perde o vínculo
- Testado em transação (insere cliente+lead vinculados, exclui o cliente, confirma `lead.cliente_id = null`, desfaz) antes de aplicar
- Sem mudança de dados existentes. **Aplicada em produção e no ethex-dev**

## Roteiro por contato na oportunidade (`0024_contato_oportunidade.sql`)

- `contato_oportunidade`: 1 por oportunidade × contato (unique `oportunidade_id, chave`). Chave de agrupamento: `parceiro:<id>` (parceiro vinculado na curadoria) → `nome:<nome do contato do anúncio, normalizado>` → `sem-contato`
- Guarda só o que não existe em outro módulo: contato feito, parceria 50/50 (pendente/confirmada/recusada + condições), situação dos imóveis confirmada, chave/acesso combinado (+ detalhe) e observações
- Visita prévia e visita com o cliente **não são duplicadas**: a tela lê `visita_previa` e `visita_cliente` dos imóveis do grupo
- RLS: dono da oportunidade ou admin (padrão 0007)
- **Aplicada em produção e no ethex-dev**
