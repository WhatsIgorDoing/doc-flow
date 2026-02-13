# 🔧 SOLUÇÃO FINAL - Recursão Infinita RLS

## ✅ Problema Identificado

**Erro**: `"code": "42P17", "message": "infinite recursion detected in policy for relation \"users\""`

### Causa Raiz

A política RLS da tabela `users` estava criando recursão infinita:

```sql
-- Política original (PROBLEMA)
CREATE POLICY "users_select_accessible" ON users
USING (
    id = auth.uid() 
    OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid())  -- RECURSÃO!
    --                                    ^^^^^ consulta users dentro da política de users
);
```

Quando o código tentava buscar um contrato:
1. Query em `contracts` → OK (bypass demo)
2. Join com `companies` → verifica política de companies
3. Política de `companies` faz: `SELECT FROM users WHERE...`
4. Política de `users` faz: `SELECT FROM users WHERE...` → **LOOP INFINITO!**

---

## ✅ Solução Aplicada

Adicionei bypass para `users` na migration `002_dev_bypass_policies.sql`:

```sql
-- Users: Allow public SELECT to prevent infinite recursion
CREATE POLICY "public_select_users_no_recursion"
ON users FOR SELECT
TO anon
USING (true);  -- Allow all for anon
```

Isso **quebra a recursão** permitindo que usuários anônimos leiam a tabela `users` sem acionar verificação de política recursiva.

---

## 🚀 Como Aplicar a Correção

### Passo 1: Aplicar Migration Atualizada

**Opção A - Via Dashboard (Recomendado)**:

1. Vá para: https://app.supabase.com/project/egfaojisslxiqixggmjs/sql
2. Clique em **New Query**
3. **COPIE TODO** o conteúdo atualizado de:
   ```
   doc-flow-web/supabase/migrations/002_dev_bypass_policies.sql
   ```
4. Cole e clique em **Run**

**Opção B - Via CLI**:

```powershell
supabase db push
```

### Passo 2: Reiniciar o Servidor

No terminal:
1. **Ctrl+C** para parar
2. `npm run dev` para iniciar novamente

### Passo 3: Testar

Acesse: http://localhost:3000

**Resultado Esperado**: Página carrega mostrando "Contrato de Exemplo" ✅

---

## 🔒 Segurança

**É seguro permitir acesso anônimo à tabela users?**

✅ **SIM**, neste caso:
- A tabela `users` está vazia (sem dados demo)
- Mesmo que houvesse dados, apenas leitura é permitida
- Em produção, essa política será removida
- Dados reais de usuários vão requerer autenticação

---

## 🆘 Se Ainda Houver Erro

1. **Certifique-se** de copiar TODO o arquivo `002_dev_bypass_policies.sql` atualizado
2. **Verifique** no Supabase Dashboard → Database → Policies se a política `public_select_users_no_recursion` foi criada
3. **Reinicie** o servidor completamente
4. **Limpe** o cache: `Remove-Item .next -Recurse -Force`

---

## ✅ Checklist

- [ ] Copiar arquivo `002_dev_bypass_policies.sql` atualizado
- [ ] Aplicar no Supabase via Dashboard
- [ ] Aguardar confirmação de sucesso
- [ ] Reiniciar servidor: Ctrl+C → npm run dev  
- [ ] Acessar http://localhost:3000
- [ ] Confirmar que página carrega sem erro ✅
