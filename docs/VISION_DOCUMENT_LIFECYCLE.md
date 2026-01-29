# Visão de Produto: Gerenciador do Ciclo de Vida de Documentos (SAD v2)

Este documento define a evolução da plataforma SAD para um **Gerenciador de Ciclo de Vida de Documentos (DLM) Enterprise**, com suporte a múltiplas empresas, contratos e uma hierarquia de governança robusta.

## 🎯 Conceito Central
Uma plataforma Multi-Tenant segura onde grandes corporações gerenciam seus documentos de engenharia e contratos com total isolamento e rastreabilidade. O sistema combina a flexibilidade de um "Excel" com a segurança de um Sistema de Gestão Enterprise.

---

## 🏛️ Governança & Hierarquia Administrativa

O sistema adota uma estrutura piramidal de permissões (**Cascade Permissions**) com 4 Níveis.

### 1. Nível Global (Plataforma)
*   **👑 Super.Admin (Platform God-Mode)**
    *   *Função*: Cria novos "Tenants" (Empresas), gerencia faturamento, monitora saúde global. Acesso irrestrito a logs de auditoria.

### 2. Nível Estratégico (Empresa)
*   **🏢 Company Manager (Administrador da Empresa)**
    *   *Função*: Gerencia todos os Contratos da sua empresa. Define políticas globais (SSO, Logo).

### 3. Nível Tático (Contrato)
*   **👷 Contract Lead (Administrador do Contrato)**
    *   *Função*: O "Dono do Projeto". Configura a Taxonomia, cria Colunas e gerencia os usuários do contrato.
    *   *Matriz de Permissões (Granular)*: Define feature toggles por usuário (ex: "[x] Pode deletar", "[ ] Pode exportar").

### 4. Nível Operacional (Execução)
*   **Controlador (Document Controller)**: Valida, Organiza e gera GRDs.
*   **Colaborador (Alocador)**: Solicita uploads e alocações.
*   **Auditor (Viewer)**: Apenas visualiza.

---

## 🏗 Módulos Funcionais Detalhados

### 1. Autenticação & Acesso (Portão de Entrada)
*   **Multi-Tenant Login**: Identificação automática de empresa.
*   **Seletor de Contexto**: Para usuários que atuam em múltiplos contratos.

### 2. Command Center (Dashboard Nestfi)
O "Cockpit" executivo.
*   **KPIs**: Total Processado, Fila de Sync, Taxa de Rejeição, Eficiência.
*   **Feed de Atividades**: "Usuário X validou Lote Y".
*   **Gráficos**: Fluxo de Entrada, Status da Nuvem.

### 3. Acervo Global (Registry - Estilo Orders)
A "Verdade Única" dos documentos.
*   **Data Grid Flexível**: Tabelas com ordenação, filtro e colunas dinâmicas.
*   **Status Pills**: Badges visuais (Validado, Sincronizando, Erro Hash).
*   **Donos de Documentos**: Campo "Responsável" (Nome/Email).
    *   *Notificações*: E-mails automáticos em caso de Reprovação ou Comentários.

### 4. Módulo de Entrada (O SAD Atual)
*   **Validação Técnica**: Hash, Tamanho, Extensão.
*   **Organização**: Movimentação para pastas padronizadas.
*   **Geração de GRD**: Vinculação automática do Lote a um número de Guia de Remessa.

### 5. Motor de Flexibilidade & Taxonomia 🌟
A ferramenta de adaptação a contratos.
*   **Colunas Customizáveis**: O Contract Lead cria colunas na grid (Texto, Data, Dropdown, Automático).
*   **Regex Engine**: Definição de máscaras de nomenclatura por Tipo de Documento (ex: `CE-{CODIGO}-{ANO}`).
*   **Regras por Grupo**: Associações específicas (ex: "Curriculos tem campos obrigatórios diferentes de Plantas").

### 6. Workflow de Alocações
Gestão de solicitações de terceiros.
*   **Solicitação**: Usuário externo envia arquivo preliminar + metadados.
*   **Aprovação**: Controlador recebe na "Caixa de Entrada", revisa e aprova (vira documento oficial) ou reprova (notifica solicitante).
*   **Trava de Duplicidade**: Sistema impede cadastro de nomes/códigos já existentes.

### 7. Sincronização Externa (Planilhas)
*   **Importador de Status**: Capacidade de ler Excel externo (ex: Fiscalização).
*   **Match Automático**: Cruza dados por Nome/Código e atualiza status no sistema (ex: de "Enviado" para "Aprovado").

---

## 🔐 Segurança & Isolamento (Hard Isolation)

*   **Silos de Dados**: Dados da Empresa X são tecnicamente inacessíveis para Empresa Y.
*   **Audit Log Imutável**: Registro de todas as ações de todos os usuários.

---

## 🚀 Roadmap Consolidado

### Sprint 4: Persistência & Histórico
*   Banco Sqlite Histórico e Tabela Unificada.

### Sprint 5: Dashboard & GRD
*   UI Nestfi, Gráficos e Geração de GRD.

### Sprint 6: Motor de Flexibilidade
*   Editor de Colunas e Validador de Regex.

### Sprint 7: Arquitetura Enterprise
*   Multi-Tenancy, Hierarquia de 4 Níveis e Permissões.

### Sprint 8: Integrações & Workflow
*   Importador Excel, Alocações e Notificações de E-mail.
