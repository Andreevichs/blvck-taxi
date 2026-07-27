/* =========================================================
   rto.js — трекер режима труда и отдыха водителя (модуль)
   Нормы: постановление Минтранса РБ №82 (ред. с 01.04.2025).
   Слой 1 (локальный): автомат смены + вибрация/тост, пока телефон в руке.
   Слой 2 (серверный, клиентская сторона): стучится на /rto/shift-start
   и /rto/shift-end — серверная часть пингов придёт следующим шагом,
   клиент уже готов, править его потом не придётся.
   В режиме разработки (pro.js не подключён) открыт всем; с pro.js — за замком.
   Цифры норм — ориентир, сверяй с актуальным постановлением.
   ========================================================= */
(function(){
  /* ---- стили модуля (в head, не зависят от styles.css) ---- */
  if(!document.getElementById('rto-style')){
    const st=document.createElement('style'); st.id='rto-style'; st.textContent=`
      .rto-widget{background:var(--s1);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow),var(--inset);padding:16px;margin:14px 0;position:relative;overflow:hidden}
      .rto-widget.live{border-color:var(--accent-line)}
      .rto-widget.live::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 80% at 100% 0%,var(--accent-soft),transparent 70%);pointer-events:none}
      .rto-top{display:flex;align-items:center;justify-content:space-between;gap:10px;position:relative}
      .rto-k{font-family:var(--mono);font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted)}
      .rto-pill{font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.6px;padding:4px 10px;border-radius:999px;border:1px solid var(--line)}
      .rto-pill.drive{color:var(--on-accent);background:var(--accent);border-color:transparent}
      .rto-pill.brk{color:var(--accent);border-color:var(--accent-line)}
      .rto-pill.warn{color:#0a0a0a;background:#fb7185;border-color:transparent;animation:rtoBlink 1s ease-in-out infinite}
      @keyframes rtoBlink{0%,100%{opacity:1}50%{opacity:.45}}
      .rto-timer{font-family:var(--mono);font-size:46px;font-weight:800;letter-spacing:-2px;line-height:1;margin:12px 0 4px;font-variant-numeric:tabular-nums}
      .rto-timer.warn{color:#fb7185}
      .rto-sub{font-family:var(--mono);font-size:11px;color:var(--muted)}
      .rto-bar{height:8px;border-radius:999px;background:var(--s3);border:1px solid var(--line);overflow:hidden;margin:12px 0 6px}
      .rto-bar i{display:block;height:100%;border-radius:999px;transition:width .5s cubic-bezier(.22,1,.36,1)}
      .rto-bar i.ok{background:linear-gradient(90deg,#ff5a00,#ff8a33)}
      .rto-bar i.hot{background:linear-gradient(90deg,#fbbf24,#fb7185)}
      .rto-acts{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
      .rto-acts .btn{flex:1;min-width:120px}
      .rto-inter{font-family:var(--mono);font-size:11px;margin-top:10px;color:var(--muted)}
      .rto-inter.bad{color:#fb7185}

      .rto-screen .rto-hero{background:var(--s1);border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow),var(--inset);padding:20px 18px;margin:14px 0;position:relative;overflow:hidden}
      .rto-screen .rto-hero.live{border-color:var(--accent-line)}
      .rto-screen .rto-hero.live::before{content:"";position:absolute;inset:0;background:radial-gradient(70% 90% at 100% 0%,var(--accent-soft),transparent 70%);pointer-events:none}
      .rto-screen .rto-big{font-family:var(--mono);font-size:64px;font-weight:800;letter-spacing:-3px;line-height:.9;font-variant-numeric:tabular-nums;position:relative}
      .rto-screen .rto-big.warn{color:#fb7185}
      .rto-rings{display:flex;gap:14px;margin:18px 0 4px;position:relative}
      .rto-ring{flex:1;text-align:center}
      .rto-ring svg{width:100%;max-width:120px;height:auto}
      .rto-ring .rl{font-family:var(--mono);font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-top:6px}
      .rto-log{margin:14px 0;display:flex;flex-direction:column;gap:6px}
      .rto-log .ev{display:flex;gap:10px;align-items:center;font-family:var(--mono);font-size:12px}
      .rto-log .ev .tm{color:var(--muted);flex:none;width:54px}
      .rto-log .ev .tx{color:var(--text)}
      .rto-log .ev .d{width:8px;height:8px;border-radius:50%;flex:none}
      .rto-stat{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
      .rto-stat .c{background:var(--s1);border:1px solid var(--line);border-radius:14px;padding:12px}
      .rto-stat .c .v{font-family:var(--mono);font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
      .rto-stat .c .v.bad{color:#fb7185}
      .rto-stat .c .k{font-family:var(--mono);font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-top:4px}
      .rto-hist .h{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:var(--s1);border:1px solid var(--line);font-family:var(--mono);font-size:12px}
      .rto-hist .h+.h{margin-top:8px}
      .rto-hist .h .l{color:var(--muted)}
      .rto-hist .h .tag{color:#fb7185}
    `; document.head.appendChild(st);
  }

  /* ---- пороги (мс) ---- */
  const CONT_LIMIT = 4.5*3600000;     // непрерывное вождение
  const CONT_WARN  = 4*3600000;       // предупреждение «скоро перерыв»
  const BREAK_MIN  = 45*60000;        // перерыв
  const SHIFT_WARN = 9*3600000;       // предупреждение по смене
  const SHIFT_LIMIT= 10*3600000;      // лимит смены
  const INTER_MIN  = 12*3600000;      // междусменный отдых
  const WEEK_REST  = 45*3600000;      // еженедельный отдых
  const WEEK_WIN   = 6*24*3600000;    // окно проверки еженедельного

  const KEY_A='blvck_rto_active', KEY_H='blvck_rto_shifts';
  const getA = () => { try{ return JSON.parse(localStorage.getItem(KEY_A)); }catch(e){ return null; } };
  const setA = a => { if(a) localStorage.setItem(KEY_A, JSON.stringify(a)); else localStorage.removeItem(KEY_A); };
  const getH = () => { try{ const a=JSON.parse(localStorage.getItem(KEY_H)); return Array.isArray(a)?a:[]; }catch(e){ return []; } };
  const setH = a => localStorage.setItem(KEY_H, JSON.stringify(a.slice(-40)));
  const lastEnd = () => { const h=getH(); return h.length? h[h.length-1].end : 0; };

  const nowMs = () => Date.now();
  const continuous = a => (a && a.phase==='driving') ? nowMs()-a.phaseStartAt : 0;
  const totalDrive = a => { if(!a) return 0; return a.totalDriveAccum + (a.phase==='driving'? nowMs()-a.phaseStartAt : 0); };
  const shiftLen   = a => a ? nowMs()-a.startedAt : 0;
  const breakLen   = a => (a && a.phase==='break') ? nowMs()-a.phaseStartAt : 0;

  function fmtHM(ms){ const m=Math.max(0,Math.floor(ms/60000)); return Math.floor(m/60)+'ч '+String(m%60).padStart(2,'0')+'м'; }
  function fmtMS(ms){ const s=Math.max(0,Math.floor(ms/1000)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
  function fmtClock(ts){ const d=new Date(ts); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }

  const proUnlocked = () => (window.BLVCK_PRO && typeof window.BLVCK_PRO.unlocked==='function') ? !!window.BLVCK_PRO.unlocked('rto') : true;

  /* ---- серверная сторона второго слоя (безопасно, если сервера ещё нет) ---- */
  function pingServer(path, body){
    try{
      const url = (window.RENDER_URL||'') + path;
      if(!url || url===path) return;
      const payload = Object.assign({ initData: (window.Telegram&&window.Telegram.initData)||'' }, body);
      fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).catch(()=>{});
    }catch(e){}
  }

  /* ---- действия смены ---- */
  function startShift(){
    const le=lastEnd(); const inter=le? nowMs()-le : null;
    const a={ startedAt:nowMs(), phase:'driving', phaseStartAt:nowMs(), totalDriveAccum:0,
              breaks:[], w:{c4:false,c45:false,s9:false,s10:false,bd:false}, interWarned:!!(inter!==null&&inter<INTER_MIN), log:[{t:nowMs(),k:'start'}] };
    setA(a); pingServer('/rto/shift-start',{startedAt:a.startedAt});
    haptic('medium'); toast('Смена начата ⏱️'); renderAsync();
  }
  function startBreak(){
    const a=getA(); if(!a||a.phase!=='driving') return;
    a.totalDriveAccum += nowMs()-a.phaseStartAt; a.phase='break'; a.phaseStartAt=nowMs();
    a.w.c4=false; a.w.c45=false; a.log.push({t:nowMs(),k:'break'}); setA(a);
    haptic('light'); toast('Перерыв пошёл ☕'); renderAsync();
  }
  function resumeDrive(){
    const a=getA(); if(!a||a.phase!=='break') return;
    a.breaks.push({start:a.phaseStartAt,end:nowMs()}); a.phase='driving'; a.phaseStartAt=nowMs();
    a.w.c4=false; a.w.c45=false; a.log.push({t:nowMs(),k:'resume'}); setA(a);
    haptic('light'); toast('Снова за рулём 🚕'); renderAsync();
  }
  function endShift(){
    const a=getA(); if(!a||a.phase==='ended') return;
    if(a.phase==='driving') a.totalDriveAccum += nowMs()-a.phaseStartAt;
    else if(a.phase==='break') a.breaks.push({start:a.phaseStartAt,end:nowMs()});
    const end=nowMs(); const drv=a.totalDriveAccum; const over=shiftLen(a)>SHIFT_LIMIT;
    const le=lastEnd(); const interShort = le ? (a.startedAt-le)<INTER_MIN : false;
    const h=getH(); h.push({start:a.startedAt,end,drivingMs:drv,breaks:a.breaks.length,overDrive:over,interShort:interShort}); setH(h);
    pingServer('/rto/shift-end',{startedAt:a.startedAt,endedAt:end,drivingMs:drv});
    setA(null); haptic('medium'); toast('Смена завершена ✅ Отдыхай не меньше 12 ч'); renderAsync();
  }

  /* ---- предупреждения (тик) ---- */
  function evaluate(a){
    if(!a||a.phase==='ended') return;
    const c=continuous(a), sl=shiftLen(a), bl=breakLen(a);
    if(a.phase==='driving'){
      if(!a.w.c4 && c>=CONT_WARN){ a.w.c4=true; setA(a); haptic('light'); toast('⚠️ Через 30 минут — обязательный перерыв'); }
      if(!a.w.c45 && c>=CONT_LIMIT){ a.w.c45=true; setA(a); haptic('heavy'); toast('🛑 Лимит непрерывного вождения — перерыв 45 минут'); }
    }
    if(a.phase==='break' && !a.w.bd && bl>=BREAK_MIN){ a.w.bd=true; setA(a); haptic('medium'); toast('✅ Перерыв выполнен — можно за руль'); }
    if(!a.w.s9 && sl>=SHIFT_WARN){ a.w.s9=true; setA(a); haptic('light'); toast('⚠️ Смена подходит к лимиту — планируй завершение'); }
    if(!a.w.s10 && sl>=SHIFT_LIMIT){ a.w.s10=true; setA(a); haptic('heavy'); toast('🛑 Лимит смены 10 ч — завершай'); }
  }

  function weeklyWarn(){
    const h=getH(); if(!h.length) return null;
    const since=nowMs()-WEEK_WIN; const recent=h.filter(s=>s.end>=since);
    if(!recent.length) return null; // за неделю не работал — отдыхал
    let maxGap=nowMs()-h[h.length-1].end;
    for(let i=1;i<h.length;i++){ if(h[i].start>=since){ const g=h[i].start-h[i-1].end; if(g>maxGap) maxGap=g; } }
    return maxGap<WEEK_REST;
  }

  /* ---- тик: раз в секунду ---- */
  function tick(){
    const a=getA();
    if(a && a.phase!=='ended') evaluate(a);
    const a2=getA();
    const wm=document.getElementById('rto-w-root'); if(wm) wm.outerHTML=widgetHTML();
    const sr=document.getElementById('rto-s-dyn'); if(sr) sr.innerHTML=dynHTML(a2);
  }
  setInterval(tick, 1000);

  /* ---- виджет на главную ---- */
  function widgetHTML(){
    if(!proUnlocked()){
      return `<div id="rto-w-root" class="rto-widget"><div class="rto-top"><span class="rto-k">Режим труда и отдыха</span><span class="rto-pill">PRO</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 0 6px;text-align:center">
          <div style="font-size:30px;line-height:1">⏱️</div>
          <div style="font-weight:700;font-size:15px">Трекер смены — по подписке PRO</div>
          <div style="font-size:12.5px;color:var(--muted);line-height:1.5;max-width:32ch">Следит, чтобы ты не переработал: перерывы, лимит смены, междусменный отдых. Открой PRO — и я буду пинговать тебя в чат, даже когда приложение закрыто.</div>
          <button class="btn primary sm" data-rto="openpro" style="margin-top:6px">Открыть PRO</button>
        </div></div>`;
    }
    const a=getA();
    if(!a || a.phase==='ended'){
      const le=lastEnd(); const inter=le? (nowMs()-le) : null;
      const interTxt = inter===null ? 'последняя смена не найдена' : (inter<INTER_MIN ? `междусменный отдых ${fmtHM(inter)} из 12 ч — мало` : `отдых ${fmtHM(inter)} · норма 12 ч ✓`);
      const interBad = inter!==null && inter<INTER_MIN;
      const wk=weeklyWarn();
      return `<div id="rto-w-root" class="rto-widget">
        <div class="rto-top"><span class="rto-k">Режим труда и отдыха</span><span class="rto-pill">не на линии</span></div>
        <div class="rto-timer" style="font-size:30px;color:var(--muted)">—</div>
        <div class="rto-sub">нажми «выйти на линию», чтобы начать отсчёт</div>
        <div class="rto-inter ${interBad?'bad':''}">${interTxt}</div>
        ${wk?`<div class="rto-inter bad">⚠️ за 6 суток не было отдыха 45 ч — пора на еженедельный отдых</div>`:''}
        <div class="rto-acts"><button class="btn primary" data-rto="start">▶ Выйти на линию</button></div>
      </div>`;
    }
    const c=continuous(a), sl=shiftLen(a), bl=breakLen(a);
    const driving=a.phase==='driving';
    const pctCont=Math.min(100,c/CONT_LIMIT*100);
    const hot = (driving && c>=CONT_WARN) || (!driving && bl<BREAK_MIN && c>=CONT_LIMIT);
    const statusCls = (driving&&c>=CONT_LIMIT)?'warn':(driving?'drive':'brk');
    const statusTxt = driving ? (c>=CONT_LIMIT?'ПЕРЕРЫВ!':'за рулём') : 'перерыв';
    const timerTxt = driving ? fmtHM(c) : fmtMS(bl);
    const timerCls = (driving&&c>=CONT_LIMIT)?'warn':'';
    const barLabel = driving ? `непрерывно ${fmtHM(c)} / 4ч 30м` : `перерыв ${fmtMS(bl)} / 45:00`;
    const wk=weeklyWarn();
    return `<div id="rto-w-root" class="rto-widget live">
      <div class="rto-top"><span class="rto-k">смена · ${fmtClock(a.startedAt)}</span><span class="rto-pill ${statusCls}">${statusTxt}</span></div>
      <div class="rto-timer ${timerCls}">${timerTxt}</div>
      <div class="rto-sub">${driving?'непрерывное вождение':'идёт перерыв'} · смена ${fmtHM(sl)}</div>
      <div class="rto-bar"><i class="${hot?'hot':'ok'}" style="width:${driving?pctCont:Math.min(100,bl/BREAK_MIN*100)}%"></i></div>
      <div class="rto-sub">${barLabel}</div>
      ${wk?`<div class="rto-inter bad">⚠️ пора на еженедельный отдых 45 ч</div>`:''}
      <div class="rto-acts">
        ${driving?`<button class="btn" data-rto="break">☕ Перерыв</button>`:`<button class="btn primary" data-rto="resume">▶ За руль</button>`}
        <button class="btn danger" data-rto="end">⏹ Завершить смену</button>
      </div>
    </div>`;
  }

  /* ---- экран РТО ---- */
  function dynHTML(a){
    if(!a||a.phase==='ended') return `<div class="rto-big" style="color:var(--muted)">—</div><div class="rto-sub">не на линии</div>`;
    const c=continuous(a), sl=shiftLen(a), bl=breakLen(a), driving=a.phase==='driving';
    const warn = driving&&c>=CONT_LIMIT;
    return `<div class="rto-big ${warn?'warn':''}">${driving?fmtHM(c):fmtMS(bl)}</div>
      <div class="rto-sub">${driving?(c>=CONT_LIMIT?'лимит непрерывного вождения':'непрерывное вождение'):'идёт перерыв'} · смена ${fmtHM(sl)}</div>`;
  }
  function ringSVG(pct, label, sub){ const r=34, cc=2*Math.PI*r, off=cc*(1-Math.min(100,Math.max(0,pct))/100);
    const col = pct>=100?'#fb7185':(pct>=80?'#fbbf24':'#ff5a00');
    return `<div class="rto-ring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--s3)" stroke-width="7"/><circle cx="40" cy="40" r="${r}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${cc.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 40 40)"/><text x="40" y="40" text-anchor="middle" dominant-baseline="central" fill="var(--text)" font-family="var(--mono)" font-size="13" font-weight="700">${Math.round(pct)}%</text></svg><div class="rl">${label}<br>${sub}</div></div>`; }
  function screenBody(a){
    if(!proUnlocked()){
      return `<div class="rto-screen"><div class="rto-hero"><div class="rto-top"><span class="rto-k">Режим труда и отдыха</span><span class="rto-pill">PRO</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 0 8px;text-align:center">
          <div style="font-size:40px;line-height:1">⏱️</div>
          <div style="font-weight:800;font-size:18px">Трекер смены — по подписке PRO</div>
          <div style="font-size:13px;color:var(--muted);line-height:1.55;max-width:34ch">Автомат следит за перерывами (45 мин после 4,5 ч вождения), лимитом смены 10 ч, междусменным отдыхом 12 ч и еженедельным 45 ч. С PRO я пингую тебя в чат, даже когда приложение закрыто.</div>
          <button class="btn primary" data-rto="openpro" style="margin-top:8px">Открыть PRO</button>
        </div></div></div>`;
    }
    const h=getH(); const le=lastEnd(); const inter=le?(nowMs()-le):null;
    const interBad = inter!==null && inter<INTER_MIN;
    const wk=weeklyWarn();
    const last10=h.slice(-10).reverse();
    const avgShift = h.length? h.reduce((s,x)=>s+(x.end-x.start),0)/h.length : 0;
    const avgDrv = h.length? h.reduce((s,x)=>s+x.drivingMs,0)/h.length : 0;
    const overs = h.filter(x=>x.overDrive).length;
    const interShorts = h.filter(x=>x.interShort).length;
    const logRows = (a&&a.log?a.log:[]).map(e=>{ const col=e.k==='start'?'#ff5a00':e.k==='break'?'#fbbf24':e.k==='resume'?'#34d399':'#8d8d87';
      const tx=e.k==='start'?'вышел на линию':e.k==='break'?'начал перерыв':e.k==='resume'?'вернулся за руль':'событие';
      return `<div class="ev"><span class="d" style="background:${col}"></span><span class="tm">${fmtClock(e.t)}</span><span class="tx">${tx}</span></div>`; }).join('');

    const histRows = last10.length? last10.map(x=>`<div class="h"><span class="l">${fmtClock(x.start)}–${fmtClock(x.end)} · вождение ${fmtHM(x.drivingMs)} · ${x.breaks} перерыв.</span><span class="${(x.overDrive||x.interShort)?'tag':''}">${x.overDrive?'переработка':''}${x.overDrive&&x.interShort?' · ':''}${x.interShort?'короткий отдых':''}${(!x.overDrive&&!x.interShort)?'✓':''}</span></div>`).join('') : `<div class="rto-sub" style="padding:6px 2px">пока нет завершённых смен</div>`;

    const dyn = (a&&a.phase!=='ended') ? dynHTML(a) : `<div class="rto-big" style="color:var(--muted)">—</div><div class="rto-sub">не на линии — выйди на линию, чтобы начать</div>`;
    const c=continuous(a||{}), sl=shiftLen(a||{}), bl=breakLen(a||{}), driving=a&&a.phase==='driving';
    const pctCont=Math.min(100,c/CONT_LIMIT*100), pctShift=Math.min(100,sl/SHIFT_LIMIT*100);

    return `<div class="rto-screen">
      <div class="rto-hero ${(a&&a.phase!=='ended')?'live':''}">
        <div class="rto-top"><span class="rto-k">${(a&&a.phase!=='ended')?('смена · '+fmtClock(a.startedAt)):'трекер смены'}</span><span class="rto-pill ${(a&&a.phase==='driving')?(c>=CONT_LIMIT?'warn':'drive'):(a&&a.phase==='break'?'brk':'')}">${(a&&a.phase==='driving')?(c>=CONT_LIMIT?'ПЕРЕРЫВ!':'за рулём'):(a&&a.phase==='break'?'перерыв':'—')}</span></div>
        <div id="rto-s-dyn">${dyn}</div>
        <div class="rto-rings">
          ${ringSVG(a?pctCont:0, 'до перерыва', '4ч 30м непрерывно')}
          ${ringSVG(a?pctShift:0, 'до конца смены', 'лимит 10 ч')}
        </div>
        <div class="rto-acts">
          ${!a||a.phase==='ended'?`<button class="btn primary" data-rto="start">▶ Выйти на линию</button>`
            : driving?`<button class="btn" data-rto="break">☕ Перерыв</button><button class="btn danger" data-rto="end">⏹ Завершить</button>`
            : `<button class="btn primary" data-rto="resume">▶ За руль</button><button class="btn danger" data-rto="end">⏹ Завершить</button>`}
        </div>
      </div>

      <div class="glass card">
        <div class="rto-k" style="margin-bottom:10px">междусменный отдых</div>
        <div class="rto-inter ${interBad?'bad':''}">${inter===null?'нет данных о прошлой смене':(interBad?`⚠️ отдых ${fmtHM(inter)} — меньше нормы 12 ч, ты рискуешь`:`отдых ${fmtHM(inter)} · норма 12 ч ✓`)}</div>
        ${wk?`<div class="rto-inter bad" style="margin-top:8px">⚠️ за последние 6 суток не было непрерывного отдыха 45 ч — запланируй еженедельный отдых</div>`:''}
      </div>

      <div class="glass card">
        <div class="rto-k" style="margin-bottom:10px">лог текущей смены</div>
        <div class="rto-log">${logRows||`<div class="rto-sub">событий пока нет</div>`}</div>
      </div>

      <div class="glass card">
        <div class="rto-k" style="margin-bottom:10px">статистика · все смены</div>
        <div class="rto-stat">
          <div class="c"><div class="v">${h.length}</div><div class="k">смен</div></div>
          <div class="c"><div class="v">${fmtHM(avgShift)}</div><div class="k">средняя смена</div></div>
          <div class="c"><div class="v">${fmtHM(avgDrv)}</div><div class="k">среднее вождение</div></div>
          <div class="c"><div class="v ${overs?'bad':''}">${overs}</div><div class="k">переработок</div></div>
        </div>
        ${interShorts?`<div class="rto-inter bad">⚠️ коротких междусменных отдыхов (<12 ч): ${interShorts}</div>`:''}
      </div>

      <div class="glass card">
        <div class="rto-k" style="margin-bottom:10px">история · последние 10</div>
        <div class="rto-hist">${histRows}</div>
      </div>
    </div>`;
  }

  /* ---- регистрация в хуках app.js ---- */
  window.BLVCK_HOOKS = window.BLVCK_HOOKS || [];
  window.BLVCK_ALERT_HOOKS = window.BLVCK_ALERT_HOOKS || [];
  window.BLVCK_HOOKS.push(function(){
    const m=document.getElementById('rto-mount'); if(m) m.innerHTML=widgetHTML();
    const sr=document.getElementById('rto-screen-root'); if(sr) sr.innerHTML=screenBody(getA());
  });
  window.BLVCK_ALERT_HOOKS.push(function(){
    if(!proUnlocked()) return [];
    const out=[]; const a=getA();
    if(a&&a.phase!=='ended'){ const c=continuous(a), sl=shiftLen(a);
      if(a.phase==='driving'&&c>=CONT_LIMIT) out.push({bad:true,t:'🛑 Перерыв!',s:'лимит непрерывного вождения 4,5 ч — остановись на 45 минут'});
      else if(sl>=SHIFT_LIMIT) out.push({bad:true,t:'🛑 Лимит смены 10 ч',s:'завершай смену, дальше — переработка'});
      else if(a.phase==='driving'&&c>=CONT_WARN) out.push({bad:false,t:'⏱️ Скоро перерыв',s:'через 30 минут непрерывного вождения — обязательный перерыв 45 мин'}); }
    const le=lastEnd(); if(le && (nowMs()-le)<INTER_MIN && !(a&&a.phase!=='ended')) out.push({bad:false,t:'⚠️ Междусменный отдых',s:`прошло ${fmtHM(nowMs()-le)} из 12 ч — не спеши на линию`});
    if(weeklyWarn()) out.push({bad:false,t:'⚠️ Еженедельный отдых',s:'за 6 суток не было 45 ч непрерывного отдыха'});
    return out;
  });

  /* ---- клики модуля ---- */
  document.addEventListener('click', function(e){
    const el=e.target.closest('[data-rto]'); if(!el) return;
    const a=el.getAttribute('data-rto');
    if(a==='start') startShift();
    else if(a==='break') startBreak();
    else if(a==='resume') resumeDrive();
    else if(a==='end') endShift();
    else if(a==='openpro'){ if(window.BLVCK_PRO&&window.BLVCK_PRO.openScreen) window.BLVCK_PRO.openScreen(); else toast('Подписка появится на следующем шаге'); }
  });

  /* публичный API для app.js (screenRto) */
  window.BLVCK_RTO = { renderScreen: function(){ return `<div id="rto-screen-root">${screenBody(getA())}</div>`; } };
})();