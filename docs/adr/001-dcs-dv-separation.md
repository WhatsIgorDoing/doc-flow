# ADR-001: Separação Arquitetural DCS e DV

**Status:** Aceita  
**Data:** 2026-02-04  
**Decisores:** Igor Bueno (Product Owner), AI Architect  
**Referência:** [Brainstorm #001](../brainstorm/001-architecture-separation.md)

---

## Contexto

O Doc Flow surgiu da migração do SAD App v2.0 (aplicação desktop Python) para uma aplicação web (Next.js + Supabase). Durante a análise de gap, identificamos que o sistema original era composto por **dois domínios distintos** que estavam acoplados:

1. **Document Control System (DCS):** Gerenciamento de contratos, manifestos e metadados
2. **Document Validator (DV):** Validação de arquivos, OCR, e organização em GRDTs

O problema: apenas 26% das funcionalidades foram migradas, e o núcleo de processamento (validação, OCR, organização) não foi implementado. Precisávamos decidir como estruturar o código novo para suportar ambos os domínios.

---

## Decisão

Adotamos **Opção C: Abordagem Híbrida** com as seguintes características:

### 1. Separação Lógica (Bounded Contexts)
- Mesma aplicação Next.js
- Mesma instância Supabase
- Mesmas tabelas de banco (sem separação de schemas físicos)
- **Separação via estrutura de pastas e service layer**

### 2. Comunicação Event-Driven
- Event Bus interno (in-process)
- Eventos tipados (TypeScript)
- Desacoplamento via pub/sub

### 3. UX Híbrida (Wizard + Tabs)
- Wizard para setup inicial (DCS)
- Tabs para operações de validação (DV integrado)
- Separação arquitetural invisível para o usuário

### 4. Ownership de Dados

| Entidade                   | Owner | Observação                                |
| -------------------------- | ----- | ----------------------------------------- |
| contracts                  | DCS   | Gerenciado pelo DCS                       |
| manifest_items             | DCS   | + coluna grdt_number (preenchida pelo DV) |
| validated_documents        | DV    | Criado e gerenciado pelo DV               |
| validation_batches (GRDTs) | DV    | Responsabilidade do DV                    |
| validation_jobs            | DV    | Jobs de processamento                     |
| extraction_results         | DV    | Resultados de OCR                         |

---

## Alternativas Consideradas

### Opção A: Separação Apenas Lógica (Rejeitada)
- Módulos separados sem padrão claro de comunicação
- ❌ Risco de acoplamento implícito ao longo do tempo

### Opção B: Microserviços (Rejeitada)
- Dois serviços independentes com APIs REST/gRPC
- ❌ Overhead operacional excessivo para equipe de 1 dev
- ❌ Complexidade de deployment desproporcional

### Opção C: Híbrido (Aceita)
- Melhor dos dois mundos
- ✅ Escalável se necessário extrair para microserviço futuro
- ✅ Desenvolvimento ágil com fronteiras claras

---

## Consequências

### Positivas
- **Manutenibilidade:** Código organizado por domínio facilita debugging
- **Testabilidade:** Services isolados podem ser testados independentemente
- **Escalabilidade futura:** Possível extrair DV para worker/microserviço se necessário
- **Clareza:** Novas features sabem onde morar (DCS vs DV)

### Negativas
- **Disciplina requerida:** Desenvolvedores devem respeitar fronteiras
- **Event Bus overhead:** Pequeno overhead de abstração (negligenciável)
- **Duplicação potencial:** Alguns patterns podem ser duplicados entre domínios

### Riscos
- **Violação de fronteiras:** Código pode "vazar" entre domínios se não revisado
- **Mitigação:** Code review com checklist de arquitetura

---

## Estrutura de Implementação

```
lib/
├── dcs/                    # Document Control System
│   ├── services/
│   ├── events/
│   └── types/
│
├── validator/              # Document Validator  
│   ├── services/
│   ├── events/
│   └── types/
│
└── events/                 # Infraestrutura compartilhada
    ├── event-bus.ts
    └── event-types.ts
```

---

## Notas Adicionais

### Particularidades Identificadas no Brainstorm

1. **Sem storage de arquivos:** O sistema não armazena arquivos físicos. DV apenas:
   - Processa arquivos em memória
   - Armazena metadados e resultado da validação
   - Gera número da GRDT

2. **Batches = Responsabilidade DV:** Diferente da proposta inicial, a criação e organização de GRDTs é função do Document Validator, não do DCS.

3. **Transferência de dados:** O DV atualiza a coluna `grdt_number` em `manifest_items` (tabela do DCS) via evento `grdt.assigned`.

---

## Referências

- [Brainstorm #001](../brainstorm/001-architecture-separation.md)
- [Gap Analysis](../analysis/gap_analysis.md)
- [Martin Fowler - Bounded Context](https://martinfowler.com/bliki/BoundedContext.html)
- [Microservices.io - Patterns](https://microservices.io/)

---

**Última revisão:** 2026-02-04
