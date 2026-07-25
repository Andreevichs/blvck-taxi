/* =========================================================
   BLVCK TAXI — instrument minimalism 2026 (black/white/orange)
   vanilla, без зависимостей. IndexedDB + localStorage. Офлайн. Без сервера.
   СОХРАНЕНИЕ на Android/Telegram: главный путь = «на экране → Печать/PDF»
   (системный print-поток, не блокируется), плюс blob-скачивание, плюс
   «Поделиться», плюс «в браузере» (с пометкой, что на Android может не ходить).
   + экран «Расходы» + полный отчёт + износ деталей + всё остальное.
   ========================================================= */

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
    TG.BackButton.onClick(()=> closeModal());
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
const WEAR_CATS = ["fuel","repair","parts"];
const CURS = ["BYN","₽","$","€","₸"];
const TABS = [
  { id:"dash", ico:"🏠", t:"Главная" }, { id:"stats", ico:"📊", t:"Графики" },
  { id:"car", ico:"🚗", t:"Авто" }, { id:"docs", ico:"📄", t:"ТО/Доки" }, { id:"settings", ico:"⚙️", t:"Ещё" },
];
const TAX_PRESETS = ["Единый налог","ФСЗН за квартал","Подоходный (аванс)","Декларация","Налог на проф. доход"];
const FINE_PRESETS = ["Камера / превышение","Парковка","Ремень / телефон за рулём","Нет оклейки / шашечек","Нет карточки водителя","Просрочен техосмотр / страховка","Тонировка"];
const DOC_PRESETS = ["Медсправка водителя","Карточка водителя такси","Оклейка / шашечки","Страховка (ОСГОП)","Техосмотр"];
const WD = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const WD_ORDER = [1,2,3,4,5,6,0];

const state = { screen:"dash", range:"month", modalCat:"fuel", modalEditId:null, modalReceipt:null,
                receiptMode:"quarter", receiptOffset:0, receiptCat:"all", _animateScreen:true,
                expRange:"30", expScale:"day", expCat:"all", expQ:"" };

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
  if(mode==="quarter"){ let q=CUR_Q()-1+offset,y=now.getFullYear(); while(q<0){q+=4;y--;} while(q>3){q-=4;y++;} const m0=q*3;
    return {from:new Date(y,m0,1).toISOString().slice(0,10), to:new Date(y,m0+3,0).toISOString().slice(0,10), label:`${y} · Q${q+1}`}; }
  const y=now.getFullYear()+offset; return {from:`${y}-01-01`, to:`${y}-12-31`, label:`${y}`};
}
function expWindow(range){
  const now=new Date(); const to=today();
  if(range==="all") return {from:null,to,label:"Всё время"};
  if(range==="7")  return {from:daysAgo(6),to,label:"7 дней"};
  if(range==="30") return {from:daysAgo(29),to,label:"30 дней"};
  if(range==="month"){ const y=now.getFullYear(),m=now.getMonth(); return {from:new Date(y,m,1).toISOString().slice(0,10),to:new Date(y,m+1,0).toISOString().slice(0,10),label:monthLabel(ymNow())}; }
  if(range==="quarter"){ const pr=periodRange("quarter",0); return {from:pr.from,to:pr.to,label:pr.label}; }
  if(range==="year"){ const y=now.getFullYear(); return {from:`${y}-01-01`,to:`${y}-12-31`,label:`${y}`}; }
  return {from:null,to,label:"Всё время"};
}
const BIG_RANGE = r => (r==="quarter"||r==="year"||r==="all");

/* ---------- localStorage ---------- */
const _map  = k => { try{ return JSON.parse(localStorage.getItem(k)||"{}"); }catch{ return {}; } };
const _set  = (k,ym,v) => { const m=_map(k); if(v>0) m[ym]=v; else delete m[ym]; localStorage.setItem(k, JSON.stringify(m)); };
const _list = k => { try{ return JSON.parse(localStorage.getItem(k)||"[]"); }catch{ return []; } };
const _saveList = (k,a) => localStorage.setItem(k, JSON.stringify(a));

const rawIncomeOf = ym => Number(_map("blvck_income")[ym])||0;
const kmOf = ym => Number(_map("blvck_km")[ym])||0;
const hoursOf = ym => Number(_map("blvck_hours")[ym])||0;
const setIncome = (ym,v)=>_set("blvck_income",ym,v);
const setKm = (ym,v)=>_set("blvck_km",ym,v);
const setHours = (ym,v)=>_set("blvck_hours",ym,v);
const dailyRevMap = () => _map("blvck_daily_rev");
const dailyRevOf = d => Number(dailyRevMap()[d])||0;
const setDailyRev = (d,v)=>_set("blvck_daily_rev",d,v);
function sumDaysForYM(ym){ const m=dailyRevMap(); let s=0,n=0; for(const k in m){ if(k.startsWith(ym+"-")&&Number(m[k])>0){s+=Number(m[k]);n++;} } return {sum:s,n}; }
function incomeSource(ym){ const d=sumDaysForYM(ym); if(d.sum>0) return {src:"days",val:d.sum,n:d.n}; const m=rawIncomeOf(ym); if(m>0) return {src:"manual",val:m,n:0}; return {src:"none",val:0,n:0}; }
const incomeOf = ym => incomeSource(ym).val;
function quarterIncome(q,year){ let s=0; for(let mo=(q-1)*3+1; mo<=(q-1)*3+3; mo++) s+=incomeOf(`${year}-${String(mo).padStart(2,"0")}`); return s; }
function missingWorkDays(exps,from,to){ const e=new Set(exps.filter(x=>x.date>=from&&x.date<=to).map(x=>x.date)); const r=dailyRevMap(); return [...e].filter(d=>!(Number(r[d])>0)).sort().reverse(); }
const getDailyTarget = () => Number(localStorage.getItem("blvck_daily_target"))||0;
const setDailyTarget = v => { if(v>0) localStorage.setItem("blvck_daily_target",String(v)); else localStorage.removeItem("blvck_daily_target"); };
const fuelPresets = () => { try{ const a=JSON.parse(localStorage.getItem("blvck_fuel_presets")); return Array.isArray(a)&&a.length===3?a:[50,80,120]; }catch{ return [50,80,120]; } };
const setFuelPresets = a => localStorage.setItem("blvck_fuel_presets", JSON.stringify(a));
const taxList = () => _list("blvck_tax_reminders");
const saveTaxList = a => _saveList("blvck_tax_reminders", a);
const finesList = () => _list("blvck_fines");
const saveFinesList = a => _saveList("blvck_fines", a);

function calcStreak(set){ const d=new Date(); d.setHours(0,0,0,0); const k=t=>t.toISOString().slice(0,10); let c=0;
  if(!set.has(k(d))){ d.setDate(d.getDate()-1); if(!set.has(k(d))) return 0; } while(set.has(k(d))){c++;d.setDate(d.getDate()-1);} return c; }
function bestStreak(set){ if(!set.size) return 0; const a=[...set].sort(); let b=1,r=1;
  for(let i=1;i<a.length;i++){ const df=Math.round((new Date(a[i]+"T00:00:00")-new Date(a[i-1]+"T00:00:00"))/86400000); if(df===1){r++;b=Math.max(b,r);}else r=1; } return b; }
function weekdayAvg(){ const m=dailyRevMap(); const s=[0,0,0,0,0,0,0],c=[0,0,0,0,0,0,0];
  for(const k in m){ const v=Number(m[k]); if(v>0){ const d=new Date(k+"T00:00:00").getDay(); s[d]+=v; c[d]++; } }
  const avg=s.map((x,i)=>c[i]?x/c[i]:0); let b=-1,bi=-1; avg.forEach((x,i)=>{ if(c[i]&&x>b){b=x;bi=i;} }); return {avg,cnt:c,bestIdx:bi}; }
function trendPct(c,p){ if(p<=0) return c>0?{dir:"up",pct:null}:{dir:"flat",pct:null}; const pct=Math.round((c-p)/p*100); return {dir:pct>0?"up":pct<0?"down":"flat",pct}; }
const arrow = d => d==="up"?"↑":d==="down"?"↓":"→";

/* =========================================================
   СОХРАНЕНИЕ ФАЙЛОВ
   В Telegram прямой путь в папку закрыт платформой. Поэтому:
   1) пробуем системное «Поделиться» (если включено в сборке);
   2) вне Telegram — скачиваем напрямую;
   3) иначе возвращаем «нужен chooser», и интерфейс даёт честный
      выбор, где ГЛАВНЫЙ путь = «на экране → Печать/PDF»
      (системный print-поток, не блокируется на Android).
   ========================================================= */
function makeFile(name, content, mime){
  const blob = (content instanceof Blob) ? content : new Blob([content], {type: mime||"application/octet-stream"});
  try{ return new File([blob], name, {type: mime||blob.type||"application/octet-stream"}); }
  catch(e){ return blob; }
}
function blobToDataUrl(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(blob); }); }
function strToDataUrl(content, mime){ return "data:"+(mime||"application/octet-stream")+";base64,"+btoa(unescape(encodeURIComponent(content))); }
async function dataUrlFor(content, mime){ return (content instanceof Blob) ? await blobToDataUrl(content) : strToDataUrl(content, mime); }

async function shareFiles(name, content, mime, opts={}){
  const file = makeFile(name, content, mime);
  try{
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({ files:[file], title: opts.title||"BLVCK TAXI", text: opts.text||name });
      return {ok:true};
    }
  }catch(e){ if(e && e.name==="AbortError") return {aborted:true}; }
  return {ok:false};
}
async function openBrowserWith(name, content, mime){
  let dataUrl;
  try{ dataUrl = await dataUrlFor(content, mime); }catch(e){ return {ok:false}; }
  let opened=false;
  try{ if(TG && TG.openLink){ TG.openLink(dataUrl); opened=true; } }catch(e){}
  if(!opened){ try{ const w=window.open(dataUrl,"_blank"); opened = !!w; }catch(e){} }
  return {ok:opened};
}
async function saveFile(name, content, mime, opts={}){
  const sr = await shareFiles(name, content, mime, opts);
  if(sr.ok) return {ok:true, via:"share"};
  if(sr.aborted) return {ok:false, via:"share", aborted:true};
  if(window.showSaveFilePicker){
    try{
      const ex=(/\.([a-z0-9]+)$/i.exec(name)||[,"bin"])[1];
      const h=await window.showSaveFilePicker({ suggestedName:name, types:[{ description:opts.desc||"Файл BLVCK TAXI", accept:{[mime||"application/octet-stream"]:["."+ex]} }] });
      const w=await h.createWritable(); await w.write(makeFile(name,content,mime)); await w.close();
      return {ok:true, via:"picker"};
    }catch(e){ if(e && e.name==="AbortError") return {ok:false, via:"picker", aborted:true}; }
  }
  if(!isTelegram){
    try{
      const href = await dataUrlFor(content, mime);
      const a=document.createElement("a"); a.href=href; a.download=name; a.rel="noopener";
      document.body.appendChild(a); a.click(); a.remove();
      return {ok:true, via:"download"};
    }catch(e){ return {ok:false, via:"download"}; }
  }
  return {ok:false, via:"chooser", name, content, mime, htmlView: opts.htmlView||null};
}
function handleSaveResult(r, opts={}){
  if(r.aborted) return;
  if(r.ok){
    hapticOk();
    toast(r.via==="share" ? "Готово" : r.via==="picker" ? "Сохранено" : "Сохранено в «Загрузки»");
    return;
  }
  showSaveChooser({
    name: r.name || opts.name,
    content: (r.content!==undefined ? r.content : opts.content),
    mime: r.mime || opts.mime,
    htmlView: r.htmlView || opts.htmlView || null,
  });
}
function showSaveChooser(opts){
  window.__bt_help = opts;
  const isHtml = !!opts.htmlView;
  const btns = [];
  if(isHtml){
    btns.push(`<button class="btn primary" data-action="helpViewPrint">📄 На экране → Сохранить как PDF</button>`);
    btns.push(`<button class="btn" data-action="helpDownload">⬇️ Скачать .html файл</button>`);
  } else {
    btns.push(`<button class="btn primary" data-action="helpDownload">⬇️ Скачать файл</button>`);
  }
  btns.push(`<button class="btn" data-action="helpShare">📂 Через меню «Поделиться»</button>`);
  btns.push(`<button class="btn ghost" data-action="helpBrowser">🌐 В браузере (на Android может не открыться)</button>`);
  openModal(`<div class="mhead"><h3>Куда сохранить?</h3><button class="x" data-action="close">×</button></div>
    <div class="info" style="opacity:1;transform:none"><div class="it"><span class="d"></span>Telegram не даёт сохранить в папку напрямую</div>
    <p>Это ограничение мессенджера на Android, не поломка и не твой телефон. Самый надёжный путь — <b>«📄 На экране → PDF»</b>: отчёт откроется на белом экране, сверху кнопка печати, и система сама сохранит PDF. Кнопка <b>«⬇️ Скачать»</b> иногда кладёт файл в «Загрузки» — проверь. Чтобы заработало и <b>«📂 Поделиться»</b> напрямую — поставь свежий Telegram официальным apk с <b>telegram.org</b> (поверх старого, чаты останутся): там включена отдача файлов.</p></div>
    ${btns.join('<div style="height:10px"></div>')}`);
}
/* просмотрщик отчёта: белый полноэкранный слой + печать самого документа */
function openHtmlViewer(html){
  const m=$("#modal");
  m.innerHTML=`<div class="viewer" style="cursor:default;background:#fff;padding:0;display:flex;flex-direction:column">
    <div style="display:flex;gap:8px;align-items:center;padding:10px 12px;background:#fff;border-bottom:1px solid #eee;flex:none">
      <button class="btn primary sm" id="bt_print" style="flex:1">🖨 Сохранить как PDF / распечатать</button>
      <button class="x" data-action="close" style="position:static;background:#111;color:#fff;border-radius:50%;width:42px;height:42px;display:grid;place-items:center">✕</button>
    </div>
    <iframe id="bt_report" srcdoc="${esc(html)}" style="flex:1;width:100%;border:0;background:#fff;display:block"></iframe>
  </div>`;
  m.hidden=false; try{TG?.BackButton?.show();}catch{}
  const ifr=$("#bt_report");
  const doPrint=()=>{ try{ ifr.contentWindow.focus(); ifr.contentWindow.print(); }catch(e){ toast("Печать не запустилась — сделай скриншоты или обнови Telegram"); } };
  const pb=$("#bt_print"); if(pb) pb.addEventListener("click", doPrint);
  ifr.addEventListener("load", ()=>{ try{ const b=ifr.contentDocument && ifr.contentDocument.querySelector(".noprint button"); if(b) b.addEventListener("click", doPrint); }catch(e){} });
}
async function helpDownload(){
  const h=window.__bt_help; if(!h) return;
  try{
    const blob = (h.content instanceof Blob)? h.content : new Blob([h.content],{type:h.mime||"application/octet-stream"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=h.name||"blvck-taxi-file"; a.rel="noopener";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000);
    hapticOk(); closeModal(); toast("Проверь «Загрузки». Если пусто — используй «На экране → PDF»");
  }catch(e){ toast("Не вышло скачать — попробуй «На экране → PDF»"); }
}

/* ---------- визуальные хелперы ---------- */
function ringSVG(pct){ const r=30, c=2*Math.PI*r, off=c*(1-Math.min(100,Math.max(0,pct))/100);
  return `<svg class="ring" viewBox="0 0 76 76"><circle class="ring-bg" cx="38" cy="38" r="${r}"/><circle class="ring-fg" cx="38" cy="38" r="${r}" transform="rotate(-90 38 38)" stroke-dasharray="${c.toFixed(1)}" style="stroke-dashoffset:${c.toFixed(1)}" data-ring="${off.toFixed(1)}"/><text class="ring-t" x="38" y="39">${Math.round(pct)}%</text></svg>`; }
function sparkSVG(vals){ const w=300,h=62,p=6,n=vals.length; if(n<2) return "";
  const max=Math.max(...vals,1), min=Math.min(...vals,0), span=Math.max(max-min,1);
  const X=i=>p+i*((w-2*p)/(n-1)), Y=v=>h-p-((v-min)/span)*(h-2*p);
  let line=""; vals.forEach((v,i)=>{ line+=(i?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)+" "; });
  const area=line+`L${X(n-1).toFixed(1)} ${h-p} L${X(0).toFixed(1)} ${h-p} Z`;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path class="spark-area" d="${area}"/><path class="spark-line" pathLength="1" d="${line}"/><circle class="spark-dot" cx="${X(n-1).toFixed(1)}" cy="${Y(vals[n-1]).toFixed(1)}" r="3.6"/></svg>`; }
function countUp(el,to,dec,pre,suf){ const dur=780,t0=performance.now();
  (function step(t){ const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3), v=to*e;
    el.textContent=pre+v.toLocaleString("ru-RU",{maximumFractionDigits:dec})+suf; if(p<1) requestAnimationFrame(step); })(t0); }

/* ---------- чек / скриншот ---------- */
function pickImage(){ return new Promise(res=>{ const i=document.createElement("input"); i.type="file"; i.accept="image/*"; i.onchange=()=>res(i.files&&i.files[0]?i.files[0]:null); i.click(); }); }
function compressImage(file,maxSide,quality){ return new Promise((res,rej)=>{ const fr=new FileReader();
  fr.onload=()=>{ const img=new Image(); img.onload=()=>{ let w=img.width,h=img.height; const s=Math.min(1,maxSide/Math.max(w,h)); w=Math.max(1,Math.round(w*s)); h=Math.max(1,Math.round(h*s));
    const c=document.createElement("canvas"); c.width=w; c.height=h; const x=c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,w,h); x.drawImage(img,0,0,w,h); res(c.toDataURL("image/jpeg",quality)); }; img.onerror=rej; img.src=fr.result; }; fr.onerror=rej; fr.readAsDataURL(file); }); }
async function addReceiptFromPicker(){ const f=await pickImage(); if(!f) return;
  try{ state.modalReceipt=await compressImage(f,1400,.75); const b=$("#m_receipt_box"); if(b) b.innerHTML=receiptBoxHTML(); toast("Чек прикреплён"); hapticOk(); }catch(e){ toast("Не удалось прочитать фото"); hapticBad(); } }
function receiptBoxHTML(){ if(state.modalReceipt){ return `<div class="rcpt"><img src="${state.modalReceipt}" data-action="viewReceiptCurrent" alt="чек"><div class="rcpt-actions"><button class="btn sm" data-action="pickReceipt">🔄 Заменить</button><button class="btn sm danger" data-action="clearReceipt">🗑 Убрать чек</button></div></div>`; }
  return `<button class="btn" data-action="pickReceipt">🧾 Прикрепить чек / скриншот</button><div class="fszn-note">фото или скрин электронного чека сожмётся и сохранится вместе с расходом — и попадёт в резервную копию</div>`; }
function openReceiptViewer(src){ const m=$("#modal"); m.innerHTML=`<div class="viewer" data-action="close"><button class="x vclose" data-action="close">×</button><img src="${src}" alt="чек"></div>`; m.hidden=false; try{TG?.BackButton?.show();}catch{} }

/* ---------- ZIP ---------- */
const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC_TABLE[(c^b[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function b64ToBytes(u){const b=u.split(",")[1]||"",bin=atob(b),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;}
function strBytes(s){return new TextEncoder().encode(s);}
function buildZip(files){const parts=[],central=[];let offset=0;const U=0x0800;
  for(const f of files){const nb=strBytes(f.name),crc=crc32(f.data),sz=f.data.length;
    const lh=new ArrayBuffer(30),lv=new DataView(lh);lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,U,true);lv.setUint32(14,crc,true);lv.setUint32(18,sz,true);lv.setUint32(22,sz,true);lv.setUint16(26,nb.length,true);
    parts.push(new Uint8Array(lh),nb,f.data);
    const ch=new ArrayBuffer(46),cv=new DataView(ch);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,U,true);cv.setUint32(14,crc,true);cv.setUint32(18,sz,true);cv.setUint32(22,sz,true);cv.setUint16(26,nb.length,true);cv.setUint32(42,offset,true);
    central.push(new Uint8Array(ch),nb);offset+=30+nb.length+sz;}
  const cd=offset;let cs=0;central.forEach(p=>cs+=p.length);
  const e=new ArrayBuffer(22),ev=new DataView(e);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,cs,true);ev.setUint32(16,cd,true);
  return new Blob([...parts,...central,new Uint8Array(e)],{type:"application/zip"});}

function toast(msg){ const t=$("#toast"); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,1800); }

/* ---------- IndexedDB ---------- */
const DB_NAME="blvcktaxi", DB_VER=2, STORES=["expenses","maintenance","documents","car","fszn"]; let db;
function openDB(){ return new Promise((res,rej)=>{ const req=indexedDB.open(DB_NAME,DB_VER);
  req.onupgradeneeded=()=>{ const d=req.result;
    if(!d.objectStoreNames.contains("expenses")){ const s=d.createObjectStore("expenses",{keyPath:"id"}); s.createIndex("date","date"); s.createIndex("category","category"); }
    if(!d.objectStoreNames.contains("maintenance")) d.createObjectStore("maintenance",{keyPath:"id"}).createIndex("date","date");
    if(!d.objectStoreNames.contains("documents")) d.createObjectStore("documents",{keyPath:"id"}).createIndex("expiryDate","expiryDate");
    if(!d.objectStoreNames.contains("car")) d.createObjectStore("car",{keyPath:"id"});
    if(!d.objectStoreNames.contains("fszn")) d.createObjectStore("fszn",{keyPath:"id"}); };
  req.onsuccess=()=>{ db=req.result; res(db); }; req.onerror=()=>rej(req.error); }); }
function tx(s,m="readonly"){ return db.transaction(s,m).objectStore(s); }
function reqP(r){ return new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
const dbPut=(s,v)=>reqP(tx(s,"readwrite").put(v));
const dbDel=(s,id)=>reqP(tx(s,"readwrite").delete(id));
const dbGet=(s,id)=>reqP(tx(s).get(id));
const dbAll=(s)=>reqP(tx(s).getAll());
const dbClear=(s)=>reqP(tx(s,"readwrite").clear());

/* ---------- рендер + post-render ---------- */
let revealIO=null, revealGen=0;
async function renderAsync(){
  const app=$("#app"); app.style.animation="none"; void app.offsetWidth; app.style.animation="";
  const html = await ({ dash:screenDash, stats:screenStats, car:screenCar, docs:screenDocs, settings:screenSettings, fszn:screenFszn, fines:screenFines, receipts:screenReceipts, expenses:screenExpenses }[state.screen])();
  const showOnboard = !onboarded();
  app.innerHTML = (showOnboard?onboardHTML():"") + html;
  renderTabs();
  const tb=$("#tabbar"); if(tb) tb.style.display = showOnboard ? "none" : "";
  postRender();
}
function postRender(){
  const anim = state._animateScreen;
  if(revealIO){ revealIO.disconnect(); revealIO=null; }
  const gen = ++revealGen;
  const SEL=".app .glass,.app .item,.app .alert,.app .h1,.app .h2,.app .qcard-f,.app .hero,.app .quickrow,.app .streak,.app .toolgrid,.app .metricrow,.app .today,.app .sparkcard,.app .seg,.app .searchwrap,.app .info";
  const els=[...document.querySelectorAll(SEL)];
  requestAnimationFrame(()=>{
    document.querySelectorAll("[data-ring]").forEach(c=>{ c.style.strokeDashoffset=c.getAttribute("data-ring"); });
    document.querySelectorAll("[data-bar]").forEach(i=>{ i.style.width=i.getAttribute("data-bar"); });
    document.querySelectorAll(".seg").forEach(seg=>{ const on=seg.querySelector("button.on"); const th=seg.querySelector(".thumb"); if(on&&th){ th.style.width=on.offsetWidth+"px"; th.style.transform=`translateX(${on.offsetLeft-4}px)`; } });
  });
  document.querySelectorAll("[data-count]").forEach(el=>{
    const to=parseFloat(el.getAttribute("data-count"))||0, dec=parseInt(el.getAttribute("data-dec")||"2",10), pre=el.getAttribute("data-prefix")||"", suf=el.getAttribute("data-suffix")||"";
    if(anim) countUp(el,to,dec,pre,suf); else el.textContent=pre+to.toLocaleString("ru-RU",{maximumFractionDigits:dec})+suf;
  });
  if(!anim){ els.forEach(el=>el.classList.add("revealed")); state._animateScreen=false; return; }
  let i=0;
  const io=new IntersectionObserver((entries)=>{
    if(gen!==revealGen) return;
    entries.forEach(en=>{ if(en.isIntersecting){ const el=en.target; el.style.transitionDelay=(Math.min(i++,9)*50)+"ms"; el.classList.add("revealed"); io.unobserve(el); } });
  },{threshold:0.05, rootMargin:"0px 0px -6% 0px"});
  revealIO=io;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(gen!==revealGen) return; els.forEach(el=>{ if(!el.classList.contains("revealed")) io.observe(el); }); }));
  setTimeout(()=>{ if(gen!==revealGen) return; els.forEach(el=>{ if(!el.classList.contains("revealed")){ el.style.transitionDelay="0ms"; el.classList.add("revealed"); } }); if(revealIO){ revealIO.disconnect(); revealIO=null; } },1300);
  state._animateScreen=false;
}
function renderTabs(){
  const active = state.screen==="fszn"?"settings":(state.screen==="fines"||state.screen==="receipts"||state.screen==="expenses")?"dash":state.screen;
  $("#tabbar").innerHTML=`<div class="inner">${TABS.map(t=>`<button class="tab ${active===t.id?"on":""}" data-action="nav" data-to="${t.id}"><span class="ti">${t.ico}</span><span>${t.t}</span></button>`).join("")}</div>`;
}
function onboardHTML(){
  return `<div class="onboard">
    <div class="ob-top"><span class="brand-dot"></span><span class="brand-name">BLVCK</span><span class="brand-sub">TAXI</span></div>
    <h2>Твой счёт<br>за рулём.</h2>
    <p class="ob-sub">Три шага — и комбайн работает на тебя. Без регистрации и облака.</p>
    <div class="ob-step"><div class="n">01</div><div><div class="tt">Вноси в один тап</div><div class="ds">Выручку за день и расходы на авто — быстро, даже в перчатках.</div></div></div>
    <div class="ob-step"><div class="n">02</div><div><div class="tt">Держи всё в одном месте</div><div class="ds">Чеки‑скриншоты, штрафы, ФСЗН и сроки документов — с напоминаниями.</div></div></div>
    <div class="ob-step"><div class="n">03</div><div><div class="tt">Данные только твои</div><div class="ds">Всё хранится в телефоне и работает офлайн. Резервная копия — в один файл.</div></div></div>
    <button class="btn primary ob-go" data-action="onboardDone">Поехали <span class="arrow">→</span></button>
  </div>`;
}

/* ---------- ГЛАВНАЯ ---------- */
async function screenDash(){
  const exps=await dbAll("expenses"), car=await dbGet("car",1), docs=await dbAll("documents");
  const monthStart=new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const spentMonth=exps.filter(e=>new Date(e.date)>=monthStart).reduce((s,e)=>s+Number(e.amount||0),0);
  const spentAll=exps.reduce((s,e)=>s+Number(e.amount||0),0);
  const src=incomeSource(ymNow()), income=src.val, s=fsznSettings(), fszn=isIP()?(s.rate/100*s.mzp):0;
  const free=income-spentMonth-fszn, cls=free>=0?"pos":"neg", sign=free>=0?"+":"−";

  const alerts=[]; const now=new Date(); now.setHours(0,0,0,0);
  docs.forEach(d=>{ if(!d.expiryDate) return; const days=Math.round((new Date(d.expiryDate)-now)/86400000);
    if(days<0) alerts.push({bad:true,t:`Просрочено: ${esc(d.name)}`,s:`истекло ${fmtDate(d.expiryDate)}`});
    else if(days<=30) alerts.push({bad:false,t:`Скоро истечёт: ${esc(d.name)}`,s:`осталось ${days} дн. (${fmtDate(d.expiryDate)})`}); });
  if(car&&car.oilInterval&&car.lastOilMileage!=null){ const left=Number(car.oilInterval)-(Number(car.currentMileage||0)-Number(car.lastOilMileage));
    if(left<=0) alerts.push({bad:true,t:"Пора менять масло",s:`пробег после замены превышен на ${-left} км`});
    else if(left<=1000) alerts.push({bad:false,t:"Скоро замена масла",s:`осталось ~${left} км`}); }
  if(isIP()) taxList().forEach(r=>{ if(!r.date) return; const days=Math.round((new Date(r.date)-now)/86400000);
    if(days<0) alerts.push({bad:true,t:`Просрочено: ${esc(r.name)}`,s:`срок был ${fmtDate(r.date)}`});
    else if(days<=14) alerts.push({bad:false,t:`Срок: ${esc(r.name)}`,s:`осталось ${days} дн. (${fmtDate(r.date)})`}); });
  finesList().filter(f=>!f.paid).forEach(f=>{ const days=f.date?Math.round((now-new Date(f.date+"T00:00:00"))/86400000):null;
    alerts.push({bad:true,t:`🚨 Не оплачен штраф: ${esc(f.name)}`,s:`${money(f.amount)}${f.date?` · выписан ${fmtDate(f.date)}${days!=null?` (${days} дн. назад)`:""}`:""}`}); });

  const tgName=localStorage.getItem("blvck_tg_name");
  const dateSet=new Set(exps.map(e=>e.date)); const curStreak=calcStreak(dateSet);
  let best=bestStreak(dateSet); const sb=Number(localStorage.getItem("blvck_streak_best"))||0; if(best>sb) localStorage.setItem("blvck_streak_best",String(best)); best=Math.max(best,sb);

  const t=today(), todayRev=dailyRevOf(t), target=getDailyTarget();
  const planPct = target>0 ? Math.min(100,Math.round(todayRev/target*100)) : 0;
  const last7=[]; for(let i=6;i>=0;i--) last7.push(dailyRevOf(daysAgo(i)));
  const hasSpark = last7.some(v=>v>0);
  const wka=weekdayAvg();
  const missDays=missingWorkDays(exps, ymNow()+"-01", today());
  const fsznWidget = isIP()?await fsznMiniWidget():"";
  const last3=exps.slice().sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id)).slice(0,3);

  const trend = (()=>{ const pym=prevYM(ymNow()); const spPY=exps.filter(e=>e.date.slice(0,7)===pym).reduce((s,e)=>s+Number(e.amount||0),0);
    const rC=sumDaysForYM(ymNow()).sum, rPY=sumDaysForYM(pym).sum; const ts=trendPct(spentMonth,spPY), tr=trendPct(rC,rPY);
    const c1=ts.dir==="up"?"down":ts.dir==="down"?"up":"flat", c2=tr.dir;
    const f=(x,c,l)=>x.dir==="flat"?`<span class="flat">${l} →</span>`:`<span class="${c}">${l} ${arrow(x.dir)}${x.pct!=null?x.pct+"%":""}</span>`;
    return (spentMonth||spPY||rC||rPY)?`<div class="trendrow">${f(ts,c1,"расходы")} · ${f(tr,c2,"выручка")}</div>`:""; })();

  const quick = [["fuel",true],["parts",false],["repair",false],["wash",false],["rent",false],["other",false]].map(([k,add])=>{
    const c=CATS[k];
    return add
      ? `<button class="qcard qcard-add" data-action="openFuelQuick"><span class="ico">${c.ico}</span><span class="t">${c.t}</span><span class="s">пресеты · 1 тап</span></button>`
      : `<button class="qcard" data-action="quick" data-cat="${k}"><span class="ico">${c.ico}</span><span class="t">${c.t}</span><span class="s">${WEAR_CATS.includes(k)?"пробег установки":"+ расход"}</span></button>`;
  }).join("");

  return `
    <div class="topbar">
      <div class="brand"><span class="brand-dot"></span><span class="brand-name">BLVCK</span><span class="brand-sub">TAXI</span></div>
      <div class="topbar-r">${tgName?`<span class="who">${esc(tgName)}</span>`:""}<button class="iconbtn" data-action="toggleTheme">${document.documentElement.dataset.theme==="dark"?"🌙":"☀️"}</button></div>
    </div>

    ${alerts.map(a=>`<div class="alert ${a.bad?"bad":""}"><span>${a.bad?"⚠️":"🔔"}</span><div><div style="font-weight:700">${a.t}</div><div class="small muted">${a.s}</div></div></div>`).join("")}

    <section class="hero">
      <div class="hero-top"><span class="kicker">свободно · ${monthLabel(ymNow())}</span><span class="badge ${cls}">${free>=0?"в плюсе":"в минусе"}</span></div>
      <div class="hero-num ${cls}" data-count="${Math.abs(free)}" data-dec="2" data-prefix="${sign}" data-suffix=" ${cur()}">${sign}${money(Math.abs(free)).replace(cur(),"").trim()} ${cur()}</div>
      <div class="hero-sub"><span>доход <b>${income>0?money(income):"—"}</b></span><span class="dotsep">·</span><span>расходы <b>−${money(spentMonth)}</b></span>${isIP()?`<span class="dotsep">·</span><span>ФСЗН <b>−${money(fszn)}</b></span>`:""}</div>
      ${trend}
    </section>

    ${curStreak>0?`<div class="streak">🔥 ${curStreak} ${ruPlural(curStreak,["день","дня","дней"])} подряд · рекорд ${best}</div>`:(best>0?`<div class="streak" style="border-color:var(--line);background:transparent;color:var(--muted)">рекорд 🔥 ${best} ${ruPlural(best,["день","дня","дней"])}</div>`:"")}

    <div class="h2">быстрый ввод</div>
    <div class="quickrow">${quick}</div>

    <section class="today glass">
      <div class="today-main">
        <span class="kicker">сегодня · ${fmtDate(t)}</span>
        <div class="today-num" data-count="${todayRev}" data-dec="2" data-suffix=" ${cur()}">${money(todayRev)}</div>
        <button class="btn primary sm" data-action="openDailyRev">внести выручку</button>
      </div>
      <div class="today-ring">${target>0?ringSVG(planPct):`<div class="ring" style="display:grid;place-items:center"><span class="kicker" style="text-align:center">план<br>не задан</span></div>`}</div>
    </section>

    ${hasSpark?`<section class="sparkcard glass"><div class="row between"><span class="kicker">выручка · 7 дней</span>${wka.bestIdx>=0?`<span class="small muted">лучший ${WD[wka.bestIdx]}</span>`:""}</div>${sparkSVG(last7)}</section>`
      :`<section class="sparkcard glass"><span class="kicker">выручка · 7 дней</span><div class="empty" style="padding:14px 0 4px">внеси выручку за пару дней — здесь появится тренд</div></section>`}

    <div class="metricrow">
      <div class="metric"><div class="v" data-count="${spentMonth}" data-dec="2" data-suffix=" ${cur()}">${money(spentMonth)}</div><div class="k">расходов за месяц</div></div>
      <div class="metric"><div class="v" data-count="${spentAll}" data-dec="2" data-suffix=" ${cur()}">${money(spentAll)}</div><div class="k">расходов всего</div></div>
    </div>

    <button class="btn" data-action="openExpenses" style="margin:6px 0 0">📋 Все расходы и графики по дням →</button>

    ${missDays.length?`<div class="glass card"><div class="row between"><div><div style="font-weight:700">💵 Не внесена выручка за ${missDays.length} ${ruPlural(missDays.length,["день","дня","дней"])}</div><div class="small muted">добей прошлые дни — тренд и карта дней пересчитаются</div></div><button class="btn sm primary" data-action="openDailyRev" style="width:auto">Добить</button></div></div>`:""}

    ${fsznWidget}

    ${freeMoneyWidget()}

    <div class="toolgrid">
      <button class="btn span2" data-action="openDrive">🚦 Режим за рулём — одной рукой</button>
      <button class="btn ghost" data-action="openFines">🚨 Штрафы</button>
      <button class="btn ghost" data-action="openReceipts">🧾 Чеки</button>
    </div>

    <div class="h2">последние записи</div>
    ${last3.length?`<div class="list">${last3.map(expenseRow).join("")}</div><button class="btn ghost sm" data-action="openExpenses" style="margin-top:8px;width:100%">показать все →</button>`:`<div class="glass empty">Пока пусто. Начни с быстрой заправки  выше</div>`}
  `;
}
function freeMoneyWidget(){
  const src=incomeSource(ymNow());
  return `<div class="glass card">
    <div class="row between"><span class="kicker">доход вручную</span><span class="badge soon">${src.src==="days"?"авто по дням":src.src==="manual"?"ручной":"—"}</span></div>
    <div class="fszn-note" style="margin:6px 0 0">если не вносишь выручку по дням — задай доход месяца здесь</div>
    <div class="row" style="gap:8px;margin-top:8px">
      <input id="income_month" class="input" type="number" inputmode="decimal" value="${src.src==="manual"?src.val:""}" placeholder="0">
      <button class="btn sm primary" data-action="setIncome" style="width:auto">💾</button>
    </div>
  </div>`;
}
function expenseRow(e){ const c=CATS[e.category]||CATS.other;
  let mileTxt="";
  if(e.mileage){ mileTxt = (e.category==="repair"||e.category==="parts") ? " · установлено "+num(e.mileage)+" км" : " · "+num(e.mileage)+" км"; }
  return `<div class="item"><div class="ic">${c.ico}</div><div class="meta"><div class="t">${c.t}${e.note?": "+esc(e.note):""}</div><div class="s">${fmtDate(e.date)}${mileTxt}</div></div><div class="amt">−${money(e.amount)}</div>${e.receipt?`<button class="edit" data-action="viewReceipt" data-id="${e.id}" title="чек">🧾</button>`:""}<button class="edit" data-action="editExpense" data-id="${e.id}" title="изменить">✏️</button><button class="del" data-action="delExpense" data-id="${e.id}" title="удалить">🗑</button></div>`; }

/* ---------- ЭКРАН «РАСХОДЫ» ---------- */
async function screenExpenses(){
  const all=await dbAll("expenses");
  const w=expWindow(state.expRange);
  const q=(state.expQ||"").trim().toLowerCase();
  const effScale = (state.expScale==="day" && BIG_RANGE(state.expRange)) ? "month" : state.expScale;

  let rows=all.filter(e=>(!w.from||e.date>=w.from)&&(!w.to||e.date<=w.to));
  if(state.expCat!=="all") rows=rows.filter(e=>e.category===state.expCat);
  if(q) rows=rows.filter(e=>((e.note||"")+" "+(CATS[e.category]?.t||"")).toLowerCase().includes(q));
  rows.sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  const sum=rows.reduce((s,e)=>s+Number(e.amount||0),0);

  let chartAll=all.filter(e=>(!w.from||e.date>=w.from)&&(!w.to||e.date<=w.to));
  if(state.expCat!=="all") chartAll=chartAll.filter(e=>e.category===state.expCat);
  let chartData=[];
  if(effScale==="day"){
    const from=w.from||daysAgo(29), to=w.to||today();
    const d=new Date(from+"T00:00:00"); const end=new Date(to+"T00:00:00");
    while(d<=end){ const ds=d.toISOString().slice(0,10); const v=chartAll.filter(e=>e.date===ds).reduce((s,e)=>s+Number(e.amount||0),0); chartData.push({label:String(d.getDate()),value:v}); d.setDate(d.getDate()+1); }
  } else {
    const map={}; chartAll.forEach(e=>{ const m=e.date.slice(0,7); map[m]=(map[m]||0)+Number(e.amount||0); });
    chartData=Object.keys(map).sort().map(m=>({label:new Date(m+"-01T00:00:00").toLocaleDateString("ru-RU",{month:"short"}),value:map[m]}));
  }
  const dayCount = chartData.length;
  const sparse = dayCount>40 ? 5 : dayCount>16 ? 3 : 1;

  const rangeChips=[["7","7д"],["30","30д"],["month","месяц"],["quarter","квартал"],["year","год"],["all","всё"]];
  const catChips=[["all","Все"],...Object.entries(CATS).map(([k,c])=>[k,c.ico+" "+c.t])];

  return `
    <div class="row between">
      <div class="h1" style="margin:0">Расходы</div>
      <button class="btn sm ghost" data-action="nav" data-to="dash">← Назад</button>
    </div>
    <p class="muted small">все записи, график по дням и месяцам, фильтр и поиск</p>

    <div class="rangebar">${rangeChips.map(([k,t])=>`<button class="chip ${state.expRange===k?"on":""}" data-action="setExpRange" data-range="${k}">${t}</button>`).join("")}</div>

    <div class="seg" id="expSeg">
      <span class="thumb"></span>
      <button class="${effScale==="day"?"on":""}" data-action="setExpScale" data-scale="day">по дням</button>
      <button class="${effScale==="month"?"on":""}" data-action="setExpScale" data-scale="month">по месяцам</button>
    </div>
    ${BIG_RANGE(state.expRange)&&state.expScale==="day"?`<div class="fszn-note" style="margin:-2px 2px 6px">на длинном окне «по дням» автоматически укрупнено до месяцев, чтобы не было каши</div>`:""}

    <div class="glass card" style="margin-top:6px">
      <div class="row between"><span class="kicker">расходы · ${w.label}</span><b>${money(sum)}</b></div>
      ${chartData.length&&chartData.some(d=>d.value>0)?bars(chartData,{sparse, small: dayCount>20}):`<div class="empty" style="padding:14px 0 4px">нет расходов за период</div>`}
    </div>

    <div class="chips" style="margin:6px 0">${catChips.map(([k,t])=>`<span class="chip ${state.expCat===k?"on":""}" data-action="setExpCat" data-cat="${k}">${t}</span>`).join("")}</div>

    <div class="searchwrap"><span class="si">🔍</span><input id="exp_search" type="search" placeholder="поиск по детали / заметке" value="${esc(state.expQ)}"></div>

    <div class="row between" style="margin:4px 2px 8px"><span class="kicker">найдено: ${rows.length}</span><span class="kicker">${money(sum)}</span></div>

    <button class="btn primary" data-action="exportFullPdf" style="margin-bottom:10px">📄 Полный отчёт (PDF)</button>
    <div class="row" style="gap:10px;margin-bottom:10px">
      <button class="btn" data-action="exportFullHtml">⬇️ файлом</button>
      <button class="btn" data-action="exportFullBrowser">🌐 в браузере</button>
    </div>

    ${rows.length?`<div class="list">${rows.map(expenseRow).join("")}</div>`:`<div class="glass empty">Ничего не найдено. Сбрось фильтр или поиск.</div>`}
  `;
}

/* ---------- ГРАФИКИ ---------- */
async function screenStats(){
  const exps=await dbAll("expenses"); const filtered=filterByRange(exps,state.range);
  const byCat={}; filtered.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0));
  const byMonth={}; filtered.forEach(e=>{const m=e.date.slice(0,7);byMonth[m]=(byMonth[m]||0)+Number(e.amount||0);});
  const months=Object.keys(byMonth).sort(); const total=Object.values(byCat).reduce((a,b)=>a+b,0);
  const ym=ymNow(); const ms=new Date(); ms.setDate(1); ms.setHours(0,0,0,0);
  const spentMonth=exps.filter(e=>new Date(e.date)>=ms).reduce((s,e)=>s+Number(e.amount||0),0);
  const income=incomeOf(ym),km=kmOf(ym),hours=hoursOf(ym); const s=fsznSettings(); const fszn=isIP()?(s.rate/100*s.mzp):0;
  const free=income-spentMonth-fszn; const pKr=km>0?income/km:null,pH=hours>0?income/hours:null,pKc=km>0?spentMonth/km:null,mg=income>0?free/income*100:null;
  const wka=weekdayAvg(); const hasWd=wka.bestIdx>=0;
  return `
    <div class="h1">Аналитика</div><p class="muted small">расходы по категориям и месяцам</p>
    <div class="rangebar">${[["month","Месяц"],["quarter","Квартал"],["year","Год"],["all","Всё"]].map(([k,t])=>`<button class="chip ${state.range===k?"on":""}" data-action="setRange" data-range="${k}">${t}</button>`).join("")}</div>
    <div class="glass card"><div class="row between"><b>По категориям</b><span class="muted small">${money(total)}</span></div>${total>0?donut(byCat):`<div class="empty">Нет данных за период</div>`}</div>
    <div class="glass card"><b>По месяцам</b>${months.length>0?bars(months.map(m=>({label:m.slice(2),value:byMonth[m]}))):`<div class="empty">Нет данных</div>`}</div>
    <div class="h2">выгодные дни недели</div>
    <div class="glass card">${hasWd?`${bars(WD_ORDER.map(i=>({label:WD[i],value:wka.avg[i]})))}<div class="fszn-note">🏆 лучший день — <b>${WD[wka.bestIdx]}</b> (в среднем ${rate(wka.avg[wka.bestIdx])}). Чем больше дней внесено, тем точнее карта.</div>`:`<div class="empty">Вноси «💵 Выручка» — здесь появится карта выгодных дней</div>`}</div>
    <div class="h2">эффективность · ${monthLabel(ym)}</div>
    <div class="glass card">
      <div class="grid2"><div class="field" style="margin:0"><label>Пробег за месяц, км</label><input id="eff_km" class="input" type="number" inputmode="numeric" value="${km||""}" placeholder="0"></div><div class="field" style="margin:0"><label>Часов за рулём</label><input id="eff_hours" class="input" type="number" inputmode="decimal" value="${hours||""}" placeholder="0"></div></div>
      <div style="height:8px"></div><button class="btn sm primary" data-action="setEff" style="width:100%">💾 Сохранить пробег и часы</button>
      <div class="eff"><div class="e"><div class="v">${pH!=null?rate(pH):"—"}</div><div class="k">за час за рулём</div></div><div class="e"><div class="v">${pKr!=null?rate(pKr):"—"}</div><div class="k">за км выручки</div></div><div class="e"><div class="v">${pKc!=null?rate(pKc):"—"}</div><div class="k">за км затрат</div></div><div class="e"><div class="v">${mg!=null?mg.toFixed(0)+"%":"—"}</div><div class="k">маржа</div></div></div>
      <div class="fszn-note">💡 Разбивка по часам появится вместе с учётом смен (таймером). Сейчас — по итогу месяца.</div>
    </div>`;
}
function filterByRange(exps,range){ if(range==="all") return exps; const d=new Date(); if(range==="month")d.setMonth(d.getMonth()-1); if(range==="quarter")d.setMonth(d.getMonth()-3); if(range==="year")d.setFullYear(d.getFullYear()-1); const c=d.toISOString().slice(0,10); return exps.filter(e=>e.date>=c); }
function donut(byCat){ const e=Object.entries(byCat).filter(([,v])=>v>0); const total=e.reduce((s,[,v])=>s+v,0);
  const colors={fuel:"#ff5a00",parts:"#ff7d24",repair:"#f5f4f1",wash:"#80807a",rent:"#b8b8b0",other:"#34342f"}; let a0=-Math.PI/2; const R=60,r=38,cx=80,cy=80;
  const arc=a1=>{const lg=(a1-a0)>Math.PI?1:0,p=(a,rd)=>[cx+rd*Math.cos(a),cy+rd*Math.sin(a)];const[x0,y0]=p(a0,R),[x1,y1]=p(a1,R),[x2,y2]=p(a1,r),[x3,y3]=p(a0,r);const d=`M${x0} ${y0} A${R} ${R} 0 ${lg} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${lg} 0 ${x3} ${y3} Z`;a0=a1;return d;};
  const paths=e.map(([k,v])=>`<path d="${arc(a0+(v/total)*Math.PI*2)}" fill="${colors[k]||"#888"}" opacity=".95"/>`).join("");
  const legend=e.map(([k,v])=>`<div class="li"><span class="dot" style="background:${colors[k]||"#888"}"></span>${(CATS[k]?.t||k)} · ${Math.round(v/total*100)}%</div>`).join("");
  return `<div class="row" style="gap:18px;margin-top:10px"><svg class="chart" viewBox="0 0 160 160" width="140" height="140">${paths}<text class="ct" x="80" y="78" text-anchor="middle" font-size="14" font-weight="800">${money(total).split(" ")[0]}</text><text class="cm" x="80" y="94" text-anchor="middle" font-size="9">${cur()}</text></svg><div class="legend col">${legend}</div></div>`; }
function bars(data, opts={}){
  const W=320,H=140,pad=18,max=Math.max(...data.map(d=>d.value),1),bw=(W-pad*2)/data.length;
  const sparse = opts.sparse||1;
  const fs = opts.small ? 7 : 9;
  const cols=data.map((d,i)=>{const h=(d.value/max)*(H-pad*2),x=pad+i*bw+bw*0.15,y=H-pad-h;
    const show = (i % sparse === 0) || i===data.length-1;
    return `<g><rect x="${x}" y="${y}" width="${bw*0.7}" height="${h}" rx="4" fill="url(#g1)"><animate attributeName="height" from="0" to="${h}" dur=".5s" fill="freeze"/><animate attributeName="y" from="${H-pad}" to="${y}" dur=".5s" fill="freeze"/></rect><text class="cm" x="${x+bw*0.35}" y="${H-5}" text-anchor="middle" font-size="${fs}" style="visibility:${show?'visible':'hidden'}">${d.label}</text></g>`;}).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="margin-top:10px"><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a00"/><stop offset="1" stop-color="#ff7d24"/></linearGradient></defs>${cols}</svg>`; }

/* ---------- АВТО + износ ---------- */
async function screenCar(){ const car=await dbGet("car",1)||{}; const exps=await dbAll("expenses");
  return `<div class="h1">Автомобиль</div><p class="muted small">модель, расход, пробег, замена масла</p>
    <div class="glass card"><div class="row between"><div><div style="font-size:20px;font-weight:800;letter-spacing:-.4px">${car.model?esc(car.model):"Не задано"}</div><div class="muted small">${car.plate?esc(car.plate):"—"}</div></div><button class="btn sm" data-action="openEditCar">✏️ Изменить</button></div><div class="divider"></div>
    <div class="metricrow" style="margin:0"><div class="metric"><div class="v">${(car.currentMileage||0).toLocaleString("ru-RU")}</div><div class="k">пробег, км</div></div><div class="metric"><div class="v">${car.fuelPer100||"—"}</div><div class="k">расход л/100</div></div><div class="metric"><div class="v">${(car.lastOilMileage||0).toLocaleString("ru-RU")}</div><div class="k">масло на км</div></div><div class="metric"><div class="v">${car.oilInterval||"—"}</div><div class="k">интервал, км</div></div></div></div>
    <div class="h2">расход топлива (оценка)</div><div class="glass card">${await fuelEstimate(exps)}</div>
    <div class="h2">детали и работы · износ</div><div class="glass card">${partsWear(exps,car)}</div>`; }
async function fuelEstimate(exps){ exps = exps || await dbAll("expenses");
  const f=exps.filter(e=>e.category==="fuel"&&e.mileage);
  if(f.length<2) return `<div class="empty">Добавь ≥2 заправки с пробегом — посчитаю стоимость км</div>`;
  const s=f.slice().sort((a,b)=>a.mileage-b.mileage); const km=s.at(-1).mileage-s[0].mileage; const sum=s.slice(1).reduce((a,e)=>a+Number(e.amount||0),0);
  if(km<=0) return `<div class="empty">Мало данных</div>`;
  return `<div class="row between"><span class="muted">Стоимость км</span><b>${money(sum/km)}</b></div><div class="row between"><span class="muted">Замерено на</span><span>${km.toLocaleString("ru-RU")} км</span></div>`; }
function partsWear(exps, car){
  const curMile = Number(car?.currentMileage)||0;
  const recs = exps.filter(e=>(e.category==="repair"||e.category==="parts")&&Number(e.mileage)>0);
  if(!recs.length) return `<div class="empty">Укажи пробег и название детали при ремонте/запчастях — здесь появится, сколько прошла каждая деталь. Когда поставишь ту же деталь заново — старая автоматически станет «заменена».</div>`;
  const groups={};
  recs.forEach(e=>{ const base=(e.note||"").trim(); const key = base ? (e.category+"|"+base.toLowerCase()) : ("id|"+e.id); (groups[key]=groups[key]||[]).push(e); });
  const rows=[];
  Object.values(groups).forEach(arr=>{ arr.sort((a,b)=>Number(a.mileage)-Number(b.mileage));
    arr.forEach((e,i)=>{ const next=arr[i+1]; const installed=Number(e.mileage); let span=null, active=!next, replacedAt=null;
      if(next){ replacedAt=Number(next.mileage); span=Math.max(0,replacedAt-installed); } else if(curMile>installed){ span=curMile-installed; }
      rows.push({e,installed,span,active,replacedAt}); }); });
  rows.sort((a,b)=>(b.e.date+b.e.id).localeCompare(a.e.date+a.e.id));
  const items = rows.map(r=>{ const c=CATS[r.e.category]||CATS.other; const wearTxt = r.span!=null ? num(r.span)+" км" : "—";
    const pill = r.active ? `<span class="pill on">действует</span>` : `<span class="pill off">заменена</span>`;
    const tail = r.active ? (curMile>0?"":" · пробег авто не задан") : ` · заменена на ${num(r.replacedAt)}`;
    const sub = `установлена ${num(r.installed)} км · ${fmtDate(r.e.date)}${tail}`;
    return `<div class="part"><div class="ic">${c.ico}</div><div class="meta"><div class="t">${r.e.note?esc(r.e.note):c.t}</div><div class="s">${sub}</div></div><div class="wear">${wearTxt}</div>${pill}</div>`; }).join("");
  return `<div class="list">${items}</div>`;
}

/* ---------- ТО / ДОКИ ---------- */
async function screenDocs(){ const maint=(await dbAll("maintenance")).sort((a,b)=>b.date.localeCompare(a.date)); const docs=(await dbAll("documents")).sort((a,b)=>(a.expiryDate||"9").localeCompare(b.expiryDate||"9"));
  return `<div class="h1">ТО и документы</div><div class="row" style="gap:10px;margin-top:10px"><button class="btn" data-action="openAddMaint">➕ Событие ТО</button><button class="btn" data-action="openAddDoc">📄 Документ</button></div>
    <div class="h2">документы</div>${docs.length?`<div class="list">${docs.map(d=>{const days=d.expiryDate?Math.round((new Date(d.expiryDate)-new Date())/86400000):null;const w=days!=null&&days<=30;return `<div class="item"><div class="ic">${w?(days<0?"⛔":"⏰"):"📄"}</div><div class="meta"><div class="t">${esc(d.name)}</div><div class="s">${d.expiryDate?("до "+fmtDate(d.expiryDate)+(days!=null?(days<0?" · просрочено":" · "+days+" дн."):"")):"бессрочно"}</div></div><button class="del" data-action="delDoc" data-id="${d.id}">🗑</button></div>`;}).join("")}</div>`:`<div class="glass empty">Нет документов</div>`}
    <div class="h2">журнал ТО</div>${maint.length?`<div class="list">${maint.map(m=>`<div class="item"><div class="ic">🔧</div><div class="meta"><div class="t">${esc(m.title)}</div><div class="s">${fmtDate(m.date)}${m.mileage?" · "+num(m.mileage)+" км":""}${m.note?" · "+esc(m.note):""}</div></div><button class="del" data-action="delMaint" data-id="${m.id}">🗑</button></div>`).join("")}</div>`:`<div class="glass empty">Нет событий</div>`}`; }

/* ---------- ШТРАФЫ ---------- */
async function screenFines(){ const list=finesList(); const now=new Date(); now.setHours(0,0,0,0);
  const unpaid=list.filter(f=>!f.paid), unpaidSum=unpaid.reduce((s,f)=>s+Number(f.amount||0),0), y=YEAR();
  const paidYear=list.filter(f=>f.paid&&(f.paidDate||"").slice(0,4)===String(y)), paidYearSum=paidYear.reduce((s,f)=>s+Number(f.amount||0),0);
  const sorted=list.slice().sort((a,b)=>{ if(a.paid!==b.paid) return a.paid?1:-1; return (b.paidDate||b.date||"").localeCompare(a.paidDate||a.date||""); });
  return `<div class="row between"><div class="h1" style="margin:0">🚨 Штрафы</div><button class="btn sm ghost" data-action="nav" data-to="dash">← Назад</button></div>
    <p class="muted small">долги светятся на главной; при «оплачено» штраф сам уходит в расходы</p>
    <div class="metricrow"><div class="metric"><div class="v neg">${unpaid.length?money(unpaidSum):money(0)}</div><div class="k">не оплачено (${unpaid.length})</div></div><div class="metric"><div class="v">${money(paidYearSum)}</div><div class="k">оплачено за ${y}</div></div></div>
    <button class="btn primary" data-action="openAddFine" style="margin-top:12px">➕ Добавить штраф</button><div class="h2">список</div>
    ${sorted.length?`<div class="list">${sorted.map(f=>{const days=f.date?Math.round((now-new Date(f.date+"T00:00:00"))/86400000):null;
      if(!f.paid) return `<div class="item"><div class="ic">🚨</div><div class="meta"><div class="t">${esc(f.name)}</div><div class="s">${f.date?`выписан ${fmtDate(f.date)}${days!=null?` · ${days} дн. назад`:""}`:"без даты"}</div></div><div class="amt neg">−${money(f.amount)}</div><button class="edit" data-action="finePaid" data-id="${f.id}" title="оплачено">✅</button><button class="del" data-action="fineDel" data-id="${f.id}">🗑</button></div>`;
      return `<div class="item"><div class="ic">✅</div><div class="meta"><div class="t">${esc(f.name)}</div><div class="s">оплачен ${fmtDate(f.paidDate)}</div></div><div class="amt">−${money(f.amount)}</div><button class="del" data-action="fineDel" data-id="${f.id}">🗑</button></div>`;}).join("")}</div>`:`<div class="glass empty">Штрафов нет — так держать 👍</div>`}`; }

/* ---------- ЧЕКИ ---------- */
async function getReceiptExpenses(){ const all=await dbAll("expenses"); const pr=periodRange(state.receiptMode,state.receiptOffset);
  return all.filter(e=>e.receipt&&(!pr.from||e.date>=pr.from)&&(!pr.to||e.date<=pr.to)&&(state.receiptCat==="all"||e.category===state.receiptCat)).sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id)); }
async function screenReceipts(){ const pr=periodRange(state.receiptMode,state.receiptOffset); const list=await getReceiptExpenses();
  const sum=list.reduce((s,e)=>s+Number(e.amount||0),0); const byCat={}; list.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0));
  const all=await dbAll("expenses"); const allIn=all.filter(e=>(!pr.from||e.date>=pr.from)&&(!pr.to||e.date<=pr.to)&&(state.receiptCat==="all"||e.category===state.receiptCat)); const allSum=allIn.reduce((s,e)=>s+Number(e.amount||0),0);
  const catChips=[["all","Все"],...Object.entries(CATS).map(([k,c])=>[k,c.ico])];
  return `<div class="row between"><div class="h1" style="margin:0">🧾 Чеки</div><button class="btn sm ghost" data-action="nav" data-to="dash">← Назад</button></div>
    <p class="muted small">просмотр и выгрузка чеков за период — чтобы всё посчиталось</p>
    <div class="rangebar">${[["month","Месяц"],["quarter","Квартал"],["year","Год"],["all","Всё"]].map(([k,t])=>`<button class="chip ${state.receiptMode===k?"on":""}" data-action="setReceiptMode" data-mode="${k}">${t}</button>`).join("")}</div>
    ${state.receiptMode!=="all"?`<div class="periodnav"><button class="pbtn" data-action="receiptPrev">‹</button><div class="plabel">${esc(pr.label)}</div><button class="pbtn" data-action="receiptNext">›</button></div>`:`<div class="periodnav"><div class="plabel">${esc(pr.label)}</div></div>`}
    <div class="chips" style="margin:6px 0">${catChips.map(([k,t])=>`<span class="chip ${state.receiptCat===k?"on":""}" data-action="setReceiptCat" data-cat="${k}">${t}</span>`).join("")}</div>
    <div class="glass card"><div class="row between"><b>Чеков со скрином</b><b>${list.length}</b></div><div class="row between"><span class="muted">сумма чеков</span><b>${money(sum)}</b></div>${Object.entries(byCat).map(([k,v])=>`<div class="row between small"><span class="muted">${CATS[k]?.ico||""} ${CATS[k]?.t||k}</span><b>${money(v)}</b></div>`).join("")}<div class="divider"></div><div class="row between small"><span class="muted">все расходы за период</span><b>${money(allSum)}</b></div></div>
    <div class="h2">выгрузить</div><div class="glass card">
      <button class="btn primary" data-action="exportReceiptsHtml" ${list.length?"":"disabled"}>📄 Отчёт с чеками (PDF)</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="exportReceiptsBrowser" ${list.length?"":"disabled"}>🌐 Отчёт в браузере</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="exportReceiptsZip" ${list.length?"":"disabled"}>📦 Чеки папкой (ZIP)</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="exportReceiptsCsv" ${list.length?"":"disabled"}>📊 Таблица чеков (CSV)</button>
      <div class="fszn-note">Самый надёжный путь на телефоне — «📄 Отчёт (PDF)»: откроется на экране, сверху «🖨 Сохранить как PDF». «🌐 в браузере» на Android может не открыться.</div>
    </div>
    <div class="h2">галерея</div>${list.length?`<div class="list">${list.map(e=>{const c=CATS[e.category]||CATS.other;return `<div class="item"><img class="rthumb" src="${e.receipt}" data-action="viewReceipt" data-id="${e.id}" alt="чек"><div class="meta"><div class="t">${c.ico} ${c.t}${e.note?": "+esc(e.note):""}</div><div class="s">${fmtDate(e.date)}</div></div><div class="amt">−${money(e.amount)}</div></div>`;}).join("")}</div>`:`<div class="glass empty">За этот период чеков нет</div>`}`; }
function receiptsCsvText(list,pr){ const sum=list.reduce((s,e)=>s+Number(e.amount||0),0); const byCat={}; list.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0));
  const L=[["BLVCK TAXI — чеки за "+pr.label],["Фильтр",state.receiptCat==="all"?"все":(CATS[state.receiptCat]?.t||state.receiptCat)],["Сформировано",today()],[],["Дата","Категория","Заметка","Сумма "+cur()]];
  list.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>L.push([e.date,(CATS[e.category]?.t||e.category),e.note||"",e.amount]));
  L.push(["","","ИТОГО",sum.toFixed(2)],[],["ПО КАТЕГОРИЯМ"]); Object.entries(byCat).forEach(([k,v])=>L.push([(CATS[k]?.t||k),v.toFixed(2)]));
  return "\uFEFF"+L.map(r=>r.map(csvCell).join(";")).join("\r\n"); }
function exportReceiptsCsv(){ getReceiptExpenses().then(async list=>{ if(!list.length){toast("Нет чеков за период");return;} const pr=periodRange(state.receiptMode,state.receiptOffset);
  const r=await saveFile(`blvck-taxi-cheki-${pr.label.replace(/[^0-9A-Za-zа-яА-Я]/g,"")}.csv`, receiptsCsvText(list,pr), "text/csv;charset=utf-8", {title:"Чеки BLVCK TAXI"}); handleSaveResult(r); }); }
function exportReceiptsHtml(){ getReceiptExpenses().then(async list=>{ if(!list.length){toast("Нет чеков за период");return;} const pr=periodRange(state.receiptMode,state.receiptOffset); const html=buildReceiptsReport(list,pr,true);
  const r=await saveFile(`blvck-taxi-cheki-${pr.label.replace(/[^0-9A-Za-zа-яА-Я]/g,"")}.html`, html, "text/html;charset=utf-8", {title:"Чеки BLVCK TAXI", htmlView:html}); handleSaveResult(r); }); }
function exportReceiptsBrowser(){ getReceiptExpenses().then(async list=>{ if(!list.length){toast("Нет чеков за период");return;} const pr=periodRange(state.receiptMode,state.receiptOffset); const html=buildReceiptsReport(list,pr,false);
  const r=await openBrowserWith(`blvck-taxi-cheki-${pr.label.replace(/[^0-9A-Za-zа-яА-Я]/g,"")}.html`, html, "text/html;charset=utf-8");
  if(r.ok){ hapticOk(); toast("Открываю в браузере → там ⋮ «Скачать» / «Печать→PDF»"); } else { toast("Браузер не открылся — используй «Отчёт с чеками (PDF)»"); } }); }
function exportReceiptsZip(){ getReceiptExpenses().then(async list=>{ if(!list.length){toast("Нет чеков за период");return;} const pr=periodRange(state.receiptMode,state.receiptOffset); const files=[],used={};
  list.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>{let base=`${e.date}_${e.category}_${Number(e.amount).toFixed(2).replace(".","_")}`,name=base+".jpg",i=2;while(used[name]){name=`${base}_${i}.jpg`;i++;}used[name]=1;files.push({name,data:b64ToBytes(e.receipt)});});
  files.push({name:"itogi.csv",data:strBytes(receiptsCsvText(list,pr))}); const blob=buildZip(files);
  const r=await saveFile(`blvck-taxi-cheki-${pr.label.replace(/[^0-9A-Za-zа-яА-Я]/g,"")}.zip`, blob, "application/zip", {title:"Чеки BLVCK TAXI (папка)"}); handleSaveResult(r); }); }

/* ---------- ОТЧЁТЫ ---------- */
function reportShell(title, sub, body){
  const wrapped = body.replace(/<table>/g,'<div class="tblwrap"><table>').replace(/<\/table>/g,'</table></div>');
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BLVCK TAXI — ${title}</title>
<style>
 *{box-sizing:border-box} body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:22px;color:#141414;background:#f3f2ee}
 .hd{display:flex;align-items:center;gap:10px;border-bottom:2px solid #ff5a00;padding-bottom:12px;margin-bottom:6px}
 .hd .dot{width:12px;height:12px;border-radius:3px;background:#ff5a00}
 .hd h1{font-size:22px;margin:0;letter-spacing:-.4px}
 .sub{color:#6b6b65;font-size:12.5px;margin:0 0 16px}
 h2{font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#ff5a00;margin:20px 0 8px}
 .tblwrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -2px 6px}
 table{border-collapse:collapse;width:100%;min-width:480px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.06)}
 td{padding:6px 8px;border-bottom:1px solid #eee;font-size:11.5px;vertical-align:top}
 td.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
 td.nowrap{white-space:nowrap}
 tr.tot td{background:#0a0a0a;color:#fff;font-weight:800}
 .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
 .kp{background:#fff;border-radius:10px;padding:10px 12px;box-shadow:0 4px 16px rgba(0,0,0,.06)}
 .kp .v{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}
 .kp .k{font-size:10px;color:#6b6b65;text-transform:uppercase;letter-spacing:.8px}
 .rc img{width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid #eee}
 .noprint{position:sticky;top:0;background:#f3f2ee;padding:6px 0 12px;display:flex;gap:8px;z-index:5}
 .noprint button{background:#ff5a00;color:#fff;border:none;border-radius:10px;padding:11px 16px;font-size:14px;font-weight:700;cursor:pointer}
 @media print{.noprint{display:none} body{background:#fff;padding:0} table,.kp{box-shadow:none}}
</style></head><body>
<div class="noprint"><button onclick="window.print()">🖨 Сохранить как PDF / распечатать</button></div>
<div class="hd"><span class="dot"></span><h1>BLVCK TAXI — ${title}</h1></div>
<p class="sub">${sub}</p>
${wrapped}
</body></html>`;
}
async function buildFullReport(embedImages=true){
  const exps=(await dbAll("expenses")).slice().sort((a,b)=>a.date.localeCompare(b.date));
  const car=await dbGet("car",1)||{};
  const total=exps.reduce((s,e)=>s+Number(e.amount||0),0);
  const byCat={}; exps.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0));
  const rev=dailyRevMap(); const revDays=Object.keys(rev).filter(d=>Number(rev[d])>0).sort();
  const revTotal=revDays.reduce((s,d)=>s+Number(rev[d]),0);
  const fines=finesList(); const finesPaid=fines.filter(f=>f.paid);
  const finesSum=finesPaid.reduce((s,f)=>s+Number(f.amount||0),0);
  const wearRows=[]; const curMile=Number(car.currentMileage)||0;
  const recs=exps.filter(e=>(e.category==="repair"||e.category==="parts")&&Number(e.mileage)>0);
  const groups={}; recs.forEach(e=>{const b=(e.note||"").trim();const k=b?(e.category+"|"+b.toLowerCase()):("id|"+e.id);(groups[k]=groups[k]||[]).push(e);});
  Object.values(groups).forEach(arr=>{arr.sort((a,b)=>Number(a.mileage)-Number(b.mileage));arr.forEach((e,i)=>{const nx=arr[i+1];const ins=Number(e.mileage);let sp=null,act=!nx,rep=null;if(nx){rep=Number(nx.mileage);sp=Math.max(0,rep-ins);}else if(curMile>ins){sp=curMile-ins;}wearRows.push({e,ins,sp,act,rep});});});
  wearRows.sort((a,b)=>(b.e.date+b.e.id).localeCompare(a.e.date+a.e.id));

  const catRows=Object.entries(byCat).map(([k,v])=>`<tr><td>${CATS[k]?.ico||""} ${esc(CATS[k]?.t||k)}</td><td class="r">${money(v)}</td></tr>`).join("");
  const cell = (e) => embedImages && e.receipt ? `<img src="${e.receipt}" alt="">` : (e.receipt?`<span style="color:#888">🧾</span>`:"—");
  const expRows=exps.map(e=>{const c=CATS[e.category]||CATS.other;return `<tr><td class="nowrap">${fmtShort(e.date)}</td><td>${c.ico} ${esc(c.t)}</td><td>${esc(e.note||"")}</td><td class="r">${e.mileage?num(e.mileage):"—"}</td><td>${cell(e)}</td><td class="r">${money(e.amount)}</td></tr>`;}).join("");
  const revRows=revDays.map(d=>`<tr><td class="nowrap">${fmtShort(d)}</td><td class="r">${money(rev[d])}</td></tr>`).join("");
  const fineRows=fines.map(f=>`<tr><td class="nowrap">${f.paid?fmtShort(f.paidDate):"—"}</td><td>${esc(f.name)}</td><td>${f.paid?"оплачен":"не оплачен"}</td><td class="r">${money(f.amount)}</td></tr>`).join("");
  const wearTbl=wearRows.map(r=>{const c=CATS[r.e.category]||CATS.other;return `<tr><td>${c.ico} ${esc(r.e.note||c.t)}</td><td class="r">${num(r.ins)}</td><td class="r">${r.sp!=null?num(r.sp)+" км":"—"}</td><td>${r.act?"действует":"заменена"}</td></tr>`;}).join("");

  let fsznBlock="";
  if(isIP()){ const s=fsznSettings(); const y=YEAR(); let paid=0; for(let q=1;q<=4;q++){const r=await dbGet("fszn",`${y}-Q${q}`);paid+=Number(r?.paid)||0;} const goal=s.rate/100*s.mzp*12;
    fsznBlock=`<h2>ФСЗН · ${y}</h2><div class="grid"><div class="kp"><div class="v">${money(paid)}</div><div class="k">уплачено</div></div><div class="kp"><div class="v">${money(goal)}</div><div class="k">цель за год</div></div></div>`; }

  const body=`
    <div class="grid">
      <div class="kp"><div class="v">${money(total)}</div><div class="k">расходов всего</div></div>
      <div class="kp"><div class="v">${revTotal>0?money(revTotal):"—"}</div><div class="k">выручки внесено</div></div>
      <div class="kp"><div class="v">${exps.length}</div><div class="k">записей</div></div>
      <div class="kp"><div class="v">${car.currentMileage?num(car.currentMileage):"—"}</div><div class="k">пробег авто, км</div></div>
    </div>
    <h2>Расходы по категориям</h2><table>${catRows}<tr class="tot"><td>ИТОГО</td><td class="r">${money(total)}</td></tr></table>
    <h2>Все расходы</h2><table><tr><td>Дата</td><td>Категория</td><td>Деталь / заметка</td><td class="r">Пробег</td><td>Чек</td><td class="r">Сумма</td></tr>${expRows||`<tr><td colspan="6">нет записей</td></tr>`}</table>
    <h2>Выручка по дням</h2><table><tr><td>Дата</td><td class="r">Выручка</td></tr>${revRows||`<tr><td colspan="2">не внесена</td></tr>`}${revTotal>0?`<tr class="tot"><td>ИТОГО</td><td class="r">${money(revTotal)}</td></tr>`:""}</table>
    <h2>Штрафы</h2><table><tr><td>Дата оплаты</td><td>За что</td><td>Статус</td><td class="r">Сумма</td></tr>${fineRows||`<tr><td colspan="4">нет штрафов</td></tr>`}${finesSum>0?`<tr class="tot"><td colspan="3">оплачено</td><td class="r">${money(finesSum)}</td></tr>`:""}</table>
    ${wearRows.length?`<h2>Детали и износ</h2><table><tr><td>Деталь / работа</td><td class="r">установлена, км</td><td class="r">прошла</td><td>статус</td></tr>${wearTbl}</table>`:""}
    ${fsznBlock}`;
  return reportShell("Полный отчёт", `Сформировано ${fmtDate(today())} · записей: ${exps.length} · валюта ${cur()}`, body);
}
function buildReceiptsReport(list, pr, embedImages){
  const sum=list.reduce((s,e)=>s+Number(e.amount||0),0); const byCat={}; list.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0));
  const rows=list.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>{const c=CATS[e.category]||CATS.other;
    const rc = embedImages && e.receipt ? `<img src="${e.receipt}" alt="чек">` : (e.receipt?`<span style="color:#888">🧾 в приложении</span>`:"—");
    return `<div class="rc">${rc}<div class="cap">${fmtShort(e.date)} · ${c.ico} ${esc(c.t)}${e.note?" · "+esc(e.note):""}<br><b>${money(e.amount)}</b></div></div>`;}).join("");
  const tot=Object.entries(byCat).map(([k,v])=>`<tr><td>${CATS[k]?.ico||""} ${esc(CATS[k]?.t||k)}</td><td class="r">${money(v)}</td></tr>`).join("");
  const body=`<table>${tot}<tr class="tot"><td>ИТОГО ЧЕКОВ</td><td class="r">${money(sum)}</td></tr></table>${rows||`<p>нет чеков</p>`}`;
  return reportShell(`Чеки за ${esc(pr.label)}`, `Категория: ${state.receiptCat==="all"?"все":esc(CATS[state.receiptCat]?.t||state.receiptCat)} · чеков: ${list.length} · ${fmtDate(today())}`, body);
}
async function exportFullPdf(){
  const html=await buildFullReport(true);
  const name=`blvck-taxi-otchet-${today()}.html`;
  const r=await saveFile(name, html, "text/html;charset=utf-8", {title:"Полный отчёт BLVCK TAXI", htmlView:html});
  handleSaveResult(r);
}
async function exportFullHtml(){ const html=await buildFullReport(true); const r=await saveFile(`blvck-taxi-otchet-${today()}.html`, html, "text/html;charset=utf-8", {title:"Полный отчёт BLVCK TAXI", htmlView:html}); handleSaveResult(r); }
async function exportFullBrowser(){ const html=await buildFullReport(false); const r=await openBrowserWith(`blvck-taxi-otchet-${today()}.html`, html, "text/html;charset=utf-8");
  if(r.ok){ hapticOk(); toast("Открываю в браузере → там ⋮ «Скачать» / «Печать→PDF»"); } else { toast("Браузер не открылся — используй «Полный отчёт (PDF)»"); } }

/* ---------- ФСЗН ---------- */
function fsznSettings(){ return { mzp:parseFloat(localStorage.getItem("blvck_fszn_mzp"))||726, rate:parseFloat(localStorage.getItem("blvck_fszn_rate"))||35 }; }
async function screenFszn(){ const s=fsznSettings(); const year=YEAR(),cq=CUR_Q(); const minMonth=s.rate/100*s.mzp,minQ=minMonth*3,minYear=minMonth*12;
  const qs=[]; let paidYTD=0,minYTD=0,paidAll=0,targetAll=0;
  for(let q=1;q<=4;q++){ const rec=await dbGet("fszn",`${year}-Q${q}`)||{income:0,paid:0}; const monthSum=quarterIncome(q,year); const income=monthSum>0?monthSum:(Number(rec.income)||0); const paid=Number(rec.paid)||0; const fromIncome=income>0?s.rate/100*income:0; const target=Math.max(minQ,fromIncome); let status,badge;
    if(q<cq){status=paid>=target?"good":(paid>0?"warn":"bad");badge=paid>=target?"✅ закрыто":(paid>0?"🟡 частично":"⏰ не уплачено");}
    else if(q===cq){status=paid>=target?"good":(paid>0?"warn":"soon");badge=paid>=target?"✅ закрыто":(paid>0?"🟡 в процессе":"🔵 в процессе");}
    else{status="soon";badge="🔮 предстоит";}
    qs.push({q,monthSum,manual:Number(rec.income)||0,paid,target,status,badge}); if(q<=cq){paidYTD+=paid;minYTD+=minQ;} paidAll+=paid;targetAll+=target; }
  const goal=Math.max(minYear,targetAll); const pctYear=goal>0?Math.min(100,Math.round(paidAll/goal*100)):0; const pctYTD=minYTD>0?Math.min(100,Math.round(paidYTD/minYTD*100)):0; const rest=Math.max(0,goal-paidAll);
  const taxes=taxList().sort((a,b)=>(a.date||"9").localeCompare(b.date||"9"));
  return `<div class="row between"><div class="h1" style="margin:0">ИП · ${year}</div><button class="btn sm ghost" data-action="nav" data-to="settings">← Назад</button></div>
    <p class="muted small">взносы, сроки и отчёты · прикидка, НЕ официальный расчёт</p>
    <div class="glass card"><div class="row between"><b>ФСЗН — цель за год</b><span class="muted small">${money(goal)}</span></div><div class="progress ${pctYear>=100?"good":""}"><i data-bar="${pctYear}%" style="width:0"></i></div><div class="row between small"><span class="muted">уплачено ${money(paidAll)}</span><b>${pctYear}%</b></div><div class="divider"></div><div class="row between small"><span class="muted">С начала года (Q1–Q${cq})</span><b>${money(paidYTD)} / ${money(minYTD)} · ${pctYTD}%</b></div><div class="divider"></div>${rest>0?`<div class="alert bad" style="margin:0"><span>⏰</span><div><div style="font-weight:700">До 31 марта ${year+1}</div><div class="small muted">доплатить ≈ <b>${money(rest)}</b> (сверь в налоговой)</div></div></div>`:`<div class="alert good" style="margin:0"><span>✅</span><div><div style="font-weight:700">Минимум за год закрыт</div></div></div>`}</div>
    <div class="glass card"><b>По кварталам: надо / уплачено</b>${fsznBars(qs)}</div>
    <div class="h2">кварталы</div>${qs.map(q=>`<div class="glass qcard-f"><div class="qhead"><div class="qtitle">${q.q}-й квартал</div><span class="badge ${q.status}">${q.badge}</span></div><div class="qmini"><span>минимум за квартал</span><b>${money(minQ)}</b></div><div class="qmini"><span>доход (авто)</span><b>${q.monthSum>0?money(q.monthSum):"—"}</b></div><div class="grid2"><div class="field" style="margin:8px 0 0"><label>Доход вручную</label><input class="input" type="number" inputmode="decimal" data-fszn="income" data-q="${q.q}" value="${q.manual||""}" placeholder="0"></div><div class="field" style="margin:8px 0 0"><label>Уплачено взносов</label><input class="input" type="number" inputmode="decimal" data-fszn="paid" data-q="${q.q}" value="${q.paid||""}" placeholder="0"></div></div><div class="qmini"><span>прикидка «к уплате»</span><b>${money(q.target)}</b></div></div>`).join("")}
    <div class="h2">сроки и налоги</div><div class="glass card"><button class="btn primary" data-action="openAddTax">➕ Добавить напоминание</button><p class="fszn-note">Заведи свои сроки (название + дата + повтор). Просроченные и близкие — баннером на главной. Даты ставишь ты — я не бухгалтер.</p></div>
    ${taxes.length?`<div class="list">${taxes.map(r=>{const days=r.date?Math.round((new Date(r.date)-new Date())/86400000):null;const rep=r.repeat&&r.repeat!=="none"?` · повтор: ${{month:"мес.",quarter:"квартал",year:"год"}[r.repeat]}`:"";return `<div class="item"><div class="ic">${days!=null&&days<0?"⛔":""}</div><div class="meta"><div class="t">${esc(r.name)}</div><div class="s">${r.date?fmtDate(r.date)+(days!=null?(days<0?" · просрочено":` · ${days} дн.`):""):"без даты"}${rep}</div></div><button class="edit" data-action="taxPaid" data-id="${r.id}" title="уплачено">✅</button><button class="del" data-action="taxDel" data-id="${r.id}">🗑</button></div>`;}).join("")}</div>`:`<div class="glass empty">Пока нет напоминаний</div>`}
    <div class="h2">отчёты для бухгалтера</div><div class="glass card"><p class="fszn-note" style="margin-top:0">Полный отчёт со всем — кнопка «📄 Полный отчёт (PDF)» на экране «Расходы». Здесь — сводки CSV.</p><button class="btn" data-action="exportCsvQ">📤 Сводка за квартал (CSV)</button><div style="height:10px"></div><button class="btn" data-action="exportCsvY">📤 Сводка за год (CSV)</button></div>
    <div class="glass card"><div class="row between"><b>Параметры ФСЗН</b><button class="btn sm" data-action="saveFsznSettings">💾 Сохранить</button></div><div class="grid2"><div class="field"><label>МЗП за месяц (${year})</label><input id="fszn_mzp" class="input" type="number" inputmode="decimal" value="${s.mzp}"></div><div class="field"><label>Ставка взносов, %</label><input id="fszn_rate" class="input" type="number" inputmode="decimal" value="${s.rate}"></div></div><div class="fszn-note">Мин. взнос за месяц = ставка × МЗП = <b>${money(minMonth)}</b>. Сверяй на portal.ssf.gov.by / в налоговой.</div></div>`; }
function fsznBars(qs){ const W=320,H=150,pad=20,max=Math.max(...qs.map(q=>Math.max(q.target,q.paid)),1),gw=(W-pad*2)/qs.length;
  const cols=qs.map((q,i)=>{const x=pad+i*gw,hT=(q.target/max)*(H-pad*2),hP=(q.paid/max)*(H-pad*2),yT=H-pad-hT,yP=H-pad-hP;const pct=q.target>0?Math.min(100,Math.round(q.paid/q.target*100)):0;return `<g><rect class="need" x="${x+gw*0.12}" y="${yT}" width="${gw*0.30}" height="${hT}" rx="4"/><rect x="${x+gw*0.50}" y="${yP}" width="${gw*0.30}" height="${hP}" rx="4" fill="url(#g2)"><animate attributeName="height" from="0" to="${hP}" dur=".5s" fill="freeze"/><animate attributeName="y" from="${H-pad}" to="${yP}" dur=".5s" fill="freeze"/></rect><text class="cm" x="${x+gw*0.5}" y="${H-6}" text-anchor="middle" font-size="9">Q${q.q}</text><text class="ct" x="${x+gw*0.5}" y="${Math.min(yT,yP)-5}" text-anchor="middle" font-size="9" font-weight="700">${pct}%</text></g>`;}).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="margin-top:10px"><defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a00"/><stop offset="1" stop-color="#ff7d24"/></linearGradient></defs>${cols}</svg><div class="legend" style="margin-top:8px"><div class="li"><span class="dot" style="background:var(--s2);border:1px solid var(--line)"></span>надо (прикидка)</div><div class="li"><span class="dot" style="background:var(--accent)"></span>уплачено</div></div>`; }
async function fsznMiniWidget(){ const s=fsznSettings(),year=YEAR(),minYear=s.rate/100*s.mzp*12; let paid=0; for(let q=1;q<=4;q++){const r=await dbGet("fszn",`${year}-Q${q}`);paid+=Number(r?.paid)||0;} const pct=minYear>0?Math.min(100,Math.round(paid/minYear*100)):0;
  return `<div class="glass card" data-action="openFszn" style="cursor:pointer"><div class="row between"><b>🧾 ФСЗН ${year}</b><span class="badge ${pct>=100?"good":(pct>0?"warn":"soon")}">${pct}%</span></div><div class="progress ${pct>=100?"good":""}"><i data-bar="${pct}%" style="width:0"></i></div><div class="row between small"><span class="muted">уплачено ${money(paid)}</span><span class="muted">цель ${money(minYear)}</span></div></div>`; }

/* ---------- НАСТРОЙКИ ---------- */
async function screenSettings(){ const exps=await dbAll("expenses"); const tgName=localStorage.getItem("blvck_tg_name"); const ipOn=isIP();
  return `<div class="h1">Настройки</div>
    <div class="glass card"><div class="row between"><span>Тема</span><button class="btn sm" data-action="toggleTheme">${document.documentElement.dataset.theme==="dark"?"🌙 Тёмная":"☀️ Светлая"}</button></div><div class="divider"></div><div class="row between"><span>Валюта</span><div class="chips">${CURS.map(c=>`<span class="chip ${c===cur()?"on":""}" data-action="setCur" data-cur="${c}">${c}</span>`).join("")}</div></div></div>

    <div class="info"><div class="it"><span class="d"></span>Где живут данные</div><p>Все твои цифры хранятся <b>только в этом приложении на этом телефоне</b> — в облако ничего не уходит, серверов нет. Запись пишется сама, как ты нажал «Сохранить» в окне ввода. Чтобы не потерять данные при поломке/смене телефона — делай <b>резервную копию</b> ниже. На телефоне самый надёжный путь сохранения — «📄 На экране → PDF».</p></div>

    <div class="h2">деньги, штрафы и чеки</div><div class="glass card"><button class="btn primary" data-action="openDailyRev">💵 Выручка за день</button><div style="height:10px"></div><button class="btn" data-action="openExpenses">📋 Все расходы и графики</button><div style="height:10px"></div><button class="btn" data-action="openFines">🚨 Штрафы</button><div style="height:10px"></div><button class="btn" data-action="openReceipts">🧾 Чеки и выгрузка</button></div>

    <div class="h2">режим ИП</div><div class="glass card"><div class="row between"><div><div style="font-weight:700">Я индивидуальный предприниматель</div><div class="muted small">включает ФСЗН, налоги и виджет взносов</div></div><div class="switch"><span class="chip ${!ipOn?"on":""}" data-action="setIP" data-v="0">Нет</span><span class="chip ${ipOn?"on":""}" data-action="setIP" data-v="1">Да</span></div></div>${ipOn?`<div style="height:10px"></div><button class="btn primary" data-action="openFszn">🧾 Открыть раздел ИП</button>`:""}</div>

    ${TG?`<div class="h2">telegram</div><div class="glass card"><div class="row between"><span>Ты вошёл как</span><b>${esc(tgName||"—")}</b></div><p class="muted small" style="margin:8px 2px 0">Данные хранятся только в этом Telegram на этом устройстве.</p><div class="divider"></div><button class="btn" data-action="tgClose">✖️ Закрыть приложение</button></div>`:""}

    <div class="h2">резервная копия и отчёты</div>
    <div class="glass card">
      <p class="muted small" style="margin-top:0">Копия = один файл со всем (расходы, чеки, доход, штрафы, настройки). Отчёт = читаемый документ со всеми таблицами.</p>
      <button class="btn primary" data-action="export">⬇️ Сохранить копию</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="exportBackupBrowser">🌐 Копию в браузер</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="import">⬆️ Восстановить из файла</button>
      <div style="height:10px"></div>
      <button class="btn" data-action="exportFullPdf">📄 Полный отчёт (PDF)</button>
      <div class="fszn-note">В Telegram при сохранении откроется выбор «куда»: самый надёжный — <b>«📄 На экране → PDF»</b> (системная печать). «⬇️ Скачать» иногда кладёт файл в «Загрузки». Чтобы заработало «📂 Поделиться» — поставь свежий Telegram apk с telegram.org. «🌐 в браузер» на Android может не открыться.</div>
    </div>

    <div class="h2">опасная зона</div><div class="glass card"><button class="btn danger" data-action="wipe">🧹 Удалить все данные</button><p class="muted small" style="margin:8px 2px 0">Записей расходов: ${exps.length}</p></div>
    <p class="muted small" style="text-align:center;margin-top:18px;font-family:var(--mono)">BLVCK TAXI · офлайн · без серверов · бесплатно</p>`; }

/* ---------- модалки ---------- */
function openModal(html){ const m=$("#modal"); m.innerHTML=`<div class="modal">${html}</div>`; m.hidden=false; try{TG?.BackButton?.show();}catch{} }
function closeModal(){ $("#modal").hidden=true; $("#modal").innerHTML=""; state.modalEditId=null; state.modalReceipt=null; try{TG?.BackButton?.hide();}catch{} }
function modalFuelQuick(){ const p=fuelPresets(); openModal(`<div class="mhead"><h3>⛽ Быстрая заправка</h3><button class="x" data-action="close">×</button></div><p class="muted small" style="margin-top:0">один тап — расход записан на сегодня, без ввода цифр</p><div class="presets">${p.map(v=>`<button class="preset" data-action="fuelPreset" data-amt="${v}">${v}<span class="cur">${cur()}</span></button>`).join("")}</div><button class="btn" data-action="quick" data-cat="fuel">✍️ Другая сумма</button><div style="height:8px"></div><button class="btn ghost sm" data-action="openFuelPresets" style="width:100%">⚙️ Настроить суммы</button>`); }
function modalFuelPresets(){ const p=fuelPresets(); openModal(`<div class="mhead"><h3>⚙️ Суммы быстрой заправки</h3><button class="x" data-action="close">×</button></div><div class="grid3"><div class="field"><label>Сумма 1</label><input id="fp0" class="input" type="number" inputmode="decimal" value="${p[0]}"></div><div class="field"><label>Сумма 2</label><input id="fp1" class="input" type="number" inputmode="decimal" value="${p[1]}"></div><div class="field"><label>Сумма 3</label><input id="fp2" class="input" type="number" inputmode="decimal" value="${p[2]}"></div></div><button class="btn primary" data-action="saveFuelPresets">Сохранить</button>`); }
function openDrive(){ const p=fuelPresets(); const m=$("#modal"); m.innerHTML=`<div class="drive"><div class="dhead"><div class="dtitle">🚦 За рулём</div><button class="x" data-action="close">×</button></div><div class="dpresets">${p.map(v=>`<button class="dbig" data-action="fuelPreset" data-amt="${v}">⛽ ${v}<span class="cur">${cur()}</span></button>`).join("")}</div><div class="drow"><button class="dcat" data-action="driveCat" data-cat="wash">🫧 Мойка</button><button class="dcat" data-action="driveCat" data-cat="repair">🔧 Ремонт</button><button class="dcat" data-action="driveCat" data-cat="other">📦 Другое</button></div><button class="btn danger" data-action="close">✖ Выйти из режима</button></div>`; m.hidden=false; try{TG?.BackButton?.show();}catch{} }
async function modalDailyRev(){ const exps=await dbAll("expenses"); const miss=missingWorkDays(exps,daysAgo(34),today()).slice(0,14); const def=today(); const rev=dailyRevOf(def); const target=getDailyTarget();
  const days=[]; for(let i=13;i>=0;i--) days.push(daysAgo(i)); const drm=dailyRevMap(); const max=Math.max(...days.map(d=>dailyRevOf(d)),1); const moShort=d=>new Date(d+"T00:00:00").toLocaleDateString("ru-RU",{month:"short"});
  const chart=`<div class="fszn-note" style="margin:0 0 2px">Выручка по дням (с копейками). Тап по столбику = выбрать день и подставить сумму.</div><div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:6px 0 4px"><div style="display:flex;gap:6px;align-items:flex-end;height:168px;min-width:100%;padding:6px 0 0;box-sizing:border-box"><div aria-hidden="true" style="flex:0 0 8px"></div>${days.map((d,i)=>{const has=Object.prototype.hasOwnProperty.call(drm,d);const v=dailyRevOf(d);const barH=v>0?Math.max(6,Math.round(v/max*104)):6;const sel=d===def;const showMo=(i===0)||(moShort(d)!==moShort(days[i-1]));const dd=d.slice(8,10),mo=moShort(d);const valTxt=has?(v>0?Number(v).toLocaleString("ru-RU",{maximumFractionDigits:2}):"0"):"·";return `<div class="revcol" data-action="pickDay" data-date="${d}" style="flex:1 0 46px;min-width:46px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;cursor:pointer;outline:${sel?'2px solid #fff':'none'};outline-offset:2px;border-radius:10px;padding:2px"><div style="font-size:10px;font-weight:800;color:var(--text);opacity:${v>0?1:.35};margin-bottom:3px;white-space:nowrap;letter-spacing:-.3px">${valTxt}</div><div style="width:80%;height:${barH}px;border-radius:6px 6px 3px 3px;background:${v>0?'linear-gradient(180deg,#ff7d24,#ff5a00)':'var(--s2)'};border:1px solid ${v>0?'transparent':'var(--line)'};transition:height .3s"></div><div style="margin-top:4px;text-align:center;line-height:1.05"><div class="revdd" style="font-size:11px;font-weight:${sel?800:600};color:${sel?'#fff':'var(--muted)'}">${dd}</div><div style="font-size:9px;color:var(--muted);visibility:${showMo?'visible':'hidden'}">${mo}</div></div></div>`;}).join("")}<div aria-hidden="true" style="flex:0 0 8px"></div></div></div>`;
  const chips=miss.length?`<div class="field"><label>Быстро — рабочие дни без выручки</label><div class="chips">${miss.map(d=>`<span class="chip" data-action="pickDay" data-date="${d}">${d.slice(8,10)}.${d.slice(5,7)}</span>`).join("")}</div><div class="fszn-note">тап по дате подставит её и подтянет сумму</div></div>`:"";
  openModal(`<div class="mhead"><h3>💵 Выручка за день</h3><button class="x" data-action="close">×</button></div><p class="muted small" style="margin-top:0">сегодня или любой прошлый день — доход, тренд и карта дней пересчитаются сами</p><div class="grid2"><div class="field"><label>Дата</label><input id="d_date" class="input" type="date" value="${def}"></div><div class="field"><label>Выручка за день</label><input id="d_rev" class="input" type="number" inputmode="decimal" value="${rev||""}" placeholder="0"></div></div><div class="field" style="margin:6px 0 0">${chart}</div>${chips}<div class="field"><label>План на день (необязательно, общий)</label><input id="d_target" class="input" type="number" inputmode="decimal" value="${target||""}" placeholder="сколько хочу привезти"></div><button class="btn primary" data-action="saveDailyRev">Сохранить</button>`); setTimeout(()=>$("#d_rev")?.focus(),60); }
function highlightRevCol(date){ document.querySelectorAll(".revcol").forEach(el=>{const on=el.dataset.date===date;el.style.outline=on?"2px solid #fff":"none";const dd=el.querySelector(".revdd");if(dd){dd.style.color=on?"#fff":"var(--muted)";dd.style.fontWeight=on?"800":"600";}}); }
function modalExpense(cat,edit=null){
  const ecat = edit ? edit.category : cat;
  state.modalCat=ecat; state.modalEditId=edit?edit.id:null; state.modalReceipt=edit?.receipt||null;
  const v=edit||{};
  const isWear = WEAR_CATS.includes(ecat);
  const noteLabel = (ecat==="repair"||ecat==="parts") ? "Деталь / работа" : "Заметка";
  const mileLabel = (ecat==="repair"||ecat==="parts") ? "Пробег установки, км" : "Пробег, км";
  const noteHint  = (ecat==="repair"||ecat==="parts") ? "название детали — по нему считается износ" : "например: АЗС Лукойл";
  const mileField = isWear ? `<div class="field"><label>${mileLabel}</label><input id="m_mileage" class="input" type="number" inputmode="numeric" value="${v.mileage??""}" placeholder="${ecat==="fuel"?"необяз.":"обязательно для износа"}"></div>` : "";
  openModal(`<div class="mhead"><h3>${edit?"✏️ Изменить":CATS[ecat].ico+" "+CATS[ecat].t}</h3><button class="x" data-action="close">×</button></div>
    <div class="field"><label>Сумма</label><input id="m_amount" class="input" type="number" inputmode="decimal" value="${v.amount??""}" placeholder="0" autofocus></div>
    <div class="grid2"><div class="field"><label>Дата</label><input id="m_date" class="input" type="date" value="${v.date||today()}"></div>${mileField}</div>
    <div class="field"><label>${noteLabel}</label><input id="m_note" class="input" value="${esc(v.note||"")}" placeholder="${noteHint}"></div>
    <div class="field"><label>Чек / скриншот</label><div id="m_receipt_box">${receiptBoxHTML()}</div></div>
    <button class="btn primary" data-action="saveExpense">${edit?"Сохранить изменения":"Сохранить"}</button>`);
  setTimeout(()=>$("#m_amount")?.focus(),60);
}
function modalMaint(){ openModal(`<div class="mhead"><h3>🔧 Событие ТО</h3><button class="x" data-action="close">×</button></div><div class="field"><label>Что сделали</label><input id="m_title" class="input" placeholder="Замена колодок" autofocus></div><div class="grid2"><div class="field"><label>Дата</label><input id="m_date" class="input" type="date" value="${today()}"></div><div class="field"><label>Пробег, км</label><input id="m_mileage" class="input" type="number" inputmode="numeric"></div></div><div class="field"><label>Заметка</label><input id="m_note" class="input"></div><button class="btn primary" data-action="saveMaint">Сохранить</button>`); }
function modalDoc(){ openModal(`<div class="mhead"><h3>📄 Документ</h3><button class="x" data-action="close">×</button></div><div class="field"><label>Быстрые названия</label><div class="chips">${DOC_PRESETS.map(t=>`<span class="chip" data-action="docPreset" data-name="${esc(t)}">${esc(t)}</span>`).join("")}</div></div><div class="field"><label>Название</label><input id="m_name" class="input" placeholder="Страховка / Техосмотр" autofocus></div><div class="grid2"><div class="field"><label>Выдан</label><input id="m_issue" class="input" type="date"></div><div class="field"><label>Действует до</label><input id="m_expiry" class="input" type="date"></div></div><div class="field"><label>Заметка</label><input id="m_note" class="input"></div><button class="btn primary" data-action="saveDoc">Сохранить</button>`); }
async function modalCar(){ const car=await dbGet("car",1)||{}; openModal(`<div class="mhead"><h3>🚗 Автомобиль</h3><button class="x" data-action="close">×</button></div><div class="field"><label>Модель</label><input id="m_model" class="input" value="${esc(car.model||"")}" placeholder="Skoda Octavia"></div><div class="grid2"><div class="field"><label>Номер</label><input id="m_plate" class="input" value="${esc(car.plate||"")}" placeholder="1234 AB-7"></div><div class="field"><label>Расход л/100</label><input id="m_fuel" class="input" type="number" inputmode="decimal" value="${esc(car.fuelPer100||"")}"></div></div><div class="grid2"><div class="field"><label>Текущий пробег</label><input id="m_km" class="input" type="number" inputmode="numeric" value="${esc(car.currentMileage||"")}"></div><div class="field"><label>Масло на км</label><input id="m_oilkm" class="input" type="number" inputmode="numeric" value="${esc(car.lastOilMileage||"")}"></div></div><div class="field"><label>Интервал замены масла, км</label><input id="m_oilint" class="input" type="number" inputmode="numeric" value="${esc(car.oilInterval||"10000")}"></div><button class="btn primary" data-action="saveCar">Сохранить</button>`); }
function modalTaxReminder(){ openModal(`<div class="mhead"><h3>🗓 Напоминание по сроку</h3><button class="x" data-action="close">×</button></div><div class="field"><label>Быстрые названия</label><div class="chips">${TAX_PRESETS.map(t=>`<span class="chip" data-action="taxPreset" data-name="${esc(t)}">${esc(t)}</span>`).join("")}</div></div><div class="field"><label>Название</label><input id="t_name" class="input" placeholder="Единый налог" autofocus></div><div class="grid2"><div class="field"><label>Срок</label><input id="t_date" class="input" type="date" value="${today()}"></div><div class="field"><label>Повтор</label><select id="t_repeat" class="input"><option value="none">без повтора</option><option value="month">каждый месяц</option><option value="quarter">каждый квартал</option><option value="year">каждый год</option></select></div></div><button class="btn primary" data-action="saveTax">Сохранить</button>`); }
function modalFine(){ openModal(`<div class="mhead"><h3>🚨 Штраф</h3><button class="x" data-action="close">×</button></div><div class="field"><label>Быстрые названия</label><div class="chips">${FINE_PRESETS.map(t=>`<span class="chip" data-action="finePreset" data-name="${esc(t)}">${esc(t)}</span>`).join("")}</div></div><div class="field"><label>За что</label><input id="f_name" class="input" placeholder="Камера / превышение" autofocus></div><div class="grid2"><div class="field"><label>Сумма</label><input id="f_amount" class="input" type="number" inputmode="decimal" placeholder="0"></div><div class="field"><label>Дата выписки</label><input id="f_date" class="input" type="date" value="${today()}"></div></div><button class="btn primary" data-action="saveFine">Сохранить как неоплаченный</button>`); setTimeout(()=>$("#f_name")?.focus(),60); }

/* ---------- действия ---------- */
async function fuelPreset(amt){ await dbPut("expenses",{id:uid(),category:"fuel",amount:amt,date:today(),mileage:null,note:"быстрая заправка"}); closeModal(); toast(`Заправка ${money(amt)}`); hapticOk(); renderAsync(); }
function saveFuelPresets(){ const a=[0,1,2].map(i=>parseFloat($("#fp"+i).value)||0); if(a.some(v=>v<=0)){toast("Все суммы должны быть > 0");hapticBad();return;} setFuelPresets(a); closeModal(); toast("Суммы сохранены"); hapticOk(); }
function saveDailyRev(){ const date=($("#d_date")?.value)||today(); const rev=parseFloat($("#d_rev").value)||0; const target=parseFloat($("#d_target").value)||0; setDailyRev(date,rev); setDailyTarget(target); closeModal(); toast(rev>0?`Выручка ${money(rev)} · ${date===today()?"сегодня":fmtDate(date)}`:`Выручка за ${fmtDate(date)} очищена`); hapticOk(); renderAsync(); }
async function saveExpense(){ const amount=parseFloat($("#m_amount").value); if(!amount||amount<=0){toast("Введи сумму");hapticBad();return;}
  const mileEl=$("#m_mileage"); const mileage = mileEl ? (parseFloat(mileEl.value)||0) : 0;
  const e={id:state.modalEditId||uid(),category:state.modalCat,amount,date:$("#m_date").value||today(),mileage:mileage>0?mileage:null,note:$("#m_note").value.trim(),receipt:state.modalReceipt||null};
  await dbPut("expenses",e);
  if(e.mileage){ const car=await dbGet("car",1)||{id:1}; if(!car.currentMileage||e.mileage>car.currentMileage){car.currentMileage=e.mileage;await dbPut("car",car);} }
  closeModal(); toast(state.modalEditId?"Изменено":"Расход добавлен"); hapticOk(); renderAsync(); }
async function editExpense(id){ const r=await dbGet("expenses",id); if(r) modalExpense(r.category,r); }
async function saveMaint(){ const title=$("#m_title").value.trim(); if(!title){toast("Введи описание");hapticBad();return;} const mileage=parseFloat($("#m_mileage").value); await dbPut("maintenance",{id:uid(),title,date:$("#m_date").value||today(),mileage:mileage>0?mileage:null,note:$("#m_note").value.trim()}); closeModal(); toast("Событие ТО добавлено"); hapticOk(); renderAsync(); }
async function saveDoc(){ const name=$("#m_name").value.trim(); if(!name){toast("Введи название");hapticBad();return;} await dbPut("documents",{id:uid(),name,issueDate:$("#m_issue").value||null,expiryDate:$("#m_expiry").value||null,note:$("#m_note").value.trim()}); closeModal(); toast("Документ добавлен"); hapticOk(); renderAsync(); }
async function saveCar(){ await dbPut("car",{id:1,model:$("#m_model").value.trim(),plate:$("#m_plate").value.trim(),fuelPer100:parseFloat($("#m_fuel").value)||null,currentMileage:parseFloat($("#m_km").value)||0,lastOilMileage:parseFloat($("#m_oilkm").value)||0,oilInterval:parseFloat($("#m_oilint").value)||10000}); closeModal(); toast("Авто сохранено"); hapticOk(); renderAsync(); }
function saveFsznSettings(){ const m=parseFloat($("#fszn_mzp").value)||0,r=parseFloat($("#fszn_rate").value)||0; if(m<=0||r<=0){toast("МЗП и ставка должны быть > 0");hapticBad();return;} localStorage.setItem("blvck_fszn_mzp",String(m)); localStorage.setItem("blvck_fszn_rate",String(r)); toast("Параметры сохранены"); hapticOk(); renderAsync(); }
async function saveFsznField(q,field,value){ const id=`${YEAR()}-Q${q}`; const rec=await dbGet("fszn",id)||{id,year:YEAR(),quarter:q,income:0,paid:0}; rec[field]=value; await dbPut("fszn",rec); }
function saveIncome(){ const v=parseFloat($("#income_month").value)||0; setIncome(ymNow(),v); toast("Доход сохранён"); hapticOk(); renderAsync(); }
function saveEff(){ setKm(ymNow(),parseFloat($("#eff_km").value)||0); setHours(ymNow(),parseFloat($("#eff_hours").value)||0); toast("Пробег и часы сохранены"); hapticOk(); renderAsync(); }
function saveTax(){ const name=$("#t_name").value.trim(); if(!name){toast("Введи название");hapticBad();return;} const l=taxList(); l.push({id:uid(),name,date:$("#t_date").value||null,repeat:$("#t_repeat").value}); saveTaxList(l); closeModal(); toast("Напоминание добавлено"); hapticOk(); renderAsync(); }
function taxPaid(id){ const l=taxList(); const r=l.find(x=>x.id===id); if(!r) return; if(r.repeat&&r.repeat!=="none"&&r.date){ const d=new Date(r.date+"T00:00:00"); if(r.repeat==="month")d.setMonth(d.getMonth()+1); if(r.repeat==="quarter")d.setMonth(d.getMonth()+3); if(r.repeat==="year")d.setFullYear(d.getFullYear()+1); r.date=d.toISOString().slice(0,10); saveTaxList(l); toast(`Отмечено · след. срок ${fmtDate(r.date)}`); } else { saveTaxList(l.filter(x=>x.id!==id)); toast("Удалено"); } hapticOk(); renderAsync(); }
function taxDel(id){ saveTaxList(taxList().filter(x=>x.id!==id)); toast("Удалено"); haptic(); renderAsync(); }
function saveFine(){ const name=$("#f_name").value.trim(); if(!name){toast("Введи «за что»");hapticBad();return;} const amount=parseFloat($("#f_amount").value)||0; if(amount<=0){toast("Введи сумму");hapticBad();return;} const l=finesList(); l.push({id:uid(),name,amount,date:$("#f_date").value||today(),paid:false,paidDate:null,expenseId:null}); saveFinesList(l); closeModal(); toast("Штраф добавлен — висит долгом"); hapticOk(); renderAsync(); }
async function finePaid(id){ const l=finesList(); const r=l.find(x=>x.id===id); if(!r||r.paid) return; r.paid=true; r.paidDate=today(); const exp={id:uid(),category:"other",amount:r.amount,date:today(),mileage:null,note:"Штраф: "+r.name,receipt:null}; await dbPut("expenses",exp); r.expenseId=exp.id; saveFinesList(l); toast("Оплачено → ушло в расходы"); hapticOk(); renderAsync(); }
async function fineDel(id){ if(!confirm("Удалить штраф?")) return; const l=finesList(); const r=l.find(x=>x.id===id); if(r&&r.paid&&r.expenseId) await dbDel("expenses",r.expenseId); saveFinesList(l.filter(x=>x.id!==id)); toast("Удалено"); haptic(); renderAsync(); }

/* ---------- CSV ---------- */
function csvCell(v){ v=String(v??""); return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
async function exportCSV(kind){ const year=YEAR(),q=CUR_Q();
  const months=kind==="quarter"?[`${year}-${String((q-1)*3+1).padStart(2,"0")}`,`${year}-${String((q-1)*3+2).padStart(2,"0")}`,`${year}-${String((q-1)*3+3).padStart(2,"0")}`]:Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,"0")}`);
  const set=new Set(months); const exps=(await dbAll("expenses")).filter(e=>set.has(e.date.slice(0,7))).sort((a,b)=>a.date.localeCompare(b.date)); const pl=kind==="quarter"?`${year} Q${q}`:`${year}`;
  const L=[["BLVCK TAXI — сводка за "+pl],["Сформировано",today()],[],["РАСХОДЫ"],["Дата","Категория","Деталь/Заметка","Пробег км","Есть чек","Сумма "+cur()]]; let total=0;
  exps.forEach(e=>{total+=Number(e.amount||0);L.push([e.date,(CATS[e.category]?.t||e.category),e.note||"",e.mileage||"",e.receipt?"да":"нет",e.amount]);});
  L.push(["","","","","ИТОГО",total.toFixed(2)],[],["ПО КАТЕГОРИЯМ"]); const byCat={}; exps.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0)); Object.entries(byCat).forEach(([k,v])=>L.push([(CATS[k]?.t||k),v.toFixed(2)]));
  L.push([],["ВЫРУЧКА ПО ДНЯМ"]); const drm=dailyRevMap(); Object.keys(drm).filter(d=>set.has(d.slice(0,7))).sort().forEach(d=>L.push([d,Number(drm[d]).toFixed(2)]));
  L.push([],["ДОХОД ПО МЕСЯЦАМ"]); months.forEach(ym=>L.push([monthLabel(ym),incomeOf(ym).toFixed(2)]));
  L.push([],["ШТРАФЫ (оплаченные за период)"]); finesList().filter(f=>f.paid&&set.has((f.paidDate||"").slice(0,7))).sort((a,b)=>(a.paidDate||"").localeCompare(b.paidDate||"")).forEach(f=>L.push([f.paidDate,f.name,Number(f.amount).toFixed(2)]));
  if(isIP()){ const s=fsznSettings(); L.push([],["ФСЗН ПО КВАРТАЛАМ"],["Квартал","Доход","Минимум","Уплачено"]); const qs=kind==="quarter"?[q]:[1,2,3,4]; for(const qq of qs){ const rec=await dbGet("fszn",`${year}-Q${qq}`)||{paid:0}; const inc=quarterIncome(qq,year); L.push([`Q${qq}`,inc.toFixed(2),(s.rate/100*s.mzp*3).toFixed(2),(Number(rec.paid)||0).toFixed(2)]); } }
  const csv="\uFEFF"+L.map(r=>r.map(csvCell).join(";")).join("\r\n");
  const r=await saveFile(`blvck-taxi-${kind}-${pl.replace(/\s/g,"")}.csv`, csv, "text/csv;charset=utf-8", {title:"Сводка BLVCK TAXI"}); handleSaveResult(r); }

/* ---------- бэкап ---------- */
const LS_KEYS=["blvck_cur","blvck_theme","blvck_is_ip","blvck_income","blvck_km","blvck_hours","blvck_fuel_presets","blvck_tax_reminders","blvck_fszn_mzp","blvck_fszn_rate","blvck_streak_best","blvck_fines","blvck_daily_rev","blvck_daily_target","blvck_tg_name","blvck_onboarded"];
async function buildBackupPayload(){ const data={_app:"BLVCK TAXI",_v:3,_at:new Date().toISOString()}; for(const s of STORES) data[s]=await dbAll(s); data._ls=Object.fromEntries(LS_KEYS.map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!=null)); return data; }
async function exportBackup(){ const data=await buildBackupPayload();
  const r=await saveFile(`blvck-taxi-backup-${today()}.json`, JSON.stringify(data,null,2), "application/json", {title:"Резервная копия BLVCK TAXI", text:"Файл резервной копии"}); handleSaveResult(r); }
async function exportBackupBrowser(){ const data=await buildBackupPayload(); const json=JSON.stringify(data);
  if(json.length > 1500000){ toast("Копия большая (есть чеки‑картинки) — сохрани через «Сохранить копию»"); return; }
  const r=await openBrowserWith(`blvck-taxi-backup-${today()}.json`, json, "application/json");
  if(r.ok){ hapticOk(); toast("Открываю в браузере → там ⋮ «Скачать»"); } else { toast("Браузер не открылся — используй «Сохранить копию»"); } }
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
  const host=ev.target.closest(".btn,.qcard,.preset,.chip,.tab,.dcat,.dbig,.pbtn,.iconbtn,.seg button");
  if(host){ const r=document.createElement("span"); r.className="ripple"; const rc=host.getBoundingClientRect(); const sz=Math.max(rc.width,rc.height); r.style.width=r.style.height=sz+"px"; r.style.left=(ev.clientX-rc.left-sz/2)+"px"; r.style.top=(ev.clientY-rc.top-sz/2)+"px"; host.appendChild(r); setTimeout(()=>r.remove(),600); }
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
    case "exportFullPdf": exportFullPdf(); break;
    case "exportFullHtml": exportFullHtml(); break;
    case "exportFullBrowser": exportFullBrowser(); break;
    case "exportBackupBrowser": exportBackupBrowser(); break;
    case "helpViewPrint": { const h=window.__bt_help; if(h&&h.htmlView){ openHtmlViewer(h.htmlView); } else { toast("Для этого файла просмотр на экране недоступен"); } } break;
    case "helpDownload": helpDownload(); break;
    case "helpShare": { const h=window.__bt_help; if(h){ const sr=await shareFiles(h.name||"blvck-taxi-file", h.content, h.mime, {title:"BLVCK TAXI"}); if(sr.ok){ hapticOk(); toast("Готово"); closeModal(); } else if(sr.aborted){ /* закрыл меню */ } else { toast("Меню не открылось — обнови Telegram или «На экране → PDF»"); } } } break;
    case "helpBrowser": { const h=window.__bt_help; if(h){ const r=await openBrowserWith(h.name||"blvck-taxi-file", h.content, h.mime); if(r.ok){ hapticOk(); toast("Открываю в браузере → там ⋮ «Скачать» / «Печать→PDF»"); closeModal(); } else { toast("На Android обычно не открывается — используй «На экране → PDF»"); } } } break;
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
    case "exportReceiptsHtml": exportReceiptsHtml(); break;
    case "exportReceiptsBrowser": exportReceiptsBrowser(); break;
    case "exportReceiptsZip": exportReceiptsZip(); break;
    case "exportReceiptsCsv": exportReceiptsCsv(); break;
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
    case "exportCsvQ": exportCSV("quarter"); break;
    case "exportCsvY": exportCSV("year"); break;
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
(async function init(){ applyTheme(); makeParticles(); setupTelegram(); await openDB(); state._animateScreen=true; await renderAsync();
  const act=new URLSearchParams(location.search).get("act"); if(act){ history.replaceState(null,"",location.pathname+location.hash); if(act==="fuel") modalFuelQuick(); else if(CATS[act]) modalExpense(act); }
  if("serviceWorker" in navigator){ window.addEventListener("load", ()=>navigator.serviceWorker.register("./sw.js").catch(()=>{})); }
})();