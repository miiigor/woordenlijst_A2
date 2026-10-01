'use strict';
const $=s=>document.querySelector(s),S=window.SRS,NEW=20,DIRS=['nl-ru','ru-nl'];
let db,words=[],vocab=null,prog={},dir='nl-ru',queue=[],cur=null,vv=0,lx=null,view='study',hintShown=false,busy=false,sortK='dutch',sortD=1,fil='all';
const z0=()=>({n:0,known:0,unk:0,hint:0}),sess={'nl-ru':z0(),'ru-nl':z0()};
const idb=()=>new Promise((ok,er)=>{const r=indexedDB.open('nl-a2',1);r.onupgradeneeded=()=>{const d=r.result;
 d.createObjectStore('words',{keyPath:'id'});d.createObjectStore('progress',{keyPath:'key'});d.createObjectStore('meta',{keyPath:'k'});};
 r.onsuccess=()=>ok(r.result);r.onerror=()=>er(r.error);});
const fin=t=>new Promise((ok,er)=>{t.oncomplete=ok;t.onerror=t.onabort=()=>er(t.error);});
const all=s=>new Promise(ok=>{const q=db.transaction(s).objectStore(s).getAll();q.onsuccess=()=>ok(q.result);});
function put(store,items){const t=db.transaction(store,'readwrite');items.forEach(i=>t.objectStore(store).put(i));return fin(t);}
const pct=(a,b)=>b?Math.round(100*a/b)+'%':'–',isNR=()=>dir==='nl-ru';
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function setTxt(el,main,en){el.textContent=main;if(en){const i=document.createElement('i');i.textContent=' ('+en+')';el.append(i);}}
const showQ=w=>isNR()?setTxt($('#q'),w.dutch):setTxt($('#q'),w.russian_reviewed,w.english);
const showA=w=>isNR()?setTxt($('#a'),w.russian_reviewed,w.english):setTxt($('#a'),w.dutch);
function acts(rows){const f=$('#acts');f.innerHTML='';rows.forEach(r=>{const d=document.createElement('div');d.className='ar';
 r.forEach(([t,fn,c])=>{const b=document.createElement('button');b.textContent=t;b.className=c||'';b.onclick=fn;d.append(b);});f.append(d);});}
// ---- statistics: Known + Unknown = Done; Hints = cards where options were opened
function totals(){const z=z0();for(const k in prog)if(k.startsWith(dir+':')){const p=prog[k];z.n+=p.reps;z.known+=p.correct+p.hinted;z.unk+=p.wrong;z.hint+=p.hintUsed===undefined?p.hinted:p.hintUsed;}return z;}
function row(t,z,extra){const n=z.n,c=(l,v)=>`<span>${l} <b>${v}</b> <small>${pct(v,n)}</small></span>`;
 return `<div class="r"><em>${t}</em><span>Done <b>${n}</b></span>${c('Known',z.known)}${c('Hints',z.hint)}${c('Unknown',z.unk)}${extra||''}</div>`;}
function stats(){$('#stats').innerHTML=row('Session',sess[dir],`<span>To Do <b>${new Set(queue.map(w=>w.id)).size}</b></span>`)+row('All time',totals());
 DIRS.forEach((d,i)=>$('#d'+(i+1)).classList.toggle('on',d===dir));}
// ---- study
function show(){cur=queue[0];hintShown=busy=false;$('#a').hidden=$('#fb').hidden=true;$('#opts').innerHTML='';
 if(!words.length){$('#q').textContent='Vocabulary not loaded. Open the app once with internet.';acts([]);return stats();}
 if(!cur){$('#q').textContent='All caught up for now';acts([]);return stats();}
 showQ(cur);acts([[['Show options',hints,'ghost']],[['I know',()=>finish('correct'),'good'],["I don't know",()=>finish('wrong'),'bad']]]);stats();}
function hints(){hintShown=true;const o=$('#opts');
 S.makeOptions(cur,words,dir).forEach(x=>{const b=document.createElement('button');b.textContent=x.text;
  b.onclick=()=>{if(busy)return;b.classList.add(x.ok?'good':'bad');finish(x.ok?'hint':'wrong');};o.append(b);});
 acts([[["I don't know",()=>finish('wrong'),'bad']]]);}
async function finish(res){if(busy)return;busy=true;const w=cur,k=S.key(dir,w.id),used=hintShown;
 const s=S.schedule(prog[k]||S.blank(k),res,Date.now(),used);prog[k]=s;await put('progress',[s]);
 const z=sess[dir];z.n++;res==='wrong'?z.unk++:z.known++;if(used)z.hint++;
 showA(w);$('#a').hidden=false;const fb=$('#fb');fb.hidden=false;
 fb.textContent=res==='wrong'?'Unknown':res==='hint'?'Known · with a hint':'Known';fb.className=res==='wrong'?'bad':'good';
 queue.shift();if(res==='wrong')queue.splice(Math.min(4,queue.length),0,w);
 acts([[['Next',show,'good']]]);stats();}
// ---- words list
const P=v=>v===null?'–':Math.round(v*100)+'%',fd=t=>new Date(t).toLocaleDateString(undefined,{day:'numeric',month:'short'});
const ivl=i=>i<1?Math.round(i*1440)+' min':Math.round(i)+' d';
function data(){return words.filter(w=>!w.excluded).map(w=>{const p=prog[S.key(dir,w.id)],n=p?p.reps:0,hu=p?(p.hintUsed===undefined?p.hinted:p.hintUsed):0;
 return{id:w.id,dutch:w.dutch,russian:w.russian_reviewed,english:w.english||'',n,known:n?(p.correct+p.hinted)/n:null,hint:n?hu/n:null,unk:n?p.wrong/n:null,p};});}
const det=x=>x.p?`Next: ${x.p.due<=Date.now()?'now':fd(x.p.due)} · Interval: ${ivl(x.p.interval)} · Last: ${fd(x.p.last)}`:'Not studied yet';
function renderWords(){const q=$('#flt').value.trim().toLowerCase();
 const F={all:()=>1,seen:x=>x.n>0,new:x=>x.n===0,prob:x=>x.n>0&&x.unk>=.5};
 const r=data().filter(F[fil]).filter(x=>!q||(x.dutch+' '+x.russian+' '+x.english).toLowerCase().includes(q));
 r.sort((x,y)=>{const a=x[sortK],b=y[sortK];if(a===null||b===null)return(a===null)-(b===null);return(typeof a==='string'?a.localeCompare(b):a-b)*sortD;});
 $('#wsum').innerHTML=row(isNR()?'NL → RU':'RU → NL',totals());
 $('#chips').innerHTML=[['all','All'],['seen','Seen'],['new','New'],['prob','Problem']].map(([k,t])=>`<button data-f="${k}" class="${k===fil?'on':''}">${t}</button>`).join('');
 $('#srt').value=sortK;$('#dirb').textContent=sortD>0?'↑ A→Z':'↓ Z→A';
 const ar=k=>k===sortK?(sortD>0?' ▲':' ▼'):'';
 $('#list').innerHTML=`<div class="lh"><div data-k="dutch">Word${ar('dutch')}</div><div data-k="n">Done${ar('n')}</div><div data-k="known">Known${ar('known')}</div><div data-k="hint">Hints${ar('hint')}</div><div data-k="unk">Unknown${ar('unk')}</div></div>`+
  r.map(x=>`<div class="it"><div class="w"><b>${esc(x.dutch)}</b><span>${esc(x.russian)}</span><i>${esc(x.english)}</i></div><div class="n">${x.n}</div><div class="n">${P(x.known)}</div><div class="n">${P(x.hint)}</div><div class="n${x.unk>=.5?' hi':''}">${P(x.unk)}</div><div class="det">${det(x)}</div></div>`).join('');}
$('#list').onclick=e=>{const h=e.target.closest('.lh>div'),it=e.target.closest('.it');
 if(h){const k=h.dataset.k;sortD=k===sortK?-sortD:1;sortK=k;renderWords();}else if(it)it.classList.toggle('sel');};
$('#chips').onclick=e=>{const f=e.target.dataset.f;if(f){fil=f;renderWords();}};
$('#srt').onchange=e=>{sortK=e.target.value;sortD=1;renderWords();};$('#dirb').onclick=()=>{sortD=-sortD;renderWords();};$('#flt').oninput=renderWords;
function setView(v){view=v;$('#study').hidden=$('#acts').hidden=$('#sb').hidden=v!=='study';$('#words').hidden=v!=='words';
 $('#t1').classList.toggle('on',v==='study');$('#t2').classList.toggle('on',v==='words');if(v==='words')renderWords();}
function bk(){$('#bks').textContent='Backup · '+(lx?'last export '+fd(lx):'never exported');}
async function reload(){prog={};(await all('progress')).forEach(p=>prog[p.key]=p);queue=S.buildQueue(words,prog,dir,Date.now(),NEW);show();setView(view);}
async function init(){if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});db=await idb();
 try{vocab=await(await fetch('vocabulary.json')).json();}catch(e){}
 words=await all('words');const m=await all('meta');vv=(m.find(x=>x.k==='vv')||{v:0}).v;lx=(m.find(x=>x.k==='lx')||{}).v||null;bk();
 if(vocab&&(!words.length||vocab.version>vv)){await put('words',vocab.words);vv=vocab.version;await put('meta',[{k:'vv',v:vv}]);words=await all('words');}
 words.sort((a,b)=>a.id-b.id);const d=m.find(x=>x.k==='dir');if(d&&DIRS.includes(d.v))dir=d.v;await reload();}
DIRS.forEach((d,i)=>$('#d'+(i+1)).onclick=async()=>{dir=d;await put('meta',[{k:'dir',v:d}]);await reload();});
$('#t1').onclick=()=>setView('study');$('#t2').onclick=()=>setView('words');
$('#exp').onclick=async()=>{const data={app:'nl-a2-trainer',version:1,vocabVersion:vv,exported:new Date().toISOString(),words,progress:await all('progress')};
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
 a.download='nl-a2-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();lx=Date.now();await put('meta',[{k:'lx',v:lx}]);bk();};
$('#imp').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;let d;
 try{d=JSON.parse(await f.text());}catch(x){return alert('Not valid JSON. Nothing was changed.');}
 const err=S.validateImport(d);if(err)return alert('Import cancelled: '+err+'. Nothing was changed.');
 if(!confirm('Replace the current vocabulary and progress with the file contents?'))return;
 if(vocab){const by={};vocab.words.forEach(w=>by[w.id]=w);d.words.forEach(w=>{const v=by[w.id];if(v&&w.english===undefined){w.english=v.english;w.english_original=v.english_original;}});}
 try{const t=db.transaction(['words','progress','meta'],'readwrite');t.objectStore('words').clear();t.objectStore('progress').clear();
  d.words.forEach(w=>t.objectStore('words').put(w));d.progress.forEach(p=>t.objectStore('progress').put(p));
  t.objectStore('meta').put({k:'vv',v:Math.max(d.vocabVersion||1,vocab?vocab.version:0)});await fin(t);}catch(x){return alert('Write failed. Nothing was changed.');}
 words=(await all('words')).sort((a,b)=>a.id-b.id);await reload();alert('Data restored.');};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
init();
