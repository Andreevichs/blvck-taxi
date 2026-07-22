// ============================================================
//  DOCUMENTS/RENDER.JS — ОТОБРАЖЕНИЕ ДОКУМЕНТОВ (ШАГ 7)
// ============================================================

import { DOC_TYPES, getDocumentStatus, getDaysUntilExpiry, deleteDocument } from './index.js';
import { formatDate, showToast } from '../../core/utils.js';

export function renderDocuments(documents) {
    const container = document.getElementById('documentsList');
    if (!container) return;

    if (!documents || documents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>Нет документов</p>
                <p class="sub">Добавьте страховку, техосмотр, лицензию...</p>
            </div>
        `;
        return;
    }

    const sorted = [...documents].sort((a, b) => {
        const daysA = getDaysUntilExpiry(a) ?? 999;
        const daysB = getDaysUntilExpiry(b) ?? 999;
        return daysA - daysB;
    });

    let html = '<div class="doc-grid">';

    sorted.forEach(doc => {
        const typeInfo = DOC_TYPES[doc.type] || DOC_TYPES.other;
        const status = getDocumentStatus(doc);
        const days = getDaysUntilExpiry(doc);

        let statusLabel = '✅ Действует';
        let statusClass = 'green';
        if (status === 'yellow') {
            statusLabel = `⚠️ ${days} дн.`;
            statusClass = 'yellow';
        } else if (status === 'orange') {
            statusLabel = `🔴 ${days} дн.`;
            statusClass = 'red';
        } else if (status === 'red') {
            statusLabel = `🚨 Просрочен`;
            statusClass = 'red';
        }

        const dateStr = doc.expiryDate ? formatDate(doc.expiryDate) : '—';
        const amount = doc.amount ? doc.amount.toFixed(2) + ' BYN' : '';

        html += `
            <div class="doc-card">
                <div class="doc-status ${statusClass}"></div>
                <div class="doc-icon"><i class="fas ${typeInfo.icon}"></i></div>
                <div class="doc-name">${doc.title || typeInfo.label}</div>
                <div class="doc-details">До: ${dateStr}</div>
                ${amount ? `<div class="doc-details" style="color:var(--accent);">${amount}</div>` : ''}
                <div class="doc-days ${statusClass}">${statusLabel}</div>
                <div class="doc-actions">
                    <button class="delete-doc-btn" data-id="${doc.id}">
                        <i class="fas fa-trash-alt"></i> Удалить
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.delete-doc-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.dataset.id;
            if (confirm('Удалить документ?')) {
                await deleteDocument(id);
                const { getDocuments } = await import('./index.js');
                renderDocuments(getDocuments());
                showToast('🗑️ Документ удалён', 'warning');
            }
        });
    });
}

export function showAddDocumentForm() {
    const modal = document.getElementById('mainModal');
    const title = document.getElementById('mainModalTitle');
    const body = document.getElementById('mainModalBody');

    if (!modal || !title || !body) return;

    title.innerHTML = '<i class="fas fa-plus-circle" style="color:var(--accent);"></i> Добавить документ';

    body.innerHTML = `
        <form id="docForm">
            <div class="form-group">
                <label>Тип</label>
                <select id="docType">
                    ${Object.entries(DOC_TYPES).map(([key, val]) => `
                        <option value="${key}">${val.label}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Название</label>
                <input type="text" id="docTitle" placeholder="Название документа" />
            </div>
            <div class="form-group">
                <label>Дата истечения</label>
                <input type="date" id="docExpiryDate" />
            </div>
            <div class="form-group">
                <label>Стоимость (BYN)</label>
                <input type="number" id="docAmount" placeholder="0.00" step="0.01" min="0" />
            </div>
            <button type="submit" class="btn-submit">
                <i class="fas fa-save"></i> Добавить
            </button>
        </form>
    `;

    modal.classList.add('open');

    const form = document.getElementById('docForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const type = document.getElementById('docType').value;
        const title = document.getElementById('docTitle').value.trim() || DOC_TYPES[type].label;
        const expiryDate = document.getElementById('docExpiryDate').value;
        const amount = parseFloat(document.getElementById('docAmount').value) || 0;

        if (!expiryDate) {
            alert('Укажите дату истечения');
            return;
        }

        const { addDocument, getDocuments } = await import('./index.js');
        await addDocument({ type, title, expiryDate, amount });

        modal.classList.remove('open');
        renderDocuments(getDocuments());
        showToast('✅ Документ добавлен', 'success');
    });

    const closeBtn = document.getElementById('mainModalClose');
    closeBtn.onclick = () => modal.classList.remove('open');
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('open');
    };
}
