# Doc Flow Web - Next.js Migration (Phase 1)

Aplicação Next.js 15 moderna para visualização e gestão de documentos validados.

## 🎯 Fase 1: Read-Only Document Registry

Esta é a **Fase 1** da migração do sistema Python Desktop (NiceGUI) para Web (Next.js). Nesta fase:

- ✅ **Apenas leitura** de documentos já validados
- ✅ Interface web moderna e responsiva
- ✅ Visualização de dados do Supabase
- ❌ Sem upload/validação (vem na Fase 2)

**O sistema Python continua operacional** para validação, escrevendo no mesmo banco Supabase.

---

## 🏗️ Stack Tecnológica

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19 + Tailwind CSS v4
- **Components:** Shadcn/ui (custom implementation)
- **Database:** Supabase (PostgreSQL)
- **Language:** TypeScript (strict mode)
- **Styling:** Glassmorphism + Apple-inspired design

---

## 🚀 Setup Rápido

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Supabase

#### a) Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote a **URL** e **anon key**

#### b) Executar SQL Schema

1. No dashboard do Supabase, vá em **SQL Editor**
2. Cole o conteúdo de `supabase/migrations/001_phase1_schema.sql`
3. Execute a migração

#### c) Configurar .env.local

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
copy .env.local.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 3. Rodar Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 📁 Estrutura do Projeto

```
doc-flow-web/
├── app/
│   ├── (dashboard)/
│   │   └── contracts/[id]/documents/  # Registry de documentos
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                            # Button, Badge, StatusBadge, Card, GlassCard
├── lib/
│   ├── supabase/                      # Browser/Server clients
│   └── utils.ts
├── types/
│   └── database.ts                    # TypeScript types
└── supabase/
    └── migrations/
        └── 001_phase1_schema.sql      # Database schema
```

---

## 🗄️ Schema do Banco

### Tabelas: companies, contracts, users, contract_permissions, manifest_items, validated_documents, audit_log

### Row-Level Security (RLS)

Todas as tabelas têm políticas RLS configuradas para segurança multi-tenant.

---

## 📊 Funcionalidades (Fase 1)

### ✅ Implementado

- [x] Visualização de documentos validados
- [x] Filtro por status + busca
- [x] Estatísticas dashboard
- [x] Mobile-responsive
- [x] RLS (Row-Level Security)

### 🚧 Próximas Fases

**Fase 2:** Upload + Validação  
**Fase 3:** Multi-tenant + Organização de Lotes

---

## 📝 Notas

- **Dados demo:** Contract ID `00000000-0000-0000-0000-000000000002`
- **Coexistência:** Python app escreve, Next.js lê do mesmo Supabase
- **Documentação completa:** Ver arquivos em `../brain/`

---

**Doc Flow - Fase 1 Migration**
