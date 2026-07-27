/* =========================================================
   tax.js — налоговый помощник ИП (модуль, отдельный файл)
   единый налог / подоходный. В режиме разработки (pro.js не
   подключён) открыт всем; с pro.js — за замком подписки.
   Справочник + живой расчёт доплаты 6% + квартальные сроки.
   Цифры — ОРИЕНТИР, ставки местные, сверять с ИМНС.
   ========================================================= */
(function(){
  /* стили модуля — в head, чтобы не зависеть от styles.css */
  if(!document.getElementById('tax-style')){
    const st=document.createElement('style'); st.id='tax-style'; st.textContent=`
      .tx-wrap{margin-top:18px}
      .tx-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
      .tx-head .t{font-family:var(--mono);font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted)}
      .tx-lock{display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 16px;text-align:center}
      .tx-lock .ic{font-size:30px;line-height:1}
      .tx-lock .tt{font-weight:700;font-size:15px}
      .tx-lock .ds{font-size:12.5px;color:var(--muted);line-height:1.5;max-width:30ch}
      .tx-seg{display:flex;background:var(--s2);border:1px solid var(--line);border-radius:12px;padding:4px;gap:4px}
      .tx-seg button{flex:1;border:none;background:transparent;color:var(--muted);font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.5px;padding:10px 6px;border-radius:9px;cursor:pointer;transition:.2s}
      .tx-seg button.on{background:var(--accent);color:var(--on-accent)}
      .tx-card{background:var(--s1);border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:12px}
      .tx-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .tx-row+.tx-row{margin-top:10px}
      .tx-row .k{font-family:var(--mono);font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)}
      .tx-row .v{font-family:var(--mono);font-weight:700;font-size:15px}
      .tx-reg{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
      .tx-reg span{padding:8px 11px;border-radius:999px;border:1px solid var(--line);font-size:12px;font-weight:600;cursor:pointer;transition:.2s}
      .tx-reg span.on{background:var(--accent);color:var(--on-accent);border-color:transparent}
      .tx-inp{width:100%;padding:11px 12px;border-radius:11px;font-family:var(--mono);font-size:15px;background:var(--s2);border:1px solid var(--line);color:var(--text);outline:none;margin-top:8px}
      .tx-inp:focus{border-color:var(--accent)}
      .tx-bar{height:9px;border-radius:999px;background:var(--s3);border:1px solid var(--line);overflow:hidden;margin:12px 0 8px}
      .tx-bar i{display:block;height:100%;border-radius:999px;transition:width .8s cubic-bezier(.22,1,.36,1)}
      .tx-warn{color:#fb7185} .tx-ok{color:#34d399}
      .tx-note{font-size:11px;color:var(--muted);line-height:1.5;margin-top:10px}
      .tx-cal{display:flex;flex-direction:column;gap:8px;margin-top:12px}
      .tx-cal .d{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-radius:11px;background:var(--s2);border:1px solid var(--line)}
      .tx-cal .d .l{font-size:12.5px;font-weight:600}
      .tx-cal .d .r{font-family:var(--mono);font-size:12px;color:var(--muted)}
    `; document.head.appendChild(st);
  }

  const REG = { minsk:{t:"Минск", v:400}, region_center:{t:"Обл. центр / Минский р-н", v:350}, other:{t:"Иной нас. пункт", v:300} };
  const getMode = () => localStorage.getItem('blvck_tax_mode') || 'unified';
  const setMode = v => localStorage.setItem('blvck_tax_mode', v);
  const getReg  = () => localStorage.getItem('blvck_tax_region') || 'minsk';
  const setReg  = v => { localStorage.setItem('blvck_tax_region', v);
    const c=parseFloat(localStorage.getItem('blvck_tax_unified_amount')); if(!(c>0)) localStorage.setItem('blvck_tax_unified_amount', String(REG[v].v)); };
  const getCustom = () => parseFloat(localStorage.getItem('blvck_tax_unified_amount')) || 0;
  const unifiedMonthly = () => { const c=getCustom(); return c>0 ? c : REG[getReg()].v; };
  const proUnlocked = () => (window.BLVCK_PRO && typeof window.BLVCK_PRO.unlocked==='function') ? !!window.BLVCK_PRO.unlocked('tax') : true;

  function quarterRevenue(){ const y=YEAR(), cq=CUR_Q(); let s=0;
    for(let mo=(cq-1)*3+1; mo<=(cq-1)*3+3; mo++) s += sumDaysForYM(`${y}-${String(mo).padStart(2,'0')}`).sum;
    return s; }

  function unifiedBlock(){
    const monthly=unifiedMonthly(), qTax=monthly*3, threshold=40*qTax, revQ=quarterRevenue();
    const pct=threshold>0?Math.min(100,revQ/threshold*100):0;
    const over=Math.max(0,revQ-threshold), doplata=over*0.06, reserve=Math.max(0,threshold-revQ);
    const barCol = pct>=100 ? '#fb7185' : (pct>=80 ? '#fbbf24' : 'var(--accent)');
    const regChips = Object.entries(REG).map(([k,o])=>`<span class="${getReg()===k?'on':''}" data-tax="reg" data-reg="${k}">${o.t} · ${o.v}</span>`).join('');
    const status = over>0
      ? `<span class="tx-warn">доплата ≈ ${money(doplata)} (6% с превышения)</span>`
      : `<span class="tx-ok">запас до доплаты ${money(reserve)}</span>`;
    return `<div class="tx-card">
        <div class="tx-row"><span class="k">ставка в месяц</span><span class="v">${money(monthly)}</span></div>
        <div class="tx-reg">${regChips}</div>
        <input class="tx-inp" type="number" inputmode="decimal" data-tax="amount" value="${getCustom()>0?getCustom():''}" placeholder="своя сумма из уведомления ИМНС">
        <div class="tx-row"><span class="k">выручка за квартал</span><span class="v">${money(revQ)}</span></div>
        <div class="tx-row"><span class="k">порог доплаты (×40)</span><span class="v">${money(threshold)}</span></div>
        <div class="tx-bar"><i style="width:${pct}%;background:${barCol}"></i></div>
        <div class="tx-row"><span class="k">${pct.toFixed(0)}% от порога</span>${status}</div>
        <div class="tx-note">Доплата 6% берётся только с выручки СВЕРХ 40-кратной суммы налога за квартал. Сумму налога сверь со своим уведомлением из ИМНС — ставки местные и меняются ежегодно.</div>
      </div>`;
  }

  function incomeBlock(){
    const revQ=quarterRevenue(), taxQ=revQ*0.14, taxM=taxQ/3;
    const cq=CUR_Q(); let am=cq*3+1, yy=YEAR(); if(am>12){ am=1; yy++; }
    const mm=String(am).padStart(2,'0');
    return `<div class="tx-card">
        <div class="tx-row"><span class="k">выручка за квартал</span><span class="v">${money(revQ)}</span></div>
        <div class="tx-row"><span class="k">норматив расходов (транспорт 30%)</span><span class="v">−${money(revQ*0.30)}</span></div>
        <div class="tx-row"><span class="k">ориентир налога (≈14%)</span><span class="v">${money(taxQ)}</span></div>
        <div class="tx-row"><span class="k">в среднем за месяц</span><span class="v">${money(taxM)}</span></div>
        <div class="tx-cal">
          <div class="d"><span class="l">📄 Декларация за Q${cq}</span><span class="r">до 20.${mm}.${yy}</span></div>
          <div class="d"><span class="l">💳 Уплата налога за Q${cq}</span><span class="r">до 22.${mm}.${yy}</span></div>
        </div>
        <div class="tx-note">Авансовые платежи — по извещению ИМНС (обычно до 30.04 и по срокам в извещении). Расчёт ориентировочный: для транспорта учитывается норматив расходов 30%, поэтому эффективная ставка ≈14%, а не 20%.</div>
      </div>`;
  }

  function renderTax(){
    if(!proUnlocked()){
      return `<div class="tx-wrap"><div class="tx-card"><div class="tx-lock">
        <div class="ic">🔒</div>
        <div class="tt">Налоговый помощник — по подписке PRO</div>
        <div class="ds">Ползунок «единый / подоходный», расчёт доплаты 6% на твоей выручке и напоминания по декларациям. Открой PRO — и я сам напомню про сроки.</div>
        <button class="btn primary sm" data-tax="openpro" style="margin-top:4px">Открыть PRO</button>
      </div></div></div>`;
    }
    const mode=getMode();
    const seg=`<div class="tx-seg">
      <button class="${mode==='unified'?'on':''}" data-tax="mode" data-mode="unified">Единый налог</button>
      <button class="${mode==='income'?'on':''}" data-tax="mode" data-mode="income">Подоходный</button>
    </div>`;
    return `<div class="tx-wrap">
      <div class="tx-head"><span class="t">Система налогообложения</span></div>
      ${seg}
      ${mode==='unified'?unifiedBlock():incomeBlock()}
    </div>`;
  }

  /* баннеры на главную — только когда unlocked (в разработке всегда да) */
  function taxAlerts(){
    if(!proUnlocked() || typeof isIP!=='function' || !isIP()) return [];
    const out=[]; const mode=getMode();
    if(mode==='unified'){
      const monthly=unifiedMonthly(), threshold=40*monthly*3, revQ=quarterRevenue();
      if(threshold>0 && revQ/threshold>=0.8){
        const over=Math.max(0,revQ-threshold);
        out.push(over>0
          ? {bad:true, t:"Порог доплаты 6% превышен", s:`выручка за квартал ${money(revQ)} выше порога ${money(threshold)} — доплата ≈ ${money(over*0.06)}`}
          : {bad:false, t:"Близко к порогу доплаты 6%", s:`${(revQ/threshold*100).toFixed(0)}% от порога ${money(threshold)} — следи за выручкой`});
      }
    } else {
      const cq=CUR_Q(); let am=cq*3+1, yy=YEAR(); if(am>12){ am=1; yy++; }
      const now=new Date();
      if(now.getFullYear()===yy && now.getMonth()+1===am && now.getDate()<=22){
        out.push({bad: now.getDate()>20, t: now.getDate()>20?"Срок уплаты подоходного":"Срок декларации подоходного",
          s: now.getDate()>20 ? `уплата за Q${cq} до 22.${String(am).padStart(2,'0')} — не пропусти` : `декларация за Q${cq} до 20.${String(am).padStart(2,'0')}, уплата до 22-го`});
      }
    }
    return out;
  }

  /* регистрация в точках расширения app.js */
  window.BLVCK_HOOKS = window.BLVCK_HOOKS || [];
  window.BLVCK_ALERT_HOOKS = window.BLVCK_ALERT_HOOKS || [];
  window.BLVCK_HOOKS.push(function(){ const m=document.getElementById('tax-mount'); if(m) m.innerHTML=renderTax(); });
  window.BLVCK_ALERT_HOOKS.push(taxAlerts);

  /* клики модуля */
  document.addEventListener('click', function(e){
    const el=e.target.closest('[data-tax]'); if(!el) return;
    const a=el.getAttribute('data-tax');
    if(a==='mode'){ setMode(el.getAttribute('data-mode')); renderAsync(); }
    else if(a==='reg'){ setReg(el.getAttribute('data-reg')); renderAsync(); }
    else if(a==='openpro'){ if(window.BLVCK_PRO && window.BLVCK_PRO.openScreen) window.BLVCK_PRO.openScreen(); else toast('Подписка появится на следующем шаге'); }
  });
  document.addEventListener('change', function(e){
    const el=e.target; if(el && el.getAttribute && el.getAttribute('data-tax')==='amount'){
      const v=parseFloat(el.value)||0;
      if(v>0) localStorage.setItem('blvck_tax_unified_amount', String(v));
      else { localStorage.removeItem('blvck_tax_unified_amount'); }
      renderAsync();
    }
  });
})();