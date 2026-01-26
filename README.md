# SAD App - Sistema de Automação e Validação de Documentos

Aplicação desktop **Local-First** para validação de documentos PDF com sincronização de telemetria em nuvem.

## 🏗️ Arquitetura

### Stack Tecnológica
- **Runtime**: Python 3.11+
- **Interface**: NiceGUI (modo nativo/desktop)
- **Backend**: FastAPI (acoplado no mesmo processo)
- **Banco Local**: SQLite (via SQLModel)
- **Nuvem**: Supabase (telemetria e logs)
- **Build**: Pip + PyInstaller

### Estrutura do Projeto

```
app/
├── core/           # Configurações globais, loggers, constantes
├── domain/         # Modelos de dados e regras de negócio
├── infrastructure/ # Acesso a banco, rede e Supabase
├── ui/             # Interface NiceGUI (componentes e páginas)
└── workers/        # Background tasks (sincronização)
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

### 3. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e configure:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon
```

### 4. Executar aplicação

```powershell
python -m app.main
```

## 📊 Schema do Supabase

### Tabela: `events`

```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID UNIQUE NOT NULL,
    session_id UUID NOT NULL,
    device_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    duration_ms INTEGER,
    files_processed INTEGER,
    error_message TEXT,
    error_stack TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_device_id ON events(device_id);
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

## 🔄 Sincronização (Store-and-Forward)

O sistema implementa sincronização automática:

1. **Eventos são salvos localmente** (SQLite) imediatamente
2. **Worker em background** verifica conexão a cada 60 segundos
3. **Se online**, envia eventos pendentes para Supabase
4. **Se falhar**, silencia o erro e tenta na próxima
5. **Nunca trava** a aplicação principal

### Status de Sincronização

- ✅ **Online + Sincronizado**: Todos os eventos foram enviados
- 🟡 **Online + Pendentes**: Há eventos aguardando envio
- 🔴 **Offline**: Sem conexão, eventos acumulando localmente

## 🛠️ Desenvolvimento

### Executar em modo debug

```powershell
$env:LOG_LEVEL="DEBUG"
python -m app.main
```

### Health Check

Acesse `http://localhost:8080/health` para verificar status.

## 📦 Build (Futuro)

```powershell
pyinstaller build_config.py
```

## 🔒 Privacidade

**O que é logado:**
- ✅ Performance (tempo de processamento)
- ✅ Erros (stack traces)
- ✅ Métricas de uso (quantidade de arquivos)
- ✅ Informações do sistema (OS, memória)

**O que NÃO é logado:**
- ❌ Nomes de arquivos
- ❌ Conteúdo de PDFs
- ❌ Dados pessoais

## 📝 Licença

Proprietário - Uso interno apenas.
