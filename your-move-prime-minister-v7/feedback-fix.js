(()=>{
  let pending=null;
  let strip=null;

  const metricNames={services:'Public services',economy:'Economy',housing:'Housing',resilience:'Resilience'};
  const relevantMetric={HEALTH:'services',TRANSPORT:'economy',HOUSING:'housing',BUDGET:'economy',WEATHER:'resilience',INFRASTRUCTURE:'economy','PUBLIC MOOD':'approval',CONSEQUENCE:'services',SCHOOLS:'services',ENERGY:'economy',PARLIAMENT:'housing','FINAL WEEK':'services'};

  function getEvent(){
    if(typeof events==='undefined'||typeof state==='undefined')return null;
    let ev=events[state.week-1];
    if(ev&&ev.dynamic&&typeof dynamicHealth==='function')ev=dynamicHealth(ev);
    return ev;
  }

  function snap(){
    return {
      approval:Number(state.approval)||0,
      budget:Number(state.budget)||0,
      country:Number(state.country)||0,
      services:Number(state.services)||0,
      economy:Number(state.economy)||0,
      housing:Number(state.housing)||0,
      resilience:Number(state.resilience)||0
    };
  }

  function diff(before,after){
    const d={};
    Object.keys(before).forEach(k=>d[k]=Math.round((after[k]-before[k])*10)/10);
    return d;
  }

  function signed(n,digits=0){
    const v=digits?Number(n).toFixed(digits):Math.round(n);
    return `${n>0?'+':''}${v}`;
  }

  function impactTone(d){
    const sum=(d.approval||0)+(d.country||0)+(d.services||0)+(d.economy||0)+(d.housing||0)+(d.resilience||0);
    return sum<0?'negative':sum>0?'positive':'neutral';
  }

  function headlineFor(ev,i){
    const map={
      HEALTH:[
        'Temporary hospital capacity opened in the North West',
        'Government backs permanent hospital capacity expansion',
        'Community care plan targets hospital discharge delays'
      ],
      TRANSPORT:[
        'Ministers broker a quick response to rail disruption',
        'Government ties rail support to longer-term reform',
        'Rail disruption continues as ministers hold their position'
      ],
      HOUSING:[
        'New funding announced for homebuilding',
        'Planning changes aim to unlock more homes',
        'Housing support focused on the hardest-hit areas'
      ],
      BUDGET:[
        'Public services protected in the first spending plan',
        'Investment protected as Treasury sets priorities',
        'Chancellor keeps more money in reserve'
      ],
      WEATHER:[
        'Emergency support moved into place ahead of the storm',
        'Storm preparations focused on the highest-risk areas',
        'Government holds back resources ahead of the storm'
      ],
      INFRASTRUCTURE:[
        'Northern rail project gets the green light',
        'Smaller first phase approved for northern rail link',
        'Northern rail project delayed'
      ],
      'PUBLIC MOOD':[
        'Prime Minister addresses the country',
        'Prime Minister takes government message on the road',
        'Government chooses delivery over a media reset'
      ],
      CONSEQUENCE:[
        'Government adjusts its hospital plan',
        'Hospital plan extended as pressure persists',
        'Ministers change course on hospital pressure'
      ],
      SCHOOLS:[
        'Targeted teacher pay package announced',
        'Teacher training places set to expand',
        'Support targeted at schools with the worst shortages'
      ],
      ENERGY:[
        'Temporary help announced for household energy bills',
        'Energy support targeted at vulnerable industries',
        'Energy support kept tightly targeted'
      ],
      PARLIAMENT:[
        'Government pushes ahead with the full housing bill',
        'Housing bill scaled back to secure support',
        'Housing vote delayed'
      ],
      'FINAL WEEK':[
        'Government puts public services at the centre of its next phase',
        'Government shifts its next phase towards growth',
        'Treasury buffer becomes the next priority'
      ]
    };
    return (map[ev.kind]&&map[ev.kind][i])||`${ev.place||'Government'} responds to this week's challenge`;
  }

  function watchFor(ev,i){
    const map={
      HEALTH:[
        'The pressure could return if the underlying bottleneck is not fixed.',
        'The extra capacity will still need enough staff to run it.',
        'This may work quietly rather than producing an immediate visible win.'
      ],
      TRANSPORT:[
        'The settlement uses money that cannot be spent elsewhere.',
        'Reform takes longer, so disruption may not disappear immediately.',
        'Continued disruption could start to hurt approval and the economy.'
      ],
      HOUSING:[
        'New homes take time to appear even after funding is approved.',
        'Planning changes can take months to turn into actual building.',
        'Pressure may remain high outside the areas you targeted.'
      ],
      BUDGET:[
        'Other departments now have less room to manoeuvre.',
        'Public services may feel tighter while investment is protected.',
        'Keeping a buffer means fewer visible improvements right now.'
      ],
      WEATHER:[
        'The real test comes when the storm makes landfall.',
        'Areas outside the priority zones remain more exposed.',
        'A severe storm could make a late response much more expensive.'
      ],
      INFRASTRUCTURE:[
        'The project ties up money for several years.',
        'A smaller phase delivers less benefit but is easier to manage.',
        'Delaying protects the budget, but the transport problem remains.'
      ],
      'PUBLIC MOOD':[
        'The effect depends on whether people believe delivery follows the message.',
        'Regional visits help visibility, but only if projects keep moving.',
        'Ignoring the noise works only if results improve soon.'
      ],
      CONSEQUENCE:[
        'Your original health decision is still shaping what happens next.',
        'The same underlying pressure may return again later.',
        'Changing course can help, but it costs time and money.'
      ],
      SCHOOLS:[
        'Higher pay helps recruitment, but increases ongoing costs.',
        'Training more teachers takes time before classrooms feel the benefit.',
        'Other schools may continue to struggle.'
      ],
      ENERGY:[
        'Temporary support becomes expensive if prices stay high.',
        'Households may still feel the squeeze.',
        'Limited support protects the budget but leaves more people exposed.'
      ],
      PARLIAMENT:[
        'A bigger bill brings more political risk.',
        'The compromise is easier to pass, but delivers less change.',
        'Delay avoids a fight now but costs momentum.'
      ],
      'FINAL WEEK':[
        'This choice will shape what your government is judged on next.',
        'Growth projects may take longer to show up in daily life.',
        'A stronger buffer means fewer visible wins in the short term.'
      ]
    };
    return (map[ev.kind]&&map[ev.kind][i])||'Some of the consequences will take a few weeks to become clear.';
  }

  function reactionFor(ev,i,tone){
    const adviser=(ev.adviser&&ev.adviser[1])||'Cabinet Office';
    const generic=tone==='negative'
      ? '“That buys us time, but the downside will be visible quickly.”'
      : tone==='positive'
        ? '“That should make a difference. Now we need to make it stick.”'
        : '“The immediate effect is limited. We will need to watch what happens next.”';
    const specific={
      HEALTH:['“This buys us breathing room, but it is not a permanent answer.”','“This is the stronger long-term fix. Staffing is the next question.”','“This targets the bottleneck rather than just adding beds.”'],
      BUDGET:['“Services are protected, but the rest of the plan gets tighter.”','“We are protecting growth, but departments will feel the squeeze.”','“We have kept room for the unexpected, at the cost of visible action now.”'],
      WEATHER:['“We are better prepared before the storm arrives.”','“We have focused our resources where the risk is highest.”','“We are keeping our powder dry. That is a gamble if the storm worsens.”']
    };
    return {adviser,text:(specific[ev.kind]&&specific[ev.kind][i])||generic};
  }

  function keyEffects(d,ev){
    const items=[];
    if(d.budget)items.push({label:'Budget',value:`${d.budget>0?'+':''}£${Math.abs(d.budget).toFixed(1).replace('.0','')}bn`,tone:'budget'});
    if(d.approval)items.push({label:'Approval',value:`${signed(d.approval)}%`,tone:d.approval>0?'positive':'negative'});
    if(d.country)items.push({label:'Country',value:signed(d.country),tone:d.country>0?'positive':'negative'});
    const preferred=relevantMetric[ev.kind];
    if(preferred&&preferred!=='approval'&&d[preferred])items.push({label:metricNames[preferred],value:signed(d[preferred]),tone:d[preferred]>0?'positive':'negative'});
    if(items.length<3){
      ['services','economy','housing','resilience'].forEach(k=>{
        if(items.length>=3)return;
        if(k!==preferred&&d[k])items.push({label:metricNames[k],value:signed(d[k]),tone:d[k]>0?'positive':'negative'});
      });
    }
    return items.slice(0,3);
  }

  function animateStat(id,delta,type='normal'){
    if(!delta)return;
    const value=document.querySelector(id);
    const box=value&&value.closest('.stat');
    if(!box)return;
    box.querySelector('.live-delta')?.remove();
    const badge=document.createElement('span');
    badge.className=`live-delta ${type==='budget'?'budget':delta>0?'up':'down'}`;
    badge.textContent=type==='budget'?`${delta>0?'+':'−'}£${Math.abs(delta).toFixed(1).replace('.0','')}bn`:`${delta>0?'+':''}${Math.round(delta)}`;
    box.appendChild(badge);
    box.classList.remove('stat-pop');
    void box.offsetWidth;
    box.classList.add('stat-pop');
    setTimeout(()=>{badge.classList.add('fade');box.classList.remove('stat-pop');},1800);
    setTimeout(()=>badge.remove(),2400);
  }

  function mapFeedback(ev,tone){
    const marker=document.querySelector('#marker');
    if(marker){
      marker.classList.remove('impact-positive','impact-negative','impact-neutral');
      marker.classList.add(`impact-${tone}`);
      marker.textContent=tone==='negative'?'!':'✓';
    }
    const city=ev.city&&document.getElementById(ev.city);
    if(city){
      city.classList.add('impact-city');
      setTimeout(()=>city.classList.remove('impact-city'),2200);
    }
    const canvas=document.querySelector('.map-canvas')||document.querySelector('.map-wrap');
    if(!canvas||!marker)return;
    canvas.querySelector('.map-impact-bubble')?.remove();
    const b=document.createElement('div');
    b.className=`map-impact-bubble ${tone}`;
    b.style.left=marker.style.left;
    b.style.top=marker.style.top;
    const text={HEALTH:'Hospital pressure easing',TRANSPORT:'Transport response in place',HOUSING:'Housing action underway',BUDGET:'Spending priority set',WEATHER:'Storm readiness updated',INFRASTRUCTURE:'Infrastructure plan updated','PUBLIC MOOD':'Public reaction shifting',CONSEQUENCE:'Health plan updated',SCHOOLS:'School response underway',ENERGY:'Energy response in place',PARLIAMENT:'Parliamentary position set','FINAL WEEK':'Priority locked in'}[ev.kind]||'Decision taking effect';
    b.textContent=text;
    canvas.appendChild(b);
    setTimeout(()=>b.classList.add('show'),20);
  }

  function showStrip(ev,effects,tone){
    strip?.remove();
    strip=document.createElement('div');
    strip.className=`impact-strip ${tone}`;
    const parts=effects.map(x=>`<span><b>${x.value}</b> ${x.label}</span>`).join('');
    strip.innerHTML=`<strong>What changed</strong>${parts}<span class="impact-place">${ev.place||''}</span>`;
    document.querySelector('#game')?.appendChild(strip);
    requestAnimationFrame(()=>strip.classList.add('show'));
  }

  function enrichResult(){
    if(!pending)return;
    const done=document.querySelector('#decision .decision-done');
    if(!done){setTimeout(enrichResult,30);return;}
    const after=snap();
    const d=diff(pending.before,after);
    const tone=impactTone(d);
    const ev=pending.ev;
    const i=pending.i;
    const effects=keyEffects(d,ev);
    const headline=headlineFor(ev,i);
    const reaction=reactionFor(ev,i,tone);
    const watch=watchFor(ev,i);
    const chosen=pending.label;
    const inner=done.firstElementChild||done;
    const nextLabel=state.week===12?'See your 12-week review':'Continue to next week →';

    inner.innerHTML=`
      <div class="result-check ${tone}">✓</div>
      <div class="result-kicker">DECISION MADE · ${ev.place||''}</div>
      <h3>${chosen}</h3>
      <p class="result-summary">Your decision is already changing the picture.</p>
      <div class="result-effects">${effects.length?effects.map(x=>`<div class="result-effect ${x.tone}"><span>${x.label}</span><b>${x.value}</b></div>`).join(''):'<div class="result-effect neutral"><span>Immediate effect</span><b>Limited</b></div>'}</div>
      <div class="result-news"><span>NEWS</span><b>${headline}</b></div>
      <div class="result-reaction"><small>${reaction.adviser}</small><p>${reaction.text}</p></div>
      <div class="result-watch"><span>WATCH NEXT</span><p>${watch}</p></div>
      <button class="primary next result-next" id="nextBtnFeedback">${nextLabel}</button>`;

    document.querySelector('#newsText').textContent=headline;
    animateStat('#approval',d.approval);
    animateStat('#budget',d.budget,'budget');
    animateStat('#countryScore',d.country);
    mapFeedback(ev,tone);
    showStrip(ev,effects,tone);

    document.querySelector('#nextBtnFeedback')?.addEventListener('click',()=>{
      strip?.remove(); strip=null;
      document.querySelector('#marker')?.classList.remove('impact-positive','impact-negative','impact-neutral');
      if(typeof nextWeek==='function')nextWeek();
    });
    pending=null;
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('.simple-choice');
    if(!btn)return;
    const ev=getEvent();
    if(!ev)return;
    const i=Number(btn.dataset.i);
    pending={
      ev,
      i,
      label:btn.querySelector('b')?.textContent||ev.choices?.[i]?.[0]||'Decision',
      before:snap()
    };
    setTimeout(enrichResult,25);
  },true);

  const style=document.createElement('style');
  style.textContent=`
    #decision.decision-result{width:min(380px,31vw)!important}
    #decision.decision-result .decision-done{display:block!important;text-align:left!important;padding:22px!important;overflow:auto!important;max-height:calc(100vh - 235px)}
    #decision.decision-result .decision-done>div{width:100%}
    .result-check{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-weight:950;font-size:18px;margin-bottom:12px}
    .result-check.positive{background:#dcecdf;color:#347357}.result-check.negative{background:#f6ded9;color:#b6493f}.result-check.neutral{background:#eeeade;color:#6d7d77}
    .result-kicker{font-size:9px;font-weight:950;letter-spacing:.11em;color:#6f8881;margin-bottom:5px}
    #decision.decision-result h3{font-family:Georgia,serif;font-size:28px;line-height:1.03;letter-spacing:-.03em;margin:0 0 7px}
    .result-summary{font-size:12px!important;line-height:1.4!important;color:#647c76!important;margin:0 0 13px!important}
    .result-effects{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-bottom:11px}
    .result-effect{border-radius:12px;padding:9px 10px;background:#f1f1e8;border:1px solid rgba(22,55,47,.08)}
    .result-effect span{display:block;font-size:8px;font-weight:850;color:#718881;margin-bottom:3px}.result-effect b{font-size:15px}.result-effect.positive b{color:#347357}.result-effect.negative b{color:#b6493f}.result-effect.budget b{color:#a87918}
    .result-news{background:#16372f;color:white;border-radius:13px;padding:10px 12px;margin-bottom:9px}.result-news span{display:block;font-size:8px;font-weight:950;letter-spacing:.12em;color:#efd67e;margin-bottom:3px}.result-news b{font-size:11px;line-height:1.35;display:block}
    .result-reaction,.result-watch{border:1px solid rgba(22,55,47,.1);border-radius:12px;padding:9px 11px;margin-bottom:8px;background:#fffdfa}.result-reaction small,.result-watch span{display:block;font-size:8px;font-weight:950;letter-spacing:.08em;color:#738982;margin-bottom:3px}.result-reaction p,.result-watch p{font-size:10px!important;line-height:1.38!important;color:#526b65!important;margin:0!important}
    .result-watch{background:#f5f0df}.result-watch span{color:#a87918}
    .result-next{width:100%;margin-top:5px!important;padding:13px 16px!important}

    .live-delta{position:absolute;right:8px;top:-9px;border-radius:999px;padding:4px 7px;background:#347357;color:white;font-size:9px;font-weight:950;box-shadow:0 5px 14px rgba(22,55,47,.18);transition:.4s;z-index:3}.live-delta.down{background:#d45b4e}.live-delta.budget{background:#c49029}.live-delta.fade{opacity:0;transform:translateY(-7px)}.stat{position:relative}.stat-pop{animation:statPop .55s ease}@keyframes statPop{0%,100%{transform:scale(1)}45%{transform:scale(1.06)}}

    #marker.impact-positive{background:#4d8b69!important;animation:impactPulse 1.2s ease 2!important}#marker.impact-negative{background:#d45b4e!important;animation:impactPulse 1.2s ease 2!important}#marker.impact-neutral{background:#d69a3a!important;animation:impactPulse 1.2s ease 2!important}@keyframes impactPulse{50%{box-shadow:0 0 0 16px rgba(77,139,105,0)}}
    .city.impact-city .dot{animation:cityImpact 1s ease 2;transform:scale(1.25)}@keyframes cityImpact{50%{box-shadow:0 0 0 12px rgba(77,139,105,0)}}
    .map-impact-bubble{position:absolute;z-index:12;transform:translate(-50%,-145%) scale(.92);background:#fffdf6;color:#16372f;border-radius:11px;padding:7px 10px;font-size:9px;font-weight:900;white-space:nowrap;box-shadow:0 8px 20px rgba(22,55,47,.18);opacity:0;transition:.2s}.map-impact-bubble.show{opacity:1;transform:translate(-50%,-155%) scale(1)}.map-impact-bubble.positive{border-left:4px solid #4d8b69}.map-impact-bubble.negative{border-left:4px solid #d45b4e}.map-impact-bubble.neutral{border-left:4px solid #d69a3a}

    .impact-strip{position:absolute;z-index:22;left:50%;bottom:28px;transform:translate(-50%,18px);opacity:0;display:flex;align-items:center;gap:9px;background:rgba(255,253,246,.96);border-radius:15px;padding:9px 12px;box-shadow:0 12px 30px rgba(22,55,47,.17);transition:.25s;white-space:nowrap}.impact-strip.show{opacity:1;transform:translate(-50%,0)}.impact-strip>strong{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#6f8881}.impact-strip span{font-size:9px;padding-left:9px;border-left:1px solid rgba(22,55,47,.13);color:#627a74}.impact-strip span b{font-size:10px;color:#16372f}.impact-strip .impact-place{font-weight:850;color:#4d8b69}

    @media(max-width:1100px){.impact-strip{display:none}#decision.decision-result{width:min(350px,34vw)!important}.result-effects{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:900px){#decision.decision-result{width:auto!important}.result-reaction{display:none}.result-effects{grid-template-columns:repeat(3,minmax(0,1fr))}.map-impact-bubble{display:none}}
  `;
  document.head.appendChild(style);
})();