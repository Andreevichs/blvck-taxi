// ============================================================
//  DEMO-DATA/INDEX.JS — ДЕМО-ДАННЫЕ ПРИ ПЕРВОМ ЗАПУСКЕ
// ============================================================

import { useStore } from '../../core/store.js';
import { getToday } from '../../core/utils.js';

// Категории для демо
const DEMO_EXPENSES = [
    { category: 'fuel', amount: 82.00, description: 'АЗС №5, 40л' },
    { category: 'wash', amount: 25.00, description: 'Бесконтактная мойка' },
    { category: 'fuel', amount: 70.50, description: 'АЗС №3, 35л' },
    { category: 'repair', amount: 450.00, description: 'Замена тормозных колодок' },
    { category: 'other', amount: 120.00, description: 'Масло моторное 5W-30' }
];

const DEMO_DAYS = [0, -1, -2, -3, -4]; // сегодня, вчера, и т.д.

// Проверка, нужно ли показывать демо-данные
export function needDemoData() {
    const hasShown = localStorage.getItem('blvck_taxi_demo_shown');
    return !hasShown;
}

// Добавление демо-данных
export async function addDemoData() {
    console.log('📚 Добавляем демо-данные...');

    try {
        const state = useStore.getState();

        for (const [index, exp] of DEMO_EXPENSES.entries()) {
            // Создаём дату: сегодня минус дни
            const date = new Date();
            const dayOffset = DEMO_DAYS[index % DEMO_DAYS.length];
            date.setDate(date.getDate() + dayOffset);
            const dateStr = date.toISOString().split('T')[0];

            // Добавляем расход
            await state.addExpense({
                date: dateStr,
                category: exp.category,
                amount: exp.amount,
                description: exp.description,
                liters: null,
                mileage: null,
                createdAt: date.toISOString()
            });
        }

        // Помечаем, что демо уже показывали
        localStorage.setItem('blvck_taxi_demo_shown', 'true');

        // Загружаем данные заново
        await state.init();

        console.log('✅ Демо-данные добавлены');
        return true;
    } catch (error) {
        console.error('❌ Ошибка добавления демо-данных:', error);
        return false;
    }
}
