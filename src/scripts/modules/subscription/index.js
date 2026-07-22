// ============================================================
//  SUBSCRIPTION/INDEX.JS — ПОДПИСКА (TELEGRAM STARS) (ШАГ 8)
// ============================================================

import { useStore } from '../../core/store.js';
import { showToast } from '../../core/utils.js';

export const PLANS = [
    {
        id: 'month',
        label: '1 месяц',
        price: 60,
        priceUSD: '~$0.60',
        months: 1,
        description: 'Полный доступ на 30 дней'
    },
    {
        id: 'quarter',
        label: '3 месяца',
        price: 150,
        priceUSD: '~$1.50',
        months: 3,
        description: 'Экономьте 15%',
        popular: true
    },
    {
        id: 'year',
        label: '12 месяцев',
        price: 400,
        priceUSD: '~$4.00',
        months: 12,
        description: 'Экономьте 40%',
        bestValue: true
    }
];

export function isSubscribed() {
    const state = useStore.getState();
    if (!state.subscription?.expiryDate) return false;
    return new Date(state.subscription.expiryDate) > new Date();
}

export function buySubscription(plan) {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
        if (confirm(`Тестовый режим: купить подписку "${plan.label}" за ${plan.price} Stars?`)) {
            activateSubscription(plan.months);
        }
        return;
    }

    try {
        tg.openInvoice({
            title: 'BLVCK TAXI — Подписка',
            description: plan.description,
            payload: JSON.stringify({ plan: plan.id, months: plan.months }),
            provider_token: '',
            currency: 'XTR',
            prices: [
                { label: plan.label, amount: plan.price }
            ]
        });

        tg.onEvent('invoiceClosed', (data) => {
            if (data.status === 'paid') {
                activateSubscription(plan.months);
            } else {
                showToast('❌ Оплата отменена', 'error');
            }
        });
    } catch (error) {
        console.error('Ошибка оплаты:', error);
        showToast('❌ Ошибка при открытии оплаты', 'error');
    }
}

async function activateSubscription(months) {
    try {
        await useStore.getState().updateSubscription(months);
        showToast(`🎉 Подписка активирована на ${months} месяцев!`, 'success');
        const { renderSubscriptionStatus } = await import('./render.js');
        renderSubscriptionStatus();
    } catch (error) {
        console.error('Ошибка активации:', error);
        showToast('❌ Ошибка активации подписки', 'error');
    }
}
