✅ **Migration Atualizada - Agora é Idempotente!**

A migration `002_dev_bypass_policies.sql` foi corrigida para poder rodar múltiplas vezes sem erro.

## O que mudou?

Adicionei `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`:

```sql
-- Antes (causava erro se já existisse)
CREATE POLICY "public_select_demo_company" ON companies...

-- Agora (remove se existir, depois cria)
DROP POLICY IF EXISTS "public_select_demo_company" ON companies;
CREATE POLICY "public_select_demo_company" ON companies...
```

## 🚀 Aplicar Agora

1. **Copie TODO** o conteúdo atualizado de:
   ```
   doc-flow-web/supabase/migrations/002_dev_bypass_policies.sql
   ```

2. **No Supabase Dashboard**:
   - Vá para: https://app.supabase.com/project/egfaojisslxiqixggmjs/sql
   - Cole e execute

3. **Deve completar sem erros agora!** ✅

4. **Reinicie o servidor**:
   ```powershell
   # Ctrl+C para parar
   npm run dev
   ```

5. **Teste**: http://localhost:3000

---

## ✅ Resultado Esperado

A página deve carregar mostrando:
- Título: "Contrato de Exemplo"
- Empresa: "Demo Company"
- Estatísticas (Total, Validados, etc.)
- Sem erros! 🎉
