// ============================================================
//  CHARTS/INDEX.JS — ГРАФИКИ РАСХОДОВ
// ============================================================

import Chart from 'chart.js';
import { CATEGORIES } from '../../core/config.js';

let pieChart = null;
let barChart = null;

// Создать круговую диаграмму
export function createPieChart(expenses, canvasId = 'pieChart') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Группируем по категориям
    const totals = {};
    expenses.forEach(e => {
        const label = CATEGORIES[e.category]?.label || e.category;
        totals[label] = (totals[label] || 0) + e.amount;
    });

    const labels = Object.keys(totals);
    const data = Object.values(totals);

    if (labels.length === 0) {
        labels.push('Нет данных');
        data.push(1);
    }

    // Цвета для диаграммы
    const colors = [
        '#ccff00', '#4ade80', '#3b82f6', '#f59e0b',
        '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'
    ];

    if (pieChart) pieChart.destroy();

    pieChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#030f09',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9ca3af',
                        font: { size: 10 },
                        padding: 8,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            cutout: '65%'
        }
    });

    return pieChart;
}

// Создать столбчатую диаграмму (топ-5 категорий)
export function createBarChart(expenses, canvasId = 'barChart') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Группируем по категориям
    const totals = {};
    expenses.forEach(e => {
        const label = CATEGORIES[e.category]?.label || e.category;
        totals[label] = (totals[label] || 0) + e.amount;
    });

    // Сортируем и берём топ-5
    const sorted = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);

    if (labels.length === 0) {
        labels.push('Нет данных');
        data.push(1);
    }

    if (barChart) barChart.destroy();

    barChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'BYN',
                data: data,
                backgroundColor: 'rgba(204, 255, 0, 0.3)',
                borderColor: 'rgba(204, 255, 0, 0.6)',
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#6b7280',
                        font: { size: 9 },
                        callback: v => v.toFixed(0)
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                x: {
                    ticks: {
                        color: '#6b7280',
                        font: { size: 9 }
                    },
                    grid: { display: false }
                }
            }
        }
    });

    return barChart;
}

// Обновить графики
export function updateCharts(expenses) {
    createPieChart(expenses);
    createBarChart(expenses);
}
