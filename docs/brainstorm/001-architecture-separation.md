# 🧠 Brainstorm #001: Separação Arquitetural - Document Control vs Document Validator

**Data:** 2026-02-03  
**Participantes:** AI (Orchestrator) + Igor Bueno  
**Status:** 🟡 Em Discussão  
**Relacionado:** [docs/analysis](../analysis/), [gap_analysis.md](../analysis/gap_analysis.md)

---

## 🎯 Contexto

Durante a análise de gap de funcionalidades (migração SAD v2 → Doc Flow), identificamos que **muitas implementações não foram feitas**, mas na verdade estamos trabalhando com **dois sistemas conceitualmente distintos mas acoplados**:

### Sistema 1: **Document Control System (DCS)**
Sistema de controle e gestão de documentos - o núcleo principal

### Sistema 2: **Document Validator (DV)**
Validador de documentos - um subsistema auxiliar

**Problema:**  
O **Document Validator** depende do **Document Control System**, mas o **Document Control System NÃO depende do Validator**. O Validator captura informações do DCS para validar documentos.

**Oportunidade:**  
Organizar essa separação arquitetural desde agora pode:
- Facilitar manutenção futura
- Permitir escalabilidade independente
- Clarificar responsabilidades
- Reduzir acoplamento

---

## ❓ Perguntas Estratégicas

### 1️⃣ Separação Física vs Lógica

Como devemos implementar a separação entre DCS e DV?

**Opção A: Separação Lógica (Bounded Contexts)** - Módulos separados dentro do mesmo monólito
- ✅ **Vantagens:** 
  - Compartilham mesmo banco de dados
  - Deployment simples (uma única aplicação)
  - Desenvolvimento mais rápido
  - Sem latência de rede
- ❌ **Desvantagens:** 
  - Acoplamento técnico (mesma base de código)
  - Difícil extrair para microserviço no futuro
  - Requer disciplina para manter fronteiras

**Opção B: Separação Física (Microserviços)** - Dois sistemas completamente independentes
- ✅ **Vantagens:** 
  - Independência total (deploy, escala, tecnologia)
  - Escalabilidade independente
  - Equipes podem trabalhar isoladamente
- ❌ **Desvantagens:** 
  - Complexidade de deployment (orquestração)
  - Latência de rede entre serviços
  - Sincronização de dados complexa
  - Overhead operacional

**Opção C: Híbrido** - Mesma aplicação, schemas de banco separados + APIs internas claras
- ✅ **Vantagens:** 
  - Melhor dos dois mundos
  - Migração futura facilitada para microserviços
  - Fronteiras claras com baixa complexidade
- ❌ **Desvantagens:** 
  - Requer disciplina arquitetural rigorosa
  - Pode ter duplicação de código de infraestrutura

**Pergunta:** Qual abordagem faz mais sentido para o contexto atual do Doc Flow, considerando tamanho da equipe, maturidade do projeto e roadmap de 3-6 meses?

---

#### 📝 Resposta:

```
[Aguardando decisão]
```

**Decisão Final:** _[A ser preenchido]_  
**Justificativa:** _[A ser preenchido]_

---

### 2️⃣ Interface de Comunicação

Como o **Document Validator** deve consumir dados do **Document Control System**?

**Opção A: Acesso direto ao banco de dados**
```typescript
// Document Validator acessa diretamente as tabelas do DCS
const manifestItems = await db.query('SELECT * FROM dcs.manifest_items WHERE contract_id = $1', [contractId]);
```
- ✅ Simples, sem overhead de API
- ❌ Acoplamento forte ao schema do banco
- ❌ Dificulta evolução independente

**Opção B: API Interna (Service Layer)**
```typescript
// Document Validator consome via interface/serviço
const manifestItems = await manifestAPI.getManifestItems(contractId);
```
- ✅ Desacoplamento, contratos claros
- ✅ Facilita evolução e testes
- ❌ Requer manutenção de contratos de API

**Opção C: Event-Driven (Pub/Sub)**
```typescript
// DCS emite eventos, DV consome
eventBus.on('manifest.updated', (event) => {
  // Document Validator reage ao evento
});
```
- ✅ Totalmente assíncrono e desacoplado
- ✅ Escalável para múltiplos consumidores
- ❌ Complexidade adicional (mensageria)
- ❌ Debugging mais difícil

**Pergunta:** Qual padrão de comunicação se alinha melhor com as operações do sistema? Validação é síncrona ou assíncrona?

---

#### 📝 Resposta:

```
[Aguardando decisão]
```

**Decisão Final:** _[A ser preenchido]_  
**Justificativa:** _[A ser preenchido]_

---

### 3️⃣ Responsabilidades e Fronteiras

Vamos mapear **exatamente** o que cada sistema faz:

**Proposta Inicial:**

#### 🗂️ **Document Control System (DCS)** - Core

**Responsabilidades:**
- ✅ Gerenciar contratos (CRUD)
- ✅ Gerenciar manifestos (itens, revisões, metadados)
- ✅ Gerenciar lotes/batches (criação, organização)
- ✅ Armazenar documentos (interface com Supabase Storage)
- ✅ Interface de usuário (navegação, visualização, dashboards)
- ✅ Exportação de dados (Excel, ZIP)
- ✅ Analytics e relatórios

**Entidades principais:**
- `contracts`
- `manifest_items`
- `batches`
- (possivelmente) `validated_documents` (?)

---

#### ✅ **Document Validator (DV)** - Auxiliary

**Responsabilidades:**
- ✅ Upload e scan de arquivos (processamento de lotes)
- ✅ Validação de correspondência (match arquivo ↔ manifest)
- ✅ OCR e extração de texto (processamento de conteúdo)
- ✅ Resolução de RIR (renomeação inteligente)
- ✅ Atribuição de status (VALIDATED, NEEDS_SUFFIX, UNRECOGNIZED)
- ✅ Background jobs de processamento

**Entidades principais:**
- (possivelmente) `validated_documents` (?)
- `validation_jobs`
- `extraction_results`

---

**Pergunta:** Essa divisão de responsabilidades está correta? Há funcionalidades que você moveria de um sistema para outro?

---

#### 📝 Resposta:

```
[Aguardando decisão]
```

**Ajustes Necessários:** _[A ser preenchido]_

---

### 4️⃣ Estado Compartilhado (Ownership de Dados)

Quais dados precisam ser compartilhados e quem é o dono (owner) de cada entidade?

**Análise de Entidades:**

| Entidade                | Owner Proposto | Consumido por Validator? | Atualizado por Validator?   |
| ----------------------- | -------------- | ------------------------ | --------------------------- |
| **contracts**           | 🗂️ DCS          | ✅ Sim (read-only)        | ❌ Não                       |
| **manifest_items**      | 🗂️ DCS          | ✅ Sim (read-only)        | ❌ Não                       |
| **batches**             | 🗂️ DCS          | ✅ Sim (read-only)        | 🟡 Pode atribuir documentos? |
| **validated_documents** | ❓ **???**      | ✅ Sim (read-write)       | ✅ Sim (cria e atualiza)     |
| **validation_jobs**     | ✅ DV           | ❌ Não                    | ✅ Sim                       |
| **extraction_results**  | ✅ DV           | ❌ Não                    | ✅ Sim                       |

**Questão Crítica:**  

A tabela `validated_documents` deve pertencer a qual sistema?

**Argumento para DCS (Document Control):**
- É o registro final e permanente de documentos
- Faz parte do controle de documentos do contrato
- Usuários visualizam documentos no contexto do DCS
- Exportação de Excel usa esses dados (função do DCS)

**Argumento para DV (Document Validator):**
- É **criada** pelo processo de validação
- É **atualizada** constantemente durante validação/OCR
- Status de validação é responsabilidade do Validator
- Temporária até ser aprovada e integrada ao DCS (?)

**Argumento para Compartilhada:**
- Criada pelo DV, consultada pelo DCS
- DV é write-heavy, DCS é read-heavy
- Requer sincronização clara de ownership

**Pergunta:** Quem deve ser o owner da tabela `validated_documents`? Como lidar com o ciclo de vida (criação → validação → integração)?

---

#### 📝 Resposta:

```
[Aguardando decisão]
```

**Decisão Final:** _[A ser preenchido]_  
**Modelo de Ownership:** _[A ser preenchido]_

---

### 5️⃣ Fluxo de Trabalho (UX e Integration)

Como o usuário interage com os dois sistemas? A separação deve ser visível para o usuário?

**Opção A: Fluxos Separados (Wizards Distintos)**

```
1. Usuário → DCS: Criar contrato + preencher manifesto
   [Termina aqui, vai para outra tela]

2. Usuário → DV: Selecionar contrato → Upload lote → Validar
   [Feedback de validação, termina aqui]

3. Usuário → DCS: Organizar documentos validados em batches → Exportar
   [Download Excel/ZIP]
```

- ✅ Separação clara de responsabilidades
- ✅ Fluxos independentes, menos acoplamento
- ❌ Usuário precisa navegar entre seções
- ❌ Context switching pode confundir

**Opção B: Fluxo Integrado (Single Interface)**

```
Usuário → Doc Flow (UI única)
  ├─ Tab "Manifest" (powered by DCS)
  ├─ Tab "Validation" (powered by DV, mas integrado)
  ├─ Tab "Documents" (dados do DV, UI do DCS)
  └─ Tab "Batches" (powered by DCS)
```

- ✅ UX contínua, sem quebra de contexto
- ✅ Usuário não precisa saber da separação interna
- ❌ Mais acoplamento na camada de UI
- ❌ Requer orquestração cuidadosa

**Opção C: Híbrido (Wizard + Tabs)**

```
Fase 1 (Setup): Wizard dedicado para DCS (contrato + manifest)
Fase 2 (Processing): Interface integrada com tabs (validação + organização)
Fase 3 (Export): Ação final no DCS
```

- ✅ Melhor dos dois mundos
- ✅ Guia usuário no fluxo correto
- ❌ Mais complexo de implementar

**Pergunta:** Qual abordagem de UX faz mais sentido? A separação arquitetural deve ser visível para o usuário?

---

#### 📝 Resposta:

```
[Aguardando decisão]
```

**Decisão Final:** _[A ser preenchido]_  
**Wireframe/Fluxo:** _[A ser descrito ou linkado]_

---

### 6️⃣ Impacto no Roadmap

Se separarmos os sistemas, como isso afeta o Sprint Planning atual?

**Roadmap Atual (da análise de gap):**

- **Sprint 1:** Upload + Validação (📍 ambos são **Document Validator**)
- **Sprint 2:** OCR/RIR (📍 **Document Validator**)
- **Sprint 3:** Exportação Excel (📍 **Document Control**)
- **Sprint 4:** Refinamentos (📍 ambos sistemas)

**Novas Opções:**

**Opção A: Sprint 0 - Foundation (Refatoração Arquitetural)**

```
Sprint 0 (2 semanas):
  - Separar schemas de banco (dcs vs validator)
  - Criar service layer e contratos de API
  - Refatorar código existente para respeitar fronteiras
  - Documentar ADR (Architecture Decision Record)
  
Depois prosseguir com Sprint 1-4 normalmente
```

- ✅ Fundação sólida antes de implementar features
- ✅ Evita refatoração futura custosa
- ❌ Atrasa entrega de features por 2 semanas

**Opção B: Refatoração Incremental (durante sprints)**

```
Sprints 1-4: Implementar features normalmente
  + Aplicar separação gradualmente
  + Documentar decisões em ADRs conforme surgem
  
Sprint 5: Consolidação arquitetural
```

- ✅ Features entregues mais rápido
- ✅ Arquitetura evolui organicamente
- ❌ Risco de acumular débito técnico
- ❌ Pode requerer refatoração posterior

**Opção C: Híbrido (Planejamento + Execução)**

```
Sprint 0 (1 semana - apenas planejamento):
  - Documentar ADR
  - Definir contratos de API
  - Criar estrutura de pastas
  - NÃO refatorar código existente ainda
  
Sprints 1-4: Implementar features JÁ respeitando a separação
```

- ✅ Planejamento arquitetural sem atrasar features
- ✅ Código novo já nasce organizado
- ✅ Código antigo pode ser refatorado depois se necessário

**Pergunta:** Devemos criar um Sprint 0 para estabelecer a arquitetura? Ou aplicar separação gradualmente?

---

#### 📝 Resposta:

```
[Aguardando decisão]
```

**Decisão Final:** _[A ser preenchido]_  
**Roadmap Ajustado:** _[A ser definido]_

---

## 💡 Proposta Inicial (Rascunho para Discussão)

### 📂 Estrutura de Diretórios Proposta

```
app/
├── (dcs)/                    # Document Control System (routes)
│   ├── contracts/
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   ├── manifest/
│   │   │   ├── batches/
│   │   │   └── analytics/
│   │   └── page.tsx
│   └── layout.tsx
│
└── (validator)/              # Document Validator (routes)
    ├── contracts/
    │   └── [id]/
    │       ├── upload/
    │       ├── documents/    # Validated documents UI
    │       └── resolution/   # RIR resolution
    └── layout.tsx

lib/
├── dcs/                      # DCS Business Logic
│   ├── services/
│   │   ├── contract-service.ts
│   │   ├── manifest-service.ts
│   │   ├── batch-service.ts
│   │   └── export-service.ts
│   ├── api/                  # Internal API (for DV consumption)
│   │   └── manifest-api.ts
│   └── types/
│
└── validator/                # Validator Business Logic
    ├── services/
    │   ├── upload-service.ts
    │   ├── validation-service.ts
    │   ├── ocr-service.ts
    │   └── resolution-service.ts
    ├── workers/              # Background jobs
    │   ├── file-processor.ts
    │   └── text-extractor.ts
    └── types/
```

### 🗄️ Database Schemas Proposta

```sql
-- Schema 1: Document Control System
CREATE SCHEMA dcs;

CREATE TABLE dcs.contracts (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  contract_number VARCHAR(50),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dcs.manifest_items (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES dcs.contracts(id),
  document_code VARCHAR(100) NOT NULL,
  revision VARCHAR(10),
  title TEXT,
  document_type VARCHAR(50),
  category VARCHAR(50),
  responsible_email VARCHAR(255)
);

CREATE TABLE dcs.batches (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES dcs.contracts(id),
  batch_number INT,
  name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema 2: Document Validator
CREATE SCHEMA validator;

CREATE TABLE validator.validated_documents (
  id UUID PRIMARY KEY,
  contract_id UUID, -- Foreign key para dcs.contracts (cross-schema)
  manifest_item_id UUID, -- Foreign key para dcs.manifest_items
  batch_id UUID, -- Foreign key para dcs.batches
  filename VARCHAR(255) NOT NULL,
  storage_path TEXT,
  file_size BIGINT,
  status VARCHAR(20) CHECK (status IN ('PENDING', 'VALIDATED', 'NEEDS_SUFFIX', 'UNRECOGNIZED', 'ERROR')),
  validation_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE validator.validation_jobs (
  id UUID PRIMARY KEY,
  contract_id UUID,
  status VARCHAR(20),
  total_files INT,
  processed_files INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE validator.extraction_results (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES validator.validated_documents(id),
  extracted_text TEXT,
  extracted_code VARCHAR(100),
  confidence DECIMAL(3,2),
  method VARCHAR(20), -- 'PDF_PARSE', 'DOCX_PARSE', 'OCR'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 🔌 API de Comunicação Proposta

```typescript
// lib/dcs/api/manifest-api.ts
/**
 * Internal API for Document Validator to consume DCS data
 * This is a read-only API - DV should never mutate DCS data directly
 */
export class ManifestAPI {
  async getContract(contractId: string) {
    // Read contract from dcs.contracts
  }
  
  async getManifestItems(contractId: string) {
    // Read manifest items from dcs.manifest_items
  }
  
  async getBatches(contractId: string) {
    // Read batches from dcs.batches
  }
}

// lib/validator/validator.ts
import { ManifestAPI } from '@/lib/dcs/api/manifest-api';

export class DocumentValidator {
  constructor(private manifestAPI: ManifestAPI) {}
  
  async validateDocuments(contractId: string, fileIds: string[]) {
    // 1. Consume data from DCS via API (read-only)
    const manifestItems = await this.manifestAPI.getManifestItems(contractId);
    
    // 2. Perform validation logic
    // 3. Write results to validator.validated_documents
  }
}
```

---

## 🎬 Próximos Passos

**Após responder às 6 perguntas acima:**

- [ ] Consolidar decisões em um **ADR (Architecture Decision Record)**
- [ ] Criar diagrama de arquitetura atualizado (Mermaid)
- [ ] Atualizar roadmap (definir se haverá Sprint 0 ou não)
- [ ] Refatorar estrutura de pastas (se decidido)
- [ ] Criar migrations de banco de dados (separação de schemas)
- [ ] Implementar service layer com contratos de API
- [ ] Atualizar documentação de desenvolvimento

---

## 📚 Referências

- [docs/analysis/gap_analysis.md](../analysis/gap_analysis.md) - Análise de gap original
- [docs/analysis/technical_recommendations.md](../analysis/technical_recommendations.md) - Recomendações técnicas
- [Domain-Driven Design](https://martinfowler.com/bliki/BoundedContext.html) - Bounded Contexts (Martin Fowler)
- [Microservices Patterns](https://microservices.io/) - Padrões de comunicação

---

**Última atualização:** 2026-02-03  
**Próxima Revisão:** _[Após respostas serem preenchidas]_
