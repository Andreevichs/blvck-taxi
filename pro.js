/* =========================================================
   pro.js — подписка PRO + замок + триал + демо-витрина.
   Перезаписывает window.BLVCK_PRO (заглушку из app.js). Точки входа
   вшиваются хуком + догоняющим интервалом. Оплата — Telegram Stars.
   ВАЖНО для чипов Mali: рендер статичный, без css-анимаций.
   FIX разлока: после сверки статуса экран перерисовывается всегда,
   чтобы замок снимался мгновенно (нужно владельцу и оплатившим).
   ========================================================= */
(function(){
  const PLANS = {
    month:   { byn:5,  stars:25,  label:'Месяц',    days:30,    note:'без обязательств' },
    year:    { byn:39, stars:175, label:'Год',      days:365,   note:'−35% · как 7 по цене 5' },
    forever: { byn:89, stars:400, label:'Навсегда', days:36500, note:'один раз — и забыл' }
  };
  const RENDER = (typeof RENDER_URL !== 'undefined' ? RENDER_URL : '').replace(/\/+$/,'');
  const LS_KEY = 'blvck_pro_status';
  let busy = false;

  function readCache(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }catch(e){ return {}; } }
  function writeCache(s){ try{ localStorage.setItem(LS_KEY, JSON.stringify(s)); }catch(e){} }
  function isActive(s){ return !!(s && s.active); }
  function statusNow(){ return readCache(); }

  async function refreshStatus(){
    if(!isTelegram || !TG || !TG.initData){ return readCache(); }
    try{
      const r = await fetch(RENDER + '/pro/status', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ initData: TG.initData })
      });
      if(r.ok){ const s = await r.json(); writeCache(s); return s; }
    }catch(e){}
    return readCache();
  }

  function unlocked(/*feature*/){ return isActive(statusNow()); }

  async function demoNumbers(){
    const ym = ymNow();
    let spent = 0, carCost = 0;
    try{
      const exps = await dbAll('expenses');
      const ms = new Date(); ms.setDate(1); ms.setHours(0,0,0,0);
      const CAR = ['fuel','parts','repair','wash','rent'];
      exps.forEach(e=>{ const d=new Date(e.date); if(d>=ms){ const a=Number(e.amount||0); spent+=a; if(CAR.includes(e.category)) carCost+=a; } });
    }catch(e){}
    const dayInc = sumDaysForYM(ym).sum;
    const inc = dayInc || (typeof incomeOf === 'function' ? incomeOf(ym) : 0);
    const pct = inc>0 ? Math.round(carCost/inc*100) : 0;
    return { spent, carCost, inc, pct };
  }

  async function openScreen(){
    const s = statusNow();
    const dn = await demoNumbers();
    const c = cur();
    const active = isActive(s);
    const trial = !!(s.trial_active);
    const tleft = s.trial_days_left|0;

    const statusLine = active
      ? `<span class="pro-dot on"></span><span>PRO активна${s.until?' · до '+new Date(s.until).toLocaleDateString('ru-RU'):''}</span>`
      : (trial
        ? `<span class="pro-dot trial"></span><span>Триал · ${tleft} ${ruPlural(tleft,['день','дня','дней'])} бесплатно</span>`
        : `<span class="pro-dot off"></span><span>Бесплатный режим</span>`);

    const demo = `
      <div class="pro-demo">
        <div class="pro-demo-h"><span class="pro-k">твой отчёт · демо</span><span class="pro-k">${new Date().toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</span></div>
        <div class="pro-demo-big">${dn.pct}<span class="u">%</span></div>
        <div class="pro-demo-l">доля машины в выручке${!active&&!trial?' · <b>разблокируется в PRO</b>':''}</div>
        <div class="pro-demo-bar"><i style="width:${Math.min(100,dn.pct)}%"></i></div>
        <div class="pro-demo-row"><span>машина съела</span><b>${money(dn.carCost)}</b></div>
        <div class="pro-demo-row"><span>выручка за месяц</span><b>${dn.inc>0?money(dn.inc):'—'}</b></div>
        <div class="pro-demo-row"><span>расходов учтено</span><b>${money(dn.spent)}</b></div>
      </div>`;

    const tiers = Object.entries(PLANS).map(([k,p])=>{
      const cls = k==='forever' ? 'pro-tier top' : (k==='year' ? 'pro-tier hot' : 'pro-tier');
      const badge = k==='year' ? '<span class="pro-badge">выгодно</span>' : (k==='forever' ? '<span class="pro-badge">навсегда</span>' : '');
      return `<button class="${cls}" data-action="proBuy" data-plan="${k}">
        <span class="pro-tier-l">${p.label}${badge}</span>
        <span class="pro-tier-p">${p.byn}<span class="pro-tier-c">${c}</span></span>
        <span class="pro-tier-x">≈ ${p.stars} ⭐</span>
        <span class="pro-tier-n">${p.note}</span>
      </button>`;
    }).join('');

    const trialBtn = (!active && trial && !s.trial_demo_sent)
      ? `<button class="btn pro-ghostbtn" data-action="proTrialDemo">📨 Получить демо‑отчёт в чат</button>` : '';
    const openAppNote = !isTelegram
      ? `<div class="pro-note">Оплата и авто‑отчёты работают внутри Telegram. Открой приложение через бота — и PRO активируется здесь же.</div>` : '';

    const html = `
      <div class="mhead"><h3>METR <span style="color:var(--accent)">PRO</span></h3><button class="x" data-action="close">×</button></div>
      <div class="pro-status">${statusLine}</div>
      <p class="pro-lead">Ядро бесплатно навсегда. PRO добавляет то, что без сервера не живёт: авто‑PDF в чат первого числа, облачный бэкап между телефонами, живой расчёт единого / подоходного и пинги по срокам.</p>
      ${demo}
      <div class="pro-tiers-h"><span class="pro-k">выбери тариф</span><span class="pro-k">оплата в ⭐</span></div>
      <div class="pro-tiers">${tiers}</div>
      ${trialBtn}
      ${openAppNote}
      <p class="pro-fine">Звёзды списывает Telegram при подтверждении покупки. Авто‑отчёт уходит 1‑го числа каждому, у кого PRO активна. Цены в ⭐ — ориентир по курсу Telegram, витрина показывает BYN.</p>`;

    openModal(html);
  }

  async function buy(plan){
    if(busy) return;
    const p = PLANS[plan]; if(!p){ return; }
    if(!isTelegram || !TG){ toast('Открой приложение через бота для оплаты'); return; }
    if(!TG.openInvoice){ toast('Твой Telegram не поддерживает оплату — обнови приложение'); return; }
    busy = true;
    toast('Готовлю оплату…'); haptic('light');
    let link;
    try{
      const r = await fetch(RENDER + '/pro/create-invoice', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ initData: TG.initData, plan })
      });
      if(!r.ok){ toast('Не удалось создать счёт'); hapticBad(); busy = false; return; }
      link = (await r.json()).invoiceLink;
    }catch(e){ toast('Нет связи с сервером'); hapticBad(); busy = false; return; }
    if(!link){ toast('Счёт не создан'); busy = false; return; }
    TG.openInvoice(link, async (status)=>{
      busy = false;
      if(status === 'paid'){
        try{
          await fetch(RENDER + '/pro/confirm', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ initData: TG.initData, plan })
          });
        }catch(e){}
        await refreshStatus();
        hapticOk();
        toast('PRO активирована ✅');
        renderAsync();
        openScreen();
      } else if(status === 'cancelled'){
        toast('Оплата отменена');
      }
    });
  }

  async function trialDemo(){
    if(!isTelegram || !TG){ return; }
    toast('Отправляю демо‑отчёт…'); haptic('light');
    try{
      const r = await fetch(RENDER + '/pro/trial-demo', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ initData: TG.initData })
      });
      if(r.ok){ hapticOk(); toast('Демо‑отчёт улетел в чат 📨'); await refreshStatus(); openScreen(); }
      else { toast('Не вышло — возможно, уже отправляли'); hapticBad(); }
    }catch(e){ toast('Нет связи с сервером'); hapticBad(); }
  }

  function inject(){
    try{
      const s = statusNow(); const active = isActive(s);
      if(typeof state !== 'undefined' && state.screen === 'dash'){
        const tg = document.querySelector('.toolgrid');
        if(tg && !document.getElementById('pro-dash-plaque')){
          const txt = active ? 'PRO активна · авто‑отчёт придёт 1‑го'
                    : (s.trial_active ? `Триал PRO · ${s.trial_days_left|0} дн. · смотри, что внутри` : 'METR PRO · авто‑отчёты, облако, налоги');
          const plaque = `<button id="pro-dash-plaque" class="pro-plaque" data-action="proOpen">
            <span class="pro-plaque-d"></span>
            <span class="pro-plaque-t">${txt}</span>
            <span class="pro-plaque-a">${active?'управлять':'открыть'} →</span>
          </button>`;
          tg.insertAdjacentHTML('beforebegin', plaque);
        }
      }
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

  let chaseTries = 0;
  const chase = setInterval(()=>{
    inject();
    if(document.getElementById('pro-dash-plaque') || ++chaseTries > 20){ clearInterval(chase); }
  }, 250);

  function ensureInjected(){
    inject();
    /* перерисовываем ЛЮБОЙ экран после сверки статуса — замок снимается сразу */
    if(typeof state !== 'undefined'){ renderAsync(); }
  }

  (async function boot(){
    await refreshStatus();
    ensureInjected();
  })();
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible'){
      refreshStatus().then(ensureInjected);
    }
  });
})();
