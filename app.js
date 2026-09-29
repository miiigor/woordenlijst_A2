'use strict';
const $=s=>document.querySelector(s),S=window.SRS,NEW=20,DIRS=['nl-ru','ru-nl'];
let db,words=[],vocab=null,prog={},dir='nl-ru',queue=[],cur=null,vv=0,view='study',sortK='dutch',sortD=1;
const sess={'nl-ru':{n:0,ok:0,hint:0,bad:0,pts:0},'ru-nl':{n:0,ok:0,hint:0,bad:0,pts:0}};
const idb=()=>new Promise((ok,er)=>{const r=indexedDB.open('nl-a2',1);r.onupgradeneeded=()=>{const d=r.result;
 d.createObjectStore('words',{keyPath:'id'});d.createObjectStore('progress',{keyPath:'key'});d.createObjectStore('meta',{keyPath:'k'});};
 r.onsuccess=()=>ok(r.result);r.onerror=()=>er(r.error);});
const fin=t=>new Promise((ok,er)=>{t.oncomplete=ok;t.onerror=t.onabort=()=>er(t.error);});
const all=s=>new Promise(ok=>{const q=db.transaction(s).objectStore(s).getAll();q.onsuccess=()=>ok(q.result);});
function put(store,items){const t=db.transaction(store,'readwrite');items.forEach(i=>t.objectStore(store).put(i));return fin(t);}
const fmt=n=>String(n),pct=(a,b)=>b?Math.round(100*a/b)+'%':'–';
const isNR=()=>dir==='nl-ru';
function setTxt(el,main,en){el.textContent=main;if(en){const i=document.createElement('i');i.textContent=' ('+en+')';el.append(i);}}
const showQ=w=>isNR()?setTxt($('#q'),w.dutch):setTxt($('#q'),w.russian_reviewed,w.english);
const showA=w=>isNR()?setTxt($('#a'),w.russian_reviewed,w.english):setTxt($('#a'),w.dutch);
function acts(list){const f=$('#acts');f.innerHTML='';list.forEach(([t,fn,c])=>{const b=document.createElement('button');b.textContent=t;b.className=c||'';b.onclick=fn;f.append(b);});}
function stats(){const z=sess[dir],n=z.n;$('#stats').innerHTML=
 `<span>Done <b>${n}</b></span><span>No hint <b>${z.ok}</b> (${pct(z.ok,n)})</span><span>With hint <b>${z.hint}</b> (${pct(z.hint,n)})</span><span>Wrong <b>${z.bad}</b> (${pct(z.bad,n)})</span><span>Points <b>${fmt(z.pts)}</b></span><span>Due <b>${new Set(queue.map(w=>w.id)).size}</b></span>`;
 DIRS.forEach((d,i)=>$('#d'+(i+1)).classList.toggle('on',d===dir));}
function show(){cur=queue[0];$('#a').hidden=$('#fb').hidden=true;$('#opts').innerHTML='';
 if(!words.length){$('#q').textContent='Vocabulary not loaded. Open the app once with internet.';acts([]);return stats();}
 if(!cur){$('#q').textContent='All caught up for now';acts([]);return stats();}
 showQ(cur);acts([['Show answer',reveal],['Show options',hints]]);stats();}
function reveal(){showA(cur);$('#a').hidden=false;acts([["Don't know",()=>finish('wrong'),'bad'],['I know',()=>finish('correct'),'good']]);}
function hints(){acts([]);const o=$('#opts');S.makeOptions(cur,words,dir).forEach(x=>{const b=document.createElement('button');b.textContent=x.text;
 b.onclick=()=>{[...o.children].forEach(c=>c.disabled=true);b.classList.add(x.ok?'good':'bad');finish(x.ok?'hint':'wrong');};o.append(b);});}
async function finish(res){const w=cur,k=S.key(dir,w.id),s=S.schedule(prog[k]||S.blank(k),res,Date.now());prog[k]=s;await put('progress',[s]);
 const z=sess[dir];z.n++;z.pts+=S.score(res);res==='correct'?z.ok++:res==='hint'?z.hint++:z.bad++;
 showA(w);$('#a').hidden=false;const fb=$('#fb');fb.hidden=false;
 fb.textContent=res==='wrong'?'Wrong · 0 points':res==='hint'?'Correct with a hint · +0.5':'Recalled on your own · +1';fb.className=res==='wrong'?'bad':'good';
 queue.shift();if(res==='wrong')queue.splice(Math.min(4,queue.length),0,w);
 acts([['Next',show,'good']]);stats();}
const COLS=[['dutch','Dutch'],['russian_reviewed','Russian'],['english','English'],['n','Done'],['a','% no hint'],['b','% hint'],['c','% wrong']];
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function renderWords(){const q=$('#flt').value.trim().toLowerCase();
 let r=words.filter(w=>!w.excluded).map(w=>{const p=prog[S.key(dir,w.id)],n=p?p.reps:0;
  return{dutch:w.dutch,russian_reviewed:w.russian_reviewed,english:w.english||'',n,a:n?p.correct/n:null,b:n?p.hinted/n:null,c:n?p.wrong/n:null};})
  .filter(x=>!q||(x.dutch+' '+x.russian_reviewed+' '+x.english).toLowerCase().includes(q));
 r.sort((x,y)=>{const a=x[sortK],b=y[sortK];if(a===null||b===null)return(a===null)-(b===null);
  return(typeof a==='string'?a.localeCompare(b):a-b)*sortD;});
 $('#note').textContent=`Stats for ${isNR()?'NL → RU':'RU → NL'} · ${r.length} words · tap a header to sort`;
 const P=v=>v===null?'–':Math.round(v*100)+'%';
 $('#tbl').innerHTML='<thead><tr>'+COLS.map(([k,t])=>`<th data-k="${k}">${t}${k===sortK?(sortD>0?' ▲':' ▼'):''}</th>`).join('')+'</tr></thead><tbody>'+
  r.map(x=>`<tr><td>${esc(x.dutch)}</td><td>${esc(x.russian_reviewed)}</td><td>${esc(x.english)}</td><td class="n">${x.n}</td><td class="n">${P(x.a)}</td><td class="n">${P(x.b)}</td><td class="n">${P(x.c)}</td></tr>`).join('')+'</tbody>';
 $('#tbl').querySelectorAll('th').forEach(th=>th.onclick=()=>{const k=th.dataset.k;sortD=k===sortK?-sortD:1;sortK=k;renderWords();});}
function setView(v){view=v;$('#study').hidden=v!=='study';$('#words').hidden=v!=='words';$('#acts').hidden=v!=='study';$('#stats').hidden=v!=='study';
 $('#t1').classList.toggle('on',v==='study');$('#t2').classList.toggle('on',v==='words');if(v==='words')renderWords();}
async function reload(){prog={};(await all('progress')).forEach(p=>prog[p.key]=p);queue=S.buildQueue(words,prog,dir,Date.now(),NEW);show();setView(view);}
async function init(){db=await idb();try{vocab=await(await fetch('vocabulary.json')).json();}catch(e){}
 words=await all('words');const m=await all('meta');vv=(m.find(x=>x.k==='vv')||{v:0}).v;
 if(vocab&&(!words.length||vocab.version>vv)){await put('words',vocab.words);vv=vocab.version;await put('meta',[{k:'vv',v:vv}]);words=await all('words');}
 words.sort((a,b)=>a.id-b.id);const d=m.find(x=>x.k==='dir');if(d&&DIRS.includes(d.v))dir=d.v;await reload();}
DIRS.forEach((d,i)=>$('#d'+(i+1)).onclick=async()=>{dir=d;await put('meta',[{k:'dir',v:d}]);await reload();});
$('#t1').onclick=()=>setView('study');$('#t2').onclick=()=>setView('words');$('#flt').oninput=renderWords;
$('#exp').onclick=async()=>{const data={app:'nl-a2-trainer',version:1,vocabVersion:vv,exported:new Date().toISOString(),words,progress:await all('progress')};
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
 a.download='nl-a2-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();};
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
