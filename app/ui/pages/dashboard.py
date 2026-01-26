"""
Dashboard principal da aplicação.
"""
from nicegui import ui
from app.ui.components.status_indicator import StatusIndicator
from app.workers.sync_worker import sync_worker
from app.core.config import settings


class Dashboard:
    """Dashboard principal."""
    
    def __init__(self):
        self.status_indicator = StatusIndicator()
    
    def render(self) -> None:
        """Renderiza o dashboard."""
        with ui.column().classes('w-full h-full p-8 gap-6'):
            # Header
            with ui.row().classes('w-full items-center justify-between'):
                ui.label(settings.APP_NAME).classes('text-3xl font-bold')
                ui.label(f'v{settings.APP_VERSION}').classes('text-sm text-gray-500')
            
            ui.separator()
            
            # Status Card
            with ui.card().classes('w-full'):
                ui.label('Status do Sistema').classes('text-xl font-semibold mb-4')
                
                with ui.column().classes('gap-4'):
                    # Status de Serviço
                    with ui.row().classes('items-center gap-2'):
                        ui.icon('check_circle', color='green', size='sm')
                        ui.label('Serviço: Aguardando Arquivos')
                    
                    # Status de Conexão
                    self.status_indicator.render()
            
            # Placeholder para funcionalidades futuras
            with ui.card().classes('w-full'):
                ui.label('Validação de Arquivos').classes('text-xl font-semibold mb-4')
                ui.label('Arraste arquivos PDF aqui para validação').classes('text-gray-500')
                ui.button('Selecionar Arquivos', icon='upload_file').props('outlined disabled')
            
            # Footer com informações
            ui.separator()
            
            with ui.row().classes('w-full justify-between text-sm text-gray-500'):
                ui.label(f'Ambiente: {settings.ENVIRONMENT}')
                ui.label('Pronto para uso')
        
        # Timer para atualizar status
        ui.timer(2.0, self._update_status)
    
    def _update_status(self) -> None:
        """Atualiza o status do indicador."""
        status_data = sync_worker.get_status()
        self.status_indicator.update(
            status_data['connection_status'],
            status_data['pending_count']
        )
