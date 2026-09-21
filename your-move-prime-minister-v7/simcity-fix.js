(()=>{
  if(typeof state==='undefined') return;

  // Extra country systems. Existing state values remain the source of truth for
  // Health (services), Jobs (economy), Housing and Safety (resilience).
  if(typeof state.transport!=='number') state.transport=56;
  if(typeof state.education!=='number') state.education=58;
  if(typeof state.energy!=='number') state.energy=61;
  if(typeof state.environment!=='number') state.environment=64;

  const systems=[
    {key:'services',label:'Health',icon:'♥'},
    {key:'economy',label:'Jobs',icon:'↗'},
    {key:'housing',label:'Housing',icon:'⌂'},
    {key:'transport',label:'Transport',icon:'↔'},
    {key:'education',label:'Education',icon:'▤'},
    {key:'energy',label:'Energy',icon:'⚡'},
    {key:'environment',label:'Environment',icon:'♻'},
    {key:'resilience',label:'Safety',icon:'◆'}
  ];

  const extraEffects={
    HEALTH:[{}, {}, {}],
    TRANSPORT:[
      {transport:3},
      {transport:5,environment:1},
      {transport:-3}
    ],
    HOUSING:[
      {environment:-1},
      {environment:-1},
      {}
    ],
    BUDGET:[
      {education:2},
      {transport:2,energy:1},
      {energy:1}
    ],
    WEATHER:[
      {environment:2},
      {environment:1},
      {environment:-2}
    ],
    INFRASTRUCTURE:[
      {transport:6,environment:-1},
      {transport:3},
      {transport:-1}
    ],
    'PUBLIC MOOD':[{}, {}, {}],
    CONSEQUENCE:[{}, {}, {}],
    SCHOOLS:[
      {education:4},
      {education:5},
      {education:3}
    ],
    ENERGY:[
      {energy:2},
      {energy:2},
      {energy:0}
    ],
    PARLIAMENT:[{}, {}, {}],
    'FINAL WEEK':[
      {education:1},
      {transport:1,energy:1},
      {environment:1}
    ]
  };

  const clampSystem=v=>Math.max(25,Math.min(90,Number(v)||0));
  let panel=null;
  let lastChanged={};

  function systemValue(key){return Math.round(Number(state[key])||0)}
  function status(v){return v>=68?'strong':v>=55?'stable':'under pressure'}
  function tone(v){return v>=68?'good':v>=55?'steady':'bad'}

  function ensurePanel(){
    if(panel) return panel;
    const game=document.querySelector('#game');
    if(!game) return null;
    panel=document.createElement('section');
    panel.className='country-systems';
    panel.innerHTML='<div class="systems-title"><span>COUNTRY SYSTEMS</span><small>Live simulation</small></div><div class="systems-grid"></div>';
    game.appendChild(panel);
    return panel;
  }

  function renderSystems(changed={}){
    const p=ensurePanel();
    if(!p) return;
    const grid=p.querySelector('.systems-grid');
    grid.innerHTML=systems.map(s=>{
      const v=systemValue(s.key);
      const delta=changed[s.key]||0;
      return `<div class="system-tile ${tone(v)} ${delta?'changed':''}" data-system="${s.key}">
        <div class="system-line"><span class="system-icon">${s.icon}</span><b>${s.label}</b><strong>${v}</strong></div>
        <div class="system-bar"><i style="width:${v}%"></i></div>
        <div class="system-foot"><small>${status(v)}</small>${delta?`<em class="${delta>0?'up':'down'}">${delta>0?'+':''}${delta}</em>`:''}</div>
      </div>`;
    }).join('');
    if(Object.keys(changed).length){
      setTimeout(()=>p.querySelectorAll('.system-tile.changed').forEach(x=>x.classList.remove('changed')),1800);
    }
  }

  // Country is now a simple average of eight readable systems.
  const previousCountryCalc=typeof countryCalc==='function'?countryCalc:null;
  countryCalc=function(){
    const total=systems.reduce((sum,s)=>sum+(Number(state[s.key])||0),0);
    state.country=Math.round(total/systems.length);
    return state.country;
  };

  function applyExtra(ev,i){
    const set=extraEffects[ev?.kind]||[];
    const effect=set[i]||{};
    const changed={};
    Object.entries(effect).forEach(([key,delta])=>{
      if(!delta) return;
      const before=Number(state[key])||0;
      state[key]=clampSystem(before+delta);
      const actual=Math.round((state[key]-before)*10)/10;
      if(actual) changed[key]=actual;
    });
    return changed;
  }

  const oldChoose=typeof choose==='function'?choose:null;
  if(oldChoose){
    choose=function(ev,i){
      lastChanged=applyExtra(ev,i);
      oldChoose(ev,i);
      renderSystems(lastChanged);
      setTimeout(()=>addResultSystems(lastChanged),45);
    };
  }

  const oldRenderStats=typeof renderStats==='function'?renderStats:null;
  if(oldRenderStats){
    renderStats=function(){
      oldRenderStats();
      renderSystems();
    };
  }

  function addResultSystems(changed){
    const keys=Object.keys(changed||{});
    if(!keys.length) return;
    const done=document.querySelector('#decision .decision-done');
    if(!done){setTimeout(()=>addResultSystems(changed),50);return;}
    if(done.querySelector('.system-result')) return;
    const effects=done.querySelector('.result-effects');
    const box=document.createElement('div');
    box.className='system-result';
    box.innerHTML=`<span>COUNTRY SYSTEMS</span><div>${keys.map(k=>{
      const s=systems.find(x=>x.key===k);
      const d=changed[k];
      return `<b class="${d>0?'up':'down'}">${s?s.label:k} ${d>0?'+':''}${d}</b>`;
    }).join('')}</div>`;
    if(effects) effects.after(box); else done.firstElementChild?.appendChild(box);
  }

  // A small detail panel when a player taps a system tile. It explains the
  // variable without asking the player to manage another screen.
  document.addEventListener('click',e=>{
    const tile=e.target.closest('.system-tile');
    if(!tile) return;
    const s=systems.find(x=>x.key===tile.dataset.system);
    if(!s) return;
    document.querySelector('.system-popover')?.remove();
    const pop=document.createElement('div');
    pop.className='system-popover';
    pop.innerHTML=`<b>${s.icon} ${s.label}</b><strong>${systemValue(s.key)}</strong><span>${status(systemValue(s.key))}</span>`;
    tile.appendChild(pop);
    setTimeout(()=>pop.remove(),1800);
  });

  const style=document.createElement('style');
  style.textContent=`
    .country-systems{position:absolute;z-index:12;left:24px;top:118px;width:224px;background:rgba(255,253,246,.90);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.72);border-radius:18px;padding:12px;box-shadow:0 10px 28px rgba(18,49,41,.10)}
    .systems-title{display:flex;align-items:end;justify-content:space-between;margin:0 2px 9px}.systems-title span{font-size:9px;font-weight:950;letter-spacing:.11em;color:#476961}.systems-title small{font-size:8px;color:#839a94}
    .systems-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.system-tile{position:relative;background:rgba(255,255,255,.66);border:1px solid rgba(22,55,47,.08);border-radius:11px;padding:8px;cursor:default;transition:.22s}.system-tile.changed{transform:translateY(-2px);box-shadow:0 0 0 2px rgba(243,207,87,.62),0 8px 18px rgba(22,55,47,.12)}
    .system-line{display:grid;grid-template-columns:15px 1fr auto;align-items:center;gap:4px}.system-icon{font-size:11px;color:#597a70}.system-line b{font-size:9px;line-height:1;white-space:nowrap}.system-line strong{font-size:12px}.system-bar{height:4px;border-radius:6px;background:#e3e9e3;overflow:hidden;margin-top:6px}.system-bar i{display:block;height:100%;border-radius:6px;background:#d2a837;transition:width .45s ease,background .3s}.system-tile.good .system-bar i{background:#4d8b69}.system-tile.bad .system-bar i{background:#d45b4e}.system-foot{height:11px;margin-top:4px;display:flex;justify-content:space-between;align-items:center}.system-foot small{font-size:7px;color:#82958f}.system-foot em{font-style:normal;font-size:8px;font-weight:950}.system-foot .up,.system-result .up{color:#3d815f}.system-foot .down,.system-result .down{color:#bd4f44}
    .system-result{margin:10px 0 0;padding:10px 11px;border-radius:13px;background:#f1f4eb}.system-result>span{display:block;font-size:8px;font-weight:950;letter-spacing:.1em;color:#718a82;margin-bottom:6px}.system-result>div{display:flex;gap:6px;flex-wrap:wrap}.system-result b{font-size:9px;background:#fff;border-radius:999px;padding:5px 7px}
    .system-popover{position:absolute;z-index:40;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%);min-width:110px;background:#16372f;color:white;border-radius:10px;padding:8px 10px;box-shadow:0 8px 20px rgba(12,41,34,.25);pointer-events:none}.system-popover b{font-size:9px;display:block}.system-popover strong{font-size:18px;margin-right:5px}.system-popover span{font-size:8px;color:#bddbd3}
    @media(max-width:1050px){.country-systems{width:200px;left:14px;top:112px}.systems-grid{gap:5px}.system-tile{padding:7px}.system-line b{font-size:8px}}
    @media(max-width:900px){.country-systems{left:10px;top:96px;width:178px;padding:9px}.systems-title small{display:none}.system-foot small{display:none}.system-foot{height:5px}.system-line b{font-size:8px}.system-line strong{font-size:10px}}
    @media(max-width:650px){.country-systems{width:150px}.systems-grid{grid-template-columns:1fr}.system-tile:nth-child(n+5){display:none}}
  `;
  document.head.appendChild(style);

  countryCalc();
  renderSystems();
})();