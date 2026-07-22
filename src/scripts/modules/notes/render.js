// ============================================================
//  NOTES/RENDER.JS — ОТОБРАЖЕНИЕ ЖУРНАЛА ТО
// ============================================================

import { NOTE_TYPES, deleteNote } from './index.js';
import { formatDate } from '../../core/utils.js';

let currentFilter = 'all';

// Рендеринг записей ТО
export function renderNotes(notes) {
    const container = document.getElementById('notesList');
    if (!container) return;

    // Фильтрация
    let filtered = notes;
    if (currentFilter !== 'all') {
        filtered = notes.filter(n => n.type === currentFilter);
    }

    // Сортировка по дате (сначала новые)
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sticky-note"></i>
                <p>Нет записей в журнале ТО</p>
                <p class="sub">Добавьте запись о работе, ремонте или замене деталей</p>
            </div>
        `;
        return;
    }

    let html = '';
    sorted.forEach(note => {
        const typeInfo = NOTE_TYPES[note.type] || NOTE_TYPES.maintenance;
        const dateStr = formatDate(note.date);
        const amount = note.amount ? note.amount.toFixed(2) + ' BYN' : '';

        html += `
            <div class="note-item">
                <div class="note-icon">
                    <i class="fas ${typeInfo.icon}"></i>
                </div>
                <div class="note-content">
                    <div class="note-title">${note.title || 'Без заголовка'}</div>
                    ${note.description ? `<div class="note-desc">${note.description}</div>` : ''}
                    <div class="note-meta">
                        <span><i class="far fa-calendar-alt"></i> ${dateStr}</span>
                        <span class="note-tag">${typeInfo.label}</span>
                        ${note.partName ? `<span>🔧 ${note.partName}</span>` : ''}
                        ${note.partMileage ? `<span>📊 ${note.partMileage} км</span>` : ''}
                    </div>
                </div>
                ${amount ? `<div class="note-amount">${amount}</div>` : ''}
                <button class="delete-note-btn" data-id="${note.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    });

    container.innerHTML = html;

    // Обработчики удаления
    container.querySelectorAll('.delete-note-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.dataset.id;
            if (confirm('Удалить запись?')) {
                await deleteNote(id);
                const { getNotes } = await import('./index.js');
                renderNotes(getNotes());
            }
        });
    });
}

// Установить фильтр
export function setNoteFilter(filter) {
    currentFilter = filter;

    // Обновляем активную кнопку
    document.querySelectorAll('.notes-filter button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    const { getNotes } = await import('./index.js');
    renderNotes(getNotes());
}

// Показать форму добавления записи ТО
export function showAddNoteForm() {
    const modal = document.getElementById('mainModal');
    const title = document.getElementById('mainModalTitle');
    const body = document.getElementById('mainModalBody');

    if (!modal || !title || !body) return;

    title.innerHTML = '<i class="fas fa-wrench" style="color:var(--accent);"></i> Добавить запись ТО';

    body.innerHTML = `
        <form id="noteForm">
            <div class="form-group">
                <label>Тип</label>
                <select id="noteType">
                    ${Object.entries(NOTE_TYPES).map(([key, val]) => `
                        <option value="${key}">${val.label}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Заголовок</label>
                <input type="text" id="noteTitle" placeholder="Заголовок" />
            </div>
            <div class="form-group">
                <label>Описание</label>
                <textarea id="noteDesc" placeholder="Описание работы..." rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>Дата</label>
                <input type="date" id="noteDate" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="form-group">
                <label>Стоимость (BYN)</label>
                <input type="number" id="noteAmount" placeholder="0.00" step="0.01" min="0" />
            </div>
            <div class="form-group" id="partsFields" style="display:none;">
                <label>Деталь</label>
                <input type="text" id="partName" placeholder="Название детали" />
            </div>
            <div class="form-group" id="mileageField" style="display:none;">
                <label>Пробег (км)</label>
                <input type="number" id="partMileage" placeholder="0" step="1" min="0" />
            </div>
            <button type="submit" class="btn-submit">
                <i class="fas fa-save"></i> Добавить
            </button>
        </form>
    `;

    modal.classList.add('open');

    // Показываем поля для деталей и пробега
    const typeSelect = document.getElementById('noteType');
    typeSelect.addEventListener('change', function() {
        document.getElementById('partsFields').style.display = this.value === 'parts' ? 'block' : 'none';
        document.getElementById('mileageField').style.display = this.value === 'parts' ? 'block' : 'none';
    });

    // Обработчик формы
    const form = document.getElementById('noteForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const type = document.getElementById('noteType').value;
        const title = document.getElementById('noteTitle').value.trim() || 'Без заголовка';
        const description = document.getElementById('noteDesc').value.trim();
        const date = document.getElementById('noteDate').value;
        const amount = parseFloat(document.getElementById('noteAmount').value) || 0;
        const partName = document.getElementById('partName')?.value.trim() || '';
        const partMileage = parseInt(document.getElementById('partMileage')?.value) || 0;

        if (!date) {
            alert('Укажите дату');
            return;
        }

        const { addNote, getNotes } = await import('./index.js');
        await addNote({
            type,
            title,
            description,
            date,
            amount,
            partName,
            partMileage: partMileage || undefined
        });

        modal.classList.remove('open');
        renderNotes(getNotes());
        showToast('✅ Запись добавлена в журнал ТО', 'success');
    });
}
