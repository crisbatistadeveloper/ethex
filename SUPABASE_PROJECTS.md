# Projetos Supabase — Ethex

Referência local, não versionada. As variáveis reais ficam em `.env.local`
(aqui) e nas variáveis de ambiente configuradas direto no painel da Hostinger
(produção) — nunca neste arquivo.

## Produção (`main` → consultoria.ethex.com.br, via Hostinger)

- Projeto: `cris.4mind@gmail.com's Project`
- URL: `https://dpfiugqvozouoyfcsjbj.supabase.co`
- Migrações aplicadas: `0001` a `0005`

## Dev/staging (`dev` → só local)

- Projeto: `ethex-dev`
- URL: `https://eljinryrsmqcsjwrucyi.supabase.co`
- Migrações aplicadas: `0001` a `0005` (schema idêntico ao de produção)

## Fluxo

1. Trabalho e migrações novas sempre primeiro no `ethex-dev`, testado aqui local.
2. Só depois de validado: aplico a mesma migração em produção **e** faço o
   merge `dev` → `main` juntos, para nunca ficarem descompassados.
