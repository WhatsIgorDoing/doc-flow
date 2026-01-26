# 🎯 Resumo Visual - Análise de Negócio SAD_APP v2.0

**Data:** 26/01/2026  
**Tipo:** Quick Reference Guide  

---

## ⚡ Funcionalidade Core (1 Frase)

> **"Automatiza a validação, reconciliação e organização de documentos técnicos em lotes balanceados, comparando arquivos físicos contra um manifesto Excel e extraindo códigos via OCR quando necessário."**

---

## 🏗️ Modelo de Domínio Simplificado

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE DADOS                           │
└─────────────────────────────────────────────────────────────┘

    📄 Manifesto Excel              📁 Arquivos no Disco
    (Fonte da Verdade)              (Realidade Física)
           │                                │
           │                                │
           ▼                                ▼
    ┌──────────────┐              ┌──────────────────┐
    │ ManifestItem │              │ DocumentFile     │
    │──────────────│              │──────────────────│
    │ • code (PK)  │◄─────────────│ • path           │
    │ • revision   │  associação  │ • size_bytes     │
    │ • title      │              │ • status (Enum)  │
    │ • metadata   │              │ • manifest_item  │
    └──────────────┘              └────────┬─────────┘
                                           │
                                           │ agrupamento
                                           │ por code
                                           ▼
                                  ┌─────────────────┐
                                  │ DocumentGroup   │
                                  │─────────────────│
                                  │ • document_code │
                                  │ • files[]       │
                                  └────────┬────────┘
                                           │
                                           │ balanceamento
                                           │ greedy
                                           ▼
                                  ┌─────────────────┐
                                  │ OutputLot       │
                                  │─────────────────│
                                  │ • lot_name      │
                                  │ • groups[]      │
                                  └─────────────────┘
```

---

## 🔄 Ciclo de Vida do Documento

```
┌───────────────┐
│ UNVALIDATED   │ ◄─── Estado inicial (arquivo descoberto)
└───────┬───────┘
        │
        │ UC-01: Validação
        │
    ┌───▼────────────────┐
    │  Encontrado no     │
    │  manifesto?        │
    └───┬───────────┬────┘
        │           │
       SIM         NÃO
        │           │
        ▼           ▼
┌─────────────┐  ┌──────────────┐
│ VALIDATED   │  │ UNRECOGNIZED │
└─────────────┘  └──────┬───────┘
                        │
                        │ UC-02: Resolução
                        │
                  ┌─────▼────────────┐
                  │ Código extraído  │
                  │ via OCR?         │
                  └──────┬──────┬────┘
                         │      │
                       SIM    FALHA
                         │      │
                         ▼      ▼
                  ┌─────────┐ ┌───────┐
                  │VALIDATED│ │ ERROR │
                  └─────────┘ └───────┘
```

---

## 📊 3 Use Cases Principais

### **UC-01: Validar Lote** ✅
**Input:** Manifesto Excel + Diretório  
**Output:** (validados[], não_reconhecidos[])  
**Lógica:** Comparação nome_base ↔ document_code  

### **UC-02: Resolver Exceção** 🔍
**Input:** Arquivo UNRECOGNIZED + Perfil (RIR/PID)  
**Output:** DocumentFile (VALIDATED ou ERROR)  
**Lógica:** OCR → Regex → Sanitização → Busca no manifesto  

### **UC-03: Organizar Lotes** 📦
**Input:** validados[] + Parâmetros de lote  
**Output:** Lotes balanceados em diretórios  
**Lógica:** Agrupar → Balancear → Mover → Gerar manifesto  

---

## ⚙️ Regras de Negócio Críticas (Top 6)

### **RN-001: Normalização de Nome**
```
Arquivo: "DOC-123_Rev0.pdf"
Remove: _Rev0, _A, _B, _final, _temp, etc.
Resultado: "DOC-123"
```
**Por quê:** Arquivos têm sufixos que não aparecem no manifesto.

---

### **RN-002: Critério de Validação**
```python
if nome_base_normalizado == manifesto[document_code]:
    status = VALIDATED
else:
    status = UNRECOGNIZED
```
**Condição:** Correspondência exata (case-sensitive).

---

### **RN-005: Agrupamento**
```
Arquivos com mesmo document_code → mesmo DocumentGroup
Exemplo:
- DOC-123_A.pdf ─┐
- DOC-123_B.pdf ─┼─► DocumentGroup("DOC-123")
- DOC-123_C.pdf ─┘
```

---

### **RN-006: Balanceamento Greedy**
```
1. Ordenar grupos por tamanho (maior → menor)
2. Calcular num_lots = ceil(total_grupos / max_docs_per_lot)
3. Para cada grupo:
   • Adicionar ao lote mais leve (menor total_bytes)
```
**Objetivo:** Minimizar diferença de tamanho entre lotes.

---

### **RN-007: Nomenclatura com Revisão**
```
original: "documento.pdf"
revision: "A"
resultado: "documento_A.pdf"
```
**Se já existir:** Não duplica.

---

### **RN-010: Limite de Grupos vs. Arquivos**
```
max_docs_per_lot = 2

Lote pode ter:
- Grupo 1: 5 arquivos
- Grupo 2: 3 arquivos
→ 2 grupos ✅ (não 8 arquivos)
```
**Importante:** Limite conta **DocumentGroup**, não arquivos.

---

## 🎲 Estados Possíveis de `DocumentFile`

| Status         | Significado | Quando Ocorre                            |
| -------------- | ----------- | ---------------------------------------- |
| `UNVALIDATED`  | Inicial     | Arquivo descoberto, não processado       |
| `VALIDATED`    | Sucesso     | Encontrado no manifesto (UC-01 ou UC-02) |
| `UNRECOGNIZED` | Exceção     | Não encontrado no manifesto (UC-01)      |
| `ERROR`        | Falha       | OCR falhou ou código não existe (UC-02)  |

---

## 📐 Relações de Cardinalidade

```
ManifestItem (1) ──── (0..1) DocumentFile
   "Um item do manifesto pode estar associado a zero ou um arquivo"

DocumentFile (N) ──── (1) DocumentGroup
   "Vários arquivos pertencem a um grupo"

DocumentGroup (N) ──── (1) OutputLot
   "Vários grupos pertencem a um lote"
```

---

## 🔍 Perfis de Extração (OCR)

| Perfil      | Tipo de Documento    | Padrão Regex                             |
| ----------- | -------------------- | ---------------------------------------- |
| **RIR**     | Registro de Inspeção | `[A-Z0-9]+_[A-Z0-9]+_..._RIR_[A-Z0-9-]+` |
| **PID**     | Diagrama P&ID        | `[A-Z0-9]+_[A-Z0-9]+_..._PID_[A-Z0-9-]+` |
| **GENERIC** | Qualquer             | `Código do Documento:\s*([A-Z0-9_-]+)`   |

**Configurável via:** `config/patterns.yaml`

---

## 🎯 Invariantes de Domínio

1. **Todo VALIDATED tem manifest_item** (não pode ser null)
2. **document_code é único** no manifesto
3. **path é sempre Path** (garantido por `__post_init__`)
4. **total_size_bytes é calculado** (property, sempre atualizado)
5. **Lote nunca excede max_docs_per_lot** grupos

---

## 💡 Exemplo Prático Completo

### **Entrada:**

**Manifesto Excel:**
```
document_code            | revision | title
──────────────────────────────────────────────
DOC-001-RIR              | A        | RIR Válvula X
DOC-002-PID              | B        | P&ID Linha Y
```

**Arquivos no Disco:**
```
📁 /input/
  ├─ DOC-001-RIR_A.pdf       ← Nome corresponde (após normalização)
  ├─ DOC-002-PID_Rev0.pdf    ← Nome não corresponde exato
  └─ UNKNOWN-FILE.pdf        ← Nome desconhecido
```

### **Processamento:**

#### **UC-01: Validação**
```
DOC-001-RIR_A.pdf:
  • Nome base: "DOC-001-RIR" (remove _A)
  • Busca manifesto: ✅ Encontrado
  • Status: VALIDATED
  • associated: ManifestItem("DOC-001-RIR")

DOC-002-PID_Rev0.pdf:
  • Nome base: "DOC-002-PID" (remove _Rev0)
  • Busca manifesto: ✅ Encontrado
  • Status: VALIDATED
  • associated: ManifestItem("DOC-002-PID")

UNKNOWN-FILE.pdf:
  • Nome base: "UNKNOWN-FILE"
  • Busca manifesto: ❌ Não encontrado
  • Status: UNRECOGNIZED
```

#### **UC-02: Resolução de UNKNOWN-FILE.pdf**
```
1. Extrair texto: "Este documento é RIR. Código: DOC-001-RIR"
2. Aplicar regex (perfil RIR): Encontrado "DOC-001-RIR"
3. Sanitizar: "DOC-001-RIR" (sem mudanças)
4. Buscar manifesto: ✅ Encontrado
5. Status: VALIDATED ✅
6. associated: ManifestItem("DOC-001-RIR")
```

#### **UC-03: Organização**
```
Arquivos validados:
- DOC-001-RIR_A.pdf (100KB)
- DOC-002-PID_Rev0.pdf (80KB)
- UNKNOWN-FILE.pdf (50KB)

Agrupamento:
- Grupo 1: DOC-001-RIR [2 arquivos: DOC-001-RIR_A.pdf, UNKNOWN-FILE.pdf]
- Grupo 2: DOC-002-PID [1 arquivo: DOC-002-PID_Rev0.pdf]

Balanceamento (max_docs = 2):
- Lote 1: [Grupo 1, Grupo 2] = 2 grupos ✅

Estrutura Final:
📁 /output/
  └─ LOTE-0001-PROJETO/
      ├─ DOC-001-RIR_A.pdf
      ├─ UNKNOWN-FILE_A.pdf        ← Renomeado com revisão
      ├─ DOC-002-PID_B.pdf          ← Renomeado com revisão
      └─ LOTE-0001-PROJETO.xlsx     ← Manifesto do lote
```

---

## 📈 Complexidade de Negócio

| Aspecto               | Avaliação                                |
| --------------------- | ---------------------------------------- |
| **Entidades**         | 🟢 Simples (5 entidades)                  |
| **Relacionamentos**   | 🟢 Claros (sem muitos-para-muitos)        |
| **Regras de Negócio** | 🟡 Média (12 regras, bem definidas)       |
| **Fluxos**            | 🟢 Lineares (poucos desvios condicionais) |
| **Domínio**           | 🟢 Bem definido (gestão documental)       |

**Score Final:** 🟢 **BAIXA-MÉDIA Complexidade**

---

## ✅ Checklist de Compreensão

Para validar se você entendeu o domínio, responda:

- [ ] Qual a diferença entre `ManifestItem` e `DocumentFile`?
- [ ] Por que alguns arquivos ficam `UNRECOGNIZED`?
- [ ] Como funciona a normalização de nome (RN-001)?
- [ ] Qual o critério de agrupamento (RN-005)?
- [ ] O que o balanceador minimiza?
- [ ] Por que adiciona revisão ao nome do arquivo?
- [ ] Qual a diferença entre documento e arquivo?
- [ ] Quais tipos de perfis de extração existem?
- [ ] O que é um lote órfão (RN-009)?
- [ ] Por que max_docs conta grupos, não arquivos?

Se respondeu todas: **Você domina o domínio!** 🎉

---

*Para análise completa, consultar: `10_analise_negocio.md`*
