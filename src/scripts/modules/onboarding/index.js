// ============================================================
//  ONBOARDING/INDEX.JS — ОНБОРДИНГ (ШАГ 9)
// ============================================================

const STEPS = [
    {
        icon: 'fa-plus-circle',
        title: 'Добавляй расходы за 5 секунд',
        description: 'Нажми на кнопку "Заправка", "Ремонт" или "Мойка" и введи сумму. Всё!'
    },
    {
        icon: 'fa-eye',
        title: 'Смотри свои траты',
        description: 'Все расходы за сегодня видны на главном экране. Итог за день и неделю — автоматически'
    },
    {
        icon: 'fa-file-pdf',
        title: 'Отчёт для бухгалтерии',
        description: 'В конце месяца нажми на иконку 📄 в шапке и скачай отчёт в PDF'
    }
];

export function needOnboarding() {
    const hasSeen = localStorage.getItem('blvck_taxi_onboarding_seen');
    return !hasSeen;
}

export function showOnboarding() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 9998;
            background: rgba(3, 15, 9, 0.94);
            backdrop-filter: blur(16px);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            padding: 24px;
            transition: opacity 0.4s ease;
        `;

        let currentStep = 0;

        function renderStep() {
            const step = STEPS[currentStep];
            const isLast = currentStep === STEPS.length - 1;

            overlay.innerHTML = `
                <div class="onboarding-step" style="
                    text-align: center;
                    max-width: 340px;
                    width: 100%;
                    animation: fadeUp 0.4s ease forwards;
                ">
                    <div class="onboarding-icon" style="
                        font-size: 56px;
                        color: var(--accent);
                        margin-bottom: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i class="fas ${step.icon}"></i>
                    </div>
                    <h2 style="
                        font-family: var(--font-display);
                        font-size: 22px;
                        font-weight: 700;
                        margin-bottom: 8px;
                        color: var(--text-primary);
                    ">${step.title}</h2>
                    <p style="
                        font-size: 14px;
                        color: var(--text-secondary);
                        line-height: 1.6;
                        margin-bottom: 24px;
                    ">${step.description}</p>
                    <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 20px;">
                        ${STEPS.map((_, i) => `
                            <div style="
                                width: 8px;
                                height: 8px;
                                border-radius: 50%;
                                background: ${i === currentStep ? 'var(--accent)' : 'var(--text-muted)'};
                                transition: background 0.3s;
                            "></div>
                        `).join('')}
                    </div>
                    <button class="onboarding-btn" style="
                        padding: 14px 48px;
                        background: var(--accent);
                        color: #000;
                        border: none;
                        border-radius: var(--radius-pill);
                        font-family: var(--font);
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s;
                        width: 100%;
                        max-width: 200px;
                    ">
                        ${isLast ? '🚀 Начать!' : 'Далее →'}
                    </button>
                </div>
            `;

            const btn = overlay.querySelector('.onboarding-btn');
            btn.addEventListener('click', () => {
                if (isLast) {
                    localStorage.setItem('blvck_taxi_onboarding_seen', 'true');
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.remove();
                        resolve();
                    }, 300);
                } else {
                    currentStep++;
                    renderStep();
                }
            });

            // Кнопка "Пропустить"
            if (!isLast) {
                const skipBtn = document.createElement('button');
                skipBtn.textContent = 'Пропустить';
                skipBtn.style.cssText = `
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 12px;
                    cursor: pointer;
                    font-family: var(--font);
                `;
                skipBtn.addEventListener('click', () => {
                    localStorage.setItem('blvck_taxi_onboarding_seen', 'true');
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.remove();
                        resolve();
                    }, 300);
                });
                overlay.appendChild(skipBtn);
            }

            document.body.appendChild(overlay);
        }

        renderStep();
    });
}
