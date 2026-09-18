# Ethex

Consultoria imobiliária que representa exclusivamente o comprador (buyer's agent). O comprador é o ativo central do sistema — imóveis só existem vinculados à busca de um perfil específico.

Fase 1 (atual): módulo de clientes e perfis — cadastro, entrevista estruturada, lista e detalhe. Sem automação de busca ainda (Fases 2-4).

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS v4
- Supabase (Postgres + Auth)

## Setup

1. Crie um projeto no [Supabase](https://supabase.com) (ou use um existente).
2. Rode a migração em `supabase/migrations/0001_init.sql` no SQL Editor do projeto (ou via `supabase db push` se estiver usando a CLI).
3. Crie o usuário admin em **Authentication → Users → Add user** no dashboard do Supabase (email + senha), já que não há tela de cadastro pública nesta fase.
4. Copie `.env.local.example` para `.env.local` e preencha com a URL e a chave anônima (`anon public`) do projeto, encontradas em **Project Settings → API**:

```bash
cp .env.local.example .env.local
```

5. Instale as dependências e rode o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

6. Acesse [http://localhost:3000](http://localhost:3000) — você será redirecionado para `/login`.

## Estrutura

```
supabase/migrations/0001_init.sql   # schema: cliente, perfil, busca, imovel_encontrado
src/proxy.ts                        # proteção de rotas (auth) — equivalente ao antigo middleware.ts
src/lib/supabase/                   # clients Supabase (browser/server) e lógica do proxy
src/lib/database.types.ts           # tipos das tabelas e enums
src/app/(app)/clientes/             # lista, criação, detalhe e entrevista de clientes
```

## Deploy

Alvo: Vercel (app) + Supabase (banco/auth). Configure as mesmas variáveis de ambiente do `.env.local` nas Environment Variables do projeto na Vercel.
