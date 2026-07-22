// ============================================================
//  NOTIFICATIONS/INDEX.JS — PUSH-УВЕДОМЛЕНИЯ (TELEGRAM)
// ============================================================

import { showToast } from '../../core/utils.js';

// Настройка уведомлений
export async function initNotifications() {
    // Проверяем поддержку Notification API
    if (!('Notification' in window)) {
        console.log('❌ Notification API не поддерживается');
        return;
    }

    // Запрашиваем разрешение
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
        console.log('✅ Разрешение на уведомления получено');
        showToast('🔔 Уведомления включены', 'success');
    } else {
        console.log('❌ Разрешение на уведомления отклонено');
    }
}

// Отправить уведомление
export function sendNotification(title, body, icon = '/icons/icon-192.png') {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        try {
            const notification = new Notification(title, {
                body: body,
                icon: icon,
                vibrate: [200, 100, 200],
                requireInteraction: true
            });

            // Закрыть через 5 секунд
            setTimeout(() => notification.close(), 5000);
        } catch (error) {
            console.error('Ошибка отправки уведомления:', error);
        }
    }
}

// Отправить тестовое уведомление
export function sendTestNotification() {
    sendNotification(
        '🔔 BLVCK TAXI',
        'Уведомления работают! Вы будете получать напоминания о ТО и страховке.'
    );
}

// Подписаться на Push-уведомления через Telegram Bot
export function subscribeToTelegramBot() {
    // TODO: Интеграция с Telegram Bot API
    // Пользователь вводит свой Telegram ID
    // Бот отправляет уведомления
    showToast('🤖 Подписка на Telegram-бота будет доступна позже', 'info');
}
