/* =========================================================
   BLVCK TAXI — весь комбайн, vanilla, без зависимостей
   Данные: IndexedDB (локально). Офлайн. Без сервера. Бесплатно.
   + Telegram Mini App (тонкий слой, сервер НЕ нужен)
   + раздел ФСЗН для ИП (прикидка-трекер, НЕ официальный расчёт)
   ========================================================= */

/* ===== TELEGRAM MINI APP ===== */
const TG = window.Telegram?.WebApp;
const haptic    = (t="light") => { try{ TG?.HapticFeedback?.impactOccurred(t); }catch{} };
const hapticOk  = () => { try{ TG?.HapticFeedback?.notificationOccurred?.("success"); }catch{} };
const hapticBad = () => { try{ TG?.HapticFeedback?.notificationOccurred?.("error"); }catch{} };
function setupTelegram(){
  if(!TG) return;
  try{
    TG.ready();
    TG.expand();
    syncTgColors();
    const u = TG.initDataUnsafe?.user;
    if(u?.first_name) localStorage.setItem("blvck_tg_name", u.first_name);
    TG.BackButton.onClick(()=> closeModal());
  }catch(e){ console.warn("TG init", e); }
}
function syncTgColors(){
  if(!TG) return;
  const c = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#0a0a0f";
  try{ TG.setBackgroundColor(c); TG.setHeaderColor(c); }catch{}
}

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
  range: "month",
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
const YEAR = () => new Date().getFullYear();
const CUR_Q = () => Math.ceil((new Date().getMonth()+1)/3);
const isIP = () => localStorage.getItem("blvck_is_ip") === "1";

function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(()=> t.hidden = true, 1800);
}

/* ---------- IndexedDB ---------- */
const DB_NAME = "blvcktaxi", DB_VER = 2;   // v2: добавлен store fszn (старые данные сохраняются)
const STORES = ["expenses","maintenance","documents","car","fszn"];
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
      if(!d.objectStoreNames.contains("fszn"))           // мягкий апгрейд для существующих пользователей
        d.createObjectStore("fszn",{keyPath:"id"});
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
async function renderAsync(){
  const app = $("#app");
  app.style.animation = "none"; void app.offsetWidth; app.style.animation = "";
  const html = await ({
    dash: screenDash, stats: screenStats, car: screenCar,
    docs: screenDocs, settings: screenSettings, fszn: screenFszn,
  }[state.screen])();
  app.innerHTML = html;
  renderTabs();
}
function renderTabs(){
  const active = (state.screen==="fszn") ? "settings" : state.screen; // ФСЗН подсвечивает «Ещё»
  $("#tabbar").innerHTML = `<div class="inner">${TABS.map(t=>`
    <button class="tab ${active===t.id?"on":""}" data-action="nav" data-to="${t.id}">
      <span class="ti">${t.ico}</span><span>${t.t}</span>
    </button>`).join("")}</div>`;
}

/* ---------- экран: ГЛАВНАЯ ---------- */
async function screenDash(){
  const exps = await dbAll("expenses");
  const car  = await dbGet("car",1);
  const docs = await dbAll("documents");

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const thisMonth = exps.filter(e => new Date(e.date) >= monthStart);
  const spentMonth = thisMonth.reduce((s,e)=>s+Number(e.amount||0),0);
  const spentAll   = exps.reduce((s,e)=>s+Number(e.amount||0),0);

  const alerts = [];
  const now = new Date(); now.setHours(0,0,0,0);
  docs.forEach(d=>{
    if(!d.expiryDate) return;
    const days = Math.round((new Date(d.expiryDate) - now)/86400000);
    if(days < 0) alerts.push({bad:true, t:`Просрочено: ${esc(d.name)}`, s:`истекло ${fmtDate(d.expiryDate)}`});
    else if(days <= 30) alerts.push({bad:false, t:`Скоро истечёт: ${esc(d.name)}`, s:`осталось ${days} дн. (${fmtDate(d.expiryDate)})`});
  });
  if(car && car.oilInterval && car.lastOilMileage!=null){
    const left = Number(car.oilInterval) - (Number(car.currentMileage||0) - Number(car.lastOilMileage));
    if(left <= 0) alerts.push({bad:true, t:"Пора менять масло", s:`пробег после замены превышен на ${-left} км`});
    else if(left <= 1000) alerts.push({bad:false, t:"Скоро замена масла", s:`осталось ~${left} км`});
  }

  const last5 = exps.slice().sort((a,b)=> (b.date+b.id).localeCompare(a.date+a.id)).slice(0,5);

  // виджет ФСЗН на главной (только в режиме ИП)
  const fsznWidget = isIP() ? await fsznMiniWidget() : "";

  return `
    <div class="row between">
      <div class="logo">BLVCK<span style="color:var(--text)"> TAXI</span></div>
      <button class="btn sm ghost" data-action="toggleTheme">${document.documentElement.dataset.theme==="dark"?"🌙":"☀️"}</button>
    </div>
    <p class="muted small" style="margin:2px 0 0">твой карманный учёт расходов</p>

    ${alerts.map(a=>`
      <div class="alert ${a.bad?"bad":""}">
        <span>${a.bad?"⚠️":"🔔"}</span>
        <div><div style="font-weight:700">${a.t}</div><div class="small muted">${a.s}</div></div>
      </div>`).join("")}

    ${fsznWidget}

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

  const byCat = {};
  filtered.forEach(e=> byCat[e.category] = (byCat[e.category]||0) + Number(e.amount||0));
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
      <rect x="${x}" y="${y}" width="${bw*0.7}" height="${h}" rx="5" fill="url(#g1)">
        <animate attributeName="height" from="0" to="${h}" dur=".5s" fill="freeze"/>
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
    <div class="glass card">${await fuelEstimate()}</div>
  `;
}
async function fuelEstimate(){
  const exps = (await dbAll("expenses")).filter(e=>e.category==="fuel" && e.mileage);
  if(exps.length<2) return `<div class="empty">Добавь ≥2 заправки с пробегом — посчитаю стоимость км</div>`;
  const s = exps.slice().sort((a,b)=>a.mileage-b.mileage);
  const km = s.at(-1).mileage - s[0].mileage;
  const sum = s.slice(1).reduce((a,e)=>a+Number(e.amount||0),0);
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
          <div class="ic">${warn?(days<0?"⛔":""):"📄"}</div>
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

/* ---------- экран: ФСЗН (для ИП) ---------- */
function fsznSettings(){
  return {
    mzp:  parseFloat(localStorage.getItem("blvck_fszn_mzp"))  || 726,   // проверь актуальную МЗП!
    rate: parseFloat(localStorage.getItem("blvck_fszn_rate")) || 35,    // ставка взносов, %
  };
}
async function screenFszn(){
  const s = fsznSettings();
  const year = YEAR();
  const cq = CUR_Q();
  const minMonth = s.rate/100 * s.mzp;
  const minQ = minMonth * 3;
  const minYear = minMonth * 12;

  // собираем данные 4 кварталов
  const qs = [];
  let paidYTD = 0, minYTD = 0, paidAll = 0, targetAll = 0;
  for(let q=1;q<=4;q++){
    const rec = await dbGet("fszn", `${year}-Q${q}`) || {income:0, paid:0};
    const income = Number(rec.income)||0;
    const paid   = Number(rec.paid)||0;
    const fromIncome = income>0 ? s.rate/100*income : 0;     // прикидка 35% от дохода
    const target = Math.max(minQ, fromIncome);               // к уплате за квартал (прикидка)
    let status, badge;
    if(q < cq){                                              // квартал прошёл
      status = paid>=target ? "good" : (paid>0 ? "warn" : "bad");
      badge  = paid>=target ? "✅ закрыто" : (paid>0 ? "🟡 частично" : "⏰ не уплачено");
    } else if(q === cq){                                     // текущий
      status = paid>=target ? "good" : (paid>0 ? "warn" : "soon");
      badge  = paid>=target ? "✅ закрыто" : (paid>0 ? "🟡 в процессе" : "🔵 в процессе");
    } else {                                                 // будущий
      status = "soon"; badge = "🔮 предстоит";
    }
    qs.push({q, income, paid, target, status, badge});
    if(q <= cq){ paidYTD += paid; minYTD += minQ; }
    paidAll += paid; targetAll += target;
  }

  const goal = Math.max(minYear, targetAll);                 // цель за год
  const pctYear = goal>0 ? Math.min(100, Math.round(paidAll/goal*100)) : 0;
  const pctYTD  = minYTD>0 ? Math.min(100, Math.round(paidYTD/minYTD*100)) : 0;
  const rest = Math.max(0, goal - paidAll);                  // доплатить до 31 марта след. года

  return `
    <div class="row between">
      <div class="h1" style="margin:0">ФСЗН · ${year}</div>
      <button class="btn sm ghost" data-action="nav" data-to="settings">← Назад</button>
    </div>
    <p class="muted small">прикидка и трекер взносов для ИП · НЕ официальный расчёт</p>

    <div class="glass card">
      <div class="row between"><b>Цель за год</b><span class="muted small">${money(goal)}</span></div>
      <div class="progress ${pctYear>=100?"good":""}"><i style="width:${pctYear}%"></i></div>
      <div class="row between small"><span class="muted">уплачено ${money(paidAll)}</span><b>${pctYear}%</b></div>
      <div class="divider"></div>
      <div class="row between small"><span class="muted">С начала года (Q1–Q${cq})</span><b>${money(paidYTD)} / ${money(minYTD)} · ${pctYTD}%</b></div>
      <div class="divider"></div>
      ${rest>0
        ? `<div class="alert bad" style="margin:0"><span>⏰</span><div><div style="font-weight:700">До 31 марта ${year+1}</div><div class="small muted">доплатить ≈ <b>${money(rest)}</b> (проверь точную сумму в налоговой)</div></div></div>`
        : `<div class="alert" style="margin:0;border-color:rgba(52,211,153,.45);background:rgba(52,211,153,.10)"><span>✅</span><div><div style="font-weight:700">Минимум за год закрыт</div><div class="small muted">остатка по прикидке нет</div></div></div>`}
    </div>

    <div class="glass card">
      <b>По кварталам: надо / уплачено</b>
      ${fsznBars(qs)}
    </div>

    <div class="h2">Кварталы</div>
    ${qs.map(q=>`
      <div class="glass qcard">
        <div class="qhead">
          <div class="qtitle">${q.q}-й квартал</div>
          <span class="badge ${q.status}">${q.badge}</span>
        </div>
        <div class="qmini"><span>минимум за квартал</span><b>${money(minQ)}</b></div>
        <div class="grid2">
          <div class="field" style="margin:8px 0 0">
            <label>Доход за квартал</label>
            <input class="input" type="number" inputmode="decimal" data-fszn="income" data-q="${q.q}" value="${q.income||""}" placeholder="0">
          </div>
          <div class="field" style="margin:8px 0 0">
            <label>Уплачено взносов</label>
            <input class="input" type="number" inputmode="decimal" data-fszn="paid" data-q="${q.q}" value="${q.paid||""}" placeholder="0">
          </div>
        </div>
        <div class="qmini"><span>прикидка «к уплате»</span><b>${money(q.target)}</b></div>
        <div class="fszn-note">= max(минимум ${money(minQ)}, 35% от дохода${q.income>0?" = "+money(s.rate/100*q.income):""}). Если доход не указан — берётся минимум.</div>
      </div>`).join("")}

    <div class="glass card">
      <div class="row between"><b>Параметры расчёта</b><button class="btn sm" data-action="saveFsznSettings">💾 Сохранить</button></div>
      <div class="grid2">
        <div class="field"><label>МЗП за месяц (${year})</label><input id="fszn_mzp" class="input" type="number" inputmode="decimal" value="${s.mzp}"></div>
        <div class="field"><label>Ставка взносов, %</label><input id="fszn_rate" class="input" type="number" inputmode="decimal" value="${s.rate}"></div>
      </div>
      <div class="fszn-note">Минимальный взнос за месяц = ставка × МЗП = <b>${money(minMonth)}</b>. Актуальную МЗП и сроки всегда сверяй на portal.ssf.gov.by / в налоговой — этот раздел помощник, а не официальный калькулятор.</div>
    </div>
  `;
}
function fsznBars(qs){
  const W=320, H=150, pad=20;
  const max = Math.max(...qs.map(q=>Math.max(q.target,q.paid)), 1);
  const gw = (W-pad*2)/qs.length;
  const cols = qs.map((q,i)=>{
    const x = pad + i*gw;
    const hT = (q.target/max)*(H-pad*2);
    const hP = (q.paid/max)*(H-pad*2);
    const yT = H-pad-hT, yP = H-pad-hP;
    const pct = q.target>0 ? Math.min(100,Math.round(q.paid/q.target*100)) : 0;
    return `<g>
      <rect x="${x+gw*0.12}" y="${yT}" width="${gw*0.30}" height="${hT}" rx="5" fill="var(--glass-strong)" stroke="var(--stroke)"/>
      <rect x="${x+gw*0.50}" y="${yP}" width="${gw*0.30}" height="${hP}" rx="5" fill="url(#g2)">
        <animate attributeName="height" from="0" to="${hP}" dur=".5s" fill="freeze"/>
        <animate attributeName="y" from="${H-pad}" to="${yP}" dur=".5s" fill="freeze"/></rect>
      <text x="${x+gw*0.5}" y="${H-6}" text-anchor="middle" fill="var(--muted)" font-size="9">Q${q.q}</text>
      <text x="${x+gw*0.5}" y="${Math.min(yT,yP)-5}" text-anchor="middle" fill="var(--text)" font-size="9" font-weight="700">${pct}%</text>
    </g>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="margin-top:10px">
    <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
    ${cols}</svg>
    <div class="legend" style="margin-top:8px">
      <div class="li"><span class="dot" style="background:var(--glass-strong);border:1px solid var(--stroke)"></span>надо (прикидка)</div>
      <div class="li"><span class="dot" style="background:var(--accent)"></span>уплачено</div>
    </div>`;
}
async function fsznMiniWidget(){
  const s = fsznSettings();
  const year = YEAR();
  const minYear = s.rate/100 * s.mzp * 12;
  let paid = 0;
  for(let q=1;q<=4;q++){ const r = await dbGet("fszn", `${year}-Q${q}`); paid += Number(r?.paid)||0; }
  const pct = minYear>0 ? Math.min(100, Math.round(paid/minYear*100)) : 0;
  return `
    <div class="glass card" data-action="openFszn" style="cursor:pointer">
      <div class="row between"><b>🧾 ФСЗН ${year}</b><span class="badge ${pct>=100?"good":(pct>0?"warn":"soon")}">${pct}%</span></div>
      <div class="progress ${pct>=100?"good":""}"><i style="width:${pct}%"></i></div>
      <div class="row between small"><span class="muted">уплачено ${money(paid)}</span><span class="muted">цель ${money(minYear)}</span></div>
    </div>`;
}

/* ---------- экран: НАСТРОЙКИ ---------- */
async function screenSettings(){
  const exps = await dbAll("expenses");
  const tgName = localStorage.getItem("blvck_tg_name");
  const ipOn = isIP();
  return `
    <div class="h1">Настройки</div>

    <div class="glass card">
      <div class="row between"><span>Тема</span>
        <button class="btn sm" data-action="toggleTheme">${document.documentElement.dataset.theme==="dark"?"🌙 Тёмная":"☀️ Светлая"}</button></div>
      <div class="divider"></div>
      <div class="row between"><span>Валюта</span>
        <div class="chips">${CURS.map(c=>`<span class="chip ${c===cur()?"on":""}" data-action="setCur" data-cur="${c}">${c}</span>`).join("")}</div></div>
    </div>

    <div class="h2">Режим ИП</div>
    <div class="glass card">
      <div class="row between">
        <div><div style="font-weight:700">Я индивидуальный предприниматель</div>
          <div class="muted small">включает раздел ФСЗН и виджет на главной</div></div>
        <div class="switch">
          <span class="chip ${!ipOn?"on":""}" data-action="setIP" data-v="0">Нет</span>
          <span class="chip ${ipOn?"on":""}" data-action="setIP" data-v="1">Да</span>
        </div>
      </div>
      ${ipOn ? `<div style="height:10px"></div><button class="btn primary" data-action="openFszn">🧾 Открыть раздел ФСЗН</button>` : ``}
    </div>

    ${TG ? `
    <div class="h2">Telegram</div>
    <div class="glass card">
      <div class="row between"><span>Ты вошёл как</span><b>${esc(tgName||"—")}</b></div>
      <p class="muted small" style="margin:8px 2px 0">Данные хранятся только в этом Telegram на этом устройстве.</p>
      <div class="divider"></div>
      <button class="btn" data-action="tgClose">✖️ Закрыть приложение</button>
    </div>` : ``}

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
  try{ TG?.BackButton?.show(); }catch{}
}
function closeModal(){
  $("#modal").hidden = true; $("#modal").innerHTML = "";
  try{ TG?.BackButton?.hide(); }catch{}
}

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
  if(!amount || amount<=0){ toast("Введи сумму"); hapticBad(); return; }
  const mileage = parseFloat($("#m_mileage").value);
  const e = {
    id: uid(), category: state.modalCat, amount,
    date: $("#m_date").value || today(),
    mileage: mileage>0 ? mileage : null,
    note: $("#m_note").value.trim(),
  };
  await dbAdd("expenses", e);
  if(e.mileage){
    const car = await dbGet("car",1) || {id:1};
    if(!car.currentMileage || e.mileage > car.currentMileage){ car.currentMileage = e.mileage; await dbPut("car",car); }
  }
  closeModal(); toast("Расход добавлен"); hapticOk(); renderAsync();
}
async function saveMaint(){
  const title = $("#m_title").value.trim();
  if(!title){ toast("Введи описание"); hapticBad(); return; }
  const mileage = parseFloat($("#m_mileage").value);
  await dbAdd("maintenance",{ id:uid(), title, date:$("#m_date").value||today(),
    mileage: mileage>0?mileage:null, note:$("#m_note").value.trim() });
  closeModal(); toast("Событие ТО добавлено"); hapticOk(); renderAsync();
}
async function saveDoc(){
  const name = $("#m_name").value.trim();
  if(!name){ toast("Введи название"); hapticBad(); return; }
  await dbAdd("documents",{ id:uid(), name,
    issueDate:$("#m_issue").value||null, expiryDate:$("#m_expiry").value||null,
    note:$("#m_note").value.trim() });
  closeModal(); toast("Документ добавлен"); hapticOk(); renderAsync();
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
  await dbPut("car",car); closeModal(); toast("Авто сохранено"); hapticOk(); renderAsync();
}
function saveFsznSettings(){
  const mzp = parseFloat($("#fszn_mzp").value)||0;
  const rate = parseFloat($("#fszn_rate").value)||0;
  if(mzp<=0 || rate<=0){ toast("МЗП и ставка должны быть > 0"); hapticBad(); return; }
  localStorage.setItem("blvck_fszn_mzp", String(mzp));
  localStorage.setItem("blvck_fszn_rate", String(rate));
  toast("Параметры сохранены"); hapticOk(); renderAsync();
}
async function saveFsznField(q, field, value){
  const year = YEAR();
  const id = `${year}-Q${q}`;
  const rec = await dbGet("fszn", id) || {id, year, quarter:q, income:0, paid:0};
  rec[field] = value;
  await dbPut("fszn", rec);
}

/* ---------- бэкап / восстановление ---------- */
async function exportBackup(){
  const data = { _app:"BLVCK TAXI", _v:2, _at:new Date().toISOString() };
  for(const s of STORES) data[s] = await dbAll(s);
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `blvck-taxi-backup-${today()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  toast("Копия сохранена"); hapticOk();
}
function importBackup(){ $("#restoreInput").click(); }
async function handleRestoreFile(file){
  if(!file) return;
  try{
    const data = JSON.parse(await file.text());
    if(!confirm("Заменить ВСЕ текущие данные данными из файла?")) return;
    for(const s of STORES){ await dbClear(s); for(const v of (data[s]||[])) await dbPut(s,v); }
    toast("Данные восстановлены"); hapticOk(); renderAsync();
  }catch(e){ toast("Ошибка файла"); hapticBad(); }
}
async function wipe(){
  if(!confirm("Удалить ВСЕ данные приложения? Это необратимо.")) return;
  for(const s of STORES) await dbClear(s);
  toast("Всё удалено"); hapticOk(); renderAsync();
}

/* ---------- тема / валюта / режим ИП ---------- */
function applyTheme(){
  const t = localStorage.getItem("blvck_theme") || "dark";
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = t==="dark" ? "#0a0a0f" : "#eef0f7";
  syncTgColors();
}
function toggleTheme(){
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("blvck_theme", t); applyTheme(); haptic(); renderAsync();
}
function setCur(c){ localStorage.setItem("blvck_cur", c); haptic(); renderAsync(); }
function setIP(v){ localStorage.setItem("blvck_is_ip", v); haptic(); renderAsync(); }

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
  haptic("light");
  switch(a){
    case "nav":        state.screen = el.dataset.to; renderAsync(); break;
    case "quick":      modalExpense(el.dataset.cat); break;
    case "openEditCar":modalCar(); break;
    case "openAddMaint":modalMaint(); break;
    case "openAddDoc": modalDoc(); break;
    case "openFszn":   state.screen = "fszn"; renderAsync(); break;
    case "saveExpense":await saveExpense(); break;
    case "saveMaint":  await saveMaint(); break;
    case "saveDoc":    await saveDoc(); break;
    case "saveCar":    await saveCar(); break;
    case "saveFsznSettings": saveFsznSettings(); break;
    case "delExpense": if(confirm("Удалить запись?")){ await dbDel("expenses",el.dataset.id); renderAsync(); } break;
    case "delMaint":   if(confirm("Удалить событие?")){ await dbDel("maintenance",el.dataset.id); renderAsync(); } break;
    case "delDoc":     if(confirm("Удалить документ?")){ await dbDel("documents",el.dataset.id); renderAsync(); } break;
    case "setRange":   state.range = el.dataset.range; renderAsync(); break;
    case "toggleTheme":toggleTheme(); break;
    case "setCur":     setCur(el.dataset.cur); break;
    case "setIP":      setIP(el.dataset.v); break;
    case "export":     exportBackup(); break;
    case "import":     importBackup(); break;
    case "wipe":       wipe(); break;
    case "tgClose":    try{ TG?.close(); }catch{} break;
    case "close":      closeModal(); break;
  }
});
// inline-сохранение полей ФСЗН (после ввода)
document.addEventListener("change", async (ev)=>{
  const el = ev.target.closest("[data-fszn]"); if(!el) return;
  const field = el.dataset.fszn;            // income | paid
  const q = el.dataset.q;
  const value = parseFloat(el.value)||0;
  await saveFsznField(q, field, value);
  hapticOk(); renderAsync();
});
$("#modal").addEventListener("click", e=>{ if(e.target.id==="modal") closeModal(); });
$("#restoreInput").addEventListener("change", e=> handleRestoreFile(e.target.files[0]));

/* ---------- старт ---------- */
(async function init(){
  applyTheme();
  makeParticles();
  setupTelegram();
  await openDB();
  await renderAsync();
  if("serviceWorker" in navigator){
    window.addEventListener("load", ()=> navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
})();
