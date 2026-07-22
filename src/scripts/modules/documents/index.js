// ============================================================
//  DOCUMENTS/INDEX.JS — УПРАВЛЕНИЕ ДОКУМЕНТАМИ
// ============================================================

import { useStore } from '../../core/store.js';
import { showToast, generateId } from '../../core/utils.js';
import { db } from '../../core/database.js';

// Типы документов
export const DOC_TYPES = {
    insurance_go: { label: 'Страховка ГО', icon: 'fa-shield-alt' },
    green_card: { label: 'Зелёная карта', icon: 'fa-passport' },
    tech_inspection: { label: 'Техосмотр', icon: 'fa-car' },
    medical: { label: 'Медсправка', icon: 'fa-user-md' },
    license: { label: 'Лицензия', icon: 'fa-certificate' },
    rental: { label: 'Договор аренды', icon: 'fa-file-contract' },
    waybill: { label: 'Путевой лист', icon: 'fa-clipboard-list' },
    other: { label: 'Другое', icon: 'fa-folder' }
};

// Получить все документы
export function getDocuments() {
    return useStore.getState().documents || [];
}

// Добавить документ
export async function addDocument(data) {
    const doc = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString()
    };

    await db.documents.add(doc);

    const state = useStore.getState();
    const documents = [...state.documents, doc];
    useStore.setState({ documents });

    showToast('📄 Документ добавлен', 'success');
    return doc;
}

// Удалить документ
export async function deleteDocument(id) {
    await db.documents.delete(id);

    const state = useStore.getState();
    const documents = state.documents.filter(d => d.id !== id);
    useStore.setState({ documents });

    showToast('🗑️ Документ удалён', 'warning');
}

// Проверить, сколько дней до истечения
export function getDaysUntilExpiry(doc) {
    if (!doc.expiryDate) return null;
    const target = new Date(doc.expiryDate);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// Получить статус документа
export function getDocumentStatus(doc) {
    const days = getDaysUntilExpiry(doc);
    if (days === null) return 'unknown';
    if (days > 30) return 'green';
    if (days > 7) return 'yellow';
    if (days >= 0) return 'orange';
    return 'red';
}
