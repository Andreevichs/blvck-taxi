// ============================================================
//  FUEL-CARDS/INDEX.JS — УПРАВЛЕНИЕ ТОПЛИВНЫМИ КАРТАМИ (ШАГ 8)
// ============================================================

import { useStore } from '../../core/store.js';
import { showToast } from '../../core/utils.js';
import * as db from '../../core/database.js';

export const FUEL_CARD_TYPES = {
    belneftekhim: { label: 'Белнефтехим', icon: 'fa-oil-can' },
    a100: { label: 'А-100', icon: 'fa-gas-pump' },
    gazprom: { label: 'Газпромнефть', icon: 'fa-fire' },
    lukoil: { label: 'Лукойл', icon: 'fa-star' },
    other: { label: 'Другая', icon: 'fa-credit-card' }
};

export function getFuelCards() {
    return useStore.getState().fuelCards || [];
}

export async function addFuelCard(data) {
    const card = {
        ...data,
        balance: data.balance || 0,
        limit: data.limit || 0,
        createdAt: new Date().toISOString()
    };

    const result = await db.addFuelCard(card);

    const state = useStore.getState();
    const fuelCards = [...(state.fuelCards || []), result];
    useStore.setState({ fuelCards });

    showToast('💳 Топливная карта добавлена', 'success');
    return result;
}

export async function deleteFuelCard(id) {
    await db.deleteFuelCard(id);

    const state = useStore.getState();
    const fuelCards = (state.fuelCards || []).filter(c => c.id !== id);
    useStore.setState({ fuelCards });

    showToast('🗑️ Карта удалена', 'warning');
}

export async function updateFuelCardBalance(id, amount) {
    const state = useStore.getState();
    const cards = state.fuelCards || [];
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const updated = {
        ...card,
        balance: (card.balance || 0) + amount
    };

    await db.updateFuelCard(id, updated);

    const fuelCards = cards.map(c => c.id === id ? updated : c);
    useStore.setState({ fuelCards });

    return updated;
}
