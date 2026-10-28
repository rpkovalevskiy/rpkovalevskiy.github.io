window.mountChemWordle=function(){
'use strict';
const E=window.ChemWordle,D=window.WORDLE_DATA,main=document.getElementById('main');
const key='chemistry-wordle-v2',rulesKey=key+'-rules-seen';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formula=f=>esc(f).replace(/(\d+)/g,'<sub>$1</sub>');
let records={},seen=false,storageWorks=true,day,answer,record;
try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))records=saved;seen=localStorage.getItem(rulesKey)==='1';}catch{storageWorks=false;}
function save(){try{localStorage.setItem(key,JSON.stringify(records));}catch{storageWorks=false;}}
document.getElementById('search-shell').hidden=true;
document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.remove('active');a.removeAttribute('aria-current');});
document.getElementById('dataset-label').textContent='Ежедневная игра';
function status(message){document.getElementById('wd-message').textContent=message;}
function row(f,i){
 const guess=E.parse(f),colors=E.compare(guess,answer),labels={exact:'элемент и количество совпали',present:'количество отличается',absent:'элемента нет'};
 const colored=formula(f).replace(/([A-Z][a-z]?)(<sub>\d+<\/sub>)?/g,(_,s,n)=>'<span class="wd-token wd-'+colors[s]+'" aria-label="'+s+': '+labels[colors[s]]+'">'+s+(n||'')+'</span>');
 return '<li class="wd-row"><span class="wd-attempt">'+(i+1)+'</span><span class="wd-formula" aria-label="'+esc(f)+'">'+colored+'</span></li>';
}
function shareText(includeUrl=true){return 'Формула дня №'+day.number+' · '+(record.won?record.guesses.length:'X')+'/6'+(day.test?' · тест':'')+'\n\n'+record.guesses.map(f=>E.shareRow(E.parse(f),answer)).join('\n')+(includeUrl?'\n\nhttps://chem.rost.love/fordle':'');}
function render(){
 const s=E.stats(records,day.date),done=record.finished;
 main.innerHTML='<div class="wd-page"><a class="back-link" href="/inorganic/#/">← База реакций</a><header class="wd-heading"><div class="eyebrow">'+new Intl.DateTimeFormat('ru-RU',{dateStyle:'long',timeZone:'UTC'}).format(new Date(day.date+'T00:00:00Z'))+'</div><h1>Формула дня <span>№'+String(day.number).replace('-','−')+'</span></h1><p>Угадай формулу неорганического вещества из трёх элементов. Новое вещество каждый день.</p><p class="wd-source">Формулы из <a href="/inorganic/#/substances">базы второй части ЕГЭ по химии</a>.</p></header>'+
 (day.test?'<div class="wd-test">Тестовый день. Первая игра — в понедельник, 26 октября. Тестовые результаты не входят в серию побед.</div>':'')+
 '<details class="wd-rules"'+(!seen?' open':'')+'><summary>Как играть</summary><div><p>У тебя 6 попыток. Введи формулу и нажми «Проверить».</p><ul><li><span class="wd-dot wd-exact" aria-hidden="true"></span>Элемент и количество его атомов совпали.</li><li><span class="wd-dot wd-present" aria-hidden="true"></span>Элемент есть, но количество атомов отличается.</li><li><span class="wd-dot wd-absent" aria-hidden="true"></span>Элемента в ответе нет.</li></ul><p>Цвет подтверждает только наличие и количество элемента, а не его местоположение в формуле.</p><p>Непринятый ввод не расходует попытку.</p><button type="button" class="button small" id="wd-hide-rules">Скрыть правила</button></div></details>'+
 '<section class="wd-board panel" aria-label="Попытки"><div class="wd-board-top"><span id="wd-counter">'+record.guesses.length+' из 6 попыток</span><span>Обновление в 00:00 МСК</span></div>'+
 (!done?'<form id="wd-form" novalidate><label for="wd-input">Формула вещества</label><div class="wd-input-line"><input id="wd-input" name="formula" maxlength="120" placeholder="Например, Na2SO4" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-describedby="wd-input-hint wd-message"><button class="button primary" type="submit">Проверить</button></div><p class="wd-hint" id="wd-input-hint">Латинские символы с верным регистром. Индексы можно вводить обычными цифрами.</p></form>':'<div class="wd-result"><h2>'+(record.won?'Формула угадана!':'Попытки закончились')+'</h2><a class="wd-answer" href="/inorganic/#/substance/'+esc(day.id)+'?side=all">'+formula(day.formula)+' <span aria-hidden="true">↗</span></a><p>'+esc(day.name)+' · <a href="/inorganic/#/substance/'+esc(day.id)+'?side=all">Посмотреть реакции</a></p><p class="wd-next">Следующая формула — в 00:00 по Москве.</p><div class="wd-share"><button class="button primary" id="wd-share" type="button">Поделиться</button><button class="button" id="wd-copy" type="button">Скопировать результат</button></div><textarea id="wd-copy-fallback" rows="10" readonly aria-label="Результат для копирования" hidden></textarea></div>')+
 '<div id="wd-feedback" aria-live="polite"><p id="wd-message" role="status"></p><div id="wd-suggestions"></div></div>'+
 '<ol class="wd-rows">'+record.guesses.map(row).join('')+Array.from({length:6-record.guesses.length},(_,i)=>'<li class="wd-row wd-empty" aria-label="Попытка '+(record.guesses.length+i+1)+', ещё не использована"><span class="wd-attempt">'+(record.guesses.length+i+1)+'</span><span class="wd-empty-cells" aria-hidden="true"><i></i><i></i><i></i></span></li>').join('')+'</ol>'+'</section>'+
 '<section class="wd-stats" aria-label="Статистика"><div><strong>'+s.played+'</strong><span>сыграно</span></div><div><strong>'+s.won+'</strong><span>побед</span></div><div><strong>'+s.current+'</strong><span>дней подряд</span></div><div><strong>'+s.best+'</strong><span>лучшая серия</span></div></section><p class="wd-storage">Попытки и статистика сохраняются в этом браузере на этом устройстве.</p></div>';
 const details=main.querySelector('details');
 details.addEventListener('toggle',()=>{seen=true;try{localStorage.setItem(rulesKey,'1');}catch{}});
 if(!seen){seen=true;try{localStorage.setItem(rulesKey,'1');}catch{}}
 document.getElementById('wd-hide-rules').onclick=()=>{details.open=false;details.querySelector('summary').focus();};
 document.getElementById('wd-form')?.addEventListener('submit',submit);
 document.getElementById('wd-input')?.addEventListener('input',()=>{status('');document.getElementById('wd-suggestions').replaceChildren();});
 document.getElementById('wd-copy')?.addEventListener('click',copy);
 document.getElementById('wd-share')?.addEventListener('click',()=>{
  status('');
  const payload={title:'Формула дня №'+day.number,text:shareText(false),url:'https://chem.rost.love/fordle'};
  window.WordleSharing.share(navigator,payload,()=>openShareOptions(payload));
 });
 if(!storageWorks)status('Браузер не позволяет сохранить результат. Пока страница открыта, можно продолжать играть.');
}
function openShareOptions(payload){
 const links=window.WordleSharing.links(payload);
 let dialog=document.getElementById('wd-share-dialog');
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='wd-share-dialog';dialog.className='wd-share-dialog';dialog.setAttribute('aria-labelledby','wd-share-title');
  dialog.innerHTML='<form method="dialog"><button class="wd-share-close" aria-label="Закрыть" type="submit">×</button></form><h2 id="wd-share-title">Поделиться результатом</h2><p>Системное меню отправки недоступно в этом браузере. Выберите приложение:</p><div class="wd-share-options"><a class="button primary" data-send-telegram target="_blank" rel="noopener noreferrer">Telegram</a><a class="button" data-send-x target="_blank" rel="noopener noreferrer">X (Twitter)</a></div><p class="wd-share-note">Чтобы выбрать другое приложение, откройте игру в обычном браузере.</p>';
  document.body.append(dialog);
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
 }
 dialog.querySelector('[data-send-telegram]').href=links.telegram;
 dialog.querySelector('[data-send-x]').href=links.x;
 if(!dialog.open)dialog.showModal();
}
async function copy(){try{await navigator.clipboard.writeText(shareText());status('Результат скопирован — его можно вставить в сообщение или пост.');}catch{const field=document.getElementById('wd-copy-fallback');field.hidden=false;field.value=shareText();field.focus();field.select();status('Выделенный результат можно скопировать.');}}
function submit(event){
 event.preventDefault();if(ensureDay())return;if(record.finished)return;
 const input=document.getElementById('wd-input'),result=E.validate(input.value,D.registry);
 document.getElementById('wd-suggestions').replaceChildren();
 if(result.error){status(result.error);for(const entry of result.suggestions||[]){const b=document.createElement('button');b.type='button';b.className='button small';b.innerHTML='<span>'+formula(entry.formula)+'</span>';b.onclick=()=>{input.value=entry.formula;status('');document.getElementById('wd-suggestions').replaceChildren();input.focus();};document.getElementById('wd-suggestions').append(b);}return;}
 if(record.guesses.includes(result.parsed.formula)){status('Эта формула уже была введена. Попробуйте другую.');return;}
 record.guesses.push(result.parsed.formula);record.won=E.solved(result.parsed,answer);record.finished=record.won||record.guesses.length===6;records[day.date]=record;save();render();if(!record.finished)document.getElementById('wd-input').focus();else main.querySelector('.wd-result').scrollIntoView({block:'nearest',behavior:'smooth'});
}
function ensureDay(){
 const date=E.moscowDate();if(day?.date===date)return false;
 day=E.puzzle(D.schedule,date);if(!day){main.innerHTML='<div class="wd-page"><h1>Формула дня</h1><p class="section-space">Новая подборка формул готовится. Загляните позже.</p><a href="/inorganic/#/">Перейти в базу реакций</a></div>';return true;}
 answer=E.parse(day.formula);const stored=records[date];
 const guesses=stored?.answerId===day.id&&Array.isArray(stored.guesses)?stored.guesses.filter(f=>typeof f==='string'&&!E.validate(f,D.registry).error).slice(0,6):[];
 const winAt=guesses.findIndex(f=>E.solved(E.parse(f),answer));if(winAt>=0)guesses.splice(winAt+1);
 record={date,answerId:day.id,guesses,won:winAt>=0,finished:winAt>=0||guesses.length===6};records[date]=record;
 document.title='Формула дня №'+day.number+' · ЕГЭ по химии';
 document.querySelector('link[rel="canonical"]').href='https://chem.rost.love/fordle';render();return true;
}
ensureDay();setInterval(ensureDay,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)ensureDay();});window.addEventListener('pageshow',ensureDay);
window.addEventListener('storage',event=>{if(event.key!==key)return;try{const next=JSON.parse(event.newValue||'{}');if(next&&typeof next==='object'&&!Array.isArray(next)){records=next;day=null;ensureDay();}}catch{}});
};
