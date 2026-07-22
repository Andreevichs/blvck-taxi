// ============================================================
//  CONFIG.JS — НАСТРОЙКИ И КАТЕГОРИИ
// ============================================================

// Категории расходов
export const CATEGORIES = {
    fuel: {
        label: '⛽ Бензин',
        icon: 'fa-gas-pump',
        color: '#f59e0b'
    },
    repair: {
        label: '🔧 Ремонт',
        icon: 'fa-wrench',
        color: '#ef4444'
    },
    wash: {
        label: '🧼 Мойка',
        icon: 'fa-spray-can',
        color: '#3b82f6'
    },
    insurance: {
        label: '🛡️ Страховка',
        icon: 'fa-shield',
        color: '#8b5cf6'
    },
    fszn: {
        label: '🏛️ ФСЗН',
        icon: 'fa-building',
        color: '#ec4899'
    },
    other: {
        label: '📌 Прочее',
        icon: 'fa-ellipsis-h',
        color: '#6b7280'
    }
};

// Список ключей категорий для быстрого доступа
export const CAT_KEYS = Object.keys(CATEGORIES);

// Названия категорий для модалки
export const CATEGORY_NAMES = {
    fuel: 'Заправка',
    repair: 'Ремонт',
    wash: 'Мойка',
    insurance: 'Страховка',
    fszn: 'ФСЗН',
    other: 'Другое'
};

// Быстрые кнопки на главном экране (порядок и какие показывать)
export const QUICK_BUTTONS = [
    { key: 'fuel', label: 'Заправка' },
    { key: 'repair', label: 'Ремонт' },
    { key: 'wash', label: 'Мойка' },
    { key: 'other', label: 'Другое' }
];

// Лимиты для бесплатной версии
export const FREE_LIMITS = {
    maxExpenses: 10,        // максимум расходов
    maxDaysHistory: 7,      // дней истории
    maxCars: 1,             // машин
    maxNotes: 3,            // записей ТО
    maxDocuments: 2         // документов
};
