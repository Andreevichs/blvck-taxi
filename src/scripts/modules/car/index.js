// ============================================================
//  CAR/INDEX.JS — УПРАВЛЕНИЕ ДАННЫМИ АВТОМОБИЛЯ
// ============================================================

import { useStore } from '../../core/store.js';
import { showToast } from '../../core/utils.js';

// Получить данные авто
export function getCar() {
    return useStore.getState().car;
}

// Обновить данные авто
export async function updateCar(data) {
    try {
        await useStore.getState().updateCar(data);
        showToast('✅ Данные автомобиля сохранены', 'success');
        return true;
    } catch (error) {
        console.error('Ошибка сохранения авто:', error);
        showToast('❌ Ошибка сохранения', 'error');
        return false;
    }
}

// Рассчитать пробег на основе расхода топлива
export function calculateMileage(expenses, car) {
    if (!car?.fuelConsumption || car.fuelConsumption <= 0) return null;

    const fuelExpenses = expenses.filter(e => e.category === 'fuel' && e.liters);
    const totalLiters = fuelExpenses.reduce((s, e) => s + (e.liters || 0), 0);

    if (totalLiters === 0) return null;

    return (totalLiters / car.fuelConsumption) * 100;
}

// Получить статус замены масла
export function getOilStatus(car, mileage) {
    if (!car?.oilInterval || car.oilInterval <= 0 || !mileage) {
        return { status: 'unknown', remaining: null };
    }

    const remaining = car.oilInterval - (mileage % car.oilInterval);

    if (remaining <= 0) return { status: 'danger', remaining: 0 };
    if (remaining <= 500) return { status: 'danger', remaining };
    if (remaining <= 1000) return { status: 'warning', remaining };

    return { status: 'good', remaining };
}
