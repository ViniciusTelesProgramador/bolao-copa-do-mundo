# Bolão Copa 2026

## Setup Local
1. Clone o repositório
2. `npm install`
3. Copie `.env.local.example` para `.env.local` e preencha com suas chaves do Supabase
4. Rode o SQL em `architecture/supabase_schema.sql` no Supabase SQL Editor
5. `npm run dev`

## Variáveis de Ambiente (Vercel Dashboard)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_ADMIN_EMAIL

## Deploy
1. Push para GitHub
2. Conectar repositório na Vercel
3. Adicionar as 3 variáveis de ambiente
4. Deploy automático
