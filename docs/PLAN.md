# Plano de Correção do CI/CD

## Diagnóstico
Os logs de erro fornecidos (`test_db_error.txt` e `test_db_error_2.txt`) referem-se a versões anteriores do código.
- **Erro 1**: `AttributeError: 'Settings' object has no attribute 'DATABASE_NAME'` -> O código atual usa `DATABASE_PATH`.
- **Erro 2**: `ValueError: "Settings" object has no field "get_database_path"` -> O código atual faz o patch correto no campo `DATABASE_PATH`, não no método.

A execução local dos testes confirmou que a versão atual do código está estável e passando.

## Ações Propostas

### 1. Limpeza de Artefatos Obsoletos
- Remover `.github/workflows/ci.yml` (Não, o CI é necessário) -> Remover `test_db_error.txt` e `test_db_error_2.txt` da raiz.

### 2. Validação Completa
- Executar a suíte completa de testes locais para garantia final.

### 3. Disparo do CI
- Um novo commit/push disparará o GitHub Actions e deve confirmar o sucesso no CI.

## Plano de Verificação

### Automatizado
Executar o comando:
```bash
python -m pytest tests/
```
**Critério de Sucesso**: Exit Code 0 (Todos os testes passaram).
