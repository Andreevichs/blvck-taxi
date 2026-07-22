// ============================================================
//  NOTES/INDEX.JS — УПРАВЛЕНИЕ ЗАПИСЯМИ ТО
// ============================================================

import { useStore } from '../../core/store.js';
import { showToast, generateId } from '../../core/utils.js';
import db from '../../core/database.js';

// Типы записей ТО
export const NOTE_TYPES = {
    maintenance: { label: 'ТО', icon: 'fa-tools' },
    oil: { label: 'Замена масла', icon: 'fa-oil-can' },
    filters: { label: 'Замена фильтров', icon: 'fa-filter' },
    suspension: { label: 'Ремонт подвески', icon: 'fa-car-crash' },
    parts: { label: 'Запчасти', icon: 'fa-cogs' }
};

// Получить все записи
export function getNotes() {
    return useStore.getState().notes || [];
}

// Добавить запись
export async function addNote(data) {
    const note = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString()
    };

    await db.notes.add(note);

    const state = useStore.getState();
    const notes = [...state.notes, note];
    useStore.setState({ notes });

    showToast('📝 Запись добавлена в журнал ТО', 'success');
    return note;
}

// Удалить запись
export async function deleteNote(id) {
    await db.notes.delete(id);

    const state = useStore.getState();
    const notes = state.notes.filter(n => n.id !== id);
    useStore.setState({ notes });

    showToast('🗑️ Запись удалена', 'warning');
}
