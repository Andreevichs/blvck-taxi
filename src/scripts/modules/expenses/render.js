// ============================================================
//  EXPENSES/RENDER.JS — ОТОБРАЖЕНИЕ РАСХОДОВ
// ============================================================

import { CATEGORIES } from '../../core/config.js';
import { formatDate, formatTime } from '../../core/utils.js';

// Рендеринг списка расходов
export function renderExpenses(expenses, containerId = 'todayExpenses') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Нет расходов за сегодня</p>
                <p class="sub">Нажмите на кнопку ниже, чтобы добавить</p>
            </div>
        `;
        return;
    }

    // Сортируем по времени (сначала новые)
    const sorted = [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    let html = '';
    sorted.forEach(exp => {
        const cat = CATEGORIES[exp.category] || CATEGORIES.other;
        const time = formatTime(exp.createdAt);

        html += `
            <div class="expense-item animate-fade-up">
                <div class="left">
                    <div class="icon">
                        <i class="fas ${cat.icon}"></i>
                    </div>
                    <div class="info">
                        <div class="cat">${cat.label}</div>
                        <div class="desc">${exp.description || 'Без описания'}</div>
                        <div class="time">${time}</div>
                    </div>
                </div>
                <div class="amount">${exp.amount.toFixed(2)} BYN</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Обновление итогов
export function updateTotals(todayTotal, weekTotal) {
    const dayTotalEl = document.getElementById('dayTotal');
    const weekTotalEl = document.getElementById('weekTotal');

    if (dayTotalEl) {
        dayTotalEl.textContent = todayTotal.toFixed(2) + ' BYN';
    }

    if (weekTotalEl) {
        weekTotalEl.textContent = weekTotal.toFixed(2) + ' BYN';
    }
}

// Обновление даты в шапке
export function updateDate() {
    const el = document.getElementById('todayDate');
    if (!el) return;

    const now = new Date();
    const options = { weekday: 'short', day: 'numeric', month: 'long' };
    const dateStr = now.toLocaleDateString('ru-RU', options).toUpperCase();
    el.textContent = dateStr;
}
