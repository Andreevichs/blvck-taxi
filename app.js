// ============================================================
//  BLVCK TAXI — Вся логика приложения
// ============================================================

// ============================================================
//  UTILITY FUNCTIONS
// ============================================================
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function generateId() {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function getDaysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast animate-fade-up';
  const icons = {
    info: 'fa-info-circle',
    success: 'fa-check-circle',
    warning: 'fa-exclamation-triangle',
    error: 'fa-times-circle'
  };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ============================================================
//  DATABASE — IndexedDB
// ============================================================
const DB_NAME = 'TaxiExpensesDB';
const DB_VERSION = 3;
const STORE_EXPENSES = 'expenses';
const STORE_NOTES = 'notes';
const STORE_CAR = 'car';
const STORE_DOCUMENTS = 'documents';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_EXPENSES)) {
        const store = db.createObjectStore(STORE_EXPENSES, { keyPath: 'id' });
        store.createIndex('date', 'date');
        store.createIndex('category', 'category');
      }
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const store = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
        store.createIndex('date', 'date');
        store.createIndex('type', 'type');
      }
      if (!db.objectStoreNames.contains(STORE_CAR)) {
        db.createObjectStore(STORE_CAR, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
        const store = db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
        store.createIndex('type', 'type');
        store.createIndex('expiryDate', 'expiryDate');
      }
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function getAllFromStore(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putToStore(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteFromStore(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================
//  CATEGORIES
// ============================================================
const CATEGORIES = {
  fuel: { label: 'Бензин', icon: 'fa-gas-pump' },
  insurance: { label: 'Страховка', icon: 'fa-shield' },
  wash: { label: 'Мойка', icon: 'fa-spray-can' },
  fszn: { label: 'ФСЗН', icon: 'fa-building' },
  medic: { label: 'Медик/Механик', icon: 'fa-user-md' },
  repair: { label: 'Ремонт на СТО', icon: 'fa-wrench' },
  parts: { label: 'Запчасти', icon: 'fa-cogs' },
  other: { label: 'Прочие', icon: 'fa-ellipsis-h' }
};

const CAT_KEYS = Object.keys(CATEGORIES);

// ============================================================
//  NOTE TYPES
// ============================================================
const NOTE_TYPES = {
  maintenance: { label: 'ТО', icon: 'fa-tools' },
  oil: { label: 'Замена масла', icon: 'fa-oil-can' },
  filters: { label: 'Замена фильтров', icon: 'fa-filter' },
  suspension: { label: 'Ремонт подвески', icon: 'fa-car-crash' },
  parts: { label: 'Запчасти', icon: 'fa-cogs' }
};

// ============================================================
//  DOCUMENT TYPES
// ============================================================
const DOC_TYPES = {
  insurance_go: { label: 'Страховка ГО', icon: 'fa-shield-alt' },
  green_card: { label: 'Зелёная карта', icon: 'fa-passport' },
  tech_inspection: { label: 'Техосмотр', icon: 'fa-car' },
  medical: { label: 'Медсправка', icon: 'fa-user-md' },
  license: { label: 'Лицензия перевозчика', icon: 'fa-certificate' },
  rental: { label: 'Договор аренды', icon: 'fa-file-contract' },
  health_insurance: { label: 'Страховка жизни', icon: 'fa-heartbeat' },
  waybill: { label: 'Путевой лист', icon: 'fa-clipboard-list' },
  other: { label: 'Другое', icon: 'fa-folder' }
};

// ============================================================
//  DATA STATE
// ============================================================
let expenses = [];
let notes = [];
let documents = [];
let carData = null;
let currentQuarter = '';
let currentNoteFilter = 'all';

let pieChartInstance = null;
let barChartInstance = null;
let quarterChartInstance = null;
let fuelChartInstance = null;

// ============================================================
//  QUARTER HELPERS
// ============================================================
function getQuarter(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  const q = Math.floor(m / 3) + 1;
  return `${y}-Q${q}`;
}

function getQuarterLabel(q) {
  const [year, qNum] = q.split('-Q');
  const months = ['Янв-Мар', 'Апр-Июн', 'Июл-Сен', 'Окт-Дек'];
  return `${year} ${months[parseInt(qNum) - 1]}`;
}

function getQuarterRange(quarter) {
  const [year, q] = quarter.split('-Q');
  const y = parseInt(year);
  const qi = parseInt(q);
  const startMonth = (qi - 1) * 3;
  const endMonth = qi * 3 - 1;
  const start = new Date(y, startMonth, 1);
  const end = new Date(y, endMonth + 1, 0);
  return { start, end };
}

function getAllQuarters() {
  const now = new Date();
  const year = now.getFullYear();
  const quarters = [];
  for (let q = 1; q <= 4; q++) {
    quarters.push(`${year}-Q${q}`);
  }
  return quarters;
}

function getAvailableQuartersForSelect() {
  const set = new Set();
  expenses.forEach(e => {
    if (e.date) set.add(getQuarter(e.date));
  });
  const now = getQuarter(new Date());
  set.add(now);
  return Array.from(set).sort();
}

function getExpensesForQuarter(quarter) {
  if (!quarter) return [];
  const { start, end } = getQuarterRange(quarter);
  return expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d >= start && d <= end;
  });
}

function getAllQuartersData() {
  const qs = getAllQuarters();
  return qs.map(q => {
    const items = getExpensesForQuarter(q);
    const total = items.reduce((s, e) => s + e.amount, 0);
    const count = items.length;
    const catMap = {};
    items.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    let topCat = '—';
    let topVal = 0;
    for (const [k, v] of Object.entries(catMap)) {
      if (v > topVal) { topVal = v;
        topCat = CATEGORIES[k]?.label || k; }
    }
    return { quarter: q, total, count, topCat, items };
  });
}

// ============================================================
//  CAR DATA
// ============================================================
function loadCarData() {
  return getAllFromStore(STORE_CAR).then(data => {
    carData = data.length ? data[0] : null;
    if (!carData) {
      carData = {
        id: 'car',
        model: '',
        plate: '',
        fuelConsumption: 0,
        oilInterval: 10000,
        oilLastReset: null
      };
      return putToStore(STORE_CAR, carData);
    }
    return carData;
  });
}

function getCarData() {
  return carData;
}

function updateCarData(newData) {
  carData = { ...carData, ...newData };
  return putToStore(STORE_CAR, carData);
}

// ============================================================
//  EXPENSES CRUD
// ============================================================
function loadExpenses() {
  return getAllFromStore(STORE_EXPENSES).then(data => {
    expenses = data || [];
    return expenses;
  });
}

function getExpenses() {
  return expenses;
}

function addExpense(date, category, amount, description, liters, mileage) {
  const entry = {
    id: generateId(),
    date: date,
    category: category,
    amount: parseFloat(amount),
    description: description.trim() || '',
    liters: liters ? parseFloat(liters) : null,
    mileage: mileage ? parseInt(mileage) : null,
  };
  return putToStore(STORE_EXPENSES, entry).then(() => {
    expenses.push(entry);
    showToast('✅ Расход добавлен', 'success');
    return entry;
  });
}

function deleteExpense(id) {
  return deleteFromStore(STORE_EXPENSES, id).then(() => {
    expenses = expenses.filter(e => e.id !== id);
    showToast('🗑️ Расход удалён', 'warning');
  });
}

function editExpense(id, date, category, amount, description, liters, mileage) {
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return Promise.reject('Not found');
  const entry = {
    ...expenses[idx],
    date,
    category,
    amount: parseFloat(amount),
    description: description.trim() || '',
    liters: liters ? parseFloat(liters) : null,
    mileage: mileage ? parseInt(mileage) : null,
  };
  return putToStore(STORE_EXPENSES, entry).then(() => {
    expenses[idx] = entry;
    showToast('✅ Расход обновлён', 'success');
  });
}

// ============================================================
//  NOTES CRUD
// ============================================================
function loadNotes() {
  return getAllFromStore(STORE_NOTES).then(data => {
    notes = data || [];
    return notes;
  });
}

function getNotes() {
  return notes;
}

function addNote(title, description, date, type, amount, partName, partArticle, partMileage) {
  const entry = {
    id: generateId(),
    title: title.trim() || 'Без заголовка',
    description: description.trim() || '',
    date: date || new Date().toISOString().split('T')[0],
    type: type || 'maintenance',
    amount: amount ? parseFloat(amount) : null,
    partName: partName || '',
    partArticle: partArticle || '',
    partMileage: partMileage ? parseInt(partMileage) : null,
  };
  return putToStore(STORE_NOTES, entry).then(() => {
    notes.push(entry);
    showToast('📝 Запись добавлена в журнал ТО', 'success');
    return entry;
  });
}

function deleteNote(id) {
  return deleteFromStore(STORE_NOTES, id).then(() => {
    notes = notes.filter(n => n.id !== id);
    showToast('🗑️ Запись удалена', 'warning');
  });
}

// ============================================================
//  DOCUMENTS CRUD
// ============================================================
function loadDocuments() {
  return getAllFromStore(STORE_DOCUMENTS).then(data => {
    documents = data || [];
    return documents;
  });
}

function getDocuments() {
  return documents;
}

function addDocument(type, title, expiryDate, amount, photoFile) {
  return new Promise((resolve, reject) => {
    const entry = {
      id: generateId(),
      type: type || 'other',
      title: title.trim() || DOC_TYPES[type]?.label || 'Документ',
      expiryDate: expiryDate || '',
      amount: amount ? parseFloat(amount) : null,
      photo: null,
      createdAt: new Date().toISOString(),
    };

    if (photoFile) {
      const reader = new FileReader();
      reader.onload = function(e) {
        entry.photo = e.target.result;
        putToStore(STORE_DOCUMENTS, entry).then(() => {
          documents.push(entry);
          checkDocumentExpiry(entry);
          showToast('📄 Документ добавлен в сейф', 'success');
          resolve(entry);
        }).catch(reject);
      };
      reader.readAsDataURL(photoFile);
    } else {
      putToStore(STORE_DOCUMENTS, entry).then(() => {
        documents.push(entry);
        checkDocumentExpiry(entry);
        showToast('📄 Документ добавлен в сейф', 'success');
        resolve(entry);
      }).catch(reject);
    }
  });
}

function deleteDocument(id) {
  return deleteFromStore(STORE_DOCUMENTS, id).then(() => {
    documents = documents.filter(d => d.id !== id);
    showToast('🗑️ Документ удалён', 'warning');
  });
}

function checkDocumentExpiry(doc) {
  if (!doc.expiryDate) return;
  const days = getDaysUntil(doc.expiryDate);
  if (days === 14 || days === 7 || days === 1) {
    setTimeout(() => {
      showToast('📄 ' + (doc.title || 'Документ') + ' истекает через ' + days + ' дней!', 'warning');
    }, 1000);
  }
  if (days === 0) {
    setTimeout(() => {
      showToast('🔴 ' + (doc.title || 'Документ') + ' истёк сегодня!', 'error');
    }, 1000);
  }
  if (days < 0 && days > -30) {
    setTimeout(() => {
      showToast('🔴 ' + (doc.title || 'Документ') + ' просрочен на ' + Math.abs(days) + ' дней!', 'error');
    }, 1000);
  }
}

function checkAllDocuments() {
  documents.forEach(checkDocumentExpiry);
}

// ============================================================
//  BACKUP
// ============================================================
function exportBackup() {
  const data = {
    version: 3,
    exportedAt: new Date().toISOString(),
    car: carData,
    expenses: expenses,
    notes: notes,
    documents: documents,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `blvck_taxi_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  showToast('📦 Бэкап экспортирован', 'success');
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.expenses || !data.notes) {
        showToast('⚠️ Неверный формат файла', 'error');
        return;
      }
      const promises = [
        clearStore(STORE_EXPENSES),
        clearStore(STORE_NOTES),
        clearStore(STORE_CAR),
        clearStore(STORE_DOCUMENTS)
      ];
      Promise.all(promises).then(() => {
        const savePromises = [];
        data.expenses.forEach(e => savePromises.push(addExpense(e.date, e.category, e.amount, e.description, e.liters,
          e.mileage)));
        data.notes.forEach(n => savePromises.push(addNote(n.title, n.description, n.date, n.type, n.amount, n.partName, n
          .partArticle, n.partMileage)));
        if (data.car) {
          savePromises.push(updateCarData(data.car));
        }
        if (data.documents) {
          data.documents.forEach(d => savePromises.push(addDocument(d.type, d.title, d.expiryDate, d.amount, null)));
        }
        return Promise.all(savePromises);
      }).then(() => {
        showToast('✅ Бэкап импортирован успешно', 'success');
        renderAll();
        renderFuelTab();
        renderDocuments();
      }).catch(err => {
        showToast('⚠️ Ошибка при импорте: ' + err.message, 'error');
      });
    } catch (err) {
      showToast('⚠️ Ошибка при чтении файла: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

// ============================================================
//  OIL REMINDER
// ============================================================
function calculateMileage() {
  const fuelEntries = expenses.filter(e => e.category === 'fuel' && e.liters);
  const totalLiters = fuelEntries.reduce((s, e) => s + (e.liters || 0), 0);
  if (carData && carData.fuelConsumption > 0 && totalLiters > 0) {
    return (totalLiters / carData.fuelConsumption) * 100;
  }
  return 0;
}

function getOilStatus() {
  const mileage = calculateMileage();
  const interval = carData?.oilInterval || 10000;
  if (mileage === 0 || interval === 0) return { status: 'unknown', mileage, remaining: interval };
  const remaining = interval - (mileage % interval);
  if (remaining <= 0) return { status: 'danger', mileage, remaining: 0 };
  if (remaining <= 500) return { status: 'danger', mileage, remaining };
  if (remaining <= 1000) return { status: 'warning', mileage, remaining };
  return { status: 'good', mileage, remaining };
}

// ============================================================
//  RENDER FUNCTIONS
// ============================================================
function renderCarCard() {
  if (!carData) return;
  document.getElementById('carModel').textContent = carData.model || '🚗 Мой автомобиль';
  document.getElementById('carPlate').textContent = carData.plate || 'Нажмите, чтобы добавить';
  document.getElementById('carFuelConsumption').textContent = carData.fuelConsumption ? carData.fuelConsumption.toFixed(
    1) : '—';

  const items = getExpensesForQuarter(currentQuarter);
  const fuelTotal = items.filter(e => e.category === 'fuel').reduce((s, e) => s + (e.liters || 0), 0);

  if (carData.fuelConsumption > 0 && fuelTotal > 0) {
    const mileage = (fuelTotal / carData.fuelConsumption) * 100;
    document.getElementById('carFuelUsed').textContent = fuelTotal.toFixed(1);
    document.getElementById('carMileage').textContent = mileage.toFixed(0);
  } else {
    document.getElementById('carFuelUsed').textContent = '—';
    document.getElementById('carMileage').textContent = '—';
  }

  const container = document.getElementById('oilReminderContainer');
  const status = getOilStatus();
  let html = '';
  if (status.status === 'unknown' || !carData?.oilInterval) {
    html = `<span class="oil-reminder" style="border-color:rgba(255,107,0,0.04);color:var(--text-muted);">
              <i class="fas fa-oil-can"></i> Укажите интервал
            </span>`;
  } else if (status.status === 'good') {
    html =
      `<span class="oil-reminder good"><i class="fas fa-check"></i> Замена через ${status.remaining.toFixed(0)} км</span>`;
  } else if (status.status === 'warning') {
    html =
      `<span class="oil-reminder warning"><i class="fas fa-exclamation"></i> Замена через ${status.remaining.toFixed(0)} км!</span>`;
  } else if (status.status === 'danger') {
    html = `<span class="oil-reminder danger"><i class="fas fa-times"></i> СРОЧНО замените масло!</span>`;
  }
  container.innerHTML = html;
}

function renderQuarterSelector() {
  const sel = document.getElementById('quarterSelect');
  const qs = getAvailableQuartersForSelect();
  sel.innerHTML = '';
  qs.forEach(q => {
    const opt = document.createElement('option');
    opt.value = q;
    opt.textContent = getQuarterLabel(q);
    sel.appendChild(opt);
  });
  if (currentQuarter && qs.includes(currentQuarter)) {
    sel.value = currentQuarter;
  } else if (qs.length) {
    sel.value = qs[qs.length - 1];
    currentQuarter = sel.value;
  } else {
    const now = getQuarter(new Date());
    sel.innerHTML = `<option value="${now}">${getQuarterLabel(now)}</option>`;
    sel.value = now;
    currentQuarter = now;
  }
}

function renderCategoryGrid() {
  const container = document.getElementById('categoryGrid');
  const items = getExpensesForQuarter(currentQuarter);
  const sums = {};
  CAT_KEYS.forEach(k => sums[k] = 0);
  items.forEach(e => {
    if (sums[e.category] !== undefined) sums[e.category] += e.amount;
  });

  let html = '';
  CAT_KEYS.forEach(k => {
    const cat = CATEGORIES[k];
    const total = sums[k] || 0;
    html += `
      <div class="cat-card cat-${k} animate-fade-up" data-category="${k}">
        <div class="icon"><i class="fas ${cat.icon}"></i></div>
        <div class="name">${cat.label}</div>
        <div class="amount-badge">${total.toFixed(2)} BYN</div>
      </div>
    `;
  });
  container.innerHTML = html;

  container.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', function() {
      const category = this.dataset.category;
      openModal(null, category);
    });
  });
}

function renderSummary(items) {
  const total = items.reduce((s, e) => s + e.amount, 0);
  const cats = new Set(items.map(e => e.category));
  document.getElementById('totalExpenses').textContent = total.toFixed(2);
  document.getElementById('categoryCount').textContent = cats.size;
  document.getElementById('entryCount').textContent = items.length;
  const avg = items.length ? total / items.length : 0;
  document.getElementById('avgExpense').textContent = avg.toFixed(2);
}

function renderCharts(items) {
  const ctxPie = document.getElementById('pieChart').getContext('2d');
  const ctxBar = document.getElementById('barChart').getContext('2d');

  const map = {};
  CAT_KEYS.forEach(k => map[k] = 0);
  items.forEach(e => {
    if (map[e.category] !== undefined) map[e.category] += e.amount;
  });

  const labels = [],
    data = [],
    colors = [];
  CAT_KEYS.forEach(k => {
    if (map[k] > 0) {
      labels.push(CATEGORIES[k].label);
      data.push(map[k]);
      colors.push('rgba(255,107,0,0.6)');
    }
  });

  if (data.length === 0) {
    labels.push('Нет данных');
    data.push(1);
    colors.push('rgba(255,107,0,0.05)');
  }

  if (pieChartInstance) pieChartInstance.destroy();
  pieChartInstance = new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: '#0A0A0A',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#A0A0A0',
            font: { family: 'Inter', size: 9, weight: '500' },
            padding: 6,
            usePointStyle: true,
            pointStyle: 'circle',
          }
        }
      },
      cutout: '65%',
    }
  });

  const sorted = CAT_KEYS
    .filter(k => map[k] > 0)
    .sort((a, b) => map[b] - map[a])
    .slice(0, 5);
  const barLabels = sorted.map(k => CATEGORIES[k].label);
  const barData = sorted.map(k => map[k]);
  const barColors = sorted.map(k => 'rgba(255,107,0,0.3)');

  if (barLabels.length === 0) {
    barLabels.push('Нет данных');
    barData.push(1);
    barColors.push('rgba(255,107,0,0.05)');
  }

  if (barChartInstance) barChartInstance.destroy();
  barChartInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        label: 'BYN',
        data: barData,
        backgroundColor: barColors,
        borderColor: 'rgba(255,107,0,0.2)',
        borderWidth: 1,
        borderRadius: 0,
        barPercentage: 0.6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#555555',
            font: { family: 'Inter', size: 9 },
            callback: v => v.toFixed(0),
          },
          grid: { color: 'rgba(255,107,0,0.02)' }
        },
        x: {
          ticks: {
            color: '#555555',
            font: { family: 'Inter', size: 9 },
          },
          grid: { display: false }
        }
      }
    }
  });
}

function renderList(items) {
  const container = document.getElementById('expenseList');
  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state animate-fade-in">
        <i class="fas fa-inbox"></i>
        <p>Нет расходов за выбранный квартал</p>
        <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">Нажмите + или выберите категорию</p>
      </div>
    `;
    return;
  }

  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  let html = '';
  sorted.forEach((e, idx) => {
    const cat = CATEGORIES[e.category] || CATEGORIES.other;
    const icon = cat.icon || 'fa-circle';
    const label = cat.label || e.category;
    const dateStr = formatDate(e.date);
    const desc = e.description || '';
    const amt = e.amount.toFixed(2);
    const liters = e.liters ? `<span class="liters-badge">${e.liters.toFixed(1)} л</span>` : '';
    html += `
      <div class="expense-item animate-fade-up" style="animation-delay:${(idx % 10) * 0.03}s;">
        <div class="left">
          <div class="icon-wrap">
            <i class="fas ${icon}"></i>
          </div>
          <div class="info">
            <div class="cat">${label}</div>
            <div class="desc">${desc || '—'}</div>
            <div class="date"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
          </div>
        </div>
        ${liters}
        <div class="amount">${amt}</div>
        <button class="delete-btn" data-id="${e.id}" title="Удалить">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
  });
  container.innerHTML = html;
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      deleteExpense(id);
    });
  });
}

function renderInsights(items) {
  const container = document.getElementById('insightsContainer');
  const total = items.reduce((s, e) => s + e.amount, 0);
  const fuelTotal = items.filter(e => e.category === 'fuel').reduce((s, e) => s + e.amount, 0);
  const fuelLiters = items.filter(e => e.category === 'fuel').reduce((s, e) => s + (e.liters || 0), 0);
  const repairTotal = items.filter(e => e.category === 'repair' || e.category === 'parts').reduce((s, e) => s + e.amount,
    0);
  const count = items.length;

  let insights = [];

  if (count === 0) {
    insights.push('Добавьте расходы, чтобы получать умные советы');
  } else {
    if (fuelTotal > total * 0.5) {
      insights.push('⛽ <strong>Бензин</strong> составляет больше 50% всех расходов.');
    }
    if (repairTotal > total * 0.2) {
      insights.push('🔧 <strong>Ремонт и запчасти</strong> — значительная статья расходов.');
    }
    if (carData && carData.fuelConsumption > 0 && fuelLiters > 0) {
      const mileage = (fuelLiters / carData.fuelConsumption) * 100;
      if (carData.fuelConsumption > 10) {
        insights.push(
          `🚗 <strong>Расход ${carData.fuelConsumption.toFixed(1)} л/100км</strong> — выше среднего.`);
      } else if (carData.fuelConsumption < 7) {
        insights.push(
          `✅ <strong>Расход ${carData.fuelConsumption.toFixed(1)} л/100км</strong> — отличный показатель!`);
      }
      if (mileage > 0) {
        insights.push(`📊 <strong>Пробег за квартал: ~${mileage.toFixed(0)} км</strong>`);
      }
    }

    const oilStatus = getOilStatus();
    if (oilStatus.status === 'warning') {
      insights.push(`🛢️ <strong>Замена масла через ${oilStatus.remaining.toFixed(0)} км!</strong>`);
    } else if (oilStatus.status === 'danger') {
      insights.push(`🚨 <strong>СРОЧНО замените масло!</strong>`);
    }

    if (items.filter(e => e.category === 'insurance').length === 0) {
      insights.push('🛡️ <strong>Страховка</strong> не учтена в этом квартале.');
    }
    if (items.filter(e => e.category === 'fszn').length === 0) {
      insights.push('🏛️ <strong>ФСЗН</strong> — важный платёж.');
    }
  }

  if (insights.length === 0) {
    insights.push('📈 Все показатели в норме. Продолжайте в том же духе!');
  }

  container.innerHTML = insights.map(text =>
    `<div class="insight-item"><i class="fas fa-chevron-right"></i><div class="text">${text}</div></div>`
  ).join('');
}

function renderQuarterStats() {
  const allData = getAllQuartersData();
  const grid = document.getElementById('quarterStatsGrid');

  if (allData.length === 0) {
    grid.innerHTML =
      `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:16px;">Нет данных за кварталы</div>`;
    document.getElementById('quarterSummaryRow').innerHTML = '';
    return;
  }

  const nonEmpty = allData.filter(d => d.total > 0);
  let best = nonEmpty.length ? nonEmpty.reduce((a, b) => a.total > b.total ? a : b) : null;
  let worst = nonEmpty.length ? nonEmpty.reduce((a, b) => a.total < b.total ? a : b) : null;

  let html = '';
  allData.forEach(d => {
    const isEmpty = d.total === 0;
    const isBest = best && d.quarter === best.quarter && !isEmpty;
    const isWorst = worst && d.quarter === worst.quarter && !isEmpty && best && best.quarter !== worst.quarter;
    let cls = '';
    if (isBest) cls = 'best';
    if (isWorst) cls = 'worst';
    if (isEmpty) cls += ' empty';
    html += `
      <div class="quarter-stat-card ${cls}">
        <div class="q-label">${getQuarterLabel(d.quarter)}</div>
        <div class="q-total">${d.total.toFixed(2)} BYN</div>
        <div class="q-count">${d.count} записей</div>
        <div class="q-top">${isEmpty ? '—' : '🏆 ' + d.topCat}</div>
      </div>
    `;
  });
  grid.innerHTML = html;

  const totalAll = allData.reduce((s, d) => s + d.total, 0);
  const avgAll = allData.filter(d => d.total > 0).length ? totalAll / allData.filter(d => d.total > 0).length : 0;
  const summary = document.getElementById('quarterSummaryRow');
  if (totalAll === 0) {
    summary.innerHTML =
      `<div class="stat-item" style="width:100%;text-align:center;color:var(--text-muted);">Нет данных за все кварталы</div>`;
  } else {
    summary.innerHTML = `
      <div class="stat-item"><i class="fas fa-coins"></i> Всего: <strong>${totalAll.toFixed(2)} BYN</strong></div>
      <div class="stat-item"><i class="fas fa-calculator"></i> Среднее: <strong>${avgAll.toFixed(2)} BYN</strong></div>
      ${best ? `<div class="stat-item"><i class="fas fa-arrow-up"></i> Лучший: <strong>${getQuarterLabel(best.quarter)}</strong> (${best.total.toFixed(2)} BYN)</div>` : ''}
      ${worst ? `<div class="stat-item"><i class="fas fa-arrow-down"></i> Худший: <strong>${getQuarterLabel(worst.quarter)}</strong> (${worst.total.toFixed(2)} BYN)</div>` : ''}
    `;
  }

  renderQuarterChart(allData);
}

function renderQuarterChart(allData) {
  const ctx = document.getElementById('quarterBarChart').getContext('2d');
  if (quarterChartInstance) quarterChartInstance.destroy();

  const labels = allData.map(d => getQuarterLabel(d.quarter));
  const data = allData.map(d => d.total);
  const colors = allData.map((d, i) => {
    if (d.total === 0) return 'rgba(255,107,0,0.02)';
    return 'rgba(255,107,0,0.15)';
  });
  const borderColors = allData.map((d, i) => {
    if (d.total === 0) return 'rgba(255,107,0,0.03)';
    return 'rgba(255,107,0,0.3)';
  });

  quarterChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Расходы (BYN)',
        data: data,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 0,
        barPercentage: 0.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#555555',
            font: { size: 9, family: 'Inter' },
            callback: v => v.toFixed(0),
          },
          grid: { color: 'rgba(255,107,0,0.02)' }
        },
        x: {
          ticks: {
            color: '#555555',
            font: { size: 9, family: 'Inter' },
          },
          grid: { display: false }
        }
      }
    }
  });
}

function renderNotes() {
  const container = document.getElementById('notesList');
  const filtered = currentNoteFilter === 'all' ?
    notes :
    notes.filter(n => n.type === currentNoteFilter);
  document.getElementById('notesBadge').textContent = filtered.length + ' записей';

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state animate-fade-in">
        <i class="fas fa-sticky-note"></i>
        <p>Нет записей в журнале ТО</p>
        <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">Добавьте запись о работе, ремонте или замене деталей</p>
      </div>
    `;
    return;
  }

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  let html = '';
  sorted.forEach((n, idx) => {
    const dateStr = formatDate(n.date);
    const amount = n.amount ? n.amount.toFixed(2) : '';
    const typeInfo = NOTE_TYPES[n.type] || NOTE_TYPES.maintenance;
    const partInfo = n.partName ? `🔧 ${n.partName} (${n.partArticle || 'б/а'})` : '';
    const mileageInfo = n.partMileage ? `, пробег: ${n.partMileage} км` : '';
    html += `
      <div class="note-item animate-fade-up" style="animation-delay:${(idx % 10) * 0.04}s;">
        <div class="note-icon">
          <i class="fas ${typeInfo.icon}"></i>
        </div>
        <div class="note-content">
          <div class="note-title">${n.title || 'Без заголовка'}</div>
          <div class="note-desc">${n.description || '—'}</div>
          ${partInfo ? `<div class="note-desc" style="font-size:11px;color:var(--text-muted);">${partInfo}${mileageInfo}</div>` : ''}
          <div class="note-meta">
            <span><i class="far fa-calendar-alt"></i> ${dateStr}</span>
            <span class="note-type">${typeInfo.label}</span>
            ${amount ? `<span><i class="fas fa-money-bill-wave"></i> ${amount} BYN</span>` : ''}
          </div>
        </div>
        ${amount ? `<div class="note-amount">${amount}</div>` : ''}
        <button class="delete-note-btn" data-id="${n.id}" title="Удалить">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
  });
  container.innerHTML = html;

  container.querySelectorAll('.delete-note-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      deleteNote(id);
    });
  });
}

function renderFuelTab() {
  const container = document.getElementById('fuelList');
  const fuelEntries = expenses
    .filter(e => e.category === 'fuel' && e.liters)
    .sort((a, b) => a.date.localeCompare(b.date));
  document.getElementById('fuelBadge').textContent = fuelEntries.length + ' записей';

  if (!fuelEntries.length) {
    container.innerHTML = `
      <div class="empty-state animate-fade-in">
        <i class="fas fa-gas-pump"></i>
        <p>Нет записей о заправках</p>
        <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">Добавьте расход в категории "Бензин" с указанием литров</p>
      </div>
    `;
    renderFuelChart([]);
    return;
  }

  let html = '';
  const sorted = [...fuelEntries].sort((a, b) => b.date.localeCompare(a.date));
  sorted.slice(0, 10).forEach((e, idx) => {
    const dateStr = formatDate(e.date);
    const amt = e.amount.toFixed(2);
    const liters = e.liters.toFixed(1);
    const consumption = e.mileage && e.liters > 0 && carData?.fuelConsumption ?
      ((e.liters / (e.mileage - (e.prevMileage || 0))) * 100).toFixed(1) :
      '—';
    html += `
      <div class="expense-item animate-fade-up" style="animation-delay:${(idx % 10) * 0.03}s;">
        <div class="left">
          <div class="icon-wrap">
            <i class="fas fa-gas-pump"></i>
          </div>
          <div class="info">
            <div class="cat">Заправка</div>
            <div class="desc">${e.description || '—'}</div>
            <div class="date"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
          </div>
        </div>
        <span class="liters-badge">${liters} л</span>
        <span class="liters-badge" style="color:var(--orange);">${consumption !== '—' ? consumption + ' л/100км' : ''}</span>
        <div class="amount">${amt}</div>
      </div>
    `;
  });
  container.innerHTML = html;

  renderFuelChart(fuelEntries);
}

function renderFuelChart(fuelEntries) {
  const ctx = document.getElementById('fuelChart').getContext('2d');
  if (fuelChartInstance) fuelChartInstance.destroy();

  if (fuelEntries.length < 2) {
    fuelChartInstance = null;
    return;
  }

  const data = [];
  let prevMileage = null;
  fuelEntries.forEach((e, i) => {
    if (e.mileage && prevMileage !== null) {
      const dist = e.mileage - prevMileage;
      if (dist > 0 && e.liters > 0) {
        const consumption = (e.liters / dist) * 100;
        data.push({
          date: e.date,
          consumption: consumption,
          liters: e.liters,
          mileage: e.mileage
        });
      }
    }
    if (e.mileage) prevMileage = e.mileage;
  });

  if (data.length === 0) {
    fuelChartInstance = null;
    return;
  }

  const labels = data.map(d => formatDate(d.date));
  const values = data.map(d => d.consumption);

  fuelChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Расход (л/100км)',
        data: values,
        borderColor: 'rgba(255,107,0,0.6)',
        backgroundColor: 'rgba(255,107,0,0.02)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: 'rgba(255,107,0,0.8)',
        pointBorderColor: '#0A0A0A',
        pointBorderWidth: 1,
        pointRadius: 3,
        borderWidth: 1.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#A0A0A0',
            font: { family: 'Inter', size: 9, weight: '500' },
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#555555',
            font: { size: 9, family: 'Inter' },
            callback: v => v.toFixed(1),
          },
          grid: { color: 'rgba(255,107,0,0.02)' }
        },
        x: {
          ticks: {
            color: '#555555',
            font: { size: 9, family: 'Inter' },
          },
          grid: { display: false }
        }
      }
    }
  });
}

function renderDocuments() {
  const container = document.getElementById('documentsList');
  document.getElementById('docBadge').textContent = documents.length + ' документов';

  if (!documents.length) {
    container.innerHTML = `
      <div class="empty-state animate-fade-in">
        <i class="fas fa-folder-open"></i>
        <p>Нет документов</p>
        <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">Добавьте документ — страховку, техосмотр, лицензию...</p>
      </div>
    `;
    return;
  }

  const sorted = [...documents].sort((a, b) => {
    const daysA = getDaysUntil(a.expiryDate);
    const daysB = getDaysUntil(b.expiryDate);
    if (daysA <= 0 && daysB > 0) return -1;
    if (daysB <= 0 && daysA > 0) return 1;
    if (daysA <= 7 && daysB > 7) return -1;
    if (daysB <= 7 && daysA > 7) return 1;
    if (daysA <= 30 && daysB > 30) return -1;
    if (daysB <= 30 && daysA > 30) return 1;
    return daysA - daysB;
  });

  let html = '<div class="doc-grid">';
  sorted.forEach((doc, idx) => {
    const typeInfo = DOC_TYPES[doc.type] || DOC_TYPES.other;
    const days = getDaysUntil(doc.expiryDate);
    const status = days > 30 ? 'green' : days > 7 ? 'yellow' : 'red';
    const statusLabel = days > 30 ? '✅ Действует' : days > 7 ? '⚠️ ' + days + ' дн.' : '🔴 ' + days + ' дн.';
    const dateStr = doc.expiryDate ? formatDate(doc.expiryDate) : '—';
    const amount = doc.amount ? doc.amount.toFixed(2) : '';
    const photoHtml = doc.photo ? `
      <div class="doc-photo" onclick="openPhotoPreview('${doc.photo}')">
        <img src="${doc.photo}" alt="Фото" />
      </div>
    ` : `
      <div class="doc-photo" style="font-size:12px;color:var(--text-muted);">
        <i class="fas fa-camera"></i> Нет фото
      </div>
    `;

    html += `
      <div class="doc-card animate-fade-up" style="animation-delay:${(idx % 6) * 0.05}s;">
        <div class="doc-status ${status}"></div>
        <div class="doc-icon"><i class="fas ${typeInfo.icon}"></i></div>
        <div class="doc-name">${doc.title || typeInfo.label}</div>
        <div class="doc-details">До: ${dateStr}</div>
        <div class="doc-days ${status}">${statusLabel}</div>
        ${amount ? `<div class="doc-details" style="color:var(--orange);">${amount} BYN</div>` : ''}
        ${photoHtml}
        <div class="doc-actions">
          <button onclick="deleteDocument('${doc.id}')" class="delete-doc-btn">
            <i class="fas fa-trash-alt"></i> Удалить
          </button>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderAll() {
  const q = currentQuarter;
  if (!q) return;
  const items = getExpensesForQuarter(q);
  renderSummary(items);
  renderCharts(items);
  renderList(items);
  renderCategoryGrid();
  renderCarCard();
  renderInsights(items);
  renderQuarterStats();
  renderNotes();
  renderFuelTab();
  renderDocuments();
  document.getElementById('listBadge').textContent = items.length + ' записей';
  const total = items.reduce((s, e) => s + e.amount, 0);
  document.getElementById('quarterTotalBadge').innerHTML = `<i class="fas fa-coins"></i> ${total.toFixed(2)} BYN`;
}

// ============================================================
//  MODAL FUNCTIONS
// ============================================================
function openModal(editData = null, presetCategory = null) {
  const modal = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const btn = document.getElementById('submitBtn');

  if (editData) {
    document.getElementById('editId').value = editData.id;
    document.getElementById('formDate').value = editData.date;
    document.getElementById('formCategory').value = editData.category;
    document.getElementById('formAmount').value = editData.amount;
    document.getElementById('formDesc').value = editData.description || '';
    if (editData.liters) {
      document.getElementById('formLiters').value = editData.liters;
      document.getElementById('litersGroup').style.display = 'block';
      document.getElementById('mileageGroup').style.display = 'block';
    } else {
      document.getElementById('litersGroup').style.display = 'none';
      document.getElementById('mileageGroup').style.display = 'none';
    }
    if (editData.mileage) {
      document.getElementById('formMileage').value = editData.mileage;
    }
    title.innerHTML = '<i class="fas fa-edit"></i> Редактировать';
    btn.innerHTML = '<i class="fas fa-sync-alt"></i> Обновить';
  } else {
    document.getElementById('editId').value = '';
    document.getElementById('formDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('formCategory').value = presetCategory || 'fuel';
    document.getElementById('formAmount').value = '';
    document.getElementById('formDesc').value = '';
    document.getElementById('formLiters').value = '';
    document.getElementById('formMileage').value = '';
    if (document.getElementById('formCategory').value === 'fuel') {
      document.getElementById('litersGroup').style.display = 'block';
      document.getElementById('mileageGroup').style.display = 'block';
    } else {
      document.getElementById('litersGroup').style.display = 'none';
      document.getElementById('mileageGroup').style.display = 'none';
    }
    title.innerHTML = '<i class="fas fa-plus-circle"></i> Новый расход';
    btn.innerHTML = '<i class="fas fa-save"></i> Сохранить';
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('expenseForm').reset();
  document.getElementById('editId').value = '';
}

// ============================================================
//  PHOTO PREVIEW
// ============================================================
window.openPhotoPreview = function(photoData) {
  document.getElementById('photoPreviewImg').src = photoData;
  document.getElementById('photoPreviewOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
};

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  // Welcome screen
  document.getElementById('welcomeBtn').addEventListener('click', function() {
    document.getElementById('welcomeScreen').classList.add('hidden');
  });

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', function() {
    document.body.classList.toggle('light-theme');
    this.innerHTML = document.body.classList.contains('light-theme') ?
      '<i class="fas fa-sun"></i>' :
      '<i class="fas fa-moon"></i>';
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // FAB
  document.getElementById('fabAdd').addEventListener('click', function() {
    openModal();
  });

  // Expense form submit
  document.getElementById('expenseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const date = document.getElementById('formDate').value;
    const category = document.getElementById('formCategory').value;
    const amount = parseFloat(document.getElementById('formAmount').value);
    const description = document.getElementById('formDesc').value;
    const liters = category === 'fuel' ? parseFloat(document.getElementById('formLiters').value) : null;
    const mileage = category === 'fuel' ? parseInt(document.getElementById('formMileage').value) : null;
    const id = document.getElementById('editId').value;

    if (!date || !category || isNaN(amount) || amount <= 0) {
      showToast('⚠️ Заполните все поля корректно', 'warning');
      return;
    }

    if (category === 'fuel' && (!liters || liters <= 0)) {
      showToast('⚠️ Укажите количество литров', 'warning');
      return;
    }

    if (id) {
      editExpense(id, date, category, amount, description, liters, mileage).then(() => {
        closeModal();
        renderAll();
      });
    } else {
      addExpense(date, category, amount, description, liters, mileage).then(() => {
        closeModal();
        renderAll();
      });
    }
  });

  // Car modal
  document.getElementById('editCarBtn').addEventListener('click', function() {
    document.getElementById('carModalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('carModelInput').value = carData?.model || '';
    document.getElementById('carPlateInput').value = carData?.plate || '';
    document.getElementById('carFuelInput').value = carData?.fuelConsumption || '';
    document.getElementById('carOilIntervalInput').value = carData?.oilInterval || 10000;
  });

  document.getElementById('carModalClose').addEventListener('click', function() {
    document.getElementById('carModalOverlay').classList.remove('open');
    document.body.style.overflow = '';
  });

  document.getElementById('carModalOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  document.getElementById('carForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const model = document.getElementById('carModelInput').value.trim();
    const plate = document.getElementById('carPlateInput').value.trim();
    const fuelConsumption = parseFloat(document.getElementById('carFuelInput').value) || 0;
    const oilInterval = parseFloat(document.getElementById('carOilIntervalInput').value) || 10000;
    updateCarData({ model, plate, fuelConsumption, oilInterval }).then(() => {
      document.getElementById('carModalOverlay').classList.remove('open');
      document.body.style.overflow = '';
      renderAll();
      showToast('✅ Данные автомобиля сохранены', 'success');
    });
  });

  // Notes filter
  document.querySelectorAll('#notesFilter button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#notesFilter button').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentNoteFilter = this.dataset.filter;
      renderNotes();
    });
  });

  // Add note
  document.getElementById('addNoteBtn').addEventListener('click', function() {
    const type = document.getElementById('noteType').value;
    const title = document.getElementById('noteTitle').value;
    const description = document.getElementById('noteDesc').value;
    const date = document.getElementById('noteDate').value;
    const amount = document.getElementById('noteAmount').value;
    const partName = document.getElementById('partName').value;
    const partArticle = document.getElementById('partArticle').value;
    const partMileage = document.getElementById('partMileage').value;

    if (!title && !description) {
      showToast('⚠️ Заполните заголовок или описание', 'warning');
      return;
    }

    addNote(
      title,
      description,
      date || new Date().toISOString().split('T')[0],
      type,
      amount || null,
      partName,
      partArticle,
      partMileage
    ).then(() => {
      document.getElementById('noteTitle').value = '';
      document.getElementById('noteDesc').value = '';
      document.getElementById('noteDate').value = '';
      document.getElementById('noteAmount').value = '';
      document.getElementById('partName').value = '';
      document.getElementById('partArticle').value = '';
      document.getElementById('partMileage').value = '';
      renderNotes();
    });
  });

  // Show/hide parts fields
  document.getElementById('noteType').addEventListener('change', function() {
    document.getElementById('partsFields').style.display = this.value === 'parts' ? 'block' : 'none';
  });

  // Add document
  document.getElementById('addDocBtn').addEventListener('click', function() {
    const type = document.getElementById('docType').value;
    const title = document.getElementById('docTitle').value;
    const expiryDate = document.getElementById('docExpiryDate').value;
    const amount = document.getElementById('docAmount').value;
    const photoInput = document.getElementById('docPhotoInput');

    if (!title && !expiryDate) {
      showToast('⚠️ Заполните название или дату окончания', 'warning');
      return;
    }

    if (photoInput.files && photoInput.files[0]) {
      addDocument(type, title, expiryDate, amount, photoInput.files[0]).then(() => {
        document.getElementById('docTitle').value = '';
        document.getElementById('docExpiryDate').value = '';
        document.getElementById('docAmount').value = '';
        document.getElementById('docPhotoInput').value = '';
        document.getElementById('docPhotoPreview').style.display = 'none';
        renderDocuments();
      });
    } else {
      addDocument(type, title, expiryDate, amount, null).then(() => {
        document.getElementById('docTitle').value = '';
        document.getElementById('docExpiryDate').value = '';
        document.getElementById('docAmount').value = '';
        renderDocuments();
      });
    }
  });

  // Photo preview
  document.getElementById('docPhotoInput').addEventListener('change', function() {
    const preview = document.getElementById('docPhotoPreview');
    if (this.files && this.files[0]) {
      preview.style.display = 'block';
      preview.innerHTML = '<i class="fas fa-check-circle" style="color:var(--green);"></i> Фото загружено';
    } else {
      preview.style.display = 'none';
    }
  });

  // Photo preview close
  document.getElementById('photoPreviewClose').addEventListener('click', function() {
    document.getElementById('photoPreviewOverlay').classList.remove('open');
    document.body.style.overflow = '';
  });

  document.getElementById('photoPreviewOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  // Quarter select
  document.getElementById('quarterSelect').addEventListener('change', function() {
    currentQuarter = this.value;
    renderAll();
  });

  // Reset oil
  document.getElementById('resetOilBtn').addEventListener('click', function() {
    if (confirm('Сбросить счётчик замены масла? (После замены масла)')) {
      const currentMileage = calculateMileage();
      const carData = getCarData();
      carData.oilLastReset = { mileage: currentMileage, date: new Date().toISOString() };
      updateCarData(carData).then(() => {
        renderAll();
        showToast('🛢️ Счётчик масла сброшен!', 'success');
      });
    }
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tab = this.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      if (tab === 'notes') renderNotes();
      if (tab === 'fuel') renderFuelTab();
      if (tab === 'documents') renderDocuments();
    });
  });

  // Backup
  document.getElementById('backupExportBtn').addEventListener('click', exportBackup);
  document.getElementById('backupImportBtn').addEventListener('click', function() {
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFileInput').addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
      importBackup(this.files[0]);
    }
    this.value = '';
  });

  // ============================================================
  //  INIT
  // ============================================================
  openDB().then(() => {
    return Promise.all([
      loadCarData(),
      loadExpenses(),
      loadNotes(),
      loadDocuments()
    ]);
  }).then(() => {
    currentQuarter = getAvailableQuartersForSelect().pop() || getQuarter(new Date());
    renderQuarterSelector();
    renderAll();
    renderFuelTab();
    renderDocuments();
    setTimeout(checkAllDocuments, 2000);
    console.log('🖤 BLVCK TAXI — загружен');
  }).catch(err => {
    console.error('Ошибка при инициализации:', err);
    showToast('⚠️ Ошибка при загрузке данных', 'error');
  });
});