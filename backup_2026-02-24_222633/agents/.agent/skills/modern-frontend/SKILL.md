---
description: Skill para desenvolvimento modern de frontend usando React 19, Next.js 15, Tailwind CSS, e melhores práticas de 2024/2025.
---

# Modern Frontend Skill

> **Version**: 2.0.0
> **Author**: Antigravity Skills - Frontend Team
> **Tags**: frontend, react, nextjs, typescript, tailwind, modern-web, ui-ux, components, responsive, animations, shadcn, astro, remix
> **Dependencies**: node >= 20.0.0, npm >= 10.0.0 || pnpm >= 8.0.0

## Goal
Criar aplicações frontend de última geração usando as tecnologias mais modernas e melhores práticas de 2024/2025, incluindo React 19, Next.js 15, TypeScript, Tailwind CSS, Shadcn/UI, Server Components, e arquiteturas orientadas a performance, acessibilidade e experiência do usuário excepcional.

## Core Technologies Stack (2024/2025)

### 🎯 Frameworks Principais
- **Next.js 15** (App Router, Server Components, Server Actions)
- **React 19** (Server Components, Actions, useOptimistic)
- **Astro 4** (Content-focused sites, Islands Architecture)
- **Remix 2** (Nested routing, Progressive Enhancement)
- **SvelteKit** (Reactive framework alternativo)

### 🎨 Styling & Design
- **Tailwind CSS 4** (Engine Oxide, Nova sintaxe)
- **Shadcn/UI** (Componentes acessíveis e customizáveis)
- **CVA** (Class Variance Authority para componentes)
- **Tailwind Variants** (Composição de estilos)
- **Panda CSS** (Zero-runtime CSS-in-JS)

### ⚡ State Management
- **Zustand** (Minimalista e performático)
- **Jotai** (Atomic state management)
- **TanStack Query v5** (Server state management)
- **Nanostores** (Framework agnostic)

### 🎭 Animations & Interactions
- **Framer Motion 11** (Animações declarativas)
- **Motion One** (Web Animations API wrapper)
- **Auto Animate** (Animações automáticas)
- **GSAP** (Animações complexas)

### 📦 Build Tools
- **Turbopack** (Next.js bundler)
- **Vite 5** (Build tool ultra-rápido)
- **Bun** (Runtime e bundler all-in-one)
- **Biome** (Linter + Formatter)

### 🔧 Dev Tools
- **TypeScript 5.4+** (Tipagem estática)
- **ESLint 9** (Flat config)
- **Prettier** (Formatação)
- **Husky + Lint-Staged** (Pre-commit hooks)

### 🧪 Testing
- **Vitest** (Unit testing)
- **Playwright** (E2E testing)
- **Testing Library** (Component testing)

### 🚀 Performance & SEO
- **Next.js Image** (Otimização automática)
- **Million.js** (Virtual DOM otimizado)
- **Partytown** (Web workers para scripts)
- **Next.js Metadata API** (SEO built-in)

## Instructions

### Quando Ativar Esta Skill
Esta skill deve ser ativada quando o usuário mencionar:
- Criar aplicação/site/webapp moderna
- Desenvolver componentes React/Next.js/Vue
- Construir landing page/dashboard/SPA/PWA
- Implementar UI/UX com design moderno
- Usar Tailwind CSS, Shadcn, Framer Motion
- Trabalhar com TypeScript frontend
- Integrar APIs REST/GraphQL
- Implementar autenticação (Auth.js, Clerk)
- Criar design system ou biblioteca de componentes
- Otimizar performance frontend
- Implementar animações modernas
- Desenvolver aplicação server-rendered

### Workflow Padrão

#### 1. Análise de Requisitos
- Identificar tipo de projeto (SPA, MPA, SSR, SSG, ISR)
- Determinar framework ideal (Next.js, Astro, Remix)
- Definir requisitos de performance
- Verificar necessidade de SEO
- Identificar integrações necessárias

#### 2. Setup do Projeto
```bash
# Executar script de scaffolding apropriado
node scripts/create-project.mjs --framework nextjs --template app-router
```

#### 3. Arquitetura de Código
```
src/
├── app/                    # Next.js App Router
│   ├── (routes)/          # Route groups
│   ├── api/               # API Routes
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # Shadcn components
│   ├── features/          # Feature components
│   └── layouts/           # Layout components
├── lib/
│   ├── utils.ts           # Utility functions
│   ├── api/               # API clients
│   └── stores/            # State management
├── hooks/                 # Custom React hooks
├── styles/               # Global styles
└── types/                # TypeScript types
```

#### 4. Implementação
- Usar TypeScript para todo código
- Aplicar Tailwind CSS para styling
- Implementar componentes Shadcn/UI quando possível
- Seguir padrões de composição React
- Otimizar bundle size e performance
- Garantir acessibilidade (ARIA, semântica)
- Implementar lazy loading e code splitting

#### 5. Quality Assurance
- Validar tipos TypeScript
- Executar linter (Biome/ESLint)
- Verificar responsividade
- Testar performance (Lighthouse)
- Validar acessibilidade (axe)

## Padrões de Implementação Modernos

### Server Components (React 19 + Next.js 15)
```typescript
// app/page.tsx - Server Component by default
export default async function HomePage() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 } // ISR
  })
  
  return <ClientComponent data={data} />
}
```

### Client Components com Hooks Modernos
```typescript
'use client'

import { useOptimistic, useActionState } from 'react'

export function OptimisticForm() {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage) => [...state, newMessage]
  )
  
  return <Form onSubmit={addOptimisticMessage} />
}
```

### Server Actions
```typescript
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title')
  await db.post.create({ data: { title } })
  revalidatePath('/posts')
}
```

### Shadcn/UI + CVA
```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
```

### Zustand Store (Moderno)
```typescript
import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

interface Store {
  count: number
  increment: () => void
}

export const useStore = create<Store>()(
  devtools(
    persist(
      (set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
      }),
      { name: 'app-storage' }
    )
  )
)
```

### Framer Motion Animações
```typescript
'use client'

import { motion } from 'framer-motion'

export function AnimatedCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Card />
    </motion.div>
  )
}
```

### TanStack Query v5
```typescript
import { useQuery, useMutation } from '@tanstack/react-query'

function UserProfile() {
  const { data, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => queryClient.invalidateQueries(['user']),
  })
}
```

## Constraints

### Performance Requirements
- **First Contentful Paint**: < 1.8s
- **Time to Interactive**: < 3.8s
- **Lighthouse Score**: > 90 em todas categorias
- **Bundle Size**: < 200KB gzipped inicial
- **Code Splitting**: Obrigatório para rotas
- **Image Optimization**: Usar Next.js Image ou similar
- **Lazy Loading**: Para componentes pesados

### Acessibilidade (WCAG 2.1 AA)
- Todos os elementos interativos acessíveis via teclado
- Labels e ARIA attributes apropriados
- Contraste de cores adequado (mínimo 4.5:1)
- Focus indicators visíveis
- Semântica HTML correta
- Suporte a screen readers

### TypeScript
- **Modo Strict**: Sempre ativado
- **Tipagem Explícita**: Para props e retornos
- **No Any**: Evitar uso de any
- **Type-safe APIs**: Usar Zod/TypeBox para validação

### Styling
- **Mobile-First**: Design responsivo sempre
- **Tailwind Utilities**: Preferir sobre CSS customizado
- **Dark Mode**: Implementar quando relevante
- **Consistent Spacing**: Usar sistema de design

### Security
- **Sanitização**: Input do usuário sempre sanitizado
- **CSP**: Content Security Policy configurado
- **Environment Variables**: Nunca expor secrets no client
- **HTTPS**: Apenas em produção

### Code Quality
- **ESLint**: Zero errors, zero warnings
- **Prettier**: Código formatado
- **TypeScript**: Zero type errors
- **Tests**: Cobertura > 80% para lógica crítica

## Technology Decision Matrix

### Escolha de Framework
- **Next.js 15** → Use quando: Precisa de SSR/SSG/ISR, SEO é crítico, App com rotas dinâmicas, Integreção com backend, Full-stack.
- **Astro 4** → Use quando: Content-heavy sites, Performance extrema, Múltiplos frameworks, Static site generation.
- **Remix 2** → Use quando: Forms complexos, Progressive enhancement, Nested routing.
- **React SPA (Vite)** → Use quando: App simples sem SEO, Dashboard interno, Admin panel, Prototipagem rápida.

### Escolha de State Management
- **Zustand** → Use quando: State global simples, Sem boilerplate, Performance crítica.
- **Jotai** → Use quando: Atomic updates, State derivado complexo, Suspense integration.
- **TanStack Query** → Use quando: Server state dominante, Cache complexo, Optimistic updates.
- **Context + useReducer** → Use quando: State pequeno e local, Sem dependências externas.


## Few-Shot Examples

### Exemplo 1: Landing Page Moderna com Next.js 15
**Input do Usuário:**
Crie uma landing page moderna para um SaaS com hero section, features, pricing e footer responsivo

**Ação do Agente:**
```bash
# 1. Criar projeto
node scripts/create-project.mjs --framework nextjs --template landing-page --features "shadcn,framer-motion,tailwind"
```

**Output:**
```typescript
// app/page.tsx
import { HeroSection } from '@/components/hero-section'
import { FeaturesSection } from '@/components/features-section'
import { PricingSection } from '@/components/pricing-section'
import { Footer } from '@/components/footer'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </main>
  )
}
// ... components definition
```

### Exemplo 2: Dashboard com Data Fetching
**Input do Usuário:**
Crie um dashboard com estatísticas em cards e gráficos, usando Server Components para fetch de dados.

**Ação do Agente:**
```typescript
// app/dashboard/page.tsx (Server Component)
import { StatsCards } from '@/components/stats-cards'
import { RevenueChart } from '@/components/revenue-chart'
import { Suspense } from 'react'

async function getStats() {
  const res = await fetch('https://api.example.com/stats', { next: { revalidate: 60 } })
  return res.json()
}

export default async function DashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Suspense fallback={<CardsSkeleton />}>
        <StatsCardsAsync />
      </Suspense>
    </div>
  )
}
```

### Exemplo 5: Autenticação Moderna com Auth.js
**Input do Usuário:**
Configure autenticação moderna com Google e GitHub usando Next.js

**Output:**
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, GitHub],
})
```

## Advanced Patterns

### Parallel Routes (Next.js 15)
```
app/
├── @analytics/page.tsx
├── @team/page.tsx
└── layout.tsx
```

### Infinite Scroll com TanStack Query
```typescript
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  getNextPageParam: (last) => last.nextCursor,
})
```

## Checklists

### Performance Optimization
- [ ] Code splitting implementado
- [ ] Lazy loading de componentes pesados
- [ ] Image optimization (next/image)
- [ ] Font optimization (next/font)
- [ ] Bundle analyzer executado
- [ ] Lighthouse score > 90

### Accessibility
- [ ] Navegação por teclado funcional
- [ ] Labels em todos inputs
- [ ] ARIA attributes apropriados
- [ ] Contraste adequado
- [ ] Alt text em todas imagens

## Success Metrics
- ✓ TypeScript com zero erros
- ✓ Build sem warnings
- ✓ Lighthouse Performance > 90
- ✓ Tests passando > 80% coverage
