"""
Componente de indicador de status (Health Check).
"""
from nicegui import ui
from app.core.constants import ConnectionStatus


class StatusIndicator:
    """Indicador visual de status de conexão."""
    
    def __init__(self):
        self.status_label = None
        self.status_icon = None
    
    def render(self) -> ui.row:
        """
        Renderiza o componente.
        
        Returns:
            Container do componente
        """
        with ui.row().classes('items-center gap-2') as container:
            self.status_icon = ui.icon('circle', size='xs')
            self.status_label = ui.label('Verificando...')
        
        return container
    
    def update(self, status: ConnectionStatus, pending_count: int = 0) -> None:
        """
        Atualiza o status visual.
        
        Args:
            status: Status da conexão
            pending_count: Quantidade de eventos pendentes
        """
        if not self.status_icon or not self.status_label:
            return
        
        if status == ConnectionStatus.ONLINE:
            self.status_icon.props('color=green')
            if pending_count > 0:
                self.status_label.text = f'Online - {pending_count} eventos pendentes'
            else:
                self.status_label.text = 'Online - Sincronizado'
        
        elif status == ConnectionStatus.OFFLINE:
            self.status_icon.props('color=red')
            self.status_label.text = f'Offline - {pending_count} eventos pendentes'
        
        else:  # CHECKING
            self.status_icon.props('color=orange')
            self.status_label.text = 'Verificando conexão...'
