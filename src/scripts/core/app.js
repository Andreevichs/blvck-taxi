// ============================================================
//  APP.JS — ГЛАВНЫЙ ФАЙЛ (ШАГ 7)
// ============================================================

import { initDB } from './database.js';
import { useStore } from './store.js';
import { renderExpenses, updateTotals, updateDate } from '../modules/expenses/render.js';
import { renderCategories } from '../modules/categories/render.js';
import { renderCarCard } from '../modules/car/render.js';
import { renderNotes, setNoteFilter, showAddNoteForm } from '../modules/notes/render.js';
import { renderDocuments, showAddDocumentForm } from '../modules/documents/render.js';
import { updateCharts } from '../modules/charts/index.js';
import { initQuickAdd, openQuickModal } from '../modules/quick-add/index.js';
import { generatePDF } from '../modules/export/index.js';
import { needDemoData, addDemoData } from '../modules/demo-data/index.js';
import { needOnboarding, showOnboarding } from '../modules/onboarding/index.js';
import { initReminders } from '../modules/reminders/index.js';
import { initNotifications, sendTestNotification } from '../modules/notifications/index.js';
import { showToast } from './utils.js';

// ============================================================
//  ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================================

async function initApp() {
    console.log('🚀 Запуск BLVCK TAXI...');

    try {
        await initDB();
        console.log('✅ База данных готова');

        await useStore.getState().init();
        console.log('✅ Данные загружены');

        if (needDemoData()) {
            await addDemoData();
            console.log('✅ Демо-данные добавлены');
        }

        if (needOnboarding()) {
            await showOnboarding();
            console.log('✅ Онбординг показан');
        }

        setupUI();
        initQuickAdd();
        await initNotifications();
        initReminders();
        updateUI();

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

    // Навигация по вкладкам
    document.querySelectorAll('.secondary-actions button').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.textContent.trim().toLowerCase();

            if (action.includes('график')) {
                showChartsTab();
            } else if (action.includes('документ')) {
                showAddDocumentForm();
            } else if (action.includes('то')) {
                showAddNoteForm();
            } else if (action.includes('авто')) {
                showToast('🚗 Настройки авто в карточке выше', 'info');
            }
        });
    });

    // Фильтры в журнале ТО
    document.querySelectorAll('.notes-filter button').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            setNoteFilter(filter);
        });
    });

    // Тестовое уведомление: Ctrl+Shift+N
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'N') {
            sendTestNotification();
        }
    });
}

// ============================================================
//  ПОКАЗ ГРАФИКОВ
// ============================================================

function showChartsTab() {
    const modal = document.getElementById('mainModal');
    const title = document.getElementById('mainModalTitle');
    const body = document.getElementById('mainModalBody');

    if (!modal || !title || !body) return;

    title.innerHTML = '<i class="fas fa-chart-pie" style="color:var(--accent);"></i> Графики расходов';

    body.innerHTML = `
        <div style="margin-bottom: 16px;">
            <canvas id="pieChart" style="max-height: 200px; width: 100%;"></canvas>
        </div>
        <div>
            <canvas id="barChart" style="max-height: 180px; width: 100%;"></canvas>
        </div>
    `;

    modal.classList.add('open');

    setTimeout(() => {
        const state = useStore.getState();
        updateCharts(state.expenses);
    }, 100);

    const closeBtn = document.getElementById('mainModalClose');
    closeBtn.onclick = () => modal.classList.remove('open');
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('open');
    };
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
    renderNotes(state.notes);
    renderDocuments(state.documents);
    updateTotals(state.todayTotal, state.weekTotal);
    updateCharts(state.expenses);
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
    renderNotes(state.notes);
    renderDocuments(state.documents);
    updateTotals(state.todayTotal, state.weekTotal);
    updateCharts(state.expenses);
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
