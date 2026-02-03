# Análise UX/UI e Fluxo de Usuário - SAD Validator v2

## 1. Estado Atual e Correções Imediatas
Durante a revisão inicial, identificamos e corrigimos dois problemas críticos que impediriam qualquer experiência de uso ("Crash on Launch"):
*   ✅ **Bug do `StatusPill`**: A propriedade `sanitize` não suportada no `ui.html` causava erro na inicialização. (Corrigido)
*   ✅ **Injeção de Dependência**: O `ValidationService` falhava ao ser instanciado sem o `db_manager`. (Corrigido)

## 2. Análise de Hierarquia Visual (Impecável)

### Pontos Fortes
*   **Design System**: Uso consistente de tokens (Apple-like colors, shadows).
*   **Layout**: A estrutura "Hero -> Card -> Results" é lógica.
*   **Espaçamento**: Ajustes recentes melhoraram a "respiração" da tela.

### Pontos de Atenção (Refinamento)
1.  **Botão "Iniciar Validação" Desconectado**:
    *   *Problema*: O botão principal está flutuando fora do cartão de input (`GlassCard`), criando uma desconexão visual entre "Configurar Entradas" e "Executar Ação".
    *   *Solução*: Mover o botão para dentro do rodapé do `GlassCard` ou criar uma seção de "Footer" explícita no cartão.

2.  **Feedback de Progresso (UX)**:
    *   *Problema*: O usuário vê apenas um spinner no botão. Se o lote for grande (500+ arquivos), pode parecer que travou.
    *   *Solução*: Adicionar um texto de status dinâmico ("Processando arquivo X de Y..." ou apenas "Analisando...") próximo ao botão.

3.  **Persistência de Status de Sincronização**:
    *   *Problema*: O status "Online/Offline" está apenas no Hero (topo). Ao rolar para ver resultados, o usuário perde essa info crítica.
    *   *Solução*: Considerar um "Sticky Header" ou uma barra de status discreta fixa no rodapé.

## 3. Fluxo de Usuário (User Flow)

### Fluxo Atual:
1.  Landing Dashboard.
2.  Selection: User clicks "Importar Manifesto" -> Native Dialog -> File Selected.
3.  Selection: User clicks "Selecionar Pasta" -> Native Dialog -> Folder Selected.
4.  Action: Click "Iniciar Validação" -> Wait (Spinner) -> Success Toast.
5.  Review: Results list appears below.

### Gaps no Fluxo:
*   **Reset/Nova Validação**: Após terminar, como o usuário limpa a tela para um novo lote? Ele precisa re-selecionar tudo?
    *   *Recomendação*: Adicionar botão "Limpar/Novo Lote" na tela de resultados ou no topo.
*   **Erro de Validação**: Se o Excel estiver corrompido, o `ui.notify` ("Erro: ...") pode ser insuficiente.
    *   *Recomendação*: Usar um Dialog/Modal para erros críticos que impedem o fluxo.

## 4. Plano de Ação Sugerido

Para atingir a experiência "Impecável":

1.  **Integração Visual da Ação**: Mover o `btn_validate` para dentro de um container flexível no rodapé do `GlassCard`.
2.  **Feedback Rico**: Implementar visualização de *Loading* com texto explicativo.
3.  **Sticky Status**: (Opcional por enquanto) Manter o Hero simples, focar na clareza dos Inputs.
