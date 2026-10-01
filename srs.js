(function(g){
const DAY=864e5,STEPS=[1,2,4,8,16,32,64,128];
const key=(d,id)=>d+':'+id;
const blank=k=>({key:k,reps:0,correct:0,hinted:0,hintUsed:0,wrong:0,last:null,due:0,interval:0,level:0});
// Правила расписания (интервал в днях). Меняйте STEPS и формулы ниже.
function schedule(s,r,now,used){s=Object.assign({},s);const prev=s.interval||0,hu=s.hintUsed===undefined?(s.hinted||0):s.hintUsed;s.hintUsed=hu+((r==='hint'||used)?1:0);s.reps++;s.last=now;
 if(r==='correct'){s.correct++;s.level=Math.min(s.level+1,STEPS.length);s.interval=STEPS[s.level-1];}
 else if(r==='hint'){s.hinted++;s.level=Math.max(s.level,1);s.interval=Math.max(1,Math.round(prev*1.3));}
 else{s.wrong++;s.level=Math.max(0,s.level-2);s.interval=10/1440;}
 s.due=now+s.interval*DAY;return s;}
function buildQueue(words,prog,dir,now,newLimit){const act=words.filter(w=>!w.excluded),st=w=>prog[key(dir,w.id)];
 const due=act.filter(w=>st(w)&&st(w).due<=now).sort((a,b)=>st(a).due-st(b).due);
 return due.concat(act.filter(w=>!st(w)).slice(0,newLimit));}
const hw=w=>w.dutch.split(/[,(]/)[0].replace(/^(de|het|een)\s/,'').trim().toLowerCase();
function shuffle(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function makeOptions(w,pool,dir,rnd){rnd=rnd||Math.random;const f=dir==='nl-ru'?'russian_reviewed':'dutch';
 const seen=new Set([w[f].toLowerCase()]),bad=[];
 for(const c of shuffle(pool,rnd)){if(bad.length>=3)break;if(c.excluded||c.id===w.id||hw(c)===hw(w))continue;
  const t=c[f].toLowerCase();if(seen.has(t))continue;seen.add(t);bad.push(c[f]);}
 const o=bad.map(t=>({text:t,ok:false}));o.splice(Math.floor(rnd()*(o.length+1)),0,{text:w[f],ok:true});return o;}
function validateImport(d){
 if(!d||d.app!=='nl-a2-trainer')return 'not a trainer backup file';
 if(!Array.isArray(d.words)||!d.words.length||!Array.isArray(d.progress))return 'missing words or progress';
 const ids=new Set();
 for(const w of d.words){if(!w||!Number.isInteger(w.id)||ids.has(w.id)||typeof w.dutch!=='string'||typeof w.russian_reviewed!=='string'||!w.dutch||!w.russian_reviewed)return 'a vocabulary record is damaged';ids.add(w.id);}
 for(const p of d.progress){const m=p&&typeof p.key==='string'&&p.key.match(/^(nl-ru|ru-nl):(\d+)$/);
  if(!m||!ids.has(+m[2]))return 'a progress record is damaged';
  for(const f of['reps','correct','hinted','wrong','level','interval','due'])if(!Number.isFinite(p[f]))return 'damaged field '+f;
  if(p.last!==null&&!Number.isFinite(p.last))return 'damaged field last';}
 return null;}
g.SRS={key,blank,schedule,buildQueue,makeOptions,validateImport,STEPS};
if(typeof module!=='undefined')module.exports=g.SRS;
})(typeof window!=='undefined'?window:globalThis);
