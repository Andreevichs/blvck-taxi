// ============================================================
//  CAR/SETTINGS.JS — НАСТРОЙКИ АВТОМОБИЛЯ
// ============================================================

import { useStore } from '../../core/store.js';
import { updateCar } from './index.js';

// Открыть настройки автомобиля
export function openCarSettings() {
    const state = useStore.getState();
    const car = state.car || {};

    // Создаём модалку
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'carSettingsModal';
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
                <h2><i class="fas fa-car" style="color:var(--accent);"></i> Мой автомобиль</h2>
                <button class="modal-close" id="carSettingsClose"><i class="fas fa-times"></i></button>
            </div>
            <form id="carSettingsForm">
                <div class="form-group">
                    <label><i class="fas fa-car"></i> Модель</label>
                    <input type="text" id="carModel" value="${car.model || ''}" placeholder="Toyota Camry" />
                </div>
                <div class="form-group">
                    <label><i class="fas fa-id-card"></i> Госномер</label>
                    <input type="text" id="carPlate" value="${car.plate || ''}" placeholder="АА 1234-7" />
                </div>
                <div class="form-group">
                    <label><i class="fas fa-tachometer-alt"></i> Расход (л/100км)</label>
                    <input type="number" id="carFuelConsumption" value="${car.fuelConsumption || ''}" placeholder="7.5" step="0.1" min="0" />
                </div>
                <div class="form-group">
                    <label><i class="fas fa-oil-can"></i> Интервал замены масла (км)</label>
                    <input type="number" id="carOilInterval" value="${car.oilInterval || 10000}" placeholder="10000" step="100" min="1000" />
                </div>
                <button type="submit" class="btn-submit">
                    <i class="fas fa-save"></i> Сохранить
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Закрытие
    modal.querySelector('#carSettingsClose').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Отправка формы
    const form = document.getElementById('carSettingsForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            model: document.getElementById('carModel').value.trim(),
            plate: document.getElementById('carPlate').value.trim(),
            fuelConsumption: parseFloat(document.getElementById('carFuelConsumption').value) || 0,
            oilInterval: parseFloat(document.getElementById('carOilInterval').value) || 10000
        };

        await updateCar(data);
        modal.remove();

        // Обновляем UI
        const { renderCarCard } = await import('./render.js');
        renderCarCard();
    });
}
