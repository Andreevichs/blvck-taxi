// ============================================================
//  CAR/RENDER.JS — ОТОБРАЖЕНИЕ КАРТОЧКИ АВТОМОБИЛЯ
// ============================================================

import { getCar, getOilStatus, calculateMileage } from './index.js';
import { useStore } from '../../core/store.js';
import { openCarSettings } from './settings.js';

// Рендеринг карточки авто
export function renderCarCard() {
    const container = document.getElementById('carCard');
    if (!container) return;

    const state = useStore.getState();
    const car = state.car;
    const expenses = state.expenses;

    if (!car) {
        container.innerHTML = `
            <div class="car-card-empty" style="
                padding: 16px;
                text-align: center;
                color: var(--text-muted);
                background: var(--bg-surface);
                border: 1px solid var(--border-subtle);
                border-radius: var(--radius-md);
                cursor: pointer;
                transition: all 0.2s;
            ">
                <i class="fas fa-car" style="font-size: 24px; color: var(--accent); opacity: 0.3; margin-bottom: 8px;"></i>
                <p style="font-size: 13px;">Нажмите, чтобы добавить автомобиль</p>
            </div>
        `;
        container.addEventListener('click', openCarSettings);
        return;
    }

    // Рассчитываем пробег
    const mileage = calculateMileage(expenses, car);
    const oilStatus = getOilStatus(car, mileage);

    // Статус масла
    let oilBadge = '';
    if (oilStatus.status === 'unknown') {
        oilBadge = `<span class="oil-badge unknown">🛢️ Укажите интервал</span>`;
    } else if (oilStatus.status === 'good') {
        oilBadge = `<span class="oil-badge good">✅ Замена через ${Math.round(oilStatus.remaining)} км</span>`;
    } else if (oilStatus.status === 'warning') {
        oilBadge = `<span class="oil-badge warning">⚠️ Замена через ${Math.round(oilStatus.remaining)} км</span>`;
    } else if (oilStatus.status === 'danger') {
        oilBadge = `<span class="oil-badge danger">🚨 СРОЧНО замените масло!</span>`;
    }

    container.innerHTML = `
        <div class="car-card" style="
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px 18px;
            background: var(--bg-surface);
            border: 1px solid var(--accent-border);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.2s;
        ">
            <div class="car-icon" style="
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: var(--accent-dim);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: var(--accent);
                flex-shrink: 0;
            ">
                <i class="fas fa-car-side"></i>
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">
                    ${car.model || 'Мой автомобиль'}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); letter-spacing: 0.5px;">
                    ${car.plate || 'Нажмите чтобы добавить'}
                </div>
                <div style="display: flex; gap: 10px; margin-top: 4px; flex-wrap: wrap;">
                    <span style="font-size: 11px; color: var(--text-muted);">
                        <i class="fas fa-tachometer-alt" style="color: var(--accent);"></i>
                        Расход: <strong style="color: var(--text-secondary);">${car.fuelConsumption || '—'}</strong> л/100км
                    </span>
                    <span style="font-size: 11px; color: var(--text-muted);">
                        <i class="fas fa-road" style="color: var(--accent);"></i>
                        Пробег: <strong style="color: var(--text-secondary);">${mileage !== null ? Math.round(mileage) : '—'}</strong> км
                    </span>
                </div>
                <div style="margin-top: 6px;">
                    ${oilBadge}
                </div>
            </div>
            <button class="edit-car-btn" style="
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                font-size: 14px;
                padding: 4px;
                flex-shrink: 0;
            ">
                <i class="fas fa-edit"></i>
            </button>
        </div>
    `;

    // Клик по карточке открывает настройки
    container.querySelector('.car-card')?.addEventListener('click', openCarSettings);
    container.querySelector('.edit-car-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openCarSettings();
    });
}
