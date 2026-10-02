-- Ethex — telefone/WhatsApp informado à mão no roteiro do contato.
-- Muitos anúncios vêm sem telefone; sem isso o botão de WhatsApp não aparece.
-- Tem prioridade sobre o telefone do anúncio/parceiro.

alter table contato_oportunidade add column telefone text;
