(()=>{
  let backdrop;

  const simpleLabels={
    'Open temporary capacity':'Add temporary beds',
    'Expand permanent capacity':'Build more hospital capacity',
    'Focus on discharges and community care':'Help patients leave hospital sooner',
    'Broker a quick settlement':'Get trains running quickly',
    'Trade support for reform':'Fix the rail system longer term',
    'Hold the line':'Wait it out',
    'Fund new homes':'Build more homes',
    'Reform planning rules':'Make it easier to build homes',
    'Target the worst-hit areas':'Help the worst-hit areas',
    'Protect public services':'Put money into public services',
    'Protect investment':'Keep building infrastructure',
    'Protect the buffer':'Save money for emergencies',
    'Pre-position emergency support':'Prepare before the storm',
    'Focus only on highest-risk areas':'Protect the highest-risk areas',
    'Wait and respond as needed':'Wait and react if needed',
    'Approve the full project':'Build the full rail link',
    'Approve a smaller first phase':'Build a smaller first section',
    'Delay it':'Wait',
    'Hold a national address':'Speak to the country',
    'Tour regional projects':'Visit projects around the country',
    'Ignore the noise':'Keep governing',
    'Make the extra capacity permanent':'Make the extra beds permanent',
    'Extend the temporary deal':'Keep the temporary beds',
    'Shift to community care':'Improve community care',
    'Fund a recruitment package':'Recruit more hospital staff',
    'Redeploy existing staff':'Move staff from elsewhere',
    'Hold course':'Wait and see',
    'Add a modest capacity boost':'Add some extra hospital capacity',
    'Expand community care further':'Expand community care',
    'Bank the improvement':'Do nothing more for now',
    'Target pay in shortage areas':'Pay more where teachers are scarce',
    'Expand training places':'Train more teachers',
    'Target the hardest-hit schools':'Help the hardest-hit schools',
    'Temporary household support':'Help households with energy bills',
    'Target energy-intensive firms':'Help businesses with energy costs',
    'Keep support tightly targeted':'Limit support to those most in need',
    'Push the full bill':'Push the full housing bill',
    'Accept a compromise':'Pass a smaller housing bill',
    'Delay the vote':'Wait before voting',
    'Double down on public services':'Focus on public services',
    'Double down on growth':'Focus on growth',
    'Rebuild the fiscal buffer':'Save more money for later'
  };

  const simpleTags={
    'Fast · temporary':'Fast fix',
    'Strong · long-term':'Long-term fix',
    'Balanced':'Balanced',
    'Quick win':'Fast fix',
    'Slower · stronger':'Long-term fix',
    'Risky':'Risky',
    'Direct':'Direct',
    'Long-term':'Long-term',
    'Focused':'Targeted',
    'Services first':'Services',
    'Growth first':'Growth',
    'Cautious':'Save money',
    'Safer':'Safer',
    'Transformational':'Big project',
    'Practical':'Smaller project',
    'No commitment':'No spend',
    'Visible':'Public',
    'Grounded':'Local',
    'Steady':'Wait',
    'Finish the job':'Permanent fix',
    'Buy more time':'Temporary fix',
    'Change course':'Change plan',
    'Complete the plan':'Staffing',
    'Trade-off':'Trade-off',
    'Wait':'Wait',
    'Build on success':'Build on it',
    'Stay the course':'Keep going',
    'Stop here':'Stop',
    'Fast':'Fast',
    'Immediate':'Immediate',
    'Economic':'Protect jobs',
    'Bold':'Bigger change',
    'Safe':'Easier to pass',
    'Delay':'Wait',
    'Services':'Services',
    'Growth':'Growth',
    'Stability':'Save money'
  };

  function ensureBackdrop(){
    if(backdrop) return backdrop;
    backdrop=document.createElement('div');
    backdrop.className='decision-backdrop';
    backdrop.setAttribute('aria-hidden','true');
    backdrop.addEventListener('click', closeDecision);
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function ensureCloseButton(){
    const d=document.querySelector('#decision');
    if(!d || d.querySelector('.decision-close')) return;
    const b=document.createElement('button');
    b.className='decision-close';
    b.type='button';
    b.setAttribute('aria-label','Close decision');
    b.textContent='×';
    b.addEventListener('click', closeDecision);
    d.appendChild(b);
  }

  function simplifyDecision(){
    const d=document.querySelector('#decision');
    if(!d || d.querySelector('.decision-done')) return;

    const kicker=d.querySelector('.decision-kicker');
    if(kicker){
      const parts=kicker.textContent.split('·');
      kicker.textContent=(parts[1]||parts[0]).trim();
    }

    const desc=d.querySelector('.decision-desc');
    if(desc){
      const first=(desc.textContent.match(/^[^.!?]+[.!?]/)||[desc.textContent])[0].trim();
      desc.textContent=first;
      if(!d.querySelector('.new-player-hint')){
        const hint=document.createElement('div');
        hint.className='new-player-hint';
        hint.textContent='Pick one. There is no perfect answer.';
        desc.insertAdjacentElement('afterend',hint);
      }
    }

    const adviser=d.querySelector('.adviser');
    if(adviser) adviser.style.display='none';

    const header=d.querySelector('.choice-header');
    if(header) header.textContent='WHAT DO YOU DO?';

    d.querySelectorAll('.choice').forEach((choice,i)=>{
      const title=choice.querySelector('b');
      if(title && simpleLabels[title.textContent.trim()]) title.textContent=simpleLabels[title.textContent.trim()];

      const p=choice.querySelector('p');
      if(p) p.style.display='none';

      const tag=choice.querySelector('.tag');
      if(tag && simpleTags[tag.textContent.trim()]) tag.textContent=simpleTags[tag.textContent.trim()];

      const cost=choice.querySelector('.cost');
      if(cost){
        const raw=cost.textContent.trim().replace('.0bn','bn');
        cost.textContent=raw==='£0bn'?'No cost':raw;
      }

      const choose=choice.querySelector('.choose');
      if(choose) choose.textContent='→';

      if(!choice.querySelector('.option-number')){
        const n=document.createElement('span');
        n.className='option-number';
        n.textContent=String(i+1);
        choice.prepend(n);
      }
    });
  }

  function openDecision(){
    const d=document.querySelector('#decision');
    if(!d) return;
    simplifyDecision();
    ensureBackdrop();
    ensureCloseButton();
    d.classList.add('decision-modal');
    backdrop.classList.add('show');
    backdrop.setAttribute('aria-hidden','false');
    const mapHelp=document.querySelector('#mapHelp');
    if(mapHelp) mapHelp.style.display='none';
    setTimeout(()=>{
      const first=d.querySelector('.choice, .next');
      if(first) first.focus({preventScroll:true});
    },50);
  }

  function closeDecision(){
    const d=document.querySelector('#decision');
    if(d) d.classList.remove('decision-modal');
    if(backdrop){
      backdrop.classList.remove('show');
      backdrop.setAttribute('aria-hidden','true');
    }
  }

  document.addEventListener('click',(e)=>{
    if(e.target.closest('#marker') || e.target.closest('.city.hot')){
      e.preventDefault();
      e.stopPropagation();
      openDecision();
    }
  },true);

  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape') closeDecision();
  });

  const observer=new MutationObserver(()=>{
    const d=document.querySelector('#decision');
    if(!d) return;
    simplifyDecision();
    if(d.classList.contains('decision-modal')) ensureCloseButton();
  });
  const d=document.querySelector('#decision');
  if(d) observer.observe(d,{childList:true,subtree:true});

  const style=document.createElement('style');
  style.textContent=`
    .decision-backdrop{
      position:fixed; inset:0; z-index:1000;
      background:rgba(11,39,33,.48);
      backdrop-filter:blur(4px);
      opacity:0; pointer-events:none;
      transition:opacity .18s ease;
    }
    .decision-backdrop.show{opacity:1;pointer-events:auto}
    #decision.decision-modal{
      position:fixed!important;
      left:50%!important; top:50%!important;
      right:auto!important; bottom:auto!important;
      transform:translate(-50%,-50%)!important;
      width:min(430px,calc(100vw - 32px))!important;
      max-height:min(680px,calc(100vh - 42px))!important;
      z-index:1001!important;
      display:flex!important;
      visibility:visible!important;
      opacity:1!important;
      overflow:hidden!important;
      box-shadow:0 34px 90px rgba(9,33,28,.38)!important;
    }
    #decision.decision-modal .decision-head{padding:24px 24px 18px}
    #decision.decision-modal .decision-kicker{font-size:11px;letter-spacing:.08em;color:#73877f}
    #decision.decision-modal h2{font-size:34px;line-height:1.02;margin:8px 42px 10px 0}
    #decision.decision-modal .decision-desc{font-size:15px;line-height:1.45;max-width:330px}
    .new-player-hint{margin-top:11px;font-size:12px;font-weight:850;color:#315d51}
    #decision.decision-modal .choice-header{padding:16px 20px 8px;font-size:11px;letter-spacing:.1em}
    #decision.decision-modal .choices{padding:8px 14px 18px;gap:9px}
    #decision.decision-modal .choice{position:relative;min-height:78px;padding:15px 48px 14px 52px;border-radius:15px;display:block}
    #decision.decision-modal .choice b{font-size:16px;line-height:1.25;margin:0 0 10px}
    #decision.decision-modal .choice-foot{justify-content:flex-start;gap:9px}
    #decision.decision-modal .choice .tag{font-size:10px;padding:5px 8px}
    #decision.decision-modal .choice .cost{font-size:11px;color:#526b65}
    #decision.decision-modal .choice .choose{position:absolute;right:17px;top:50%;transform:translateY(-50%);font-size:22px;color:#d45b4e;font-weight:900}
    .option-number{position:absolute;left:16px;top:17px;width:25px;height:25px;border-radius:8px;background:#edf1e7;color:#16372f;display:grid;place-items:center;font-size:11px;font-weight:950}
    .decision-close{
      position:absolute; right:14px; top:13px; z-index:4;
      width:34px; height:34px; border:0; border-radius:50%;
      background:#eef2e9; color:#16372f;
      font-size:24px; line-height:1; cursor:pointer;
      display:grid; place-items:center;
      box-shadow:0 4px 12px rgba(22,55,47,.12);
    }
    .decision-close:hover{background:#e3eadf}
    #marker{touch-action:manipulation}
    @media(max-width:600px){
      #decision.decision-modal{width:calc(100vw - 20px)!important;max-height:calc(100vh - 20px)!important}
      #decision.decision-modal h2{font-size:30px}
      #decision.decision-modal .choice{padding-right:42px}
    }
  `;
  document.head.appendChild(style);
})();