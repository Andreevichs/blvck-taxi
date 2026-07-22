// ============================================================
//  DEMO-DATA/INDEX.JS — ДЕМО-ДАННЫЕ (ШАГ 9)
// ============================================================

import { useStore } from '../../core/store.js';

const DEMO_EXPENSES = [
    { category: 'fuel', amount: 82.00, description: 'АЗС №5, 40л' },
    { category: 'wash', amount: 25.00, description: 'Бесконтактная мойка' },
    { category: 'fuel', amount: 70.50, description: 'АЗС №3, 35л' },
    { category: 'repair', amount: 450.00, description: 'Замена тормозных колодок' },
    { category: 'other', amount: 120.00, description: 'Масло моторное 5W-30' }
];

const DEMO_DAYS = [0, -1, -2, -3, -4];

export function needDemoData() {
    const hasShown = localStorage.getItem('blvck_taxi_demo_shown');
    return !hasShown;
}

export async function addDemoData() {
    console.log('📚 Добавляем демо-данные...');

    try {
        const state = useStore.getState();

        for (const [index, exp] of DEMO_EXPENSES.entries()) {
            const date = new Date();
            const dayOffset = DEMO_DAYS[index % DEMO_DAYS.length];
            date.setDate(date.getDate() + dayOffset);
            const dateStr = date.toISOString().split('T')[0];

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

        localStorage.setItem('blvck_taxi_demo_shown', 'true');
        await state.init();

        console.log('✅ Демо-данные добавлены');
        return true;
    } catch (error) {
        console.error('❌ Ошибка добавления демо-данных:', error);
        return false;
    }
}
