// ============================================================
//  DATABASE.JS — РАБОТА С БАЗОЙ ДАННЫХ
// ============================================================

import Dexie from 'dexie';

// Создаём базу данных
const db = new Dexie('BlvckTaxiDB');

// Версия 1 — структура таблиц
db.version(1).stores({
    expenses: '++id, date, category, amount, description, createdAt',
    car: 'id, model, plate, fuelConsumption, oilInterval, oilLastReset',
    notes: '++id, date, type, title, description, amount, partName, partMileage, createdAt',
    documents: '++id, type, title, expiryDate, amount, photo, createdAt',
    subscription: 'id, expiryDate, status',
    fuelCards: '++id, type, name, number, driverName, balance, limit, createdAt'
});

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

export async function initDB() {
    try {
        await db.open();
        console.log('📦 База данных открыта');
        return db;
    } catch (error) {
        console.error('❌ Ошибка открытия базы:', error);
        throw error;
    }
}

// ============================================================
//  РАСХОДЫ (EXPENSES)
// ============================================================

export async function getExpenses() {
    return await db.expenses.toArray();
}

export async function getExpensesByDate(date) {
    return await db.expenses.where('date').equals(date).toArray();
}

export async function getExpensesByPeriod(startDate, endDate) {
    return await db.expenses
        .where('date')
        .between(startDate, endDate)
        .toArray();
}

export async function addExpense(data) {
    const expense = {
        ...data,
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString()
    };
    await db.expenses.add(expense);
    return expense;
}

export async function deleteExpense(id) {
    await db.expenses.delete(id);
}

export async function updateExpense(id, data) {
    const expense = await db.expenses.get(id);
    if (!expense) throw new Error('Расход не найден');
    const updated = { ...expense, ...data };
    await db.expenses.put(updated);
    return updated;
}

// ============================================================
//  АВТОМОБИЛЬ (CAR)
// ============================================================

export async function getCar() {
    const car = await db.car.get('main');
    if (!car) {
        const defaultCar = {
            id: 'main',
            model: '',
            plate: '',
            fuelConsumption: 0,
            oilInterval: 10000,
            oilLastReset: null
        };
        await db.car.add(defaultCar);
        return defaultCar;
    }
    return car;
}

export async function saveCar(data) {
    await db.car.put({ ...data, id: 'main' });
}

// ============================================================
//  ЗАПИСИ ТО (NOTES)
// ============================================================

export async function getNotes() {
    return await db.notes.toArray();
}

export async function addNote(data) {
    const note = {
        ...data,
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString()
    };
    await db.notes.add(note);
    return note;
}

export async function deleteNote(id) {
    await db.notes.delete(id);
}

// ============================================================
//  ДОКУМЕНТЫ (DOCUMENTS)
// ============================================================

export async function getDocuments() {
    return await db.documents.toArray();
}

export async function addDocument(data) {
    const doc = {
        ...data,
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString()
    };
    await db.documents.add(doc);
    return doc;
}

export async function deleteDocument(id) {
    await db.documents.delete(id);
}

// ============================================================
//  ПОДПИСКА (SUBSCRIPTION)
// ============================================================

export async function getSubscription() {
    const sub = await db.subscription.get('main');
    if (!sub) {
        return { id: 'main', expiryDate: null, status: 'free' };
    }
    return sub;
}

export async function saveSubscription(data) {
    await db.subscription.put({ ...data, id: 'main' });
}

// ============================================================
//  ТОПЛИВНЫЕ КАРТЫ (FUEL CARDS)
// ============================================================

export async function getFuelCards() {
    return await db.fuelCards.toArray();
}

export async function addFuelCard(data) {
    const card = {
        ...data,
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString()
    };
    await db.fuelCards.add(card);
    return card;
}

export async function updateFuelCard(id, data) {
    const card = await db.fuelCards.get(id);
    if (!card) throw new Error('Карта не найдена');
    const updated = { ...card, ...data };
    await db.fuelCards.put(updated);
    return updated;
}

export async function deleteFuelCard(id) {
    await db.fuelCards.delete(id);
}

// ============================================================
//  ЭКСПОРТ ОБЪЕКТА db ДЛЯ ИСПОЛЬЗОВАНИЯ В ДРУГИХ МОДУЛЯХ
// ============================================================

export { db };

export default db;
