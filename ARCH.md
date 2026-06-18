# Arquitetura — Bolão Copa 2026

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Backend/Auth | Supabase (Postgres + Auth) |
| Data fetching (client) | @tanstack/react-query v5 |
| Icons | @phosphor-icons/react |

---

## Padrão de Data Fetching

### Server Components (SSR)
Usados apenas para metadados, layouts e páginas que **não precisam de atualização em tempo real**. Não fazem queries de dados diretamente — delegam ao `HomePageClient` via `useQuery`.

### React Query — regra padrão

**Toda chamada de dados em Client Components deve usar `useQuery` ou `useMutation`.**

```tsx
// ✅ correto
const { data, isLoading } = useQuery({
  queryKey: ['ranking'],
  queryFn: () => fetch('/api/ranking').then(r => r.json()),
  staleTime: 60_000,
});

// ❌ evitar — fetch direto em useEffect sem cache
useEffect(() => { fetch('/api/ranking').then(...) }, []);
```

### Query Keys — convenção

```
['home']              → /api/home  (dados da página inicial)
['ranking']           → /api/ranking
['matches']           → /api/matches
['predictions', uid]  → /api/predictions?userId=...
```

### staleTime recomendado por tipo de dado

| Dado | staleTime | Motivo |
|------|-----------|--------|
| Ranking geral | 60s | Muda a cada palpite pontuado |
| Jogos de hoje | 30s | Placar pode atualizar |
| Palpites do usuário | 5 min | Só muda se o usuário alterar |
| Dados estáticos (regras) | ∞ | Nunca muda |

### QueryClient global

Instância única no browser, criada em `src/lib/query-client.ts` e provida por `src/components/providers/QueryProvider.tsx` no `layout.tsx`. Não criar instâncias avulsas.

---

## API Routes

Todas sob `src/app/api/`. Autenticação via Supabase cookie (Server Client).

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/home` | GET | Dados completos da página inicial (matches, ranking, predictions do user, rodadas) |
| `/api/ranking` | GET | Classificação geral |
| `/api/sync-scores` | POST | Sync de placar via cron (autenticado por CRON_SECRET) |

### Padrão de response

```ts
// Sempre retornar NextResponse.json(payload)
// Erros: NextResponse.json({ error: 'mensagem' }, { status: 4xx })
```

---

## Estrutura de Diretórios

```
src/
  app/
    api/              ← API routes (consumidas pelo react-query)
    page.tsx          ← Shell mínimo — renderiza o Client Component
  components/
    providers/
      QueryProvider.tsx   ← QueryClientProvider global
    ui/
      HomePageClient.tsx  ← Página inicial como Client Component
      RankingTable.tsx
      ...
  lib/
    query-client.ts   ← makeQueryClient() com defaults
    supabase/         ← server.ts / client.ts / admin.ts
```

---

## Skeleton / Loading States

Todo componente que usa `useQuery` deve exibir um skeleton durante `isLoading`. Padrão: `animate-pulse` com divs simulando o layout real. Ver `HomePageClient.tsx` (`RankingSkeleton`, `MatchesSkeleton`) como referência.

## Invalidação de Cache

Após mutações (ex: salvar palpite, editar perfil), invalidar as queries afetadas:

```tsx
const qc = useQueryClient();
// após salvar palpite:
qc.invalidateQueries({ queryKey: ['home'] });
qc.invalidateQueries({ queryKey: ['ranking'] });
```
