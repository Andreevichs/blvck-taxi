/* =========================================================
   pro.js — подписка PRO + замок + триал + демо-витрина.
   Перезаписывает window.BLVCK_PRO (заглушку из app.js) на верхнем
   уровне, поэтому ядро (app.js) править НЕ надо: tax.js и кнопки
   сами начнут видеть реальный статус. Точки входа в PRO вшиваются
   хуком в готовую разметку (плашка на главной + кнопка в настройках).
   Оплата — Telegram Stars (createInvoiceLink + openInvoice); подтверждение
   по факту paid-callback (звёзды списывает сам Telegram при openInvoice).
   ВАЖНО для чипов Mali: НИКАКИХ css-анимаций — рендер статичный,
   живость только через textContent. Иначе вернётся оранжевый «овал».
   ========================================================= */
(function(){
  /* ---- конфиг тарифов (BYN — для витрины, XTR/Stars — для invoice) ---- */
  const PLANS = {
    month:   { byn:5,  stars:25,  label:'Месяц',    days:30,   note:'без обязательств' },
    year:    { byn:39, stars:175, label:'Год',      days:365,  note:'−35% · как 7 по цене 5' },
    forever: { byn:89, stars:400, label:'Навсегда', days:36500,note:'один раз — и забыл' }
  };
  const RENDER = (window.RENDER_URL || '').replace(/\/+$/,'');
  const LS_KEY = 'blvck_pro_status';

  /* ---- статус: кэш + сервер ---- */
  function readCache(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }catch(e){ return {}; } }
  function writeCache(s){ try{ localStorage.setItem(LS_KEY, JSON.stringify(s)); }catch(e){} }
  function isActive(s){ return !!(s && s.active); }
  function statusNow(){ return readCache(); }

  async function refreshStatus(){
    if(!window.isTelegram || !window.TG || !window.TG.initData){ return readCache(); }
    try{
      const r = await fetch(RENDER + '/pro/status', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ initData: window.TG.initData })
      });
      if(r.ok){ const s = await r.json(); writeCache(s); return s; }
    }catch(e){}
    return readCache();
  }

  /* ---- публичный API замка: ЛЮБАЯ платная фича -> active ---- */
  function unlocked(/*feature*/){ return isActive(statusNow()); }

  /* ---- демо-витрина на реальных данных (читаем ядро app.js) ---- */
  async function demoNumbers(){
    const ym = window.ymNow ? window.ymNow() : new Date().toISOString().slice(0,7);
    let spent = 0, carCost = 0;
    try{
      const exps = await window.dbAll('expenses');
      const ms = new Date(); ms.setDate(1); ms.setHours(0,0,0,0);
      const CAR = ['fuel','parts','repair','wash','rent'];
      exps.forEach(e=>{ const d=new Date(e.date); if(d>=ms){ const a=Number(e.amount||0); spent+=a; if(CAR.includes(e.category)) carCost+=a; } });
    }catch(e){}
    const inc = window.sumDaysForYM ? window.sumDaysForYM(ym).sum : 0;
    const pct = inc>0 ? Math.round(carCost/inc*100) : 0;
    return { spent, carCost, inc, pct, ym };
  }

  /* ---- экран PRO (статичный, редакторская раскладка) ---- */
  async function openScreen(){
    const s = statusNow();
    const dn = await demoNumbers();
    const cur = window.cur ? window.cur() : 'BYN';
    const M = window.money || (n=>n);
    const active = isActive(s);
    const trial = !!(s.trial_active);
    const tleft = s.trial_days_left|0;

    const statusLine = active
      ? `<span class="pro-dot on"></span><span>PRO активна${s.until?' · до '+new Date(s.until).toLocaleDateString('ru-RU'):''}</span>`
      : (trial
        ? `<span class="pro-dot trial"></span><span>Триал · ${tleft} ${window.ruPlural?window.ruPlural(tleft,['день','дня','дней']):'дн.'} бесплатно</span>`
        : `<span class="pro-dot off"></span><span>Бесплатный режим</span>`);

    const demo = `
      <div class="pro-demo">
        <div class="pro-demo-h"><span class="pro-k">твой отчёт · демо</span><span class="pro-k">${new Date().toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</span></div>
        <div class="pro-demo-big">${dn.pct}<span class="u">%</span></div>
        <div class="pro-demo-l">доля машины в выручке${!active&&!trial?' · <b>разблокируется в PRO</b>':''}</div>
        <div class="pro-demo-bar"><i style="width:${Math.min(100,dn.pct)}%"></i></div>
        <div class="pro-demo-row"><span>машина съела</span><b>${M(dn.carCost)}</b></div>
        <div class="pro-demo-row"><span>выручка за месяц</span><b>${dn.inc>0?M(dn.inc):'—'}</b></div>
        <div class="pro-demo-row"><span>расходов учтено</span><b>${M(dn.spent)}</b></div>
      </div>`;

    const tiers = Object.entries(PLANS).map(([k,p],i)=>{
      const cls = k==='forever' ? 'pro-tier top' : (k==='year' ? 'pro-tier hot' : 'pro-tier');
      const badge = k==='year' ? '<span class="pro-badge">выгодно</span>' : (k==='forever' ? '<span class="pro-badge">навсегда</span>' : '');
      return `<button class="${cls}" data-action="proBuy" data-plan="${k}">
        <span class="pro-tier-l">${p.label}${badge}</span>
        <span class="pro-tier-p">${p.byn}<span class="pro-tier-c">${cur}</span></span>
        <span class="pro-tier-x">≈ ${p.stars} ⭐</span>
        <span class="pro-tier-n">${p.note}</span>
      </button>`;
    }).join('');

    const trialBtn = (!active && trial && !s.trial_demo_sent)
      ? `<button class="btn pro-ghostbtn" data-action="proTrialDemo">📨 Получить демо‑отчёт в чат</button>` : '';
    const openAppNote = !window.isTelegram
      ? `<div class="pro-note">Оплата и авто‑отчёты работают внутри Telegram. Открой приложение через бота — и PRO активируется здесь же.</div>` : '';

    const html = `
      <div class="mhead"><h3>BLVCK <span style="color:var(--accent)">PRO</span></h3><button class="x" data-action="close">×</button></div>
      <div class="pro-status">${statusLine}</div>
      <p class="pro-lead">Ядро бесплатно навсегда. PRO добавляет то, что без сервера не живёт: авто‑PDF в чат первого числа, облачный бэкап между телефонами, живой расчёт единого / подоходного и пинги по срокам.</p>
      ${demo}
      <div class="pro-tiers-h"><span class="pro-k">выбери тариф</span><span class="pro-k">оплата в ⭐</span></div>
      <div class="pro-tiers">${tiers}</div>
      ${trialBtn}
      ${openAppNote}
      <p class="pro-fine">Звёзды списывает Telegram при подтверждении покупки. Авто‑отчёт уходит 1‑го числа каждому, у кого PRO активна. Цены в ⭐ — ориентир по курсу Telegram, витрина показывает BYN.</p>`;

    window.openModal(html);
  }

  /* ---- покупка: invoice -> openInvoice -> confirm ---- */
  async function buy(plan){
    const p = PLANS[plan]; if(!p){ return; }
    if(!window.isTelegram || !window.TG){ window.toast('Открой приложение через бота для оплаты'); return; }
    if(!window.TG.openInvoice){ window.toast('Твой Telegram не поддерживает оплату — обнови приложение'); return; }
    window.toast('Готовлю оплату…'); window.haptic && window.haptic('light');
    let link;
    try{
      const r = await fetch(RENDER + '/pro/create-invoice', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ initData: window.TG.initData, plan })
      });
      if(!r.ok){ window.toast('Не удалось создать счёт'); window.hapticBad && window.hapticBad(); return; }
      link = (await r.json()).invoiceLink;
    }catch(e){ window.toast('Нет связи с сервером'); window.hapticBad && window.hapticBad(); return; }
    if(!link){ window.toast('Счёт не создан'); return; }
    window.TG.openInvoice(link, async (status)=>{
      if(status === 'paid'){
        try{
          await fetch(RENDER + '/pro/confirm', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ initData: window.TG.initData, plan })
          });
        }catch(e){}
        const s = await refreshStatus();
        window.hapticOk && window.hapticOk();
        window.toast('PRO активирована ✅');
        window.renderAsync && window.renderAsync();
        openScreen();
      } else if(status === 'cancelled'){
        window.toast('Оплата отменена');
      }
    });
  }

  async function trialDemo(){
    if(!window.isTelegram || !window.TG){ return; }
    window.toast('Отправляю демо‑отчёт…'); window.haptic && window.haptic('light');
    try{
      const r = await fetch(RENDER + '/pro/trial-demo', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ initData: window.TG.initData })
      });
      if(r.ok){ window.hapticOk && window.hapticOk(); window.toast('Демо‑отчёт улетел в чат 📨'); await refreshStatus(); openScreen(); }
      else { window.toast('Не вышло — возможно, уже отправляли'); window.hapticBad && window.hapticBad(); }
    }catch(e){ window.toast('Нет связи с сервером'); window.hapticBad && window.hapticBad(); }
  }

  /* ---- инъекция точек входа в готовую разметку (без правок app.js) ---- */
  function inject(){
    try{
      const s = statusNow(); const active = isActive(s);
      /* главная: плашка перед блоком инструментов */
      if(window.state && window.state.screen === 'dash'){
        const tg = document.querySelector('.toolgrid');
        if(tg && !document.getElementById('pro-dash-plaque')){
          const txt = active ? 'PRO активна · авто‑отчёт придёт 1‑го'
                    : (s.trial_active ? `Триал PRO · ${s.trial_days_left|0} дн. · смотри, что внутри` : 'BLVCK PRO · авто‑отчёты, облако, налоги');
          const plaque = `<button id="pro-dash-plaque" class="pro-plaque" data-action="proOpen">
            <span class="pro-plaque-d"></span>
            <span class="pro-plaque-t">${txt}</span>
            <span class="pro-plaque-a">${active?'управлять':'открыть'} →</span>
          </button>`;
          tg.insertAdjacentHTML('beforebegin', plaque);
        }
      }
      /* настройки: кнопка в карточке резервной копии */
      const anchor = document.querySelector('[data-action="syncCloud"]');
      if(anchor){
        const card = anchor.closest('.glass');
        if(card && !card.querySelector('[data-action="proOpen"]')){
          card.insertAdjacentHTML('beforeend',
            `<div style="height:10px"></div><button class="btn primary" data-action="proOpen">🔓 BLVCK PRO · подписка и авто‑отчёты</button>`);
        }
      }
    }catch(e){}
  }

  /* ---- регистрация в ядре ---- */
  window.BLVCK_PRO = { unlocked, openScreen };
  window.BLVCK_HOOKS = window.BLVCK_HOOKS || [];
  window.BLVCK_HOOKS.push(inject);

  document.addEventListener('click', function(e){
    const el = e.target.closest('[data-action]'); if(!el) return;
    const a = el.getAttribute('data-action');
    if(a === 'proOpen'){ openScreen(); }
    else if(a === 'proBuy'){ buy(el.getAttribute('data-plan')); }
    else if(a === 'proTrialDemo'){ trialDemo(); }
  });

  /* ---- фоновая сверка статуса (не блокирует загрузку) ---- */
  (async function boot(){
    const s = await refreshStatus();
    /* если открыт залоченный экран — перерисуем, чтобы замок/разлок встал верно */
    if(window.state && (window.state.screen==='fszn')){ window.renderAsync && window.renderAsync(); }
  })();
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible'){
      refreshStatus().then(()=>{ if(window.state && window.state.screen==='fszn'){ window.renderAsync && window.renderAsync(); } });
    }
  });
})();