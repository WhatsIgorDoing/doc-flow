# ADR-002: Estratégia de Schema para Campos Extras do Manifesto

## Contexto
O usuário questionou se não seria melhor criar colunas nativas no banco de dados para os campos do Excel (ex: `N-1710`, `Unidade`, `Escopo`), ao invés de usar uma coluna genérica `metadata` (JSONB).

## Análise de Opções

### Opção 1: Colunas Nativas (Table-Per-Discipline Strategy)
Criar colunas para **todos** os campos (`unit`, `scope`, `n1710`, `grdt`, `iso9001`, `pw`...).
*   **Vantagens:** Tipagem forte, validação via banco, queries simples, performance em filtros muito específicos.
*   **Desvantagens:**
    *   **Inchaço da Tabela:** A disciplina "Qualidade" tem 20 campos extras. "Comissionamento" terá outros 15. "Engenharia" outros 10. A tabela `manifest_items` teria ~60 colunas, sendo 40 nulas (sparse) para cada linha.
    *   **Manutenção:** Cada vez que o Excel do cliente muda uma coluna, precisamos de uma Migration de banco e deploy.

### Opção 2: JSONB Total (Current Implementation)
Jogar tudo que não é padrão no campo `metadata`.
*   **Vantagens:** Flexibilidade total. Se o Excel mudar amanhã, o código se adapta sem migration. Schema limpo.
*   **Desvantagens:** Queries complexas (`metadata->>'unit'`). Não garante integridade de dados (ex: salvar texto num campo de data).

### Opção 3: Híbrida (Recomendada)
Promover apenas os campos **Globais e Críticos** para colunas nativas, e manter os **Específicos de Disciplina** no JSONB.

**Campos Candidatos a Coluna Nativa:**
1.  `unit` (Unidade/Área): Usado globalmente para filtros (ex: "Mostrar docs da U-22").
2.  `actual_delivery_date` (Data Efetiva): Crítico para relatórios de atraso (Previsto x Real).
3.  `external_status` (Status SIGEM/Cliente): Importante para saber se o doc foi aprovado na origem.

**Campos Candidatos a JSONB:**
*   `n1710`, `iso9001`, `grdt`, `pw`, `scope`, `purpose`... (São atributos descritivos, raramente usados para filtros globais de performance).

## Plano de Implementação (Proposto)

1.  **Migration 018:** Adicionar colunas:
    *   `unit` (TEXT)
    *   `actual_delivery_date` (DATE)
    *   `external_status` (TEXT)
2.  **Atualizar Imports:** Mapear essas colunas no `templates.ts` e `route.ts`.
3.  **Manter Metadata:** Para todo o resto.

## Visão de Futuro (User-Defined Mapping)
O usuário sugeriu permitir que o próprio cliente mapeie as colunas no futuro (ex: UI onde ele seleciona "Coluna C é Data").

### Análise de Viabilidade
*   **Compatibilidade:** A abordagem de **Metadata (JSONB)** é *essencial* para isso. Não podemos criar colunas físicas via UI do usuário (segurança/performance). Para o usuário criar campos personalizados, eles *precisam* ir para um JSONB.
*   **Por que Híbrido agora?** Mesmo com mapeamento dinâmico, o sistema precisa de "âncoras" fixas para funcionar (ex: para calcular KPI de atraso, o sistema *precisa* saber qual campo é a `actual_delivery_date`).
*   **Conclusão:** A Opção 3 (Híbrida) não bloqueia essa visão. Pelo contrário, ela define os campos que o sistema *exige* (colunas) e deixa o resto livre (metadata), exatamente como um sistema dinâmico precisaria.

## Decisão Requerida
Aprovar a **Opção 3 (Híbrida)**?
Isso nos dá performance agora (colunas indexadas) e flexibilidade para o futuro (metadata para o resto).

Se **SIM**, executarei:
1.  `migrations/018_hybrid_schema.sql` (Adiciona `unit`, `external_status`, etc).
2.  Refatoração final do Backend.
3.  Testes.
