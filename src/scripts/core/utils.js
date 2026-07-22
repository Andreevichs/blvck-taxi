// ============================================================
//  UTILS.JS — ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

// Форматирование даты
export function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Форматирование времени
export function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Сегодняшняя дата в формате YYYY-MM-DD
export function getToday() {
    return new Date().toISOString().split('T')[0];
}

// Получить дату 7 дней назад
export function getWeekAgo() {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
}

// Генерация уникального ID
export function generateId() {
    return Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

// Проверка, сегодня ли дата
export function isToday(dateStr) {
    return dateStr === getToday();
}

// Фильтрация расходов за сегодня
export function filterToday(expenses) {
    const today = getToday();
    return expenses.filter(e => e.date === today);
}

// Фильтрация расходов за неделю
export function filterWeek(expenses) {
    const weekAgo = getWeekAgo();
    return expenses.filter(e => e.date >= weekAgo);
}

// Подсчёт суммы
export function sumExpenses(expenses) {
    return expenses.reduce((s, e) => s + e.amount, 0);
}

// Показать уведомление
export function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast animate-fade-up';

    const icons = {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    };

    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
