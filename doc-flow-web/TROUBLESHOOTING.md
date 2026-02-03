# ⚠️ Solução para Erro de Conexão TLS com Supabase

## 🔴 Problema Identificado

**Erro**: `TypeError: fetch failed - Client network socket disconnected before secure TLS connection was established (ECONNRESET)`

**Causa Mais Provável**: Seu projeto Supabase está **PAUSADO** ou **INATIVO**.

---

## ✅ Solução: Reativar o Projeto Supabase

### Passo 1: Verificar Status do Projeto

1. **Acesse o Supabase Dashboard**
   - Vá para: https://app.supabase.com/projects
   - Faça login com sua conta

2. **Localize seu projeto**
   - Procure por: `egfaojisslxiqixggmjs` ou `doc-flow`
   
3. **Verifique o status**
   - Se estiver com indicador **"Paused"** ou **"Inactive"** → Seu projeto está pausado
   - Projetos gratuitos são pausados após 7 dias de inatividade

### Passo 2: Reativar o Projeto (se estiver pausado)

1. **Clique no projeto pausado**

2. **Clique em "Restore project"** ou **"Unpause"**
   - Isso pode levar alguns minutos
   - Aguarde até que o status mude para **"Active"**

3. **Aguarde a inicialização completa**
   - O projeto pode levar de 1-5 minutos para ficar totalmente online
   - Você verá uma mensagem de sucesso quando estiver pronto

### Passo 3: Testar a Conexão

Após reativar, teste novamente:

```powershell
# No terminal, na pasta doc-flow-web
node test-supabase.js
```

**Resultado esperado**:
```
✅ Companies found: 1
   First company: { id: '...', name: 'Demo Company', ... }
✅ Contract found: { id: '...', name: 'Contrato de Exemplo', ... }
```

### Passo 4: Testar a Aplicação

```powershell
# Se o dev server não estiver rodando
npm run dev
```

Acesse: http://localhost:3000

---

## 🔧 Soluções Alternativas (Se o problema persistir)

### Opção 1: Criar um Novo Projeto Supabase

Se o projeto estiver com problemas ou foi deletado:

1. Vá para https://app.supabase.com
2. Clique em **"New Project"**
3. Escolha:
   - **Name**: `doc-flow`
   - **Database Password**: (crie uma senha forte)
   - **Region**: Escolha a mais próxima (Brazil East ou US East)
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos para o projeto ser criado
6. **Atualize o `.env.local`** com as novas credenciais:
   - Vá em **Settings** → **API**
   - Copie a **Project URL** e **anon/public key**
   - Atualize `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Opção 2: Verificar Firewall/Antivírus

Se o projeto está ativo mas ainda há erro:

1. **Desabilite temporariamente o antivírus**
2. **Adicione exceção para Node.js** no firewall do Windows
3. **Teste em outra rede** (celular hotspot) para verificar se é problema de rede corporativa

### Opção 3: Usar SQLite Local (Desenvolvimento)

Se quiser desenvolver offline sem depender do Supabase:

1. **Instale o SQLite**:
   ```powershell
   npm install better-sqlite3
   ```

2. **Crie adaptador local** (posso ajudar com isso se necessário)

---

## 📋 Checklist de Verificação

Antes de pedir ajuda, verifique:

- [ ] Projeto Supabase está **ACTIVE** (não pausado)
- [ ] `.env.local` tem as credenciais corretas
- [ ] Você consegue acessar https://egfaojisslxiqixggmjs.supabase.co no navegador
- [ ] Não há firewall bloqueando Node.js
- [ ] Migrations foram aplicadas no projeto Supabase
- [ ] Dev server foi reiniciado após mudanças no `.env.local`

---

## 🆘 Ainda com Problema?

Se ainda estiver com erro após reativar o projeto:

1. **Compartilhe a saída completa de**:
   ```powershell
   node test-supabase.js
   ```

2. **Verifique no Dashboard do Supabase**:
   - Vá em **Database** → **Tables**
   - Confirme que as tabelas `companies` e `contracts` existem
   - Verifique se há dados na tabela `companies`

3. **Teste a API REST diretamente**:
   - No Dashboard, vá em **API** → **API Docs**
   - Teste os endpoints REST para confirmar que estão respondendo

---

**TL;DR**: Seu projeto Supabase provavelmente está **pausado**. Vá para https://app.supabase.com, clique no projeto e **restore/unpause**. Aguarde 1-5 minutos e teste novamente.
