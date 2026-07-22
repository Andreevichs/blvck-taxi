// ============================================================
//  FUEL-CARDS/INDEX.JS — УПРАВЛЕНИЕ ТОПЛИВНЫМИ КАРТАМИ
// ============================================================

import { useStore } from '../../core/store.js';
import { showToast, generateId } from '../../core/utils.js';
import { db } from '../../core/database.js';

// Типы топливных карт
export const FUEL_CARD_TYPES = {
    belneftekhim: { label: 'Белнефтехим', icon: 'fa-oil-can' },
    a100: { label: 'А-100', icon: 'fa-gas-pump' },
    gazprom: { label: 'Газпромнефть', icon: 'fa-fire' },
    lukoil: { label: 'Лукойл', icon: 'fa-star' },
    other: { label: 'Другая', icon: 'fa-credit-card' }
};

// Получить все топливные карты
export function getFuelCards() {
    return useStore.getState().fuelCards || [];
}

// Добавить топливную карту
export async function addFuelCard(data) {
    const card = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        balance: data.balance || 0,
        limit: data.limit || 0
    };

    await db.fuelCards.add(card);

    const state = useStore.getState();
    const fuelCards = [...(state.fuelCards || []), card];
    useStore.setState({ fuelCards });

    showToast('💳 Топливная карта добавлена', 'success');
    return card;
}

// Удалить топливную карту
export async function deleteFuelCard(id) {
    await db.fuelCards.delete(id);

    const state = useStore.getState();
    const fuelCards = (state.fuelCards || []).filter(c => c.id !== id);
    useStore.setState({ fuelCards });

    showToast('🗑️ Карта удалена', 'warning');
}

// Обновить баланс карты
export async function updateFuelCardBalance(id, amount) {
    const state = useStore.getState();
    const cards = state.fuelCards || [];
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const updated = {
        ...card,
        balance: (card.balance || 0) + amount
    };

    await db.fuelCards.put(updated);

    const fuelCards = cards.map(c => c.id === id ? updated : c);
    useStore.setState({ fuelCards });

    return updated;
}
