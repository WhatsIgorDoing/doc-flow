# Aplicando Migrations no Supabase

## Passo a Passo

### Opção 1: Via Supabase Dashboard (Recomendado para desenvolvimento)

1. **Acesse o Supabase Dashboard**
   - Vá para https://app.supabase.com
   - Faça login e selecione seu projeto `doc-flow`

2. **Abra o SQL Editor**
   - No menu lateral, clique em **SQL Editor**

3. **Aplique a Migration 001 (se ainda não foi aplicada)**
   - Clique em **New Query**
   - Copie todo o conteúdo de `supabase/migrations/001_phase1_schema.sql`
   - Cole no editor
   - Clique em **Run** (ou pressione Ctrl+Enter)
   - Aguarde a confirmação

4. **Aplique a Migration 002 (Nova)**
   - Clique em **New Query**
   - Copie todo o conteúdo de `supabase/migrations/002_dev_bypass_policies.sql`
   - Cole no editor
   - Clique em **Run** (ou pressione Ctrl+Enter)
   - Aguarde a confirmação

5. **Verifique os Dados Demo**
   - No menu lateral, clique em **Table Editor**
   - Selecione a tabela `companies`
   - Verifique se existe o registro com ID `00000000-0000-0000-0000-000000000001`
   - Selecione a tabela `contracts`
   - Verifique se existe o registro com ID `00000000-0000-0000-0000-000000000002`

### Opção 2: Via Supabase CLI

```powershell
# 1. Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# 2. Fazer login
supabase login

# 3. Link com seu projeto
supabase link --project-ref egfaojisslxiqixggmjs

# 4. Aplicar migrations
supabase db push

# 5. Verificar status
supabase migration list
```

## Verificação

Após aplicar as migrations, teste a aplicação:

1. Abra http://localhost:3000
2. A página deve carregar sem erro 404
3. Você deve ver o contrato "Contrato de Exemplo"
4. Se ainda houver erro, a página de erro agora mostrará detalhes úteis

## Troubleshooting

### Erro: "relation already exists"
- Isso significa que a migration 001 já foi aplicada
- Pule para aplicar apenas a migration 002

### Erro: "insufficient privileges"
- Você precisa de permissões de administrador no projeto Supabase
- Verifique se está usando a conta correta

### Erro persiste após aplicar migrations
- Verifique se as variáveis de ambiente em `.env.local` estão corretas
- Reinicie o servidor de desenvolvimento: `npm run dev`
- Limpe o cache do Next.js: `rm -rf .next` e rode `npm run dev` novamente

## Próximos Passos

Após aplicar as migrations com sucesso:
- ✅ A aplicação funcionará sem autenticação para dados demo
- ✅ Dados reais continuam protegidos por RLS
- ℹ️ Para produção, considere remover as políticas de bypass ou os dados demo
