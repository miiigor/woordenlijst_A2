const S=require('./srs.js'),a=require('assert'),N=Date.now(),D=864e5;
const W=Array.from({length:12},(_,i)=>({id:i+1,dutch:'woord'+i,russian_reviewed:'слово'+i,excluded:i===11}));
// баллы
a.equal(S.score('correct'),1);a.equal(S.score('hint'),0.5);a.equal(S.score('wrong'),0);
// расписание
let s=S.blank('nl-ru:1');const c1=S.schedule(s,'correct',N),c2=S.schedule(c1,'correct',N);
a(c2.interval>c1.interval&&c1.correct===1);
const h=S.schedule(c2,'hint',N);a(h.interval<S.STEPS[c2.level],'подсказка растит интервал осторожнее');a(h.interval>=1&&h.hinted===1);
const w=S.schedule(c2,'wrong',N);a(w.due-N<D&&w.wrong===1&&w.level<c2.level);
// направления независимы
const prog={};prog[S.key('nl-ru',1)]=S.schedule(s,'correct',N);
a(!S.buildQueue(W,prog,'nl-ru',N,50).some(x=>x.id===1),'слово 1 не due в nl-ru');
a(S.buildQueue(W,prog,'ru-nl',N,50).some(x=>x.id===1),'слово 1 новое в ru-nl');
a(!S.buildQueue(W,{},'nl-ru',N,50).some(x=>x.excluded),'исключённые не попадают');
a.equal(S.buildQueue(W,{},'nl-ru',N,5).length,5);
// варианты
const pos=new Set();for(let i=0;i<200;i++){const o=S.makeOptions(W[0],W,'nl-ru');a(o.length===4&&o.filter(x=>x.ok).length===1);
 a.equal(new Set(o.map(x=>x.text)).size,4);a(!o.some(x=>x.text==='слово11'));pos.add(o.findIndex(x=>x.ok));}
a.equal(pos.size,4,'позиция правильного случайна');
a.equal(S.makeOptions(W[0],W.slice(0,3),'ru-nl').length,3,'мало вариантов — меньше четырёх');
// экспорт/импорт
const ok={app:'nl-a2-trainer',words:W,progress:[c1&&Object.assign({},c1,{key:'nl-ru:1'})]};
a.equal(S.validateImport(JSON.parse(JSON.stringify(ok))),null);
a(S.validateImport({app:'x'}));a(S.validateImport({...ok,progress:[{key:'nl-ru:999',reps:1}]}));
a(S.validateImport({...ok,progress:[{...ok.progress[0],due:'x'}]}));a(S.validateImport({...ok,words:[{id:1}]}));
console.log('Все проверки пройдены');
