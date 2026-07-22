// ============================================================
//  REMINDERS/INDEX.JS — НАПОМИНАНИЯ
// ============================================================

import { useStore } from '../../core/store.js';
import { getCar, getOilStatus, calculateMileage } from '../car/index.js';
import { getDocuments } from '../../core/database.js';
import { showToast } from '../../core/utils.js';

// Проверить все напоминания
export function checkReminders() {
    const state = useStore.getState();
    const car = state.car;
    const expenses = state.expenses;
    const documents = state.documents;

    // 1. Проверка масла
    if (car && car.oilInterval > 0) {
        const mileage = calculateMileage(expenses, car);
        if (mileage !== null) {
            const oilStatus = getOilStatus(car, mileage);
            if (oilStatus.status === 'danger' && oilStatus.remaining <= 0) {
                showToast('🚨 СРОЧНО замените масло!', 'error');
            } else if (oilStatus.status === 'warning') {
                showToast(`⚠️ Замена масла через ${Math.round(oilStatus.remaining)} км`, 'warning');
            }
        }
    }

    // 2. Проверка документов (страховка, техосмотр)
    documents.forEach(doc => {
        if (!doc.expiryDate) return;

        const daysUntil = getDaysUntil(doc.expiryDate);

        if (daysUntil === 7) {
            showToast(`📄 ${doc.title || 'Документ'} истекает через 7 дней!`, 'warning');
        } else if (daysUntil === 1) {
            showToast(`📄 ${doc.title || 'Документ'} истекает ЗАВТРА!`, 'error');
        } else if (daysUntil === 0) {
            showToast(`🔴 ${doc.title || 'Документ'} ИСТЁК СЕГОДНЯ!`, 'error');
        } else if (daysUntil < 0 && daysUntil > -7) {
            showToast(`🔴 ${doc.title || 'Документ'} просрочен на ${Math.abs(daysUntil)} дней!`, 'error');
        }
    });
}

// Количество дней до даты
function getDaysUntil(dateStr) {
    if (!dateStr) return Infinity;
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// Запустить проверку напоминаний (каждый день)
export function initReminders() {
    // Проверяем при загрузке
    setTimeout(checkReminders, 2000);

    // Проверяем каждый час
    setInterval(checkReminders, 60 * 60 * 1000);

    // Проверяем при возобновлении вкладки
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkReminders();
        }
    });
}
