import {loadProgress,completedTasks,matchesElements,chooseTaskIndex} from './session.js';
const db=window.ORGANIC_DATA,$=id=>document.getElementById(id),chosen=new Set();let saved=loadProgress(),completed=completedTasks(saved);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const available=['C','H','O','N','S','Cl','Br','Na','K','Ba','Ag'].filter(e=>db.tasks.some(t=>t.ratio[e]));
function render(){
 $('element-filters').innerHTML=available.map(e=>`<button data-filter="${e}" class="element-filter ${chosen.has(e)?'active':''}" aria-pressed="${chosen.has(e)}">${e}</button>`).join('');
 const tasks=db.tasks.map((t,i)=>({t,i})).filter(({t})=>matchesElements(t,chosen));$('catalog-count').textContent=`Заданий: ${tasks.length} из ${db.tasks.length}`;$('clear-filters').disabled=!chosen.size;
 $('task-cards').innerHTML=tasks.map(({t,i})=>`<article class="task-card ${completed.has(t.id)?'is-completed':''}"><div class="task-card-top"><span>Задание ${String(i+1).padStart(2,'0')}</span><button class="info-button" data-info="${i}" aria-label="Условие задания ${i+1}" aria-expanded="false" aria-controls="condition-${i}">i</button></div><a class="task-card-link" href="./?task=${encodeURIComponent(t.id)}" aria-label="Открыть задание ${i+1}, ${esc(Object.keys(t.ratio).join(' : '))} = ${Object.values(t.ratio).join(' : ')}"><div class="card-elements">${esc(Object.keys(t.ratio).join(' : '))}</div><div class="card-ratio">${Object.values(t.ratio).join(' : ')}</div><span class="card-status">${completed.has(t.id)?'✓ Решено':'Открыть задание →'}</span></a><p id="condition-${i}" class="card-condition" hidden>${esc(t.condition)}</p></article>`).join('')||'<div class="catalog-empty">Таких заданий нет. Попробуйте убрать один из элементов.</div>';
 $('catalog-random').textContent=db.tasks.every(t=>completed.has(t.id))?'Случайное для повторения →':'Случайное нерешённое →';$('catalog-progress').textContent=`${db.tasks.filter(t=>completed.has(t.id)).length} / ${db.tasks.length} решено`;
}
$('element-filters').onclick=e=>{const b=e.target.closest('[data-filter]');if(!b)return;chosen.has(b.dataset.filter)?chosen.delete(b.dataset.filter):chosen.add(b.dataset.filter);render();};
$('clear-filters').onclick=()=>{chosen.clear();render();};
$('task-cards').onclick=e=>{const b=e.target.closest('[data-info]');if(!b)return;const p=$(`condition-${b.dataset.info}`);p.hidden=!p.hidden;b.setAttribute('aria-expanded',!p.hidden);};
$('catalog-random').onclick=()=>{const i=chooseTaskIndex(db.tasks,completed);location.href=`./?task=${encodeURIComponent(db.tasks[i].id)}`;};
render();

window.addEventListener('pageshow',e=>{if(e.persisted){saved=loadProgress();completed=completedTasks(saved);render();}});
