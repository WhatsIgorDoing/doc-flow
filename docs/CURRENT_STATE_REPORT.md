# Relatório do Estado Atual: Doc Flow

## 📌 Visão Geral
Aplicação monolítica (Next.js App Router) focada na validação e organização de documentos técnicos. A arquitetura segue um padrão de Dashboard com navegação por abas contextuais ao contrato.

---

## 🗺️ Fluxos Principais (User Journeys)

### 1. Fluxo de Validação (Coração do Sistema)
**Rota**: `/contracts/[id]/validation`
1.  **Dashboard**: Visão geral estatística (Validados, Erros, Pendentes).
2.  **Upload**: Drag & drop de arquivos (PDF/DWG).
    *   *Backend*: Valida nome do arquivo via Regex contra itens do Manifesto.
3.  **Resultados**: Lista tabular com status de cada arquivo.
    *   *Ação*: Se erro -> Redireciona para Resolução.

### 2. Fluxo de Resolução (Tratamento de Exceções)
**Rota**: `/contracts/[id]/resolution`
1.  **Seleção**: Usuário seleciona um documento "Não Reconhecido".
2.  **Busca/Match**:
    *   *Automático*: OCR sugere candidatos baseados em conteúdo.
    *   *Manual*: Busca textual no manifesto.
3.  **Decisão**: Associar (Match) ou Rejeitar (Lixo).

### 3. Fluxo de Organização (Lotes)
**Rota**: `/contracts/[id]/batches`
1.  **Pool de Pendentes**: Lista de documentos validados mas "soltos".
2.  **Criação**:
    *   *Novo Lote Vazio*.
    *   *Novo Lote com Seleção* (multiselect).
3.  **Gestão**: Adicionar/Remover itens do lote.
4.  **Exportação**: Geração de Pacote ZIP + Excel (Client-side via `jszip`/`exceljs`).

---

## 🏗️ Funcionalidades & Componentes

| Módulo        | Componente Principal             | Estado Atual                              | Pontos de Atenção                                      |
| :------------ | :------------------------------- | :---------------------------------------- | :----------------------------------------------------- |
| **Nav**       | `Components/ContractNav`         | Abas estáticas com ícones `lucide-react`. | Nomes técnicos ("Manifesto", "Lotes").                 |
| **Upload**    | `Validation/FileUploader`        | Card simples com dropzone.                | Sem feedback de progresso detalhado.                   |
| **Resolução** | `Resolution/ResolutionDialog`    | Modal complexo com abas e busca.          | UI densa, recentemente agrupada (Melhoria UX recente). |
| **Dashboard** | `Validation/ValidationDashboard` | Cards de estatísticas + Gráficos (CSS).   | Visual funcional, mas "frio". Uso de Skeletons ok.     |

---

## ⚠️ Análise Crítica (Pré-Zen)

1.  **Vocabulário Técnico**: Termos como "Manifesto", "Batch", "Resolution" geram carga cognitiva.
    *   *Zen Goal*: Mudar para linguagem de fluxo ("Entrada", "Triagem", "Saída").
2.  **Estética "Admin"**:
    *   Muito cinza/branco padrão.
    *   Sombras simples (`shadow-sm`).
    *   Falta de profundidade hierárquica.
3.  **Feedback Passivo**:
    *   O usuário espera "spinners" para tudo.
    *   *Zen Goal*: Optimistic UI (Ação instantânea -> Sincronização background).

---

## 🔒 Segurança & Performance
- **RLS**: Implementado no Supabase (seguro por design).
- **Client-Side Processing**: Heavy lifting (ZIP/Excel) feito no cliente, poupando servidor, mas exige UI robusta de loading.

Este relatório serve como "Snapshot" antes da refatoração Zen.
