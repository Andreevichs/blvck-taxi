/* =========================================================
   BLVCK TAXI — весь комбайн, vanilla, без зависимостей
   IndexedDB + localStorage. Офлайн. Без сервера. Бесплатно.
   + Telegram Mini App + ФСЗН/налоги ИП + быстрая заправка
   + эффективность + режим «за рулём» + стрик + shortcuts + чеки
   + ШТРАФЫ + выручка за день/план/выгодные дни + тренд + пресеты доков
   + ЭКРАН ЧЕКОВ: просмотр галереей + выгрузка HTML(PDF)/ZIP/CSV за период
   + ВЫРУЧКА ЗА ПРОШЛЫЕ ДНИ + МИНИ-ГРАФИК по дням (КОПЕЙКИ + ровная рамка)
   + ПОЛНЫЙ бэкап
   ========================================================= */

/* ===== TELEGRAM MINI APP ===== */
const TG = window.Telegram?.WebApp;
const haptic    = (t="light") => { try{ TG?.HapticFeedback?.impactOccurred(t); }catch{} };
const hapticOk  = () => { try{ TG?.HapticFeedback?.notificationOccurred?.("success"); }catch{} };
const hapticBad = () => { try{ TG?.HapticFeedback?.notificationOccurred?.("error"); }catch{} };
function setupTelegram(){
  if(!TG) return;
  try{
    TG.ready(); TG.expand(); syncTgColors();
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

/* ---------- справочники ---------- */
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
const TAX_PRESETS = ["Единый налог","ФСЗН за квартал","Подоходный (аванс)","Декларация","Налог на проф. доход"];
const FINE_PRESETS = ["Камера / превышение","Парковка","Ремень / телефон за рулём","Нет оклейки / шашечек","Нет карточки водителя","Просрочен техосмотр / страховка","Тонировка"];
const DOC_PRESETS = ["Медсправка водителя","Карточка водителя такси","Оклейка / шашечки","Страховка (ОСГОП)","Техосмотр"];
const WD = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const WD_ORDER = [1,2,3,4,5,6,0];

const state = { screen:"dash", range:"month", modalCat:"fuel", modalEditId:null, modalReceipt:null,
                receiptMode:"quarter", receiptOffset:0, receiptCat:"all" };

/* ---------- утилиты ---------- */
const $  = (s, r=document) => r.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c =>
  ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const cur   = () => localStorage.getItem("blvck_cur") || "BYN";
const money = n => (Number(n)||0).toLocaleString("ru-RU",{maximumFractionDigits:2}) + " " + cur();
const rate  = n => (Number(n)||0).toLocaleString("ru-RU",{maximumFractionDigits:2}) + " " + cur();
const today = () => new Date().toISOString().slice(0,10);
const ymNow = () => today().slice(0,7);
const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("ru-RU",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const monthLabel = ym => new Date(ym+"-01T00:00:00").toLocaleDateString("ru-RU",{month:"long",year:"numeric"});
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const YEAR = () => new Date().getFullYear();
const CUR_Q = () => Math.ceil((new Date().getMonth()+1)/3);
const isIP = () => localStorage.getItem("blvck_is_ip") === "1";
function ruPlural(n,f){ const a=Math.abs(n)%100,b=a%10; if(a>=11&&a<=14)return f[2]; if(b===1)return f[0]; if(b>=2&&b<=4)return f[1]; return f[2]; }
function prevYM(ym){ const [y,m]=ym.split("-").map(Number); return new Date(y,m-2,1).toISOString().slice(0,7); }
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }

/* выбор периода со стрелками (для экрана чеков) */
function periodRange(mode, offset){
  const now = new Date();
  if(mode==="all") return {from:null, to:null, label:"Всё время"};
  if(mode==="month"){
    const base = new Date(now.getFullYear(), now.getMonth()+offset, 1);
    const y=base.getFullYear(), m=base.getMonth();
    const from = new Date(y,m,1).toISOString().slice(0,10);
    const to   = new Date(y,m+1,0).toISOString().slice(0,10);
    return {from, to, label: monthLabel(from.slice(0,7))};
  }
  if(mode==="quarter"){
    let q = CUR_Q()-1 + offset; let y = now.getFullYear();
    while(q<0){ q+=4; y--; } while(q>3){ q-=4; y++; }
    const m0 = q*3;
    const from = new Date(y,m0,1).toISOString().slice(0,10);
    const to   = new Date(y,m0+3,0).toISOString().slice(0,10);
    return {from, to, label:`${y} · Q${q+1}`};
  }
  const y = now.getFullYear()+offset;
  return {from:`${y}-01-01`, to:`${y}-12-31`, label:`${y}`};
}

/* ---------- localStorage-словари ---------- */
const _map  = k => { try{ return JSON.parse(localStorage.getItem(k)||"{}"); }catch{ return {}; } };
const _set  = (k,ym,v) => { const m=_map(k); if(v>0) m[ym]=v; else delete m[ym]; localStorage.setItem(k, JSON.stringify(m)); };
const _list = k => { try{ return JSON.parse(localStorage.getItem(k)||"[]"); }catch{ return []; } };
const _saveList = (k,a) => localStorage.setItem(k, JSON.stringify(a));

const rawIncomeOf = ym => Number(_map("blvck_income")[ym])||0;
const kmOf     = ym => Number(_map("blvck_km")[ym])||0;
const hoursOf  = ym => Number(_map("blvck_hours")[ym])||0;
const setIncome= (ym,v)=>_set("blvck_income",ym,v);
const setKm    = (ym,v)=>_set("blvck_km",ym,v);
const setHours = (ym,v)=>_set("blvck_hours",ym,v);

const dailyRevMap = () => _map("blvck_daily_rev");
const dailyRevOf  = d  => Number(dailyRevMap()[d])||0;
const setDailyRev = (d,v) => _set("blvck_daily_rev", d, v);
function sumDaysForYM(ym){ const m=dailyRevMap(); let s=0,n=0; for(const k in m){ if(k.startsWith(ym+"-") && Number(m[k])>0){ s+=Number(m[k]); n++; } } return {sum:s,n}; }
function incomeSource(ym){ const d=sumDaysForYM(ym); if(d.sum>0) return {src:"days", val:d.sum, n:d.n}; const m=rawIncomeOf(ym); if(m>0) return {src:"manual", val:m, n:0}; return {src:"none", val:0, n:0}; }
const incomeOf = ym => incomeSource(ym).val;
function quarterIncome(q, year){ let s=0; for(let mo=(q-1)*3+1; mo<=(q-1)*3+3; mo++) s += incomeOf(`${year}-${String(mo).padStart(2,"0")}`); return s; }

/* дни, где были расходы, но выручку не внесли (чтобы добить прошлое) */
function missingWorkDays(exps, fromDate, toDate){
  const expDates = new Set(exps.filter(e=> e.date>=fromDate && e.date<=toDate).map(e=>e.date));
  const rev = dailyRevMap();
  return [...expDates].filter(d=> !(Number(rev[d])>0)).sort().reverse();
}

const getDailyTarget = () => Number(localStorage.getItem("blvck_daily_target"))||0;
const setDailyTarget = v => { if(v>0) localStorage.setItem("blvck_daily_target", String(v)); else localStorage.removeItem("blvck_daily_target"); };

const fuelPresets = () => { try{ const a=JSON.parse(localStorage.getItem("blvck_fuel_presets")); return Array.isArray(a)&&a.length===3?a:[50,80,120]; }catch{ return [50,80,120]; } };
const setFuelPresets = a => localStorage.setItem("blvck_fuel_presets", JSON.stringify(a));

const taxList = () => _list("blvck_tax_reminders");
const saveTaxList = a => _saveList("blvck_tax_reminders", a);
const finesList = () => _list("blvck_fines");
const saveFinesList = a => _saveList("blvck_fines", a);

function calcStreak(set){
  const d=new Date(); d.setHours(0,0,0,0);
  const key=dt=>dt.toISOString().slice(0,10);
  let c=0;
  if(!set.has(key(d))){ d.setDate(d.getDate()-1); if(!set.has(key(d))) return 0; }
  while(set.has(key(d))){ c++; d.setDate(d.getDate()-1); }
  return c;
}
function bestStreak(set){
  if(!set.size) return 0;
  const arr=[...set].sort(); let best=1,run=1;
  for(let i=1;i<arr.length;i++){
    const diff=Math.round((new Date(arr[i]+"T00:00:00")-new Date(arr[i-1]+"T00:00:00"))/86400000);
    if(diff===1){run++;best=Math.max(best,run);} else run=1;
  }
  return best;
}
function weekdayAvg(){
  const m=dailyRevMap(); const sum=[0,0,0,0,0,0,0], cnt=[0,0,0,0,0,0,0];
  for(const k in m){ const v=Number(m[k]); if(v>0){ const d=new Date(k+"T00:00:00").getDay(); sum[d]+=v; cnt[d]++; } }
  const avg=sum.map((s,i)=> cnt[i]? s/cnt[i] : 0);
  let best=-1, bi=-1; avg.forEach((a,i)=>{ if(cnt[i] && a>best){best=a;bi=i;} });
  return {avg, cnt, bestIdx:bi};
}
function trendPct(c,p){
  if(p<=0) return c>0 ? {dir:"up", pct:null} : {dir:"flat", pct:null};
  const pct=Math.round((c-p)/p*100);
  return {dir: pct>0?"up":pct<0?"down":"flat", pct};
}
const arrow = d => d==="up"?"↑":d==="down"?"↓":"→";

/* ---------- чек / скриншот ---------- */
function pickImage(){
  return new Promise(res=>{
    const inp=document.createElement("input");
    inp.type="file"; inp.accept="image/*";
    inp.onchange=()=> res(inp.files && inp.files[0] ? inp.files[0] : null);
    inp.click();
  });
}
function compressImage(file, maxSide, quality){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        let w=img.width, h=img.height;
        const scale=Math.min(1, maxSide/Math.max(w,h));
        w=Math.max(1,Math.round(w*scale)); h=Math.max(1,Math.round(h*scale));
        const c=document.createElement("canvas"); c.width=w; c.height=h;
        const ctx=c.getContext("2d");
        ctx.fillStyle="#fff"; ctx.fillRect(0,0,w,h);
        ctx.drawImage(img,0,0,w,h);
        res(c.toDataURL("image/jpeg", quality));
      };
      img.onerror=rej; img.src=fr.result;
    };
    fr.onerror=rej; fr.readAsDataURL(file);
  });
}
async function addReceiptFromPicker(){
  const file = await pickImage();
  if(!file) return;
  try{
    const data = await compressImage(file, 1400, 0.75);
    state.modalReceipt = data;
    const box=$("#m_receipt_box"); if(box) box.innerHTML = receiptBoxHTML();
    toast("Чек прикреплён"); hapticOk();
  }catch(e){ toast("Не удалось прочитать фото"); hapticBad(); }
}
function receiptBoxHTML(){
  if(state.modalReceipt){
    return `<div class="rcpt">
      <img src="${state.modalReceipt}" data-action="viewReceiptCurrent" alt="чек">
      <div class="rcpt-actions">
        <button class="btn sm" data-action="pickReceipt">🔄 Заменить</button>
        <button class="btn sm danger" data-action="clearReceipt">🗑 Убрать чек</button>
      </div>
    </div>`;
  }
  return `<button class="btn" data-action="pickReceipt">🧾 Прикрепить чек / скриншот</button>
    <div class="fszn-note">фото или скрин электронного чека сожмётся и сохранится вместе с расходом — и попадёт в резервную копию</div>`;
}
function openReceiptViewer(src){
  const m=$("#modal");
  m.innerHTML=`<div class="viewer" data-action="close">
    <button class="x vclose" data-action="close">×</button>
    <img src="${src}" alt="чек">
  </div>`;
  m.hidden=false;
  try{TG?.BackButton?.show();}catch{}
}

/* ---------- ZIP (без зависимостей, store) + base64→bytes ---------- */
const CRC_TABLE = (()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = (c&1)?(0xEDB88320 ^ (c>>>1)):(c>>>1); t[n]=c>>>0; } return t; })();
function crc32(bytes){ let c=0xFFFFFFFF; for(let i=0;i<bytes.length;i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c>>>8); return (c ^ 0xFFFFFFFF)>>>0; }
function b64ToBytes(dataURL){ const b64=dataURL.split(",")[1]||""; const bin=atob(b64); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
function strBytes(s){ return new TextEncoder().encode(s); }
function buildZip(files){
  const parts=[]; const central=[]; let offset=0;
  const UTF8=0x0800;
  for(const f of files){
    const nameB=strBytes(f.name); const crc=crc32(f.data); const size=f.data.length;
    const lh=new ArrayBuffer(30); const lv=new DataView(lh);
    lv.setUint32(0,0x04034b50,true); lv.setUint16(4,20,true); lv.setUint16(6,UTF8,true);
    lv.setUint16(8,0,true); lv.setUint16(10,0,true); lv.setUint16(12,0,true);
    lv.setUint32(14,crc,true); lv.setUint32(18,size,true); lv.setUint32(22,size,true);
    lv.setUint16(26,nameB.length,true); lv.setUint16(28,0,true);
    parts.push(new Uint8Array(lh), nameB, f.data);
    const ch=new ArrayBuffer(46); const cv=new DataView(ch);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,UTF8,true);
    cv.setUint16(8,0,true); cv.setUint16(10,0,true); cv.setUint16(12,0,true);
    cv.setUint32(14,crc,true); cv.setUint32(18,size,true); cv.setUint32(22,size,true);
    cv.setUint16(26,nameB.length,true); cv.setUint16(28,0,true); cv.setUint16(30,0,true);
    cv.setUint16(32,0,true); cv.setUint16(34,0,true); cv.setUint32(36,0,true); cv.setUint32(42,offset,true);
    central.push(new Uint8Array(ch), nameB);
    offset += 30 + nameB.length + size;
  }
  const cdStart=offset; let cdSize=0; central.forEach(p=>cdSize+=p.length);
  const eocd=new ArrayBuffer(22); const ev=new DataView(eocd);
  ev.setUint32(0,0x06054b50,true); ev.setUint16(4,0,true); ev.setUint16(6,0,true);
  ev.setUint16(8,files.length,true); ev.setUint16(10,files.length,true);
  ev.setUint32(12,cdSize,true); ev.setUint32(16,cdStart,true); ev.setUint16(20,0,true);
  return new Blob([...parts, ...central, new Uint8Array(eocd)], {type:"application/zip"});
}

function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(()=> t.hidden = true, 1800);
}

/* ---------- IndexedDB ---------- */
const DB_NAME = "blvcktaxi", DB_VER = 2;
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
      if(!d.objectStoreNames.contains("car")) d.createObjectStore("car",{keyPath:"id"});
      if(!d.objectStoreNames.contains("fszn")) d.createObjectStore("fszn",{keyPath:"id"});
    };
    req.onsuccess = () => { db = req.result; res(db); };
    req.onerror   = () => rej(req.error);
  });
}
function tx(store, mode="readonly"){ return db.transaction(store, mode).objectStore(store); }
function reqP(req){ return new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); }
const dbPut    = (s, v)  => reqP(tx(s,"readwrite").put(v));
const dbDel    = (s, id) => reqP(tx(s,"readwrite").delete(id));
const dbGet    = (s, id) => reqP(tx(s).get(id));
const dbAll    = (s)     => reqP(tx(s).getAll());
const dbClear  = (s)     => reqP(tx(s,"readwrite").clear());

/* ---------- рендер ---------- */
async function renderAsync(){
  const app = $("#app");
  app.style.animation = "none"; void app.offsetWidth; app.style.animation = "";
  const html = await ({
    dash: screenDash, stats: screenStats, car: screenCar,
    docs: screenDocs, settings: screenSettings, fszn: screenFszn,
    fines: screenFines, receipts: screenReceipts,
  }[state.screen])();
  app.innerHTML = html;
  renderTabs();
}
function renderTabs(){
  const active = state.screen==="fszn" ? "settings"
               : (state.screen==="fines"||state.screen==="receipts") ? "dash"
               : state.screen;
  $("#tabbar").innerHTML = `<div class="inner">${TABS.map(t=>`
    <button class="tab ${active===t.id?"on":""}" data-action="nav" data-to="${t.id}">
      <span class="ti">${t.ico}</span><span>${t.t}</span>
    </button>`).join("")}</div>`;
}

/* ---------- ГЛАВНАЯ ---------- */
async function screenDash(){
  const exps = await dbAll("expenses");
  const car  = await dbGet("car",1);
  const docs = await dbAll("documents");

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const spentMonth = exps.filter(e => new Date(e.date) >= monthStart).reduce((s,e)=>s+Number(e.amount||0),0);
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
  if(isIP()) taxList().forEach(r=>{
    if(!r.date) return;
    const days = Math.round((new Date(r.date) - now)/86400000);
    if(days < 0) alerts.push({bad:true, t:`Просрочено: ${esc(r.name)}`, s:`срок был ${fmtDate(r.date)}`});
    else if(days <= 14) alerts.push({bad:false, t:`Срок: ${esc(r.name)}`, s:`осталось ${days} дн. (${fmtDate(r.date)})`});
  });
  finesList().filter(f=>!f.paid).forEach(f=>{
    const days = f.date ? Math.round((now - new Date(f.date+"T00:00:00"))/86400000) : null;
    alerts.push({bad:true, t:`🚨 Не оплачен штраф: ${esc(f.name)}`, s:`${money(f.amount)}${f.date?` · выписан ${fmtDate(f.date)}${days!=null?` (${days} дн. назад)`:""}`:""}`});
  });

  const last5 = exps.slice().sort((a,b)=> (b.date+b.id).localeCompare(a.date+a.id)).slice(0,5);
  const fsznWidget = isIP() ? await fsznMiniWidget() : "";

  const dateSet = new Set(exps.map(e=>e.date));
  const curStreak = calcStreak(dateSet);
  let best = bestStreak(dateSet);
  const savedBest = Number(localStorage.getItem("blvck_streak_best"))||0;
  if(best > savedBest){ localStorage.setItem("blvck_streak_best", String(best)); }
  best = Math.max(best, savedBest);
  const streakLine = curStreak>0
    ? `<div class="streak">🔥 ${curStreak} ${ruPlural(curStreak,["день","дня","дней"])} подряд · рекорд ${best}</div>`
    : (best>0 ? `<div class="streak" style="color:var(--muted)">рекорд 🔥 ${best} ${ruPlural(best,["день","дня","дней"])} подряд — продолжи серию!</div>` : "");

  const t = today(); const todayRev = dailyRevOf(t); const target = getDailyTarget();
  const planCard = target>0 ? (()=>{
    const pct = Math.min(100, Math.round(todayRev/target*100));
    const done = todayRev>=target;
    return `<div class="glass card">
      <div class="row between"><b>🎯 План на день</b><span class="badge ${done?"good":"warn"}">${done?"выполнен ✅":"в процессе"}</span></div>
      <div class="progress ${done?"good":""}"><i style="width:${pct}%"></i></div>
      <div class="row between small"><span class="muted">сегодня ${money(todayRev)}</span><b>${done?"можно домой 🏠":"ещё "+money(Math.max(0,target-todayRev))+" до плана"}</b></div>
    </div>`;
  })() : "";

  const missDays = missingWorkDays(exps, ymNow()+"-01", today());
  const missingCard = missDays.length ? `<div class="glass card">
      <div class="row between">
        <div><div style="font-weight:700">💵 Выручка не внесена за ${missDays.length} ${ruPlural(missDays.length,["день","дня","дней"])} этого месяца</div>
          <div class="small muted">добей прошлые дни — доход, тренд и карта выгодных дней пересчитаются сами</div></div>
        <button class="btn sm primary" data-action="openDailyRev" style="width:auto">Добить</button>
      </div>
    </div>` : "";

  const ym = ymNow(), pym = prevYM(ym);
  const spentPY = exps.filter(e=> e.date.slice(0,7)===pym).reduce((s,e)=>s+Number(e.amount||0),0);
  const revCur = sumDaysForYM(ym).sum, revPY = sumDaysForYM(pym).sum;
  const tSpent = trendPct(spentMonth, spentPY), tRev = trendPct(revCur, revPY);
  const tSpentCls = tSpent.dir==="up"?"down":tSpent.dir==="down"?"up":"flat";
  const tRevCls   = tRev.dir==="up"?"up":tRev.dir==="down"?"down":"flat";
  const fmtT = (tt,cls,lbl)=> tt.dir==="flat" ? `<span class="flat">${lbl} → без изменений</span>`
    : `<span class="${cls}">${lbl} ${arrow(tt.dir)}${tt.pct!=null?tt.pct+"%":"новое"}</span>`;
  const trendLine = (spentMonth||spentPY||revCur||revPY)
    ? `<div class="trendrow"><span class="lbl">к прошлому месяцу:</span>${fmtT(tSpent,tSpentCls,"расходы")} · ${fmtT(tRev,tRevCls,"выручка")}</div>` : "";

  const wka = weekdayAvg();
  const bestWdLine = wka.bestIdx>=0 ? `<div class="small muted" style="margin:6px 2px 0">🗓 твой лучший день недели: <b style="color:var(--text)">${WD[wka.bestIdx]}</b> (в среднем ${rate(wka.avg[wka.bestIdx])})</div>` : "";

  return `
    <div class="row between">
      <div class="logo">BLVCK<span style="color:var(--text)"> TAXI</span></div>
      <button class="btn sm ghost" data-action="toggleTheme">${document.documentElement.dataset.theme==="dark"?"🌙":"☀️"}</button>
    </div>
    <p class="muted small" style="margin:2px 0 0">твой карманный учёт расходов</p>
    ${streakLine}

    ${alerts.map(a=>`
      <div class="alert ${a.bad?"bad":""}">
        <span>${a.bad?"⚠️":"🔔"}</span>
        <div><div style="font-weight:700">${a.t}</div><div class="small muted">${a.s}</div></div>
      </div>`).join("")}

    ${planCard}
    ${missingCard}
    ${freeMoneyWidget(spentMonth)}
    ${trendLine}
    ${bestWdLine}
    ${fsznWidget}

    <div class="stats">
      <div class="glass stat"><div class="v">${money(spentMonth)}</div><div class="k">за месяц</div></div>
      <div class="glass stat"><div class="v">${money(spentAll)}</div><div class="k">всего</div></div>
    </div>

    <div class="h2">Быстрый ввод</div>
    <div class="quick">
      ${Object.entries(CATS).map(([k,c])=>`
        <button class="qbtn" data-action="${k==="fuel"?"openFuelQuick":"quick"}" ${k!=="fuel"?`data-cat="${k}"`:""}>
          <span class="ico">${c.ico}</span>
          <span class="t">${c.t}</span>
          <span class="s">${k==="fuel"?"быстро, в 1 тап":"добавить расход"}</span>
        </button>`).join("")}
    </div>
    <button class="btn primary" data-action="openDailyRev" style="margin-top:14px">💵 Выручка сегодня${todayRev>0?": "+money(todayRev):""}</button>
    <button class="btn" data-action="openDrive" style="margin-top:10px">🚦 Режим за рулём — одной рукой</button>
    <div class="row" style="gap:10px;margin-top:10px">
      <button class="btn ghost" data-action="openFines">🚨 Штрафы</button>
      <button class="btn ghost" data-action="openReceipts">🧾 Чеки</button>
    </div>

    <div class="h2">Последние записи</div>
    ${last5.length ? `<div class="list">${last5.map(expenseRow).join("")}</div>`
                   : `<div class="glass empty">Пока пусто. Нажми на кнопку выше ⬆️</div>`}
  `;
}
function freeMoneyWidget(spentMonth){
  const ym = ymNow();
  const src = incomeSource(ym);
  const income = src.val;
  const s = fsznSettings();
  const fszn = isIP() ? (s.rate/100 * s.mzp) : 0;
  const free = income - spentMonth - fszn;
  const cls = free>=0 ? "pos" : "neg";
  const sign = free>=0 ? "+" : "−";
  const srcLabel = src.src==="days" ? `доход (из ${src.n} ${ruPlural(src.n,["дня","дней","дней"])})`
                   : src.src==="manual" ? "доход (вручную)" : "доход";
  return `
    <div class="glass card">
      <div class="row between"><b>💰 Свободно за ${monthLabel(ym)}</b>
        <span class="badge ${cls}">${free>=0?"в плюсе":"в минусе"}</span></div>
      <div class="freebig ${cls}">${sign}${money(Math.abs(free))}</div>
      <div class="row between small"><span class="muted">${srcLabel}</span><b>${income>0?money(income):"—"}</b></div>
      <div class="row between small"><span class="muted">расходы на авто</span><b>−${money(spentMonth)}</b></div>
      ${isIP()?`<div class="row between small"><span class="muted">взносы ФСЗН (мин.)</span><b>−${money(fszn)}</b></div>`:""}
      <div class="divider"></div>
      <div class="field" style="margin:0">
        <label>Доход вручную (если не вносишь выручку по дням)</label>
        <div class="row" style="gap:8px">
          <input id="income_month" class="input" type="number" inputmode="decimal" value="${src.src==="manual"?income:""}" placeholder="0">
          <button class="btn sm primary" data-action="setIncome" style="width:auto">💾</button>
        </div>
      </div>
    </div>`;
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
      ${e.receipt?`<button class="edit" data-action="viewReceipt" data-id="${e.id}" title="чек">🧾</button>`:""}
      <button class="edit" data-action="editExpense" data-id="${e.id}" title="изменить">✏️</button>
      <button class="del" data-action="delExpense" data-id="${e.id}" title="удалить">🗑</button>
    </div>`;
}

/* ---------- ГРАФИКИ + ЭФФЕКТИВНОСТЬ + ВЫГОДНЫЕ ДНИ ---------- */
async function screenStats(){
  const exps = await dbAll("expenses");
  const filtered = filterByRange(exps, state.range);
  const byCat = {}; filtered.forEach(e=> byCat[e.category] = (byCat[e.category]||0) + Number(e.amount||0));
  const byMonth = {}; filtered.forEach(e=>{ const m=e.date.slice(0,7); byMonth[m]=(byMonth[m]||0)+Number(e.amount||0); });
  const months = Object.keys(byMonth).sort();
  const total = Object.values(byCat).reduce((a,b)=>a+b,0);

  const ym = ymNow();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const spentMonth = exps.filter(e => new Date(e.date) >= monthStart).reduce((s,e)=>s+Number(e.amount||0),0);
  const income = incomeOf(ym), km = kmOf(ym), hours = hoursOf(ym);
  const s = fsznSettings(); const fszn = isIP() ? (s.rate/100 * s.mzp) : 0;
  const free = income - spentMonth - fszn;
  const perKmRev  = km>0 ? income/km : null;
  const perHour   = hours>0 ? income/hours : null;
  const perKmCost = km>0 ? spentMonth/km : null;
  const margin    = income>0 ? free/income*100 : null;

  const wka = weekdayAvg();
  const hasWd = wka.bestIdx>=0;

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

    <div class="h2">Выгодные дни недели</div>
    <div class="glass card">
      ${hasWd
        ? `${bars(WD_ORDER.map(i=>({label:WD[i], value:wka.avg[i]})))}
           <div class="fszn-note">🏆 твой лучший день — <b>${WD[wka.bestIdx]}</b> (в среднем ${rate(wka.avg[wka.bestIdx])} выручки). Считается по внесённой выручке за день — чем больше дней заполнишь, тем точнее карта.</div>`
        : `<div class="empty">Вноси «💵 Выручка сегодня» — и здесь появится карта выгодных дней недели</div>`}
    </div>

    <div class="h2">Эффективность за ${monthLabel(ym)}</div>
    <div class="glass card">
      <div class="grid2">
        <div class="field" style="margin:0"><label>Пробег за месяц, км</label>
          <input id="eff_km" class="input" type="number" inputmode="numeric" value="${km||""}" placeholder="0"></div>
        <div class="field" style="margin:0"><label>Часов за рулём</label>
          <input id="eff_hours" class="input" type="number" inputmode="decimal" value="${hours||""}" placeholder="0"></div>
      </div>
      <div style="height:8px"></div>
      <button class="btn sm primary" data-action="setEff" style="width:100%">💾 Сохранить пробег и часы</button>
      <div class="eff">
        <div class="e"><div class="v">${perHour!=null?rate(perHour):"—"}</div><div class="k">₽ / час за рулём</div></div>
        <div class="e"><div class="v">${perKmRev!=null?rate(perKmRev):"—"}</div><div class="k">₽ / км выручки</div></div>
        <div class="e"><div class="v">${perKmCost!=null?rate(perKmCost):"—"}</div><div class="k">₽ / км затрат</div></div>
        <div class="e"><div class="v">${margin!=null?margin.toFixed(0)+"%":"—"}</div><div class="k">маржа (свободно/доход)</div></div>
      </div>
      <div class="fszn-note">💡 Разбивка по часам внутри дня появится вместе с учётом смен (таймером). Сейчас метрики — по итогу месяца; доход берётся из выручки по дням (или вручную с главной).</div>
    </div>`;
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
  const paths = entries.map(([k,v])=>`<path d="${arc(a0 + (v/total)*Math.PI*2)}" fill="${colors[k]||"#888"}" opacity=".92"/>`).join("");
  const legend = entries.map(([k,v])=>`<div class="li"><span class="dot" style="background:${colors[k]||"#888"}"></span>${(CATS[k]?.t||k)} · ${Math.round(v/total*100)}%</div>`).join("");
  return `<div class="row" style="gap:18px;margin-top:10px">
      <svg class="chart" viewBox="0 0 160 160" width="140" height="140">${paths}
        <text x="80" y="78" text-anchor="middle" fill="var(--text)" font-size="14" font-weight="800">${money(total).split(" ")[0]}</text>
        <text x="80" y="94" text-anchor="middle" fill="var(--muted)" font-size="9">${cur()}</text></svg>
      <div class="legend col">${legend}</div></div>`;
}
function bars(data){
  const W=320, H=140, pad=18, max=Math.max(...data.map(d=>d.value),1), bw=(W-pad*2)/data.length;
  const cols = data.map((d,i)=>{
    const h=(d.value/max)*(H-pad*2), x=pad+i*bw+bw*0.15, y=H-pad-h;
    return `<g><rect x="${x}" y="${y}" width="${bw*0.7}" height="${h}" rx="5" fill="url(#g1)">
        <animate attributeName="height" from="0" to="${h}" dur=".5s" fill="freeze"/>
        <animate attributeName="y" from="${H-pad}" to="${y}" dur=".5s" fill="freeze"/></rect>
      <text x="${x+bw*0.35}" y="${H-5}" text-anchor="middle" fill="var(--muted)" font-size="9">${d.label}</text></g>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="margin-top:10px">
    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>${cols}</svg>`;
}

/* ---------- АВТО ---------- */
async function screenCar(){
  const car = await dbGet("car",1) || {};
  return `
    <div class="h1">Автомобиль</div>
    <p class="muted small">модель, расход, пробег, замена масла</p>
    <div class="glass card">
      <div class="row between">
        <div><div style="font-size:20px;font-weight:800">${car.model?esc(car.model):"Не задано"}</div>
          <div class="muted small">${car.plate?esc(car.plate):"—"}</div></div>
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
    <div class="glass card">${await fuelEstimate()}</div>`;
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

/* ---------- ТО / ДОКИ ---------- */
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
        return `<div class="item"><div class="ic">${warn?(days<0?"⛔":"⏰"):"📄"}</div>
          <div class="meta"><div class="t">${esc(d.name)}</div>
            <div class="s">${d.expiryDate?("до "+fmtDate(d.expiryDate)+(days!=null?(days<0?" · просрочено":" · "+days+" дн."):"")):"бессрочно"}</div></div>
          <button class="del" data-action="delDoc" data-id="${d.id}">🗑</button></div>`;}).join("")}</div>` : `<div class="glass empty">Нет документов</div>`}
    <div class="h2">Журнал ТО</div>
    ${maint.length? `<div class="list">${maint.map(m=>`
        <div class="item"><div class="ic">🔧</div>
          <div class="meta"><div class="t">${esc(m.title)}</div>
            <div class="s">${fmtDate(m.date)}${m.mileage?" · "+Number(m.mileage).toLocaleString("ru-RU")+" км":""}${m.note?" · "+esc(m.note):""}</div></div>
          <button class="del" data-action="delMaint" data-id="${m.id}">🗑</button></div>`).join("")}</div>` : `<div class="glass empty">Нет событий</div>`}`;
}

/* ---------- ШТРАФЫ ---------- */
async function screenFines(){
  const list = finesList();
  const now = new Date(); now.setHours(0,0,0,0);
  const unpaid = list.filter(f=>!f.paid);
  const unpaidSum = unpaid.reduce((s,f)=>s+Number(f.amount||0),0);
  const y=YEAR();
  const paidYear = list.filter(f=>f.paid && (f.paidDate||"").slice(0,4)===String(y));
  const paidYearSum = paidYear.reduce((s,f)=>s+Number(f.amount||0),0);
  const sorted = list.slice().sort((a,b)=>{
    if(a.paid!==b.paid) return a.paid?1:-1;
    return (b.paidDate||b.date||"").localeCompare(a.paidDate||a.date||"");
  });
  return `
    <div class="row between">
      <div class="h1" style="margin:0">🚨 Штрафы</div>
      <button class="btn sm ghost" data-action="nav" data-to="dash">← Назад</button>
    </div>
    <p class="muted small">долги светятся на главной; при «оплачено» штраф сам уходит в расходы</p>
    <div class="stats">
      <div class="glass stat"><div class="v neg">${unpaid.length?money(unpaidSum):money(0)}</div><div class="k">не оплачено (${unpaid.length})</div></div>
      <div class="glass stat"><div class="v">${money(paidYearSum)}</div><div class="k">оплачено за ${y}</div></div>
    </div>
    <button class="btn primary" data-action="openAddFine" style="margin-top:12px">➕ Добавить штраф</button>
    <div class="h2">Список</div>
    ${sorted.length? `<div class="list">${sorted.map(f=>{
        const days = f.date? Math.round((now - new Date(f.date+"T00:00:00"))/86400000):null;
        if(!f.paid){
          return `<div class="item"><div class="ic">🚨</div>
            <div class="meta"><div class="t">${esc(f.name)}</div>
              <div class="s">${f.date?`выписан ${fmtDate(f.date)}${days!=null?` · ${days} дн. назад`:""}`:"без даты"}</div></div>
            <div class="amt neg">−${money(f.amount)}</div>
            <button class="edit" data-action="finePaid" data-id="${f.id}" title="оплачено">✅</button>
            <button class="del" data-action="fineDel" data-id="${f.id}">🗑</button></div>`;
        }
        return `<div class="item"><div class="ic">✅</div>
          <div class="meta"><div class="t">${esc(f.name)}</div>
            <div class="s">оплачен ${fmtDate(f.paidDate)}</div></div>
          <div class="amt">−${money(f.amount)}</div>
          <button class="del" data-action="fineDel" data-id="${f.id}">🗑</button></div>`;
      }).join("")}</div>` : `<div class="glass empty">Штрафов нет — так держать 👍</div>`}`;
}

/* ---------- ЧЕКИ: просмотр + выгрузка за период ---------- */
async function getReceiptExpenses(){
  const all = await dbAll("expenses");
  const pr = periodRange(state.receiptMode, state.receiptOffset);
  return all.filter(e=> e.receipt
    && (!pr.from || e.date >= pr.from) && (!pr.to || e.date <= pr.to)
    && (state.receiptCat==="all" || e.category===state.receiptCat))
    .sort((a,b)=> (b.date+b.id).localeCompare(a.date+a.id));
}
async function screenReceipts(){
  const pr = periodRange(state.receiptMode, state.receiptOffset);
  const list = await getReceiptExpenses();
  const sum = list.reduce((s,e)=>s+Number(e.amount||0),0);
  const byCat = {}; list.forEach(e=> byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0));

  const all = await dbAll("expenses");
  const allInPeriod = all.filter(e=> (!pr.from || e.date>=pr.from) && (!pr.to || e.date<=pr.to)
    && (state.receiptCat==="all" || e.category===state.receiptCat));
  const allSum = allInPeriod.reduce((s,e)=>s+Number(e.amount||0),0);

  const catChips = [["all","Все"],...Object.entries(CATS).map(([k,c])=>[k,c.ico])];

  return `
    <div class="row between">
      <div class="h1" style="margin:0">🧾 Чеки</div>
      <button class="btn sm ghost" data-action="nav" data-to="dash">← Назад</button>
    </div>
    <p class="muted small">просмотр и выгрузка чеков за период — чтобы всё посчиталось</p>

    <div class="rangebar">
      ${[["month","Месяц"],["quarter","Квартал"],["year","Год"],["all","Всё"]]
        .map(([k,t])=>`<button class="chip ${state.receiptMode===k?"on":""}" data-action="setReceiptMode" data-mode="${k}">${t}</button>`).join("")}
    </div>
    ${state.receiptMode!=="all" ? `
    <div class="periodnav">
      <button class="pbtn" data-action="receiptPrev">‹</button>
      <div class="plabel">${esc(pr.label)}</div>
      <button class="pbtn" data-action="receiptNext">›</button>
    </div>` : `<div class="periodnav"><div class="plabel">${esc(pr.label)}</div></div>`}

    <div class="chips" style="margin:6px 0">
      ${catChips.map(([k,t])=>`<span class="chip ${state.receiptCat===k?"on":""}" data-action="setReceiptCat" data-cat="${k}">${t}</span>`).join("")}
    </div>

    <div class="glass card">
      <div class="row between"><b>Чеков с прикреплённым скрином</b><b>${list.length}</b></div>
      <div class="row between"><span class="muted">сумма чеков</span><b>${money(sum)}</b></div>
      ${Object.entries(byCat).map(([k,v])=>`<div class="row between small"><span class="muted">${CATS[k]?.ico||""} ${CATS[k]?.t||k}</span><b>${money(v)}</b></div>`).join("")}
      <div class="divider"></div>
      <div class="row between small"><span class="muted">все расходы за период (вкл. без чеков)</span><b>${money(allSum)}</b></div>
    </div>

    <div class="h2">Выгрузить</div>
    <div class="glass card">
      <button class="btn primary" data-action="exportReceiptsHtml" ${list.length?"":"disabled"}>📄 Отчёт с чеками (HTML → PDF)</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="exportReceiptsZip" ${list.length?"":"disabled"}>📦 Чеки папкой (ZIP: jpg + итоги)</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="exportReceiptsCsv" ${list.length?"":"disabled"}>📊 Таблица чеков (CSV)</button>
      <div class="fszn-note">HTML открой в браузере → кнопка «🖨 Сохранить как PDF». ZIP = папка скринов с именами «дата_категория_сумма.jpg» + itogi.csv для Excel.</div>
    </div>

    <div class="h2">Галерея чеков</div>
    ${list.length? `<div class="list">${list.map(e=>{
        const c = CATS[e.category]||CATS.other;
        return `<div class="item">
          <img class="rthumb" src="${e.receipt}" data-action="viewReceipt" data-id="${e.id}" alt="чек">
          <div class="meta"><div class="t">${c.ico} ${c.t}${e.note?": "+esc(e.note):""}</div>
            <div class="s">${fmtDate(e.date)}</div></div>
          <div class="amt">−${money(e.amount)}</div>
        </div>`;}).join("")}</div>` : `<div class="glass empty">За этот период чеков нет</div>`}`;
}
function receiptsCsvText(list, pr){
  const sum = list.reduce((s,e)=>s+Number(e.amount||0),0);
  const byCat = {}; list.forEach(e=> byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0));
  const L = [];
  L.push(["BLVCK TAXI — чеки за "+pr.label]);
  L.push(["Фильтр категории", state.receiptCat==="all"?"все":(CATS[state.receiptCat]?.t||state.receiptCat)]);
  L.push(["Сформировано", today()]);
  L.push([]);
  L.push(["Дата","Категория","Заметка","Сумма "+cur()]);
  list.slice().sort((a,b)=> a.date.localeCompare(b.date))
    .forEach(e=> L.push([e.date, (CATS[e.category]?.t||e.category), e.note||"", e.amount]));
  L.push(["","","ИТОГО ЧЕКОВ", sum.toFixed(2)]);
  L.push([]);
  L.push(["ПО КАТЕГОРИЯМ"]);
  Object.entries(byCat).forEach(([k,v])=> L.push([(CATS[k]?.t||k), v.toFixed(2)]));
  return "\uFEFF" + L.map(r=> r.map(csvCell).join(";")).join("\r\n");
}
function exportReceiptsCsv(){
  getReceiptExpenses().then(list=>{
    if(!list.length){ toast("Нет чеков за период"); return; }
    const pr = periodRange(state.receiptMode, state.receiptOffset);
    download(`blvck-taxi-cheki-${pr.label.replace(/[^0-9A-Za-zа-яА-Я]/g,"")}.csv`, receiptsCsvText(list,pr), "text/csv;charset=utf-8");
    toast("CSV сохранён"); hapticOk();
  });
}
function exportReceiptsHtml(){
  getReceiptExpenses().then(list=>{
    if(!list.length){ toast("Нет чеков за период"); return; }
    const pr = periodRange(state.receiptMode, state.receiptOffset);
    const sum = list.reduce((s,e)=>s+Number(e.amount||0),0);
    const byCat = {}; list.forEach(e=> byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0));
    const rows = list.slice().sort((a,b)=> a.date.localeCompare(b.date)).map(e=>{
      const c = CATS[e.category]||CATS.other;
      return `<div class="rc"><img src="${e.receipt}" alt="чек"><div class="cap">${fmtDate(e.date)} · ${c.ico} ${esc(c.t)}${e.note?" · "+esc(e.note):""}<br><b>${money(e.amount)}</b></div></div>`;
    }).join("");
    const totRows = Object.entries(byCat).map(([k,v])=>`<tr><td>${CATS[k]?.ico||""} ${esc(CATS[k]?.t||k)}</td><td>${money(v)}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BLVCK TAXI — чеки за ${esc(pr.label)}</title>
<style>
 body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:18px;color:#15151f;background:#f4f5fa}
 h1{font-size:22px;margin:0 0 4px} .sub{color:#666;font-size:13px;margin:0 0 14px}
 .noprint{position:sticky;top:0;background:#f4f5fa;padding:8px 0 12px}
 button{background:#7c5cff;color:#fff;border:none;border-radius:12px;padding:12px 16px;font-size:15px;font-weight:700;cursor:pointer}
 table{border-collapse:collapse;width:100%;max-width:520px;margin:6px 0 18px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.06)}
 td{padding:9px 12px;border-bottom:1px solid #eee;font-size:14px} td:last-child{text-align:right;font-weight:700}
 tr.tot td{background:#eef0ff;font-weight:800}
 .rc{background:#fff;border-radius:14px;padding:10px;margin:10px 0;box-shadow:0 6px 20px rgba(0,0,0,.06);max-width:520px}
 .rc img{width:100%;border-radius:10px;display:block}
 .cap{font-size:13px;color:#444;margin-top:8px}
 @media print{ .noprint{display:none} body{background:#fff;padding:0} .rc{box-shadow:none;break-inside:avoid} }
</style></head><body>
<div class="noprint"><button onclick="window.print()">🖨 Сохранить как PDF / распечатать</button></div>
<h1>BLVCK TAXI — чеки за ${esc(pr.label)}</h1>
<p class="sub">Категория: ${state.receiptCat==="all"?"все":esc(CATS[state.receiptCat]?.t||state.receiptCat)} · чеков: ${list.length} · сформировано ${fmtDate(today())}</p>
<table>
 ${totRows}
 <tr class="tot"><td>ИТОГО ЧЕКОВ</td><td>${money(sum)}</td></tr>
</table>
${rows}
</body></html>`;
    download(`blvck-taxi-cheki-${pr.label.replace(/[^0-9A-Za-zа-яА-Я]/g,"")}.html`, html, "text/html;charset=utf-8");
    toast("HTML-отчёт сохранён"); hapticOk();
  });
}
function exportReceiptsZip(){
  getReceiptExpenses().then(list=>{
    if(!list.length){ toast("Нет чеков за период"); return; }
    const pr = periodRange(state.receiptMode, state.receiptOffset);
    const files = [];
    const used = {};
    list.slice().sort((a,b)=> a.date.localeCompare(b.date)).forEach(e=>{
      let base = `${e.date}_${e.category}_${Number(e.amount).toFixed(2).replace(".", "_")}`;
      let name = base + ".jpg"; let i=2;
      while(used[name]){ name = `${base}_${i}.jpg`; i++; } used[name]=1;
      files.push({name, data: b64ToBytes(e.receipt)});
    });
    files.push({name:"itogi.csv", data: strBytes(receiptsCsvText(list, pr))});
    const blob = buildZip(files);
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`blvck-taxi-cheki-${pr.label.replace(/[^0-9A-Za-zа-яА-Я]/g,"")}.zip`; a.click(); URL.revokeObjectURL(a.href);
    toast("ZIP сохранён"); hapticOk();
  });
}

/* ---------- ФСЗН + НАЛОГИ + ОТЧЁТЫ ---------- */
function fsznSettings(){
  return {
    mzp:  parseFloat(localStorage.getItem("blvck_fszn_mzp"))  || 726,
    rate: parseFloat(localStorage.getItem("blvck_fszn_rate")) || 35,
  };
}
async function screenFszn(){
  const s = fsznSettings();
  const year = YEAR(), cq = CUR_Q();
  const minMonth = s.rate/100 * s.mzp, minQ = minMonth*3, minYear = minMonth*12;

  const qs = []; let paidYTD=0, minYTD=0, paidAll=0, targetAll=0;
  for(let q=1;q<=4;q++){
    const rec = await dbGet("fszn", `${year}-Q${q}`) || {income:0, paid:0};
    const monthSum = quarterIncome(q, year);
    const income = monthSum>0 ? monthSum : (Number(rec.income)||0);
    const paid   = Number(rec.paid)||0;
    const fromIncome = income>0 ? s.rate/100*income : 0;
    const target = Math.max(minQ, fromIncome);
    let status, badge;
    if(q < cq){ status = paid>=target?"good":(paid>0?"warn":"bad"); badge = paid>=target?"✅ закрыто":(paid>0?"🟡 частично":"⏰ не уплачено"); }
    else if(q === cq){ status = paid>=target?"good":(paid>0?"warn":"soon"); badge = paid>=target?"✅ закрыто":(paid>0?"🟡 в процессе":"🔵 в процессе"); }
    else { status="soon"; badge="🔮 предстоит"; }
    qs.push({q, monthSum, manual: Number(rec.income)||0, paid, target, status, badge});
    if(q<=cq){ paidYTD+=paid; minYTD+=minQ; }
    paidAll+=paid; targetAll+=target;
  }
  const goal = Math.max(minYear, targetAll);
  const pctYear = goal>0 ? Math.min(100, Math.round(paidAll/goal*100)) : 0;
  const pctYTD  = minYTD>0 ? Math.min(100, Math.round(paidYTD/minYTD*100)) : 0;
  const rest = Math.max(0, goal - paidAll);
  const taxes = taxList().sort((a,b)=> (a.date||"9").localeCompare(b.date||"9"));

  return `
    <div class="row between">
      <div class="h1" style="margin:0">ИП · ${year}</div>
      <button class="btn sm ghost" data-action="nav" data-to="settings">← Назад</button>
    </div>
    <p class="muted small">взносы, сроки и отчёты · прикидка, НЕ официальный расчёт</p>

    <div class="glass card">
      <div class="row between"><b>ФСЗН — цель за год</b><span class="muted small">${money(goal)}</span></div>
      <div class="progress ${pctYear>=100?"good":""}"><i style="width:${pctYear}%"></i></div>
      <div class="row between small"><span class="muted">уплачено ${money(paidAll)}</span><b>${pctYear}%</b></div>
      <div class="divider"></div>
      <div class="row between small"><span class="muted">С начала года (Q1–Q${cq})</span><b>${money(paidYTD)} / ${money(minYTD)} · ${pctYTD}%</b></div>
      <div class="divider"></div>
      ${rest>0
        ? `<div class="alert bad" style="margin:0"><span>⏰</span><div><div style="font-weight:700">До 31 марта ${year+1}</div><div class="small muted">доплатить ≈ <b>${money(rest)}</b> (сверь в налоговой)</div></div></div>`
        : `<div class="alert good" style="margin:0"><span>✅</span><div><div style="font-weight:700">Минимум за год закрыт</div></div></div>`}
    </div>

    <div class="glass card"><b>По кварталам: надо / уплачено</b>${fsznBars(qs)}</div>

    <div class="h2">Кварталы</div>
    ${qs.map(q=>`
      <div class="glass qcard">
        <div class="qhead"><div class="qtitle">${q.q}-й квартал</div><span class="badge ${q.status}">${q.badge}</span></div>
        <div class="qmini"><span>минимум за квартал</span><b>${money(minQ)}</b></div>
        <div class="qmini"><span>доход (авто по дням/месяцам)</span><b>${q.monthSum>0?money(q.monthSum):"—"}</b></div>
        <div class="grid2">
          <div class="field" style="margin:8px 0 0"><label>Доход вручную (если не по дням)</label>
            <input class="input" type="number" inputmode="decimal" data-fszn="income" data-q="${q.q}" value="${q.manual||""}" placeholder="0"></div>
          <div class="field" style="margin:8px 0 0"><label>Уплачено взносов</label>
            <input class="input" type="number" inputmode="decimal" data-fszn="paid" data-q="${q.q}" value="${q.paid||""}" placeholder="0"></div>
        </div>
        <div class="qmini"><span>прикидка «к уплате»</span><b>${money(q.target)}</b></div>
      </div>`).join("")}

    <div class="h2">Сроки и налоги</div>
    <div class="glass card">
      <button class="btn primary" data-action="openAddTax">➕ Добавить напоминание</button>
      <p class="fszn-note">Заведи свои сроки (название + дата + повтор). Просроченные и близкие появятся баннером на главной. Даты ставишь ты — я не бухгалтер.</p>
    </div>
    ${taxes.length? `<div class="list">${taxes.map(r=>{
        const days = r.date? Math.round((new Date(r.date)-new Date())/86400000):null;
        const rep = r.repeat && r.repeat!=="none" ? ` · повтор: ${{month:"мес.",quarter:"квартал",year:"год"}[r.repeat]}` : "";
        return `<div class="item"><div class="ic">${days!=null&&days<0?"⛔":""}</div>
          <div class="meta"><div class="t">${esc(r.name)}</div>
            <div class="s">${r.date?fmtDate(r.date)+(days!=null?(days<0?" · просрочено":` · ${days} дн.`):""):"без даты"}${rep}</div></div>
          <button class="edit" data-action="taxPaid" data-id="${r.id}" title="уплачено">✅</button>
          <button class="del" data-action="taxDel" data-id="${r.id}">🗑</button></div>`;}).join("")}</div>`
      : `<div class="glass empty">Пока нет напоминаний</div>`}

    <div class="h2">Отчёты для бухгалтера</div>
    <div class="glass card">
      <p class="fszn-note" style="margin-top:0">CSV открывается в Excel / Google Sheets. Чеки за период — на экране «🧾 Чеки».</p>
      <button class="btn" data-action="exportCsvQ">📤 Сводка за квартал (CSV)</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="exportCsvY">📤 Сводка за год (CSV)</button>
    </div>

    <div class="glass card">
      <div class="row between"><b>Параметры ФСЗН</b><button class="btn sm" data-action="saveFsznSettings">💾 Сохранить</button></div>
      <div class="grid2">
        <div class="field"><label>МЗП за месяц (${year})</label><input id="fszn_mzp" class="input" type="number" inputmode="decimal" value="${s.mzp}"></div>
        <div class="field"><label>Ставка взносов, %</label><input id="fszn_rate" class="input" type="number" inputmode="decimal" value="${s.rate}"></div>
      </div>
      <div class="fszn-note">Мин. взнос за месяц = ставка × МЗП = <b>${money(minMonth)}</b>. Актуальные цифры сверяй на portal.ssf.gov.by / в налоговой.</div>
    </div>`;
}
function fsznBars(qs){
  const W=320, H=150, pad=20, max=Math.max(...qs.map(q=>Math.max(q.target,q.paid)),1), gw=(W-pad*2)/qs.length;
  const cols = qs.map((q,i)=>{
    const x=pad+i*gw, hT=(q.target/max)*(H-pad*2), hP=(q.paid/max)*(H-pad*2), yT=H-pad-hT, yP=H-pad-hP;
    const pct = q.target>0 ? Math.min(100,Math.round(q.paid/q.target*100)) : 0;
    return `<g>
      <rect x="${x+gw*0.12}" y="${yT}" width="${gw*0.30}" height="${hT}" rx="5" fill="var(--glass-strong)" stroke="var(--stroke)"/>
      <rect x="${x+gw*0.50}" y="${yP}" width="${gw*0.30}" height="${hP}" rx="5" fill="url(#g2)">
        <animate attributeName="height" from="0" to="${hP}" dur=".5s" fill="freeze"/>
        <animate attributeName="y" from="${H-pad}" to="${yP}" dur=".5s" fill="freeze"/></rect>
      <text x="${x+gw*0.5}" y="${H-6}" text-anchor="middle" fill="var(--muted)" font-size="9">Q${q.q}</text>
      <text x="${x+gw*0.5}" y="${Math.min(yT,yP)-5}" text-anchor="middle" fill="var(--text)" font-size="9" font-weight="700">${pct}%</text></g>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="margin-top:10px">
    <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>${cols}</svg>
    <div class="legend" style="margin-top:8px">
      <div class="li"><span class="dot" style="background:var(--glass-strong);border:1px solid var(--stroke)"></span>надо (прикидка)</div>
      <div class="li"><span class="dot" style="background:var(--accent)"></span>уплачено</div></div>`;
}
async function fsznMiniWidget(){
  const s = fsznSettings(), year = YEAR(), minYear = s.rate/100 * s.mzp * 12;
  let paid = 0; for(let q=1;q<=4;q++){ const r = await dbGet("fszn", `${year}-Q${q}`); paid += Number(r?.paid)||0; }
  const pct = minYear>0 ? Math.min(100, Math.round(paid/minYear*100)) : 0;
  return `<div class="glass card" data-action="openFszn" style="cursor:pointer">
      <div class="row between"><b>🧾 ФСЗН ${year}</b><span class="badge ${pct>=100?"good":(pct>0?"warn":"soon")}">${pct}%</span></div>
      <div class="progress ${pct>=100?"good":""}"><i style="width:${pct}%"></i></div>
      <div class="row between small"><span class="muted">уплачено ${money(paid)}</span><span class="muted">цель ${money(minYear)}</span></div>
    </div>`;
}

/* ---------- НАСТРОЙКИ ---------- */
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

    <div class="h2">Деньги, штрафы и чеки</div>
    <div class="glass card">
      <button class="btn primary" data-action="openDailyRev">💵 Выручка за день</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="openFines">🚨 Штрафы</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="openReceipts">🧾 Чеки и выгрузка</button>
    </div>

    <div class="h2">Режим ИП</div>
    <div class="glass card">
      <div class="row between">
        <div><div style="font-weight:700">Я индивидуальный предприниматель</div>
          <div class="muted small">включает ФСЗН, налоги и виджет взносов</div></div>
        <div class="switch">
          <span class="chip ${!ipOn?"on":""}" data-action="setIP" data-v="0">Нет</span>
          <span class="chip ${ipOn?"on":""}" data-action="setIP" data-v="1">Да</span>
        </div>
      </div>
      ${ipOn ? `<div style="height:10px"></div><button class="btn primary" data-action="openFszn">🧾 Открыть раздел ИП</button>` : ``}
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
      <p class="muted small" style="margin-top:0">Полная копия: расходы, чеки, доход, выручка по дням, штрафы, налоги, настройки ИП — всё в одном файле.</p>
      <button class="btn primary" data-action="export">⬇️ Сохранить копию</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="import">⬆️ Восстановить из файла</button>
    </div>
    <div class="h2">Опасная зона</div>
    <div class="glass card">
      <button class="btn danger" data-action="wipe">🧹 Удалить все данные</button>
      <p class="muted small" style="margin:8px 2px 0">Записей расходов: ${exps.length}</p>
    </div>
    <p class="muted small" style="text-align:center;margin-top:18px">BLVCK TAXI · офлайн · без серверов · бесплатно</p>`;
}

/* ---------- модалки ---------- */
function openModal(html){ const m=$("#modal"); m.innerHTML=`<div class="modal">${html}</div>`; m.hidden=false; try{TG?.BackButton?.show();}catch{} }
function closeModal(){ $("#modal").hidden=true; $("#modal").innerHTML=""; state.modalEditId=null; state.modalReceipt=null; try{TG?.BackButton?.hide();}catch{} }

function modalFuelQuick(){
  const p = fuelPresets();
  openModal(`
    <div class="mhead"><h3>⛽ Быстрая заправка</h3><button class="x" data-action="close">×</button></div>
    <p class="muted small" style="margin-top:0">один тап — расход записан на сегодня, без ввода цифр</p>
    <div class="presets">
      ${p.map(v=>`<button class="preset" data-action="fuelPreset" data-amt="${v}">${v}<span class="cur">${cur()}</span></button>`).join("")}
    </div>
    <button class="btn" data-action="quick" data-cat="fuel">✍️ Другая сумма</button>
    <div style="height:8px"></div>
    <button class="btn ghost sm" data-action="openFuelPresets" style="width:100%">⚙️ Настроить суммы</button>`);
}
function modalFuelPresets(){
  const p = fuelPresets();
  openModal(`
    <div class="mhead"><h3>⚙️ Суммы быстрой заправки</h3><button class="x" data-action="close">×</button></div>
    <div class="grid3">
      <div class="field"><label>Сумма 1</label><input id="fp0" class="input" type="number" inputmode="decimal" value="${p[0]}"></div>
      <div class="field"><label>Сумма 2</label><input id="fp1" class="input" type="number" inputmode="decimal" value="${p[1]}"></div>
      <div class="field"><label>Сумма 3</label><input id="fp2" class="input" type="number" inputmode="decimal" value="${p[2]}"></div>
    </div>
    <button class="btn primary" data-action="saveFuelPresets">Сохранить</button>`);
}
function openDrive(){
  const p = fuelPresets();
  const m = $("#modal");
  m.innerHTML = `<div class="drive">
    <div class="dhead"><div class="dtitle">🚦 За рулём</div><button class="x" data-action="close">×</button></div>
    <div class="dpresets">
      ${p.map(v=>`<button class="dbig" data-action="fuelPreset" data-amt="${v}">⛽ ${v}<span class="cur">${cur()}</span></button>`).join("")}
    </div>
    <div class="drow">
      <button class="dcat" data-action="driveCat" data-cat="wash">🫧 Мойка</button>
      <button class="dcat" data-action="driveCat" data-cat="repair">🔧 Ремонт</button>
      <button class="dcat" data-action="driveCat" data-cat="other">📦 Другое</button>
    </div>
    <button class="btn danger" data-action="close">✖ Выйти из режима</button>
  </div>`;
  m.hidden = false;
  try{ TG?.BackButton?.show(); }catch{}
}
/* выручка за день — можно за сегодня и за прошлые дни + мини-график по дням (с копейками, рамка не обрезается) */
async function modalDailyRev(){
  const exps = await dbAll("expenses");
  const miss = missingWorkDays(exps, daysAgo(34), today()).slice(0,14);
  const def = today();
  const rev = dailyRevOf(def); const target = getDailyTarget();

  // мини-график внесённой выручки по последним 14 дням — СУММЫ С КОПЕЙКАМИ; padding защищает рамку от обрезки по краям скролла
  const days = []; for(let i=13;i>=0;i--) days.push(daysAgo(i));
  const drm = dailyRevMap();
  const max = Math.max(...days.map(d=>dailyRevOf(d)), 1);
  const moShort = d => new Date(d+"T00:00:00").toLocaleDateString("ru-RU",{month:"short"});
  const chart = `<div class="fszn-note" style="margin:0 0 2px">Выручка по дням (с копейками) — чтобы не путать цифры. Тап по столбику = выбрать день и подставить сумму.</div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:6px 0 4px">
      <div style="display:flex;gap:6px;align-items:flex-end;height:168px;min-width:100%;padding:5px 6px;box-sizing:border-box">
        ${days.map((d,i)=>{
          const has = Object.prototype.hasOwnProperty.call(drm,d);
          const v = dailyRevOf(d);
          const barH = v>0 ? Math.max(6, Math.round(v/max*104)) : 6;
          const sel = d===def;
          const showMo = (i===0) || (moShort(d)!==moShort(days[i-1]));
          const dd = d.slice(8,10);
          const mo = moShort(d);
          const valTxt = has ? (v>0 ? Number(v).toLocaleString("ru-RU",{maximumFractionDigits:2}) : "0") : "·";
          return `<div class="revcol" data-action="pickDay" data-date="${d}" style="flex:1 0 46px;min-width:46px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;cursor:pointer;outline:${sel?'2px solid var(--accent2)':'none'};outline-offset:1px;border-radius:10px;padding:2px">
            <div style="font-size:10px;font-weight:800;color:var(--text);opacity:${v>0?1:.4};margin-bottom:3px;white-space:nowrap;letter-spacing:-.3px">${valTxt}</div>
            <div style="width:80%;height:${barH}px;border-radius:7px 7px 3px 3px;background:${v>0?'linear-gradient(180deg,#7c5cff,#22d3ee)':'var(--glass-strong)'};border:1px solid ${v>0?'transparent':'var(--stroke)'};transition:height .3s"></div>
            <div style="margin-top:4px;text-align:center;line-height:1.05">
              <div class="revdd" style="font-size:11px;font-weight:${sel?800:600};color:${sel?'var(--accent2)':'var(--muted)'}">${dd}</div>
              <div style="font-size:9px;color:var(--muted);visibility:${showMo?'visible':'hidden'}">${mo}</div>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;

  const chips = miss.length ? `<div class="field"><label>Быстро — рабочие дни без выручки</label>
      <div class="chips">${miss.map(d=>`<span class="chip" data-action="pickDay" data-date="${d}">${d.slice(8,10)}.${d.slice(5,7)}</span>`).join("")}</div>
      <div class="fszn-note">тап по дате подставит её в поле и подтянет сумму, если уже вносил</div></div>` : "";
  openModal(`
    <div class="mhead"><h3>💵 Выручка за день</h3><button class="x" data-action="close">×</button></div>
    <p class="muted small" style="margin-top:0">сегодня или любой прошлый день — доход месяца, тренд и карта выгодных дней пересчитаются сами</p>
    <div class="grid2">
      <div class="field"><label>Дата</label><input id="d_date" class="input" type="date" value="${def}"></div>
      <div class="field"><label>Выручка за день</label><input id="d_rev" class="input" type="number" inputmode="decimal" value="${rev||""}" placeholder="0"></div>
    </div>
    <div class="field" style="margin:6px 0 0">${chart}</div>
    ${chips}
    <div class="field"><label>План на день (необязательно, общий)</label><input id="d_target" class="input" type="number" inputmode="decimal" value="${target||""}" placeholder="сколько хочу привезти"></div>
    <button class="btn primary" data-action="saveDailyRev">Сохранить</button>`);
  setTimeout(()=> $("#d_rev")?.focus(), 60);
}
/* подсветка выбранного дня в мини-графике */
function highlightRevCol(date){
  document.querySelectorAll(".revcol").forEach(el=>{
    const on = el.dataset.date===date;
    el.style.outline = on ? "2px solid var(--accent2)" : "none";
    const dd = el.querySelector(".revdd");
    if(dd){ dd.style.color = on ? "var(--accent2)" : "var(--muted)"; dd.style.fontWeight = on ? "800":"600"; }
  });
}
function modalExpense(cat, edit=null){
  state.modalCat = edit ? edit.category : cat;
  state.modalEditId = edit ? edit.id : null;
  state.modalReceipt = edit?.receipt || null;
  const v = edit || {};
  openModal(`
    <div class="mhead"><h3>${edit?"✏️ Изменить":CATS[state.modalCat].ico+" "+CATS[state.modalCat].t}</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Сумма</label><input id="m_amount" class="input" type="number" inputmode="decimal" value="${v.amount??""}" placeholder="0" autofocus></div>
    <div class="grid2">
      <div class="field"><label>Дата</label><input id="m_date" class="input" type="date" value="${v.date||today()}"></div>
      <div class="field"><label>Пробег, км</label><input id="m_mileage" class="input" type="number" inputmode="numeric" value="${v.mileage??""}" placeholder="необяз."></div>
    </div>
    <div class="field"><label>Заметка</label><input id="m_note" class="input" value="${esc(v.note||"")}" placeholder="например: АЗС Лукойл"></div>
    <div class="field"><label>Чек / скриншот</label><div id="m_receipt_box">${receiptBoxHTML()}</div></div>
    <button class="btn primary" data-action="saveExpense">${edit?"Сохранить изменения":"Сохранить"}</button>`);
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
    <button class="btn primary" data-action="saveMaint">Сохранить</button>`);
}
function modalDoc(){
  openModal(`
    <div class="mhead"><h3>📄 Документ</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Быстрые названия</label>
      <div class="chips">${DOC_PRESETS.map(t=>`<span class="chip" data-action="docPreset" data-name="${esc(t)}">${esc(t)}</span>`).join("")}</div></div>
    <div class="field"><label>Название</label><input id="m_name" class="input" placeholder="Страховка / Техосмотр" autofocus></div>
    <div class="grid2">
      <div class="field"><label>Выдан</label><input id="m_issue" class="input" type="date"></div>
      <div class="field"><label>Действует до</label><input id="m_expiry" class="input" type="date"></div>
    </div>
    <div class="field"><label>Заметка</label><input id="m_note" class="input"></div>
    <button class="btn primary" data-action="saveDoc">Сохранить</button>`);
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
    <button class="btn primary" data-action="saveCar">Сохранить</button>`);
}
function modalTaxReminder(){
  openModal(`
    <div class="mhead"><h3>🗓 Напоминание по сроку</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Быстрые названия</label>
      <div class="chips">${TAX_PRESETS.map(t=>`<span class="chip" data-action="taxPreset" data-name="${esc(t)}">${esc(t)}</span>`).join("")}</div></div>
    <div class="field"><label>Название</label><input id="t_name" class="input" placeholder="Единый налог" autofocus></div>
    <div class="grid2">
      <div class="field"><label>Срок</label><input id="t_date" class="input" type="date" value="${today()}"></div>
      <div class="field"><label>Повтор</label>
        <select id="t_repeat" class="input">
          <option value="none">без повтора</option>
          <option value="month">каждый месяц</option>
          <option value="quarter">каждый квартал</option>
          <option value="year">каждый год</option>
        </select></div>
    </div>
    <button class="btn primary" data-action="saveTax">Сохранить</button>`);
}
function modalFine(){
  openModal(`
    <div class="mhead"><h3>🚨 Штраф</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Быстрые названия</label>
      <div class="chips">${FINE_PRESETS.map(t=>`<span class="chip" data-action="finePreset" data-name="${esc(t)}">${esc(t)}</span>`).join("")}</div></div>
    <div class="field"><label>За что</label><input id="f_name" class="input" placeholder="Камера / превышение" autofocus></div>
    <div class="grid2">
      <div class="field"><label>Сумма</label><input id="f_amount" class="input" type="number" inputmode="decimal" placeholder="0"></div>
      <div class="field"><label>Дата выписки</label><input id="f_date" class="input" type="date" value="${today()}"></div>
    </div>
    <button class="btn primary" data-action="saveFine">Сохранить как неоплаченный</button>`);
  setTimeout(()=> $("#f_name")?.focus(), 60);
}

/* ---------- действия ---------- */
async function fuelPreset(amt){
  const e = { id:uid(), category:"fuel", amount:amt, date:today(), mileage:null, note:"быстрая заправка" };
  await dbPut("expenses", e);
  closeModal(); toast(`Заправка ${money(amt)}`); hapticOk(); renderAsync();
}
function saveFuelPresets(){
  const a = [0,1,2].map(i=> parseFloat($("#fp"+i).value)||0);
  if(a.some(v=>v<=0)){ toast("Все суммы должны быть > 0"); hapticBad(); return; }
  setFuelPresets(a); closeModal(); toast("Суммы сохранены"); hapticOk();
}
function saveDailyRev(){
  const date = ($("#d_date")?.value) || today();
  const rev = parseFloat($("#d_rev").value)||0;
  const target = parseFloat($("#d_target").value)||0;
  setDailyRev(date, rev);
  setDailyTarget(target);
  closeModal();
  toast(rev>0 ? `Выручка ${money(rev)} · ${date===today()?"сегодня":fmtDate(date)}` : `Выручка за ${fmtDate(date)} очищена`);
  hapticOk(); renderAsync();
}
async function saveExpense(){
  const amount = parseFloat($("#m_amount").value);
  if(!amount || amount<=0){ toast("Введи сумму"); hapticBad(); return; }
  const mileage = parseFloat($("#m_mileage").value);
  const e = {
    id: state.modalEditId || uid(),
    category: state.modalCat, amount,
    date: $("#m_date").value || today(),
    mileage: mileage>0 ? mileage : null,
    note: $("#m_note").value.trim(),
    receipt: state.modalReceipt || null,
  };
  await dbPut("expenses", e);
  if(e.mileage){
    const car = await dbGet("car",1) || {id:1};
    if(!car.currentMileage || e.mileage > car.currentMileage){ car.currentMileage = e.mileage; await dbPut("car",car); }
  }
  closeModal(); toast(state.modalEditId?"Изменено":"Расход добавлен"); hapticOk(); renderAsync();
}
async function editExpense(id){ const rec = await dbGet("expenses", id); if(rec) modalExpense(rec.category, rec); }
async function saveMaint(){
  const title = $("#m_title").value.trim(); if(!title){ toast("Введи описание"); hapticBad(); return; }
  const mileage = parseFloat($("#m_mileage").value);
  await dbPut("maintenance",{ id:uid(), title, date:$("#m_date").value||today(), mileage: mileage>0?mileage:null, note:$("#m_note").value.trim() });
  closeModal(); toast("Событие ТО добавлено"); hapticOk(); renderAsync();
}
async function saveDoc(){
  const name = $("#m_name").value.trim(); if(!name){ toast("Введи название"); hapticBad(); return; }
  await dbPut("documents",{ id:uid(), name, issueDate:$("#m_issue").value||null, expiryDate:$("#m_expiry").value||null, note:$("#m_note").value.trim() });
  closeModal(); toast("Документ добавлен"); hapticOk(); renderAsync();
}
async function saveCar(){
  await dbPut("car",{ id:1, model:$("#m_model").value.trim(), plate:$("#m_plate").value.trim(),
    fuelPer100:parseFloat($("#m_fuel").value)||null, currentMileage:parseFloat($("#m_km").value)||0,
    lastOilMileage:parseFloat($("#m_oilkm").value)||0, oilInterval:parseFloat($("#m_oilint").value)||10000 });
  closeModal(); toast("Авто сохранено"); hapticOk(); renderAsync();
}
function saveFsznSettings(){
  const mzp = parseFloat($("#fszn_mzp").value)||0, rate = parseFloat($("#fszn_rate").value)||0;
  if(mzp<=0 || rate<=0){ toast("МЗП и ставка должны быть > 0"); hapticBad(); return; }
  localStorage.setItem("blvck_fszn_mzp", String(mzp)); localStorage.setItem("blvck_fszn_rate", String(rate));
  toast("Параметры сохранены"); hapticOk(); renderAsync();
}
async function saveFsznField(q, field, value){
  const id = `${YEAR()}-Q${q}`;
  const rec = await dbGet("fszn", id) || {id, year:YEAR(), quarter:q, income:0, paid:0};
  rec[field] = value; await dbPut("fszn", rec);
}
function saveIncome(){ const v = parseFloat($("#income_month").value)||0; setIncome(ymNow(), v); toast("Доход сохранён"); hapticOk(); renderAsync(); }
function saveEff(){
  setKm(ymNow(), parseFloat($("#eff_km").value)||0);
  setHours(ymNow(), parseFloat($("#eff_hours").value)||0);
  toast("Пробег и часы сохранены"); hapticOk(); renderAsync();
}

function saveTax(){
  const name = $("#t_name").value.trim(); if(!name){ toast("Введи название"); hapticBad(); return; }
  const list = taxList();
  list.push({ id:uid(), name, date:$("#t_date").value||null, repeat:$("#t_repeat").value });
  saveTaxList(list); closeModal(); toast("Напоминание добавлено"); hapticOk(); renderAsync();
}
function taxPaid(id){
  const list = taxList(); const r = list.find(x=>x.id===id); if(!r) return;
  if(r.repeat && r.repeat!=="none" && r.date){
    const d = new Date(r.date+"T00:00:00");
    if(r.repeat==="month") d.setMonth(d.getMonth()+1);
    if(r.repeat==="quarter") d.setMonth(d.getMonth()+3);
    if(r.repeat==="year") d.setFullYear(d.getFullYear()+1);
    r.date = d.toISOString().slice(0,10); saveTaxList(list);
    toast(`Отмечено · след. срок ${fmtDate(r.date)}`);
  } else {
    saveTaxList(list.filter(x=>x.id!==id)); toast("Удалено");
  }
  hapticOk(); renderAsync();
}
function taxDel(id){ saveTaxList(taxList().filter(x=>x.id!==id)); toast("Удалено"); haptic(); renderAsync(); }

function saveFine(){
  const name = $("#f_name").value.trim(); if(!name){ toast("Введи «за что»"); hapticBad(); return; }
  const amount = parseFloat($("#f_amount").value)||0; if(amount<=0){ toast("Введи сумму"); hapticBad(); return; }
  const list = finesList();
  list.push({ id:uid(), name, amount, date:$("#f_date").value||today(), paid:false, paidDate:null, expenseId:null });
  saveFinesList(list); closeModal(); toast("Штраф добавлен — висит долгом"); hapticOk(); renderAsync();
}
async function finePaid(id){
  const list = finesList(); const r = list.find(x=>x.id===id); if(!r || r.paid) return;
  r.paid = true; r.paidDate = today();
  const exp = { id:uid(), category:"other", amount:r.amount, date:today(), mileage:null, note:"Штраф: "+r.name, receipt:null };
  await dbPut("expenses", exp);
  r.expenseId = exp.id;
  saveFinesList(list); toast("Оплачено → ушло в расходы"); hapticOk(); renderAsync();
}
async function fineDel(id){
  if(!confirm("Удалить штраф?")) return;
  const list = finesList(); const r = list.find(x=>x.id===id);
  if(r && r.paid && r.expenseId){ await dbDel("expenses", r.expenseId); }
  saveFinesList(list.filter(x=>x.id!==id)); toast("Удалено"); haptic(); renderAsync();
}

/* ---------- CSV-отчёты (общие сводки) ---------- */
function csvCell(v){ v = String(v ?? ""); return /[";\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }
function download(name, text, type){
  const blob = (text instanceof Blob) ? text : new Blob([text], {type});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
async function exportCSV(kind){
  const year = YEAR();
  const q = CUR_Q();
  const months = kind==="quarter"
    ? [`${year}-${String((q-1)*3+1).padStart(2,"0")}`,`${year}-${String((q-1)*3+2).padStart(2,"0")}`,`${year}-${String((q-1)*3+3).padStart(2,"0")}`]
    : Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,"0")}`);
  const set = new Set(months);
  const exps = (await dbAll("expenses")).filter(e=> set.has(e.date.slice(0,7))).sort((a,b)=> a.date.localeCompare(b.date));
  const periodLabel = kind==="quarter" ? `${year} Q${q}` : `${year}`;
  const L = [];
  L.push(["BLVCK TAXI — сводка за "+periodLabel]);
  L.push(["Сформировано", today()]);
  L.push([]);
  L.push(["РАСХОДЫ"]);
  L.push(["Дата","Категория","Заметка","Пробег км","Есть чек","Сумма "+cur()]);
  let total = 0;
  exps.forEach(e=>{ total += Number(e.amount||0); L.push([e.date, (CATS[e.category]?.t||e.category), e.note||"", e.mileage||"", e.receipt?"да":"нет", e.amount]); });
  L.push(["","","","","ИТОГО", total.toFixed(2)]);
  L.push([]);
  L.push(["ПО КАТЕГОРИЯМ"]);
  const byCat = {}; exps.forEach(e=> byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0));
  Object.entries(byCat).forEach(([k,v])=> L.push([(CATS[k]?.t||k), v.toFixed(2)]));
  L.push([]);
  L.push(["ВЫРУЧКА ПО ДНЯМ"]);
  const drm = dailyRevMap();
  Object.keys(drm).filter(d=> set.has(d.slice(0,7))).sort().forEach(d=> L.push([d, Number(drm[d]).toFixed(2)]));
  L.push([]);
  L.push(["ДОХОД ПО МЕСЯЦАМ"]);
  months.forEach(ym=> L.push([monthLabel(ym), incomeOf(ym).toFixed(2)]));
  L.push([]);
  L.push(["ШТРАФЫ (оплаченные за период)"]);
  finesList().filter(f=> f.paid && set.has((f.paidDate||"").slice(0,7)))
    .sort((a,b)=> (a.paidDate||"").localeCompare(b.paidDate||""))
    .forEach(f=> L.push([f.paidDate, f.name, Number(f.amount).toFixed(2)]));
  if(isIP()){
    const s = fsznSettings();
    L.push([]); L.push(["ФСЗН ПО КВАРТАЛАМ"]);
    L.push(["Квартал","Доход","Минимум","Уплачено"]);
    const qs = kind==="quarter" ? [q] : [1,2,3,4];
    for(const qq of qs){
      const rec = await dbGet("fszn", `${year}-Q${qq}`) || {paid:0};
      const inc = quarterIncome(qq, year);
      L.push([`Q${qq}`, inc.toFixed(2), (s.rate/100*s.mzp*3).toFixed(2), (Number(rec.paid)||0).toFixed(2)]);
    }
  }
  const csv = "\uFEFF" + L.map(r=> r.map(csvCell).join(";")).join("\r\n");
  download(`blvck-taxi-${kind}-${periodLabel.replace(/\s/g,"")}.csv`, csv, "text/csv;charset=utf-8");
  toast("CSV сохранён"); hapticOk();
}

/* ---------- ПОЛНЫЙ бэкап ---------- */
const LS_KEYS = ["blvck_cur","blvck_theme","blvck_is_ip","blvck_income","blvck_km","blvck_hours",
  "blvck_fuel_presets","blvck_tax_reminders","blvck_fszn_mzp","blvck_fszn_rate","blvck_streak_best",
  "blvck_fines","blvck_daily_rev","blvck_daily_target","blvck_tg_name"];
async function exportBackup(){
  const data = { _app:"BLVCK TAXI", _v:3, _at:new Date().toISOString() };
  for(const s of STORES) data[s] = await dbAll(s);
  data._ls = Object.fromEntries(LS_KEYS.map(k=>[k, localStorage.getItem(k)]).filter(([,v])=>v!=null));
  download(`blvck-taxi-backup-${today()}.json`, JSON.stringify(data,null,2), "application/json");
  toast("Полная копия сохранена"); hapticOk();
}
function importBackup(){ $("#restoreInput").click(); }
async function handleRestoreFile(file){
  if(!file) return;
  try{
    const data = JSON.parse(await file.text());
    if(!confirm("Заменить ВСЕ текущие данные данными из файла?")) return;
    for(const s of STORES){ await dbClear(s); for(const v of (data[s]||[])) await dbPut(s,v); }
    if(data._ls && typeof data._ls==="object"){
      for(const k of LS_KEYS){
        if(data._ls[k]!=null) localStorage.setItem(k, data._ls[k]);
        else localStorage.removeItem(k);
      }
    }
    applyTheme();
    toast("Данные восстановлены полностью"); hapticOk(); renderAsync();
  }catch(e){ toast("Ошибка файла"); hapticBad(); }
}
async function wipe(){
  if(!confirm("Удалить ВСЕ данные приложения? Это необратимо.")) return;
  for(const s of STORES) await dbClear(s);
  LS_KEYS.filter(k=> k!=="blvck_theme" && k!=="blvck_cur").forEach(k=> localStorage.removeItem(k));
  toast("Всё удалено"); hapticOk(); renderAsync();
}

/* ---------- тема / валюта / ИП ---------- */
function applyTheme(){
  const t = localStorage.getItem("blvck_theme") || "dark";
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = t==="dark" ? "#0a0a0f" : "#eef0f7";
  syncTgColors();
}
function toggleTheme(){ const t = document.documentElement.dataset.theme==="dark"?"light":"dark"; localStorage.setItem("blvck_theme", t); applyTheme(); haptic(); renderAsync(); }
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
    s.style.transform = `scale(${.5+Math.random()*1.4})`;
    box.appendChild(s);
  }
}

/* ---------- события ---------- */
document.addEventListener("click", async (ev)=>{
  const el = ev.target.closest("[data-action]"); if(!el) return;
  const a = el.dataset.action; haptic("light");
  switch(a){
    case "nav":        state.screen = el.dataset.to; renderAsync(); break;
    case "quick":      modalExpense(el.dataset.cat); break;
    case "openFuelQuick": modalFuelQuick(); break;
    case "fuelPreset": fuelPreset(parseFloat(el.dataset.amt)); break;
    case "openFuelPresets": modalFuelPresets(); break;
    case "saveFuelPresets": saveFuelPresets(); break;
    case "openDrive":  openDrive(); break;
    case "driveCat":   closeModal(); modalExpense(el.dataset.cat); break;
    case "openDailyRev": await modalDailyRev(); break;
    case "pickDay": { const i=$("#d_date"); if(i){ i.value=el.dataset.date; const r=dailyRevOf(i.value); const ri=$("#d_rev"); if(ri) ri.value=r||""; highlightRevCol(i.value); ri?.focus(); } } break;
    case "saveDailyRev": saveDailyRev(); break;
    case "openFines":  state.screen = "fines"; renderAsync(); break;
    case "openAddFine":modalFine(); break;
    case "finePreset": { const i=$("#f_name"); if(i && !i.value) i.value = el.dataset.name; } break;
    case "saveFine":   saveFine(); break;
    case "finePaid":   await finePaid(el.dataset.id); break;
    case "fineDel":    await fineDel(el.dataset.id); break;
    case "openReceipts": state.screen = "receipts"; renderAsync(); break;
    case "setReceiptMode": state.receiptMode = el.dataset.mode; state.receiptOffset = 0; renderAsync(); break;
    case "receiptPrev": state.receiptOffset--; renderAsync(); break;
    case "receiptNext": state.receiptOffset++; renderAsync(); break;
    case "setReceiptCat": state.receiptCat = el.dataset.cat; renderAsync(); break;
    case "exportReceiptsHtml": exportReceiptsHtml(); break;
    case "exportReceiptsZip":  exportReceiptsZip(); break;
    case "exportReceiptsCsv":  exportReceiptsCsv(); break;
    case "editExpense":await editExpense(el.dataset.id); break;
    case "pickReceipt":     await addReceiptFromPicker(); break;
    case "clearReceipt":    state.modalReceipt=null; { const b=$("#m_receipt_box"); if(b) b.innerHTML=receiptBoxHTML(); } haptic(); break;
    case "viewReceiptCurrent": if(state.modalReceipt) openReceiptViewer(state.modalReceipt); break;
    case "viewReceipt": { const r=await dbGet("expenses", el.dataset.id); if(r?.receipt) openReceiptViewer(r.receipt); } break;
    case "openEditCar":modalCar(); break;
    case "openAddMaint":modalMaint(); break;
    case "openAddDoc": modalDoc(); break;
    case "docPreset":  { const i=$("#m_name"); if(i && !i.value) i.value = el.dataset.name; } break;
    case "openFszn":   state.screen = "fszn"; renderAsync(); break;
    case "openAddTax": modalTaxReminder(); break;
    case "taxPreset":  { const i=$("#t_name"); if(i && !i.value) i.value = el.dataset.name; } break;
    case "saveExpense":await saveExpense(); break;
    case "saveMaint":  await saveMaint(); break;
    case "saveDoc":    await saveDoc(); break;
    case "saveCar":    await saveCar(); break;
    case "saveFsznSettings": saveFsznSettings(); break;
    case "saveTax":    saveTax(); break;
    case "taxPaid":    taxPaid(el.dataset.id); break;
    case "taxDel":     taxDel(el.dataset.id); break;
    case "setIncome":  saveIncome(); break;
    case "setEff":     saveEff(); break;
    case "exportCsvQ": exportCSV("quarter"); break;
    case "exportCsvY": exportCSV("year"); break;
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
document.addEventListener("change", async (ev)=>{
  const el = ev.target;
  if(el && el.id==="d_date"){ const r=dailyRevOf(el.value); const ri=$("#d_rev"); if(ri) ri.value = r||""; highlightRevCol(el.value); return; }
  const f = ev.target.closest("[data-fszn]"); if(!f) return;
  await saveFsznField(f.dataset.q, f.dataset.fszn, parseFloat(f.value)||0);
  hapticOk(); renderAsync();
});
$("#modal").addEventListener("click", e=>{ if(e.target.id==="modal") closeModal(); });
$("#restoreInput").addEventListener("change", e=> handleRestoreFile(e.target.files[0]));

/* ---------- старт ---------- */
(async function init(){
  applyTheme(); makeParticles(); setupTelegram();
  await openDB(); await renderAsync();
  const act = new URLSearchParams(location.search).get("act");
  if(act){
    history.replaceState(null, "", location.pathname + location.hash);
    if(act==="fuel") modalFuelQuick();
    else if(CATS[act]) modalExpense(act);
  }
  if("serviceWorker" in navigator){
    window.addEventListener("load", ()=> navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
})();