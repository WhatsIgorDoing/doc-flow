# 📋 Plano de Implementação - Doc Flow v2

**Data:** 2026-02-04  
**Fase:** Sprint 0 (Foundation) + Sprint 1-4  
**Baseado em:** [Brainstorm #001](./brainstorm/001-architecture-separation.md), [Gap Analysis](./analysis/gap_analysis.md)

---

## 🎯 Objetivo

Implementar a separação arquitetural entre **Document Control System (DCS)** e **Document Validator (DV)** seguindo as decisões do brainstorm, e completar as funcionalidades faltantes identificadas na análise de gap.

---

## 📊 Decisões Consolidadas (Brainstorm #001)

| Pergunta              | Decisão                         | Justificativa                                                           |
| --------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| **Separação**         | Opção C: Híbrido                | Schemas separados + APIs internas, produto pode escalar de forma segura |
| **Comunicação**       | Opção C: Event-Driven (Pub/Sub) | Sistema modular e desacoplado                                           |
| **Responsabilidades** | Ajustada                        | Batches/GRDT é responsabilidade do DV; não há storage de arquivos       |
| **UX**                | Opção C: Wizard + Tabs          | Wizard para setup (DCS), tabs para processing (DV)                      |
| **Roadmap**           | Opção C: Híbrido                | Sprint 0 curto (planejamento), código novo já nasce organizado          |

### 🔄 Ajustes Importantes nas Responsabilidades

**Baseado na resposta do brainstorm:**

1. **Batches/GRDT** → Responsabilidade do **DV (Document Validator)**, não do DCS
2. **Não há storage de arquivos** → DV apenas armazena:
   - Número da GRDT gerada
   - Quais itens do manifesto estão associados a cada GRDT
3. **Transferência de dados** → DV transfere informações para coluna do DCS (manifest_items)

---

## 🏗️ Arquitetura Final

### Diagrama de Responsabilidades

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DOC FLOW APPLICATION                              │
├─────────────────────────────────┬───────────────────────────────────────┤
│   DOCUMENT CONTROL SYSTEM (DCS) │   DOCUMENT VALIDATOR (DV)             │
│                                 │                                        │
│   📋 Gerencia:                  │   ✅ Gerencia:                         │
│   • Contratos (CRUD)            │   • Upload/Scan de arquivos           │
│   • Manifest Items (CRUD)       │   • Validação (match arquivo↔manifest)│
│   • Analytics/Relatórios        │   • OCR/Extração de texto             │
│   • Exportação Excel            │   • Criação de GRDTs/Batches          │
│                                 │   • Organização em lotes              │
│   🗂️ Entidades:                 │   • Resolução RIR                     │
│   • companies                   │                                        │
│   • contracts                   │   🗂️ Entidades:                        │
│   • manifest_items              │   • validation_batches (GRDTs)        │
│   • users                       │   • validated_documents               │
│   • contract_permissions        │   • validation_jobs                   │
│                                 │   • extraction_results                │
├─────────────────────────────────┴───────────────────────────────────────┤
│                    🔄 EVENT BUS (Pub/Sub)                               │
│                                                                          │
│   Events: manifest.created, manifest.updated, validation.completed,    │
│           grdt.created, batch.assigned                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Estrutura de Diretórios (Final)

```
doc-flow-web/
├── app/
│   ├── (dashboard)/
│   │   └── contracts/
│   │       ├── page.tsx                    # Lista de contratos (DCS)
│   │       └── [id]/
│   │           ├── layout.tsx              # Layout com tabs
│   │           ├── page.tsx                # Overview (DCS)
│   │           ├── manifest/               # DCS: Gerenciar itens
│   │           ├── validation/             # DV: Upload + Validar
│   │           │   ├── page.tsx
│   │           │   └── upload/
│   │           ├── documents/              # DV: Status validação
│   │           ├── batches/                # DV: Organizar GRDTs
│   │           │   └── [batchId]/
│   │           └── analytics/              # DCS: Relatórios
│   └── api/
│       ├── contracts/                      # DCS endpoints
│       └── validation/                     # DV endpoints
│
├── lib/
│   ├── dcs/                                # Document Control System
│   │   ├── services/
│   │   │   ├── contract-service.ts
│   │   │   ├── manifest-service.ts
│   │   │   └── export-service.ts
│   │   ├── events/
│   │   │   └── dcs-events.ts               # Event emitters
│   │   └── types/
│   │       └── dcs-types.ts
│   │
│   ├── validator/                          # Document Validator
│   │   ├── services/
│   │   │   ├── upload-service.ts
│   │   │   ├── validation-service.ts
│   │   │   ├── batch-service.ts            # GRDT management
│   │   │   ├── ocr-service.ts
│   │   │   └── resolution-service.ts
│   │   ├── events/
│   │   │   └── validator-events.ts         # Event consumers
│   │   └── types/
│   │       └── validator-types.ts
│   │
│   ├── events/                             # Event Bus Infrastructure
│   │   ├── event-bus.ts                    # Core event system
│   │   └── event-types.ts                  # All event definitions
│   │
│   └── supabase/                           # Database clients (existing)
│
└── supabase/
    └── migrations/
        └── 009_dcs_dv_separation.sql       # NEW: Schema separation
```

---

## 📅 Sprint Planning

### Sprint 0: Foundation (1 semana)

**Objetivo:** Estabelecer arquitetura sem refatorar código existente

| Tarefa                                                | Tipo           | Prioridade | Estimativa |
| ----------------------------------------------------- | -------------- | ---------- | ---------- |
| Criar estrutura de pastas `lib/dcs` e `lib/validator` | Estrutura      | P0         | 1h         |
| Implementar Event Bus básico                          | Infraestrutura | P0         | 4h         |
| Definir types/interfaces para DCS e DV                | Types          | P0         | 2h         |
| Criar ADR documentando a separação                    | Documentação   | P1         | 2h         |
| Atualizar migration com schema view                   | Database       | P1         | 2h         |
| Atualizar README com nova arquitetura                 | Documentação   | P2         | 1h         |

**Deliverables:**
- [x] Pasta `lib/dcs/` criada
- [x] Pasta `lib/validator/` criada
- [x] Event Bus funcional
- [x] ADR documentado

---

### Sprint 1: Core Validation (2 semanas)

**Objetivo:** Viabilizar validação básica de lotes (F-002, F-003)

| Tarefa                                                         | Gap ID | Prioridade | Estimativa |
| -------------------------------------------------------------- | ------ | ---------- | ---------- |
| Implementar Upload Service                                     | F-002  | P0         | 8h         |
| Criar API endpoint `POST /api/validation/upload`               | F-002  | P0         | 4h         |
| Implementar Validation Service (matching)                      | F-003  | P0         | 8h         |
| Criar API endpoint `POST /api/validation/validate`             | F-003  | P0         | 4h         |
| UI: Componente de Upload (dropzone)                            | F-002  | P0         | 6h         |
| UI: Página de Validation com resultados                        | F-003  | P0         | 6h         |
| Integrar eventos: `validation.started`, `validation.completed` | Infra  | P1         | 4h         |

**Deliverables:**
- [ ] Usuário pode fazer upload de lista de arquivos
- [ ] Sistema valida automaticamente vs manifesto
- [ ] Status exibido: VALIDATED, NEEDS_SUFFIX, UNRECOGNIZED

---

### Sprint 2: GRDT & Batches (2 semanas)

**Objetivo:** Permitir organização em GRDTs/Lotes (F-008, F-009)

| Tarefa                                             | Gap ID    | Prioridade | Estimativa |
| -------------------------------------------------- | --------- | ---------- | ---------- |
| Implementar Batch Service (GRDT creation)          | F-008     | P0         | 6h         |
| Criar API endpoint `POST /api/validation/batches`  | F-008     | P0         | 3h         |
| Implementar algoritmo de agrupamento automático    | F-008     | P1         | 6h         |
| Implementar balanceamento de lotes                 | F-009     | P1         | 4h         |
| UI: Página de organização de batches               | F-008/009 | P0         | 8h         |
| UI: Componente de atribuição em massa              | F-008     | P0         | 4h         |
| Implementar transferência GRDT→manifest_items      | Core      | P0         | 4h         |
| Integrar eventos: `grdt.created`, `batch.assigned` | Infra     | P1         | 2h         |

**Deliverables:**
- [ ] Usuário pode criar GRDTs
- [ ] Documentos atribuídos a GRDTs
- [ ] Número da GRDT aparece no manifest_item correspondente

---

### Sprint 3: OCR & Resolution (2 semanas)

**Objetivo:** Resolver arquivos não reconhecidos automaticamente (F-005, F-006, F-007)

| Tarefa                                                    | Gap ID    | Prioridade | Estimativa |
| --------------------------------------------------------- | --------- | ---------- | ---------- |
| Implementar OCR Service (pdf-parse, mammoth)              | F-005     | P0         | 8h         |
| Criar API endpoint `POST /api/validation/extract-text`    | F-005     | P0         | 3h         |
| Implementar regex patterns para extração de código        | F-005     | P0         | 4h         |
| Implementar Resolution Service (match extracted→manifest) | F-006     | P0         | 6h         |
| Implementar renomeação inteligente                        | F-007     | P1         | 4h         |
| UI: Botão "Resolver Automaticamente"                      | F-006/007 | P0         | 4h         |
| UI: Preview de resolução com confirmação                  | F-007     | P1         | 4h         |

**Deliverables:**
- [ ] Extração de texto de PDF/DOCX funcionando
- [ ] Sistema sugere matches para UNRECOGNIZED
- [ ] Resolução automática com confirmação

---

### Sprint 4: Export & Polish (1.5 semana)

**Objetivo:** Exportação Excel e refinamentos (F-012, F-004, F-014)

| Tarefa                                              | Gap ID | Prioridade | Estimativa |
| --------------------------------------------------- | ------ | ---------- | ---------- |
| Implementar Export Service (exceljs)                | F-012  | P0         | 6h         |
| Criar API endpoint `GET /api/contracts/[id]/export` | F-012  | P0         | 3h         |
| Implementar template Excel formatado                | F-012  | P0         | 4h         |
| Implementar correção automática de sufixos          | F-004  | P2         | 4h         |
| UI: "Selecionar Todos" / "Desmarcar Todos"          | F-014  | P2         | 2h         |
| UI: Filtros avançados na lista de documentos        | F-014  | P2         | 4h         |
| Testes E2E do fluxo completo                        | Test   | P1         | 6h         |

**Deliverables:**
- [ ] Download de Excel formatado funcional
- [ ] Seleção em massa implementada
- [ ] Fluxo completo testado

---

## 🗄️ Alterações de Database

### Nova Migration: 009_dcs_dv_separation.sql

```sql
-- Migration 009: DCS/DV Conceptual Separation
-- Adiciona colunas para suportar separação de responsabilidades

-- 1. Adicionar coluna grdt_number no manifest_items (transferência do DV)
ALTER TABLE manifest_items 
ADD COLUMN IF NOT EXISTS grdt_number TEXT;

ALTER TABLE manifest_items 
ADD COLUMN IF NOT EXISTS grdt_assigned_at TIMESTAMPTZ;

-- 2. Renomear validation_batches para grdt (para clareza)
-- (Opcional - pode manter nome atual se preferir)
COMMENT ON TABLE validation_batches IS 'GRDTs (Guias de Remessa de Documentos Técnicos) - gerenciado pelo DV';

-- 3. Adicionar tabela para jobs de validação
CREATE TABLE IF NOT EXISTS validation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    validated_count INTEGER DEFAULT 0,
    unrecognized_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_validation_jobs_contract ON validation_jobs(contract_id);
CREATE INDEX idx_validation_jobs_status ON validation_jobs(status);

-- 4. Adicionar tabela para resultados de extração OCR
CREATE TABLE IF NOT EXISTS extraction_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validated_document_id UUID NOT NULL REFERENCES validated_documents(id) ON DELETE CASCADE,
    extracted_text TEXT,
    extracted_code TEXT,
    confidence DECIMAL(5,2),
    method TEXT CHECK (method IN ('PDF_PARSE', 'DOCX_PARSE', 'OCR', 'MANUAL')),
    patterns_matched JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extraction_results_document ON extraction_results(validated_document_id);
CREATE INDEX idx_extraction_results_code ON extraction_results(extracted_code);

-- 5. Views para facilitar queries cross-domain
CREATE OR REPLACE VIEW dcs_manifest_with_grdt AS
SELECT 
    mi.*,
    vd.grdt_number as assigned_grdt,
    vd.status as validation_status,
    vd.validation_date
FROM manifest_items mi
LEFT JOIN validated_documents vd ON vd.manifest_item_id = mi.id;

CREATE OR REPLACE VIEW dv_validation_summary AS
SELECT 
    vb.id as grdt_id,
    vb.name as grdt_name,
    vb.contract_id,
    c.name as contract_name,
    vb.total_items,
    vb.valid_count,
    vb.pending_count,
    vb.validated_at,
    vb.created_at
FROM validation_batches vb
JOIN contracts c ON c.id = vb.contract_id;

COMMENT ON VIEW dcs_manifest_with_grdt IS 'DCS view: manifest items with GRDT assignments from DV';
COMMENT ON VIEW dv_validation_summary IS 'DV view: GRDT summary with contract info from DCS';
```

---

## 🔌 Event Bus Design

### Eventos Definidos

```typescript
// lib/events/event-types.ts

// DCS → DV Events (DV consumes)
export type ManifestCreatedEvent = {
  type: 'manifest.created';
  payload: {
    contractId: string;
    manifestItemId: string;
    documentCode: string;
  };
};

export type ManifestUpdatedEvent = {
  type: 'manifest.updated';
  payload: {
    contractId: string;
    manifestItemId: string;
    changes: Record<string, unknown>;
  };
};

// DV → DCS Events (DCS consumes)
export type ValidationCompletedEvent = {
  type: 'validation.completed';
  payload: {
    contractId: string;
    jobId: string;
    stats: {
      validated: number;
      unrecognized: number;
      errors: number;
    };
  };
};

export type GrdtCreatedEvent = {
  type: 'grdt.created';
  payload: {
    contractId: string;
    grdtId: string;
    grdtNumber: string;
    documentIds: string[];
  };
};

export type GrdtAssignedEvent = {
  type: 'grdt.assigned';
  payload: {
    manifestItemId: string;
    grdtNumber: string;
    assignedAt: string;
  };
};

export type DocFlowEvent = 
  | ManifestCreatedEvent 
  | ManifestUpdatedEvent 
  | ValidationCompletedEvent 
  | GrdtCreatedEvent 
  | GrdtAssignedEvent;
```

### Implementação Simplificada

```typescript
// lib/events/event-bus.ts

type EventHandler<T> = (event: T) => void | Promise<void>;

class EventBus {
  private handlers: Map<string, EventHandler<unknown>[]> = new Map();

  on<T extends DocFlowEvent>(
    eventType: T['type'], 
    handler: EventHandler<T>
  ): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as EventHandler<unknown>);
    this.handlers.set(eventType, handlers);
  }

  async emit<T extends DocFlowEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      await handler(event);
    }
  }
}

export const eventBus = new EventBus();
```

---

## ✅ Critérios de Aceitação

### Sprint 0
- [ ] Estrutura de pastas criada conforme especificação
- [ ] Event Bus funcional com pelo menos 1 evento teste
- [ ] ADR documentado em `docs/adr/`

### Sprint 1
- [ ] Upload de 100 arquivos em < 30 segundos
- [ ] Taxa de validação automática ≥ 80% para arquivos corretos
- [ ] Status exibido em tempo real (realtime ou polling)

### Sprint 2
- [ ] Criar GRDT em < 5 segundos
- [ ] Atribuir 50 documentos em massa em < 10 segundos
- [ ] Número GRDT visível no manifest_item

### Sprint 3
- [ ] Extração de texto de PDF/DOCX em < 5s por arquivo
- [ ] Taxa de resolução automática ≥ 60% para UNRECOGNIZED

### Sprint 4
- [ ] Download Excel formatado em < 10 segundos
- [ ] 100% paridade com formato do SAD v2.0

---

## 📚 Referências

- [Brainstorm #001](./brainstorm/001-architecture-separation.md)
- [Gap Analysis](./analysis/gap_analysis.md)
- [Technical Recommendations](./analysis/technical_recommendations.md)
- [Priority Matrix](./analysis/priority_matrix.md)

---

**Status:** 🟡 Aguardando Aprovação  
**Próximo Passo:** Aprovar plano → Iniciar Sprint 0
