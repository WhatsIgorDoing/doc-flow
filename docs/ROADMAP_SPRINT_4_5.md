# Roadmap: Sprint 4 e 5

Com base no status atual do projeto e na direção arquitetural (Local-First, Store-and-Forward), aqui está o roadmap proposto.

## 📦 Sprint 4: Empacotamento e Segurança
**Objetivo**: Transformar o script de desenvolvimento em uma aplicação distribuível e segura.

### Tarefas
1. **Configuração de Build (`build_config.py`)**:
   - Configurar PyInstaller para empacotar o interpretador Python e dependências.
   - Definir pontos de entrada e ícones.
   - Garantir que `assets/` e `alembic` (se houver) sejam empacotados corretamente.

2. **Segurança e Privacidade**:
   - Implementar criptografia de dados local (criptografia em repouso para SQLite).
   - Sanitizar logs (garantir ausência de dados pessoais em `logs/`).
   - Finalizar gerenciamento da `SECRET_KEY` para produção.

3. **Pipelines de CI/CD**:
   - Reforçar workflow do GitHub Actions.
   - Adicionar job de "Release" para construir e anexar o artefato `.exe`.

4. **Criação de Instalador** (Opcional):
   - Criar script InnoSetup ou MSI para implantação em Windows.

---

## 🚀 Sprint 5: Lançamento em Produção e Telemetria
**Objetivo**: Habilitar observabilidade completa e operação robusta em produção.

### Tarefas
1. **Integração Supabase (Finalização)**:
   - Habilitar `SUPABASE_ENABLED=true` na build de produção.
   - Verificar sincronização "Store-and-Forward" sob condições de rede instáveis.
   - Implementar estratégias de backoff para retentativas (já no worker, verificar ajuste fino).

2. **Telemetria e Monitoramento**:
   - Criar Dashboard no Supabase para rastreamento:
     - Sessões/dispositivos ativos.
     - Taxas de erro.
     - Vazão (arquivos processados/min).

3. **Mecanismo de Atualização Automática**:
   - Implementar verificação de atualizações na inicialização.
   - UI de notificação quando nova versão estiver disponível.

4. **Ajuste de Performance**:
   - Perfil de uso de memória durante validação de grandes lotes.
   - Otimizar índices SQLite para performance de consulta.

### Futuro/Backlog
- **Suporte a OCR**: Adicionar integração Tesseract/Azure Vision.
- **Sincronização Multi-Usuário**: Sessões compartilhadas (ondas futuras).
