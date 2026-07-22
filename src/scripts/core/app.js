// ============================================================
//  APP.JS — ГЛАВНЫЙ ФАЙЛ (ОБНОВЛЁННЫЙ, ШАГ 6)
// ============================================================

import { initDB } from './database.js';
import { useStore } from './store.js';
import { renderExpenses, updateTotals, updateDate } from '../modules/expenses/render.js';
import { renderCategories } from '../modules/categories/render.js';
import { renderCarCard } from '../modules/car/render.js';
import { initQuickAdd, openQuickModal } from '../modules/quick-add/index.js';
import { generatePDF } from '../modules/export/index.js';
import { needDemoData, addDemoData } from '../modules/demo-data/index.js';
import { needOnboarding, showOnboarding } from '../modules/onboarding/index.js';
import { initReminders } from '../modules/reminders/index.js';
import { initNotifications, sendTestNotification } from '../modules/notifications/index.js';
import { filterToday, showToast } from './utils.js';

// ============================================================
//  ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================================

async function initApp() {
    console.log('🚀 Запуск BLVCK TAXI...');

    try {
        // 1. База данных
        await initDB();
        console.log('✅ База данных готова');

        // 2. Загружаем данные
        await useStore.getState().init();
        console.log('✅ Данные загружены');

        // 3. Демо-данные
        if (needDemoData()) {
            await addDemoData();
            console.log('✅ Демо-данные добавлены');
        }

        // 4. Онбординг
        if (needOnboarding()) {
            await showOnboarding();
            console.log('✅ Онбординг показан');
        }

        // 5. Настраиваем UI
        setupUI();

        // 6. Инициализируем быстрый ввод
        initQuickAdd();

        // 7. Инициализируем уведомления
        await initNotifications();

        // 8. Запускаем напоминания
        initReminders();

        // 9. Обновляем интерфейс
        updateUI();

        // 10. Экспортируем в глобальный объект
        window.openQuickModal = openQuickModal;
        window.sendTestNotification = sendTestNotification;

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
    // Welcome Screen
    const welcomeBtn = document.getElementById('welcomeBtn');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const appContent = document.getElementById('appContent');

    if (welcomeBtn && welcomeScreen && appContent) {
        welcomeBtn.addEventListener('click', function() {
            welcomeScreen.classList.add('hidden');
            appContent.style.display = 'block';
            updateUI();
        });
    }

    // Тема
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('light-theme');
            const icon = this.querySelector('i');
            icon.className = document.body.classList.contains('light-theme')
                ? 'fas fa-sun'
                : 'fas fa-moon';
        });
    }

    // Экспорт PDF
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            await generatePDF();
        });
    }

    // Кнопка настроек
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            showToast('⚙️ Настройки будут доступны в следующей версии', 'info');
        });
    }

    // Второстепенные кнопки
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
                showToast('🚗 Настройки авто уже в карточке выше', 'info');
            }
        });
    });

    // Кнопка "Тестовое уведомление" (скрытая, для отладки)
    // Добавляем обработчик клавиш: Ctrl+Shift+N → тест уведомления
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'N') {
            sendTestNotification();
        }
    });
}

// ============================================================
//  ОБНОВЛЕНИЕ UI
// ============================================================

function updateUI() {
    const state = useStore.getState();

    updateDate();

    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = state.expenses.filter(e => e.date === today);

    renderExpenses(todayExpenses, 'todayExpenses');
    renderCategories(state.expenses);
    renderCarCard();
    updateTotals(state.todayTotal, state.weekTotal);
}

// ============================================================
//  ПОДПИСКА НА ИЗМЕНЕНИЯ
// ============================================================

useStore.subscribe((state) => {
    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = state.expenses.filter(e => e.date === today);

    renderExpenses(todayExpenses, 'todayExpenses');
    renderCategories(state.expenses);
    renderCarCard();
    updateTotals(state.todayTotal, state.weekTotal);
});

// ============================================================
//  ЗАПУСК
// ============================================================

document.addEventListener('DOMContentLoaded', initApp);

window.app = {
    store: useStore,
    openQuickModal: openQuickModal,
    generatePDF: generatePDF,
    sendTestNotification: sendTestNotification
};
