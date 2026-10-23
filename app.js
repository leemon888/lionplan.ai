const DAYS=['M','T','W','R','F'];
const DAYNAME={M:'Mon',T:'Tue',W:'Wed',R:'Thu',F:'Fri'};
const START=8*60, END=22*60, HH=40;
const tm=s=>{const[a,b]=s.split(':').map(Number);return a*60+b};
const fmt=m=>{const h=Math.floor(m/60),mm=m%60,h12=((h+11)%12)+1;return h12+(mm?':'+String(mm).padStart(2,'0'):'')+(h<12?'am':'pm')};
const range=(s,e)=>fmt(s)+'–'+fmt(e);

const SYN=[
 ['city','cities','urban','nyc','new york','transit','subway','housing','architecture','maps','mapping','neighborhood'],
 ['music','audio','sound','electronic'],
 ['ai','ml','machine','learning','algorithms','intelligence'],
 ['finance','money','banking','trading','markets','economics'],
 ['policy','civic','voting','elections','government','society','ethics'],
 ['games','game','play','puzzles'],
 ['food','cooking','cuisine'],
 ['space','astronomy','stars','telescopes','physics'],
 ['climate','environment','sustainability'],
 ['language','linguistics','brain','cognitive'],
 ['art','design','creative','performance','theater'],
];
const STOP=new Set('something some about class classes course courses a an the in on with and or for i want me that is im of to like related any maybe please load elective electives give find show rec recommend good interesting-ish fun new take need also but not what which fits fit my have can you are there should could would get thing things one ones week semester spring options'.split(' '));

const state={parsed:{topics:[]},gap:null,bucket:null,added:[],pin:null};
const $=id=>document.getElementById(id);
const q=$('q');

/* parsing */
function parse(text){
  const f={topics:[]};
  let s=' '+text.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9\- ]/g,' ')+' ';
  const take=(re,fn)=>{const m=s.match(re);if(m){fn(m[0].trim());s=s.replace(re,' ');}};
  take(/\bno (fridays?|fri)\b/,p=>f.noFri={p});
  const DAYRE={M:'mondays?',T:'tuesdays?',W:'wednesdays?',R:'thursdays?',F:'fridays?'};
  for(const [d,r] of Object.entries(DAYRE)){ if(f.onDay) break; take(new RegExp('\\b(on )?'+r+'\\b'),p=>f.onDay={v:d,p}); }
  take(/\bno (mornings?|morning classes|early classes)\b/,p=>f.minStart={v:660,p,label:'Starts after 11am'});
  take(/\bno (evenings?|nights?|night classes)\b/,p=>f.maxEnd={v:1080,p,label:'Ends by 6pm'});
  if(!f.minStart) take(/\b(evenings?|nights?)\b/,p=>f.minStart={v:1080,p,label:'Evenings'});
  if(!f.minStart) take(/\bafternoons?\b/,p=>{f.minStart={v:720,p,label:'Afternoons'};f.maxEnd={v:1080,p:null,label:null};});
  take(/\b(light|easy|chill|low workload|not much work|lighter)\b/,p=>f.wl={v:'low',p});
  if(!f.wl) take(/\b(heavy|hard|challenging|rigorous)\b/,p=>f.wl={v:'high',p});
  take(/\b(non-?tech|nontechnical|humanities)\b/,p=>f.counts={v:'nontech',p});
  if(!f.counts) take(/\b(tech(nical)? electives?)\b/,p=>f.counts={v:'tech',p});
  if(!f.counts) take(/\b(math minor|minor)\b/,p=>f.counts={v:'math',p});
  take(/\b(niche|weird|hidden|unusual|off the radar|obscure|offbeat|interesting)\b/,p=>f.hidden={p});
  take(/\b(seminars?|small class(es)?|small)\b/,p=>f.small={p});
  take(/\b(computer science|cs|coms)\b/,p=>f.dept={v:'COMS',p});
  if(!f.dept) take(/\b(econ|economics)\b/,p=>f.dept={v:'ECON',p});
  if(!f.dept) take(/\b(stats?|statistics)\b/,p=>f.dept={v:'STAT',p});
  if(!f.dept && !f.counts) take(/\bmath\b/,p=>f.dept={v:'MATH',p});
  s.split(/\s+/).filter(w=>w.length>=2&&!STOP.has(w)&&!/^\d+$/.test(w)).forEach(w=>{
    if(!f.topics.includes(w)) f.topics.push(w);
  });
  return f;
}
const expand=w=>{const g=SYN.find(g=>g.includes(w));return g?g:[w]};
const wordRe=w=>new RegExp('\\b'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');

/* helpers */
const isHidden=c=>!!(c.f.topics||c.f.grad||c.f.newt||c.f.cross||c.f.size<=20);
const meetings=c=>c.mtg.flatMap(m=>[...m.d].map(d=>({d,s:tm(m.s),e:tm(m.e)})));
const schedule=()=>[...CURRENT,...state.added.map(code=>COURSES.find(c=>c.code===code))];
function conflictWith(c){
  for(const o of schedule()){
    if(o.code===c.code) continue;
    for(const a of meetings(c)) for(const b of meetings(o))
      if(a.d===b.d && a.s<b.e && b.s<a.e) return o.code;
  }
  return null;
}
function remaining(key){
  const b=BUCKETS.find(b=>b.key===key);
  const used=state.added.map(code=>COURSES.find(c=>c.code===code)).filter(c=>c.counts.includes(key)).length;
  return Math.max(0,b.need-used);
}
function filters(){
  const p=state.parsed;
  return {...p,counts:p.counts||(state.bucket?{v:state.bucket,p:null,fromBucket:true}:null),gap:state.gap};
}
function topicScore(c,topics){
  const hay=(c.tags+' '+c.title).toLowerCase();
  const hits=[];
  topics.forEach(t=>{ if(expand(t).some(w=>wordRe(w).test(hay))) hits.push(t); });
  return hits;
}
function passes(c,f,{skipDept=false,skipTopics=false}={}){
  const ms=meetings(c);
  if(f.dept&&!skipDept&&c.dept!==f.dept.v) return false;
  if(f.wl){ if(c.wl==null) return false; if(f.wl.v==='low'&&c.wl>5) return false; if(f.wl.v==='high'&&c.wl<8) return false; }
  if(f.counts&&!c.counts.includes(f.counts.v)) return false;
  if(f.noFri&&ms.some(m=>m.d==='F')) return false;
  if(f.onDay&&!ms.some(m=>m.d===f.onDay.v)) return false;
  if(f.minStart&&ms.some(m=>m.s<f.minStart.v)) return false;
  if(f.maxEnd&&ms.some(m=>m.e>f.maxEnd.v)) return false;
  if(f.hidden&&!isHidden(c)) return false;
  if(f.small&&c.f.size>20) return false;
  if(f.gap&&!ms.some(m=>m.d===f.gap.d&&m.s>=f.gap.s&&m.e<=f.gap.e)) return false;
  if(f.topics.length&&!skipTopics&&!topicScore(c,f.topics).length) return false;
  return true;
}
function score(c,f){
  let s=0;
  s+=topicScore(c,f.topics).length*3;
  if(isHidden(c)) s+=f.hidden?2:1;
  if(c.counts.some(k=>remaining(k)>0)) s+=2;
  if(f.wl&&f.wl.v==='low'&&c.wl!=null) s+=(6-c.wl)/2;
  return s;
}
function radarTags(c){
  const t=[];
  if(c.f.topics) t.push('Rotating topic');
  if(c.f.grad) t.push('Grad course open to undergrads');
  if(c.f.newt) t.push('New this term');
  if(c.f.cross) t.push('Cross-listed with Barnard');
  if(c.f.size<=20) t.push('Small class, '+c.f.size+' seats');
  return t;
}
function countText(c){
  if(!c.counts.length) return 'General elective credit';
  return c.counts.map(k=>{
    const r=remaining(k);
    if(r===0) return 'Counts as '+COUNTNAME[k]+' (already done)';
    if(r===1) return 'Counts as your last '+COUNTNAME[k];
    return 'Counts toward '+BUCKETS.find(b=>b.key===k).name.toLowerCase()+' ('+r+' left)';
  }).join('; ');
}
function whyText(c,f){
  const parts=[];
  const hits=topicScore(c,f.topics);
  if(hits.length) parts.push('Matches “'+hits.join('”, “')+'”');
  parts.push(c.wl!=null?c.wl+' hrs/week outside class, from '+c.n+' ratings':'No workload data yet');
  return parts.join('. ')+'.';
}
function mtgText(c){
  return c.mtg.map(m=>[...m.d].map(d=>DAYNAME[d]).join('/')+' '+range(tm(m.s),tm(m.e))).join(', ');
}

/* calendar */
function buildCal(){
  $('calhead').innerHTML='<div></div>'+DAYS.map(d=>'<div>'+DAYNAME[d]+'</div>').join('');
  let h='<div class="times">';
  for(let m=START+60;m<END;m+=60) h+='<span style="top:'+((m-START)/60*HH)+'px">'+fmt(m)+'</span>';
  h+='</div>'+DAYS.map(d=>'<div class="day" data-d="'+d+'"></div>').join('');
  $('calbody').innerHTML=h;
  $('calbody').querySelectorAll('.day').forEach(el=>el.addEventListener('click',onDayClick));
}
const pos=(s,e)=>'top:'+((s-START)/60*HH)+'px;height:'+Math.max(18,(e-s)/60*HH-2)+'px';
function renderCal(ghost){
  ghost=ghost||state.pin;
  document.querySelectorAll('.day').forEach(el=>{
    const d=el.dataset.d; let h='';
    if(state.gap&&state.gap.d===d) h+='<div class="gapmark" style="'+pos(state.gap.s,state.gap.e)+'"></div>';
    CURRENT.forEach(c=>meetings(c).filter(m=>m.d===d).forEach(m=>{
      h+='<div class="blk cur" style="'+pos(m.s,m.e)+'"><b>'+c.code+'</b>'+c.title+'</div>';
    }));
    state.added.forEach(code=>{const c=COURSES.find(x=>x.code===code);
      meetings(c).filter(m=>m.d===d).forEach(m=>{
        h+='<div class="blk add" style="'+pos(m.s,m.e)+'"><button class="x" data-rm="'+c.code+'" aria-label="Remove '+c.code+'">×</button><b>'+c.code+'</b>'+c.title+'</div>';
      });
    });
    if(ghost){ const bad=conflictWith(ghost);
      meetings(ghost).filter(m=>m.d===d).forEach(m=>{
        h+='<div class="blk ghost'+(bad?' bad':'')+'" style="'+pos(m.s,m.e)+'"><b>'+ghost.code+'</b>'+(bad?'Conflicts with '+bad:ghost.title)+'</div>';
      });
    }
    el.innerHTML=h;
  });
  document.querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation(); state.added=state.added.filter(x=>x!==b.dataset.rm); render();
  }));
  document.querySelectorAll('.blk').forEach(b=>b.addEventListener('click',e=>e.stopPropagation()));
}
function onDayClick(e){
  const d=e.currentTarget.dataset.d;
  const y=e.clientY-e.currentTarget.getBoundingClientRect().top;
  const m=START+y/HH*60;
  const busy=schedule().flatMap(meetings).filter(x=>x.d===d);
  if(busy.some(x=>m>=x.s&&m<x.e)) return;
  const s=Math.max(START,...busy.filter(x=>x.e<=m).map(x=>x.e));
  const en=Math.min(END,...busy.filter(x=>x.s>=m).map(x=>x.s));
  if(state.gap&&state.gap.d===d&&state.gap.s===s&&state.gap.e===en) state.gap=null;
  else state.gap={d,s,e:en};
  render();
}

/* chips */
function removePhrase(p){
  if(!p) return;
  const re=new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'[\\s,]+'),'i');
  q.value=q.value.replace(re,'').replace(/\s*,\s*,/g,',').replace(/^[\s,]+|[\s,]+$/g,'').replace(/\s{2,}/g,' ');
  state.parsed=parse(q.value);
}
function renderChips(f){
  const chips=[];
  if(f.dept) chips.push({l:f.dept.v+' only',rm:()=>removePhrase(f.dept.p)});
  if(f.wl) chips.push({l:f.wl.v==='low'?'Light workload, 5 hrs/week or less':'Heavy workload, 8+ hrs/week',rm:()=>removePhrase(f.wl.p)});
  if(f.counts) chips.push({l:'Counts as '+COUNTNAME[f.counts.v],rm:()=>{ if(f.counts.fromBucket) state.bucket=null; else removePhrase(f.counts.p); }});
  if(f.noFri) chips.push({l:'No Fridays',rm:()=>removePhrase(f.noFri.p)});
  if(f.onDay) chips.push({l:'Meets on '+DAYNAME[f.onDay.v],rm:()=>removePhrase(f.onDay.p)});
  if(f.minStart) chips.push({l:f.minStart.label,rm:()=>removePhrase(f.minStart.p)});
  if(f.maxEnd&&f.maxEnd.label) chips.push({l:f.maxEnd.label,rm:()=>removePhrase(f.maxEnd.p)});
  if(f.hidden) chips.push({l:'Off the radar',rm:()=>removePhrase(f.hidden.p)});
  if(f.small) chips.push({l:'Small classes',rm:()=>removePhrase(f.small.p)});
  f.topics.forEach(t=>chips.push({l:'About “'+t+'”',rm:()=>removePhrase(t)}));
  if(f.gap) chips.push({l:'Fits '+DAYNAME[f.gap.d]+' '+range(f.gap.s,f.gap.e),rm:()=>{state.gap=null}});
  const el=$('chips'); el.innerHTML='';
  chips.forEach(c=>{
    const s=document.createElement('span'); s.className='chip'; s.textContent=c.l;
    const b=document.createElement('button'); b.textContent='×'; b.setAttribute('aria-label','Remove filter: '+c.l);
    b.addEventListener('click',()=>{c.rm();render();}); s.appendChild(b); el.appendChild(s);
  });
}

/* buckets */
function renderBuckets(f){
  $('buckets').innerHTML=BUCKETS.map(b=>{
    const r=remaining(b.key);
    return '<button class="bucket" data-k="'+b.key+'" aria-pressed="'+(f.counts&&f.counts.v===b.key)+'"><span class="n">'+(r?r+' left':'Done')+'</span><span class="l">'+b.name+'</span></button>';
  }).join('');
  document.querySelectorAll('.bucket').forEach(b=>b.addEventListener('click',()=>{
    const k=b.dataset.k;
    if(state.parsed.counts){ removePhrase(state.parsed.counts.p); }
    state.bucket=state.bucket===k?null:k; render();
  }));
}

/* results */
function renderList(f){
  const pool=COURSES.filter(c=>!state.added.includes(c.code));
  let ok=[],bad=[];
  pool.forEach(c=>{
    if(!passes(c,f)) return;
    (conflictWith(c)?bad:ok).push(c);
  });
  ok.sort((a,b)=>score(b,f)-score(a,f));
  let extra=[];
  if(f.dept&&!f.counts&&ok.length&&remaining('nontech')>0){
    extra=pool.filter(c=>c.dept!==f.dept.v&&isHidden(c)&&c.counts.includes('nontech')&&!conflictWith(c)&&passes(c,f,{skipDept:true,skipTopics:true}))
      .sort((a,b)=>score(b,f)-score(a,f)).slice(0,2);
  }
  const anyFilter=f.dept||f.wl||f.counts||f.noFri||f.onDay||f.minStart||f.hidden||f.small||f.topics.length||f.gap;
  $('count').textContent=(anyFilter?'':'Everything that fits. ')+
    ok.length+(ok.length===1?' match':' matches')+(extra.length?', plus '+extra.length+' from outside '+f.dept.v:'')+(bad.length?'. '+bad.length+' more conflict with your schedule.':'.');
  const list=$('list'); list.innerHTML='';
  if(!ok.length&&!bad.length){
    list.innerHTML='<div class="empty">Nothing matches all of these filters. Remove a filter above, or click a different open spot on the calendar.</div>';
    return;
  }
  [...ok.map(c=>[c,false]),...extra.map(c=>[c,true]),...bad.map(c=>[c,'bad'])].forEach(([c,mode])=>list.appendChild(card(c,f,mode)));
}
function card(c,f,mode){
  const el=document.createElement('div');
  el.className='card'+(mode==='bad'?' bad':''); el.tabIndex=0;
  const conflict=conflictWith(c);
  const radar=radarTags(c);
  const perm=c.prereq&&/permission/i.test(c.prereq);
  el.innerHTML=
    (mode===true?'<div class="outside">Outside '+f.dept.v+', but it’s light and counts as nontech</div>':'')+
    '<div class="row"><div><span class="code">'+c.code+'</span> <span class="title">'+c.title+'</span></div><span class="pts">'+c.pts+' pts</span></div>'+
    '<div class="meta">'+mtgText(c)+'</div>'+
    '<div class="why">'+whyText(c,f)+'</div>'+
    '<div class="tags"><span class="tag c">'+countText(c)+'</span>'+radar.map(t=>'<span class="tag r">'+t+'</span>').join('')+
      (conflict?'<span class="tag bad">Conflicts with '+conflict+'</span>':'')+'</div>'+
    (c.prereq?'<div class="prereq">Needs '+c.prereq+'</div>':'')+
    '<div class="actions"><button class="btn primary" data-a="add"'+(conflict?' disabled':'')+'>Add to schedule</button>'+
      (perm?'<button class="btn" data-a="email">Draft email to instructor</button>':'')+'</div>';
  const show=()=>renderCal(c), hide=()=>renderCal(null);
  el.addEventListener('mouseenter',show); el.addEventListener('mouseleave',hide);
  el.addEventListener('focusin',show); el.addEventListener('focusout',hide);
  el.querySelector('[data-a="add"]').addEventListener('click',()=>{state.added.push(c.code);render();});
  const em=el.querySelector('[data-a="email"]'); if(em) em.addEventListener('click',()=>openEmail(c));
  return el;
}

/* email */
function openEmail(c){
  $('dlgtitle').textContent='Email about '+c.code;
  $('dlgtext').value=
`Hi Professor [name],

I’m a [year] in [major], and I’m interested in taking ${c.code}: ${c.title} this spring. The listing says it needs ${c.prereq.replace(/^Instructor permission$/,'instructor permission')}. I have [relevant course or experience], and I’d be happy to review anything you think I should know before the first class.

Would you be open to me enrolling?

Thanks,
[Your name]`;
  $('dlgcopy').textContent='Copy email';
  $('dlg').showModal();
}
$('dlgclose').addEventListener('click',()=>$('dlg').close());
$('dlgcopy').addEventListener('click',async()=>{
  const t=$('dlgtext');
  try{ await navigator.clipboard.writeText(t.value); $('dlgcopy').textContent='Copied'; }
  catch(e){ t.select(); try{document.execCommand('copy'); $('dlgcopy').textContent='Copied';}catch(_){ $('dlgcopy').textContent='Select and copy'; } }
});

/* wire up */
function render(){
  const f=filters();
  renderChips(f); renderBuckets(f); renderList(f); renderCal(null);
}
let timer;
q.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{state.parsed=parse(q.value);render();},150);});
document.querySelectorAll('.ex').forEach(b=>b.addEventListener('click',()=>{
  q.value=b.textContent; state.bucket=null; state.parsed=parse(q.value); render(); q.focus();
}));

/* API used by the agent (agent.js) */
const validTime=s=>typeof s==='string'&&/^\d{1,2}:\d{2}$/.test(s);
function fromArgs(a){
  a=a||{}; const f={topics:[]};
  if(a.dept) f.dept={v:String(a.dept).toUpperCase().trim()};
  if(a.workload==='low'||a.workload==='high') f.wl={v:a.workload};
  if(['tech','nontech','math'].includes(a.counts)) f.counts={v:a.counts};
  if(a.no_fridays) f.noFri={};
  if(['M','T','W','R','F'].includes(a.meets_on)) f.onDay={v:a.meets_on};
  if(validTime(a.start_after)) f.minStart={v:tm(a.start_after)};
  if(validTime(a.end_by)) f.maxEnd={v:tm(a.end_by)};
  if(a.off_the_radar) f.hidden={};
  if(a.small) f.small={};
  if(Array.isArray(a.topics)) f.topics=a.topics.flatMap(t=>String(t).toLowerCase().split(/\s+/)).filter(w=>w.length>=2&&!STOP.has(w));
  return f;
}
function summary(c){
  return {code:c.code,title:c.title,meets:mtgText(c),
    workload_hrs_per_week:c.wl,ratings:c.n,counts_toward:countText(c),
    off_the_radar:radarTags(c),prereq:c.prereq||null,conflicts_with:conflictWith(c)};
}
function searchFilters(f,limit=8){
  const pool=COURSES.filter(c=>!state.added.includes(c.code)&&passes(c,f));
  pool.sort((a,b)=>((conflictWith(a)?1:0)-(conflictWith(b)?1:0))||(score(b,f)-score(a,f)));
  return pool.slice(0,limit);
}
const findCourse=code=>{
  const k=String(code||'').toUpperCase().replace(/\s+/g,'').replace(/^([A-Z]{4})(\d{4})$/,'$1 $2');
  return COURSES.find(c=>c.code===k);
};
window.App={
  parse,
  search(args,limit){return searchFilters(fromArgs(args),limit).map(summary);},
  searchText(text,limit){return searchFilters(parse(text),limit).map(summary);},
  schedule(){
    return {
      current:CURRENT.map(c=>({code:c.code,title:c.title,meets:mtgText(c)})),
      added_this_session:state.added.map(code=>{const c=findCourse(code);return {code:c.code,title:c.title,meets:mtgText(c)};}),
      requirements_left:Object.fromEntries(BUCKETS.map(b=>[b.name,remaining(b.key)])),
    };
  },
  add(code){
    const c=findCourse(code);
    if(!c) return {ok:false,message:'No course with code '+code+' in this catalog.'};
    if(state.added.includes(c.code)) return {ok:true,message:c.code+' is already on the schedule.'};
    const bad=conflictWith(c);
    if(bad) return {ok:false,message:c.code+' conflicts with '+bad+'.'};
    state.added.push(c.code); if(state.pin&&state.pin.code===c.code) state.pin=null; render();
    return {ok:true,message:'Added '+c.code+' '+c.title+'.'};
  },
  preview(code){
    const c=findCourse(code); if(!c) return {ok:false,message:'Unknown course '+code};
    state.pin=(state.pin&&state.pin.code===c.code)?null:c; renderCal(null);
    return {ok:true,previewing:state.pin?c.code:null,conflicts_with:conflictWith(c)};
  },
  clearPreview(){state.pin=null;renderCal(null);},
  applyQuery(text){q.value=String(text||'');state.parsed=parse(q.value);render();return {ok:true};},
  isKnownCode(code){return !!findCourse(code);},
};

buildCal();
q.value='light CS elective';
state.parsed=parse(q.value);
render();
