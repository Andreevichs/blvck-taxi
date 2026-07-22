// ============================================================
//  EXPORT/EXCEL.JS — ЭКСПОРТ В EXCEL
// ============================================================

import { useStore } from '../../core/store.js';
import { formatDate } from '../../core/utils.js';
import { CATEGORIES } from '../../core/config.js';

export function exportToExcel() {
    const state = useStore.getState();
    const expenses = state.expenses;
    const car = state.car;

    if (expenses.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }

    // Сортируем по дате
    const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

    // Формируем CSV
    let csv = 'Дата,Категория,Описание,Сумма (BYN),Литры,Пробег\n';

    sorted.forEach(e => {
        const cat = CATEGORIES[e.category]?.label || e.category;
        const desc = (e.description || '').replace(/,/g, ';');
        const liters = e.liters || '';
        const mileage = e.mileage || '';
        csv += `${formatDate(e.date)},${cat},${desc},${e.amount.toFixed(2)},${liters},${mileage}\n`;
    });

    // Добавляем итоги
    const total = sorted.reduce((s, e) => s + e.amount, 0);
    csv += `\n,,ИТОГО,${total.toFixed(2)},,\n`;

    // Информация об автомобиле
    if (car) {
        csv += `\nАвтомобиль: ${car.model || ''} (${car.plate || ''})`;
        csv += `\nРасход топлива: ${car.fuelConsumption || 0} л/100км`;
        csv += `\nИнтервал масла: ${car.oilInterval || 0} км`;
    }

    // Создаём и скачиваем файл
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `расходы_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    showToast('📊 Excel-отчёт скачан', 'success');
}
