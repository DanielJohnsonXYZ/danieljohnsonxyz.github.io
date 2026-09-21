(()=>{
  let backdrop;

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

  function openDecision(){
    const d=document.querySelector('#decision');
    if(!d) return;
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
    if(d && d.classList.contains('decision-modal')) ensureCloseButton();
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
      width:min(440px,calc(100vw - 32px))!important;
      max-height:min(760px,calc(100vh - 42px))!important;
      z-index:1001!important;
      display:flex!important;
      visibility:visible!important;
      opacity:1!important;
      overflow:hidden!important;
      box-shadow:0 34px 90px rgba(9,33,28,.38)!important;
    }
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
      #decision.decision-modal{
        width:calc(100vw - 20px)!important;
        max-height:calc(100vh - 20px)!important;
      }
    }
  `;
  document.head.appendChild(style);
})();