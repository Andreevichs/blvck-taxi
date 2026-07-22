// ============================================================
//  QUICK-ADD/INDEX.JS — БЫСТРЫЙ ВВОД РАСХОДОВ
// ============================================================

import { useStore } from '../../core/store.js';
import { getToday } from '../../core/utils.js';
import { CATEGORY_NAMES } from '../../core/config.js';

// Открыть модалку быстрого ввода
export function openQuickModal(categoryKey) {
    const modal = document.getElementById('quickModal');
    const title = document.getElementById('quickModalTitle');
    const categoryInput = document.getElementById('quickCategory');

    if (!modal || !title || !categoryInput) return;

    // Устанавливаем категорию
    categoryInput.value = categoryKey;

    // Обновляем заголовок
    const catName = CATEGORY_NAMES[categoryKey] || 'Расход';
    title.innerHTML = `<i class="fas fa-plus-circle"></i> ${catName}`;

    // Очищаем поля
    document.getElementById('quickAmount').value = '';
    document.getElementById('quickDesc').value = '';

    // Показываем модалку
    modal.classList.add('open');

    // Фокус на поле суммы
    setTimeout(() => {
        document.getElementById('quickAmount').focus();
    }, 300);
}

// Закрыть модалку
export function closeQuickModal() {
    const modal = document.getElementById('quickModal');
    if (modal) {
        modal.classList.remove('open');
    }
}

// Сохранить расход
export async function handleQuickSubmit(event) {
    event.preventDefault();

    const amountInput = document.getElementById('quickAmount');
    const categoryInput = document.getElementById('quickCategory');
    const descInput = document.getElementById('quickDesc');

    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;
    const description = descInput.value.trim();

    // Проверка
    if (!amount || amount <= 0) {
        alert('Введите сумму');
        return;
    }

    if (!category) {
        alert('Выберите категорию');
        return;
    }

    // Добавляем расход
    const expense = {
        date: getToday(),
        category: category,
        amount: amount,
        description: description || '',
        liters: null,
        mileage: null
    };

    try {
        await useStore.getState().addExpense(expense);
        closeQuickModal();
        // Обновим UI
        await useStore.getState().init();
    } catch (error) {
        console.error('Ошибка добавления:', error);
        alert('Не удалось добавить расход');
    }
}

// Инициализация модуля
export function initQuickAdd() {
    // Кнопки быстрого ввода на главном экране
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            openQuickModal(category);
        });
    });

    // Кнопка закрытия модалки
    const closeBtn = document.getElementById('quickModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeQuickModal);
    }

    // Клик вне модалки
    const overlay = document.getElementById('quickModal');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeQuickModal();
            }
        });
    }

    // Отправка формы
    const form = document.getElementById('quickForm');
    if (form) {
        form.addEventListener('submit', handleQuickSubmit);
    }

    // Enter в поле суммы
    const amountField = document.getElementById('quickAmount');
    if (amountField) {
        amountField.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('quickForm').dispatchEvent(new Event('submit'));
            }
        });
    }
}
