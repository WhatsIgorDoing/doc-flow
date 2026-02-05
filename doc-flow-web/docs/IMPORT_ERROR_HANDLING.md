# Brainstorm & Strategy: Tratamento de Erros na Importação

## 1. O Problema
O usuário está importando grandes volumes de dados (26k+ linhas). Atualmente, itens inválidos são contabilizados, mas o usuário não sabe **quais** são e **por que** falharam.
Precisamos de um mecanismo para informar esses erros de forma que o usuário possa **tratar e reimportar**.

## 2. Cenários e Restrições
-   **Volume:** Pode haver milhares de erros. Exibir em tabela na UI (HTML) causaria lentidão/travamento.
-   **Fluxo:** O usuário precisa corrigir os dados. O melhor lugar para corrigir dados tabulares é no próprio Excel.

## 3. Soluções Propostas

### ❌ Opção A: Visualização em Tabela (UI)
-   Exibir lista de erros num modal.
-   **Contra:** Péssima performance para muitos erros. Difícil de corrigir em massa.

### ❌ Opção B: Apenas Log de Texto
-   Baixar um `.txt` com logs.
-   **Contra:** Usuário teria que caçar a linha no Excel original. Trabalhoso.

### ✅ Opção C: "Relatório de Devolução" (Recomendada)
-   O sistema gera um arquivo Excel (ou CSV) contendo **apenas as linhas que falharam**.
-   Adiciona uma coluna extra: **"Motivo do Erro"** (ex: "Código duplicado", "Data inválida").
-   **Fluxo do Usuário:**
    1.  Importa planilha original.
    2.  Sistema aceita 25.000, rejeita 500.
    3.  Sistema oferece download: `erros_importacao_2024-02-05.xlsx`.
    4.  Usuário abre esse arquivo, lê o motivo, corrige na própria linha e **reimporta esse mesmo arquivo de erros**.
-   **Vantagem:** Ciclo de correção rápido e isolado.

## 4. Plano de Implementação (Orchestration)

### Agente 1: Backend Specialist (`api-routes`)
-   **Tarefa:** Atualizar `confirm/route.ts`.
-   **Lógica:**
    -   Criar array `failedItems`.
    -   Ao validar cada linha, se falhar (ex: sem código, formato errado), adicionar ao array com `reason`.
    -   Retornar no JSON final: `{ count: 25000, errors: [{ doc: 'DOC-01', row: 10, reason: '...' }] }` ou URL de download.
    -   *Obs:* Para 26k linhas, devolver o JSON de erros pode ser pesado. Melhor estratégia: O backend gera o Excel de erros e devolve o STREAM dele se houver erros?
    -   *Refinamento:* O Backend apenas retorna o JSON dos erros (limitado ou paginado? ou assumimos que erros são minoria?). Se erros forem minoria (<1000), JSON resolve. Se forem maioria, melhor streamar.
    -   *Decisão:* Vamos retornar JSON de erros (até um limite seguro, ex: 5000). O Frontend gera o arquivo download para não onerar CPU do servidor.

### Agente 2: Frontend Specialist (`ExcelImportSheet`)
-   **Tarefa:** Atualizar UI de Sucesso/Erro.
-   **Lógica:**
    -   Se `response.errors.length > 0`:
        -   Mostrar alerta: "Importação parcial: X sucessos, Y falhas."
        -   Botão: **"Baixar Relatório de Erros (.xlsx)"**.
    -   Usar `exceljs` no navegador para gerar um Excel com as linhas falhas + Coluna "Erro".

### Agente 3: Test Engineer
-   **Tarefa:** Validar se o arquivo de erros é gerado corretamente e se é possível reimportá-lo após correção (removendo a coluna de erro automaticamente ou ignorando-a).

## 5. Próximos Passos
Aguardando aprovação para iniciar a implementação da **Opção C**.
