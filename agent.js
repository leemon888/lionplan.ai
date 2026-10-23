// Course assistant in the bottom-right corner.
// Inside a claude.ai artifact it uses the `sample` capability with page tools.
// Anywhere else it falls back to local keyword matching (see localReply).
// To use your own backend, replace callModel() with a fetch to your API
// and run the same tools server-side or through function calling.
(function(){
  const App=window.App;
  const CODE_RE=/\b([A-Z]{4} \d{4})\b/g;

  const RULES=`You are the course assistant inside a Columbia course planner, a bit like a helpful shopping assistant. You help a SEAS student find classes that fit their week and their remaining requirements. The catalog is sample demo data.

Call get_schedule to see their week and which requirements are left. Call search_courses to find courses. Only recommend courses that search_courses returned, and never invent course codes, times or workload numbers.

Recommend 2 or 3 courses at most. For each, give the code exactly as written (like COMS 4995), when it meets, and one short reason. Say what requirement it counts toward and flag conflicts. When it fits, include one unusual pick the student probably wouldn't find on their own.

Only call add_course when the student clearly asks you to add a specific course. Call show_results when a full list in the main panel would help, and preview_course when the student asks how something fits.

Write plain text. No markdown, no bold, no bullet symbols, no em dashes. Keep replies under 90 words. Sound like a friendly upperclassman, not a salesperson. If the request is too vague to search, ask one short question.`;

  const TOOLS=[
    {name:'get_schedule',
     description:'Returns the student\u2019s current courses with meeting times, courses added this session, and how many courses are left in each requirement.',
     execute(){status('Checking your schedule');return App.schedule();}},
    {name:'search_courses',
     description:'Searches the catalog and returns up to 8 matching courses with meeting times, workload, what they count toward, off-the-radar notes, prereqs and conflicts. All fields are optional filters.',
     inputSchema:{type:'object',properties:{
       dept:{type:'string',description:'Department code such as COMS, MATH, ECON, STAT, URBS, HIST'},
       workload:{type:'string',enum:['low','high'],description:'low is 5 hrs/week or less, high is 8 or more'},
       counts:{type:'string',enum:['tech','nontech','math'],description:'Requirement the course must count toward'},
       topics:{type:'array',items:{type:'string'},description:'Short topic words like cities, music, finance'},
       no_fridays:{type:'boolean'},
       meets_on:{type:'string',enum:['M','T','W','R','F'],description:'Course must meet on this day (R is Thursday)'},
       start_after:{type:'string',description:'24h time HH:MM, every meeting starts at or after this'},
       end_by:{type:'string',description:'24h time HH:MM, every meeting ends by this'},
       off_the_radar:{type:'boolean',description:'Only rotating-topic, grad, new, cross-listed or small classes'},
       small:{type:'boolean',description:'20 seats or fewer'}
     }},
     execute(input){status('Searching courses');return App.search(input,8);}},
    {name:'add_course',
     description:'Adds a course to the student\u2019s calendar by code, like "COMS 4995". Fails if it conflicts. Only use when the student asks.',
     inputSchema:{type:'object',properties:{code:{type:'string'}},required:['code']},
     execute(input){status('Adding to your calendar');const r=App.add(String(input.code||''));if(!r.ok) throw new Error(r.message);return r;}},
    {name:'preview_course',
     description:'Shows a course as a dashed preview on the student\u2019s calendar. Returns any conflict.',
     inputSchema:{type:'object',properties:{code:{type:'string'}},required:['code']},
     execute(input){const r=App.preview(String(input.code||''));if(!r.ok) throw new Error(r.message);return r;}},
    {name:'show_results',
     description:'Puts a plain-English query like "light nontech, no Fridays" into the main search box so the full list shows in the results panel.',
     inputSchema:{type:'object',properties:{query:{type:'string'}},required:['query']},
     execute(input){return App.applyQuery(String(input.query||''));}},
  ];

  /* UI */
  const root=document.createElement('div');
  root.className='agent';
  root.innerHTML=`
    <section class="panel" id="agentPanel" hidden aria-label="Course assistant">
      <div class="phead">
        <div><h2>Course assistant</h2><p>Tell me what kind of week you want.</p></div>
        <button class="iconbtn" id="agentClose" aria-label="Close assistant">×</button>
      </div>
      <div class="msgs" id="agentMsgs" aria-live="polite"></div>
      <div class="suggest" id="agentSuggest">
        <button>Find me a light tech elective</button>
        <button>Something weird for my nontech</button>
        <button>What fits Friday afternoon?</button>
      </div>
      <div class="compose">
        <textarea id="agentInput" rows="1" placeholder="Ask about classes" aria-label="Message"></textarea>
        <button class="btn primary" id="agentSend">Send</button>
      </div>
      <div class="mode" id="agentMode">Offline mode: simple keyword matching.</div>
    </section>
    <button class="fab" id="agentFab" aria-expanded="false" aria-controls="agentPanel">Ask for help</button>`;
  document.body.appendChild(root);

  const $=id=>document.getElementById(id);
  const panel=$('agentPanel'),msgs=$('agentMsgs'),input=$('agentInput'),sendBtn=$('agentSend'),fab=$('agentFab');
  let sample=null,busy=false,ctl=null,statusEl=null;
  const turns=[];

  function toggle(open){
    panel.hidden=!open; fab.setAttribute('aria-expanded',String(open));
    fab.textContent=open?'Close':'Ask for help';
    if(open){ if(!msgs.childElementCount) greet(); input.focus(); } else App.clearPreview();
  }
  fab.addEventListener('click',()=>toggle(panel.hidden));
  $('agentClose').addEventListener('click',()=>toggle(false));
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!panel.hidden&&!document.querySelector('dialog[open]')) toggle(false); });

  function greet(){
    addMsg('a','Hi. I can find classes that fit your open blocks and count toward what you still need. Tap a course code in my replies to preview it on your calendar.');
  }
  function addMsg(role,text){
    const el=document.createElement('div'); el.className='msg '+role;
    setText(el,text); msgs.appendChild(el); msgs.scrollTop=msgs.scrollHeight; return el;
  }
  function setText(el,text){
    el.textContent='';
    if(!el.classList.contains('a')){ el.textContent=text; return; }
    let last=0; text=String(text||'');
    for(const m of text.matchAll(CODE_RE)){
      if(!App.isKnownCode(m[1])) continue;
      el.appendChild(document.createTextNode(text.slice(last,m.index)));
      const b=document.createElement('button'); b.className='cref'; b.textContent=m[1];
      b.title='Preview '+m[1]+' on your calendar';
      b.addEventListener('click',()=>App.preview(m[1]));
      el.appendChild(b); last=m.index+m[0].length;
    }
    el.appendChild(document.createTextNode(text.slice(last)));
    msgs.scrollTop=msgs.scrollHeight;
  }
  function status(text){
    if(!statusEl){ statusEl=document.createElement('div'); statusEl.className='msg s'; msgs.appendChild(statusEl); }
    statusEl.textContent=text+'…'; msgs.scrollTop=msgs.scrollHeight;
  }
  function clearStatus(){ if(statusEl){statusEl.remove();statusEl=null;} }
  function setBusy(b){
    busy=b; sendBtn.textContent=b&&sample?'Stop':'Send';
    sendBtn.classList.toggle('primary',!b||!sample);
  }

  $('agentSuggest').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>send(b.textContent)));
  sendBtn.addEventListener('click',()=>{ if(busy&&ctl){ctl.abort();return;} send(input.value); });
  input.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); if(!busy) send(input.value);} });
  input.addEventListener('input',()=>{input.style.height='40px';input.style.height=Math.min(120,input.scrollHeight)+'px';});

  async function send(text){
    text=String(text||'').trim(); if(busy||!text) return;
    input.value=''; input.style.height='40px';
    $('agentSuggest').hidden=true;
    addMsg('u',text); turns.push({role:'user',content:text});
    setBusy(true);
    let bubble=null,reply='';
    try{
      if(sample){
        status('Thinking');
        reply=await callModel(t=>{ clearStatus(); if(!bubble) bubble=addMsg('a',''); setText(bubble,t); });
      } else {
        reply=localReply(text);
      }
    }catch(e){
      const code=e&&e.code;
      if(code==='cancelled'){ reply=(e.text||'').trim()||'Stopped.'; }
      else if(code==='rate_limited'||code==='queue_overflow'){ reply='Too many requests right now. Wait a minute and try again.'; }
      else { if(['not_granted','sampling_disabled','capability_disabled','capability_removed','not_declared','tools_unavailable'].includes(code)) setOffline(); reply=localReply(text); }
    }
    clearStatus();
    if(!bubble) bubble=addMsg('a','');
    setText(bubble,reply);
    turns.push({role:'assistant',content:reply});
    setBusy(false); ctl=null;
  }

  // Swap this out to use your own backend.
  async function callModel(onText){
    ctl=new AbortController();
    const history=turns.slice(-12);
    const inputTurns=[{role:'user',content:RULES},{role:'assistant',content:'Understood. I\u2019ll use the tools and keep it short.'},...history];
    const r=await sample(inputTurns,{cache:false,modelTier:'quick',signal:ctl.signal,tools:TOOLS,onText:({text})=>onText(text)});
    return r.text;
  }

  /* offline fallback */
  function localReply(text){
    const add=text.match(/\badd\s+([a-z]{4})\s*(\d{4})/i);
    if(add){ const r=App.add(add[1]+' '+add[2]); return r.ok?r.message+' It\u2019s on your calendar now.':r.message; }
    if(/\b(left|requirements?|need|missing|schedule)\b/i.test(text)&&!/\bclass|course|elective\b/i.test(text)){
      const s=App.schedule();
      return 'Still needed: '+Object.entries(s.requirements_left).map(([k,v])=>k.toLowerCase()+' '+v).join(', ')+'. Ask me for something that fills one of those.';
    }
    const res=App.searchText(text,12).filter(c=>!c.conflicts_with).slice(0,3);
    if(!res.length) return 'Nothing matched all of that. Try dropping one constraint, like the day or the workload.';
    const lines=res.map(c=>{
      const wl=c.workload_hrs_per_week!=null?c.workload_hrs_per_week+' hrs/week':'no workload data yet';
      const odd=c.off_the_radar.length?' '+c.off_the_radar[0]+'.':'';
      return c.code+' '+c.title+', '+c.meets+'. '+wl+'. '+c.counts_toward+'.'+odd;
    });
    return 'A few that fit:\n\n'+lines.join('\n\n')+'\n\nSay \u201cadd '+res[0].code+'\u201d and I\u2019ll put it on your calendar.';
  }

  function setOffline(){ sample=null; $('agentMode').textContent='Offline mode: simple keyword matching.'; }
  if(window.claude&&typeof window.claude.use==='function'){
    window.claude.use('sample').then(s=>{
      if(s){ sample=s; $('agentMode').textContent='Uses your Claude account. Course data is sample data.'; }
    }).catch(()=>{});
  }
})();
