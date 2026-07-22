// Добавь эти импорты в начало файла
import { renderNotes, setNoteFilter, showAddNoteForm } from '../modules/notes/render.js';
import { renderDocuments, showAddDocumentForm } from '../modules/documents/render.js';
import { updateCharts } from '../modules/charts/index.js';

// В функции updateUI() добавь:
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

// В функции setupUI() добавь обработчики для кнопок навигации:
document.querySelectorAll('.secondary-actions button').forEach(btn => {
    btn.addEventListener('click', function() {
        const action = this.textContent.trim().toLowerCase();

        if (action.includes('график')) {
            // Показываем вкладку с графиками
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

// Функция показа вкладки с графиками
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

    // Создаём графики после отображения
    setTimeout(() => {
        const state = useStore.getState();
        updateCharts(state.expenses);
    }, 100);

    // Закрытие
    const closeBtn = document.getElementById('mainModalClose');
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
    });
}
