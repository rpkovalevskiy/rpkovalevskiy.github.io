(() => {
'use strict';
if(location.pathname.replace(/\/$/,'')==='/fordle'){window.mountChemWordle();return;}
const D=window.CHEMISTRY_DATA;
const main=document.getElementById('main');
const smap=new Map(D.substances.map(s=>[s.id,s]));
const rmap=new Map(D.reactions.map(r=>[r.id,r]));
const cmap=new Map(D.classes.map(c=>[c.id,c]));
const emap=new Map(D.elements.map(e=>[e.symbol,e]));
const aliases=new Map();
for(const s of D.substances)for(const f of s.formula_aliases)aliases.set(f,s);
const alternativeMap=new Map();
for(const g of D.alternatives)for(const id of g.reaction_ids){if(!alternativeMap.has(id))alternativeMap.set(id,[]);alternativeMap.get(id).push(g);}
const compare=new Intl.Collator('ru',{numeric:true}).compare;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formula=f=>esc(f).replace(/(\d+)/g,'<sub>$1</sub>');
const normalize=s=>s.replace(/[₀-₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c)).trim();
const signed=n=>n>0?'+'+n:String(n).replace('-','−');
const unique=arr=>[...new Set(arr)];
const plural=(n,one,few,many)=>n%10===1&&n%100!==11?one:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?few:many;
const reactionWord=n=>plural(n,'реакция','реакции','реакций');
const substanceWord=n=>plural(n,'вещество','вещества','веществ');
const normalizeName=s=>normalize(String(s)).toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ');
const nameText=n=>typeof n==='string'?n:n.name;
const namesOf=s=>[...s.names.systematic,...s.names.trivial_required,...s.names.trivial_optional].map(nameText);
const nameIndex=new Map(D.substances.map(s=>[s.id,namesOf(s).map(normalizeName)]));
function matchesSubstance(s,q){const key=normalizeName(q);return s.formula_aliases.some(f=>normalizeName(f).includes(key))||nameIndex.get(s.id).some(n=>n.includes(key));}
function searchSubstances(q){return D.substances.filter(s=>matchesSubstance(s,q)).sort((a,b)=>Number(b.formula===q)-Number(a.formula===q)||Number(nameIndex.get(b.id).includes(normalizeName(q)))-Number(nameIndex.get(a.id).includes(normalizeName(q)))||compare(a.formula,b.formula));}
function displayName(n){return typeof n==='string'?esc(n):esc(n.name)+(n.qualifier||n.related_formula?' ('+[n.qualifier?esc(n.qualifier):'',n.related_formula?formula(n.related_formula):''].filter(Boolean).join(', ')+')':'');}
function substanceNames(s){return '<div class="substance-names">'+s.names.systematic.map(n=>'<div>'+displayName(n)+'</div>').join('')+(s.names.trivial_required.length||s.names.trivial_optional.length?'<div class="trivial-names">'+[...s.names.trivial_required.map(n=>'<span>'+displayName(n)+'</span>'),...s.names.trivial_optional.map(n=>'<span class="optional-name">'+displayName(n)+'</span>')].join('<span class="name-separator"> · </span>')+'</div>':'')+'</div>';}
function url(path='/',params={}){const p=new URLSearchParams();for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&v!=='')p.set(k,v);return '#'+path+(p.size?'?'+p:'');}
const substanceUrl=(s,p={})=>url('/substance/'+s.id,p);
const reactionUrl=r=>url('/reaction/'+r.id);
const classUrl=(id,p={})=>url('/class/'+id,p);
const link=(label,href,cls='')=>'<a'+(cls?' class="'+cls+'"':'')+' href="'+esc(href)+'">'+label+'</a>';
const formulaLink=(s,f=s.formula)=>link(formula(f),substanceUrl(s),'formula-link');
let current={path:'/',params:{}};
const trainer=window.createChemistryTrainer(D,{esc,formula,crumbs,heading,url,link,filteredReactions,compare});
if('scrollRestoration' in history)history.scrollRestoration='manual';
const scrollToStart=()=>window.scrollTo({top:0,left:0,behavior:'instant'});
let periodicExpanded=false;
const periodicMobile=window.matchMedia('(max-width:750px)');
function updatePeriodicView(){
 const viewer=main.querySelector('.periodic-viewer');if(!viewer)return;
 const compact=periodicMobile.matches&&!periodicExpanded;
 viewer.classList.toggle('is-compact',compact);
 const layout=viewer.querySelector('.periodic-layout');layout.inert=compact;
 const scroll=viewer.querySelector('.periodic-scroll');scroll.tabIndex=compact?-1:0;
 if(compact)scroll.scrollLeft=0;
 const toggle=viewer.querySelector('.periodic-zoom-toggle');toggle.hidden=!periodicMobile.matches;
 toggle.setAttribute('aria-expanded',String(!compact));
 toggle.textContent=compact?'Увеличить таблицу ↗':'Свернуть таблицу ↙';
 viewer.querySelector('.periodic-preview-open').hidden=!compact;
 viewer.querySelector('.periodic-mobile-hint').textContent=compact?'Нажмите на таблицу, чтобы увеличить её.':periodicMobile.matches?'Листайте таблицу по горизонтали и выбирайте элементы →':'Таблицу можно прокручивать по горизонтали →';
}
periodicMobile.addEventListener('change',updatePeriodicView);
document.getElementById('dataset-label').textContent='Версия '+D.version+' · '+D.reactions.length+' '+reactionWord(D.reactions.length);
function parseRoute(){const raw=(location.hash||'#/').slice(1);const i=raw.indexOf('?');const path=i===-1?raw:raw.slice(0,i);const search=i===-1?'':raw.slice(i+1);return {path:path||'/',params:Object.fromEntries(new URLSearchParams(search))};}
function crumbs(items){return '<nav class="breadcrumb" aria-label="Путь">'+[link('Главная',url('/')),...items.map(([title,href])=>href?link(title,href):'<span>'+title+'</span>')].join('<span class="separator" aria-hidden="true">/</span>')+'</nav>';}
function heading(title,description='',count=''){return '<div class="page-heading"><div><h1>'+title+'</h1>'+(description?'<p class="page-description">'+description+'</p>':'')+'</div>'+(count?'<span class="page-count">'+count+'</span>':'')+'</div>';}
function classSubstances(id,element){return D.substances.filter(s=>s.all_class_ids.includes(id)&&(!element||s.elements.includes(element)));}
function groupSubstances(p={}){
 return D.substances.filter(s=>(!p.class||s.all_class_ids.includes(p.class))&&(!p.element||s.elements.includes(p.element))&&(p.state===undefined||s.sites.some(site=>site.element===p.element&&String(site.oxidation_state)===p.state)));
}
function filteredReactions(p={}){
 const s=smap.get(p.substance);
 let ids=null;
 if(s){ids=new Set(p.role==='oxidizer'?s.oxidizer_ids:p.role==='reducer'?s.reducer_ids:p.side==='reactant'?s.reactant_ids:p.side==='product'?s.product_ids:s.reaction_ids);}
 const candidateIds=(p.class||p.state!==undefined)?new Set(groupSubstances(p).map(s=>s.id)):null;
 const q=normalize(p.q||'');
 const qs=q.split(/\s*\+\s*/).filter(Boolean);
 const exact=qs.length&&qs.every(f=>aliases.has(f));
 const namedIds=q?new Set(searchSubstances(q).map(s=>s.id)):new Set();
 return D.reactions.filter(r=>(!ids||ids.has(r.id))&&(!p.type||p.type==='all'||r.redox.is_redox===(p.type==='redox'))&&(!p.element||r.elements.includes(p.element))&&(!candidateIds||r.terms.some(t=>candidateIds.has(t.substance_id)))&&(!p.companion||r.terms.some(t=>t.substance_id===p.companion))&&(!q||(exact?qs.every(f=>r.terms.some(t=>t.substance_id===aliases.get(f).id)):normalize(r.equation_display).includes(q)||r.terms.some(t=>namedIds.has(t.substance_id)))));
}
function elementTile(e){return link('<span class="atomic">'+e.atomic_number+'</span><strong>'+e.symbol+'</strong><span>'+esc(e.name_ru)+'</span>',url('/element/'+e.symbol),'element-tile');}
function periodicTable(){
 const labels=new Map(window.PERIODIC_ELEMENTS.map(e=>[e.symbol,e]));
 // Symbol positions follow the supplied short-form table, including Cu/Zn and noble gases.
 const rightAligned=new Set('B C N O F Al Si P S Cl Cu Zn Ga Ge As Se Br Ag Cd In Sn Sb Te I Au Hg Tl Pb Bi Po At Rg Cn Nh Fl Mc Lv Ts'.split(' '));
 const periods=[
  {period:1,rows:[['H',null,null,null,null,null,'(H)',null,null,'He']]},
  {period:2,rows:[['Li','Be','B','C','N','O','F',null,null,'Ne']]},
  {period:3,rows:[['Na','Mg','Al','Si','P','S','Cl',null,null,'Ar']]},
  {period:4,rows:[['K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni'],['Cu','Zn','Ga','Ge','As','Se','Br',null,null,'Kr']]},
  {period:5,rows:[['Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd'],['Ag','Cd','In','Sn','Sb','Te','I',null,null,'Xe']]},
  {period:6,rows:[['Cs','Ba','La','Hf','Ta','W','Re','Os','Ir','Pt'],['Au','Hg','Tl','Pb','Bi','Po','At',null,null,'Rn']]},
  {period:7,rows:[['Fr','Ra','Ac','Rf','Db','Sg','Bh','Hs','Mt','Ds'],['Rg','Cn','Nh','Fl','Mc','Lv','Ts',null,null,'Og']]}
 ];
 function cell(symbol,tag='td'){
  if(symbol==='(H)')return '<'+tag+' class="pt-hydrogen-note" aria-label="Условное обозначение водорода в седьмой группе">(H)</'+tag+'>';
  const e=labels.get(symbol),active=emap.get(symbol);
  const name=active?.name_ru||e.name;
  const star=symbol==='La'?'*':symbol==='Ac'?'**':'';
  const content='<span class="pt-number">'+e.number+'</span><strong class="pt-symbol">'+symbol+(star?'<sup>'+star+'</sup>':'')+'</strong><span class="pt-name">'+esc(name)+'</span>';
  return '<'+tag+' class="pt-element '+(active?'pt-active':'pt-inactive')+' '+(rightAligned.has(symbol)?'pt-align-right':'pt-align-left')+'" data-element="'+symbol+'">'+(active?'<a class="pt-cell" href="'+url('/element/'+symbol)+'" aria-label="'+esc(name)+', '+symbol+', открыть вещества и реакции">'+content+'</a>':'<div class="pt-cell" aria-label="'+esc(name)+', '+symbol+', в базе отсутствует">'+content+'</div>')+'</'+tag+'>';
 }
 function rowCells(row){let cells='';for(let i=0;i<row.length;i++){if(row[i]===null){let span=1;while(row[i+span]===null)span++;cells+='<td class="pt-empty" colspan="'+span+'"></td>';i+=span-1;}else cells+=cell(row[i]);}return cells;}
 const body=periods.map(p=>p.rows.map((row,i)=>'<tr'+(i===0?' class="pt-period-start"':'')+'>'+(i===0?'<th scope="rowgroup" class="pt-period" rowspan="'+p.rows.length+'">'+p.period+'</th>':'')+rowCells(row)+'</tr>').join('')).join('');
 const detached=(title,symbols)=>'<div class="pt-detached-title">'+title+'</div><table class="pt-detached" aria-label="'+title.replace(/\*/g,'')+'"><tbody><tr>'+symbols.split(' ').map(s=>cell(s)).join('')+'</tr></tbody></table>';
 return '<div class="periodic-legend"><span><i class="pt-swatch available" aria-hidden="true"></i>Есть в базе · открыть</span><span><i class="pt-swatch unavailable" aria-hidden="true"></i>Нет в базе</span></div><div class="periodic-viewer"><div class="periodic-mobile-controls"><p class="periodic-mobile-hint">Нажмите на таблицу, чтобы увеличить её.</p><button class="button small periodic-zoom-toggle" type="button" data-periodic-zoom aria-controls="periodic-table-scroll" aria-expanded="false" hidden>Увеличить таблицу ↗</button></div><div class="periodic-stage"><div class="periodic-scroll" id="periodic-table-scroll" role="region" aria-label="Периодическая таблица с горизонтальной прокруткой" tabindex="0"><div class="periodic-layout"><table class="periodic-table" aria-label="Периодическая система элементов, короткая форма"><colgroup><col class="pt-period-column"><col span="10"></colgroup><thead><tr><th class="pt-period-title" rowspan="2" scope="col">Период</th><th colspan="10" class="pt-groups-title">Группы</th></tr><tr>'+['I','II','III','IV','V','VI','VII'].map(g=>'<th scope="col">'+g+'</th>').join('')+'<th scope="colgroup" colspan="3">VIII</th></tr></thead><tbody>'+body+'</tbody></table>'+detached('* Лантаноиды','Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu')+detached('** Актиноиды','Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr')+'</div></div><button class="periodic-preview-open" type="button" data-periodic-zoom aria-label="Увеличить периодическую таблицу" aria-controls="periodic-table-scroll" hidden></button></div></div>';
}
function classRow(c,element){const count=classSubstances(c.id,element).length;return '<div class="class-row">'+link('<span class="class-marker" aria-hidden="true"></span>'+esc(c.name_ru),classUrl(c.id,element?{element}:{}))+link(count+' <span class="arrow" aria-hidden="true">→</span>',classUrl(c.id,element?{element}:{}),'count-link')+'</div>';}
function home(){
 return '<section class="intro"><div><div class="eyebrow">Систематизированная база уравнений</div><h1>База реакций ЕГЭ</h1><p>На данный момент в базе неорганические реакции из заданий второй части ЕГЭ.</p><p>Выберите элемент или найдите вещество по формуле или названию.</p></div><div class="intro-stats"><div><strong>'+D.reactions.length+'</strong>реакций</div><div><strong>'+D.substances.length+'</strong>веществ</div></div></section>'+
 '<a class="panel wordle-entry" href="/fordle" aria-labelledby="wordle-entry-title" aria-describedby="wordle-entry-description"><div><h2 id="wordle-entry-title">Формула дня <span aria-hidden="true">↗</span></h2><p id="wordle-entry-description">Угадай формулу неорганического вещества из трёх элементов. Новое вещество каждый день.</p></div><span class="wordle-entry-mark" aria-hidden="true"><i></i><i></i><i></i></span></a>'+
 '<section class="panel periodic-panel"><div class="panel-heading"><div><h2>По элементам</h2><span class="panel-label">Периодическая система химических элементов Д. И. Менделеева</span></div></div>'+periodicTable()+'</section>'+
 '<div class="home-lower"><section class="panel"><div class="panel-heading"><h2>Реакции</h2></div><div class="entry-grid">'+entry('Все реакции',D.reactions.length,url('/reactions'))+entry('ОВР',D.statistics.redox_reactions,url('/reactions',{type:'redox'}))+entry('Не ОВР',D.statistics.non_redox_reactions,url('/reactions',{type:'nonredox'}))+'</div></section>'+
 '<section class="panel"><div class="panel-heading"><h2>Окислители и восстановители</h2></div><div class="entry-grid roles">'+entry('Окислители',D.statistics.oxidizer_substances,url('/roles/oxidizer'))+entry('Восстановители',D.statistics.reducer_substances,url('/roles/reducer'))+'</div></section></div><section class="panel trainer-panel" aria-labelledby="trainer-heading"><div><h2 id="trainer-heading">Тренажёр</h2><p class="small muted">Продукты, коэффициенты, названия и пропущенные вещества</p></div>'+link('Открыть тренажёр <span aria-hidden="true">↗</span>',url('/trainer'),'button primary')+'</section>';
}
function entry(label,count,href){return link('<span class="entry-label">'+label+'</span><strong>'+count+'</strong><span class="entry-arrow" aria-hidden="true">↗</span>',href,'entry');}
function classTree(c,element,root=true,seen=new Set()){
 if(seen.has(c.id))return '';seen=new Set(seen);seen.add(c.id);
 const count=classSubstances(c.id,element).length;if(!count)return '';
 const children=D.classes.filter(v=>v.parent_ids.includes(c.id)&&classSubstances(v.id,element).length);
 const item='<div class="tree-item">'+link(esc(c.name_ru),classUrl(c.id,element?{element}:{}),root?'tree-root':'')+'<span class="tree-count">'+count+'</span></div>';
 if(root&&children.length)return '<details class="panel tree-accordion"><summary><span>'+esc(c.name_ru)+'</span><span class="tree-count">'+count+'</span></summary><div class="tree-content">'+link('Все вещества раздела →',classUrl(c.id,element?{element}:{}),'tree-all-link')+'<div class="tree-children">'+children.map(child=>classTree(child,element,false,seen)).join('')+'</div></div></details>';
 return (root?'<section class="panel">':'')+item+(children.length?'<div class="tree-children">'+children.map(child=>classTree(child,element,false,seen)).join('')+'</div>':'')+(root?'</section>':'');
}
function classesPage(){return crumbs([['Вещества']])+heading('Вещества по классам','Все разделы базы с учётом вложенных классов.')+'<div class="filter-bar">'+link('Все вещества · '+D.substances.length+' ↗',url('/substances',{view:'all'}),'button small')+'</div><div class="tree">'+D.classes.filter(c=>!c.parent_ids.length).map(c=>classTree(c)).join('')+'</div>';}
function substanceTiles(substances){return '<div class="substance-grid">'+substances.map(s=>link('<div><span class="formula">'+formula(s.formula)+'</span><span class="tile-name">'+esc(s.names.systematic[0])+'</span><small>'+s.reaction_ids.length+' '+reactionWord(s.reaction_ids.length)+'</small></div><span class="tile-arrow" aria-hidden="true">↗</span>',substanceUrl(s),'substance-tile')).join('')+'</div>';}
function listLimit(p,defaultLimit=40){const n=Number(p.limit);return Number.isFinite(n)&&n>0?Math.min(2000,Math.floor(n)):defaultLimit;}
function more(total,shown,path,p){return total>shown?'<div class="more-row"><a class="button" data-load-more href="'+esc(url(path,{...p,limit:shown+40}))+'">Показать ещё</a><span>'+shown+' из '+total+'</span></div>':'';}
function substancesPage(p={}){
 const substances=groupSubstances(p).sort((a,b)=>compare(a.formula,b.formula));
 const c=cmap.get(p.class),e=emap.get(p.element);
 const title=c?esc(c.name_ru):e?'Вещества: '+esc(e.name_ru)+(p.state!==undefined?' ('+signed(Number(p.state))+')':''):'Все вещества';
 const count=substances.length+' '+substanceWord(substances.length);
 const children=c?D.classes.filter(v=>v.parent_ids.includes(c.id)&&classSubstances(v.id,p.element).length):[];
 const parentPath=c?'/class/'+c.id:'/substances';
 const limit=listLimit(p);
 return crumbs([['Вещества',url('/substances')],[title]])+heading(title,e?'В выборке только вещества, содержащие '+e.symbol+'.':'Выберите вещество, чтобы открыть его карточку.',count)+
 (c||e?'<div class="filter-bar">'+(c?'<span class="filter-chip">'+esc(c.name_ru)+'</span>':'')+(e?'<span class="filter-chip">'+e.symbol+(p.state!==undefined?' ('+signed(Number(p.state))+')':'')+'</span>':'')+link('Все реакции этой выборки ↗',url('/reactions',{class:p.class,element:p.element,state:p.state}),'button small')+'</div>':'')+
 (children.length?'<div class="filter-bar">'+children.map(v=>link(esc(v.name_ru)+' · '+classSubstances(v.id,p.element).length,classUrl(v.id,p.element?{element:p.element}:{}),'button small')).join('')+'</div>':'')+
 (substances.length?substanceTiles(substances.slice(0,limit)):'<p class="empty">В этой базе таких веществ не найдено.</p>')+more(substances.length,limit,parentPath,p);
}
function elementsPage(){return crumbs([['Элементы']])+heading('Химические элементы','Все элементы, представленные в сохранённых уравнениях.')+'<div class="element-page-grid">'+D.elements.map(elementTile).join('')+'</div>';}
function elementSubstances(symbol){
 const state=s=>Math.min(...s.sites.filter(site=>site.element===symbol).map(site=>site.oxidation_state));
 const classOrder=s=>Math.min(...s.class_ids.map(id=>cmap.get(id).sort_order));
 return groupSubstances({element:symbol}).sort((a,b)=>state(a)-state(b)||classOrder(a)-classOrder(b)||compare(a.formula,b.formula));
}
function elementPage(symbol,p){
 const e=emap.get(symbol);if(!e)return missing();
 const substances=groupSubstances({element:symbol});
 const view=['states','classes'].includes(p.view)?p.view:'all';
 const states=unique(substances.flatMap(s=>s.sites.filter(site=>site.element===symbol).map(site=>site.oxidation_state))).sort((a,b)=>a-b);
 let content='';
 if(view==='states')content='<div class="state-grid">'+states.map(n=>{const count=groupSubstances({element:symbol,state:String(n)}).length;return link('<strong>'+signed(n)+'</strong><span>'+count+' '+substanceWord(count)+'</span>',url('/substances',{element:symbol,state:n}),'oxidation-tile');}).join('')+'</div>';
 else if(view==='classes')content='<div class="tree">'+D.classes.filter(c=>!c.parent_ids.length).map(c=>classTree(c,symbol)).join('')+'</div>';
 else content=substanceTiles(elementSubstances(symbol));
 return crumbs([['Элементы',url('/elements')],[esc(e.name_ru)]])+heading(esc(e.name_ru)+' <span class="muted">'+e.symbol+'</span>','Вещества выбранного элемента и связанные с ними реакции.',substances.length+' '+substanceWord(substances.length))+
 '<div class="tabs" aria-label="Группировка веществ элемента">'+link('Все вещества элемента',url('/element/'+symbol),'button'+(view==='all'?' selected':''))+link('По степени окисления',url('/element/'+symbol,{view:'states'}),'button'+(view==='states'?' selected':''))+link('По классам веществ',url('/element/'+symbol,{view:'classes'}),'button'+(view==='classes'?' selected':''))+link('Все реакции элемента ↗',url('/reactions',{element:symbol}),'button')+link('Тренировать реакции элемента',url('/trainer',{element:symbol}),'button')+'</div>'+content;
}
function equation(r,highlight){return ['reactant','product'].map(side=>r.terms.filter(t=>t.side===side).map(t=>'<span class="term'+(t.substance_id===highlight?' highlight':'')+'">'+(t.coefficient==='1'?'':esc(t.coefficient))+formulaLink(smap.get(t.substance_id),t.formula)+(t.precipitate_mark?'↓':'')+(t.gas_mark?'↑':'')+'</span>').join('<span class="operator" aria-hidden="true">+</span>')).join('<span class="operator" aria-label="превращается в">→</span>');}
function reactionConditions(r){const labels=studentLabels(r);return labels.length?labels:r.conditions;}
function studentLabels(r){return unique((alternativeMap.get(r.id)||[]).flatMap(g=>g.variants.filter(v=>v.reaction_id===r.id).map(v=>v.student_label).filter(Boolean)));}
function agentLinks(list){return list.map(a=>formulaLink(smap.get(a.substance_id),a.formula)).join(', ');}
let alternativeSequence=0;
function linkedAlternatives(r){return unique((alternativeMap.get(r.id)||[]).flatMap(g=>g.reaction_ids)).filter(id=>id!==r.id&&rmap.has(id)).map(id=>rmap.get(id));}
function toggleAlternatives(button){
 const panel=document.getElementById(button.getAttribute('aria-controls'));
 const expanded=button.getAttribute('aria-expanded')==='true';
 if(!expanded&&!panel.dataset.loaded){
  const r=rmap.get(button.dataset.alternatives);
  panel.innerHTML='<p class="inline-alternatives-title">Альтернативные варианты</p>'+linkedAlternatives(r).map(other=>reactionCard(other,button.dataset.highlight||null,{nested:true})).join('');
  panel.dataset.loaded='true';
 }
 panel.hidden=expanded;button.setAttribute('aria-expanded',String(!expanded));
}
function reactionCard(r,highlight,options={}){
 const groups=alternativeMap.get(r.id)||[];
 const conditions=reactionConditions(r);
 const panelId=!options.nested&&linkedAlternatives(r).length?'reaction-alternatives-'+(++alternativeSequence):null;
 return '<article class="reaction-card" data-reaction-id="'+r.id+'"><div class="reaction-top"><div class="tag-row"><span class="tag'+(r.redox.is_redox?'':' neutral')+'">'+(r.redox.is_redox?'ОВР':'не ОВР')+'</span>'+(panelId?'<button type="button" class="tag alternative alternative-toggle" data-alternatives="'+r.id+'" data-highlight="'+esc(highlight||'')+'" aria-expanded="false" aria-controls="'+panelId+'">Есть альтернативный вариант <span class="alternative-chevron" aria-hidden="true">▾</span></button>':'')+'</div>'+(!options.detail?link('Открыть ↗',reactionUrl(r),'reaction-open'):'')+'</div><div class="equation">'+equation(r,highlight)+'</div>'+studentLabels(r).map(label=>'<p class="student-condition">'+esc(label)+'</p>').join('')+(!options.compact?'<details'+(options.open?' open':'')+'><summary>Условия и ОВР</summary><div class="reaction-extra"><div><span class="muted">Условия:</span> '+(conditions.length?esc(conditions.join('; ')):'не указаны')+'</div>'+(r.redox.is_redox?'<div class="role-links"><span>Окислитель: '+agentLinks(r.redox.oxidizers)+'</span><span>Восстановитель: '+agentLinks(r.redox.reducers)+'</span></div>':'')+(groups.some(g=>g.condition_status==='difference_not_fully_specified')?'<div class="muted">Различия условий альтернативных вариантов указаны не полностью.</div>':'')+'</div></details>':'')+(panelId?'<div class="inline-alternatives" id="'+panelId+'" hidden></div>':'')+'</article>';
}
function reactionList(reactions,highlight,p,path,defaultLimit=10){const limit=listLimit(p,defaultLimit);return reactions.length?'<div class="reaction-list" aria-live="polite">'+reactions.slice(0,limit).map(r=>reactionCard(r,highlight)).join('')+'</div>'+more(reactions.length,limit,path,p):'<p class="empty" role="status">В этой базе подходящих реакций не найдено.</p>';}
function substancesIds(s,side){return side==='reactant'?s.reactant_ids:side==='product'?s.product_ids:s.reaction_ids;}
function substancePage(id,p){
 const s=smap.get(id);if(!s)return missing();
 const side=['all','reactant','product'].includes(p.side)?p.side:'reactant';
 const type=['all','redox','nonredox'].includes(p.type)?p.type:'all';
 const order=p.order==='redox'?'redox':'side';
 const base={...p,side,type,order};delete base.limit;
 const selected=filteredReactions({substance:s.id,side,type});
 const parentType=order==='redox'?type:'all';
 const parentSide=order==='side'?side:'all';
 const sideRow='<div class="selector-row"><span class="selector-label">Участие</span>'+[['all','Все реакции'],['reactant','Как реагент'],['product','Как продукт']].map(([v,label])=>{const count=filteredReactions({substance:s.id,side:v,type:parentType}).length;const params={...base,side:v,companion:null};if(order==='side')params.type='all';return link(label+' <span>'+count+'</span>',substanceUrl(s,params),'button'+(side===v?' selected':''));}).join('')+'</div>';
 const typeRow='<div class="selector-row"><span class="selector-label">Тип реакции</span>'+[['all','Все реакции'],['redox','ОВР'],['nonredox','не ОВР']].map(([v,label])=>{const count=filteredReactions({substance:s.id,side:parentSide,type:v}).length;const params={...base,type:v,companion:null};if(order==='redox')params.side='all';return link(label+' <span>'+count+'</span>',substanceUrl(s,params),'button'+(type===v?' selected':''));}).join('')+'</div>';
 const partners=new Map();
 for(const r of selected){const counterpart=side==='reactant'?'product':side==='product'?'reactant':null;for(const sid of unique(r.terms.filter(t=>t.substance_id!==s.id&&(!counterpart||t.side===counterpart)).map(t=>t.substance_id))){if(!partners.has(sid))partners.set(sid,new Set());partners.get(sid).add(r.id);}}
 const sortedPartners=[...partners].sort((a,b)=>b[1].size-a[1].size||compare(smap.get(a[0]).formula,smap.get(b[0]).formula));
 const companion=p.companion&&partners.has(p.companion)?p.companion:null;
 const visible=companion?selected.filter(r=>partners.get(companion).has(r.id)):selected;
 const connections=p.connections==='all'?sortedPartners:sortedPartners.slice(0,6);
 const inventory=unique(s.sites.map(site=>site.element+'|'+site.oxidation_state)).map(v=>{const [symbol,state]=v.split('|');return link(symbol+' <strong>'+signed(Number(state))+'</strong>',url('/substances',{element:symbol,state}),'state-pair');}).join('');
 return crumbs([['Вещества',url('/substances')],[formula(s.formula)]])+
 '<section class="passport"><div class="passport-main"><div><div class="eyebrow">Карточка вещества</div><h1>'+formula(s.formula)+'</h1>'+substanceNames(s)+'<div class="class-tags">'+s.class_ids.map(id=>link(esc(cmap.get(id).name_ru),classUrl(id),'class-tag')).join('')+'</div>'+(s.formula_aliases.length>1?'<div class="aliases">Варианты записи: '+s.formula_aliases.map(formula).join(' · ')+'</div>':'')+'</div><div class="passport-count"><strong>'+s.reaction_ids.length+'</strong>'+reactionWord(s.reaction_ids.length)+' в базе</div></div><div class="oxidation-line"><span class="small muted">Степени окисления</span>'+inventory+'</div></section>'+
 '<div class="substance-toolbar"><label class="order-picker">Порядок выбора <select id="filter-order" data-substance="'+id+'"><option value="side"'+(order==='side'?' selected':'')+'>Участие → тип реакции</option><option value="redox"'+(order==='redox'?' selected':'')+'>Тип реакции → участие</option></select></label><button class="button ghost small" type="button" data-share>Скопировать ссылку ↗</button></div>'+
 '<div class="selection-panel">'+(order==='side'?sideRow+typeRow:typeRow+sideRow)+'</div>'+
 '<div class="section-heading"><h2>Реакции вещества</h2><div class="trainer-entry-actions">'+link('Потренироваться',url('/trainer',{substance:s.id,side,type,companion}),'button small')+link('Все реакции выборки · '+visible.length+' ↗',url('/reactions',{substance:s.id,side,type,companion}),'button small')+'</div></div>'+
 (partners.size?'<section class="section-space"><div class="section-heading"><h3>Связанные вещества</h3>'+(sortedPartners.length>6?link(p.connections==='all'?'Свернуть':'Все · '+sortedPartners.length,substanceUrl(s,{...base,connections:p.connections==='all'?null:'all'}),'plain-link'):'')+'</div><div class="connections">'+connections.map(([sid,ids])=>'<button class="connection" type="button" data-companion="'+sid+'" aria-pressed="'+(companion===sid)+'"><strong>'+formula(smap.get(sid).formula)+'</strong><span>'+ids.size+' '+reactionWord(ids.size)+'</span></button>').join('')+'</div></section>':'')+
 (companion?'<div class="filter-bar"><span class="filter-chip">'+formula(smap.get(companion).formula)+'</span>'+link('Показать всю выборку',substanceUrl(s,{...base,companion:null}),'plain-link')+'</div>':'')+
 '<div class="section-heading section-space"><span class="muted small">'+visible.length+' '+reactionWord(visible.length)+(side!=='all'?' · '+(side==='reactant'?'как реагент':'как продукт'):'')+(type!=='all'?' · '+(type==='redox'?'ОВР':'не ОВР'):'')+'</span></div>'+reactionList(visible,s.id,{...p,side,type,order},'/substance/'+id,6);
}
function reactionsPage(p){
 const reactions=filteredReactions(p);const s=smap.get(p.substance);const e=emap.get(p.element);const c=cmap.get(p.class);
 const title=p.role&&s?formula(s.formula)+' · '+(p.role==='oxidizer'?'как окислитель':'как восстановитель'):s?'Реакции '+formula(s.formula):e?'Реакции элемента '+e.symbol:p.type==='redox'?'Окислительно-восстановительные реакции':p.type==='nonredox'?'Реакции без изменения степеней окисления':p.q?'Результаты поиска':'Все реакции';
 const type=p.type||'all';
 const filters='<div class="filter-bar"><label>Тип <select id="reaction-type"><option value="all"'+(type==='all'?' selected':'')+'>Все реакции</option><option value="redox"'+(type==='redox'?' selected':'')+'>ОВР</option><option value="nonredox"'+(type==='nonredox'?' selected':'')+'>не ОВР</option></select></label>'+(s?'<span class="filter-chip">'+formula(s.formula)+(p.side==='reactant'?' · как реагент':p.side==='product'?' · как продукт':'')+'</span>':'')+(c?'<span class="filter-chip">'+esc(c.name_ru)+'</span>':'')+(e?'<span class="filter-chip">'+e.symbol+(p.state!==undefined?' ('+signed(Number(p.state))+')':'')+'</span>':'')+(p.q?'<span class="filter-chip">'+esc(p.q)+'</span>':'')+'<button type="button" class="button ghost small" data-share>Скопировать ссылку ↗</button></div>';
 return crumbs([['Реакции',url('/reactions')],[p.role?'Выборка по роли':p.q?'Поиск':'Текущая выборка']])+heading(title,p.role?'Только те реакции, в которых вещество выполняет выбранную роль.':'Полные уравнения со ссылками на вещества.',reactions.length+' '+reactionWord(reactions.length))+filters+'<div class="filter-bar">'+link('Тренировать эту выборку',url('/trainer',p),'button small')+'</div>'+(p.q&&searchSubstances(p.q).length?'<section class="search-substances"><div class="section-heading"><h2>Вещества</h2><span class="small muted">'+searchSubstances(p.q).length+'</span></div>'+substanceTiles(searchSubstances(p.q))+'</section><h2 class="search-reactions-title">Реакции</h2>':'')+reactionList(reactions,s?.id,p,'/reactions');
}
function rolesPage(role,p){
 if(!['oxidizer','reducer'].includes(role))return missing();
 const key=role==='oxidizer'?'oxidizer_ids':'reducer_ids';
 const substances=D.substances.filter(s=>s[key].length).sort((a,b)=>compare(a.formula,b.formula));
 const limit=listLimit(p);
 return crumbs([['ОВР',url('/reactions',{type:'redox'})],[role==='oxidizer'?'Окислители':'Восстановители']])+heading(role==='oxidizer'?'Окислители':'Восстановители','Формула открывает карточку вещества. Число справа — только реакции в выбранной роли.',substances.length+' '+substanceWord(substances.length))+
 '<table class="role-table"><thead><tr><th>Вещество</th><th>Реакций в этой роли</th></tr></thead><tbody>'+substances.slice(0,limit).map(s=>'<tr><td>'+link(formula(s.formula),substanceUrl(s),'role-formula')+'</td><td>'+link(s[key].length+' <span aria-hidden="true">→</span>',url('/reactions',{substance:s.id,role}),'role-count')+'</td></tr>').join('')+'</tbody></table>'+more(substances.length,limit,'/roles/'+role,p)+'<p class="home-bottom-note">Роль относится к конкретной реакции. Одно вещество может находиться в обоих списках.</p>';
}
function reactionPage(id){
 const r=rmap.get(id);if(!r)return missing();
 const groups=alternativeMap.get(r.id)||[];
 const alternatives=unique(groups.flatMap(g=>g.reaction_ids)).filter(id=>id!==r.id).map(id=>rmap.get(id));
 const changes=r.redox.changes||[];
 return crumbs([['Реакции',url('/reactions')],['Карточка реакции']])+heading('Уравнение реакции','Каждая формула ведёт в карточку вещества.')+
 reactionCard(r,null,{detail:true})+'<div class="filter-bar section-space"><button type="button" class="button small" data-share>Скопировать ссылку ↗</button>'+link('Все реакции',url('/reactions'),'button small')+'</div>'+
 '<div class="detail-grid"><section class="panel"><h2>Условия реакции</h2><div class="section-space">'+(studentLabels(r).length?studentLabels(r).map(label=>'<p>'+esc(label)+'</p>').join(''):reactionConditions(r).length?reactionConditions(r).map(c=>'<p>'+esc(c)+'</p>').join(''):'<p class="small muted">Условия не указаны.</p>')+'</div></section><section class="panel"><h2>'+(r.redox.is_redox?'Окисление и восстановление':'Тип реакции')+'</h2>'+(r.redox.is_redox?'<div class="small role-links"><span>Окислитель: '+agentLinks(r.redox.oxidizers)+'</span><span>Восстановитель: '+agentLinks(r.redox.reducers)+'</span></div><div class="changes section-space">'+changes.map(c=>'<div class="change-row"><div>'+esc(c.element)+'('+signed(c.from_state)+') → '+esc(c.element)+'('+signed(c.to_state)+')</div><span>'+esc(c.total_electrons)+' e⁻ · '+(c.role==='oxidizer'?'восстановление':'окисление')+'</span></div>').join('')+'</div><p class="small muted section-space">Формальная схема изменения степеней окисления.</p>':'<span class="tag neutral">не ОВР</span><p class="small muted section-space">Изменения степеней окисления в принятой разметке отсутствуют.</p>')+'</section></div>'+
 (alternatives.length?'<section class="section-space"><h2>Альтернативные варианты</h2>'+groups.filter(g=>g.condition_status==='difference_not_fully_specified').map(g=>'<p class="warning-note">'+esc(g.comparison_note)+'</p>').join('')+'<div class="alternative-list section-space">'+alternatives.map(r=>reactionCard(r,null,{compact:true})).join('')+'</div></section>':'');
}
function missing(){return heading('Страница не найдена')+'<p class="empty">Такого раздела или объекта в текущей версии базы нет. '+link('Перейти на главную',url('/'))+'</p>';}
function render(){
 current=parseRoute();const {path,params:p}=current;const parts=path.split('/').filter(Boolean);let content='';
 if(path==='/')content=home();
 else if(path==='/classes')content=classesPage();
 else if(parts[0]==='class'){if(!cmap.has(parts[1]))content=missing();else content=substancesPage({...p,class:parts[1]});}
 else if(path==='/substances')content=Object.keys(p).length?substancesPage(p):classesPage();
 else if(path==='/elements')content=elementsPage();
 else if(parts[0]==='element')content=elementPage(parts[1],p);
 else if(parts[0]==='substance')content=substancePage(parts[1],p);
 else if(path==='/reactions')content=reactionsPage(p);
 else if(path==='/trainer')content=trainer.render(p);
 else if(parts[0]==='reaction')content=reactionPage(parts[1]);
 else if(parts[0]==='roles')content=rolesPage(parts[1],p);
 else content=missing();
 main.innerHTML=content;
 updatePeriodicView();
 if(path==='/trainer')trainer.mount();
 document.body.classList.toggle('home',path==='/');
 const nav=path==='/'?'home':path==='/trainer'?'trainer':['class','classes','elements','element','substance','substances'].includes(parts[0])?'substances':'reactions';
 document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===nav);if(a.dataset.nav===nav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.title=(main.querySelector('h1')?.textContent||'Атлас реакций')+' · ЕГЭ по химии';
 if(p.q)document.getElementById('query').value=p.q;
 document.getElementById('search-suggestions').hidden=true;
}
function navigate(path,p){const target=url(path,p);if(location.hash===target){render();scrollToStart();}else location.hash=target;}
window.addEventListener('hashchange',()=>{render();scrollToStart();});
window.addEventListener('pageshow',scrollToStart);
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const anchor=event.target.closest('a[href]');
 if(anchor&&anchor.getAttribute('href')===location.hash){event.preventDefault();render();scrollToStart();}
});
document.getElementById('global-search').addEventListener('submit',event=>{
 event.preventDefault();const q=normalize(document.getElementById('query').value);const named=D.substances.filter(s=>nameIndex.get(s.id).includes(normalizeName(q)));const exact=aliases.get(q)||(named.length===1?named[0]:null);
 if(exact)navigate('/substance/'+exact.id,{});else navigate('/reactions',q?{q}:{});
});
const queryInput=document.getElementById('query');const suggestions=document.getElementById('search-suggestions');
queryInput.addEventListener('input',()=>{
 const q=normalize(queryInput.value);if(!q){suggestions.hidden=true;return;}
 const hits=searchSubstances(q).slice(0,7);
 suggestions.innerHTML=hits.map(s=>{const matched=namesOf(s).find(n=>normalizeName(n).includes(normalizeName(q)))||s.names.systematic[0];return link('<span class="suggestion-substance"><span class="suggestion-formula">'+formula(s.formula)+'</span><span class="suggestion-name">'+esc(matched)+'</span></span><small>'+s.reaction_ids.length+' '+reactionWord(s.reaction_ids.length)+' ↗</small>',substanceUrl(s));}).join('')+link('<span>Все результаты: '+esc(q)+'</span><small>→</small>',url('/reactions',{q}));
 suggestions.hidden=false;
});
queryInput.addEventListener('keydown',event=>{if(event.key==='Escape')suggestions.hidden=true;if(event.key==='ArrowDown'&&!suggestions.hidden){event.preventDefault();suggestions.querySelector('a')?.focus();}});
document.addEventListener('click',event=>{if(!document.getElementById('search-shell').contains(event.target))suggestions.hidden=true;});
main.addEventListener('change',event=>{
 if(event.target.id==='filter-order')navigate(current.path,{...current.params,order:event.target.value,limit:null});
 if(event.target.id==='reaction-type')navigate(current.path,{...current.params,type:event.target.value,limit:null});
});
let toastTimer;
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},2400);}
main.addEventListener('click',async event=>{
 const alternativeButton=event.target.closest('[data-alternatives]');
 if(alternativeButton){toggleAlternatives(alternativeButton);return;}
 const moreLink=event.target.closest('[data-load-more]');
 if(moreLink&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){
  event.preventDefault();const top=window.scrollY,left=window.scrollX;
  history.replaceState(history.state,'',moreLink.href);render();
  window.scrollTo({top,left,behavior:'instant'});return;
 }
 if(event.target.closest('[data-periodic-zoom]')){periodicExpanded=!periodicExpanded;updatePeriodicView();return;}
 const companion=event.target.closest('[data-companion]');
 if(companion)navigate(current.path,{...current.params,companion:current.params.companion===companion.dataset.companion?null:companion.dataset.companion,limit:null});
 const share=event.target.closest('[data-share]');
 if(share){try{await navigator.clipboard.writeText(location.href);toast('Ссылка скопирована');}catch{let input=document.getElementById('copy-fallback');if(!input){input=document.createElement('input');input.id='copy-fallback';input.className='copy-fallback';input.readOnly=true;input.setAttribute('aria-label','Ссылка на текущую страницу');share.parentElement.append(input);}input.value=location.href;input.focus();input.select();toast('Выделенную ссылку можно скопировать');}}
});
render();scrollToStart();
})();
