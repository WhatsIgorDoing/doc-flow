# ⚠️ Solução para Erro de Certificado SSL (Windows)

## 🔴 Problema

**Erro**: `unable to get local issuer certificate (UNABLE_TO_GET_ISSUER_CERT_LOCALLY)`

**Causa**: Node.js no Windows não consegue validar o certificado SSL do Supabase.

---

## ✅ Solução Aplicada

Modifiquei o script `dev` no `package.json` para desabilitar a validação de certificado SSL **apenas em desenvolvimento**:

```json
"dev": "set NODE_TLS_REJECT_UNAUTHORIZED=0&& next dev"
```

---

## 🚀 Como Usar

### 1. Reinicie o servidor de desenvolvimento

No terminal atual onde está rodando `npm run dev`, pressione:
- **Ctrl+C** para parar o servidor
  
Depois rode novamente:
```powershell
npm run dev
```

### 2. Teste a aplicação

Abra o navegador em: http://localhost:3000

Agora deve funcionar! ✅

---

## 🔒 Nota de Segurança

> [!WARNING]
> **Apenas para desenvolvimento local!**
> 
> A variável `NODE_TLS_REJECT_UNAUTHORIZED=0` desabilita a validação de certificados SSL.
> 
> **NUNCA use isso em produção!**
> 
> Para produção, use uma das soluções permanentes:
> 1. Configure certificados do Windows corretamente
> 2. Use um ambiente Linux/macOS
> 3. Deploy no Vercel/Netlify (não tem esse problema)

---

## 🔧 Soluções Alternativas (Permanentes)

Se quiser resolver o problema de raiz no Windows:

### Opção 1: Atualizar Certificados do Windows

```powershell
# Execute como Administrador
certutil -generateSSTFromWU roots.sst
```

### Opção 2: Usar WSL2 (Windows Subsystem for Linux)

```powershell
# Instalar WSL2
wsl --install

# Depois, rode o projeto dentro do WSL2
```

### Opção 3: Adicionar Certificado Manualmente

1. Acesse https://egfaojisslxiqixggmjs.supabase.co no navegador
2. Veja o certificado (clique no cadeado)
3. Exporte o certificado raiz
4. Adicione no Node.js com variável `NODE_EXTRA_CA_CERTS`

---

## ✅ Checklist

- [x] Atualizado `package.json` com variável de ambiente
- [ ] Reiniciar servidor: `Ctrl+C` → `npm run dev`
- [ ] Testar: http://localhost:3000
- [ ] Verificar que a página carrega sem erro

---

## 🆘 Ainda com Problema?

Se ainda houver erro após reiniciar:

1. **Verifique** que você parou completamente o servidor (Ctrl+C)
2. **Confirme** que o `package.json` foi atualizado
3. **Limpe o cache** do Next.js:
   ```powershell
   Remove-Item .next -Recurse -Force
   npm run dev
   ```
