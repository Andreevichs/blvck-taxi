// ============================================================
//  APP.JS — ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ
// ============================================================

import { initDB } from './database.js';
import { useStore } from './store.js';
import { renderExpenses, updateTotals, updateDate } from '../modules/expenses/render.js';
import { initQuickAdd, openQuickModal } from '../modules/quick-add/index.js';
import { filterToday, filterWeek, sumExpenses, showToast } from './utils.js';

// ============================================================
//  ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================================

async function initApp() {
    console.log('🚀 Запуск BLVCK TAXI...');

    try {
        // 1. Открываем базу данных
        await initDB();
        console.log('✅ База данных готова');

        // 2. Загружаем данные в хранилище
        await useStore.getState().init();
        console.log('✅ Данные загружены');

        // 3. Настраиваем UI
        setupUI();

        // 4. Инициализируем быстрый ввод
        initQuickAdd();

        // 5. Обновляем интерфейс
        updateUI();

        console.log('✅ Приложение готово!');
    } catch (error) {
        console.error('❌ Ошибка при запуске:', error);
        showToast('Ошибка при запуске приложения', 'error');
    }
}

// ============================================================
//  НАСТРОЙКА UI
// ============================================================

function setupUI() {
    // ---- Welcome Screen ----
    const welcomeBtn = document.getElementById('welcomeBtn');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const appContent = document.getElementById('appContent');

    if (welcomeBtn && welcomeScreen && appContent) {
        welcomeBtn.addEventListener('click', function() {
            welcomeScreen.classList.add('hidden');
            appContent.style.display = 'block';
            // При первом запуске обновляем UI
            updateUI();
        });
    }

    // ---- Переключение темы ----
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('light-theme');
            const icon = this.querySelector('i');
            if (document.body.classList.contains('light-theme')) {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        });
    }

    // ---- Кнопка экспорта (пока заглушка) ----
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            showToast('📄 Экспорт отчёта будет доступен в следующей версии', 'info');
        });
    }

    // ---- Кнопки навигации ----
    document.querySelectorAll('.secondary-actions button').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.textContent.trim().toLowerCase();
            if (action.includes('график')) {
                showToast('📊 Графики будут доступны в следующей версии', 'info');
            } else if (action.includes('документ')) {
                showToast('📄 Документы будут доступны в следующей версии', 'info');
            } else if (action.includes('то')) {
                showToast('🔧 Журнал ТО будет доступен в следующей версии', 'info');
            } else if (action.includes('авто')) {
                showToast('🚗 Настройки авто будут доступны в следующей версии', 'info');
            }
        });
    });
}

// ============================================================
//  ОБНОВЛЕНИЕ UI
// ============================================================

function updateUI() {
    const state = useStore.getState();

    // Обновляем дату
    updateDate();

    // Фильтруем расходы за сегодня
    const todayExpenses = state.expenses.filter(e => e.date === new Date().toISOString().split('T')[0]);

    // Рендерим список
    renderExpenses(todayExpenses, 'todayExpenses');

    // Обновляем итоги
    updateTotals(state.todayTotal, state.weekTotal);
}

// ============================================================
//  ПОДПИСКА НА ИЗМЕНЕНИЯ
// ============================================================

// Подписываемся на изменения хранилища
useStore.subscribe((state) => {
    // Обновляем UI при любых изменениях
    const todayExpenses = state.expenses.filter(e => e.date === new Date().toISOString().split('T')[0]);
    renderExpenses(todayExpenses, 'todayExpenses');
    updateTotals(state.todayTotal, state.weekTotal);
});

// ============================================================
//  ЗАПУСК
// ============================================================

// Ждём загрузку DOM
document.addEventListener('DOMContentLoaded', initApp);

// Экспортируем для использования в консоли (отладка)
window.app = {
    store: useStore,
    openQuickModal: openQuickModal
};
