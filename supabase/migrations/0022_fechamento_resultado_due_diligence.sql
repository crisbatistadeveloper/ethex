-- 0022 — Fechamento reconhece o resultado registrado na due diligence final
--
-- validar_fechamento() (0018) exigia due_diligence_final.status em
-- ('aprovada', 'aprovada_com_ressalvas'). Passa a aceitar também o resultado
-- já registrado na análise: recomendacao 'prosseguir' / 'prosseguir_com_ressalvas'
-- (status 'reprovada' continua bloqueando). Mesma regra da tela
-- (situacaoDueDiligenceFechamento em src/lib/due-diligence-final.ts).
--
-- Corpo idêntico à 0018 fora dessa condição. Não altera dados, estrutura nem RLS.
-- Aplicar só no ethex-dev.

create or replace function validar_fechamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op oportunidade%rowtype;
  v_neg negociacao_compra%rowtype;
  v_dd due_diligence_final%rowtype;
begin
  select * into v_op from oportunidade where id = new.oportunidade_id;
  if not found then
    raise exception 'Oportunidade não encontrada';
  end if;
  if v_op.status <> 'aberta' then
    raise exception 'Só oportunidades abertas podem ser fechadas';
  end if;
  if new.cliente_id <> v_op.cliente_id then
    raise exception 'Cliente não corresponde à oportunidade';
  end if;

  if new.negociacao_id is not null then
    select * into v_neg from negociacao_compra where id = new.negociacao_id;
    if not found or v_neg.oportunidade_id <> new.oportunidade_id then
      raise exception 'Negociação não pertence à oportunidade';
    end if;
  end if;

  if new.resultado = 'ganho' then
    if v_neg.status is distinct from 'aceita' then
      raise exception 'Ganho exige negociação de compra aceita';
    end if;
    if new.imovel_id <> v_neg.imovel_id or new.imovel_encontrado_id <> v_neg.imovel_encontrado_id then
      raise exception 'Imóvel não corresponde à negociação';
    end if;
    if not exists (
      select 1 from decisao_imovel d
      where d.oportunidade_id = new.oportunidade_id
        and d.imovel_encontrado_id = new.imovel_encontrado_id
        and d.decisao = 'escolhido'
    ) then
      raise exception 'Ganho exige o imóvel marcado como escolhido';
    end if;
    select * into v_dd from due_diligence_final where id = new.due_diligence_id;
    if not found or v_dd.negociacao_id <> new.negociacao_id then
      raise exception 'Due diligence não pertence à negociação';
    end if;
    -- coalesce: recomendacao nula não pode tornar a condição "desconhecida" (e liberar o ganho)
    if not coalesce(
      v_dd.status in ('aprovada', 'aprovada_com_ressalvas')
      or (
        v_dd.status <> 'reprovada'
        and v_dd.recomendacao in ('prosseguir', 'prosseguir_com_ressalvas')
      ),
      false
    ) then
      raise exception 'Ganho exige due diligence final aprovada ou aprovada com ressalvas';
    end if;
  end if;

  return new;
end;
$$;
