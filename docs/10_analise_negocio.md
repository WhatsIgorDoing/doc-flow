# 🎯 Análise de Negócio - SAD_APP v2.0

**Data da Análise:** 26/01/2026  
**Analista:** Technical Business Analyst (Antigravity AI)  
**Foco:** Lógica de Negócio, Entidades e Regras  

---

## 📌 Funcionalidade Core (Resumo em 1 Frase)

**O SAD_APP automatiza a validação, reconciliação e organização de documentos técnicos em lotes balanceados, comparando arquivos físicos contra um manifesto de referência (Excel) e extraindo códigos de documentos não reconhecidos via OCR.**

---

## 🏗️ Mapeamento de Entidades do Domínio

### **Diagrama de Relacionamentos**

```
┌─────────────────────────────────────────────────────────────────┐
│                      DOMÍNIO DE NEGÓCIO                         │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐
    │   ManifestItem       │ ◄─── "FONTE DA VERDADE"
    │   (Registro Excel)   │      (Manifesto de Entrada)
    ├──────────────────────┤
    │ • document_code (PK) │
    │ • revision           │
    │ • title              │
    │ • metadata (Dict)    │
    └──────────────────────┘
             ▲
             │
             │ associado via
             │ validação
             │
    ┌────────┴──────────────┐
    │   DocumentFile        │ ◄─── "ENTIDADE CENTRAL"
    │   (Arquivo Físico)    │      (Realidade no Disco)
    ├───────────────────────┤
    │ • path (Path)         │
    │ • size_bytes          │
    │ • status (Enum)       │
    │ • associated_manifest │ ───────┐
    │   _item (FK)          │        │ 0..1
    └───────────────────────┘        │
             │                       │
             │ N                     │
             │                       │
    ┌────────▼──────────────┐        │
    │   DocumentGroup       │        │
    │   (Grupo Lógico)      │        │
    ├───────────────────────┤        │
    │ • document_code (FK)  │◄───────┘
    │ • files[]             │
    │ • total_size_bytes    │
    └───────────────────────┘
             │
             │ N
             │
    ┌────────▼──────────────┐
    │   OutputLot           │ ◄─── "RESULTADO FINAL"
    │   (Lote de Saída)     │      (Organização)
    ├───────────────────────┤
    │ • lot_name            │
    │ • groups[]            │
    │ • total_size_bytes    │
    └───────────────────────┘

    ┌───────────────────────┐
    │ OrganizationResult    │ ◄─── "OBJETO DE RESPOSTA"
    ├───────────────────────┤      (Relatório)
    │ • lots_created        │
    │ • files_moved         │
    │ • success (bool)      │
    │ • message             │
    └───────────────────────┘
```

---

## 📊 Entidades Principais

### **1. ManifestItem** (Registro do Manifesto)

**É:** A fonte da verdade. Representa um documento esperado conforme o manifesto Excel fornecido pelo cliente/projeto.

**Papel no Negócio:** Define o que deveria existir. É a "lista de compras" dos documentos.

**Atributos:**
- `document_code` **(Chave de Negócio)** - Identificador único do documento (ex: "CZ6_RNEST_U22_3.1.1.1_CVL_RIR_B-22026A")
- `revision` - Versão do documento (ex: "A", "B", "0")
- `title` - Título descritivo do documento
- `metadata` - Campos extras flexíveis (ex: disciplina, propósito)

**Relacionamentos:**
- É **associado opcionalmente** a 0 ou 1 `DocumentFile` após validação bem-sucedida

---

### **2. DocumentFile** (Arquivo Físico)

**É:** A representação de um arquivo real no sistema de arquivos (PDF, DOCX, etc.).

**Papel no Negócio:** É a "realidade" - o que existe de fato no disco.

**Atributos:**
- `path` - Caminho completo do arquivo
- `size_bytes` - Tamanho em bytes
- `status` **(Estado de Negócio)** - Define onde o arquivo está no fluxo:
  - `UNVALIDATED` - Inicial (não processado)
  - `VALIDATED` - Reconhecido e associado ao manifesto
  - `UNRECOGNIZED` - Não encontrado no manifesto (exceção)
  - `ERROR` - Falha no processamento
- `associated_manifest_item` - Referência ao registro do manifesto (FK lógico)

**Relacionamentos:**
- **Pertence a** 0..1 `ManifestItem` (após validação)
- **É membro de** 1 `DocumentGroup` (agrupamento)

**Transições de Estado:**
```
UNVALIDATED ──┬──► VALIDATED (se encontrado no manifesto)
              │
              └──► UNRECOGNIZED (se não encontrado)
                         │
                         └──► VALIDATED (após resolução manual/OCR)
                         │
                         └──► ERROR (se OCR falhar)
```

---

### **3. DocumentGroup** (Grupo de Documentos)

**É:** Um agrupamento lógico de arquivos que pertencem ao mesmo código de documento.

**Papel no Negócio:** Representa um "conjunto de arquivos relacionados". Por exemplo, todas as revisões de um mesmo RIR.

**Atributos:**
- `document_code` - Código que identifica o grupo (herdado do ManifestItem ou do nome do arquivo)
- `files[]` - Lista de arquivos que pertencem ao grupo
- `total_size_bytes` (calculado) - Soma dos tamanhos de todos os arquivos

**Relacionamentos:**
- **Contém** N `DocumentFile`
- **Pertence a** 1 `OutputLot` (após balanceamento)

**Regra de Negócio Crítica:**
> "Um grupo contém TODOS os arquivos com o mesmo `document_code`, independentemente de revisão."

---

### **4. OutputLot** (Lote de Saída)

**É:** Um lote físico de documentos organizados para entrega/processamento.

**Papel no Negócio:** É o "pacote final" que será entregue. Cada lote tem um limite de documentos e deve ser balanceado para distribuir o trabalho de forma equitativa.

**Atributos:**
- `lot_name` - Nome do lote (ex: "LOTE-0001-PROJETO")
- `groups[]` - Lista de grupos de documentos incluídos
- `total_size_bytes` (calculado) - Tamanho total do lote

**Relacionamentos:**
- **Contém** N `DocumentGroup`

**Restrições de Negócio:**
- Número de **grupos** (não arquivos) não pode exceder `max_docs_per_lot`
- Lotes devem ser balanceados por tamanho (bytes) de forma equitativa

---

### **5. OrganizationResult** (Resultado da Operação)

**É:** Um objeto de resposta que reporta o sucesso/falha de uma operação de organização.

**Papel no Negócio:** Feedback para o usuário sobre o que foi processado.

**Atributos:**
- `lots_created` - Quantidade de lotes gerados
- `files_moved` - Quantidade de arquivos movidos
- `success` - Booleano de sucesso
- `message` - Mensagem descritiva

---

## 🔄 Fluxos Críticos de Negócio

### **UC-01: Validar Lote de Documentos**

**Objetivo:** Comparar arquivos no disco com o manifesto Excel para identificar quais estão corretos.

**Fluxo:**

```
┌──────────────────────────────────────────────────────────────┐
│  1. ENTRADA: Manifesto Excel + Diretório de Arquivos        │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  2. Carregar manifesto Excel                                 │
│     → Criar lista de ManifestItem[]                          │
│     → Mapear por document_code para busca rápida             │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Listar todos os arquivos no diretório                    │
│     → Criar DocumentFile[] com status UNVALIDATED            │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  4. Para cada arquivo:                                       │
│     a) Extrair nome base (remover sufixos de revisão)        │
│        Aplicar RN-001: Normalização de Nome                  │
│     b) Buscar no manifesto_map[nome_base]                    │
│     c) SE ENCONTRADO:                                        │
│        • status ← VALIDATED                                  │
│        • associated_manifest_item ← ManifestItem encontrado  │
│        • Adicionar à lista validated_files[]                 │
│     d) SE NÃO ENCONTRADO:                                    │
│        • status ← UNRECOGNIZED                               │
│        • Adicionar à lista unrecognized_files[]              │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  5. SAÍDA: (validated_files[], unrecognized_files[])         │
└──────────────────────────────────────────────────────────────┘
```

**Regras de Negócio Explícitas:**

#### **RN-001: Normalização de Nome de Arquivo**

**Problema:** Arquivos podem ter sufixos de revisão no nome que não aparecem no manifesto.

**Solução:** Remover padrões conhecidos de sufixo antes da comparação.

**Padrões Removíveis:**
```python
# Padrões de revisão aceitos:
- "_A", "_B", "_C" (letras maiúsculas)
- "_Rev0", "_Rev1", "_rev0" (revisões numeradas)
- "_0", "_1", "_2" (números)
- "_final", "_temp", "_old", "_backup", "_draft", "_preliminary"
```

**Exemplo:**
```
Arquivo: "DOC-123_Rev0.pdf"
Nome base extraído: "DOC-123"
Busca no manifesto: manifesto_map["DOC-123"]
```

#### **RN-002: Critério de Correspondência**

**Condição:** Um `DocumentFile` é considerado **VALIDATED** se, e somente se:

1. Seu nome base (após normalização) **existe** como `document_code` no manifesto
2. A correspondência é **exata** (case-sensitive)

**Caso contrário:** O arquivo é marcado como **UNRECOGNIZED** (exceção).

---

### **UC-02: Resolver Arquivo Não Reconhecido**

**Objetivo:** Tentar extrair o código de um documento não reconhecido através de OCR/Text Extraction.

**Contexto de Negócio:** Alguns documentos têm o código impresso no conteúdo (ex: RIR, PID), mas o nome do arquivo não segue o padrão.

**Fluxo:**

```
┌──────────────────────────────────────────────────────────────┐
│  1. ENTRADA: DocumentFile (UNRECOGNIZED) + Perfil de Extração│
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  2. Extrair texto do arquivo (PDF ou DOCX)                   │
│     → Usar IContentExtractor (PyPDF2/python-docx)            │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Aplicar regex do perfil para encontrar código            │
│     → Usar patterns.yaml (RIR, PID, GENERIC)                 │
│     → Aplicar RN-003: Seleção de Perfil                      │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────┬─────────────────────────────────────────────┐
│  Código        │  Código não                                 │
│  encontrado?   │  encontrado?                                │
└────────┬───────┴───────┬─────────────────────────────────────┘
         │               │
         │ SIM           │ NÃO
         │               │
         ▼               ▼
┌─────────────────┐  ┌────────────────────────────────────────┐
│ 4. Sanitizar    │  │ ERRO: ExtractionFailedError            │
│    código       │  │ → Manter status UNRECOGNIZED           │
│    (RN-004)     │  │ → Requer intervenção manual            │
└────────┬────────┘  └────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  5. Verificar se código existe no manifesto                  │
│     → Buscar no manifesto_map[codigo_sanitizado]             │
└────────┬──────────────────────────────────────┬──────────────┘
         │                                      │
     EXISTE                                 NÃO EXISTE
         │                                      │
         ▼                                      ▼
┌─────────────────┐                  ┌──────────────────────────┐
│ 6. SUCESSO:     │                  │ ERRO: CodeNotInManifest  │
│ • status ←      │                  │ → Código encontrado mas  │
│   VALIDATED     │                  │   não está no manifesto  │
│ • associated    │                  │ → Possível documento     │
│   ← ManifestItem│                  │   fora do escopo         │
└─────────────────┘                  └──────────────────────────┘
```

**Regras de Negócio Explícitas:**

#### **RN-003: Seleção de Perfil de Extração**

**Problema:** Diferentes tipos de documentos têm formatos de código diferentes.

**Solução:** Usar perfis configuráveis (YAML) com regex específicos.

**Perfis Disponíveis:**

| Perfil      | Documentos                         | Padrão Regex                                                  |
| ----------- | ---------------------------------- | ------------------------------------------------------------- |
| **RIR**     | Registro de Inspeção e Recebimento | `[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+_[0-9.]+_[A-Z]+_RIR_[A-Z0-9-]+` |
| **PID**     | Piping and Instrumentation Diagram | `[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+_[0-9.]+_[A-Z]+_PID_[A-Z0-9-]+` |
| **GENERIC** | Qualquer documento                 | `Código do Documento:\s*([A-Z0-9_-]+)`                        |

**Lógica de Aplicação:**
1. Tentar padrões específicos primeiro (RIR, PID)
2. Fallback para GENERIC
3. Se nenhum padrão encontrar, falhar

#### **RN-004: Sanitização de Código Extraído**

**Problema:** Códigos extraídos podem ter sufixos de revisão que não existem no manifesto.

**Solução:** Remover sufixos antes da busca.

**Transformação:**
```python
Código extraído: "DOC-123_A"
Código sanitizado: "DOC-123"
Busca no manifesto: manifesto_map["DOC-123"]
```

**Regex Aplicado:**
```python
re.sub(r'_[A-Z0-9]$', '', codigo, flags=re.IGNORECASE)
```

---

### **UC-03: Organizar e Gerar Lotes de Saída**

**Objetivo:** Agrupar documentos validados em lotes balanceados e gerar estrutura de diretórios + manifestos.

**Contexto de Negócio:** Documentos precisam ser organizados em "pacotes de trabalho" (lotes) para processamento/entrega. Cada lote tem um limite de documentos e deve ter tamanho equilibrado.

**Fluxo:**

```
┌──────────────────────────────────────────────────────────────┐
│  1. ENTRADA: validated_files[] + Parâmetros de Lote          │
│     • max_docs_per_lot (limite de grupos por lote)           │
│     • output_directory (destino)                             │
│     • lot_name_pattern (ex: "LOTE-XXXX-PROJETO")             │
│     • start_sequence_number (sequência inicial)              │
│     • master_template (template Excel)                       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  2. AGRUPAMENTO (RN-005)                                     │
│     → Agrupar arquivos por document_code                     │
│     → Criar DocumentGroup para cada código único             │
│     → Um grupo pode ter múltiplos arquivos (revisões)        │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  3. BALANCEAMENTO (RN-006)                                   │
│     → Aplicar algoritmo Greedy Lot Balancer                  │
│     → Distribuir grupos em N lotes (calculado)               │
│     → Objetivo: Minimizar diferença de tamanho entre lotes   │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  4. Para cada lote:                                          │
│     a) Gerar nome do lote (substituir XXXX por sequência)    │
│     b) Criar diretório do lote                               │
│     c) Para cada grupo no lote:                              │
│        • Para cada arquivo no grupo:                         │
│          - Aplicar RN-007: Nomenclatura com Revisão          │
│          - Mover arquivo para diretório do lote              │
│     d) Gerar manifesto Excel do lote (RN-008)                │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  5. SAÍDA: OrganizationResult                                │
│     • lots_created: N                                        │
│     • files_moved: M                                         │
│     • success: true                                          │
└──────────────────────────────────────────────────────────────┘
```

**Regras de Negócio Explícitas:**

#### **RN-005: Critério de Agrupamento**

**Definição:** Todos os arquivos com o **mesmo `document_code`** pertencem ao mesmo grupo.

**Consequência:** Um grupo pode conter múltiplas revisões do mesmo documento.

**Exemplo:**
```
Arquivos:
- "DOC-123_A.pdf" → document_code: "DOC-123"
- "DOC-123_B.pdf" → document_code: "DOC-123"
- "DOC-456_0.pdf" → document_code: "DOC-456"

Grupos criados:
- DocumentGroup(code="DOC-123", files=[DOC-123_A.pdf, DOC-123_B.pdf])
- DocumentGroup(code="DOC-456", files=[DOC-456_0.pdf])
```

#### **RN-006: Algoritmo de Balanceamento (Greedy)**

**Objetivo:** Distribuir grupos em lotes de forma que:
1. Nenhum lote exceda `max_docs_per_lot` grupos
2. A diferença de tamanho (bytes) entre lotes seja minimizada

**Estratégia:**
```
1. Ordenar grupos por tamanho (maior → menor)
2. Calcular número de lotes necessários:
   num_lots = ceil(total_grupos / max_docs_per_lot)
3. Para cada grupo (do maior ao menor):
   • Adicionar ao lote atualmente mais leve (menor total_size_bytes)
```

**Exemplo:**
```
Grupos: [G1: 100MB, G2: 80MB, G3: 60MB, G4: 40MB]
max_docs_per_lot = 2
num_lots = ceil(4/2) = 2

Distribuição:
1. G1 (100MB) → Lote 1 (total: 100MB)
2. G2 (80MB)  → Lote 2 (total: 80MB)
3. G3 (60MB)  → Lote 2 (total: 140MB) ← mais leve no momento
4. G4 (40MB)  → Lote 1 (total: 140MB) ← mais leve no momento

Resultado:
- Lote 1: 140MB (G1 + G4)
- Lote 2: 140MB (G2 + G3)
→ Perfeitamente balanceado
```

**Garantia:** O algoritmo garante que o lote mais pesado nunca será mais que `max_docs_per_lot` grupos, mas não garante balanceamento perfeito de bytes (é uma heurística).

#### **RN-007: Nomenclatura de Arquivo com Revisão**

**Problema:** Arquivos movidos para o lote devem incluir a revisão no nome.

**Regra:** Adicionar `_<revisão>` antes da extensão, exceto se já existir.

**Transformação:**
```python
ANTES:
- Nome original: "documento.pdf"
- Revisão do manifesto: "A"

DEPOIS:
- Nome no lote: "documento_A.pdf"

CASO ESPECIAL (já tem revisão):
- Nome original: "documento_A.pdf"
- Revisão do manifesto: "A"
DEPOIS:
- Nome no lote: "documento_A.pdf" (não duplica)
```

**Implementação:**
```python
def _get_filename_with_revision(original_filename: str, revision: str):
    # Se já termina com _<revision>, não adiciona
    # Caso contrário, insere antes da extensão
```

#### **RN-008: Geração de Manifesto de Lote**

**Objetivo:** Cada lote deve ter um manifesto Excel com metadados dos documentos incluídos.

**Estrutura do Manifesto:**

| Coluna     | Descrição               | Origem                                |
| ---------- | ----------------------- | ------------------------------------- |
| DOCUMENTO  | Código do documento     | `ManifestItem.document_code`          |
| REVISÃO    | Versão                  | `ManifestItem.revision`               |
| TÍTULO     | Título descritivo       | `ManifestItem.title`                  |
| ARQUIVO    | Nome do arquivo no lote | `DocumentFile.path.name`              |
| STATUS     | Estado                  | `DocumentFile.status`                 |
| DISCIPLINA | Metadata                | `ManifestItem.metadata['DISCIPLINA']` |
| TIPO       | Metadata                | (configurável)                        |
| PROPÓSITO  | Metadata                | (configurável)                        |

**Regra de Nomenclatura:**
```
Nome do manifesto = <lot_name>.xlsx
Exemplo: "LOTE-0001-PROJETO.xlsx"
```

---

## 🎲 Regras de Negócio Complementares

### **RN-009: Tratamento de Arquivos Órfãos**

**Cenário:** Arquivo VALIDATED mas sem `associated_manifest_item` (edge case).

**Regra:** Usar o nome base do arquivo (stem) como `document_code` para agrupamento.

**Código:**
```python
if file.associated_manifest_item is None:
    code = file.path.stem  # Nome sem extensão
else:
    code = file.associated_manifest_item.document_code
```

### **RN-010: Limite de Documentos vs. Limite de Arquivos**

**Importante:** `max_docs_per_lot` refere-se a **DocumentGroup** (documentos lógicos), **não arquivos físicos**.

**Exemplo:**
```
max_docs_per_lot = 2

Lote pode conter:
- Grupo 1: 5 arquivos (DOC-123 revisões A, B, C, D, E)
- Grupo 2: 3 arquivos (DOC-456 revisões 0, 1, 2)
→ Total: 2 grupos, 8 arquivos ✅ VÁLIDO
```

### **RN-011: Sequenciamento de Lotes**

**Regra:** Lotes são numerados sequencialmente a partir de `start_sequence_number`.

**Formato:** Substituir "XXXX" no padrão por número com 4 dígitos zero-padded.

**Exemplo:**
```python
lot_name_pattern = "LOTE-XXXX-TESTE"
start_sequence_number = 1

Lotes gerados:
- "LOTE-0001-TESTE"
- "LOTE-0002-TESTE"
- "LOTE-0003-TESTE"
```

### **RN-012: Transatividade da Organização**

**Problema:** Se qualquer operação de arquivo falhar, o sistema pode ficar em estado inconsistente.

**Solução Implementada:** Usar try/catch e retornar `OrganizationResult(success=false)` em caso de erro.

**Limitação Atual:** Não há rollback. Arquivos já movidos permanecerão no destino.

**Recomendação Futura:** Implementar transação com "staging area" e commit/rollback.

---

## 🔍 Invariantes de Domínio

### **Invariantes Garantidas pelo Sistema:**

1. **INV-001:** Todo `DocumentFile` com status `VALIDATED` **DEVE** ter `associated_manifest_item != None`

2. **INV-002:** Todo `ManifestItem.document_code` **DEVE** ser único dentro do manifesto

3. **INV-003:** `DocumentFile.path` **SEMPRE** será um objeto `Path` (garantido por `__post_init__`)

4. **INV-004:** `OutputLot.total_size_bytes` **SEMPRE** reflete a soma dos tamanhos dos grupos (property calculada)

5. **INV-005:** Número de grupos em um `OutputLot` **NUNCA** excede `max_docs_per_lot` (garantido pelo balanceador)

---

## 📋 Resumo Analítico

### **Objetos de Negócio (5 Entidades Principais):**

1. **ManifestItem** - Fonte da verdade (Excel)
2. **DocumentFile** - Realidade física (disco)
3. **DocumentGroup** - Agrupamento lógico (por código)
4. **OutputLot** - Pacote de trabalho (entrega)
5. **OrganizationResult** - Feedback de operação

### **Relacionamentos Chave:**

```
ManifestItem (1) ──────── (0..1) DocumentFile
                                       │
                                       │ (N)
                                       ▼
DocumentGroup (1) ──────────────── (N) DocumentFile
       │
       │ (N)
       ▼
OutputLot (1) ─────────────────── (N) DocumentGroup
```

### **Fluxos de Negócio (3 Use Cases):**

1. **UC-01: Validar Lote** - Reconciliação manifesto ↔ disco
2. **UC-02: Resolver Exceção** - OCR para documentos não reconhecidos
3. **UC-03: Organizar Lotes** - Balanceamento e estruturação

### **Regras de Negócio Críticas (12 RNs):**

| RN         | Descrição                                            |
| ---------- | ---------------------------------------------------- |
| **RN-001** | Normalização de nome de arquivo (remoção de sufixos) |
| **RN-002** | Critério de correspondência exata                    |
| **RN-003** | Seleção de perfil de extração (RIR/PID/GENERIC)      |
| **RN-004** | Sanitização de código extraído                       |
| **RN-005** | Agrupamento por `document_code`                      |
| **RN-006** | Algoritmo Greedy de balanceamento                    |
| **RN-007** | Nomenclatura com revisão                             |
| **RN-008** | Geração de manifesto de lote                         |
| **RN-009** | Tratamento de arquivos órfãos                        |
| **RN-010** | Limite de grupos vs. arquivos                        |
| **RN-011** | Sequenciamento de lotes                              |
| **RN-012** | Transatividade (limitada)                            |

---

## 🎯 Conclusão da Análise

### **Complexidade de Negócio:** 🟡 **MÉDIA**

**Justificativa:**
- Lógica de domínio **bem definida** e **não ambígua**
- Regras de negócio **explícitas** e **testáveis**
- **Poucas dependências entre regras** (baixo acoplamento)
- **Sem lógica condicional complexa** (poucos IFs aninhados)

### **Domínio:** Gestão Documental de Engenharia

**Características:**
- Processo **determinístico** (mesmos inputs → mesmos outputs)
- Regras **baseadas em padrões** (regex, nomenclatura)
- **Heurísticas de otimização** (balanceamento)
- **Tolerância a exceções** (arquivos não reconhecidos)

### **Maturidade do Modelo de Negócio:** 🟢 **ALTA**

**Evidências:**
- ✅ Separação clara entre entidades (SRP)
- ✅ Relacionamentos bem definidos
- ✅ Regras de negócio isoladas em casos de uso
- ✅ Invariantes garantidos pelo design
- ✅ Enums para estados (type-safe)

---

**Fim da Análise de Negócio**

*Este documento mapeia a lógica de domínio independentemente da implementação técnica.*
