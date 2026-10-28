(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else root.createTrainerEngine=factory;
})(typeof window==='object'?window:globalThis,function createTrainerEngine(data){
 'use strict';
 const substances=new Map(data.substances.map(s=>[s.id,s]));
 const reactions=new Map(data.reactions.map(r=>[r.id,r]));
 const unique=a=>[...new Set(a)];
 const formulaKey=value=>String(value??'').normalize('NFKC').replace(/[₀-₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c)).replace(/[СНКОМВРАЕсох]/g,c=>({'С':'C','Н':'H','К':'K','О':'O','М':'M','В':'B','Р':'P','А':'A','Е':'E','с':'c','о':'o','х':'x'}[c])).replace(/[↑↓\s\u200b]/g,'').replace(/[.*⋅]/g,'·');
 const nameKey=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[−–]/g,'-').replace(/\s+/g,' ').replace(/\s*([(),])\s*/g,'$1').trim();
 const aliases=new Map();
 for(const s of data.substances)for(const f of s.formula_aliases)aliases.set(formulaKey(f),s.id);
 const groupsByReaction=new Map();
 for(const g of data.alternatives)for(const id of g.reaction_ids){if(!groupsByReaction.has(id))groupsByReaction.set(id,[]);groupsByReaction.get(id).push(g);}
 const sideTerms=(r,side)=>r.terms.filter(t=>t.side===side);
 const setKey=terms=>unique(terms.map(t=>t.substance_id)).sort().join('|');
 const sameSet=(a,b)=>setKey(a)===setKey(b);
 const supportedModes=new Set(['products','full','balance','missing','names','roles','electrons','conditions','memo']);
 function conditions(r){
  const variants=(groupsByReaction.get(r.id)||[]).flatMap(g=>g.variants.filter(v=>v.reaction_id===r.id));
  const labels=variants.map(v=>v.student_label).filter(Boolean);
  return unique(labels.length?labels:variants.some(v=>v.conditions?.length)?variants.flatMap(v=>v.conditions||[]):r.conditions||[]);
 }
 function safe(r,mode='products'){
  if(r.training_eligible===false||r.atom_balance_status!=='balanced'||!['no_automatic_issue','user_accepted','user_approved_correction'].includes(r.review_status))return false;
  if(mode==='balance')return true;
  return (groupsByReaction.get(r.id)||[]).every(g=>g.condition_status==='user_accepted_notation_variants'||g.condition_status==='user_approved_stoichiometry'||(g.condition_status!=='difference_not_fully_specified'&&g.variants.every(v=>v.student_label||v.conditions?.length)));
 }
 function allowedReactions(r){
  const ids=new Set([r.id]);
  for(const g of groupsByReaction.get(r.id)||[])if(g.condition_status==='user_accepted_notation_variants')for(const id of g.reaction_ids)ids.add(id);
  return [...ids].map(id=>reactions.get(id)).filter(Boolean);
 }
 function trainingNames(s,forReaction=false){
  return ['systematic','trivial_required'].flatMap(group=>(s.names[group]||[]).map(n=>{
   const item=typeof n==='string'?{name:n}:{...n};
   return {...item,group,formula:item.related_formula||s.formula,label:item.name+(item.qualifier?' ('+item.qualifier+')':'')};
  })).filter(n=>!forReaction||formulaKey(n.formula)===formulaKey(s.formula));
 }
 function nameAliases(n){
  const result=[n.name,n.label];
  const match=n.name.match(/^(.*?)\(([^()]*)\)(.*)$/);
  if(match&&/[а-я]{3}/i.test(match[2])&&!/раствор|кристаллогидрат|безводн|тв[её]рд|газообраз|водн/i.test(match[2])){
   result.push(match[1]+match[3],match[2]+match[3]);
  }
  return unique(result.map(nameKey).filter(Boolean));
 }
 // Do not generate a name question if the same approved name denotes different formulas.
 const nameTargets=new Map();
 for(const s of data.substances)for(const n of trainingNames(s))for(const key of nameAliases(n)){
  if(!nameTargets.has(key))nameTargets.set(key,new Set());nameTargets.get(key).add(formulaKey(n.formula));
 }
 function unambiguousNames(s,forReaction=false){return trainingNames(s,forReaction).filter(n=>nameAliases(n).every(k=>nameTargets.get(k)?.size===1));}
 function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function chooseName(s,rng=Math.random,forReaction=false){
  const list=unambiguousNames(s,forReaction),trivial=list.filter(n=>n.group==='trivial_required'),systematic=list.filter(n=>n.group==='systematic');
  const pool=trivial.length&&systematic.length?(rng()<0.5?trivial:systematic):list;
  return pool.length?pool[Math.floor(rng()*pool.length)]:null;
 }
 const gcd=(a,b)=>{a=a<0n?-a:a;while(b){[a,b]=[b,a%b];}return a;};
 function fraction(value){
  const text=String(value??'').trim().replace(',','.');
  if(!/^\d{1,7}(?:\/\d{1,7}|\.\d{1,6})?$/.test(text))return null;
  let n,d;
  if(text.includes('/')){const p=text.split('/');n=BigInt(p[0]);d=BigInt(p[1]);}
  else if(text.includes('.')){const p=text.split('.');d=10n**BigInt(p[1].length);n=BigInt(p[0]+p[1]);}
  else{n=BigInt(text);d=1n;}
  if(n<=0n||d<=0n)return null;const g=gcd(n,d);return {n:n/g,d:d/g};
 }
 const divide=(a,b)=>{const n=a.n*b.d,d=a.d*b.n,g=gcd(n,d);return {n:n/g,d:d/g};};
 function parseSide(raw){
  const text=String(raw??'').trim();
  if(!text)return {error:'Запишите все вещества, разделяя их знаком +.'};
  if(text.length>1800)return {error:'Слишком длинная запись.'};
  const tokens=text.split('+');
  const terms=[];
  for(const token of tokens){
   const stripped=token.trim().replace(/[↑↓]/g,'');
   const match=stripped.match(/^(?:(\d+(?:\/\d+|[.,]\d+)?)\s*)?(.+)$/);
   if(!match)return {error:'Между знаками + должна быть формула вещества.'};
   const f=formulaKey(match[2]),sid=aliases.get(f),coefficient=match[1]||'1';
   if(!fraction(coefficient))return {error:'Коэффициент должен быть положительным числом.'};
   if(!sid)return {error:'Формула «'+match[2].trim()+'» не распознана в базе. Проверьте индексы, скобки и регистр букв.'};
   if(terms.some(t=>t.substance_id===sid))return {error:'Одно вещество на каждой стороне запишите один раз.'};
   terms.push({substance_id:sid,formula:match[2].trim(),coefficient});
  }
  return {terms};
 }
 function parseEquation(value,required=false){
  const parts=String(value??'').trim().split(/(?:<=>|<->|->|=>|→|⟶|⇌|=)/);
  if(parts.length>2)return {error:'Используйте одну стрелку или знак = между сторонами уравнения.'};
  if(parts.length===1)return required?{error:'Запишите обе стороны уравнения через → или =.'}:{products:parseSide(parts[0])};
  return {reactants:parseSide(parts[0]),products:parseSide(parts[1])};
 }
 function checkProducts(r,value){
  const parsed=parseEquation(value);if(parsed.error)return {ok:false,message:parsed.error};
  if(parsed.products.error||parsed.reactants?.error)return {ok:false,message:parsed.products.error||parsed.reactants.error};
  const candidates=allowedReactions(r).filter(v=>!parsed.reactants||sameSet(parsed.reactants.terms,sideTerms(v,'reactant')));
  if(!candidates.length)return {ok:false,message:'Левая часть не совпадает с реагентами задания.'};
  const found=candidates.find(v=>sameSet(parsed.products.terms,sideTerms(v,'product')));
  return found?{ok:true,reaction:found,message:'Продукты определены верно.'}:{ok:false,message:'Набор продуктов пока не совпадает с ответом для указанных условий. Проверьте, все ли вещества записаны и нет ли лишних.'};
 }
 function minimalCoefficients(r){
  const values=r.terms.map(t=>fraction(t.coefficient));let lcm=1n;
  for(const v of values)lcm=lcm*v.d/gcd(lcm,v.d);
  const integers=values.map(v=>v.n*(lcm/v.d)),g=integers.reduce((a,b)=>gcd(a,b));
  return integers.map(n=>(n/g).toString());
 }
 function checkCoefficients(r,values){
  if(values.length!==r.terms.length)return {ok:false,message:'Заполните коэффициенты перед всеми формулами.'};
  const entered=values.map(v=>fraction(String(v).trim()||'1'));
  if(entered.some(v=>!v))return {ok:false,message:'Используйте положительные числа. Пустое поле означает 1.'};
  const expected=r.terms.map(t=>fraction(t.coefficient)),ratios=entered.map((v,i)=>divide(v,expected[i]));
  if(!ratios.every(v=>v.n===ratios[0].n&&v.d===ratios[0].d))return {ok:false,message:'Коэффициенты пока не уравнивают эту реакцию. Проверьте число атомов каждого элемента с обеих сторон.'};
  const minimal=minimalCoefficients(r).every((v,i)=>entered[i].d===1n&&entered[i].n===BigInt(v));
  return {ok:true,minimal,message:minimal?'Реакция уравнена верно.':'Реакция уравнена верно. Для школьной записи сократите коэффициенты до минимальных целых.'};
 }
 const missingCache=new WeakMap();
 function missingIndices(r){
  if(missingCache.has(r))return [...missingCache.get(r)];
  const annotation=r.redox;
  if(!annotation?.is_redox||annotation.review_status!=='checked'||!annotation.electron_balance?.balanced)return [];
  const changes=annotation.changes.filter(c=>c.from_state!==c.to_state);
  const agents=[...annotation.oxidizers,...annotation.reducers];
  // Exact atom counts preserve unchanged centers before assigning changed ones.
  // Candidate destinations alone can include spectator sulfate, nitrate, etc.
  const zero={n:0n,d:1n};
  const add=(a,b)=>({n:a.n*b.d+b.n*a.d,d:a.d*b.d});
  const subtract=(a,b)=>({n:a.n*b.d-b.n*a.d,d:a.d*b.d});
  const compare=(a,b)=>a.n*b.d<b.n*a.d?-1:a.n*b.d>b.n*a.d?1:0;
  const stateKey=s=>JSON.stringify([s.element,s.oxidation_state]);
  const centerKey=(site,substance)=>{
   // Acid residues and salt groups have different labels in the inventory.
   // Match their actual state/count composition (SO4, NO3, etc.), not the label.
   const composition=new Map();
   for(const s of substance.sites.filter(s=>s.group===site.group))composition.set(stateKey(s),(composition.get(stateKey(s))||0n)+BigInt(s.atom_count));
   const divisor=[...composition.values()].reduce((a,b)=>gcd(a,b));
   const signature=[...composition].sort(([a],[b])=>a.localeCompare(b)).map(([key,n])=>[key,String(n/divisor)]);
   return JSON.stringify([site.element,site.oxidation_state,signature]);
  };
  const inventory={reactant:new Map(),product:new Map()},sourceStates=new Map(),retainedStates=new Map();
  const termCounts=r.terms.map(t=>{
   const coefficient=fraction(t.coefficient),counts=new Map(),substance=substances.get(t.substance_id);
   for(const site of substance.sites){
    const amount={n:coefficient.n*BigInt(site.atom_count),d:coefficient.d},key=centerKey(site,substance),state=stateKey(site);
    counts.set(key,add(counts.get(key)||zero,amount));
    inventory[t.side].set(key,add(inventory[t.side].get(key)||zero,amount));
    if(t.side==='reactant')sourceStates.set(state,add(sourceStates.get(state)||zero,amount));
   }
   return counts;
  });
  const retained=new Map();
  for(const [key,input] of inventory.reactant){
   const output=inventory.product.get(key)||zero,amount=compare(input,output)<0?input:output;
   retained.set(key,amount);
   const [element,state]=JSON.parse(key),stateId=JSON.stringify([element,state]);
   retainedStates.set(stateId,add(retainedStates.get(stateId)||zero,amount));
  }
  const indices=[];
  r.terms.forEach((term,i)=>{
   if(term.side==='reactant'){
    if(agents.some(a=>a.substance_id===term.substance_id&&a.reactant_positions.includes(term.position))&&changes.some(c=>c.substance_id===term.substance_id&&c.reactant_position===term.position))indices.push(i);
    return;
   }
   const sites=substances.get(term.substance_id).sites;
   const changed=changes.some(change=>(change.product_site_candidates||[]).some(candidate=>{
    if(candidate.position!==term.position||candidate.substance_id!==term.substance_id)return false;
    const site=sites.find(s=>s.id===candidate.site_id&&s.element===change.element&&s.oxidation_state===change.to_state);
    if(!site)return false;
    const key=centerKey(site,substances.get(term.substance_id)),state=stateKey(site);
    const productUnchangedCapacity=retained.get(key)||zero;
    const remainingUnchangedSource=subtract(sourceStates.get(state)||zero,retainedStates.get(state)||zero);
    // If even all preserved atoms cannot fill this term, some of its atoms
    // necessarily belong to the recorded oxidation-state change. Otherwise skip it.
    return compare(subtract(termCounts[i].get(key)||zero,productUnchangedCapacity),remainingUnchangedSource)>0;
   }));
   if(changed)indices.push(i);
  });
  missingCache.set(r,indices);
  return [...indices];
 }
 function checkMissing(task,value){
  if(!missingIndices(task.reaction).includes(task.hiddenIndex))return {ok:false,message:'Это вещество не подходит для пропуска в задании на ОВР.'};
  const parsed=parseSide(value);if(parsed.error)return {ok:false,message:parsed.error};
  if(parsed.terms.length!==1)return {ok:false,message:'Впишите одно пропущенное вещество.'};
  const missing=task.reaction.terms[task.hiddenIndex];
  const accepted=allowedReactions(task.reaction).filter(r=>{
   const rest=r.terms.filter(t=>t.side!==missing.side||t.substance_id!==parsed.terms[0].substance_id);
   return r.terms.length===task.reaction.terms.length&&['reactant','product'].every(side=>sameSet(rest.filter(t=>t.side===side),task.reaction.terms.filter((t,i)=>i!==task.hiddenIndex&&t.side===side)));
  });
  return accepted.length?{ok:true,reaction:accepted[0],message:'Пропущенное вещество найдено.'}:{ok:false,message:'Это вещество не подходит к показанной реакции.'};
 }
 function checkName(task,value){
  if(task.direction==='name-to-formula'){
   const input=formulaKey(value),expected=formulaKey(task.name.formula);
   const ok=input===expected||(expected===formulaKey(task.substance.formula)&&aliases.get(input)===task.substance.id);
   return {ok,message:ok?'Формула записана верно.':'Формула пока не совпадает с указанным названием. Проверьте состав и индексы.'};
  }
  const names=trainingNames(task.substance).filter(n=>formulaKey(n.formula)===formulaKey(task.name.formula));
  const ok=names.some(n=>nameAliases(n).includes(nameKey(value)));
  return {ok,message:ok?'Название верное.':'Такое название не найдено среди систематических и обязательных тривиальных названий этого вещества.'};
 }
 function roleOf(r,term){
  const has=key=>r.redox[key].some(a=>a.substance_id===term.substance_id&&a.reactant_positions.includes(term.position));
  const oxidizer=has('oxidizers'),reducer=has('reducers');
  return oxidizer&&reducer?'both':oxidizer?'oxidizer':reducer?'reducer':'none';
 }
 function checkRoles(r,values){
  const terms=sideTerms(r,'reactant');
  if(terms.some((t,i)=>!values[i]))return {ok:false,message:'Выберите роль для каждого исходного вещества.'};
  return terms.every((t,i)=>values[i]===roleOf(r,t))?{ok:true,message:'Все роли в ОВР определены верно.'}:{ok:false,message:'Не все роли определены верно. Проверьте, какие вещества принимают и отдают электроны в этой реакции.'};
 }
 function electronicRows(r){
  const rows=new Map();
  for(const c of r.redox.changes){
   const key=JSON.stringify([c.element,c.from_state,c.to_state]),count=fraction(c.atom_count);
   if(c.from_state===c.to_state||!count)continue;
   if(!rows.has(key))rows.set(key,{key,element:c.element,from:c.from_state,to:c.to_state,count:{n:0n,d:1n}});
   const row=rows.get(key),n=row.count.n*count.d+count.n*row.count.d,d=row.count.d*count.d,g=gcd(n,d);row.count={n:n/g,d:d/g};
  }
  let lcm=1n;
  for(const row of rows.values())lcm=lcm*row.count.d/gcd(lcm,row.count.d);
  const integers=[...rows.values()].map(row=>row.count.n*(lcm/row.count.d)),divisor=integers.reduce((a,b)=>gcd(a,b),0n)||1n;
  const signed=n=>n>0?'+'+n:String(n);
  return [...rows.values()].map((row,i)=>({...row,electrons:Math.abs(row.to-row.from),multiplier:String(integers[i]/divisor),text:row.element+'('+signed(row.from)+') '+(row.to<row.from?'+':'−')+' '+Math.abs(row.to-row.from)+'e− → '+row.element+'('+signed(row.to)+')'}));
 }
 function parseElectronicRow(value){
  const digits={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-'};
  let text=String(value||'').trim();
  if(text.length>300)return {error:'Слишком длинная строка электронного баланса.'};
  text=text.replace(/([A-Z][a-z]?)([⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g,(_,el,s)=>el+'('+[...s].map(c=>digits[c]).join('').replace(/^(\d+)([+-])$/,'$2$1')+')').replace(/[⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹]/g,c=>digits[c]).normalize('NFKC').replace(/[−–]/g,'-').replace(/\s+/g,'');
  const parts=text.split(/(?:->|=>|→|⟶|=)/);
  if(parts.length!==2)return {error:'Разделите исходное и конечное состояния стрелкой → или знаком =.'};
  const electron=/^(.+)([+-])(\d{0,7})[eе](?:\^?-)?$/;
  const left=parts[0].match(electron),right=parts[1].match(electron);
  if(!!left===!!right)return {error:'Укажите принятие или отдачу электронов на одной стороне строки.'};
  const atom=value=>{
   const m=value.match(/^(\d{0,4})([A-Z][a-z]?)(\d{0,4})(?:\(([+-]?\d{1,2})\)|\^([+-]?\d{1,2}))$/);
   if(!m)return null;
   const count=Number(m[1]||1)*Number(m[3]||1);
   return count>0?{element:m[2],count,state:Number(m[4]??m[5])}:null;
  };
  const from=atom(left?left[1]:parts[0]),to=atom(right?right[1]:parts[1]),e=left||right;
  if(!from||!to)return {error:'Запишите элемент и степень окисления, например Fe(+2) или N2(0).'};
  if(from.element!==to.element||from.count!==to.count)return {error:'В обеих частях строки должны совпадать элемент и число его атомов.'};
  const electrons=Number(e[3]||1),gained=left?e[2]==='+':e[2]==='-';
  if(!electrons||electrons!==from.count*Math.abs(to.state-from.state)||gained!==(to.state<from.state))return {error:'Проверьте знак принятия/отдачи и число электронов в строке.'};
  return {key:JSON.stringify([from.element,from.state,to.state]),element:from.element,from:from.state,to:to.state,count:from.count,electrons,gained};
 }
 function checkElectronicBalance(r,submitted){
  const expected=electronicRows(r),rows=submitted.filter(row=>String(row.text||'').trim()||String(row.multiplier||'').trim());
  if(!r.redox.is_redox||expected.length<2)return {ok:false,message:'Электронный баланс составляется для ОВР с размеченными изменениями.'};
  if(rows.length<expected.length)return {ok:false,message:'Запишите все изменения степеней окисления этой реакции.'};
  const counts=new Map();
  for(let i=0;i<rows.length;i++){
   const parsed=parseElectronicRow(rows[i].text);if(parsed.error)return {ok:false,message:'Строка '+(i+1)+': '+parsed.error};
   const target=expected.find(row=>row.key===parsed.key);
   if(!target)return {ok:false,message:'Строки должны описывать изменения степеней окисления показанной реакции.'};
   const multiplier=fraction(rows[i].multiplier||'1');
   if(!multiplier||multiplier.d!==1n)return {ok:false,message:'Множители должны быть положительными целыми числами.'};
   counts.set(parsed.key,(counts.get(parsed.key)||0n)+BigInt(parsed.count)*multiplier.n);
  }
  if(counts.size!==expected.length)return {ok:false,message:'Запишите все изменения степеней окисления этой реакции.'};
  const ratios=expected.map(row=>divide({n:counts.get(row.key),d:1n},row.count));
  return ratios.every(v=>v.n===ratios[0].n&&v.d===ratios[0].d)?{ok:true,message:'Электронный баланс составлен верно.'}:{ok:false,message:'Множители пока не согласуют все строки электронного баланса. Проверьте равенство отданных и принятых электронов и соотношение изменившихся атомов.'};
 }
 function conditionGroups(list=data.reactions){
  const ids=new Set(list.map(r=>r.id));
  return data.alternatives.filter(g=>g.condition_status!=='user_accepted_notation_variants'&&g.condition_status!=='difference_not_fully_specified'&&g.variants.length>1&&g.variants.some(v=>ids.has(v.reaction_id))&&g.variants.every(v=>{
   const r=reactions.get(v.reaction_id);return r&&safe(r)&&(v.student_label||v.conditions?.length);
  })&&new Set(g.variants.map(v=>(v.student_label||(v.conditions||[]).join('; ')).trim())).size===g.variants.length);
 }
 function checkConditions(task,values){
  if(task.conditionCards.some((c,i)=>!values[i]))return {ok:false,message:'Выберите уравнение для каждого условия.'};
  return task.conditionCards.every((c,i)=>values[i]===c.reaction_id)?{ok:true,message:'Условия и уравнения сопоставлены верно.'}:{ok:false,message:'Не все условия сопоставлены верно. Проверьте выбранные варианты.'};
 }
 function memoEntries(){
  const entries=new Map(),targets=new Map();
  for(const s of data.substances)for(const group of ['trivial_required'])for(const raw of s.names[group]){
   const n=typeof raw==='string'?{name:raw}:raw,formula=n.related_formula||s.formula,key=aliases.get(formulaKey(formula))||formulaKey(formula),label=n.name+(n.qualifier?' ('+n.qualifier+')':''),nameId=nameKey(label);
   if(!entries.has(key))entries.set(key,{key,formula,substanceIds:[],names:[]});
   const entry=entries.get(key);if(!entry.substanceIds.includes(s.id))entry.substanceIds.push(s.id);
   if(!entry.names.some(n=>nameKey(n.label)===nameId))entry.names.push({label,group});
   if(!targets.has(nameId))targets.set(nameId,new Set());targets.get(nameId).add(key);
  }
  return [...entries.values()].map(entry=>({...entry,names:entry.names.filter(n=>targets.get(nameKey(n.label)).size===1)})).filter(entry=>entry.names.length);
 }
 function flipMemo(task,index){
  if(task.outcome||!task.cards[index]||task.matched.includes(index)||task.faceUp.includes(index))return {changed:false};
  if(task.faceUp.length===2)task.faceUp=[];
  task.faceUp.push(index);
  if(task.faceUp.length===2){
   const [a,b]=task.faceUp;
   if(task.cards[a].key===task.cards[b].key){task.matched.push(a,b);task.faceUp=[];task.feedback={ok:true,message:'Пара найдена.'};}
   else task.feedback={ok:false,message:'Не пара. Откройте следующую карточку.'};
   if(task.matched.length===task.cards.length){task.outcome='correct';task.feedback={ok:true,message:'Все пары найдены.'};}
  }else task.feedback=null;
  return {changed:true,done:!!task.outcome};
 }
 function pool(settings,reactionPool=data.reactions){
  if(!supportedModes.has(settings.mode))return [];
  const redoxOnly=['balance','missing','roles','electrons'].includes(settings.mode);
  let list=reactionPool.filter(r=>safe(r,settings.mode)&&(redoxOnly||['conditions','memo'].includes(settings.mode)||!settings.type||settings.type==='all'||r.redox.is_redox===(settings.type==='redox')));
  if(redoxOnly)list=list.filter(r=>r.redox.is_redox);
  if(settings.mode==='missing')list=list.filter(r=>missingIndices(r).length);
  if(['roles','electrons'].includes(settings.mode))list=list.filter(r=>r.redox.review_status==='checked'&&r.redox.electron_balance.balanced);
  if(settings.scope==='substance')list=list.filter(r=>r.terms.some(t=>t.substance_id===settings.substance&&(['names','memo'].includes(settings.mode)||!settings.side||settings.side==='all'||t.side===settings.side)));
  if(settings.scope==='element')list=list.filter(r=>r.elements.includes(settings.element));
  if(settings.scope==='class')list=list.filter(r=>r.terms.some(t=>substances.get(t.substance_id).all_class_ids.includes(settings.class)));
  if(settings.mode==='conditions')return conditionGroups(list);
  if(settings.mode==='memo'){
   const ids=new Set(list.flatMap(r=>r.terms.map(t=>t.substance_id)));
   return memoEntries().filter(entry=>entry.substanceIds.some(id=>ids.has(id)&&((settings.scope!=='substance'||id===settings.substance)&&(settings.scope!=='element'||substances.get(id).elements.includes(settings.element))&&(settings.scope!=='class'||substances.get(id).all_class_ids.includes(settings.class)))));
  }
  if(settings.mode==='names'){
   let ss=data.substances.filter(s=>list.some(r=>r.terms.some(t=>t.substance_id===s.id))&&unambiguousNames(s).length);
   if(settings.scope==='substance')ss=ss.filter(s=>s.id===settings.substance);
   if(settings.scope==='element')ss=ss.filter(s=>s.elements.includes(settings.element));
   if(settings.scope==='class')ss=ss.filter(s=>s.all_class_ids.includes(settings.class));
   return ss;
  }
  const seen=new Set();
  return list.filter(r=>{
   const equivalent=(groupsByReaction.get(r.id)||[]).find(g=>g.condition_status==='user_accepted_notation_variants');
   const key=['products','full'].includes(settings.mode)&&equivalent?equivalent.id:r.id;
   if(seen.has(key))return false;seen.add(key);return true;
  });
 }
 function makeSession(settings,reactionPool=data.reactions,rng=Math.random){
  if(!supportedModes.has(settings.mode))return {error:'Такой режим тренировки недоступен.'};
  const available=pool(settings,reactionPool),count=Number(settings.count);
  if(!Number.isInteger(count)||count<1||count>available.length)return {error:'Количество заданий должно быть от 1 до '+available.length+'.'};
  const presentations=shuffle(Array.from({length:count},(_,i)=>settings.mode==='balance'?'formulas':settings.presentation==='mixed'?(i<Math.ceil(count/2)?'formulas':'names'):settings.presentation),rng);
  const selected=shuffle(available,rng).slice(0,count);
  if(settings.mode==='memo'){
   const pairs=selected.map(entry=>({...entry,name:entry.names[Math.floor(rng()*entry.names.length)]}));
   const cards=shuffle(pairs.flatMap(entry=>[{key:entry.key,kind:'formula',text:entry.formula},{key:entry.key,kind:'name',text:entry.name.label}]),rng);
   return {settings:{...settings},tasks:[{pairs,cards,matched:[],faceUp:[],outcome:null,feedback:null}],index:0,done:false};
  }
  const tasks=selected.map((item,i)=>{
   const task={presentation:presentations[i],outcome:null,attempts:0,stage:settings.mode==='balance'?'balance':'answer',input:'',values:[],feedback:null};
   if(settings.mode==='conditions'){
    task.group=item;task.conditionCards=shuffle(item.variants.map(v=>({reaction_id:v.reaction_id,label:v.student_label||(v.conditions||[]).join('; ')})),rng);task.reactionCards=shuffle(item.variants.map(v=>reactions.get(v.reaction_id)),rng);task.conditionValues=[];
   }else if(settings.mode==='names'){
    task.substance=item;task.name=chooseName(item,rng);task.direction=settings.direction==='mixed'?(i%2?'formula-to-name':'name-to-formula'):settings.direction;
   }else{
    task.reaction=item;task.originalReaction=item;
    task.roles=[];task.electronRows=[{text:'',multiplier:''},{text:'',multiplier:''}];
    if(settings.mode==='missing'){const eligible=missingIndices(item);task.hiddenIndex=eligible[Math.floor(rng()*eligible.length)];}
    task.termNames=item.terms.map(t=>chooseName(substances.get(t.substance_id),rng,true));
   }
   return task;
  });
  return {settings:{...settings},tasks,index:0,done:false};
 }
 return {substances,reactions,formulaKey,nameKey,sideTerms,setKey,sameSet,conditions,safe,allowedReactions,trainingNames,unambiguousNames,nameAliases,chooseName,shuffle,fraction,parseSide,parseEquation,checkProducts,checkCoefficients,minimalCoefficients,missingIndices,checkMissing,checkName,roleOf,checkRoles,electronicRows,parseElectronicRow,checkElectronicBalance,conditionGroups,checkConditions,memoEntries,flipMemo,pool,makeSession};
});
