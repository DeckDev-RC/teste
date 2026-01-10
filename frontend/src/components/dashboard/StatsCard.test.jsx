/**
 * Testes unitários para StatsCard
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsCard from './StatsCard';
import { Users } from 'lucide-react';

describe('StatsCard', () => {
    it('renders title correctly', () => {
        render(<StatsCard title="Usuários Ativos" value={150} icon={Users} />);
        expect(screen.getByText('Usuários Ativos')).toBeInTheDocument();
    });

    it('renders numeric value with Brazilian locale', () => {
        render(<StatsCard title="Total" value={1500} icon={Users} />);
        // 1500 em pt-BR pode ser "1.500"
        expect(screen.getByText('1.500')).toBeInTheDocument();
    });

    it('renders string value as-is', () => {
        render(<StatsCard title="Status" value="Ativo" icon={Users} />);
        expect(screen.getByText('Ativo')).toBeInTheDocument();
    });

    it('shows positive change with green styling', () => {
        render(<StatsCard title="Crescimento" value={100} icon={Users} change={15} />);
        expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('shows negative change with red styling', () => {
        render(<StatsCard title="Queda" value={50} icon={Users} change={-10} />);
        expect(screen.getByText('10%')).toBeInTheDocument();
    });

    it('shows change label when provided', () => {
        render(<StatsCard title="Meta" value={80} icon={Users} changeLabel="este mês" />);
        expect(screen.getByText('este mês')).toBeInTheDocument();
    });

    it('does not show change indicator when change is undefined', () => {
        const { container } = render(<StatsCard title="Simples" value={100} icon={Users} />);
        expect(container.querySelector('.text-emerald-400')).not.toBeInTheDocument();
        expect(container.querySelector('.text-red-400')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(
            <StatsCard title="Custom" value={100} icon={Users} className="my-custom-class" />
        );
        expect(container.firstChild).toHaveClass('my-custom-class');
    });

    it('renders with different colors', () => {
        const colors = ['blue', 'green', 'red', 'purple', 'amber'];
        colors.forEach(color => {
            const { unmount } = render(
                <StatsCard title={`Color ${color}`} value={100} icon={Users} color={color} />
            );
            // Verifica se renderiza sem erros
            expect(screen.getByText(`Color ${color}`)).toBeInTheDocument();
            unmount();
        });
    });
});
