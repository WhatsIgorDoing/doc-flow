# Python Integration Guide - Real-time Validation

## 📋 Overview

Este guia explica como o Python validator deve enviar resultados de validação para  o Next.js API.

---

## 🔑 Setup - API Key

### 1. Adicionar ao `.env.local`

```bash
PYTHON_API_KEY=seu-token-secreto-aqui-min-32-chars
```

**Gerar token seguro**:
```bash
openssl rand -hex 32
```

---

## 📤 Enviar Validações

### Endpoint

```
POST https://your-app.vercel.app/api/validation/submit
```

### Headers

```json
{
  "Content-Type": "application/json",
  "x-api-key": "seu-token-secreto-aqui"
}
```

### Request Body

```json
{
  "contract_id": "uuid-do-contrato",
  "batch_name": "Lote 2026-02-03" (opcional),
  "results": [
    {
      "contract_id": "uuid-do-contrato",
      "document_path": "/caminho/completo/arquivo.pdf",
      "file_name": "DOC-001.pdf",
      "status": "valid",
      "validation_errors": [],
      "validated_at": "2026-02-03T10:30:00Z",
      "metadata": {
        "file_size": 1024000,
        "pages": 5,
        "validator_version": "2.0.0"
      }
    }
  ]
}
```

### Response (Success - 201)

```json
{
  "success": true,
  "inserted": 1,
  "message": "Successfully saved 1 validation results"
}
```

### Response (Error - 400)

```json
{
  "error": "Validation failed",
  "details": [...]
}
```

---

## 🐍 Exemplo Python

```python
import requests
from datetime import datetime
import os

API_URL = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
API_KEY = os.getenv("NEXTJS_API_KEY")

def submit_validation_results(contract_id: str, results: list):
    """
    Submit validation results to Next.js API
    
    Args:
        contract_id: UUID do contrato
        results: Lista de dicionários com resultados
    """
    
    payload = {
        "contract_id": contract_id,
        "batch_name": f"Validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "results": results
    }
    
    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }
    
    try:
        response = requests.post(
            f"{API_URL}/api/validation/submit",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        print(f"Response: {e.response.text}")
        raise
    except Exception as e:
        print(f"Error submitting validation: {e}")
        raise

# Exemplo de uso
if __name__ == "__main__":
    contract_id = "00000000-0000-0000-0000-000000000002"
    
    results = [
        {
            "contract_id": contract_id,
            "document_path": "/docs/contrato_social.pdf",
            "file_name": "contrato_social.pdf",
            "status": "valid",
            "validation_errors": [],
            "validated_at": datetime.utcnow().isoformat() + "Z",
            "metadata": {
                "file_size": 2048000,
                "pages": 10,
                "validator_version": "2.0.0"
            }
        }
    ]
    
    result = submit_validation_results(contract_id, results)
    print(f"✅ Submitted: {result}")
```

---

## 🧪 Testar Localmente

### 1. Preparar Environment

```bash
cd doc-flow-web
npm run dev
```

### 2. Criar `.env` no Python

```bash
NEXTJS_API_URL=http://localhost:3000
NEXTJS_API_KEY=seu-token-do-env-local
```

### 3. Executar Script de Teste

```python
python test_validation_submit.py
```

### 4. Verificar no Frontend

1. Abra `http://localhost:3000/contracts/<id>/documents`
2. Console deve mostrar: `📡 Realtime update`
3. Toast notification aparece
4. Documento aparece na lista

---

## 🔒 Segurança

1. **Nunca** comite a API key no Git
2. Use variáveis de ambiente
3. Rotate keys periodicamente
4. Em produção, adicione rate limiting

---

## 📊 Campos Suportados

| Campo               | Tipo     | Obrigatório | Descrição                     |
| ------------------- | -------- | ----------- | ----------------------------- |
| `contract_id`       | UUID     | ✅           | ID do contrato                |
| `document_path`     | string   | ✅           | Caminho completo do arquivo   |
| `file_name`         | string   | ✅           | Nome do arquivo               |
| `status`            | enum     | ✅           | `valid`, `invalid`, `pending` |
| `validation_errors` | array    | ❌           | Lista de erros (se inválido)  |
| `validated_at`      | datetime | ❌           | ISO 8601 format               |
| `metadata`          | object   | ❌           | Dados adicionais              |

---

✅ **Pronto!** Python pode agora submeter validações em tempo real.
