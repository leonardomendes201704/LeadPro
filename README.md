# LeadPro

Sistema de extração de empresas do Google Maps com Next.js, Supabase, Inngest e Playwright.

## Setup local

1. Copie `.env.example` para `.env.local` e preencha as chaves.
2. Aplique a migration SQL:
   - Opção A: adicione `SUPABASE_DB_PASSWORD` no `.env.local` e rode `npm run db:migrate`
   - Opção B: cole `supabase/migrations/001_initial.sql` no SQL Editor do Supabase
3. Rode `npm install`
4. Terminal 1: `npm run dev`
5. Terminal 2 (opcional): `npx inngest-cli@latest dev`

## Deploy Vercel

Produção: https://lead-pro-leonardo-mendes-projects1.vercel.app

(Alternativa: https://lead-pro-omega.vercel.app)

Configure as mesmas variáveis de ambiente do `.env.local` no projeto Vercel e sincronize o app Inngest com:

`https://lead-pro-leonardo-mendes-projects1.vercel.app/api/inngest`

### Pós-deploy (1x)

1. Abra `/setup` e informe a **senha do banco Supabase** (Settings → Database) para criar as tabelas
2. No Supabase → Authentication → URL Configuration:
   - Site URL: `https://lead-pro-leonardo-mendes-projects1.vercel.app`
   - Redirect URLs: `https://lead-pro-leonardo-mendes-projects1.vercel.app/**`
3. No Inngest → Apps → confirme sync com a URL `/api/inngest` acima

## Observações

- O scraper usa automação de browser e pode falhar se o Google bloquear o IP do datacenter.
- Jobs longos são divididos em steps pelo Inngest para respeitar o timeout da Vercel.
