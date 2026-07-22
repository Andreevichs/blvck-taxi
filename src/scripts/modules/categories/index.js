// ============================================================
//  CATEGORIES/INDEX.JS — КАТЕГОРИИ НА ГЛАВНОМ ЭКРАНЕ
// ============================================================

import { CAT_KEYS } from '../../core/config.js';

// Получить суммы по категориям за период
export function getCategoryTotals(expenses) {
    const totals = {};
    CAT_KEYS.forEach(key => totals[key] = 0);

    if (!expenses || !Array.isArray(expenses)) {
        return totals;
    }

    expenses.forEach(e => {
        if (e && e.category && totals[e.category] !== undefined) {
            totals[e.category] += e.amount || 0;
        }
    });

    return totals;
}

// Получить топ-3 категорий
export function getTopCategories(expenses) {
    const totals = getCategoryTotals(expenses);
    const sorted = CAT_KEYS
        .filter(key => totals[key] > 0)
        .sort((a, b) => totals[b] - totals[a]);

    return sorted.slice(0, 3);
}
