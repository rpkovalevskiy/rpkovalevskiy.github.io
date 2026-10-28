(function(root){
'use strict';
const symbols=new Set('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' '));
const normalize=value=>String(value).replace(/[₀-₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c)).replace(/\s/g,'');
function parse(value){
 const formula=normalize(value);let pos=0;const order=[];
 if(!formula||formula.length>120)throw Error('syntax');
 function number(){const start=pos;while(/\d/.test(formula[pos]||'!'))pos++;if(start===pos)return 1;const text=formula.slice(start,pos),n=Number(text);if(text[0]==='0'||n>10000)throw Error('syntax');return n;}
 function group(close,depth){
  if(depth>8)throw Error('syntax');const counts={};let terms=0;
  while(pos<formula.length&&formula[pos]!==close){
   const c=formula[pos];let part;
   if(c==='('||c==='['){pos++;part=group(c==='('?')':']',depth+1);}
   else {const match=/^[A-Z][a-z]?/.exec(formula.slice(pos));if(!match||!symbols.has(match[0]))throw Error('syntax');const symbol=match[0];pos+=symbol.length;part={[symbol]:1};if(!order.includes(symbol))order.push(symbol);}
   const n=number();for(const [s,k] of Object.entries(part)){counts[s]=(counts[s]||0)+k*n;if(counts[s]>1000000)throw Error('syntax');}terms++;
  }
  if(!terms||close&&formula[pos]!==close)throw Error('syntax');if(close)pos++;return counts;
 }
 const counts=group(null,0);if(pos!==formula.length)throw Error('syntax');return {formula,counts,order};
}
const elementKey=p=>Object.keys(p.counts).sort().join(',');
const inventoryKey=p=>Object.entries(p.counts).sort(([a],[b])=>a.localeCompare(b)).map(([s,n])=>s+':'+n).join(',');
function compare(guess,answer){return Object.fromEntries(guess.order.map(s=>[s,!answer.counts[s]?'absent':guess.counts[s]===answer.counts[s]?'exact':'present']));}
function solved(guess,answer){return inventoryKey(guess)===inventoryKey(answer);}
const emoji={exact:'🟩',present:'🟨',absent:'⬜'};
function shareRow(guess,answer){return answer.order.map(s=>emoji[!guess.counts[s]?'absent':guess.counts[s]===answer.counts[s]?'exact':'present']).join('');}
function validate(value,registry){
 let parsed;try{parsed=parse(value);}catch{return {error:'Проверьте правильность формулы. Используйте латинские символы элементов с верным регистром и индексы.'};}
 const n=parsed.order.length;
 if(n!==3){const words={1:'один элемент',2:'два элемента',4:'четыре элемента',5:'пять элементов',6:'шесть элементов'};return {error:'Введённое вещество содержит '+(words[n]||n+' элементов')+'. Проверьте правильность формулы'};}
 const accepted=registry.find(r=>normalize(r.formula)===parsed.formula||(r.aliases||[]).some(a=>normalize(a)===parsed.formula));
 if(accepted)return {parsed,entry:accepted};
 return {error:'Введённой формулы нет в базе'+(registry.some(r=>elementKey(parse(r.formula))===elementKey(parsed))?', возможно, вы имели в виду:':'.'),suggestions:registry.filter(r=>elementKey(parse(r.formula))===elementKey(parsed))};
}
const dayMs=86400000;
function moscowDate(now=new Date()){return new Date(now.getTime()+3*3600000).toISOString().slice(0,10);}
const dayIndex=date=>Math.round((Date.parse(date+'T00:00:00Z')-Date.parse('2026-10-26T00:00:00Z'))/dayMs);
function puzzle(schedule,date=moscowDate()){
 const offset=dayIndex(date),number=offset+1,entry=offset>=0?schedule.answers[offset]:schedule.tests[date];
 return entry?{...entry,date,number,test:offset<0}:null;
}
function stats(records,today){
 const official=Object.values(records).filter(r=>r&&typeof r.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date>='2026-10-26'&&r.date<=today&&r.finished).sort((a,b)=>a.date.localeCompare(b.date));
 let best=0,run=0,last=-Infinity;for(const r of official){const d=dayIndex(r.date);run=r.won?(d===last+1?run+1:1):0;last=d;best=Math.max(best,run);}
 const wonDates=new Set(official.filter(r=>r.won).map(r=>r.date));let d=Date.parse(today+'T00:00:00Z'),current=0;
 if(!records[today]?.finished)d-=dayMs;
 while(wonDates.has(new Date(d).toISOString().slice(0,10))){current++;d-=dayMs;}
 return {played:official.length,won:official.filter(r=>r.won).length,current,best};
}
const api={normalize,parse,elementKey,inventoryKey,compare,solved,shareRow,validate,moscowDate,dayIndex,puzzle,stats};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChemWordle=api;
})(typeof window==='undefined'?globalThis:window);
