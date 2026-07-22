// ============================================================
//  STORE.JS — ХРАНИЛИЩЕ СОСТОЯНИЯ (ШАГ 8)
// ============================================================

import { create } from 'zustand';
import * as db from './database.js';

export const useStore = create((set, get) => ({
    // ---- СОСТОЯНИЕ ----
    expenses: [],
    car: null,
    notes: [],
    documents: [],
    fuelCards: [],
    subscription: null,
    isLoading: true,
    isSubscribed: false,
    todayTotal: 0,
    weekTotal: 0,

    // ---- ИНИЦИАЛИЗАЦИЯ ----
    init: async () => {
        set({ isLoading: true });

        try {
            const [expenses, car, notes, documents, fuelCards, subscription] = await Promise.all([
                db.getExpenses(),
                db.getCar(),
                db.getNotes(),
                db.getDocuments(),
                db.getFuelCards(),
                db.getSubscription()
            ]);

            const isSubscribed = subscription?.expiryDate
                ? new Date(subscription.expiryDate) > new Date()
                : false;

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
                fuelCards: fuelCards || [],
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

    // ---- РАСХОДЫ ----
    addExpense: async (data) => {
        const newExpense = await db.addExpense(data);

        set((state) => {
            const expenses = [newExpense, ...state.expenses];

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

    deleteExpense: async (id) => {
        await db.deleteExpense(id);

        set((state) => {
            const expenses = state.expenses.filter(e => e.id !== id);

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

    // ---- АВТОМОБИЛЬ ----
    updateCar: async (data) => {
        await db.saveCar(data);
        set({ car: data });
    },

    // ---- ПОДПИСКА ----
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
