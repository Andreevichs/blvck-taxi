// ============================================================
//  SUBSCRIPTION/RENDER.JS — UI ПОДПИСКИ
// ============================================================

import { PLANS, buySubscription, isSubscribed } from './index.js';
import { formatDate } from '../../core/utils.js';

export function renderSubscriptionStatus() {
    const container = document.getElementById('subscriptionStatus');
    if (!container) return;

    const subscribed = isSubscribed();
    const state = useStore.getState();
    const expiry = state.subscription?.expiryDate;

    if (subscribed && expiry) {
        const date = formatDate(expiry);
        container.innerHTML = `
            <div style="
                background: var(--accent-dim);
                border: 1px solid var(--accent-border);
                border-radius: var(--radius-md);
                padding: 12px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <div>
                    <span style="color:var(--accent);font-weight:600;">⭐ PRO</span>
                    <span style="color:var(--text-secondary);font-size:12px;margin-left:8px;">до ${date}</span>
                </div>
                <button onclick="showSubscriptionPlans()" style="
                    background:var(--accent);
                    color:#000;
                    border:none;
                    border-radius:var(--radius-pill);
                    padding:4px 14px;
                    font-size:11px;
                    font-weight:600;
                    cursor:pointer;
                ">
                    Продлить
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button onclick="showSubscriptionPlans()" style="
                width:100%;
                background:var(--accent);
                color:#000;
                border:none;
                border-radius:var(--radius-md);
                padding:14px;
                font-size:14px;
                font-weight:700;
                cursor:pointer;
                display:flex;
                align-items:center;
                justify-content:center;
                gap:8px;
            ">
                <i class="fas fa-star"></i>
                Купить PRO
            </button>
        `;
    }
}

export function showSubscriptionPlans() {
    const modal = document.getElementById('mainModal');
    const title = document.getElementById('mainModalTitle');
    const body = document.getElementById('mainModalBody');

    if (!modal || !title || !body) return;

    title.innerHTML = '<i class="fas fa-star" style="color:var(--accent);"></i> Подписка PRO';

    let html = `
        <div style="text-align:center;margin-bottom:16px;color:var(--text-secondary);font-size:13px;">
            Получите доступ ко всем функциям BLVCK TAXI
        </div>
        <div style="display:grid;gap:10px;">
    `;

    PLANS.forEach(plan => {
        const isPopular = plan.popular;
        const isBest = plan.bestValue;

        html += `
            <div style="
                background: ${isPopular ? 'var(--accent-dim)' : 'var(--bg-surface)'};
                border: 1px solid ${isPopular ? 'var(--accent-border)' : 'var(--border-subtle)'};
                border-radius: var(--radius-md);
                padding: 14px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                position: relative;
                ${isPopular ? 'box-shadow: var(--accent-glow);' : ''}
            ">
                ${isPopular ? `
                    <div style="
                        position:absolute;
                        top:-8px;
                        right:12px;
                        background:var(--accent);
                        color:#000;
                        font-size:9px;
                        font-weight:700;
                        padding:2px 10px;
                        border-radius:var(--radius-pill);
                    ">
                        🔥 Популярный
                    </div>
                ` : ''}
                ${isBest ? `
                    <div style="
                        position:absolute;
                        top:-8px;
                        right:12px;
                        background:var(--accent);
                        color:#000;
                        font-size:9px;
                        font-weight:700;
                        padding:2px 10px;
                        border-radius:var(--radius-pill);
                    ">
                        🏆 Выгодный
                    </div>
                ` : ''}
                <div>
                    <div style="font-weight:700;font-size:15px;">${plan.label}</div>
                    <div style="font-size:11px;color:var(--text-secondary);">${plan.description}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700;font-size:18px;color:var(--accent);">${plan.price} ⭐</div>
                    <div style="font-size:10px;color:var(--text-muted);">${plan.priceUSD}</div>
                </div>
                <button onclick="window.buyPlan('${plan.id}')" style="
                    background:${isPopular ? 'var(--accent)' : 'var(--bg-surface)'};
                    border:${isPopular ? 'none' : '1px solid var(--border-subtle)'};
                    color:${isPopular ? '#000' : 'var(--text-primary)'};
                    border-radius:var(--radius-pill);
                    padding:6px 16px;
                    font-size:12px;
                    font-weight:600;
                    cursor:pointer;
                    transition:all 0.2s;
                ">
                    Выбрать
                </button>
            </div>
        `;
    });

    html += `
        </div>
        <div style="text-align:center;margin-top:16px;font-size:11px;color:var(--text-muted);">
            Оплата через Telegram Stars • Без комиссии
        </div>
    `;

    body.innerHTML = html;
    modal.classList.add('open');

    // Делаем функцию глобальной
    window.buyPlan = (planId) => {
        const plan = PLANS.find(p => p.id === planId);
        if (plan) {
            buySubscription(plan);
            modal.classList.remove('open');
        }
    };

    const closeBtn = document.getElementById('mainModalClose');
    closeBtn.onclick = () => modal.classList.remove('open');
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('open');
    };
}
