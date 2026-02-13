# Doc Flow - Sistema de Automação e Validação de Documentos

Aplicação desktop **Local-First** para validação e organização de documentos tecnici (PDFs) basedos em manifestos (Excel).

## 🏗️ Arquitetura

### Stack Tecnológica
- **Runtime**: Python 3.11+
- **Interface**: NiceGUI (modo nativo/desktop)
- **Backend**: FastAPI (acoplado no mesmo processo)
- **Banco Local**: SQLite (via SQLModel)
- **Build**: Pip + PyInstaller

### Estrutura do Projeto

```
app/
├── api/            # Endpoints REST (FastAPI)
├── core/           # Configurações globais e loggers
├── domain/         # Modelos de dados e regras de negócio
├── infrastructure/ # Repositórios (SQLite, Filesystem)
├── services/       # Lógica de aplicação e orquestração
└── ui/             # Interface NiceGUI (componentes e páginas)
```

## 🚀 Instalação

### 1. Criar ambiente virtual

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Instalar dependências

```powershell
pip install -r requirements.txt
```

### 3. Executar aplicação

```powershell
python -m app.main
```

A aplicação abrirá automaticamente no navegador padrão (modo nativo).

## 📊 Funcionalidades

1.  **Validação em Lote**:
    - Importa documentos da LD do Excel (legacy e formato oficial `LD-5290...`).
    - Valida existência e nomenclatura de arquivos PDF associados.
    - Suporta detecção dinâmica de cabeçalhos em planilhas complexas.

2.  **Organização**:
    - Agrupa documentos validados em lotes otimizados (ex: por disciplina ou tamanho).
    - Gera pacotes prontos para submissão.

## 🧪 Testes e QA

O projeto possui uma suíte de testes robusta, incluindo validação com modelos reais.

### Executar todos os testes

```powershell
python -m pytest
```

### Executar Testes de QA (Integração Oficial)

Para verificar a compatibilidade com as planilhas oficiais (`docs/`):

```powershell
python -m pytest tests/integration/test_qa_official_models.py -v
```

Este teste garante que o sistema consegue ler e processar os modelos de engenharia reais, lidando com formatações variadas de cabeçalho.

## 🛠️ Desenvolvimento

### Executar em modo debug

```powershell
$env:LOG_LEVEL="DEBUG"
python -m app.main
```

### Health Check

Acesse `http://localhost:8080/health` para verificar o status do backend.

## 🔒 Privacidade (Local-First)

Toda a operação é realizada localmente na máquina do usuário.
- ❌ Nenhum dado é enviado para a nuvem.
- ❌ Nenhuma telemetria externa.
- ✅ Dados persistidos apenas no SQLite local (`data/app.db`).

## 📝 Licença

Proprietário - Uso interno apenas.
