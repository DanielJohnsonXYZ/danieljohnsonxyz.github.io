(()=>{
  let backdrop,modal,compacting=false;

  const simpleTitles={
    'Open temporary capacity':'Add temporary beds',
    'Expand permanent capacity':'Build more hospital capacity',
    'Focus on discharges and community care':'Help patients leave hospital sooner',
    'Broker a quick settlement':'Get trains running quickly',
    'Trade support for reform':'Fix the rail system for longer',
    'Hold the line':'Wait it out',
    'Fund new homes':'Build more homes',
    'Reform planning rules':'Make it easier to build',
    'Target the worst-hit areas':'Help the worst-hit areas first',
    'Protect public services':'Protect public services',
    'Protect investment':'Protect long-term investment',
    'Protect the buffer':'Keep money in reserve',
    'Pre-position emergency support':'Prepare before the storm',
    'Focus only on highest-risk areas':'Protect the highest-risk areas',
    'Wait and respond as needed':'Wait and react if needed',
    'Approve the full project':'Build the full rail link',
    'Approve a smaller first phase':'Build the first phase',
    'Delay it':'Delay the project',
    'Hold a national address':'Speak to the country',
    'Tour regional projects':'Visit projects around the country',
    'Ignore the noise':'Stay focused on delivery',
    'Target pay in shortage areas':'Pay more where teachers are scarce',
    'Expand training places':'Train more teachers',
    'Target the hardest-hit schools':'Help the hardest-hit schools',
    'Temporary household support':'Help households with bills',
    'Target energy-intensive firms':'Help businesses with energy costs',
    'Keep support tightly targeted':'Keep support limited',
    'Push the full bill':'Push the full housing bill',
    'Accept a compromise':'Accept a smaller bill',
    'Delay the vote':'Delay the vote',
    'Double down on public services':'Put more into public services',
    'Double down on growth':'Put more into growth',
    'Rebuild the fiscal buffer':'Keep more money in reserve',
    'Make the extra capacity permanent':'Make the extra beds permanent',
    'Extend the temporary deal':'Keep the temporary beds longer',
    'Shift to community care':'Move support into community care',
    'Fund a recruitment package':'Recruit more staff',
    'Redeploy existing staff':'Move staff from elsewhere',
    'Hold course':'Wait and see',
    'Add a modest capacity boost':'Add a few more beds',
    'Expand community care further':'Expand community care',
    'Bank the improvement':'Stop spending for now'
  };

  const simpleMeta={
    'Fast · temporary':'Fast fix',
    'Strong · long-term':'Long-term fix',
    'Balanced':'Balanced',
    'Quick win':'Fast fix',
    'Slower · stronger':'Long-term fix',
    'Risky':'Riskier',
    'Direct':'Direct action',
    'Long-term':'Long-term',
    'Focused':'Targeted',
    'Services first':'Services first',
    'Growth first':'Growth first',
    'Cautious':'Keep a buffer',
    'Safer':'Safer',
    'Transformational':'Big change',
    'Practical':'Smaller step',
    'No commitment':'No spending',
    'Visible':'High profile',
    'Grounded':'Visible locally',
    'Steady':'Stay the course',
    'Fast':'Fast',
    'Immediate':'Immediate help',
    'Economic':'Protect jobs',
    'Bold':'Bigger change',
    'Safe':'Safer route',
    'Delay':'Wait',
    'Services':'Services',
    'Growth':'Growth',
    'Stability':'Stability',
    'Finish the job':'Finish the job',
    'Buy more time':'Buy time',
    'Change course':'Change course',
    'Complete the plan':'Complete the plan',
    'Trade-off':'Trade-off',
    'Wait':'Wait',
    'Build on success':'Build on success',
    'Stay the course':'Stay the course',
    'Stop here':'Stop here'
  };

  function currentEvent(){
    if(typeof events==='undefined' || typeof state==='undefined') return null;
    let ev=events[state.week-1];
    if(ev && ev.dynamic && typeof dynamicHealth==='function') ev=dynamicHealth(ev);
    return ev;
  }

  function ensureBackdrop(){
    if(backdrop) return backdrop;
    backdrop=document.createElement('div');
    backdrop.className='decision-backdrop';
    backdrop.setAttribute('aria-hidden','true');
    backdrop.addEventListener('click',closeModal);
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function ensureModal(){
    if(modal) return modal;
    modal=document.createElement('section');
    modal.className='simple-decision-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-hidden','true');
    document.body.appendChild(modal);
    return modal;
  }

  function openModal(){
    const ev=currentEvent();
    if(!ev) return;
    const b=ensureBackdrop();
    const m=ensureModal();
    const choices=ev.choices||[];
    m.innerHTML=`
      <button class="simple-close" type="button" aria-label="Close">×</button>
      <div class="simple-kicker">${ev.place||''}</div>
      <h2>${ev.title}</h2>
      <p class="simple-question">What should you do?</p>
      <div class="simple-choices">
        ${choices.map((c,i)=>`<button class="simple-choice" data-i="${i}">
          <span class="choice-number">${i+1}</span>
          <span class="choice-copy"><b>${simpleTitles[c[0]]||c[0]}</b><small>${simpleMeta[c[2]]||c[2]}${c[3]&&c[3]!=='£0bn'?' · '+c[3]:''}</small></span>
          <span class="choice-arrow">→</span>
        </button>`).join('')}
      </div>
      <p class="simple-hint">There is no perfect answer. Pick the trade-off you prefer.</p>`;
    m.querySelector('.simple-close').onclick=closeModal;
    m.querySelectorAll('.simple-choice').forEach(btn=>btn.onclick=()=>{
      const i=Number(btn.dataset.i);
      closeModal();
      if(typeof choose==='function') choose(ev,i);
    });
    b.classList.add('show');
    b.setAttribute('aria-hidden','false');
    m.classList.add('show');
    m.setAttribute('aria-hidden','false');
    const help=document.querySelector('#mapHelp');
    if(help) help.style.display='none';
    setTimeout(()=>m.querySelector('.simple-choice')?.focus({preventScroll:true}),40);
  }

  function closeModal(){
    if(backdrop){backdrop.classList.remove('show');backdrop.setAttribute('aria-hidden','true');}
    if(modal){modal.classList.remove('show');modal.setAttribute('aria-hidden','true');}
  }

  function compactDecision(){
    if(compacting) return;
    const d=document.querySelector('#decision');
    if(!d) return;
    if(d.querySelector('.decision-done')){
      d.classList.remove('decision-summary');
      d.classList.add('decision-result');
      return;
    }
    const ev=currentEvent();
    if(!ev || !d.querySelector('.choices')) return;
    compacting=true;
    d.classList.remove('decision-result');
    d.classList.add('decision-summary');
    const location=[ev.kind,ev.place].filter(Boolean).join(' · ');
    d.innerHTML=`
      <div class="summary-kicker">THIS WEEK · ${location}</div>
      <h2>${ev.title}</h2>
      <p>${ev.desc}</p>
      <button class="summary-cta" type="button">Review decision <span>→</span></button>
      ${state.week===1?'<small class="summary-guide">1. Review the problem&nbsp;&nbsp; 2. Pick a response&nbsp;&nbsp; 3. See what changes</small>':''}`;
    d.querySelector('.summary-cta').onclick=openModal;
    compacting=false;
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#marker') || e.target.closest('.city.hot')){
      e.preventDefault();
      e.stopPropagation();
      openModal();
    }
  },true);

  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

  const observer=new MutationObserver(()=>setTimeout(compactDecision,0));
  const d=document.querySelector('#decision');
  if(d) observer.observe(d,{childList:true,subtree:true});
  setTimeout(compactDecision,0);

  const help=document.querySelector('#mapHelp');
  if(help) help.textContent='1. Click the red alert';

  const style=document.createElement('style');
  style.textContent=`
    .legend{display:none!important}
    #marker:after{content:'Review'!important}
    .map-help{font-size:13px!important;padding:11px 14px!important;max-width:180px!important}

    #decision.decision-summary{
      position:absolute!important;right:28px!important;top:138px!important;bottom:auto!important;
      width:min(340px,28vw)!important;height:auto!important;min-height:0!important;
      display:block!important;overflow:visible!important;padding:24px!important;
      border-radius:24px!important;background:rgba(255,253,246,.96)!important;
    }
    #decision.decision-summary .summary-kicker{font-size:9px;font-weight:950;letter-spacing:.11em;color:#d45b4e;margin-bottom:8px}
    #decision.decision-summary h2{font-family:Georgia,serif;font-size:28px;line-height:1.02;margin:0 0 10px;letter-spacing:-.03em}
    #decision.decision-summary>p{font-size:13px;line-height:1.45;color:#607a73;margin:0 0 17px}
    .summary-cta{width:100%;border:0;border-radius:15px;background:#16372f;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(18,49,41,.14)}
    .summary-cta:hover{transform:translateY(-1px)}
    .summary-guide{display:block;margin-top:13px;color:#78908a;font-size:9px;line-height:1.45}
    #decision.decision-result{right:28px!important;top:138px!important;bottom:auto!important;width:min(340px,28vw)!important;height:auto!important;min-height:0!important}
    #decision.decision-result .decision-done{padding:24px!important}

    .decision-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(11,39,33,.48);backdrop-filter:blur(5px);opacity:0;pointer-events:none;transition:opacity .18s ease}
    .decision-backdrop.show{opacity:1;pointer-events:auto}
    .simple-decision-modal{position:fixed;z-index:1001;left:50%;top:50%;transform:translate(-50%,-47%) scale(.98);width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 40px);overflow:auto;background:#fffdf6;border-radius:28px;padding:30px;box-shadow:0 34px 90px rgba(9,33,28,.4);opacity:0;pointer-events:none;transition:.18s ease}
    .simple-decision-modal.show{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}
    .simple-close{position:absolute;right:16px;top:15px;width:38px;height:38px;border:0;border-radius:50%;background:#edf1e7;color:#16372f;font-size:25px;cursor:pointer}
    .simple-kicker{font-size:10px;font-weight:950;letter-spacing:.12em;color:#d45b4e;text-transform:uppercase;margin-bottom:8px}
    .simple-decision-modal h2{font-family:Georgia,serif;font-size:36px;line-height:1.02;letter-spacing:-.04em;margin:0 46px 7px 0;color:#16372f}
    .simple-question{font-size:15px;font-weight:850;color:#58736c;margin:0 0 18px}
    .simple-choices{display:flex;flex-direction:column;gap:10px}
    .simple-choice{border:1px solid rgba(22,55,47,.14);background:#fff;border-radius:18px;min-height:78px;padding:14px 16px;display:grid;grid-template-columns:34px 1fr 20px;align-items:center;gap:12px;text-align:left;color:#16372f;cursor:pointer;transition:.16s}
    .simple-choice:hover,.simple-choice:focus{border-color:#6f9b8d;box-shadow:0 9px 24px rgba(22,55,47,.10);transform:translateY(-1px);outline:none}
    .choice-number{width:32px;height:32px;border-radius:11px;background:#edf1e7;display:grid;place-items:center;font-weight:950;font-size:13px}
    .choice-copy b{display:block;font-size:16px;line-height:1.15;margin-bottom:5px}
    .choice-copy small{display:block;font-size:11px;color:#6c847e;font-weight:750}
    .choice-arrow{font-size:20px;font-weight:900;color:#d45b4e}
    .simple-hint{font-size:10px;line-height:1.4;color:#82958f;text-align:center;margin:14px 0 0}

    .stat{min-width:94px!important;padding:9px 12px!important}
    .stat b{font-size:18px!important}
    .news{max-width:390px!important}

    @media(max-width:900px){
      #decision.decision-summary,#decision.decision-result{left:12px!important;right:12px!important;top:auto!important;bottom:76px!important;width:auto!important}
      .simple-decision-modal{width:calc(100vw - 18px);padding:24px 18px;border-radius:22px}
      .simple-decision-modal h2{font-size:30px}
      .simple-choice{min-height:72px;padding:12px}
      .summary-guide{display:none}
    }
  `;
  document.head.appendChild(style);
})();