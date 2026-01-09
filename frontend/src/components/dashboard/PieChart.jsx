import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Gráfico de pizza para distribuições
 */
export default function PieChart({ data, title, className = '' }) {
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        return (
            <div className={`bg-dark-800/80 rounded-2xl p-6 border border-dark-600 ${className}`}>
                <p className="text-dark-500 text-center">Sem dados disponíveis</p>
            </div>
        );
    }

    const colors = [
        '#38b6ff',   // blue
        '#10b981',   // emerald
        '#a855f7',   // purple
        '#f59e0b',   // amber
        '#ef4444',   // red
        '#ec4899',   // pink
        '#6366f1'    // indigo
    ];

    const entries = Object.entries(data);
    const chartData = {
        labels: entries.map(([key]) => key),
        datasets: [
            {
                label: 'Quantidade',
                data: entries.map(([, value]) => value),
                backgroundColor: colors.slice(0, entries.length).map(c => c + 'cc'), // 80% opacity
                borderColor: '#141414',
                borderWidth: 2,
                hoverOffset: 20,
                hoverBorderColor: 'rgba(229, 229, 229, 0.2)',
                hoverBorderWidth: 4
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%', // High donut feel
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: '#a8a8a8',
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: {
                        family: 'Poppins',
                        size: 11,
                        weight: '600'
                    },
                    padding: 20
                }
            },
            title: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 26, 0.9)',
                backdropFilter: 'blur(10px)',
                titleColor: '#e5e5e5',
                bodyColor: '#a8a8a8',
                borderColor: 'rgba(229, 229, 229, 0.1)',
                borderWidth: 1,
                padding: 12,
                cornerSize: 8,
                titleFont: {
                    family: 'Poppins',
                    size: 13,
                    weight: 'bold'
                },
                bodyFont: {
                    family: 'Poppins',
                    size: 12
                }
            }
        }
    };

    return (
        <div className={`glass rounded-3xl p-8 ${className}`}>
            {title && (
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-bold text-light-100 uppercase tracking-widest">{title}</h3>
                </div>
            )}
            <div style={{ height: '320px' }} className="relative">
                <Pie data={chartData} options={options} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                    <span className="text-[10px] font-bold text-dark-500 uppercase tracking-widest">Total</span>
                    <span className="text-2xl font-bold text-light-100">
                        {entries.reduce((acc, [, val]) => acc + val, 0).toLocaleString('pt-BR')}
                    </span>
                </div>
            </div>
        </div>
    );
}
