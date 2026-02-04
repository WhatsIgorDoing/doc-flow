import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateBatchDialog } from '@/components/batches/create-batch-dialog';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock do hooks se necessário, mas aqui mockamos props
// Se o componente usar hook internamente sem ser via prop, precisa de vi.mock

describe('CreateBatchDialog', () => {
    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        onSubmit: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render dialog correctly', () => {
        render(<CreateBatchDialog {...defaultProps} />);
        // O Dialog do Radix UI renderiza no portal, então screen funciona
        // Mas precisamos garantir que ele está aberto
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Criar Nova GRDT')).toBeInTheDocument();
        expect(screen.getByLabelText(/Nome do Lote/i)).toBeInTheDocument();
    });

    it('should call onSubmit with correct data', async () => {
        render(<CreateBatchDialog {...defaultProps} />);

        // Preencher formulário
        fireEvent.change(screen.getByLabelText(/Nome do Lote/i), { target: { value: 'GRDT Teste' } });
        fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: 'Descrição Teste' } });

        // Submeter
        fireEvent.click(screen.getByRole('button', { name: /Criar GRDT/i }));

        await waitFor(() => {
            expect(defaultProps.onSubmit).toHaveBeenCalledWith({
                name: 'GRDT Teste',
                description: 'Descrição Teste'
            });
        });
    });

    it('button should be disabled if name is empty', () => {
        render(<CreateBatchDialog {...defaultProps} />);
        const submitButton = screen.getByRole('button', { name: /Criar GRDT/i });
        expect(submitButton).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/Nome do Lote/i), { target: { value: 'Test' } });
        expect(submitButton).not.toBeDisabled();
    });
});
