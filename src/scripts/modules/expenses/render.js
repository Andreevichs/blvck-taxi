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

        // Добавь кнопку удаления и редактирования в рендеринг

// В функции renderExpenses замени блок .expense-item на:

html += `
    <div class="expense-item animate-fade-up" data-id="${exp.id}">
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
        <div style="display:flex;gap:4px;align-items:center;">
            <button class="btn-icon-small edit-btn" data-id="${exp.id}" style="
                width: 26px;
                height: 26px;
                border-radius: 50%;
                border: 1px solid rgba(255,255,255,0.06);
                background: transparent;
                color: var(--text-muted);
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            ">
                <i class="fas fa-pen"></i>
            </button>
            <button class="btn-icon-small delete-btn" data-id="${exp.id}" style="
                width: 26px;
                height: 26px;
                border-radius: 50%;
                border: 1px solid rgba(255,255,255,0.06);
                background: transparent;
                color: var(--text-muted);
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            ">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>
`;

// Добавь обработчики после рендеринга
container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
        e.stopPropagation();
        const id = this.dataset.id;
        if (confirm('Удалить этот расход?')) {
            const state = useStore.getState();
            await state.deleteExpense(id);
            showToast('🗑️ Расход удалён', 'warning');
        }
    });
});

container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = this.dataset.id;
        openEditModal(id);
    });
});

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
