---
description: Apply migration 005 to enable Supabase Realtime
---

# Aplicar Migration 005 - Real-time Setup

## 📋 Pré-requisitos

- Acesso ao Supabase Dashboard
- Migration 004 já aplicada

## 🚀 Passos

### 1. Acessar SQL Editor

1. Abra [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Navegue para **SQL Editor** (menu lateral)

### 2. Copiar Migration

Copie o conteúdo de `supabase/migrations/005_realtime_setup.sql`

### 3. Executar no Dashboard

1. Cole o SQL no editor
2. Clique em **Run** (ou Ctrl+Enter)
3. Aguarde confirmação de sucesso

### 4. Verificar Realtime

Execute este comando para confirmar:

```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**Resultado esperado**:
```
validated_documents
manifest_items
```

### 5. Testar Realtime (Opcional)

No console do navegador na página de documentos, você deve ver:
```
✅ Realtime subscription active for contract: <id>
```

## ⚠️ Troubleshooting

**Erro: "publication already exists"**
- Normal se já existe
- Ignore e continue

**Erro: "permission denied"**
- Verifique se está usando Service Role Key
- Ou aplique via Supabase Dashboard (recomendado)

---

✅ **Feito!** Realtime está configurado.
