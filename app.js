/* модульная архитектура: tax.js / pro.js через глобальные хуки */

/* ===== URL СЕРВЕРА — ЗАМЕНИ НА СВОЙ URL С RENDER (без слэша в конце) ===== */
const RENDER_URL = "https://blvck-taxi-api.onrender.com";

/* ===== TELEGRAM MINI APP ===== */
const TG = window.Telegram?.WebApp;
const isTelegram = !!TG;
const haptic    = (t="light") => { try{ TG?.HapticFeedback?.impactOccurred(t); }catch{} };
const hapticOk  = () => { try{ TG?.HapticFeedback?.notificationOccurred?.("success"); }catch{} };
const hapticBad = () => { try{ TG?.HapticFeedback?.notificationOccurred?.("error"); }catch{} };
function setupTelegram(){
  if(!TG) return;
  try{
    TG.ready(); TG.expand(); syncTgColors();
    const u = TG.initDataUnsafe?.user;
    if(u?.first_name) localStorage.setItem("blvck_tg_name", u.first_name);
    TG.BackButton.onClick(()=>{ const ov=$("#shotmode"); if(ov&&ov.style.display!=="none"){ closeShotMode(); } else { closeModal(); } });
  }catch(e){ console.warn("TG init", e); }
}
function syncTgColors(){
  if(!TG) return;
  const c = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#0a0a0a";
  try{ TG.setBackgroundColor(c); TG.setHeaderColor(c); }catch{}
}

/* ---------- справочники ---------- */
const CATS = {
  fuel:   { ico:"⛽", t:"Заправка" },
  parts:  { ico:"🔩", t:"Запчасти" },
  repair: { ico:"🔧", t:"Ремонт" },
  wash:   { ico:"🫧", t:"Мойка" },
  rent:   { ico:"🗝️", t:"Аренда авто" },
  other:  { ico:"📦", t:"Другое" },
};
const CAR_CATS = ["fuel","parts","repair","wash","rent"];
const WEAR_CATS = ["fuel","repair","parts"];
const CURS = ["BYN","₽","$","€","₸"];
const TABS = [
  { id:"dash", ico:"🏠", t:"Главная" }, { id:"stats", ico:"📊", t:"Графики" },
  { id:"car", ico:"🚗", t:"Авто" },
  { id:"docs", ico:"📄", t:"ТО/Доки" }, { id:"settings", ico:"⚙️", t:"Ещё" },
];
const TAX_PRESETS = ["Единый налог","ФСЗН за квартал","Подоходный (аванс)","Декларация","Налог на проф. доход"];
const FINE_PRESETS = ["Камера / превышение","Парковка","Ремень / телефон за рулём","Нет оклейки / шашечек","Нет карточки водителя","Просрочен техосмотр / страховка","Тонировка"];
const DOC_PRESETS = ["Медсправка водителя","Карточка водителя такси","Оклейка / шашечки","Страховка (ОСГОП)","Техосмотр"];
const WD = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const WD_ORDER = [1,2,3,4,5,6,0];

const state = { screen:"dash", range:"month", modalCat:"fuel", modalEditId:null, modalReceipt:null,
               receiptMode:"quarter", receiptOffset:0, receiptCat:"all", _animateScreen:true };

/* ---------- утилиты ---------- */
const $  = (s, r=document) => r.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const cur   = () => localStorage.getItem("blvck_cur") || "BYN";
const money = n => (Number(n)||0).toLocaleString("ru-RU",{maximumFractionDigits:2}) + " " + cur();
const rate  = n => (Number(n)||0).toLocaleString("ru-RU",{maximumFractionDigits:2}) + " " + cur();
const num   = n => (Number(n)||0).toLocaleString("ru-RU");
const today = () => new Date().toISOString().slice(0,10);
const ymNow = () => today().slice(0,7);
const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("ru-RU",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtShort = d => d ? new Date(d+"T00:00:00").toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "—";
const dayNum = d => d ? new Date(d+"T00:00:00").getDate() : "—";
const monShort = d => d ? new Date(d+"T00:00:00").toLocaleDateString("ru-RU",{month:"short"}) : "";
const monthLabel = ym => new Date(ym+"-01T00:00:00").toLocaleDateString("ru-RU",{month:"long",year:"numeric"});
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const YEAR = () => new Date().getFullYear();
const CUR_Q = () => Math.ceil((new Date().getMonth()+1)/3);
const isIP = () => localStorage.getItem("blvck_is_ip") === "1";
const onboarded = () => localStorage.getItem("blvck_onboarded") === "1";
function ruPlural(n,f){ const a=Math.abs(n)%100,b=a%10; if(a>=11&&a<=14)return f[2]; if(b===1)return f[0]; if(b>=2&&b<=4)return f[1]; return f[2]; }
function prevYM(ym){ const [y,m]=ym.split("-").map(Number); return new Date(y,m-2,1).toISOString().slice(0,7); }
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }

function periodRange(mode, offset){
  const now = new Date();
  if(mode==="all") return {from:null, to:null, label:"Всё время"};
  if(mode==="month"){ const b=new Date(now.getFullYear(),now.getMonth()+offset,1); const y=b.getFullYear(),m=b.getMonth();
    return {from:new Date(y,m,1).toISOString().slice(0,10), to:new Date(y,m+1,0).toISOString().slice(0,10), label:monthLabel(new Date(y,m,1).toISOString().slice(0,7))}; }
  if(mode==="quarter"){ let q=CUR_Q()-1+offset,y=now.getFullYear(); while(q<1){q+=4;y--;} while(q>3){q-=4;y++;} const m0=q*3;
    return {from:new Date(y,m0,1).toISOString().slice(0,10), to:new Date(y,m0+3,0).toISOString().slice(0,10), label:`${q} кв. ${y}`}; }
  if(mode==="year"){ const y=now.getFullYear()+offset; return {from:`${y}-01-01`, to:`${y}-12-31`, label:`${y} год`}; }
  return {from:null, to:null, label:""};
}

/* ---------- IndexedDB ---------- */
let db;
const STORES = ["expenses","maintenance","documents","fszn"];
function openDB(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open("blvck_taxi", 2);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if(!d.objectStoreNames.contains("expenses")) d.createObjectStore("expenses", {keyPath:"id"});
      if(!d.objectStoreNames.contains("maintenance")) d.createObjectStore("maintenance", {keyPath:"id"});
      if(!d.objectStoreNames.contains("documents")) d.createObjectStore("documents", {keyPath:"id"});
      if(!d.objectStoreNames.contains("fszn")) d.createObjectStore("fszn", {keyPath:"id"});
    };
    r.onsuccess = e => { db = e.target.result; res(db); };
    r.onerror = e => rej(e.target.error);
  });
}
function dbAll(store){ return new Promise((res,rej)=>{ const tx=db.transaction(store,"readonly"); const s=tx.objectStore(store); const r=s.getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function dbGet(store,id){ return new Promise((res,rej)=>{ const tx=db.transaction(store,"readonly"); const s=tx.objectStore(store); const r=s.get(id); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function dbPut(store,val){ return new Promise((res,rej)=>{ const tx=db.transaction(store,"readwrite"); const s=tx.objectStore(store); const r=s.put(val); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function dbDel(store,id){ return new Promise((res,rej)=>{ const tx=db.transaction(store,"readwrite"); const s=tx.objectStore(store); const r=s.delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }
function dbClear(store){ return new Promise((res,rej)=>{ const tx=db.transaction(store,"readwrite"); const s=tx.objectStore(store); const r=s.clear(); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }

/* ---------- LocalStorage обёртки ---------- */
const getLS = (k,def) => { const v=localStorage.getItem(k); return v!==null?JSON.parse(v):def; };
const setLS = (k,v) => localStorage.setItem(k, JSON.stringify(v));
const fuelPresets = () => getLS("blvck_fuel_presets", [100, 150, 200]);
const setFuelPresets = v => setLS("blvck_fuel_presets", v);
const dailyRevMap = () => getLS("blvck_daily_rev", {});
const dailyRevOf = d => dailyRevMap()[d] || 0;
const setDailyRev = (d,v) => { const m=dailyRevMap(); if(v>0) m[d]=v; else delete m[d]; setLS("blvck_daily_rev",m); };
const dailyTarget = () => getLS("blvck_daily_target", 0);
const setDailyTarget = v => setLS("blvck_daily_target", v);
const incomeMap = () => getLS("blvck_income", {});
const setIncome = (ym,v) => { const m=incomeMap(); m[ym]=v; setLS("blvck_income",m); };
const kmMap = () => getLS("blvck_km", {});
const setKm = (ym,v) => { const m=kmMap(); m[ym]=v; setLS("blvck_km",m); };
const hoursMap = () => getLS("blvck_hours", {});
const setHours = (ym,v) => { const m=hoursMap(); m[ym]=v; setLS("blvck_hours",m); };
const taxList = () => getLS("blvck_tax_reminders", []);
const saveTaxList = v => setLS("blvck_tax_reminders", v);
const finesList = () => getLS("blvck_fines", []);
const saveFinesList = v => setLS("blvck_fines", v);
const fsznSettings = () => ({ mzp: Number(localStorage.getItem("blvck_fszn_mzp"))||626, rate: Number(localStorage.getItem("blvck_fszn_rate"))||35 });

/* ---------- РТО удалено ---------- */

/* ---------- отрисовка ---------- */
async function renderAsync(){
  const app = $("#app");
  if(!app) return;
  if(!onboarded()){ app.innerHTML = onboardHTML(); return; }
  const html = await ({ dash:screenDash, stats:screenStats, car:screenCar, docs:screenDocs, settings:screenSettings, fszn:screenFszn, fines:screenFines, receipts:screenReceipts, expenses:screenExpenses }[state.screen] || screenDash)();
  app.innerHTML = html;
  renderTabbar();
  if(state._animateScreen){ app.classList.remove("revealed"); void app.offsetWidth; app.classList.add("revealed"); state._animateScreen=false; }
  for(const hook of (window.BLVCK_HOOKS||[])){ try{ hook(state.screen); }catch{} }
}
function renderTabbar(){
  const tb = $("#tabbar"); if(!tb) return;
  tb.innerHTML = `<div class="inner">${TABS.map(t=>`<button class="tab ${state.screen===t.id?'on':''}" data-action="nav" data-to="${t.id}"><span class="ti">${t.ico}</span>${t.t}</button>`).join("")}</div>`;
}
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.hidden=false; setTimeout(()=>t.hidden=true, 2200); }

/* ---------- экраны ---------- */
function onboardHTML(){
  return `<div class="onboard">
    <div class="ob-top"><div class="brand-dot"></div><span class="brand-name">BLVCK</span><span class="brand-sub">TAXI</span></div>
    <h2>Учёт без<br>лишнего шума</h2>
    <p class="ob-sub">Твои цифры живут только в этом телефоне. Никаких чужих облаков, подписок и навязчивых уведомлений.</p>
    <div class="ob-step"><div class="n">01</div><div><div class="tt">Быстрый ввод</div><div class="ds">Тап по сумме — и расход записан. Чеки крепятся скриншотами.</div></div></div>
    <div class="ob-step"><div class="n">02</div><div><div class="tt">Контроль износа</div><div class="ds">Считаем стоимость километра по запчастям, маслу и топливу.</div></div></div>
    <div class="ob-step"><div class="n">03</div><div><div class="tt">Полный офлайн</div><div class="ds">Работает без интернета. Резервную копию можно сохранить текстом в «Избранное» Telegram.</div></div></div>
    <button class="btn primary ob-go" data-action="onboardDone">Начать работу <span class="arrow">→</span></button>
  </div>`;
}

async function screenDash(){
  const exps = await dbAll("expenses");
  const pr = periodRange(state.range, 0);
  const periodExps = exps.filter(e => !pr.from || (e.date >= pr.from && e.date <= pr.to));
  const total = periodExps.reduce((s,e) => s + Number(e.amount||0), 0);
  const car = await dbGet("car",1) || {};
  const curMile = Number(car.currentMileage) || 0;
  
  // Выручка за период
  const revMap = dailyRevMap();
  let revTotal = 0;
  for(const d in revMap){ if(d >= pr.from && d <= pr.to) revTotal += Number(revMap[d]); }
  const free = revTotal - total;

  // График за последние 7 дней
  const days = [];
  for(let i=6; i>=0; i--){
    const d = daysAgo(i);
    const dayExp = exps.filter(e=>e.date===d).reduce((s,e)=>s+Number(e.amount||0),0);
    const dayRev = Number(revMap[d]) || 0;
    days.push({ date:d, exp:dayExp, rev:dayRev, label:fmtShort(d) });
  }
  const maxVal = Math.max(1, ...days.map(d=>Math.max(d.exp, d.rev)));
  const sparkPath = days.map((d,i) => {
    const x = (i / (days.length-1)) * 100;
    const y = 100 - (d.exp / maxVal) * 100;
    return `${i===0?'M':'L'} ${x} ${y}`;
  }).join(" ");
  const sparkArea = `M 0 100 ${sparkPath} L 100 100 Z`;

  // Предупреждения
  const alerts = [];
  if(isIP()){
    const s = fsznSettings();
    const minMonth = s.rate/100 * s.mzp;
    const y = YEAR();
    let paid = 0;
    for(let q=1; q<=4; q++){ const r = await dbGet("fszn", `${y}-Q${q}`); paid += Number(r?.paid)||0; }
    const goal = minMonth * 12;
    const pct = goal>0 ? Math.min(100, Math.round(paid/goal*100)) : 0;
    if(pct < 100) alerts.push({ type:"warn", text:`ФСЗН ${y}: уплачено ${pct}% (${money(paid)} из ${money(goal)})` });
  }
  const fines = finesList().filter(f=>!f.paid);
  if(fines.length > 0) alerts.push({ type:"bad", text:`Висит неоплаченных штрафов: ${fines.length} на сумму ${money(fines.reduce((s,f)=>s+Number(f.amount),0))}` });

  return `
    <div class="topbar">
      <div class="brand"><div class="brand-dot"></div><span class="brand-name">BLVCK</span><span class="brand-sub">TAXI</span></div>
      <div class="topbar-r">
        <span class="who">${pr.label}</span>
        <button class="iconbtn" data-action="setRange" data-range="${state.range==='month'?'quarter':'month'}">${state.range==='month'?'📅':'🗓️'}</button>
      </div>
    </div>

    <div class="hero glass">
      <div class="hero-top"><span class="kicker">Свободные деньги за период</span></div>
      <div class="hero-num ${free>=0?'pos':'neg'}">${money(free)}</div>
      <div class="hero-sub">
        <span>Выручка: <b>${money(revTotal)}</b></span>
        <span class="dotsep">·</span>
        <span>Расходы: <b>${money(total)}</b></span>
      </div>
    </div>

    ${alerts.length ? alerts.map(a=>`<div class="alert ${a.type}"><span>${a.text}</span></div>`).join("") : ""}

    <div class="quickrow">
      <button class="qcard qcard-add" data-action="openDrive"><span class="ico">🚦</span><span class="t">За рулём</span><span class="s">Быстрый ввод</span></button>
      ${Object.entries(CATS).map(([k,v])=>`<button class="qcard" data-action="quick" data-cat="${k}"><span class="ico">${v.ico}</span><span class="t">${v.t}</span><span class="s">Добавить</span></button>`).join("")}
    </div>

    <div class="today glass">
      <div class="today-main">
        <span class="kicker">Сегодня, ${fmtDate(today())}</span>
        <div class="today-num">${money(dailyRevOf(today()) - exps.filter(e=>e.date===today()).reduce((s,e)=>s+Number(e.amount||0),0))}</div>
        <button class="btn sm ghost" data-action="openDailyRev">✏️ Изменить выручку дня</button>
      </div>
      <svg class="ring" viewBox="0 0 100 100">
        <circle class="ring-bg" cx="50" cy="50" r="42"/>
        <circle class="ring-fg" cx="50" cy="50" r="42" stroke-dasharray="264" stroke-dashoffset="${264 - (264 * Math.min(1, (exps.filter(e=>e.date===today()).reduce((s,e)=>s+Number(e.amount||0),0) / (dailyTarget()||1))))}"/>
        <text class="ring-t" x="50" y="54">${Math.round((exps.filter(e=>e.date===today()).reduce((s,e)=>s+Number(e.amount||0),0) / (dailyTarget()||1)) * 100)}%</text>
      </svg>
    </div>

    <div class="sparkcard glass">
      <span class="kicker">Динамика расходов (7 дней)</span>
      <svg class="spark" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path class="spark-area" d="${sparkArea}"/>
        <path class="spark-line" d="${sparkPath}"/>
        <circle class="spark-dot" cx="100" cy="${100 - (days[days.length-1].exp / maxVal) * 100}" r="3"/>
      </svg>
    </div>

    <div class="toolgrid">
      <button class="btn" data-action="openExpenses">📋 Все расходы</button>
      <button class="btn" data-action="openFines">🚨 Штрафы</button>
      <button class="btn" data-action="openReceipts">🧾 Чеки</button>
      <button class="btn" data-action="openFszn">🧮 Налоги и ФСЗН</button>
    </div>
  `;
}

async function screenExpenses(){
  const exps = await dbAll("expenses");
  const q = (state.expQ || "").toLowerCase();
  const filtered = exps.filter(e => {
    if(state.expCat && state.expCat !== "all" && e.category !== state.expCat) return false;
    if(q && !((e.note||"").toLowerCase().includes(q) || (CATS[e.category]?.t||"").toLowerCase().includes(q))) return false;
    return true;
  }).sort((a,b) => b.date.localeCompare(a.date));

  return `
    <div class="topbar">
      <button class="iconbtn" data-action="nav" data-to="dash">←</button>
      <span class="h1">Расходы</span>
      <button class="iconbtn" data-action="sendReportBot">📤</button>
    </div>

    <div class="searchwrap glass" style="padding:10px; margin-bottom:12px; display:flex; gap:8px; align-items:center;">
      <span>🔍</span>
      <input class="input" id="exp_search" placeholder="Поиск по заметке..." value="${esc(state.expQ||"")}" style="border:none; background:transparent; padding:4px; box-shadow:none;" />
    </div>

    <div class="rangebar">
      <button class="chip ${state.expCat==="all"?"on":""}" data-action="setExpCat" data-cat="all">Все</button>
      ${Object.entries(CATS).map(([k,v])=>`<button class="chip ${state.expCat===k?"on":""}" data-action="setExpCat" data-cat="${k}">${v.ico} ${v.t}</button>`).join("")}
    </div>

    <div class="list">
      ${filtered.length ? filtered.map(e => {
        const c = CATS[e.category] || CATS.other;
        return `<div class="item">
          <div class="ic">${c.ico}</div>
          <div class="meta">
            <div class="t">${esc(e.note || c.t)}</div>
            <div class="s">${fmtDate(e.date)}${e.mileage ? ` · ${num(e.mileage)} км` : ""}</div>
          </div>
          <div class="amt">${money(e.amount)}</div>
          ${e.receipt ? `<button class="edit" data-action="viewReceipt" data-id="${e.id}">📸</button>` : ""}
          <button class="edit" data-action="editExpense" data-id="${e.id}">✏️</button>
          <button class="del" data-action="delExpense" data-id="${e.id}">🗑</button>
        </div>`;
      }).join("") : '<div class="empty">Нет записей</div>'}
    </div>
  `;
}

async function screenStats(){
  const exps = await dbAll("expenses");
  const pr = periodRange(state.range, 0);
  const periodExps = exps.filter(e => !pr.from || (e.date >= pr.from && e.date <= pr.to));
  
  const byCat = {};
  periodExps.forEach(e => { byCat[e.category] = (byCat[e.category]||0) + Number(e.amount||0); });
  const sorted = Object.entries(byCat).sort((a,b) => b[1] - a[1]);
  const total = sorted.reduce((s,[,v]) => s+v, 0) || 1;

  const revMap = dailyRevMap();
  let revTotal = 0;
  for(const d in revMap){ if(d >= pr.from && d <= pr.to) revTotal += Number(revMap[d]); }
  const free = revTotal - (total===1 ? 0 : total);

  // График по дням месяца
  const daysInMonth = new Date(pr.to).getDate();
  const chartData = [];
  let maxDayVal = 1;
  for(let i=1; i<=daysInMonth; i++){
    const d = `${pr.from.slice(0,8)}${String(i).padStart(2,'0')}`;
    const exp = periodExps.filter(e=>e.date===d).reduce((s,e)=>s+Number(e.amount||0),0);
    const rev = Number(revMap[d]) || 0;
    if(exp > maxDayVal) maxDayVal = exp;
    if(rev > maxDayVal) maxDayVal = rev;
    chartData.push({ day:i, exp, rev });
  }

  return `
    <div class="topbar">
      <button class="iconbtn" data-action="nav" data-to="dash">←</button>
      <span class="h1">Графики</span>
      <button class="iconbtn" data-action="setRange" data-range="${state.range==='month'?'quarter':'month'}">${state.range==='month'?'📅':'🗓️'}</button>
    </div>

    <div class="metricrow">
      <div class="metric"><div class="v pos">${money(revTotal)}</div><div class="k">Выручка за период</div></div>
      <div class="metric"><div class="v neg">${money(total===1?0:total)}</div><div class="k">Расходы за период</div></div>
      <div class="metric"><div class="v">${money(free)}</div><div class="k">Свободные деньги</div></div>
      <div class="metric"><div class="v">${periodExps.length}</div><div class="k">Всего операций</div></div>
    </div>

    <div class="glass card">
      <span class="kicker">Структура расходов</span>
      <div class="list" style="margin-top:12px">
        ${sorted.map(([k,v]) => {
          const c = CATS[k] || CATS.other;
          const pct = Math.round((v/total)*100);
          return `<div class="item">
            <div class="ic">${c.ico}</div>
            <div class="meta">
              <div class="t">${c.t}</div>
              <div class="progress"><i style="width:${pct}%"></i></div>
            </div>
            <div class="amt">${money(v)}<br><span class="small muted">${pct}%</span></div>
          </div>`;
        }).join("")}
      </div>
    </div>

    <div class="glass card">
      <span class="kicker">Динамика по дням (${pr.label})</span>
      <svg class="chart" viewBox="0 0 320 150" style="margin-top:12px">
        ${chartData.map((d,i) => {
          const x = 20 + (i / (daysInMonth-1 || 1)) * 280;
          const hExp = (d.exp / maxDayVal) * 100;
          const hRev = (d.rev / maxDayVal) * 100;
          return `<rect x="${x-2}" y="${130-hExp}" width="4" height="${hExp}" fill="#ff5a00" opacity="0.8"/>
                  <rect x="${x+2}" y="${130-hRev}" width="4" height="${hRev}" fill="#f3f3f8" opacity="0.6"/>`;
        }).join("")}
        <line x1="20" y1="130" x2="300" y2="130" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
      </svg>
      <div class="legend">
        <div class="li"><div class="dot" style="background:#ff5a00"></div>Расходы</div>
        <div class="li"><div class="dot" style="background:#f3f3f8"></div>Выручка</div>
      </div>
    </div>
  `;
}

async function screenCar(){
  const car = await dbGet("car",1) || {};
  const exps = await dbAll("expenses");
  const wearExps = exps.filter(e => WEAR_CATS.includes(e.category) && Number(e.mileage) > 0).sort((a,b) => Number(a.mileage) - Number(b.mileage));
  
  // Группировка по деталям/работам
  const groups = {};
  wearExps.forEach(e => {
    const base = (e.note || "").trim().toLowerCase();
    const key = base ? (e.category + "|" + base) : ("id|" + e.id);
    if(!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  const wearStats = [];
  const curMile = Number(car.currentMileage) || 0;
  Object.values(groups).forEach(arr => {
    arr.sort((a,b) => Number(a.mileage) - Number(b.mileage));
    arr.forEach((e, i) => {
      const next = arr[i+1];
      const installMile = Number(e.mileage);
      let span = null;
      let active = !next;
      if(next) {
        span = Math.max(0, Number(next.mileage) - installMile);
      } else if(curMile > installMile) {
        span = curMile - installMile;
        active = true;
      }
      wearStats.push({
        title: e.note || CATS[e.category]?.t || "",
        installMile,
        span,
        active,
        cost: Number(e.amount) || 0,
        category: e.category
      });
    });
  });

  // Расход на км
  let totalWearCost = 0;
  let totalWearKm = 0;
  wearStats.filter(w => w.active && w.span > 0).forEach(w => {
    totalWearCost += w.cost;
    totalWearKm += w.span;
  });
  const costPerKm = totalWearKm > 0 ? (totalWearCost / totalWearKm) : 0;

  return `
    <div class="topbar">
      <button class="iconbtn" data-action="nav" data-to="dash">←</button>
      <span class="h1">Автомобиль</span>
      <button class="iconbtn" data-action="openEditCar">✏️</button>
    </div>

    <div class="glass card">
      <div class="row between">
        <div>
          <div class="h1" style="font-size:24px; margin:0">${esc(car.model || "Не указан")}</div>
          <div class="muted small">${esc(car.plate || "Номер не указан")} · ${num(curMile)} км</div>
        </div>
        <div style="text-align:right">
          <div class="kicker">Износ на км</div>
          <div class="h1" style="font-size:24px; margin:0; color:var(--accent)">${rate(costPerKm)}</div>
        </div>
      </div>
    </div>

    <div class="h2">История замен и ремонтов</div>
    <button class="btn sm" style="margin-bottom:12px" data-action="openAddMaint">+ Добавить событие ТО</button>
    
    <div class="list">
      ${wearStats.length ? wearStats.filter(w => w.active).sort((a,b) => b.installMile - a.installMile).map(w => {
        const c = CATS[w.category] || CATS.other;
        return `<div class="item">
          <div class="ic">${c.ico}</div>
          <div class="meta">
            <div class="t">${esc(w.title)}</div>
            <div class="s">Установлено: ${num(w.installMile)} км · Пройдено: ${w.span ? num(w.span) + " км" : "—"}</div>
          </div>
          <div class="amt">${money(w.cost)}</div>
        </div>`;
      }).join("") : '<div class="empty">Пока нет записей с пробегом. Добавляй пробег при вводе расходов на запчасти и ремонт.</div>'}
    </div>

    <div class="h2">Документы</div>
    <button class="btn sm" style="margin-bottom:12px" data-action="openAddDoc">+ Добавить документ</button>
    <div class="list" id="docs-list">
      ${await renderDocsList()}
    </div>
  `;
}

async function renderDocsList(){
  const docs = (await dbAll("documents")).sort((a,b) => (a.expiryDate||"9999").localeCompare(b.expiryDate||"9999"));
  if(!docs.length) return '<div class="empty">Нет документов</div>';
  const todayStr = today();
  return docs.map(d => {
    let days = null;
    let badge = "";
    if(d.expiryDate) {
      days = Math.ceil((new Date(d.expiryDate) - new Date()) / (1000*60*60*24));
      if(days < 0) badge = `<span class="badge bad">Просрочено</span>`;
      else if(days <= 30) badge = `<span class="badge warn">Осталось ${days} дн.</span>`;
      else badge = `<span class="badge good">${days} дн.</span>`;
    }
    return `<div class="item">
      <div class="ic">📄</div>
      <div class="meta">
        <div class="t">${esc(d.name)}</div>
        <div class="s">${d.expiryDate ? fmtDate(d.expiryDate) : "Без срока"} ${badge}</div>
      </div>
      <button class="edit" data-action="delDoc" data-id="${d.id}">🗑</button>
    </div>`;
  }).join("");
}

async function screenDocs(){
  return await screenCar(); // Перенаправляем на экран Авто, где есть документы
}

async function screenFszn(){
  const s = fsznSettings();
  const y = YEAR();
  const minMonth = s.rate/100 * s.mzp;
  const minYear = minMonth * 12;
  
  let paid = 0;
  const quarters = [];
  for(let q=1; q<=4; q++){
    const r = await dbGet("fszn", `${y}-Q${q}`) || { id:`${y}-Q${q}`, year:y, quarter:q, income:0, paid:0 };
    paid += Number(r.paid) || 0;
    quarters.push(r);
  }
  const pct = minYear > 0 ? Math.min(100, Math.round(paid/minYear*100)) : 0;

  const taxReminders = taxList().sort((a,b) => (a.date||"9999").localeCompare(b.date||"9999"));

  return `
    <div class="topbar">
      <button class="iconbtn" data-action="nav" data-to="dash">←</button>
      <span class="h1">Налоги и ФСЗН</span>
    </div>

    <div class="glass card">
      <div class="row between">
        <div>
          <span class="kicker">ФСЗН ${y} год</span>
          <div class="h1" style="font-size:28px; margin:6px 0">${money(paid)}</div>
          <div class="muted small">из ${money(minYear)} (мин. взнос)</div>
        </div>
        <div class="ring" style="width:70px; height:70px">
          <svg viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="42"/>
            <circle class="ring-fg" cx="50" cy="50" r="42" stroke-dasharray="264" stroke-dashoffset="${264 - (264 * pct/100)}"/>
            <text class="ring-t" x="50" y="54" style="font-size:18px">${pct}%</text>
          </svg>
        </div>
      </div>
      <div class="progress" style="margin-top:16px"><i style="width:${pct}%"></i></div>
    </div>

    <div class="h2">Поквартально</div>
    <div class="list">
      ${quarters.map(q => `
        <div class="item">
          <div class="meta">
            <div class="t">${q.quarter} квартал ${q.year}</div>
            <div class="grid2" style="margin-top:8px; gap:8px">
              <div class="field" style="margin:0">
                <label>Доход</label>
                <input class="input" data-fszn="${q.quarter}" data-fszn-field="income" value="${q.income||""}" placeholder="0" type="number" step="0.01" />
              </div>
              <div class="field" style="margin:0">
                <label>Уплачено</label>
                <input class="input" data-fszn="${q.quarter}" data-fszn-field="paid" value="${q.paid||""}" placeholder="0" type="number" step="0.01" />
              </div>
            </div>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="h2">Параметры расчёта</div>
    <div class="glass card">
      <div class="grid2">
        <div class="field">
          <label>МЗП за месяц (${y})</label>
          <input class="input" id="fszn_mzp" value="${s.mzp}" type="number" step="0.01" />
        </div>
        <div class="field">
          <label>Ставка взносов, %</label>
          <input class="input" id="fszn_rate" value="${s.rate}" type="number" step="0.1" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:12px" data-action="saveFsznSettings">💾 Сохранить параметры</button>
      <div class="fszn-note">Мин. взнос за месяц = ставка × МЗП = <b>${money(minMonth)}</b>. Сверяй на portal.ssf.gov.by или в налоговой.</div>
    </div>

    <div class="h2">Напоминания по срокам</div>
    <button class="btn sm" style="margin-bottom:12px" data-action="openAddTax">+ Добавить срок</button>
    <div class="list">
      ${taxReminders.length ? taxReminders.map(t => {
        let days = null;
        let badge = "";
        if(t.date) {
          days = Math.ceil((new Date(t.date) - new Date()) / (1000*60*60*24));
          if(days < 0) badge = `<span class="badge bad">Просрочено</span>`;
          else if(days <= 14) badge = `<span class="badge warn">${days} дн.</span>`;
          else badge = `<span class="badge soon">${days} дн.</span>`;
        }
        return `<div class="item">
          <div class="ic">🗓️</div>
          <div class="meta">
            <div class="t">${esc(t.name)}</div>
            <div class="s">${t.date ? fmtDate(t.date) : "Без даты"} ${badge}</div>
          </div>
          <button class="edit" data-action="taxPaid" data-id="${t.id}">✅</button>
          <button class="del" data-action="taxDel" data-id="${t.id}">🗑</button>
        </div>`;
      }).join("") : '<div class="empty">Пока нет напоминаний</div>'}
    </div>
  `;
}

async function screenFines(){
  const fines = finesList().sort((a,b) => (a.paid ? 1 : 0) - (b.paid ? 1 : 0) || a.date.localeCompare(b.date));
  const unpaid = fines.filter(f => !f.paid);
  const totalUnpaid = unpaid.reduce((s,f) => s + Number(f.amount), 0);

  return `
    <div class="topbar">
      <button class="iconbtn" data-action="nav" data-to="dash">←</button>
      <span class="h1">Штрафы</span>
      <button class="iconbtn" data-action="openAddFine">+</button>
    </div>

    ${unpaid.length ? `
    <div class="alert bad">
      <span>Неоплачено: <b>${money(totalUnpaid)}</b> (${unpaid.length} шт.)</span>
    </div>` : '<div class="alert good"><span>Штрафов нет 🎉</span></div>'}

    <div class="list" style="margin-top:12px">
      ${fines.length ? fines.map(f => `
        <div class="item" style="${f.paid ? 'opacity:0.6' : ''}">
          <div class="ic">${f.paid ? '✅' : '🚨'}</div>
          <div class="meta">
            <div class="t">${esc(f.name)}</div>
            <div class="s">${fmtDate(f.date)}${f.paid ? ` · оплачен ${fmtDate(f.paidDate)}` : ''}</div>
          </div>
          <div class="amt">${money(f.amount)}</div>
          ${!f.paid ? `<button class="edit" data-action="finePaid" data-id="${f.id}">💳</button>` : ''}
          <button class="del" data-action="fineDel" data-id="${f.id}">🗑</button>
        </div>
      `).join("") : '<div class="empty">Список пуст</div>'}
    </div>
  `;
}

async function screenReceipts(){
  const allExps = await dbAll("expenses");
  const withReceipts = allExps.filter(e => e.receipt).sort((a,b) => b.date.localeCompare(a.date));
  
  // Фильтрация по периоду и категории
  const pr = periodRange(state.receiptMode, state.receiptOffset);
  let filtered = withReceipts;
  if(pr.from) filtered = filtered.filter(e => e.date >= pr.from && e.date <= pr.to);
  if(state.receiptCat !== "all") filtered = filtered.filter(e => e.category === state.receiptCat);

  return `
    <div class="topbar">
      <button class="iconbtn" data-action="nav" data-to="dash">←</button>
      <span class="h1">Чеки</span>
      <button class="iconbtn" data-action="exportReceiptsCsv">📊</button>
    </div>

    <div class="periodnav">
      <button class="pbtn" data-action="receiptPrev">‹</button>
      <span class="plabel">${pr.label}</span>
      <button class="pbtn" data-action="receiptNext">›</button>
    </div>

    <div class="rangebar" style="margin-bottom:16px">
      <button class="chip ${state.receiptCat==="all"?"on":""}" data-action="setReceiptCat" data-cat="all">Все</button>
      ${CAR_CATS.map(k => `<button class="chip ${state.receiptCat===k?"on":""}" data-action="setReceiptCat" data-cat="${k}">${CATS[k].ico} ${CATS[k].t}</button>`).join("")}
    </div>

    <div class="list">
      ${filtered.length ? filtered.map(e => {
        const c = CATS[e.category] || CATS.other;
        return `<div class="item">
          <img class="rthumb" src="${e.receipt}" data-action="viewReceipt" data-id="${e.id}" />
          <div class="meta">
            <div class="t">${esc(e.note || c.t)}</div>
            <div class="s">${fmtDate(e.date)} · ${money(e.amount)}</div>
          </div>
        </div>`;
      }).join("") : '<div class="empty">Чеков за этот период не найдено</div>'}
    </div>
  `;
}

async function screenSettings(){
  const exps = await dbAll("expenses");
  const tgName = localStorage.getItem("blvck_tg_name");
  const ipOn = isIP();
  const syncT = Number(localStorage.getItem("blvck_cloud_sync")) || 0;
  const syncTxt = syncT ? new Date(syncT).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "ещё не было";

  return `
    <div class="topbar">
      <button class="iconbtn" data-action="nav" data-to="dash">←</button>
      <span class="h1">Настройки</span>
    </div>

    <div class="glass card">
      <div class="row between">
        <span>Тема</span>
        <button class="btn sm" data-action="toggleTheme">${document.documentElement.dataset.theme==="dark" ? "🌙 Тёмная" : "☀️ Светлая"}</button>
      </div>
      <div class="divider"></div>
      <div class="row between">
        <span>Валюта</span>
        <div class="chips">
          ${CURS.map(c => `<button class="chip ${cur()===c?'on':''}" data-action="setCur" data-cur="${c}">${c}</button>`).join("")}
        </div>
      </div>
    </div>

    <div class="h2">Где живут данные</div>
    <div class="glass card">
      <p class="small muted">Все цифры — <b>только в этом телефоне</b>, без чужого облака. Отчёт улетает в чат ботом через сервер‑курьер (он не хранит твои данные, только пересылает PDF). Чеки снимай скриншотами как запасной путь.</p>
    </div>

    <div class="h2">Режим ИП</div>
    <div class="glass card">
      <div class="row between">
        <span>Я индивидуальный предприниматель</span>
        <div class="switch">
          <button class="chip ${!ipOn?'on':''}" data-action="setIP" data-v="0">Нет</button>
          <button class="chip ${ipOn?'on':''}" data-action="setIP" data-v="1">Да</button>
        </div>
      </div>
      ${ipOn ? `<button class="btn sm ghost" style="margin-top:12px" data-action="nav" data-to="fszn">🧾 Открыть раздел ИП</button>` : ""}
    </div>

    ${TG ? `
    <div class="h2">Telegram</div>
    <div class="glass card">
      <p class="small muted">Ты вошёл как <b>${esc(tgName || "—")}</b></p>
      <p class="small muted">Данные хранятся только в этом Telegram на этом устройстве. Чтобы бот слал файлы — нажми у него Start один раз.</p>
      <button class="btn sm danger" style="margin-top:12px" data-action="tgClose">✖️ Закрыть приложение</button>
    </div>` : ""}

    <div class="h2">Резервная копия</div>
    <div class="glass card">
      <p class="small muted">Копия цифр — файлом или копируемым текстом в «Избранное». Восстановить — из файла или из вставленного текста.</p>
      <div class="toolgrid" style="margin-top:12px">
        <button class="btn" data-action="export">💾 Сохранить копию</button>
        <button class="btn" data-action="import">⬆️ Из файла</button>
        <button class="btn span2" data-action="openImportText">⬆️ Из текста</button>
        <button class="btn span2" data-action="sendReportBot">📤 Отправить отчёт боту в чат</button>
        <button class="btn span2" data-action="syncCloud">☁️ Синхронизировать с облаком (${syncTxt})</button>
      </div>
    </div>

    <div class="h2" style="color:var(--text)">Опасная зона</div>
    <button class="btn danger" data-action="wipe">🧹 Удалить все данные</button>
    
    <div style="text-align:center; margin-top:32px; color:var(--faint); font-size:12px">
      BLVCK TAXI · офлайн · без своего облака · бесплатно<br>
      Записей расходов: ${exps.length}
    </div>
  `;
}

/* ---------- модалки ---------- */
function openModal(html){ 
  const m=$("#modal"); 
  m.innerHTML=`<div class="modal">${html}</div>`; 
  m.hidden=false; 
  try{TG?.BackButton?.show();}catch{} 
}
function closeModal(){ 
  $("#modal").hidden=true; 
  $("#modal").innerHTML=""; 
  state.modalEditId=null; 
  state.modalReceipt=null; 
  try{TG?.BackButton?.hide();}catch{} 
}
function modalFuelQuick(){ 
  const p=fuelPresets(); 
  openModal(`
    <div class="mhead"><h3>⛽ Быстрая заправка</h3><button class="x" data-action="close">×</button></div>
    <p class="small muted">Один тап — расход записан на сегодня, без ввода цифр</p>
    <div class="presets">
      ${p.map(v=>`<button class="preset" data-action="fuelPreset" data-amt="${v}">${v}<span class="cur">${cur()}</span></button>`).join("")}
    </div>
    <button class="btn ghost" style="margin-top:12px" data-action="openFuelPresets">⚙️ Настроить суммы</button>
  `); 
}
function modalFuelPresets(){ 
  const p=fuelPresets(); 
  openModal(`
    <div class="mhead"><h3>⚙️ Суммы быстрой заправки</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Сумма 1</label><input class="input" id="fp0" type="number" value="${p[0]}" /></div>
    <div class="field"><label>Сумма 2</label><input class="input" id="fp1" type="number" value="${p[1]}" /></div>
    <div class="field"><label>Сумма 3</label><input class="input" id="fp2" type="number" value="${p[2]}" /></div>
    <button class="btn primary" style="margin-top:12px" data-action="saveFuelPresets">Сохранить</button>
  `); 
}
function openDrive(){ 
  const p=fuelPresets(); 
  const m=$("#modal"); 
  m.innerHTML=`
    <div class="drive">
      <div class="dhead"><span class="dtitle">🚦 За рулём</span><button class="x" data-action="close">×</button></div>
      <div class="dpresets">
        <button class="dbig" data-action="driveCat" data-cat="fuel">⛽ <span class="cur">${cur()}</span></button>
        <div class="drow">
          ${CAR_CATS.filter(c=>c!=="fuel").map(c=>`<button class="dcat" data-action="driveCat" data-cat="${c}">${CATS[c].ico}<br>${CATS[c].t}</button>`).join("")}
        </div>
      </div>
      <button class="btn danger" data-action="close">✖ Выйти из режима</button>
    </div>
  `; 
  m.hidden=false; 
  try{TG?.BackButton?.show();}catch{} 
}
function modalExpense(cat,edit=null){
  const ecat = edit ? edit.category : cat;
  state.modalCat=ecat; state.modalEditId=edit?edit.id:null; state.modalReceipt=edit?.receipt||null;
  const v=edit||{};
  const isWear = WEAR_CATS.includes(ecat);
  const noteLabel = (ecat==="repair"||ecat==="parts") ? "Деталь / работа" : "Заметка";
  const mileLabel = (ecat==="repair"||ecat==="parts") ? "Пробег установки, км" : "Пробег, км";
  const noteHint = (ecat==="repair"||ecat==="parts") ? "название детали — по нему считается износ" : "например: АЗС Лукойл";
  const mileField = isWear ? `
    <div class="field">
      <label>${mileLabel}</label>
      <input class="input" id="m_mileage" type="number" value="${v.mileage||""}" placeholder="Необязательно" />
    </div>
  ` : "";
  openModal(`
    <div class="mhead"><h3>${edit?"✏️ Изменить":CATS[ecat].ico+" "+CATS[ecat].t}</h3><button class="x" data-action="close">×</button></div>
    <div class="field">
      <label>Сумма</label>
      <input class="input" id="m_amount" type="number" step="0.01" value="${v.amount||""}" required />
    </div>
    <div class="field">
      <label>Дата</label>
      <input class="input" id="m_date" type="date" value="${v.date||today()}" />
    </div>
    ${mileField}
    <div class="field">
      <label>${noteLabel}</label>
      <input class="input" id="m_note" type="text" value="${esc(v.note||"")}" placeholder="${noteHint}" />
    </div>
    <div class="field">
      <label>Чек / скриншот</label>
      <div id="m_receipt_box">${receiptBoxHTML()}</div>
    </div>
    <button class="btn primary" style="margin-top:12px" data-action="saveExpense">${edit?"Сохранить изменения":"Сохранить"}</button>
  `);
  setTimeout(()=>$("#m_amount")?.focus(),60);
}
function receiptBoxHTML(){
  if(state.modalReceipt){
    return `<div class="rcpt">
      <img src="${state.modalReceipt}" data-action="viewReceiptCurrent" />
      <div class="rcpt-actions">
        <button class="btn sm" data-action="clearReceipt">Удалить фото</button>
      </div>
    </div>`;
  }
  return `<button class="btn ghost" data-action="pickReceipt">📸 Сделать снимок или выбрать</button>`;
}
async function addReceiptFromPicker(){
  try{
    const handle = await window.showOpenFilePicker({ types: [{ description: 'Images', accept: {'image/*': ['.jpg','.jpeg','.png']} }] });
    const file = await handle[0].getFile();
    state.modalReceipt = await blobToDataUrl(file);
    const b=$("#m_receipt_box"); if(b) b.innerHTML=receiptBoxHTML();
    hapticOk();
  }catch(e){
    // Fallback to input type file if showOpenFilePicker is not supported
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (ev) => {
      const f = ev.target.files[0];
      if(f){
        state.modalReceipt = await blobToDataUrl(f);
        const b=$("#m_receipt_box"); if(b) b.innerHTML=receiptBoxHTML();
        hapticOk();
      }
    };
    input.click();
  }
}
function blobToDataUrl(blob){
  return new Promise((res,rej)=>{
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}
function openReceiptViewer(url){
  const v = document.createElement("div");
  v.className = "viewer";
  v.innerHTML = `<button class="vclose" data-action="shotClose">×</button><img src="${url}" />`;
  v.onclick = (e) => { if(e.target===v) v.remove(); };
  document.body.appendChild(v);
}

async function modalDailyRev(){
  const todayStr = today();
  const rev = dailyRevOf(todayStr);
  const target = dailyTarget();
  openModal(`
    <div class="mhead"><h3>💵 Выручка за день</h3><button class="x" data-action="close">×</button></div>
    <div class="field">
      <label>Дата</label>
      <input class="input" id="d_date" type="date" value="${todayStr}" />
    </div>
    <div class="field">
      <label>Сумма выручки</label>
      <input class="input" id="d_rev" type="number" step="0.01" value="${rev||""}" placeholder="0" />
    </div>
    <div class="field">
      <label>Цель на день</label>
      <input class="input" id="d_target" type="number" step="0.01" value="${target||""}" placeholder="0" />
    </div>
    <button class="btn primary" style="margin-top:12px" data-action="saveDailyRev">Сохранить</button>
  `);
}
function highlightRevCol(date){
  // Visual feedback handled by input change
}
function modalMaint(){ 
  openModal(`
    <div class="mhead"><h3>🔧 Событие ТО</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Что сделали</label><input class="input" id="m_title" type="text" placeholder="Например: Замена масла" /></div>
    <div class="field"><label>Дата</label><input class="input" id="m_date" type="date" value="${today()}" /></div>
    <div class="field"><label>Пробег, км</label><input class="input" id="m_mileage" type="number" placeholder="Необязательно" /></div>
    <div class="field"><label>Заметка</label><input class="input" id="m_note" type="text" /></div>
    <button class="btn primary" style="margin-top:12px" data-action="saveMaint">Сохранить</button>
  `); 
}
function modalDoc(){ 
  openModal(`
    <div class="mhead"><h3>📄 Документ</h3><button class="x" data-action="close">×</button></div>
    <div class="field">
      <label>Быстрые названия</label>
      <div class="chips">${DOC_PRESETS.map(t=>`<button class="chip" data-action="docPreset" data-name="${esc(t)}">${esc(t)}</button>`).join("")}</div>
    </div>
    <div class="field"><label>Название</label><input class="input" id="m_name" type="text" /></div>
    <div class="grid2">
      <div class="field"><label>Выдан</label><input class="input" id="m_issue" type="date" /></div>
      <div class="field"><label>Действует до</label><input class="input" id="m_expiry" type="date" /></div>
    </div>
    <div class="field"><label>Заметка</label><input class="input" id="m_note" type="text" /></div>
    <button class="btn primary" style="margin-top:12px" data-action="saveDoc">Сохранить</button>
  `); 
}
async function modalCar(){ 
  const car=await dbGet("car",1)||{}; 
  openModal(`
    <div class="mhead"><h3>🚗 Автомобиль</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Модель</label><input class="input" id="m_model" type="text" value="${esc(car.model||"")}" /></div>
    <div class="field"><label>Номер</label><input class="input" id="m_plate" type="text" value="${esc(car.plate||"")}" /></div>
    <div class="grid2">
      <div class="field"><label>Расход л/100</label><input class="input" id="m_fuel" type="number" step="0.1" value="${car.fuelPer100||""}" /></div>
      <div class="field"><label>Текущий пробег</label><input class="input" id="m_km" type="number" value="${car.currentMileage||0}" /></div>
    </div>
    <div class="grid2">
      <div class="field"><label>Масло на км</label><input class="input" id="m_oilkm" type="number" value="${car.lastOilMileage||0}" /></div>
      <div class="field"><label>Интервал замены масла, км</label><input class="input" id="m_oilint" type="number" value="${car.oilInterval||10000}" /></div>
    </div>
    <button class="btn primary" style="margin-top:12px" data-action="saveCar">Сохранить</button>
  `); 
}
function modalTaxReminder(){ 
  openModal(`
    <div class="mhead"><h3>🗓 Напоминание по сроку</h3><button class="x" data-action="close">×</button></div>
    <div class="field">
      <label>Быстрые названия</label>
      <div class="chips">${TAX_PRESETS.map(t=>`<button class="chip" data-action="taxPreset" data-name="${esc(t)}">${esc(t)}</button>`).join("")}</div>
    </div>
    <div class="field"><label>Название</label><input class="input" id="t_name" type="text" /></div>
    <div class="field"><label>Срок</label><input class="input" id="t_date" type="date" /></div>
    <div class="field">
      <label>Повтор</label>
      <select class="input" id="t_repeat">
        <option value="none">Без повтора</option>
        <option value="month">Каждый месяц</option>
        <option value="quarter">Каждый квартал</option>
        <option value="year">Каждый год</option>
      </select>
    </div>
    <button class="btn primary" style="margin-top:12px" data-action="saveTax">Сохранить</button>
  `); 
}
function modalFine(){ 
  openModal(`
    <div class="mhead"><h3>🚨 Штраф</h3><button class="x" data-action="close">×</button></div>
    <div class="field">
      <label>Быстрые названия</label>
      <div class="chips">${FINE_PRESETS.map(t=>`<button class="chip" data-action="finePreset" data-name="${esc(t)}">${esc(t)}</button>`).join("")}</div>
    </div>
    <div class="field"><label>За что</label><input class="input" id="f_name" type="text" /></div>
    <div class="field"><label>Сумма</label><input class="input" id="f_amount" type="number" step="0.01" /></div>
    <div class="field"><label>Дата выписки</label><input class="input" id="f_date" type="date" value="${today()}" /></div>
    <button class="btn primary" style="margin-top:12px" data-action="saveFine">Сохранить как неоплаченный</button>
  `); 
  setTimeout(()=>$("#f_name")?.focus(),60); 
}
function modalBackupText(txt){ 
  openModal(`
    <div class="mhead"><h3>💾 Копия текстом</h3><button class="x" data-action="close">×</button></div>
    <p class="small muted">Telegram не дал сохранить файл. Скопируй текст ниже и вставь себе в «Избранное» в Telegram — это твоя копия цифр (без картинок чеков; чеки снимай скриншотами отдельно).</p>
    <textarea class="input" id="bk_text" rows="10" readonly style="font-size:11px; margin-top:12px">${esc(txt)}</textarea>
    <button class="btn primary" style="margin-top:12px" data-action="copyBkText">📋 Скопировать текст копии</button>
    <p class="small muted" style="margin-top:12px">Чтобы восстановить — «⬆️ Восстановить из текста» и вставь этот же текст обратно.</p>
  `); 
}
function modalImportText(){ 
  openModal(`
    <div class="mhead"><h3>⬆️ Восстановить из текста</h3><button class="x" data-action="close">×</button></div>
    <p class="small muted">Вставь сюда текст копии (тот, что копировал в «Избранное»). Внимание: текущие данные заменятся.</p>
    <textarea class="input" id="imp_text" rows="10" style="margin-top:12px" placeholder="Вставь текст сюда..."></textarea>
    <button class="btn primary" style="margin-top:12px" data-action="doImportText">⬆️ Восстановить</button>
  `); 
}

/* ---------- действия ---------- */
async function fuelPreset(amt){ 
  await dbPut("expenses",{id:uid(),category:"fuel",amount:amt,date:today(),mileage:null,note:"быстрая заправка"}); 
  closeModal(); 
  toast(`Заправка ${money(amt)}`); 
  hapticOk(); 
  renderAsync(); 
}
function saveFuelPresets(){ 
  const a=[0,1,2].map(i=>parseFloat($("#fp"+i).value)||0); 
  if(a.some(v=>v<=0)){toast("Все суммы должны быть > 0");hapticBad();return;} 
  setFuelPresets(a); 
  closeModal(); 
  toast("Суммы сохранены"); 
  hapticOk(); 
}
function saveDailyRev(){
  const dateEl=$("#d_date"); const revEl=$("#d_rev"); const targetEl=$("#d_target");
  const date=(dateEl&&dateEl.value)?dateEl.value:today();
  const rev=revEl?parseFloat(revEl.value)||0:0;
  const target=targetEl?parseFloat(targetEl.value)||0:0;
  setDailyRev(date,rev);
  setDailyTarget(target);
  closeModal();
  toast(rev>0?`Выручка ${money(rev)} · ${date===today()?"сегодня":fmtDate(date)}`:`Выручка за ${fmtDate(date)} очищена`);
  hapticOk(); renderAsync();
}
async function saveExpense(){ 
  const amount=parseFloat($("#m_amount").value); 
  if(!amount||amount<=0){toast("Введи сумму");hapticBad();return;}
  const mileEl=$("#m_mileage"); const mileage = mileEl ? (parseFloat(mileEl.value)||0) : 0;
  const e={id:state.modalEditId||uid(),category:state.modalCat,amount,date:$("#m_date").value||today(),mileage:mileage>0?mileage:null,note:$("#m_note").value.trim(),receipt:state.modalReceipt||null};
  await dbPut("expenses",e);
  if(e.mileage){ const car=await dbGet("car",1)||{id:1}; if(!car.currentMileage||e.mileage>car.currentMileage){car.currentMileage=e.mileage;await dbPut("car",car);} }
  closeModal(); toast(state.modalEditId?"Изменено":"Расход добавлен"); hapticOk(); renderAsync(); 
}
async function editExpense(id){ const r=await dbGet("expenses",id); if(r) modalExpense(r.category,r); }
async function saveMaint(){ 
  const title=$("#m_title").value.trim(); 
  if(!title){toast("Введи описание");hapticBad();return;} 
  const mileage=parseFloat($("#m_mileage").value); 
  await dbPut("maintenance",{id:uid(),title,date:$("#m_date").value||today(),mileage:mileage>0?mileage:null,note:$("#m_note").value.trim()}); 
  closeModal(); toast("Событие ТО добавлено"); hapticOk(); renderAsync(); 
}
async function saveDoc(){ 
  const name=$("#m_name").value.trim(); 
  if(!name){toast("Введи название");hapticBad();return;} 
  await dbPut("documents",{id:uid(),name,issueDate:$("#m_issue").value||null,expiryDate:$("#m_expiry").value||null,note:$("#m_note").value.trim()}); 
  closeModal(); toast("Документ добавлен"); hapticOk(); renderAsync(); 
}
async function saveCar(){ 
  await dbPut("car",{id:1,model:$("#m_model").value.trim(),plate:$("#m_plate").value.trim(),fuelPer100:parseFloat($("#m_fuel").value)||null,currentMileage:parseFloat($("#m_km").value)||0,lastOilMileage:parseFloat($("#m_oilkm").value)||0,oilInterval:parseFloat($("#m_oilint").value)||10000}); 
  closeModal(); toast("Авто сохранено"); hapticOk(); renderAsync(); 
}
function saveFsznSettings(){ 
  const m=parseFloat($("#fszn_mzp").value)||0,r=parseFloat($("#fszn_rate").value)||0; 
  if(m<=0||r<=0){toast("МЗП и ставка должны быть > 0");hapticBad();return;} 
  localStorage.setItem("blvck_fszn_mzp",String(m)); 
  localStorage.setItem("blvck_fszn_rate",String(r)); 
  toast("Параметры сохранены"); hapticOk(); renderAsync(); 
}
async function saveFsznField(q,field,value){ 
  const id=`${YEAR()}-Q${q}`; 
  const rec=await dbGet("fszn",id)||{id,year:YEAR(),quarter:q,income:0,paid:0}; 
  rec[field]=value; 
  await dbPut("fszn",rec); 
}
function saveIncome(){ const v=parseFloat($("#income_month").value)||0; setIncome(ymNow(),v); toast("Доход сохранён"); hapticOk(); renderAsync(); }
function saveEff(){ setKm(ymNow(),parseFloat($("#eff_km").value)||0); setHours(ymNow(),parseFloat($("#eff_hours").value)||0); toast("Пробег и часы сохранены"); hapticOk(); renderAsync(); }
function saveTax(){ 
  const name=$("#t_name").value.trim(); 
  if(!name){toast("Введи название");hapticBad();return;} 
  const l=taxList(); 
  l.push({id:uid(),name,date:$("#t_date").value||null,repeat:$("#t_repeat").value}); 
  saveTaxList(l); 
  closeModal(); toast("Напоминание добавлено"); hapticOk(); renderAsync(); 
}
function taxPaid(id){ 
  const l=taxList(); 
  const r=l.find(x=>x.id===id); 
  if(!r) return; 
  if(r.repeat&&r.repeat!=="none"&&r.date){ 
    const d=new Date(r.date+"T00:00:00"); 
    if(r.repeat==="month")d.setMonth(d.getMonth()+1); 
    if(r.repeat==="quarter")d.setMonth(d.getMonth()+3); 
    if(r.repeat==="year")d.setFullYear(d.getFullYear()+1); 
    r.date=d.toISOString().slice(0,10); 
    saveTaxList(l); 
    toast(`Отмечено · след. срок ${fmtDate(r.date)}`); 
  } else { 
    saveTaxList(l.filter(x=>x.id!==id)); 
    toast("Удалено"); 
  } 
  hapticOk(); renderAsync(); 
}
function taxDel(id){ saveTaxList(taxList().filter(x=>x.id!==id)); toast("Удалено"); haptic(); renderAsync(); }
function saveFine(){ 
  const name=$("#f_name").value.trim(); 
  if(!name){toast("Введи «за что»");hapticBad();return;} 
  const amount=parseFloat($("#f_amount").value)||0; 
  if(amount<=0){toast("Введи сумму");hapticBad();return;} 
  const l=finesList(); 
  l.push({id:uid(),name,amount,date:$("#f_date").value||today(),paid:false,paidDate:null,expenseId:null}); 
  saveFinesList(l); 
  closeModal(); toast("Штраф добавлен — висит долгом"); hapticOk(); renderAsync(); 
}
async function finePaid(id){ 
  const l=finesList(); 
  const r=l.find(x=>x.id===id); 
  if(!r||r.paid) return; 
  r.paid=true; r.paidDate=today(); 
  const exp={id:uid(),category:"other",amount:r.amount,date:today(),mileage:null,note:"Штраф: "+r.name,receipt:null}; 
  await dbPut("expenses",exp); 
  r.expenseId=exp.id; 
  saveFinesList(l); 
  toast("Оплачено → ушло в расходы"); hapticOk(); renderAsync(); 
}
async function fineDel(id){ 
  if(!confirm("Удалить штраф?")) return; 
  const l=finesList(); 
  const r=l.find(x=>x.id===id); 
  if(r&&r.paid&&r.expenseId) await dbDel("expenses",r.expenseId); 
  saveFinesList(l.filter(x=>x.id!==id)); 
  toast("Удалено"); haptic(); renderAsync(); 
}

/* ---------- CSV ---------- */
function csvCell(v){ v=String(v??""); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }

/* ---------- сбор payload + облако + отправка боту ---------- */
async function buildPayload(){
  const exps=await dbAll("expenses"); const car=await dbGet("car",1)||{}; const fines=finesList();
  const s=fsznSettings(); const y=YEAR(); let paid=0; for(let q=1;q<=4;q++){const r=await dbGet("fszn",`${y}-Q${q}`);paid+=Number(r?.paid)||0;}
  const curMile=Number(car.currentMileage)||0;
  const recs=exps.filter(e=>(e.category==="repair"||e.category==="parts")&&Number(e.mileage)>0);
  const groups={}; recs.forEach(e=>{const b=(e.note||"").trim();const k=b?(e.category+"|"+b.toLowerCase()):("id|"+e.id);(groups[k]=groups[k]||[]).push(e);});
  const wear=[]; Object.values(groups).forEach(arr=>{arr.sort((a,b)=>Number(a.mileage)-Number(b.mileage));arr.forEach((e,i)=>{const nx=arr[i+1];const ins=Number(e.mileage);let sp=null,act=!nx;if(nx){sp=Math.max(0,Number(nx.mileage)-ins);}else if(curMile>ins){sp=curMile-ins;}wear.push({t:e.note||CATS[e.category]?.t||"",ins,sp,act});});});
  const rev=dailyRevMap(); const revArr=Object.keys(rev).filter(d=>Number(rev[d])>0).sort().map(d=>({date:d,v:Number(rev[d])}));
  return {
    cur:cur(), car:{model:car.model||"",plate:car.plate||"",mileage:curMile},
    expenses: exps.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>({date:e.date,category:e.category,t:CATS[e.category]?.t||e.category,note:e.note||"",amount:Number(e.amount||0),mileage:e.mileage||null,receipt:e.receipt||null})),
    rev: revArr,
    fines: fines.map(f=>({name:f.name,amount:Number(f.amount||0),paid:!!f.paid,date:f.date||null})),
    wear,
    fszn:{ paid, goal:s.rate/100*s.mzp*12, rate:s.rate, mzp:s.mzp },
    ip: isIP()
  };
}
async function syncToCloud(silent){
  if(!isTelegram || !TG?.initData) return false;
  try{
    const payload=await buildPayload();
    const res=await fetch(RENDER_URL+"/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({initData:TG.initData, payload})});
    if(res.ok){ localStorage.setItem("blvck_cloud_sync", String(Date.now())); if(!silent){ toast("Синхронизировано с облаком ☁️"); hapticOk(); } return true; }
    if(!silent) toast("Не удалось синхронизировать ("+res.status+")");
    return false;
  }catch(e){ if(!silent) toast("Нет связи с облаком"); return false; }
}
async function sendReportToBot(){
  if(!isTelegram){ toast("Отправка в чат работает только из Telegram"); return; }
  if(!TG?.initData){ toast("Не вижу Telegram — открой через бота"); return; }
  toast("Собираю отчёт…"); haptic("light");
  const payload=await buildPayload();
  try{
    const res=await fetch(RENDER_URL+"/send-report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({initData:TG.initData, payload})});
    if(!res.ok){ toast("Ошибка "+res.status+(res.status===502?" — нажми Start у бота":"")); hapticBad(); return; }
    localStorage.setItem("blvck_cloud_sync", String(Date.now()));
    toast("Отправлено в чат с ботом ✅"); hapticOk();
  }catch(e){ toast("Не достучался до сервера (первый запуск ~30 сек)"); hapticBad(); }
}

/* ---------- бэкап + ремень безопасности ---------- */
const LS_KEYS=["blvck_cur","blvck_theme","blvck_is_ip","blvck_income","blvck_km","blvck_hours","blvck_fuel_presets","blvck_tax_reminders","blvck_fszn_mzp","blvck_fszn_rate","blvck_streak_best","blvck_fines","blvck_daily_rev","blvck_daily_target","blvck_tg_name","blvck_onboarded","blvck_last_backup","blvck_backup_ack","blvck_cloud_sync"];
async function buildBackupPayloadLocal(){ const data={_app:"BLVCK TAXI",_v:3,_at:new Date().toISOString()}; for(const s of STORES) data[s]=await dbAll(s); data._ls=Object.fromEntries(LS_KEYS.map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!=null)); return data; }
async function exportBackup(){
  const data=await buildBackupPayloadLocal();
  const r=await tryFile(`blvck-taxi-backup-${today()}.json`, JSON.stringify(data,null,2), "application/json");
  if(r.ok){ localStorage.setItem("blvck_last_backup", String(Date.now())); toast("Копия сохранена"); hapticOk(); return; }
  if(r.aborted){ return; }
  const lite={...data}; lite.expenses=(lite.expenses||[]).map(e=>{ const c={...e}; delete c.receipt; return c; });
  const txt=JSON.stringify(lite);
  const ok=await copyText(txt);
  localStorage.setItem("blvck_last_backup", String(Date.now()));
  modalBackupText(txt);
  if(ok){ toast("Скопировано — вставь в Избранное"); hapticOk(); } else { toast("Выдели текст вручную и скопируй"); }
}
async function copyBkText(){ const ta=$("#bk_text"); if(!ta) return; const ok=await copyText(ta.value); if(ok){ toast("Скопировано — вставь в Избранное"); hapticOk(); } else { toast("Выдели текст вручную"); } }
function openImportText(){ modalImportText(); }
async function doImportText(){ const ta=$("#imp_text"); if(!ta) return; const txt=ta.value.trim(); if(!txt){ toast("Вставь текст копии"); return; }
  try{ const data=JSON.parse(txt); if(!confirm("Заменить ВСЕ текущие данные данными из текста?")) return;
    for(const s of STORES){ await dbClear(s); for(const v of (data[s]||[])) await dbPut(s,v); }
    if(data._ls&&typeof data._ls==="object"){ for(const k of LS_KEYS){ if(data._ls[k]!=null) localStorage.setItem(k,data._ls[k]); else localStorage.removeItem(k); } }
    applyTheme(); closeModal(); toast("Данные восстановлены из текста"); hapticOk(); renderAsync();
  }catch(e){ toast("Не читается как копия — проверь текст"); hapticBad(); } }
function dismissBackup(){ localStorage.setItem("blvck_backup_ack", String(Date.now())); toast("Отметил · напомню через 2 недели"); hapticOk(); renderAsync(); }
function importBackup(){ $("#restoreInput").click(); }
async function handleRestoreFile(file){ if(!file) return; try{ const data=JSON.parse(await file.text()); if(!confirm("Заменить ВСЕ текущие данные данными из файла?")) return; for(const s of STORES){ await dbClear(s); for(const v of (data[s]||[])) await dbPut(s,v); } if(data._ls&&typeof data._ls==="object"){ for(const k of LS_KEYS){ if(data._ls[k]!=null) localStorage.setItem(k,data._ls[k]); else localStorage.removeItem(k); } } applyTheme(); toast("Данные восстановлены полностью"); hapticOk(); renderAsync(); }catch(e){ toast("Ошибка файла"); hapticBad(); } }
async function wipe(){ if(!confirm("Удалить ВСЕ данные приложения? Это необратимо.")) return; for(const s of STORES) await dbClear(s); LS_KEYS.filter(k=>k!=="blvck_theme"&&k!=="blvck_cur"&&k!=="blvck_onboarded").forEach(k=>localStorage.removeItem(k)); toast("Всё удалено"); hapticOk(); renderAsync(); }

/* ---------- тема / валюта / ИП ---------- */
function applyTheme(){ const t=localStorage.getItem("blvck_theme")||"dark"; document.documentElement.dataset.theme=t; const m=document.querySelector('meta[name="theme-color"]'); if(m) m.content=t==="dark"?"#0a0a0a":"#f3f2ee"; syncTgColors(); }
function toggleTheme(){ const t=document.documentElement.dataset.theme==="dark"?"light":"dark"; localStorage.setItem("blvck_theme",t); applyTheme(); haptic(); renderAsync(); }
function setCur(c){ localStorage.setItem("blvck_cur",c); haptic(); renderAsync(); }
function setIP(v){ localStorage.setItem("blvck_is_ip",v); haptic(); renderAsync(); }
function makeParticles(){ const box=$(".bg-particles"); if(!box) return; for(let i=0;i<14;i++){ const s=document.createElement("span"); s.style.left=Math.random()*100+"%"; s.style.animationDuration=(14+Math.random()*18)+"s"; s.style.animationDelay=(-Math.random()*22)+"s"; s.style.transform=`scale(${.5+Math.random()*1.2})`; box.appendChild(s); } }

/* ---------- поиск расходов ---------- */
let searchT=null;
document.addEventListener("input",(ev)=>{ const el=ev.target; if(el&&el.id==="exp_search"){ clearTimeout(searchT); searchT=setTimeout(()=>{ state.expQ=el.value; renderAsync(); },160); } });

/* ---------- события ---------- */
document.addEventListener("click", async (ev)=>{
  const el=ev.target.closest("[data-action]"); if(!el) return; const a=el.dataset.action; haptic("light");
  switch(a){
    case "nav": state.screen=el.dataset.to; state._animateScreen=true; renderAsync(); break;
    case "onboardDone": localStorage.setItem("blvck_onboarded","1"); state._animateScreen=true; renderAsync(); break;
    case "quick": modalExpense(el.dataset.cat); break;
    case "openFuelQuick": modalFuelQuick(); break;
    case "fuelPreset": fuelPreset(parseFloat(el.dataset.amt)); break;
    case "openFuelPresets": modalFuelPresets(); break;
    case "saveFuelPresets": saveFuelPresets(); break;
    case "openDrive": openDrive(); break;
    case "driveCat": closeModal(); modalExpense(el.dataset.cat); break;
    case "openDailyRev": await modalDailyRev(); break;
    case "pickDay": { const i=$("#d_date"); if(i){ i.value=el.dataset.date; const rv=dailyRevOf(i.value); const ri=$("#d_rev"); if(ri) ri.value=rv||""; highlightRevCol(i.value); ri?.focus(); } } break;
    case "saveDailyRev": saveDailyRev(); break;
    case "openExpenses": state.screen="expenses"; state._animateScreen=true; renderAsync(); break;
    case "setExpRange": state.expRange=el.dataset.range; renderAsync(); break;
    case "setExpScale": state.expScale=el.dataset.scale; renderAsync(); break;
    case "setExpCat": state.expCat=el.dataset.cat; renderAsync(); break;
    case "sendReportBot": sendReportToBot(); break;
    case "syncCloud": syncToCloud(false).then(ok=>{ if(ok) renderAsync(); }); break;
    case "openFines": state.screen="fines"; state._animateScreen=true; renderAsync(); break;
    case "openAddFine": modalFine(); break;
    case "finePreset": { const i=$("#f_name"); if(i&&!i.value) i.value=el.dataset.name; } break;
    case "saveFine": saveFine(); break;
    case "finePaid": await finePaid(el.dataset.id); break;
    case "fineDel": await fineDel(el.dataset.id); break;
    case "openReceipts": state.screen="receipts"; state._animateScreen=true; renderAsync(); break;
    case "setReceiptMode": state.receiptMode=el.dataset.mode; state.receiptOffset=0; renderAsync(); break;
    case "receiptPrev": state.receiptOffset--; renderAsync(); break;
    case "receiptNext": state.receiptOffset++; renderAsync(); break;
    case "setReceiptCat": state.receiptCat=el.dataset.cat; renderAsync(); break;
    case "editExpense": await editExpense(el.dataset.id); break;
    case "pickReceipt": await addReceiptFromPicker(); break;
    case "clearReceipt": state.modalReceipt=null; { const b=$("#m_receipt_box"); if(b) b.innerHTML=receiptBoxHTML(); } haptic(); break;
    case "viewReceiptCurrent": if(state.modalReceipt) openReceiptViewer(state.modalReceipt); break;
    case "viewReceipt": { const r=await dbGet("expenses",el.dataset.id); if(r?.receipt) openReceiptViewer(r.receipt); } break;
    case "openEditCar": modalCar(); break;
    case "openAddMaint": modalMaint(); break;
    case "openAddDoc": modalDoc(); break;
    case "docPreset": { const i=$("#m_name"); if(i&&!i.value) i.value=el.dataset.name; } break;
    case "openFszn": state.screen="fszn"; state._animateScreen=true; renderAsync(); break;
    case "openAddTax": modalTaxReminder(); break;
    case "taxPreset": { const i=$("#t_name"); if(i&&!i.value) i.value=el.dataset.name; } break;
    case "saveExpense": await saveExpense(); break;
    case "saveMaint": await saveMaint(); break;
    case "saveDoc": await saveDoc(); break;
    case "saveCar": await saveCar(); break;
    case "saveFsznSettings": saveFsznSettings(); break;
    case "saveTax": saveTax(); break;
    case "taxPaid": taxPaid(el.dataset.id); break;
    case "taxDel": taxDel(el.dataset.id); break;
    case "setIncome": saveIncome(); break;
    case "setEff": saveEff(); break;
    case "copyBkText": copyBkText(); break;
    case "openImportText": openImportText(); break;
    case "doImportText": doImportText(); break;
    case "dismissBackup": dismissBackup(); break;
    case "delExpense": if(confirm("Удалить запись?")){ await dbDel("expenses",el.dataset.id); renderAsync(); } break;
    case "delMaint": if(confirm("Удалить событие?")){ await dbDel("maintenance",el.dataset.id); renderAsync(); } break;
    case "delDoc": if(confirm("Удалить документ?")){ await dbDel("documents",el.dataset.id); renderAsync(); } break;
    case "setRange": state.range=el.dataset.range; renderAsync(); break;
    case "toggleTheme": toggleTheme(); break;
    case "setCur": setCur(el.dataset.cur); break;
    case "setIP": setIP(el.dataset.v); break;
    case "export": exportBackup(); break;
    case "import": importBackup(); break;
    case "wipe": wipe(); break;
    case "tgClose": try{TG?.close();}catch{} break;
    case "close": closeModal(); break;
  }
});
document.addEventListener("change", async (ev)=>{ const el=ev.target; if(el&&el.id==="d_date"){ const r=dailyRevOf(el.value); const ri=$("#d_rev"); if(ri) ri.value=r||""; highlightRevCol(el.value); return; } const f=ev.target.closest("[data-fszn]"); if(!f) return; await saveFsznField(f.dataset.q,f.dataset.fszn,parseFloat(f.value)||0); hapticOk(); renderAsync(); });
$("#modal").addEventListener("click", e=>{ if(e.target.id==="modal") closeModal(); });
$("#restoreInput").addEventListener("change", e=>handleRestoreFile(e.target.files[0]));

/* ---------- старт ---------- */
window.BLVCK_HOOKS = window.BLVCK_HOOKS || [];
window.BLVCK_ALERT_HOOKS = window.BLVCK_ALERT_HOOKS || [];
window.BLVCK_PRO = window.BLVCK_PRO || { unlocked: ()=>true, openScreen: ()=>{} };
(async function init(){ applyTheme(); makeParticles(); setupTelegram(); await openDB(); state._animateScreen=true; await renderAsync();
  const act=new URLSearchParams(location.search).get("act"); if(act){ history.replaceState(null,"",location.pathname+location.hash); if(act==="fuel") modalFuelQuick(); else if(CATS[act]) modalExpense(act); }
  if("serviceWorker" in navigator){ window.addEventListener("load", ()=>navigator.serviceWorker.register("./sw.js").catch(()=>{})); }
  if(isTelegram){ syncToCloud(true);
    let lastSync=0;
    document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="hidden"){ const now=Date.now(); if(now-lastSync>5*60000){ lastSync=now; syncToCloud(true); } } });
  }
})();