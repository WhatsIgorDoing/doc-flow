# 🎨 Relatório de Auditoria UX/UI: Doc Flow

**Data**: 05/02/2026
**Auditor**: Lead Product Designer Persona
**Escopo**: Dashboard, Resolução, Lotes

---

## 🧐 Resumo Executivo
A interface do Doc Flow apresenta uma **maturidade estética alta**, utilizando padrões modernos (Cards, Badges, Skeletons) que transmitem confiança. A arquitetura de informação é geralmente clara, mas existem **pontos de atrito na tomada de decisão** (especialmente na criação de lotes) e **falhas de acessibilidade em elementos interativos**. O sistema é funcional, mas perde oportunidades de ser "guiado" em momentos críticos.

---

## 🔪 A Dissecação ("Table of Shame")

| Localização           | Problema Identificado                                                                                                | Princípio Violado               | Gravidade (1-5) | Sugestão de Correção                                                                                   |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------- | :------------------------------ | :-------------- | :----------------------------------------------------------------------------------------------------- |
| **Batches/Card**      | Botões de Editar/Excluir são apenas ícones sem `aria-label`.                                                         | **Acessibilidade (WCAG 4.1.2)** | 5 (Crítico)     | Adicionar `aria-label="Editar Lote"` e `aria-label="Excluir Lote"`.                                    |
| **Batches/Page**      | Duas ações primárias de criação ("Novo Vazio" vs "Criar com Seleção") competindo por atenção em locais distantes.    | **Lei de Hick (Decisão)**       | 3 (Médio)       | Unificar em um único botão "Novo Lote" que abre Dialog perguntando o tipo ou inferindo pela seleção.   |
| **Resolution/Dialog** | Lista de candidatos mostra muitos itens sem agrupamento visual claro ou paginação óbvia se houver muitos resultados. | **Carga Cognitiva**             | 2 (Baixo)       | Adicionar cabeçalhos de seção (ex: "Sugestões de IA" vs "Outros") ou limitar a 5-7 itens inicialmente. |
| **Resolution/Dialog** | Cores de Similaridade (Verde/Amarelo/Vermelho) baseadas em thresholds rígidos sem legenda explícita.                 | **Reconhecimento vs Lembrança** | 2 (Baixo)       | Adicionar Tooltip no percentual explicando o nível de confiança.                                       |
| **Dashboard/Stats**   | Cards de estatística usam ícones com opacidade 50% (`opacity-50`). Pode ter baixo contraste em monitores ruins.      | **Contraste (Visibilidade)**    | 2 (Baixo)       | Aumentar opacidade ou usar uma tintura da cor primária (`bg-blue-100` em vez de opacidade).            |
| **Dashboard**         | O Card "Confiança das Validações" usa números crus grandes. Difícil de comparar proporções rapidamente.              | **Gestalt (Semelhança)**        | 3 (Médio)       | Substituir ou complementar com um Mini-Gráfico de Barras ou Pizza para leitura visual rápida.          |

---

## ✨ Oportunidades de "Delight" (O Fator Uau)

### 1. A Celebração do "Zero Inbox"
**Onde**: `ValidationDashboard` -> Card de Ações Rápidas.
**Ideia**: Quando `unresolvedCount === 0` e `unassignedCount === 0`, o estado atual ("Tudo em dia!") é estático.
**Sugestão**: Adicionar uma micro-animação sutil (ex: confetes discretos ou o ícone de Check pulsando uma vez) ao carregar a página nesse estado "limpo". Isso recompensa o usuário pelo trabalho feito.

### 2. Transição Fluida no "Drag & Drop" (Futuro)
**Onde**: `BatchesPage`.
**Ideia**: Atualmente a seleção é via Checkbox.
**Sugestão**: Permitir arrastar um documento da lista de "Disponíveis" para um Card de Lote existente. Isso transformaria uma tarefa administrativa (checkbox -> menu -> salvar) em uma interação física e satisfatória.

### 3. Feedback Humano na Resolução
**Onde**: `ResolutionDialog`
**Ideia**: Ao associar um documento com alta confiança (>90%).
**Sugestão**: Toast de sucesso dizendo "Match perfeito! Documento associado." em vez de apenas "Documento resolvido". Humanizar a resposta do sistema aumenta a sensação de parceria com a IA.

---

## ✅ Veredito Final
O sistema está **pronto para Release Candidate**, desde que as falhas de acessibilidade (botões sem label) sejam corrigidas. As questões de Lei de Hick e Gestalt são melhorias de usabilidade para o roadmap (Sprint 5/6), não bloqueantes.

**Aprovação de Design**: ⚠️ **Aprovado com Ressalvas (Corrigir A11y)**.
