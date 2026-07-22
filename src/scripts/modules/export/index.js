// ============================================================
//  EXPORT/INDEX.JS — ЭКСПОРТ В PDF ДЛЯ БУХГАЛТЕРИИ
// ============================================================

import { useStore } from '../../core/store.js';
import { formatDate } from '../../core/utils.js';
import { CATEGORIES } from '../../core/config.js';
import { generatePDF } from './pdf.js';
import { exportToExcel } from './excel.js';

export { generatePDF, exportToExcel };

// Генерация PDF отчёта
export async function generatePDF() {
    const state = useStore.getState();
    const expenses = state.expenses;
    const car = state.car;

    if (expenses.length === 0) {
        alert('Нет расходов для отчёта');
        return;
    }

    // Группируем по месяцам
    const byMonth = {};
    expenses.forEach(exp => {
        const month = exp.date.slice(0, 7); // YYYY-MM
        if (!byMonth[month]) byMonth[month] = [];
        byMonth[month].push(exp);
    });

    // Сортируем месяцы
    const months = Object.keys(byMonth).sort();

    // Формируем HTML для печати (сохранится как PDF)
    const html = generateReportHTML(expenses, byMonth, months, car);

    // Открываем окно печати
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();

    // Автоматически открываем печать (сохранение в PDF)
    setTimeout(() => {
        win.print();
    }, 500);

    return true;
}

// Генерация HTML-отчёта
function generateReportHTML(expenses, byMonth, months, car) {
    const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
    const carInfo = car?.model || 'Не указан';

    // Общая статистика по категориям
    const catTotals = {};
    expenses.forEach(e => {
        const catName = CATEGORIES[e.category]?.label || e.category;
        catTotals[catName] = (catTotals[catName] || 0) + e.amount;
    });

    // Сортируем категории по сумме
    const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <title>Отчёт по расходам</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Inter', Arial, sans-serif;
                    background: #fff;
                    padding: 40px;
                    color: #1a1a1a;
                    max-width: 900px;
                    margin: 0 auto;
                }
                .header {
                    border-bottom: 2px solid #ccff00;
                    padding-bottom: 16px;
                    margin-bottom: 24px;
                }
                .header h1 {
                    font-size: 28px;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                }
                .header .sub {
                    color: #6b7280;
                    font-size: 14px;
                    margin-top: 4px;
                }
                .car-info {
                    background: #f8fafc;
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-bottom: 24px;
                    display: flex;
                    justify-content: space-between;
                    flex-wrap: wrap;
                }
                .car-info span {
                    font-size: 13px;
                    color: #4b5563;
                }
                .car-info strong {
                    color: #1a1a1a;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-bottom: 24px;
                }
                .summary-card {
                    background: #f8fafc;
                    padding: 14px;
                    border-radius: 8px;
                    text-align: center;
                }
                .summary-card .label {
                    font-size: 11px;
                    color: #6b7280;
                    text-transform: uppercase;
                }
                .summary-card .value {
                    font-size: 22px;
                    font-weight: 700;
                    margin-top: 4px;
                }
                .summary-card .value.green {
                    color: #10b981;
                }
                .summary-card .value.accent {
                    color: #5e7d00;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 16px 0 24px;
                }
                th {
                    background: #f1f3f5;
                    text-align: left;
                    padding: 10px 12px;
                    font-size: 11px;
                    text-transform: uppercase;
                    color: #6b7280;
                    font-weight: 600;
                }
                td {
                    padding: 8px 12px;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 13px;
                }
                .total-row {
                    font-weight: 700;
                    background: #f8fafc;
                }
                .month-section {
                    margin: 24px 0 16px;
                }
                .month-title {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: #1a1a1a;
                }
                .category-tag {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    background: #f1f3f5;
                    color: #4b5563;
                }
                .footer {
                    margin-top: 32px;
                    padding-top: 16px;
                    border-top: 1px solid #e5e7eb;
                    font-size: 11px;
                    color: #9ca3af;
                    text-align: center;
                }
                .grand-total {
                    font-size: 20px;
                    font-weight: 700;
                    text-align: right;
                    padding: 16px;
                    background: #f0f7ff;
                    border-radius: 8px;
                    margin-top: 16px;
                }
                @media print {
                    body { padding: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Отчёт по расходам</h1>
                <div class="sub">Сгенерирован: ${new Date().toLocaleString('ru-RU')}</div>
            </div>

            <div class="car-info">
                <span>🚗 Автомобиль: <strong>${carInfo}</strong></span>
                <span>📅 Госномер: <strong>${car?.plate || '—'}</strong></span>
                <span>📋 Всего записей: <strong>${expenses.length}</strong></span>
            </div>

            <div class="summary-grid">
                <div class="summary-card">
                    <div class="label">💰 Общая сумма</div>
                    <div class="value accent">${totalAll.toFixed(2)} BYN</div>
                </div>
                <div class="summary-card">
                    <div class="label">📊 Среднее на запись</div>
                    <div class="value">${(totalAll / expenses.length).toFixed(2)} BYN</div>
                </div>
                <div class="summary-card">
                    <div class="label">🏷️ Категорий</div>
                    <div class="value">${Object.keys(catTotals).length}</div>
                </div>
            </div>

            <h2 style="margin: 16px 0 8px; font-size: 16px;">📋 По категориям</h2>
            <table>
                <thead>
                    <tr>
                        <th>Категория</th>
                        <th style="text-align:right;">Сумма (BYN)</th>
                        <th style="text-align:right;">% от всех</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedCats.map(cat => `
                        <tr>
                            <td>${cat}</td>
                            <td style="text-align:right;">${catTotals[cat].toFixed(2)}</td>
                            <td style="text-align:right;">${((catTotals[cat] / totalAll) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td>ИТОГО</td>
                        <td style="text-align:right;">${totalAll.toFixed(2)} BYN</td>
                        <td style="text-align:right;">100%</td>
                    </tr>
                </tbody>
            </table>

            <h2 style="margin: 16px 0 8px; font-size: 16px;">📄 Детализация по месяцам</h2>
            ${months.map(month => {
                const monthExpenses = byMonth[month];
                const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
                const monthName = new Date(month + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

                return `
                    <div class="month-section">
                        <div class="month-title">${monthName} — ${monthTotal.toFixed(2)} BYN</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Дата</th>
                                    <th>Категория</th>
                                    <th>Описание</th>
                                    <th style="text-align:right;">Сумма (BYN)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${monthExpenses.sort((a, b) => b.date.localeCompare(a.date)).map(e => `
                                    <tr>
                                        <td>${formatDate(e.date)}</td>
                                        <td><span class="category-tag">${CATEGORIES[e.category]?.label || e.category}</span></td>
                                        <td>${e.description || '—'}</td>
                                        <td style="text-align:right;">${e.amount.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="3"><strong>Итого за месяц</strong></td>
                                    <td style="text-align:right;"><strong>${monthTotal.toFixed(2)} BYN</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
            }).join('')}

            <div class="grand-total">
                💰 Общая сумма: ${totalAll.toFixed(2)} BYN
            </div>

            <div class="footer">
                BLVCK TAXI — Отчёт для бухгалтерии<br>
                Данные актуальны на ${new Date().toLocaleString('ru-RU')}
            </div>

            <div class="no-print" style="text-align:center; margin-top:16px; padding:12px; background:#f8fafc; border-radius:8px; font-size:13px; color:#6b7280;">
                📄 Нажмите "Сохранить как PDF" или используйте Ctrl+S (Cmd+S) для сохранения
            </div>
        </body>
        </html>
    `;
}
