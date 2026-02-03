# Análise de Gap de Funcionalidades - Migração SAD v2 → Doc Flow

## 📋 Sumário Executivo

**Data da Análise:** 03 de Fevereiro de 2026  
**Sistemas Comparados:**
- **Origem:** SAD App v2.0 (Desktop Python)
- **Destino:** Doc Flow (Web Next.js + Supabase)

### Status da Migração

| Categoria                   | Qtd. | %    |
| --------------------------- | ---- | ---- |
| ✅ **Totalmente Migradas**   | 5    | 26%  |
| 🟡 **Parcialmente Migradas** | 4    | 21%  |
| ❌ **Não Migradas**          | 10   | 53%  |
| **TOTAL**                   | 19   | 100% |

> ⚠️ **Crítico:** Apenas 26% das funcionalidades foram completamente migradas. Principais gaps: **Validação Automática**, **Resolução RIR**, **Organização de Lotes** e **Geração de Templates**.

---

## 🔍 Análise Detalhada por Módulo

### Módulo 1: Validação de Lotes (4 funcionalidades)

#### ✅ F-001: Carregamento de Manifesto
**Status:** TOTALMENTE MIGRADO

**SAD v2.0:**
- Importa Excel via `openpyxl`
- Estrutura fixa de colunas
- Cria objetos `ManifestItem`

**Doc Flow:**
- Interface web para criar/editar itens do manifesto
- Armazenamento em Supabase (`manifest_items` table)
- Componentes: `ManifestTable`, `ManifestItemDialog`, `AddItemButton`
- Rota: `/contracts/[id]/manifest`

**Diferenças:**
- ✅ Migrado para entrada manual/web (sem upload Excel automático)
- ✅ Realtime updates implementado
- ⚠️ Não suporta importação em massa via Excel

---

#### ❌ F-002: Escaneamento de Diretório
**Status:** NÃO MIGRADO

**SAD v2.0:**
- Busca recursiva em diretórios locais (`Path.rglob('*')`)
- Identifica todos arquivos automaticamente
- Cria objetos `DocumentFile` com metadados

**Doc Flow:**
- ❌ **Funcionalidade ausente**
- Não há interface para scan de diretórios
- Não há API endpoint para listar arquivos do sistema de arquivos

**Impacto:**
- 🔴 **CRÍTICO** - Sem esta funcionalidade, não é possível processar lotes de documentos
- Usuários precisam adicionar documentos manualmente

**Necessidade:**
- Implementar upload de múltiplos arquivos
- API para processar arquivo ZIP com lote completo
- Worker para extrair e validar arquivos

---

#### ❌ F-003: Validação de Correspondência
**Status:** NÃO MIGRADO

**SAD v2.0:**
- Compara arquivos físicos com manifesto
- Classifica status: `VALIDATED`, `NEEDS_SUFFIX`, `UNRECOGNIZED`
- Normalização de nomes (remove sufixos de revisão)

**Doc Flow:**
- ❌ **Funcionalidade ausente**
- Schema `validated_documents` existe mas não há lógica de validação automática
- Status enum definido mas não utilizado programaticamente

**Impacto:**
- 🔴 **CRÍTICO** - Núcleo do sistema não migrado
- Sem validação automática, processo é 100% manual

**Necessidade:**
- API endpoint: `POST /api/contracts/[id]/validate`
- Worker para processar validação em background
- Algoritmo de matching (nome base + revisão)

---

#### ❌ F-004: Correção Automática de Sufixos
**Status:** NÃO MIGRADO

**SAD v2.0:**
- Adiciona sufixo de revisão automaticamente
- Renomeia arquivos com `_[REVISÃO]`
- Verificação de conflitos

**Doc Flow:**
- ❌ **Funcionalidade ausente**
- Não há renomeação automática

**Impacto:**
- 🟡 **MÉDIO** - Funcionalidade auxiliar, pode ser manual inicialmente

---

### Módulo 2: Resolução de Exceções - RIR (3 funcionalidades)

#### ❌ F-005: Extração de Código de Documento
**Status:** NÃO MIGRADO

**SAD v2.0:**
- Extrai texto de PDF (`PyPDF2`) e DOCX (`python-docx`)
- Aplica regex configurados em `patterns.yaml`
- Perfis configuráveis (RIR, PID, GERAL)

**Doc Flow:**
- ❌ **Funcionalidade ausente**
- Não há processamento de conteúdo de documentos
- Sem OCR ou extração de texto

**Impacto:**
- 🔴 **CRÍTICO** - Resolução inteligente não disponível
- Todos arquivos não reconhecidos precisam ser resolvidos manualmente

**Necessidade:**
- Biblioteca de extração de texto (ex: `pdf-parse` para Node.js)
- Configuração de padrões regex
- API endpoint para processar arquivo individual

---

#### ❌ F-006: Validação de Código Extraído
**Status:** NÃO MIGRADO

**Dependente de F-005**

---

#### ❌ F-007: Renomeação Inteligente
**Status:** NÃO MIGRADO

**Dependente de F-005 e F-006**

---

### Módulo 3: Organização e Geração de Lotes (5 funcionalidades)

#### 🟡 F-008: Agrupamento de Documentos
**Status:** PARCIALMENTE MIGRADO

**SAD v2.0:**
- Agrupa arquivos por `document_code`
- Entidade `DocumentGroup`

**Doc Flow:**
- ✅ `batch_id` existe em `validated_documents`
- ⚠️ Sem lógica automática de agrupamento
- ⚠️ Agrupamento manual via `BatchSelector` component

**Gaps:**
- Sem agrupamento automático por código
- Sem conceito de `DocumentGroup`

---

#### ❌ F-009: Balanceamento de Lotes
**Status:** NÃO MIGRADO

**SAD v2.0:**
- Algoritmo guloso para distribuir grupos
- Balanceamento por tamanho (bytes)
- Parâmetro `max_docs_per_lot`

**Doc Flow:**
- ❌ **Funcionalidade ausente**
- Criação de lotes é manual

**Impacto:**
- 🟡 **MÉDIO** - Pode ser implementado via interface manual

---

#### ❌ F-010: Criação de Estrutura de Diretórios
**Status:** NÃO MIGRADO

**SAD v2.0:**
- Cria diretórios físicos para cada lote
- Padrão de nomenclatura: `0130869-CZ6-PGV-G-XXXX-2025-eGRDT`

**Doc Flow:**
- ❌ **Funcionalidade ausente**
- Sistema web não cria estruturas de diretórios locais
- Armazena metadados em banco

**Impacto:**
- 🟢 **BAIXO** - Arquitetura web não requer estrutura de diretórios
- Possível exportar ZIP com estrutura quando necessário

---

#### ❌ F-011: Movimentação de Arquivos
**Status:** NÃO MIGRADO

**SAD v2.0:**
- Move arquivos para diretórios de lote
- Adiciona revisão ao nome

**Doc Flow:**
- ❌ **Funcionalidade ausente**
- Arquivos armazenados em Supabase Storage (?)
- Não há movimentação física

**Impacto:**
- 🟢 **BAIXO** - Arquitetura web diferente, não aplica

---

#### ❌ F-012: Preenchimento de Template Excel
**Status:** NÃO MIGRADO

**SAD v2.0:**
- Gera manifesto Excel por lote
- Copia template e preenche dados
- Formatação automática (cores, bordas, larguras)

**Doc Flow:**
- ❌ **Funcionalidade ausente**
- Não há exportação de manifestos

**Impacto:**
- 🔴 **ALTO** - Entrega final do sistema original era Excel populado
- Necessário para compatibilidade com fluxos existentes

**Necessidade:**
- API endpoint para exportar manifesto como Excel
- Biblioteca: `exceljs` ou `xlsx`
- Templates configuráveis

---

### Módulo 4: Interface Gráfica (5 funcionalidades)

#### ✅ F-013: Sistema de Navegação por Abas
**Status:** TOTALMENTE MIGRADO

**SAD v2.0:**
- 2 abas: "Validação e Resolução" + "Organização e Saída"

**Doc Flow:**
- ✅ Navegação via rotas: `/manifest`, `/documents`, `/batches`, `/analytics`
- ✅ Componente `ContractNav` com tabs
- ✅ Breadcrumbs implementados

---

#### 🟡 F-014: Sistema de Seleção Múltipla
**Status:** PARCIALMENTE MIGRADO

**SAD v2.0:**
- Checkboxes para selecionar múltiplos arquivos não reconhecidos

**Doc Flow:**
- ✅ `BatchSelector` component com checkboxes
- ⚠️ Sem "Selecionar Todos" / "Desmarcar Todos"

**Gaps:**
- Funcionalidades de seleção em massa incompletas

---

#### ✅ F-015: Sistema de Logs e Feedback
**Status:** TOTALMENTE MIGRADO

**SAD v2.0:**
- Área de log com mensagens categorizadas
- Progress bar

**Doc Flow:**
- ✅ `toast` notifications (Sonner)
- ✅ Loading states com `Skeleton` components
- ✅ Error boundaries e mensagens detalhadas

---

#### ✅ F-016: Execução Assíncrona
**Status:** TOTALMENTE MIGRADO

**SAD v2.0:**
- Threading para operações pesadas

**Doc Flow:**
- ✅ React Query para async operations
- ✅ Server Actions (Next.js)
- ✅ Loading states e optimistic updates

---

#### ✅ F-017: Gestão de Estado da Interface
**Status:** TOTALMENTE MIGRADO

**SAD v2.0:**
- Controle de habilitação de botões

**Doc Flow:**
- ✅ React state management
- ✅ Conditional rendering
- ✅ Disabled states baseados em dados

---

### Módulo 5: Operações de Arquivo Seguras (2 funcionalidades)

#### 🟡 F-018: Renomeação Segura com Verificações
**Status:** PARCIALMENTE MIGRADO

**SAD v2.0:**
- Múltiplas verificações de permissão
- Rollback em falhas

**Doc Flow:**
- ✅ Supabase Storage com controle de acesso
- ⚠️ Sem verificações complexas de permissão no client
- ⚠️ RLS (Row Level Security) implementado no banco

**Gaps:**
- Verificações de permissão menos granulares

---

#### 🟡 F-019: Geração de Nomes Únicos
**Status:** PARCIALMENTE MIGRADO

**SAD v2.0:**
- Sufixos numéricos `_001`, `_002`
- Fallback para timestamp

**Doc Flow:**
- ✅ UUID como IDs únicos
- ⚠️ Nomes de arquivo podem ter conflito

**Gaps:**
- Não implementado para nomes de arquivo

---

## 🎯 Funcionalidades CRÍTICAS Não Migradas

| Prioridade | ID            | Funcionalidade               | Impacto                 |
| ---------- | ------------- | ---------------------------- | ----------------------- |
| **P0**     | F-003         | Validação de Correspondência | 🔴 Núcleo do sistema     |
| **P0**     | F-002         | Escaneamento de Diretório    | 🔴 Entrada de dados      |
| **P1**     | F-005/006/007 | Resolução RIR (OCR+Regex)    | 🔴 Automação inteligente |
| **P1**     | F-012         | Geração de Template Excel    | 🔴 Entrega final         |
| **P2**     | F-008         | Agrupamento Automático       | 🟡 Eficiência            |
| **P2**     | F-009         | Balanceamento de Lotes       | 🟡 Otimização            |
| **P3**     | F-004         | Correção de Sufixos          | 🟡 Auxiliar              |

---

## 📊 Roadmap Recomendado

### Sprint 1: Fundação (Core Missing Features)
#### Objetivo: Viabilizar validação básica de lotes

**Tarefas:**
1. **F-002: Upload e Scan de Arquivos**
   - API endpoint: `POST /api/contracts/[id]/upload-batch`
   - Upload de ZIP com lote completo
   - Worker para extrair e catalogar arquivos
   - Armazenar em Supabase Storage

2. **F-003: Validação Automática**
   - API endpoint: `POST /api/contracts/[id]/validate`
   - Algoritmo de matching (nome base vs manifest)
   - Classificação de status (VALIDATED, NEEDS_SUFFIX, UNRECOGNIZED)
   - Background job processamento

3. **UI para Validação**
   - Botão "Upload Lote" na página Documents
   - Progress indicator para processamento
   - Lista de resultados da validação

**Dependências Técnicas:**
- Supabase Storage configurado
- Queue system (ex: BullMQ ou Supabase Edge Functions)

---

### Sprint 2: Resolução Inteligente (RIR)
#### Objetivo: Resolver arquivos não reconhecidos automaticamente

**Tarefas:**
1. **F-005: Extração de Texto**
   - Integrar `pdf-parse` (PDF) e `mammoth` (DOCX)
   - API endpoint: `POST /api/documents/[id]/extract-text`
   - Configurar padrões regex (migrar `patterns.yaml`)

2. **F-006/007: Validação e Renomeação**
   - Buscar código extraído no manifesto
   - Renomear arquivo automaticamente
   - Atualizar status para VALIDATED

3. **UI para Resolução**
   - Botão "Resolver Automaticamente" para arquivos UNRECOGNIZED
   - Feedback de sucesso/erro

**Dependências Técnicas:**
- Node.js library para PDF/DOCX parsing
- Regex patterns configuráveis

---

### Sprint 3: Organização e Exportação
#### Objetivo: Gerar lotes organizados e manifestos Excel

**Tarefas:**
1. **F-008/009: Agrupamento e Balanceamento**
   - Algoritmo de agrupamento por document_code
   - Algoritmo guloso de balanceamento
   - UI para configurar max_docs_per_lot

2. **F-012: Exportação Excel**
   - API endpoint: `GET /api/contracts/[id]/batches/[batchId]/export`
   - Gerar Excel com `exceljs`
   - Aplicar formatação (cores, bordas)
   - Download do arquivo

3. **UI de Organização**
   - Página "Organizar Lotes"
   - Preview de distribuição
   - Botão "Exportar Manifesto"

**Dependências Técnicas:**
- `exceljs` library
- Template Excel configurável

---

### Sprint 4: Refinamentos e Features Auxiliares
#### Objetivo: Completar funcionalidades secundárias

**Tarefas:**
1. **F-004: Correção de Sufixos**
   - Renomeação em massa
   - Preview antes de aplicar

2. **F-014: Seleção Múltipla Completa**
   - "Selecionar Todos" / "Desmarcar Todos"
   - Filtros avançados

3. **F-010/011: Exportação ZIP**
   - Gerar estrutura de diretórios
   - ZIP com lote completo organizado

**Dependências Técnicas:**
- `archiver` ou `jszip` para geração de ZIP

---

## 🧩 Arquitetura Recomendada para Features Faltantes

### Stack Sugerida

```
┌─────────────────────────────────────┐
│   Frontend (Next.js + React)        │
│   - Upload UI                       │
│   - Validation Results              │
│   - Batch Organization              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   API Routes (Next.js)              │
│   - /api/upload-batch               │
│   - /api/validate                   │
│   - /api/extract-text               │
│   - /api/export-excel               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Background Jobs (Supabase Edge)   │
│   - File Processing Worker          │
│   - Validation Worker               │
│   - Text Extraction Worker          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Storage & Data                    │
│   - Supabase Storage (files)        │
│   - PostgreSQL (metadata)           │
└─────────────────────────────────────┘
```

### Tecnologias Necessárias

| Funcionalidade            | Biblioteca/Serviço                     |
| ------------------------- | -------------------------------------- |
| Upload múltiplos arquivos | `react-dropzone`                       |
| Extração PDF              | `pdf-parse`                            |
| Extração DOCX             | `mammoth`                              |
| Geração Excel             | `exceljs`                              |
| Geração ZIP               | `archiver`                             |
| Background jobs           | Supabase Edge Functions ou Vercel Cron |
| Queue system              | BullMQ + Redis (se necessário)         |

---

## ⚠️ Pontos de Atenção

### 1. Mudança de Paradigma: Desktop → Web

**SAD v2.0:**
- Acesso direto ao sistema de arquivos
- Processamento síncrono e local
- Desktop app standalone

**Doc Flow:**
- Upload via HTTP (limitações de tamanho)
- Processamento assíncrono distribuído
- Multi-tenant web app

### 2. Armazenamento de Arquivos

**Decisão Necessária:**
- **Opção A:** Armazenar arquivos no Supabase Storage
  - ✅ Escalável
  - ❌ Custo de storage
  - ❌ Limites de upload (6MB default)

- **Opção B:** Processar e descartar (metadata only)
  - ✅ Sem custo de storage
  - ❌ Não permite re-processamento
  - ❌ Perda de rastreabilidade

- **Opção C (Recomendada):** Híbrido
  - Armazenar apenas arquivos com problemas (UNRECOGNIZED, ERROR)
  - Hash dos arquivos validados para auditoria
  - Exportação final em ZIP para usuário fazer download

### 3. Performance e Escalabilidade

**Desafios:**
- Processar lotes com 1000+ arquivos
- OCR/extração de texto pode ser lenta
- Geração de Excel com milhares de linhas

**Soluções:**
- Implementar paginação
- Processing queue com workers paralelos
- Streaming de dados (não carregar tudo na memória)

---

## 📈 Métricas de Sucesso

### Sprint 1
- [ ] Usuário consegue fazer upload de lote completo (ZIP)
- [ ] Sistema valida automaticamente 80%+ dos arquivos
- [ ] Resultados exibidos em \u003c 30 segundos para lotes de até 100 arquivos

### Sprint 2
- [ ] Taxa de resolução automática de 60%+ para arquivos UNRECOGNIZED
- [ ] Extração de texto funciona para PDF e DOCX

### Sprint 3
- [ ] Exportação de manifesto Excel funcional
- [ ] Formatação compatível com templates antigos
- [ ] Download completo em \u003c 10 segundos

### Sprint 4
- [ ] 100% de paridade funcional com SAD v2.0
- [ ] Performance aceitável para lotes de até 1000 arquivos
- [ ] Zero downtime deployment

---

## 🤝 Conclusão

### Situação Atual
Doc Flow migrou com sucesso a **camada de apresentação** e **gerenciamento de metadados**, mas o **núcleo de processamento** (validação, OCR, organização) **não foi migrado**.

### Esforço Estimado
- **Sprint 1 (Fundação):** ~40 horas
- **Sprint 2 (RIR):** ~30 horas
- **Sprint 3 (Exportação):** ~25 horas
- **Sprint 4 (Refinamentos):** ~15 horas

**TOTAL:** ~110 horas (~3 meses com 1 dev full-time)

### Recomendação
**Priorizar Sprint 1 e 2** para viabilizar MVP funcional. Sprint 3 e 4 podem ser incrementais baseado em feedback de usuários.

---

**Documento gerado em:** 03/02/2026  
**Próximo Passo:** Aprovação do roadmap e início do Sprint 1
