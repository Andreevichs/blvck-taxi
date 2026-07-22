// ============================================================
//  STORE.JS — ХРАНИЛИЩЕ СОСТОЯНИЯ (ZUSTAND)
// ============================================================

import { create } from 'zustand';
import * as db from './database.js';

// Создаём хранилище
export const useStore = create((set, get) => ({
    // ---- СОСТОЯНИЕ ----
    expenses: [],
    car: null,
    notes: [],
    documents: [],
    subscription: null,
    isLoading: true,
    isSubscribed: false,
    todayTotal: 0,
    weekTotal: 0,

    // ---- ДЕЙСТВИЯ ----

    // Инициализация — загружаем все данные
    init: async () => {
        set({ isLoading: true });

        try {
            const [expenses, car, notes, documents, subscription] = await Promise.all([
                db.getExpenses(),
                db.getCar(),
                db.getNotes(),
                db.getDocuments(),
                db.getSubscription()
            ]);

            // Проверяем подписку
            const isSubscribed = subscription?.expiryDate
                ? new Date(subscription.expiryDate) > new Date()
                : false;

            // Считаем итоги
            const today = new Date().toISOString().split('T')[0];
            const todayExpenses = expenses.filter(e => e.date === today);
            const todayTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);

            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoStr = weekAgo.toISOString().split('T')[0];
            const weekExpenses = expenses.filter(e => e.date >= weekAgoStr);
            const weekTotal = weekExpenses.reduce((s, e) => s + e.amount, 0);

            set({
                expenses,
                car,
                notes,
                documents,
                subscription,
                isSubscribed,
                todayTotal,
                weekTotal,
                isLoading: false
            });
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            set({ isLoading: false });
        }
    },

    // Добавить расход
    addExpense: async (data) => {
        const newExpense = await db.addExpense(data);

        set((state) => {
            const expenses = [newExpense, ...state.expenses];

            // Пересчитываем итоги
            const today = new Date().toISOString().split('T')[0];
            const todayExpenses = expenses.filter(e => e.date === today);
            const todayTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);

            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoStr = weekAgo.toISOString().split('T')[0];
            const weekExpenses = expenses.filter(e => e.date >= weekAgoStr);
            const weekTotal = weekExpenses.reduce((s, e) => s + e.amount, 0);

            return { expenses, todayTotal, weekTotal };
        });

        return newExpense;
    },

    // Удалить расход
    deleteExpense: async (id) => {
        await db.deleteExpense(id);

        set((state) => {
            const expenses = state.expenses.filter(e => e.id !== id);

            // Пересчитываем итоги
            const today = new Date().toISOString().split('T')[0];
            const todayExpenses = expenses.filter(e => e.date === today);
            const todayTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);

            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoStr = weekAgo.toISOString().split('T')[0];
            const weekExpenses = expenses.filter(e => e.date >= weekAgoStr);
            const weekTotal = weekExpenses.reduce((s, e) => s + e.amount, 0);

            return { expenses, todayTotal, weekTotal };
        });
    },

    // Добавь это действие в useStore

// Обновить расход
updateExpense: async (id, data) => {
    const { date, category, amount, description } = data;

    // Находим старый расход
    const oldExpense = state.expenses.find(e => e.id === id);
    if (!oldExpense) return;

    // Обновляем в базе
    const updated = {
        ...oldExpense,
        date: date || oldExpense.date,
        category: category || oldExpense.category,
        amount: amount || oldExpense.amount,
        description: description !== undefined ? description : oldExpense.description
    };

    // TODO: использовать updateExpense из database.js
    // Пока пересоздаём
    await state.deleteExpense(id);
    await state.addExpense({
        date: updated.date,
        category: updated.category,
        amount: updated.amount,
        description: updated.description,
        liters: updated.liters || null,
        mileage: updated.mileage || null,
        createdAt: updated.createdAt || new Date().toISOString()
    });

    // Обновляем локальное состояние
    set((state) => {
        const expenses = state.expenses.map(e => e.id === id ? updated : e);
        // Пересчитываем итоги...
        // (код пересчёта как в addExpense)
        return { expenses };
    });
}

    // Обновить автомобиль
    updateCar: async (data) => {
        await db.saveCar(data);
        set({ car: data });
    },

    // Обновить подписку
    updateSubscription: async (months) => {
        const date = new Date();
        date.setMonth(date.getMonth() + months);

        const data = {
            expiryDate: date.toISOString(),
            status: 'active'
        };

        await db.saveSubscription(data);
        set({ subscription: data, isSubscribed: true });
    }
}));
