-- Diagnóstico (somente leitura): quais migrations estão aplicadas neste banco.
-- Rodar no SQL Editor do ethex-dev. Não altera nada.

select migracao, aplicada, verificacao
from (
  values
    ('0001', to_regclass('public.cliente') is not null, 'tabela cliente'),
    ('0002', exists (select 1 from storage.buckets where id = 'midia-imoveis'), 'bucket midia-imoveis'),
    ('0003', to_regclass('public.imovel') is not null, 'tabela imovel'),
    ('0004', to_regclass('public.lead') is not null, 'tabela lead'),
    ('0005', to_regclass('public.usuario') is not null, 'tabela usuario'),
    ('0006', exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'lead' and column_name = 'consentimento_lgpd'),
             'coluna lead.consentimento_lgpd'),
    ('0007', to_regclass('public.oportunidade') is not null, 'tabela oportunidade'),
    ('0008', to_regclass('public.parceiro_historico') is not null, 'tabela parceiro_historico'),
    ('0009', exists (select 1 from pg_constraint
                     where conname = 'parceiro_tipo_check'
                       and pg_get_constraintdef(oid) like '%incorporadora%'),
             'parceiro.tipo aceita incorporadora'),
    ('0010', to_regclass('public.negociacao_parceria') is not null, 'tabela negociacao_parceria'),
    ('0011', exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'imovel_encontrado'
                       and column_name = 'due_diligence_checklist'),
             'coluna imovel_encontrado.due_diligence_checklist'),
    ('0012', to_regclass('public.visita_previa') is not null, 'tabela visita_previa'),
    ('0013', to_regclass('public.apresentacao') is not null, 'tabela apresentacao'),
    ('0014', to_regclass('public.visita_cliente') is not null, 'tabela visita_cliente'),
    ('0015', to_regclass('public.negociacao_compra') is not null, 'tabela negociacao_compra'),
    ('0016', to_regclass('public.due_diligence_final') is not null, 'tabela due_diligence_final'),
    ('0017', exists (select 1 from storage.buckets where id = 'documentos-imoveis' and public = false)
             and exists (select 1 from pg_policies where policyname = 'imovel_documento_select'),
             'bucket documentos-imoveis privado + policies'),
    ('0018', to_regclass('public.fechamento') is not null, 'tabela fechamento'),
    ('0019', exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'imovel' and column_name = 'status_construcao'),
             'coluna imovel.status_construcao'),
    ('0020', exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'imovel' and column_name = 'ar_condicionado'),
             'coluna imovel.ar_condicionado'),
    ('0021', exists (select 1 from pg_proc where proname = 'apresentacao_responder'
                       and prosrc like '%solicitou visita ao imóvel%'),
             'apresentacao_responder com acentos corretos'),
    ('0022', exists (select 1 from pg_proc where proname = 'validar_fechamento'
                       and prosrc like '%prosseguir%' and prosrc like '%coalesce%'),
             'validar_fechamento aceita resultado Prosseguir')
) as t(migracao, aplicada, verificacao)
order by migracao;
