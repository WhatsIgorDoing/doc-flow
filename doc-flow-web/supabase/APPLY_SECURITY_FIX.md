# Como Aplicar a Migration de Segurança Corrigida

## ✅ Correção Aplicada

O erro foi corrigido! A nova abordagem:

- ❌ **Antes**: Tentava verificar dinamicamente se coluna `user_id` existia (causava erro)
- ✅ **Agora**: Política **fail-secure** que não assume nenhum schema específico

## 🔒 Nova Abordagem de Segurança

**Política 1 - Anônimos (anon)**:
```sql
-- NEGA todo acesso para usuários não autenticados
USING (false);  -- Sempre retorna false = acesso negado
```

**Política 2 - Autenticados (authenticated)**:
```sql
-- Permite APENAS super_admin
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    )
);
```

**Resultado**: Máxima segurança - tabela `events` completamente bloqueada para acesso público.

---

## 📝 Passo a Passo para Aplicar

### 1. Abra o Supabase Dashboard

Vá para: https://app.supabase.com/project/egfaojisslxiqixggmjs

### 2. Vá no SQL Editor

- Menu lateral → **SQL Editor**
- Clique em **New Query**

### 3. Cole a Migration Corrigida

Copie **TODO** o conteúdo de:
```
doc-flow-web/supabase/migrations/003_security_fixes.sql
```

### 4. Execute

- Clique em **Run** (ou Ctrl+Enter)
- Aguarde a execução
- Você deverá ver mensagens:
  ```
  ✅ RLS enabled on public.events table with fail-secure policies
  ✅ Function update_updated_at_column has SECURITY DEFINER
  ```

### 5. Verifique no Advisor

- Vá em **Database** → **Advisors**  
- Aguarde 1-2 minutos (cache)
- Recarregue a página
- Os 3 problemas devem sumir ✅

---

## 🔍 O que foi corrigido?

| Problema              | Correção                                 |
| --------------------- | ---------------------------------------- |
| ❌ Events sem RLS      | ✅ RLS habilitado + políticas restritivas |
| ❌ session_id exposto  | ✅ Acesso público negado (fail-secure)    |
| ❌ search_path mutável | ✅ Path fixo: `public, pg_temp`           |

---

## ⚙️ Customização Futura (Opcional)

Se você precisar permitir acesso à tabela `events` para outros usuários:

1. **Identifique o schema da tabela**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'events';
   ```

2. **Crie políticas apropriadas** baseadas nas colunas reais

3. **Substitua as políticas** criadas por esta migration

Por enquanto, esta abordagem garante **segurança máxima**.

---

## 🆘 Problemas?

Se ainda houver erro:

1. **Compartilhe a mensagem de erro completa**
2. **Verifique que está usando a versão ATUALIZADA** do arquivo `003_security_fixes.sql`
3. **Certifique-se** de que copiou TODO o conteúdo do arquivo
