import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

/**
 * Gráfico de linha para dados temporais
 */
export default function TimeSeriesChart({ data, title, className = '' }) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className={`glass rounded-3xl p-8 ${className}`}>
                <div className="flex items-center justify-center h-[320px]">
                    <p className="text-dark-500 text-sm">Sem dados disponíveis para este período</p>
                </div>
            </div>
        );
    }

    const chartData = {
        labels: data.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }),
        datasets: [
            {
                label: 'Total',
                data: data.map(item => item.count || 0),
                borderColor: '#38b6ff',
                backgroundColor: 'rgba(56, 182, 255, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#38b6ff',
                pointBorderColor: '#141414',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            },
            {
                label: 'Bem-sucedidas',
                data: data.map(item => item.successful || 0),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: true,
                tension: 0.4
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
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
                boxPadding: 6,
                usePointStyle: true,
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
        },
        scales: {
            x: {
                ticks: {
                    color: '#6b6b6b',
                    font: {
                        family: 'Poppins',
                        size: 10
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
                        family: 'Poppins',
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
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-light-100 uppercase tracking-widest">{title}</h3>
                </div>
            )}
            <div style={{ height: '320px' }}>
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
}
