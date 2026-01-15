import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

/**
 * Gráfico de barras para comparações
 */
export default function BarChart({ data, title, label, className = '' }) {
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        return (
            <div className={`bg-dark-800/80 rounded-2xl p-6 border border-dark-600 ${className}`}>
                <p className="text-dark-500 text-center">Sem dados disponíveis</p>
            </div>
        );
    }

    const entries = Object.entries(data);
    const chartData = {
        labels: entries.map(([key]) => key),
        datasets: [
            {
                label: label || 'Quantidade',
                data: entries.map(([, value]) => value),
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, '#38b6ff');
                    gradient.addColorStop(1, 'rgba(56, 182, 255, 0.1)');
                    return gradient;
                },
                borderColor: '#38b6ff',
                borderWidth: 1,
                borderRadius: {
                    topLeft: 12,
                    topRight: 12,
                    bottomLeft: 0,
                    bottomRight: 0
                },
                borderSkipped: false,
                hoverBackgroundColor: '#38b6ff',
                maxBarThickness: 40
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
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
                titleFont: {
                    family: 'Inter, sans-serif',
                    size: 13,
                    weight: 'bold'
                },
                bodyFont: {
                    family: 'Inter, sans-serif',
                    size: 12
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#6b6b6b',
                    font: {
                        family: 'Inter, sans-serif',
                        size: 9
                    }
                },
                grid: {
                    display: false
                }
            },
            y: {
                ticks: {
                    color: '#6b6b6b',
                    font: {
                        family: 'Inter, sans-serif',
                        size: 10
                    },
                    callback: (value) => value.toLocaleString('pt-BR')
                },
                grid: {
                    color: 'rgba(229, 229, 229, 0.05)',
                    drawBorder: false
                },
                beginAtZero: true
            }
        }
    };

    return (
        <div className={`glass rounded-3xl p-8 ${className}`}>
            {title && (
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[11px] font-black text-dark-500 uppercase tracking-[0.2em]">{title}</h3>
                </div>
            )}
            <div style={{ height: '320px' }}>
                <Bar data={chartData} options={options} />
            </div>
        </div>
    );
}
