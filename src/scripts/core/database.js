// ============================================================
//  DATABASE.JS — РАБОТА С БАЗОЙ ДАННЫХ (INDEXEDDB)
// ============================================================

import Dexie from 'dexie';

// Создаём базу данных
const db = new Dexie('BlvckTaxiDB');

// Версия 1 — структура таблиц
db.version(1).stores({
    // Расходы: id, дата, категория, сумма, описание
    expenses: '++id, date, category, amount, description, createdAt',
    
    // Автомобиль: id, модель, номер, расход топлива, интервал масла
    car: 'id, model, plate, fuelConsumption, oilInterval',
    
    // Записи ТО: id, дата, тип, заголовок, описание, стоимость
    notes: '++id, date, type, title, description, amount',
    
    // Документы: id, тип, название, дата истечения, стоимость, фото
    documents: '++id, type, title, expiryDate, amount, photo',
    
    // Подписка: id, дата окончания, статус
    subscription: 'id, expiryDate, status'
});

// Открываем базу
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

// Получить все расходы
export async function getExpenses() {
    return await db.expenses.toArray();
}

// Получить расходы за день
export async function getExpensesByDate(date) {
    return await db.expenses.where('date').equals(date).toArray();
}

// Получить расходы за период
export async function getExpensesByPeriod(startDate, endDate) {
    return await db.expenses
        .where('date')
        .between(startDate, endDate)
        .toArray();
}

// Добавить расход
export async function addExpense(data) {
    const expense = {
        ...data,
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString()
    };
    await db.expenses.add(expense);
    return expense;
}

// Удалить расход
export async function deleteExpense(id) {
    await db.expenses.delete(id);
}

// Обновить расход
export async function updateExpense(id, data) {
    const expense = await db.expenses.get(id);
    if (!expense) {
        throw new Error('Расход не найден');
    }
    const updated = { ...expense, ...data };
    await db.expenses.put(updated);
    return updated;
}

// ============================================================
//  АВТОМОБИЛЬ (CAR)
// ============================================================

// Получить данные авто
export async function getCar() {
    const car = await db.car.get('main');
    if (!car) {
        // Если данных нет, создаём пустые
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

// Сохранить данные авто
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
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6)
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
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6)
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

export default db;
