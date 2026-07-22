// ============================================================
//  EXPENSES/EDIT.JS — РЕДАКТИРОВАНИЕ РАСХОДОВ
// ============================================================

import { useStore } from '../../core/store.js';
import { CATEGORIES } from '../../core/config.js';
import { formatDate } from '../../core/utils.js';

// Открыть модалку редактирования
export function openEditModal(expenseId) {
    const state = useStore.getState();
    const expense = state.expenses.find(e => e.id === expenseId);

    if (!expense) {
        console.error('Расход не найден');
        return;
    }

    // Создаём модалку
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'editModal';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(12px);
        z-index: 210;
        display: flex;
        align-items: flex-end;
        justify-content: center;
    `;

    // Строим HTML
    modal.innerHTML = `
        <div class="modal" style="
            background: var(--bg-deep);
            border-top: 1px solid var(--accent-border);
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            width: 100%;
            max-width: 500px;
            max-height: 85vh;
            overflow-y: auto;
            padding: 20px 18px 30px;
            animation: fadeUp 0.3s var(--transition);
        ">
            <div class="modal-header">
                <h2><i class="fas fa-edit" style="color:var(--accent);"></i> Редактировать</h2>
                <button class="modal-close" id="editModalClose"><i class="fas fa-times"></i></button>
            </div>
            <form id="editForm">
                <input type="hidden" id="editId" value="${expense.id}" />
                <div class="form-group">
                    <label>Категория</label>
                    <select id="editCategory">
                        ${Object.keys(CATEGORIES).map(key => `
                            <option value="${key}" ${key === expense.category ? 'selected' : ''}>
                                ${CATEGORIES[key].label}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Сумма (BYN)</label>
                    <input type="number" id="editAmount" value="${expense.amount}" step="0.01" min="0" required />
                </div>
                <div class="form-group">
                    <label>Описание</label>
                    <input type="text" id="editDesc" value="${expense.description || ''}" placeholder="Описание" />
                </div>
                <div class="form-group">
                    <label>Дата</label>
                    <input type="date" id="editDate" value="${expense.date}" />
                </div>
                <button type="submit" class="btn-submit">
                    <i class="fas fa-save"></i> Сохранить
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Закрытие
    modal.querySelector('#editModalClose').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Отправка формы
    const form = document.getElementById('editForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editId').value;
        const category = document.getElementById('editCategory').value;
        const amount = parseFloat(document.getElementById('editAmount').value);
        const description = document.getElementById('editDesc').value.trim();
        const date = document.getElementById('editDate').value;

        if (!amount || amount <= 0) {
            alert('Введите корректную сумму');
            return;
        }

        // Находим и обновляем расход
        const state = useStore.getState();
        const oldExpense = state.expenses.find(e => e.id === id);
        if (!oldExpense) {
            alert('Расход не найден');
            return;
        }

        // Обновляем в базе
        const updated = {
            ...oldExpense,
            category,
            amount,
            description: description || '',
            date: date || oldExpense.date
        };

        // TODO: добавить обновление в database.js
        // Пока просто удаляем и добавляем заново
        await state.deleteExpense(id);
        await state.addExpense({
            date: updated.date,
            category: updated.category,
            amount: updated.amount,
            description: updated.description,
            liters: updated.liters || null,
            mileage: updated.mileage || null,
            createdAt: updated.createdAt
        });

        // Закрываем модалку
        modal.remove();
        showToast('✅ Расход обновлён', 'success');
    });
}
