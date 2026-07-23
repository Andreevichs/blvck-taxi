/* =========================================================
   BLVCK TAXI — весь комбайн, vanilla, без зависимостей
   Данные: IndexedDB (локально). Офлайн. Без сервера. Бесплатно.
   ========================================================= */

/* ---------- состояние ---------- */
const CATS = {
  fuel:   { ico:"⛽", t:"Заправка" },
  repair: { ico:"🔧", t:"Ремонт"   },
  wash:   { ico:"🫧", t:"Мойка"    },
  other:  { ico:"📦", t:"Другое"   },
};
const CURS = ["BYN","₽","$","€","₸"];
const TABS = [
  { id:"dash",     ico:"🏠", t:"Главная" },
  { id:"stats",    ico:"📊", t:"Графики" },
  { id:"car",      ico:"🚗", t:"Авто"    },
  { id:"docs",     ico:"📄", t:"ТО/Доки" },
  { id:"settings", ico:"⚙️", t:"Ещё"     },
];

const state = {
  screen: "dash",
  range: "month",          // month | quarter | year | all
  modalCat: "fuel",
};

/* ---------- утилиты ---------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c =>
  ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const cur  = () => localStorage.getItem("blvck_cur") || "BYN";
const money = n => (Number(n)||0).toLocaleString("ru-RU",{maximumFractionDigits:2}) + " " + cur();
const today = () => new Date().toISOString().slice(0,10);
const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("ru-RU",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(()=> t.hidden = true, 1800);
}

/* ---------- IndexedDB (свой тонкий слой) ---------- */
const DB_NAME = "blvcktaxi", DB_VER = 1;
const STORES = ["expenses","maintenance","documents","car"];
let db;

function openDB(){
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const d = req.result;
      if(!d.objectStoreNames.contains("expenses")){
        const s = d.createObjectStore("expenses",{keyPath:"id"});
        s.createIndex("date","date"); s.createIndex("category","category");
      }
      if(!d.objectStoreNames.contains("maintenance"))
        d.createObjectStore("maintenance",{keyPath:"id"}).createIndex("date","date");
      if(!d.objectStoreNames.contains("documents"))
        d.createObjectStore("documents",{keyPath:"id"}).createIndex("expiryDate","expiryDate");
      if(!d.objectStoreNames.contains("car"))
        d.createObjectStore("car",{keyPath:"id"});
    };
    req.onsuccess = () => { db = req.result; res(db); };
    req.onerror   = () => rej(req.error);
  });
}
function tx(store, mode="readonly"){ return db.transaction(store, mode).objectStore(store); }
function reqP(req){ return new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); }
const dbAdd    = (s, v)        => reqP(tx(s,"readwrite").add(v));
const dbPut    = (s, v)        => reqP(tx(s,"readwrite").put(v));
const dbDel    = (s, id)       => reqP(tx(s,"readwrite").delete(id));
const dbGet    = (s, id)       => reqP(tx(s).get(id));
const dbAll    = (s)           => reqP(tx(s).getAll());
const dbClear  = (s)           => reqP(tx(s,"readwrite").clear());

/* ---------- рендер: оболочка ---------- */
function render(){
  const app = $("#app");
  app.style.animation = "none"; void app.offsetWidth; app.style.animation = "";
  app.innerHTML = ({
    dash: screenDash, stats: screenStats, car: screenCar,
    docs: screenDocs, settings: screenSettings,
  }[state.screen])();
  renderTabs();
}
function renderTabs(){
  $("#tabbar").innerHTML = `<div class="inner">${TABS.map(t=>`
    <button class="tab ${state.screen===t.id?"on":""}" data-action="nav" data-to="${t.id}">
      <span class="ti">${t.ico}</span><span>${t.t}</span>
    </button>`).join("")}</div>`;
}

/* ---------- экран: ГЛАВНАЯ ---------- */
function screenDash(){
  return Promise.all([dbAll("expenses"), dbGet("car",1), dbAll("documents")])
    .then ? "" : ""; // (рендер синхронный, данные тянем ниже через async-обёртку)
}
/* Чтобы не усложнять — делаем все экраны async и рендерим через renderAsync */
async function renderAsync(){
  const app = $("#app");
  app.style.animation = "none"; void app.offsetWidth; app.style.animation = "";
  const html = await ({
    dash: screenDash, stats: screenStats, car: screenCar,
    docs: screenDocs, settings: screenSettings,
  }[state.screen])();
  app.innerHTML = html;
  renderTabs();
}

async function screenDash(){
  const exps = await dbAll("expenses");
  const car  = await dbGet("car",1);
  const docs = await dbAll("documents");

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const thisMonth = exps.filter(e => new Date(e.date) >= monthStart);
  const spentMonth = thisMonth.reduce((s,e)=>s+Number(e.amount||0),0);
  const spentAll   = exps.reduce((s,e)=>s+Number(e.amount||0),0);
  const km = car?.currentMileage || 0;

  // напоминания
  const alerts = [];
  const now = new Date(); now.setHours(0,0,0,0);
  docs.forEach(d=>{
    if(!d.expiryDate) return;
    const days = Math.round((new Date(d.expiryDate) - now)/86400000);
    if(days < 0) alerts.push({bad:true, t:`Просрочено: ${esc(d.name)}`, s:`истекло ${fmtDate(d.expiryDate)}`});
    else if(days <= 30) alerts.push({bad:false, t:`Скоро истечёт: ${esc(d.name)}`, s:`осталось ${days} дн. (${fmtDate(d.expiryDate)})`});
  });
  if(car && car.oilInterval && car.lastOilMileage!=null){
    const left = Number(car.oilInterval) - (km - Number(car.lastOilMileage));
    if(left <= 0) alerts.push({bad:true, t:"Пора менять масло", s:`пробег после замены превышен на ${-left} км`});
    else if(left <= 1000) alerts.push({bad:false, t:"Скоро замена масла", s:`осталось ~${left} км`});
  }

  const last5 = exps.slice().sort((a,b)=> (b.date+b.id).localeCompare(a.date+a.id)).slice(0,5);

  return `
    <div class="row between">
      <div class="logo">BLVCK<span style="color:var(--text)"> TAXI</span></div>
      <button class="btn sm ghost" data-action="toggleTheme">${document.documentElement.dataset.theme==="dark"?"🌙":"️"}</button>
    </div>
    <p class="muted small" style="margin:2px 0 0">твой карманный учёт расходов</p>

    ${alerts.map(a=>`
      <div class="alert ${a.bad?"bad":""}">
        <span>${a.bad?"⚠️":"🔔"}</span>
        <div><div style="font-weight:700">${a.t}</div><div class="small muted">${a.s}</div></div>
      </div>`).join("")}

    <div class="stats">
      <div class="glass stat"><div class="v">${money(spentMonth)}</div><div class="k">за месяц</div></div>
      <div class="glass stat"><div class="v">${money(spentAll)}</div><div class="k">всего</div></div>
    </div>

    <div class="h2">Быстрый ввод</div>
    <div class="quick">
      ${Object.entries(CATS).map(([k,c])=>`
        <button class="qbtn" data-action="quick" data-cat="${k}">
          <span class="ico">${c.ico}</span>
          <span class="t">${c.t}</span>
          <span class="s">добавить расход</span>
        </button>`).join("")}
    </div>

    <div class="h2">Последние записи</div>
    ${last5.length ? `<div class="list">${last5.map(expenseRow).join("")}</div>`
                   : `<div class="glass empty">Пока пусто. Нажми на кнопку выше ⬆️</div>`}
  `;
}

function expenseRow(e){
  const c = CATS[e.category] || CATS.other;
  return `
    <div class="item">
      <div class="ic">${c.ico}</div>
      <div class="meta">
        <div class="t">${c.t}${e.note?": "+esc(e.note):""}</div>
        <div class="s">${fmtDate(e.date)}${e.mileage?" · "+Number(e.mileage).toLocaleString("ru-RU")+" км":""}</div>
      </div>
      <div class="amt">−${money(e.amount)}</div>
      <button class="del" data-action="delExpense" data-id="${e.id}" title="удалить">🗑</button>
    </div>`;
}

/* ---------- экран: ГРАФИКИ ---------- */
async function screenStats(){
  const exps = await dbAll("expenses");
  const filtered = filterByRange(exps, state.range);

  // по категориям
  const byCat = {};
  filtered.forEach(e=> byCat[e.category] = (byCat[e.category]||0) + Number(e.amount||0));
  // по месяцам
  const byMonth = {};
  filtered.forEach(e=>{ const m=e.date.slice(0,7); byMonth[m]=(byMonth[m]||0)+Number(e.amount||0); });
  const months = Object.keys(byMonth).sort();

  const total = Object.values(byCat).reduce((a,b)=>a+b,0);

  return `
    <div class="h1">Аналитика</div>
    <p class="muted small">расходы по категориям и месяцам</p>

    <div class="rangebar">
      ${[["month","Месяц"],["quarter","Квартал"],["year","Год"],["all","Всё"]]
        .map(([k,t])=>`<button class="chip ${state.range===k?"on":""}" data-action="setRange" data-range="${k}">${t}</button>`).join("")}
    </div>

    <div class="glass card">
      <div class="row between"><b>По категориям</b><span class="muted small">${money(total)}</span></div>
      ${total>0 ? donut(byCat) : `<div class="empty">Нет данных за период</div>`}
    </div>

    <div class="glass card">
      <b>По месяцам</b>
      ${months.length>0 ? bars(months.map(m=>({label:m.slice(2), value:byMonth[m]}))) : `<div class="empty">Нет данных</div>`}
    </div>
  `;
}
function filterByRange(exps, range){
  if(range==="all") return exps;
  const d = new Date();
  if(range==="month")   d.setMonth(d.getMonth()-1);
  if(range==="quarter") d.setMonth(d.getMonth()-3);
  if(range==="year")    d.setFullYear(d.getFullYear()-1);
  const cut = d.toISOString().slice(0,10);
  return exps.filter(e=> e.date >= cut);
}
function donut(byCat){
  const entries = Object.entries(byCat).filter(([,v])=>v>0);
  const total = entries.reduce((s,[,v])=>s+v,0);
  const colors = {fuel:"#7c5cff",repair:"#22d3ee",wash:"#34d399",other:"#fbbf24"};
  let a0 = -Math.PI/2; const R=60, r=38, cx=80, cy=80;
  const arc = (a1)=>{
    const large = (a1-a0)>Math.PI?1:0;
    const p = (ang,rad)=>[cx+rad*Math.cos(ang), cy+rad*Math.sin(ang)];
    const [x0,y0]=p(a0,R),[x1,y1]=p(a1,R),[x2,y2]=p(a1,r),[x3,y3]=p(a0,r);
    const d=`M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
    a0=a1; return d;
  };
  const paths = entries.map(([k,v])=>{
    const a1 = a0 + (v/total)*Math.PI*2;
    return `<path d="${arc(a1)}" fill="${colors[k]||"#888"}" opacity=".92"/>`;
  }).join("");
  const legend = entries.map(([k,v])=>`
    <div class="li"><span class="dot" style="background:${colors[k]||"#888"}"></span>
      ${(CATS[k]?.t||k)} · ${Math.round(v/total*100)}%</div>`).join("");
  return `
    <div class="row" style="gap:18px;margin-top:10px">
      <svg class="chart" viewBox="0 0 160 160" width="140" height="140">
        ${paths}
        <text x="80" y="78" text-anchor="middle" fill="var(--text)" font-size="14" font-weight="800">${money(total).split(" ")[0]}</text>
        <text x="80" y="94" text-anchor="middle" fill="var(--muted)" font-size="9">${cur()}</text>
      </svg>
      <div class="legend col">${legend}</div>
    </div>`;
}
function bars(data){
  const W=320, H=140, pad=18;
  const max = Math.max(...data.map(d=>d.value), 1);
  const bw = (W-pad*2)/data.length;
  const cols = data.map((d,i)=>{
    const h = (d.value/max)*(H-pad*2);
    const x = pad + i*bw + bw*0.15;
    const y = H-pad-h;
    return `<g>
      <rect x="${x}" y="${y}" width="${bw*0.7}" height="${h}" rx="5"
        fill="url(#g1)"><animate attributeName="height" from="0" to="${h}" dur=".5s" fill="freeze"/>
        <animate attributeName="y" from="${H-pad}" to="${y}" dur=".5s" fill="freeze"/></rect>
      <text x="${x+bw*0.35}" y="${H-5}" text-anchor="middle" fill="var(--muted)" font-size="9">${d.label}</text>
    </g>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="margin-top:10px">
    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
    ${cols}</svg>`;
}

/* ---------- экран: АВТО ---------- */
async function screenCar(){
  const car = await dbGet("car",1) || {};
  return `
    <div class="h1">Автомобиль</div>
    <p class="muted small">модель, расход, пробег, замена масла</p>
    <div class="glass card">
      <div class="row between">
        <div>
          <div style="font-size:20px;font-weight:800">${car.model?esc(car.model):"Не задано"}</div>
          <div class="muted small">${car.plate?esc(car.plate):"—"}</div>
        </div>
        <button class="btn sm" data-action="openEditCar">✏️ Изменить</button>
      </div>
      <div class="divider"></div>
      <div class="stats">
        <div class="stat"><div class="v">${(car.currentMileage||0).toLocaleString("ru-RU")}</div><div class="k">пробег, км</div></div>
        <div class="stat"><div class="v">${car.fuelPer100||"—"}</div><div class="k">расход л/100</div></div>
        <div class="stat"><div class="v">${(car.lastOilMileage||0).toLocaleString("ru-RU")}</div><div class="k">масло на км</div></div>
        <div class="stat"><div class="v">${car.oilInterval||"—"}</div><div class="k">интервал, км</div></div>
      </div>
    </div>
    <div class="h2">Расход топлива (оценка)</div>
    <div class="glass card">${fuelEstimate()}</div>
  `;
}
async function fuelEstimate(){
  // грубая оценка по заправкам: сумма литров? у нас нет литров — покажем сумму на км по пробегу
  const exps = (await dbAll("expenses")).filter(e=>e.category==="fuel" && e.mileage);
  if(exps.length<2) return `<div class="empty">Добавь ≥2 заправки с пробегом — посчитаю ₽/км</div>`;
  const s = exps.slice().sort((a,b)=>a.mileage-b.mileage);
  const km = s.at(-1).mileage - s[0].mileage;
  const sum = s.slice(1).reduce((a,e)=>a+Number(e.amount||0),0); // затраты между замерами
  if(km<=0) return `<div class="empty">Мало данных</div>`;
  return `<div class="row between"><span class="muted">Стоимость км</span><b>${money(sum/km)}</b></div>
          <div class="row between"><span class="muted">Замерено на</span><span>${km.toLocaleString("ru-RU")} км</span></div>`;
}

/* ---------- экран: ТО / ДОКИ ---------- */
async function screenDocs(){
  const maint = (await dbAll("maintenance")).sort((a,b)=> b.date.localeCompare(a.date));
  const docs  = (await dbAll("documents")).sort((a,b)=> (a.expiryDate||"9").localeCompare(b.expiryDate||"9"));
  return `
    <div class="h1">ТО и документы</div>
    <div class="row" style="gap:10px;margin-top:10px">
      <button class="btn" data-action="openAddMaint">➕ Событие ТО</button>
      <button class="btn" data-action="openAddDoc">📄 Документ</button>
    </div>

    <div class="h2">Документы</div>
    ${docs.length? `<div class="list">${docs.map(d=>{
        const days = d.expiryDate? Math.round((new Date(d.expiryDate)-new Date())/86400000):null;
        const warn = days!=null && days<=30;
        return `<div class="item">
          <div class="ic">${warn?(days<0?"⛔":"⏰"):"📄"}</div>
          <div class="meta"><div class="t">${esc(d.name)}</div>
            <div class="s">${d.expiryDate?("до "+fmtDate(d.expiryDate)+(days!=null?(days<0?" · просрочено":" · "+days+" дн."):"")):"бессрочно"}</div></div>
          <button class="del" data-action="delDoc" data-id="${d.id}">🗑</button>
        </div>`;}).join("")}</div>` : `<div class="glass empty">Нет документов</div>`}

    <div class="h2">Журнал ТО</div>
    ${maint.length? `<div class="list">${maint.map(m=>`
        <div class="item">
          <div class="ic">🔧</div>
          <div class="meta"><div class="t">${esc(m.title)}</div>
            <div class="s">${fmtDate(m.date)}${m.mileage?" · "+Number(m.mileage).toLocaleString("ru-RU")+" км":""}${m.note?" · "+esc(m.note):""}</div></div>
          <button class="del" data-action="delMaint" data-id="${m.id}">🗑</button>
        </div>`).join("")}</div>` : `<div class="glass empty">Нет событий</div>`}
  `;
}

/* ---------- экран: НАСТРОЙКИ ---------- */
async function screenSettings(){
  const exps = await dbAll("expenses");
  return `
    <div class="h1">Настройки</div>

    <div class="glass card">
      <div class="row between"><span>Тема</span>
        <button class="btn sm" data-action="toggleTheme">${document.documentElement.dataset.theme==="dark"?"🌙 Тёмная":"☀️ Светлая"}</button></div>
      <div class="divider"></div>
      <div class="row between"><span>Валюта</span>
        <div class="chips">${CURS.map(c=>`<span class="chip ${c===cur()?"on":""}" data-action="setCur" data-cur="${c}">${c}</span>`).join("")}</div></div>
    </div>

    <div class="h2">Резервная копия</div>
    <div class="glass card">
      <p class="muted small" style="margin-top:0">Все данные живут только в твоём телефоне. Сохраняй копию в файл, чтобы не потерять.</p>
      <button class="btn primary" data-action="export">⬇️ Сохранить копию</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="import">⬆️ Восстановить из файла</button>
    </div>

    <div class="h2">Опасная зона</div>
    <div class="glass card">
      <button class="btn danger" data-action="wipe">🧹 Удалить все данные</button>
      <p class="muted small" style="margin:8px 2px 0">Записей расходов: ${exps.length}</p>
    </div>

    <p class="muted small" style="text-align:center;margin-top:18px">BLVCK TAXI · офлайн · без серверов · бесплатно</p>
  `;
}

/* ---------- модалки ---------- */
function openModal(html){
  const m = $("#modal");
  m.innerHTML = `<div class="modal">${html}</div>`;
  m.hidden = false;
}
function closeModal(){ $("#modal").hidden = true; $("#modal").innerHTML = ""; }

function modalExpense(cat){
  state.modalCat = cat;
  openModal(`
    <div class="mhead"><h3>${CATS[cat].ico} ${CATS[cat].t}</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Сумма</label><input id="m_amount" class="input" type="number" inputmode="decimal" placeholder="0" autofocus></div>
    <div class="grid2">
      <div class="field"><label>Дата</label><input id="m_date" class="input" type="date" value="${today()}"></div>
      <div class="field"><label>Пробег, км</label><input id="m_mileage" class="input" type="number" inputmode="numeric" placeholder="необяз."></div>
    </div>
    <div class="field"><label>Заметка</label><input id="m_note" class="input" placeholder="например: АЗС Лукойл"></div>
    <button class="btn primary" data-action="saveExpense">Сохранить</button>
  `);
  setTimeout(()=> $("#m_amount")?.focus(), 60);
}
function modalMaint(){
  openModal(`
    <div class="mhead"><h3>🔧 Событие ТО</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Что сделали</label><input id="m_title" class="input" placeholder="Замена колодок" autofocus></div>
    <div class="grid2">
      <div class="field"><label>Дата</label><input id="m_date" class="input" type="date" value="${today()}"></div>
      <div class="field"><label>Пробег, км</label><input id="m_mileage" class="input" type="number" inputmode="numeric"></div>
    </div>
    <div class="field"><label>Заметка</label><input id="m_note" class="input"></div>
    <button class="btn primary" data-action="saveMaint">Сохранить</button>
  `);
}
function modalDoc(){
  openModal(`
    <div class="mhead"><h3>📄 Документ</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Название</label><input id="m_name" class="input" placeholder="Страховка / Техосмотр" autofocus></div>
    <div class="grid2">
      <div class="field"><label>Выдан</label><input id="m_issue" class="input" type="date"></div>
      <div class="field"><label>Действует до</label><input id="m_expiry" class="input" type="date"></div>
    </div>
    <div class="field"><label>Заметка</label><input id="m_note" class="input"></div>
    <button class="btn primary" data-action="saveDoc">Сохранить</button>
  `);
}
async function modalCar(){
  const car = await dbGet("car",1) || {};
  openModal(`
    <div class="mhead"><h3>🚗 Автомобиль</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Модель</label><input id="m_model" class="input" value="${esc(car.model||"")}" placeholder="Skoda Octavia"></div>
    <div class="grid2">
      <div class="field"><label>Номер</label><input id="m_plate" class="input" value="${esc(car.plate||"")}" placeholder="1234 AB-7"></div>
      <div class="field"><label>Расход л/100</label><input id="m_fuel" class="input" type="number" inputmode="decimal" value="${esc(car.fuelPer100||"")}"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>Текущий пробег</label><input id="m_km" class="input" type="number" inputmode="numeric" value="${esc(car.currentMileage||"")}"></div>
      <div class="field"><label>Масло на км</label><input id="m_oilkm" class="input" type="number" inputmode="numeric" value="${esc(car.lastOilMileage||"")}"></div>
    </div>
    <div class="field"><label>Интервал замены масла, км</label><input id="m_oilint" class="input" type="number" inputmode="numeric" value="${esc(car.oilInterval||"10000")}"></div>
    <button class="btn primary" data-action="saveCar">Сохранить</button>
  `);
}

/* ---------- действия ---------- */
async function saveExpense(){
  const amount = parseFloat($("#m_amount").value);
  if(!amount || amount<=0){ toast("Введи сумму"); return; }
  const mileage = parseFloat($("#m_mileage").value);
  const e = {
    id: uid(), category: state.modalCat, amount,
    date: $("#m_date").value || today(),
    mileage: mileage>0 ? mileage : null,
    note: $("#m_note").value.trim(),
  };
  await dbAdd("expenses", e);
  // апдейт пробега авто
  if(e.mileage){
    const car = await dbGet("car",1) || {id:1};
    if(!car.currentMileage || e.mileage > car.currentMileage){ car.currentMileage = e.mileage; await dbPut("car",car); }
  }
  closeModal(); toast("Расход добавлен"); renderAsync();
}
async function saveMaint(){
  const title = $("#m_title").value.trim();
  if(!title){ toast("Введи описание"); return; }
  const mileage = parseFloat($("#m_mileage").value);
  await dbAdd("maintenance",{ id:uid(), title, date:$("#m_date").value||today(),
    mileage: mileage>0?mileage:null, note:$("#m_note").value.trim() });
  closeModal(); toast("Событие ТО добавлено"); renderAsync();
}
async function saveDoc(){
  const name = $("#m_name").value.trim();
  if(!name){ toast("Введи название"); return; }
  await dbAdd("documents",{ id:uid(), name,
    issueDate:$("#m_issue").value||null, expiryDate:$("#m_expiry").value||null,
    note:$("#m_note").value.trim() });
  closeModal(); toast("Документ добавлен"); renderAsync();
}
async function saveCar(){
  const car = {
    id:1,
    model:$("#m_model").value.trim(),
    plate:$("#m_plate").value.trim(),
    fuelPer100:parseFloat($("#m_fuel").value)||null,
    currentMileage:parseFloat($("#m_km").value)||0,
    lastOilMileage:parseFloat($("#m_oilkm").value)||0,
    oilInterval:parseFloat($("#m_oilint").value)||10000,
  };
  await dbPut("car",car); closeModal(); toast("Авто сохранено"); renderAsync();
}

/* ---------- бэкап / восстановление ---------- */
async function exportBackup(){
  const data = { _app:"BLVCK TAXI", _v:1, _at:new Date().toISOString() };
  for(const s of STORES) data[s] = await dbAll(s);
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `blvck-taxi-backup-${today()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  toast("Копия сохранена");
}
function importBackup(){ $("#restoreInput").click(); }
async function handleRestoreFile(file){
  if(!file) return;
  try{
    const data = JSON.parse(await file.text());
    if(!confirm("Заменить ВСЕ текущие данные данными из файла?")) return;
    for(const s of STORES){ await dbClear(s); for(const v of (data[s]||[])) await dbPut(s,v); }
    toast("Данные восстановлены"); renderAsync();
  }catch(e){ toast("Ошибка файла"); }
}
async function wipe(){
  if(!confirm("Удалить ВСЕ данные приложения? Это необратимо.")) return;
  for(const s of STORES) await dbClear(s);
  toast("Всё удалено"); renderAsync();
}

/* ---------- тема / валюта ---------- */
function applyTheme(){
  const t = localStorage.getItem("blvck_theme") || "dark";
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = t==="dark" ? "#0a0a0f" : "#eef0f7";
}
function toggleTheme(){
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("blvck_theme", t); applyTheme(); renderAsync();
}
function setCur(c){ localStorage.setItem("blvck_cur", c); renderAsync(); }

/* ---------- частицы ---------- */
function makeParticles(){
  const box = $(".bg-particles"); if(!box) return;
  for(let i=0;i<14;i++){
    const s = document.createElement("span");
    s.style.left = Math.random()*100+"%";
    s.style.animationDuration = (12+Math.random()*16)+"s";
    s.style.animationDelay = (-Math.random()*20)+"s";
    const sc = .5+Math.random()*1.4; s.style.transform = `scale(${sc})`;
    box.appendChild(s);
  }
}

/* ---------- глобальный делегат событий ---------- */
document.addEventListener("click", async (ev)=>{
  const el = ev.target.closest("[data-action]"); if(!el) return;
  const a = el.dataset.action;
  switch(a){
    case "nav":        state.screen = el.dataset.to; renderAsync(); break;
    case "quick":      modalExpense(el.dataset.cat); break;
    case "openEditCar":modalCar(); break;
    case "openAddMaint":modalMaint(); break;
    case "openAddDoc": modalDoc(); break;
    case "saveExpense":await saveExpense(); break;
    case "saveMaint":  await saveMaint(); break;
    case "saveDoc":    await saveDoc(); break;
    case "saveCar":    await saveCar(); break;
    case "delExpense": if(confirm("Удалить запись?")){ await dbDel("expenses",el.dataset.id); renderAsync(); } break;
    case "delMaint":   if(confirm("Удалить событие?")){ await dbDel("maintenance",el.dataset.id); renderAsync(); } break;
    case "delDoc":     if(confirm("Удалить документ?")){ await dbDel("documents",el.dataset.id); renderAsync(); } break;
    case "setRange":   state.range = el.dataset.range; renderAsync(); break;
    case "toggleTheme":toggleTheme(); break;
    case "setCur":     setCur(el.dataset.cur); break;
    case "export":     exportBackup(); break;
    case "import":     importBackup(); break;
    case "wipe":       wipe(); break;
    case "close":      closeModal(); break;
  }
});
// клик по затемнению модалки закрывает её
$("#modal").addEventListener("click", e=>{ if(e.target.id==="modal") closeModal(); });
$("#restoreInput").addEventListener("change", e=> handleRestoreFile(e.target.files[0]));

/* ---------- старт ---------- */
(async function init(){
  applyTheme();
  makeParticles();
  await openDB();
  await renderAsync();
  if("serviceWorker" in navigator){
    window.addEventListener("load", ()=> navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
})();