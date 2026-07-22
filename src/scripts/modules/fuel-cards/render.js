// ============================================================
//  FUEL-CARDS/RENDER.JS — ОТОБРАЖЕНИЕ ТОПЛИВНЫХ КАРТ
// ============================================================

import { FUEL_CARD_TYPES, deleteFuelCard } from './index.js';
import { formatDate } from '../../core/utils.js';

export function renderFuelCards(cards) {
    const container = document.getElementById('fuelCardsList');
    if (!container) return;

    if (!cards || cards.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-credit-card"></i>
                <p>Нет топливных карт</p>
                <p class="sub">Добавьте карту для контроля топлива</p>
            </div>
        `;
        return;
    }

    let html = '<div class="fuel-cards-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';

    cards.forEach(card => {
        const typeInfo = FUEL_CARD_TYPES[card.type] || FUEL_CARD_TYPES.other;
        const balancePercent = card.limit > 0 ? (card.balance / card.limit) * 100 : 0;
        const statusColor = balancePercent > 70 ? 'var(--success)' : balancePercent > 30 ? 'var(--warning)' : 'var(--danger)';

        html += `
            <div class="fuel-card" style="
                background: var(--bg-surface);
                border: 1px solid var(--border-subtle);
                border-radius: var(--radius-md);
                padding: 14px;
                position: relative;
            ">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    <div style="font-size:20px;color:var(--accent);">
                        <i class="fas ${typeInfo.icon}"></i>
                    </div>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:13px;">${card.name || typeInfo.label}</div>
                        <div style="font-size:10px;color:var(--text-muted);">${card.number || 'Номер не указан'}</div>
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                    <span style="color:var(--text-secondary);">Баланс</span>
                    <span style="font-weight:600;">${(card.balance || 0).toFixed(2)} BYN</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px;">
                    <span style="color:var(--text-secondary);">Лимит</span>
                    <span style="font-weight:600;">${(card.limit || 0).toFixed(2)} BYN</span>
                </div>
                <div style="height:4px;background:var(--bg-surface);border-radius:4px;overflow:hidden;margin-bottom:8px;">
                    <div style="height:100%;width:${Math.min(balancePercent, 100)}%;background:${statusColor};border-radius:4px;transition:width 0.3s;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);">
                    <span>Водитель: ${card.driverName || '—'}</span>
                    <button class="delete-fuel-card" data-id="${card.id}" style="
                        background:none;
                        border:none;
                        color:var(--text-muted);
                        cursor:pointer;
                        font-size:12px;
                    ">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.delete-fuel-card').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.dataset.id;
            if (confirm('Удалить карту?')) {
                await deleteFuelCard(id);
                const { getFuelCards } = await import('./index.js');
                renderFuelCards(getFuelCards());
            }
        });
    });
}

export function showAddFuelCardForm() {
    const modal = document.getElementById('mainModal');
    const title = document.getElementById('mainModalTitle');
    const body = document.getElementById('mainModalBody');

    if (!modal || !title || !body) return;

    title.innerHTML = '<i class="fas fa-credit-card" style="color:var(--accent);"></i> Добавить топливную карту';

    body.innerHTML = `
        <form id="fuelCardForm">
            <div class="form-group">
                <label>Тип карты</label>
                <select id="fuelCardType">
                    ${Object.entries(FUEL_CARD_TYPES).map(([key, val]) => `
                        <option value="${key}">${val.label}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Название</label>
                <input type="text" id="fuelCardName" placeholder="Моя карта" />
            </div>
            <div class="form-group">
                <label>Номер карты</label>
                <input type="text" id="fuelCardNumber" placeholder="XXXX-XXXX-XXXX-XXXX" />
            </div>
            <div class="form-group">
                <label>Водитель</label>
                <input type="text" id="fuelCardDriver" placeholder="Имя водителя" />
            </div>
            <div class="form-group">
                <label>Лимит (BYN)</label>
                <input type="number" id="fuelCardLimit" placeholder="1000" step="0.01" min="0" />
            </div>
            <button type="submit" class="btn-submit">
                <i class="fas fa-save"></i> Добавить карту
            </button>
        </form>
    `;

    modal.classList.add('open');

    const form = document.getElementById('fuelCardForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const type = document.getElementById('fuelCardType').value;
        const name = document.getElementById('fuelCardName').value.trim() || FUEL_CARD_TYPES[type].label;
        const number = document.getElementById('fuelCardNumber').value.trim();
        const driverName = document.getElementById('fuelCardDriver').value.trim();
        const limit = parseFloat(document.getElementById('fuelCardLimit').value) || 0;

        const { addFuelCard, getFuelCards } = await import('./index.js');
        await addFuelCard({ type, name, number, driverName, limit, balance: 0 });

        modal.classList.remove('open');
        renderFuelCards(getFuelCards());
        showToast('💳 Топливная карта добавлена', 'success');
    });

    const closeBtn = document.getElementById('mainModalClose');
    closeBtn.onclick = () => modal.classList.remove('open');
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('open');
    };
}
