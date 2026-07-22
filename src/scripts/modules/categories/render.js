// ============================================================
//  CATEGORIES/RENDER.JS — ОТОБРАЖЕНИЕ КАТЕГОРИЙ
// ============================================================

import { CATEGORIES } from '../../core/config.js';
import { getCategoryTotals } from './index.js';

export function renderCategories(expenses) {
    const container = document.getElementById('categoryGrid');
    if (!container) return;

    const totals = getCategoryTotals(expenses);
    const hasData = Object.values(totals).some(v => v > 0);

    if (!hasData) {
        container.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; color:var(--text-muted); font-size:12px; padding:12px;">
                Добавьте расходы, чтобы увидеть категории
            </div>
        `;
        return;
    }

    // Показываем только те категории, где есть расходы
    const activeKeys = CATEGORIES.keys.filter(key => totals[key] > 0);

    if (activeKeys.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; color:var(--text-muted); font-size:12px; padding:12px;">
                Нет расходов по категориям
            </div>
        `;
        return;
    }

    let html = '';
    CATEGORIES.keys.forEach(key => {
        const cat = CATEGORIES[key];
        const amount = totals[key] || 0;

        html += `
            <div class="cat-card" data-category="${key}" style="
                background: var(--bg-surface);
                border: 1px solid ${amount > 0 ? 'var(--accent-border)' : 'var(--border-subtle)'};
                border-radius: var(--radius-sm);
                padding: 12px 8px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
                opacity: ${amount > 0 ? 1 : 0.4};
            ">
                <div style="font-size: 20px; color: ${amount > 0 ? 'var(--accent)' : 'var(--text-muted)'}; margin-bottom: 4px;">
                    <i class="fas ${cat.icon}"></i>
                </div>
                <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.3px;">
                    ${cat.label.replace(/[^а-яА-Яa-zA-Z]/g, '')}
                </div>
                <div style="font-size: 13px; font-weight: 700; color: ${amount > 0 ? 'var(--text-primary)' : 'var(--text-muted)'}; margin-top: 2px;">
                    ${amount > 0 ? amount.toFixed(2) + ' BYN' : '—'}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Клик по категории — открывает быстрый ввод
    container.querySelectorAll('.cat-card').forEach(card => {
        card.addEventListener('click', function() {
            const category = this.dataset.category;
            // Открываем модалку быстрого ввода с выбранной категорией
            if (window.openQuickModal) {
                window.openQuickModal(category);
            }
        });
    });
}
