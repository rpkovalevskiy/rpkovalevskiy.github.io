(function(){
 'use strict';
 window.createChemistryTrainer=function(data,helpers){
  const {esc,formula,crumbs,heading,url,link,filteredReactions,compare}=helpers;
  const E=window.createTrainerEngine(data);
  const modes=[
   ['products','Продукты реакции','Допишите правую часть без коэффициентов.'],
   ['full','Продукты и коэффициенты','Составьте продукты, затем уравняйте реакцию.'],
   ['balance','Уравнивание ОВР','Расставьте коэффициенты в готовой реакции.'],
   ['missing','Пропущенное вещество','Восстановите участника ОВР с изменением степени окисления.'],
   ['names','Название — формула','Переведите название в формулу или наоборот.'],
   ['roles','Роли в ОВР','Определите роли всех исходных веществ.'],
   ['electrons','Электронный баланс','Запишите строки переноса электронов и уравняйте реакцию.'],
   ['conditions','Условия и продукты','Сопоставьте условия с уравнениями реакции.'],
   ['memo','Тривиальное мемо','Найдите пары: формула и обязательное тривиальное название.']
  ];
  let settings=null,session=null,routeKey='',context={},host=null,formError='';
  const sortedSubstances=[...data.substances].sort((a,b)=>compare(a.formula,b.formula));
  const sourcePool=()=>settings.scope==='selection'?filteredReactions(context):data.reactions;
  const options=(entries,value)=>entries.map(([v,label])=>'<option value="'+esc(v)+'"'+(v===value?' selected':'')+'>'+esc(label)+'</option>').join('');
  const modeTitle=()=>modes.find(m=>m[0]===settings.mode)[1];
  const roleLabels=[['oxidizer','Окислитель'],['reducer','Восстановитель'],['both','Обе роли'],['none','Не участвует в переносе электронов']];
  const displayName=n=>esc(n.label);
  function defaultSettings(params){
   context=Object.fromEntries(Object.entries(params).filter(([k])=>['substance','side','type','element','class','state','role','q','companion'].includes(k)));
   const compound=Object.keys(context).some(k=>['state','role','q','companion'].includes(k))||['substance','element','class'].filter(k=>context[k]).length>1;
   return {mode:modes.some(m=>m[0]===params.mode)?params.mode:'products',scope:compound?'selection':params.substance?'substance':params.element?'element':params.class?'class':'all',substance:params.substance||'',element:params.element||'',class:params.class||'',side:params.side||'all',type:params.type||'all',presentation:'formulas',direction:'name-to-formula',checking:'input',count:params.mode==='memo'?6:10};
  }
  function selectionLabel(){
   const labels=[];
   if(context.substance&&E.substances.has(context.substance))labels.push(E.substances.get(context.substance).formula);
   if(context.element)labels.push('элемент '+context.element);
   if(context.class)labels.push(data.classes.find(c=>c.id===context.class)?.name_ru||context.class);
   if(context.state!==undefined)labels.push('степень окисления '+context.state);
   if(context.role)labels.push(context.role==='oxidizer'?'окислитель':'восстановитель');
   if(context.q)labels.push('поиск: '+context.q);
   if(context.type&&context.type!=='all')labels.push(context.type==='redox'?'ОВР':'не ОВР');
   return labels.join(' · ')||'Выборка из каталога';
  }
  function available(){return E.pool(settings,sourcePool());}
  function clampCount(){const n=available().length;if(n)settings.count=Math.max(1,Math.min(Number(settings.count)||10,n));}
  function readForm(){
   const form=host?.querySelector('#trainer-settings');if(!form)return;
   const values=new FormData(form);
   for(const key of ['mode','scope','element','class','side','type','presentation','direction','checking','count'])if(values.has(key))settings[key]=values.get(key);
   const field=form.querySelector('#trainer-substance');
   if(field){
    const text=field.value.trim();
    const named=sortedSubstances.filter(s=>[...s.names.systematic,...s.names.trivial_required,...s.names.trivial_optional].some(n=>E.nameKey(typeof n==='string'?n:n.name)===E.nameKey(text)));
    const selected=sortedSubstances.find(s=>text===s.formula+' — '+(typeof s.names.systematic[0]==='string'?s.names.systematic[0]:s.names.systematic[0].name))||sortedSubstances.find(s=>s.formula_aliases.some(f=>E.formulaKey(f)===E.formulaKey(text)))||(named.length===1?named[0]:null);
    settings.substance=selected?.id||'';
   }
  }
  function setup(){
   const total=available().length;
   const substance=E.substances.get(settings.substance);
   const scopeOptions=[['all','Вся база'],['substance','С конкретным веществом'],['element','С конкретным элементом'],['class','С классом веществ']];
   if(Object.keys(context).length)scopeOptions.push(['selection','Текущая выборка каталога']);
   return '<form id="trainer-settings" class="trainer-settings">'+
    '<section class="panel"><h2>Что тренируем</h2><div class="trainer-modes">'+modes.map(([id,title,description])=>'<label class="trainer-mode"><input type="radio" name="mode" value="'+id+'"'+(settings.mode===id?' checked':'')+'><span><strong>'+title+'</strong><small>'+description+'</small></span></label>').join('')+'</div></section>'+
    '<section class="panel trainer-options"><h2>Настройки тренировки</h2><div class="trainer-fields">'+
    '<label class="trainer-field">Тема<select name="scope">'+options(scopeOptions,settings.scope)+'</select></label>'+
    (settings.scope==='substance'?'<label class="trainer-field">Вещество<input id="trainer-substance" list="trainer-substance-list" autocomplete="off" placeholder="Формула или выберите название" value="'+esc(substance?substance.formula+' — '+(typeof substance.names.systematic[0]==='string'?substance.names.systematic[0]:substance.names.systematic[0].name):'')+'"><datalist id="trainer-substance-list">'+sortedSubstances.map(s=>'<option value="'+esc(s.formula+' — '+(typeof s.names.systematic[0]==='string'?s.names.systematic[0]:s.names.systematic[0].name))+'"></option>').join('')+'</datalist></label>':'')+
    (settings.scope==='element'?'<label class="trainer-field">Элемент<select name="element"><option value="">Выберите элемент</option>'+options(data.elements.map(e=>[e.symbol,e.symbol+' — '+e.name_ru]),settings.element)+'</select></label>':'')+
    (settings.scope==='class'?'<label class="trainer-field">Класс веществ<select name="class"><option value="">Выберите класс</option>'+options(data.classes.map(c=>[c.id,c.name_ru]),settings.class)+'</select></label>':'')+
    (settings.scope==='selection'?'<div class="trainer-context">'+esc(selectionLabel())+'</div>':'')+
    (settings.scope==='substance'&&!['names','memo'].includes(settings.mode)?'<label class="trainer-field">Участие вещества<select name="side">'+options([['all','С любой стороны'],['reactant','Как реагент'],['product','Как продукт']],settings.side)+'</select></label>':'')+
    (['balance','missing','roles','electrons'].includes(settings.mode)?'<div class="trainer-context">Только окислительно-восстановительные реакции'+(settings.mode==='missing'?'. Скрывается окислитель, восстановитель или продукт с изменением степени окисления.':'')+'</div>':settings.mode==='conditions'?'<div class="trainer-context">Только варианты с сохранёнными различиями условий</div>':settings.mode==='memo'?'<div class="trainer-context">Только обязательные тривиальные названия и соответствующие им формулы</div>':'<label class="trainer-field">Тип реакций<select name="type">'+options([['all','Все реакции'],['redox','ОВР'],['nonredox','не ОВР']],settings.type)+'</select></label>')+
    (settings.mode==='names'?'<label class="trainer-field">Направление<select name="direction">'+options([['name-to-formula','Название → формула'],['formula-to-name','Формула → название'],['mixed','В обе стороны']],settings.direction)+'</select></label>':['products','full','missing'].includes(settings.mode)?'<label class="trainer-field">Показать реагенты<select name="presentation">'+options([['formulas','Формулами'],['names','Названиями'],['mixed','Половина формулами, половина названиями']],settings.presentation)+'</select></label>':'')+
    (settings.mode!=='memo'?'<label class="trainer-field">Как отвечать<select name="checking">'+options([['input','Ввести и проверить'],['paper','Решить на бумаге и посмотреть ответ']],settings.checking)+'</select></label>':'')+
    '<label class="trainer-field">'+(settings.mode==='memo'?'Количество пар':'Количество заданий')+'<input name="count" type="number" min="1" max="'+Math.max(1,total)+'" step="1" value="'+esc(settings.count)+'" required></label></div>'+
    '<div class="trainer-start"><div>Доступно '+(settings.mode==='memo'?'пар':settings.mode==='conditions'?'подборок':'заданий')+': <strong id="trainer-available-count">'+total+'</strong><span class="trainer-caption">Без повторов в одной '+(settings.mode==='memo'?'игре':'тренировке')+'</span></div><button id="trainer-start" class="button primary" type="submit"'+(!total?' disabled':'')+'>'+(settings.mode==='memo'?'Начать игру':'Начать тренировку')+' <span aria-hidden="true">→</span></button></div>'+
    '<p id="trainer-setup-notice" class="trainer-notice" role="status"'+(total?' hidden':'')+'>'+(settings.scope==='substance'&&!settings.substance?'Выберите вещество из списка или введите его формулу.':settings.scope==='element'&&!settings.element?'Выберите элемент.':settings.scope==='class'&&!settings.class?'Выберите класс веществ.':'В этой выборке пока нет подходящих заданий. Измените настройки.')+'</p>'+
    (formError?'<p class="trainer-feedback error" role="alert">'+esc(formError)+'</p>':'')+'</section></form>';
  }
  function taskTerm(task,t,index,{coefficients=false,marks=false,hidden=false}={}){
   if(hidden)return '<span class="trainer-blank" aria-label="Пропущенное вещество">?</span>';
   const named=task.presentation==='names'&&t.side==='reactant'&&task.termNames?.[index];
   return '<span class="trainer-term">'+(coefficients&&t.coefficient!=='1'?esc(t.coefficient):'')+(named&&!coefficients?displayName(named):formula(t.formula))+(marks?(t.gas_mark?'↑':'')+(t.precipitate_mark?'↓':''):'')+'</span>';
  }
  function taskEquation(task,{leftOnly=false,hide=false,balance=false,answer=false,given=false}={}){
   const r=task.reaction;
   return '<div class="trainer-equation'+(task.presentation==='names'&&!answer?' as-names':'')+'">'+['reactant','product'].map(side=>{
    if(leftOnly&&side==='product')return '<span class="trainer-answer-space" aria-label="Неизвестные продукты">?</span>';
    return r.terms.map((t,i)=>({t,i})).filter(({t})=>t.side===side).map(({t,i})=>{
     if(balance&&settings.checking==='input')return '<label class="trainer-coefficient"><span class="sr-only">Коэффициент перед '+esc(t.formula)+(side==='reactant'?' слева':' справа')+'</span><input name="coefficient-'+i+'" data-coefficient="'+i+'" inputmode="decimal" autocomplete="off" placeholder="1" value="'+esc(task.values[i]||'')+'" aria-label="Коэффициент перед '+esc(t.formula)+(side==='reactant'?' слева':' справа')+'"><span>'+formula(t.formula)+'</span></label>';
     return taskTerm(task,t,i,{coefficients:answer||given,marks:answer,hidden:hide&&i===task.hiddenIndex});
    }).join('<span class="trainer-operator" aria-hidden="true">+</span>');
   }).join('<span class="trainer-operator" aria-label="превращается в">→</span>')+'</div>';
  }
  function taskConditions(task){
   return task.reaction?E.conditions(task.originalReaction||task.reaction).map(c=>'<p class="trainer-condition">'+esc(c)+'</p>').join(''):'';
  }
  function electronicAnswer(task){return '<div class="trainer-electronic-answer"><h3>Электронный баланс</h3>'+E.electronicRows(task.reaction).map(row=>'<div><span>'+esc(row.text)+'</span><span>× '+esc(row.multiplier)+'</span></div>').join('')+'</div>';}
  function electronicForm(task){
   return '<div class="trainer-electronic-rows">'+task.electronRows.map((row,i)=>'<div class="trainer-electronic-row"><label class="trainer-field">Строка '+(i+1)+'<input data-electronic-text="'+i+'" aria-label="Строка электронного баланса '+(i+1)+'" value="'+esc(row.text)+'" placeholder="Элемент(степень) ± ne- → Элемент(степень)" maxlength="300" autocomplete="off" autocapitalize="off" spellcheck="false"></label><label class="trainer-field">Множитель<input data-electronic-multiplier="'+i+'" aria-label="Множитель строки '+(i+1)+'" value="'+esc(row.multiplier)+'" inputmode="numeric" placeholder="1" maxlength="7" autocomplete="off"></label><button type="button" class="button ghost small" data-trainer-action="remove-row" data-row="'+i+'" aria-label="Убрать строку '+(i+1)+'">Убрать</button></div>').join('')+'</div><button class="button small" type="button" data-trainer-action="add-row">Добавить строку</button><p class="trainer-instruction">Например: Fe(+2) − e− → Fe(+3). Допустима запись электронов справа: Fe(+2) → Fe(+3) + e−. Множители вводятся отдельно; пустое поле означает 1.</p>';
  }
  function roleQuestion(task,done){
   return taskEquation({...task,presentation:'formulas'},{given:true})+(settings.checking==='input'?'<div class="trainer-role-rows">'+E.sideTerms(task.reaction,'reactant').map((term,i)=>'<label class="trainer-role-row"><span class="trainer-role-formula">'+formula(term.formula)+'</span><select data-role-index="'+i+'" aria-label="Роль '+esc(term.formula)+'"'+(done?' disabled':'')+'><option value="">Выберите роль</option>'+options(roleLabels,task.roles[i])+'</select></label>').join('')+'</div>':'');
  }
  function conditionQuestion(task,done){
   const letters='АБВГДЕЖЗ';
   return '<div class="trainer-condition-layout"><div class="trainer-condition-choices">'+task.conditionCards.map((card,i)=>'<div class="trainer-condition-choice"><div>'+esc(card.label)+'</div>'+(settings.checking==='input'?'<select data-condition-index="'+i+'" aria-label="Уравнение для условия '+esc(card.label)+'"'+(done?' disabled':'')+'><option value="">Выберите уравнение</option>'+options(task.reactionCards.map((r,index)=>[r.id,'Уравнение '+letters[index]]),task.conditionValues[i])+'</select>':'')+'</div>').join('')+'</div><div class="trainer-condition-equations">'+task.reactionCards.map((r,i)=>'<div><strong>Уравнение '+letters[i]+'</strong>'+taskEquation({reaction:r,presentation:'formulas'},{given:true})+'</div>').join('')+'</div></div>';
  }
  function memoView(){
   const task=session.tasks[0],done=!!task.outcome;
   return '<section class="panel trainer-session"><div class="trainer-session-top"><div><span class="eyebrow">Тривиальное мемо</span><p>Найдено пар: '+task.matched.length/2+' из '+task.pairs.length+'</p></div><button class="button ghost small" type="button" data-trainer-action="settings">К настройкам</button></div><h2 class="section-space">Найдите пары карточек</h2><p class="trainer-instruction">Откройте формулу и её тривиальное название. Неверная пара закроется при открытии следующей карточки.</p><div class="trainer-memo-grid">'+task.cards.map((card,i)=>{
    const matched=task.matched.includes(i),open=done||matched||task.faceUp.includes(i);
    return '<button type="button" data-memo-card="'+i+'" class="trainer-memo-card'+(open?' is-open':'')+(matched?' is-matched':'')+'" aria-label="Карточка '+(i+1)+'. '+(open?esc(card.text)+(matched?'. Пара найдена':''): 'Закрыта')+'" aria-pressed="'+open+'"'+(matched||done?' disabled':'')+'>'+(open?card.kind==='formula'?formula(card.text):esc(card.text):'<span aria-hidden="true">?</span>')+'</button>';
   }).join('')+'</div>'+(task.feedback?'<p class="trainer-feedback '+(task.feedback.ok?'success':'error')+'" role="status">'+esc(task.feedback.message)+'</p>':'')+'<div class="trainer-actions">'+(done?'<button class="button primary" type="button" data-trainer-action="next">Завершить игру</button>':'<button class="button" type="button" data-trainer-action="reveal">Посмотреть ответ</button>')+'</div></section>';
  }
  function answer(task){
   if(settings.mode==='conditions')return '<div class="trainer-answer"><h3>Ответ</h3>'+task.conditionCards.map(card=>'<p class="trainer-condition">'+esc(card.label)+'</p>'+taskEquation({reaction:E.reactions.get(card.reaction_id),presentation:'formulas'},{answer:true})).join('')+'</div>';
   if(settings.mode==='names'){
    const names=E.trainingNames(task.substance).filter(n=>E.formulaKey(n.formula)===E.formulaKey(task.name.formula));
    return '<div class="trainer-answer"><h3>Ответ</h3><div class="trainer-equation">'+formula(task.name.formula)+'</div><div class="trainer-answer-names">'+[...new Set(names.map(n=>n.label))].map(n=>'<div>'+esc(n)+'</div>').join('')+'</div>'+link('Карточка вещества ↗',url('/substance/'+task.substance.id),'plain-link')+'</div>';
   }
   const r=task.reaction;
   const temp={...task,reaction:r,presentation:'formulas'};
   return '<div class="trainer-answer"><h3>Ответ</h3>'+(settings.mode==='electrons'?electronicAnswer(task):'')+(settings.mode==='roles'?'<div class="trainer-role-answer">'+E.sideTerms(r,'reactant').map(term=>'<div>'+formula(term.formula)+' — '+esc(roleLabels.find(([key])=>key===E.roleOf(r,term))[1])+'</div>').join('')+'</div>':'')+taskEquation(temp,{answer:true})+E.conditions(r).map(c=>'<p class="trainer-condition">'+esc(c)+'</p>').join('')+link('Карточка реакции ↗',url('/reaction/'+r.id),'plain-link')+'</div>';
  }
  function taskView(){
   if(settings.mode==='memo')return memoView();
   const task=session.tasks[session.index],done=!!task.outcome;
   let prompt='',question='',inputLabel='',placeholder='';
   if(settings.mode==='names'){
    const toFormula=task.direction==='name-to-formula';
    prompt=toFormula?'Запишите формулу вещества':'Запишите название вещества';
    question='<div class="trainer-name-question">'+(toFormula?displayName(task.name):formula(task.name.formula))+'</div>';
    inputLabel=toFormula?'Формула':'Систематическое или обязательное тривиальное название';placeholder=toFormula?'Формула вещества':'Название вещества';
   }else if(task.stage==='balance'){
    prompt='Расставьте коэффициенты';question=taskEquation(task,{balance:!done});
    if(settings.mode==='electrons'&&!done)question+=electronicAnswer(task);
    if(!done&&settings.checking==='input')question+='<p class="trainer-instruction">Введите числа перед формулами. Пустое поле означает 1.</p>';
   }else if(settings.mode==='roles'){
    prompt='Определите роли в ОВР';question=roleQuestion(task,done);
   }else if(settings.mode==='electrons'){
    prompt='Составьте электронный баланс';question=taskEquation({...task,presentation:'formulas'})+(!done&&settings.checking==='input'?electronicForm(task):'');
   }else if(settings.mode==='conditions'){
    prompt='Сопоставьте условия и уравнения';question=conditionQuestion(task,done);
   }else if(settings.mode==='missing'){
    prompt='Какое вещество пропущено?';question=taskEquation(task,{hide:true});inputLabel='Формула пропущенного вещества';placeholder='Одна формула';
   }else{
    prompt='Допишите продукты реакции';question=taskEquation(task,{leftOnly:true});inputLabel='Правая часть без коэффициентов';placeholder='Продукт + продукт';
   }
   const formulaInput=settings.mode!=='names'||task.direction==='name-to-formula';
   return '<section class="panel trainer-session"><div class="trainer-session-top"><div><span class="eyebrow">'+esc(modeTitle())+'</span><p>Задание '+(session.index+1)+' из '+session.tasks.length+'</p></div><button class="button ghost small" type="button" data-trainer-action="settings">К настройкам</button></div><progress class="trainer-progress" max="'+session.tasks.length+'" value="'+session.index+'" aria-label="Пройдено заданий"></progress>'+
    '<form id="trainer-answer-form"><h2>'+prompt+'</h2>'+question+(!done?taskConditions(task):'')+
    (!done&&settings.checking==='input'&&task.stage!=='balance'&&['products','full','missing','names'].includes(settings.mode)?'<label class="trainer-field trainer-input-label">'+inputLabel+'<input id="trainer-answer-input" name="answer" value="'+esc(task.input)+'" placeholder="'+esc(placeholder)+'" maxlength="1800" autocomplete="off" autocapitalize="off" spellcheck="false" required></label>'+(formulaInput?'<div id="trainer-input-preview" class="trainer-input-preview" aria-hidden="true">'+(task.input?formula(task.input):'')+'</div><p class="trainer-instruction">Индексы можно вводить обычными цифрами: H2O.</p>':''):'')+
    '<div id="trainer-feedback" class="trainer-feedback'+(task.feedback?(task.feedback.ok?' success':' error'):'')+'" '+(task.feedback?'role="'+(task.feedback.ok?'status':'alert')+'"':'aria-live="polite"')+'>'+esc(task.feedback?.message||'')+'</div>'+
    (done?answer(task):'')+
    '<div class="trainer-actions">'+(done?'<button type="button" class="button primary" data-trainer-action="next">'+(session.index===session.tasks.length-1?'Завершить тренировку':'Следующее задание')+' <span aria-hidden="true">→</span></button>':(settings.checking==='input'?'<button type="submit" class="button primary">Проверить</button>':'')+'<button type="button" class="button" data-trainer-action="reveal">Посмотреть ответ</button><button type="button" class="button ghost" data-trainer-action="skip">Пропустить</button>')+'</div></form></section>';
  }
  function summary(){
   if(settings.mode==='memo')return '<section class="panel trainer-summary"><span class="eyebrow">Тривиальное мемо</span><h2>'+(session.tasks[0].outcome==='correct'?'Все пары найдены':'Игра завершена')+'</h2><p>Количество пар: '+session.tasks[0].pairs.length+'</p><button type="button" class="button primary" data-trainer-action="settings">Новая игра</button></section>';
   const count=outcome=>session.tasks.filter(t=>t.outcome===outcome).length;
   return '<section class="panel trainer-summary"><span class="eyebrow">'+esc(modeTitle())+'</span><h2>Тренировка завершена</h2><p>Пройдено заданий: '+session.tasks.length+'</p><dl><div><dt>Решено</dt><dd>'+count('correct')+'</dd></div><div><dt>Ответ просмотрен</dt><dd>'+count('revealed')+'</dd></div><div><dt>Пропущено</dt><dd>'+count('skipped')+'</dd></div></dl><button type="button" class="button primary" data-trainer-action="settings">Новая тренировка <span aria-hidden="true">→</span></button></section>';
  }
  function content(){return !session?setup():session.done?summary():taskView();}
  function focusAnswer(){requestAnimationFrame(()=>host?.querySelector('#trainer-answer-input,[data-coefficient],[data-role-index],[data-electronic-text],[data-condition-index]')?.focus({preventScroll:true}));}
  function update(focus=false){if(!host)return;host.innerHTML=content();bind();if(focus){host.scrollIntoView({block:'start'});focusAnswer();}}
  function feedback(result){
   const task=session.tasks[session.index];task.feedback={ok:result.ok,message:result.message};
   if(result.ok){
    if(result.reaction)task.reaction=result.reaction;
    if(['full','electrons'].includes(settings.mode)&&task.stage==='answer'){task.stage='balance';task.presentation='formulas';task.feedback.message=(settings.mode==='full'?'Продукты определены верно.':'Электронный баланс составлен верно.')+' Теперь расставьте коэффициенты.';}
    else task.outcome='correct';
   }
   update(result.ok&&!task.outcome);
  }
  function submitAnswer(form){
   const task=session.tasks[session.index];if(task.outcome)return;
   task.attempts++;
   if(task.stage==='balance'){
    task.values=task.reaction.terms.map((t,i)=>form.elements['coefficient-'+i]?.value||'');
    feedback(E.checkCoefficients(task.reaction,task.values));
   }else if(settings.mode==='roles'){
    task.roles=[...form.querySelectorAll('[data-role-index]')].map(el=>el.value);feedback(E.checkRoles(task.reaction,task.roles));
   }else if(settings.mode==='electrons'){
    task.electronRows=[...form.querySelectorAll('[data-electronic-text]')].map((el,i)=>({text:el.value,multiplier:form.querySelector('[data-electronic-multiplier="'+i+'"]').value}));feedback(E.checkElectronicBalance(task.reaction,task.electronRows));
   }else if(settings.mode==='conditions'){
    task.conditionValues=[...form.querySelectorAll('[data-condition-index]')].map(el=>el.value);feedback(E.checkConditions(task,task.conditionValues));
   }else{
    task.input=form.elements.answer.value;
    const result=settings.mode==='names'?E.checkName(task,task.input):settings.mode==='missing'?E.checkMissing(task,task.input):E.checkProducts(task.reaction,task.input);
    feedback(result);
   }
  }
  function bind(){
   host.onsubmit=event=>{
    event.preventDefault();
    if(event.target.id==='trainer-settings'){
     readForm();formError='';const result=E.makeSession(settings,sourcePool());
     if(result.error){formError=result.error;update();return;}session=result;update(true);
    }else if(event.target.id==='trainer-answer-form')submitAnswer(event.target);
   };
   host.onchange=event=>{
    if(session){const task=session.tasks[session.index];if(event.target.dataset.roleIndex!==undefined)task.roles[Number(event.target.dataset.roleIndex)]=event.target.value;if(event.target.dataset.conditionIndex!==undefined)task.conditionValues[Number(event.target.dataset.conditionIndex)]=event.target.value;return;}
    if(!event.target.closest('#trainer-settings'))return;
    if(event.target.id==='trainer-substance')return;
    if(event.target.name==='count'){readForm();return;}
    const previousScope=settings.scope,previousMode=settings.mode;readForm();
    if(settings.mode==='memo'&&previousMode!=='memo')settings.count=6;
    if(settings.scope!==previousScope){if(settings.scope==='element'&&!settings.element)settings.element=data.elements[0]?.symbol||'';if(settings.scope==='class'&&!settings.class)settings.class=data.classes[0]?.id||'';}
    formError='';clampCount();update();
   };
   host.oninput=event=>{
    if(!session){
     if(event.target.id==='trainer-substance'){
      readForm();const total=available().length;clampCount();
      host.querySelector('#trainer-available-count').textContent=String(total);
      host.querySelector('#trainer-start').disabled=!total;
      const count=host.querySelector('[name="count"]');count.max=String(Math.max(1,total));count.value=String(settings.count);
      const notice=host.querySelector('#trainer-setup-notice');notice.hidden=!!total;notice.textContent=settings.substance?'В этой выборке пока нет подходящих заданий. Измените настройки.':'Выберите вещество из списка или введите его формулу.';
     }
     return;
    }
    const task=session.tasks[session.index];
    if(event.target.dataset.electronicText!==undefined)task.electronRows[Number(event.target.dataset.electronicText)].text=event.target.value;
    if(event.target.dataset.electronicMultiplier!==undefined)task.electronRows[Number(event.target.dataset.electronicMultiplier)].multiplier=event.target.value;
    if(event.target.id==='trainer-answer-input'){
     task.input=event.target.value;const preview=host.querySelector('#trainer-input-preview');if(preview)preview.innerHTML=formula(task.input);
    }
    if(event.target.dataset.coefficient!==undefined)task.values[Number(event.target.dataset.coefficient)]=event.target.value;
   };
   host.onclick=event=>{
    const memo=event.target.closest('[data-memo-card]');if(memo&&session){const index=Number(memo.dataset.memoCard);if(E.flipMemo(session.tasks[0],index).changed){update();const same=host.querySelector('[data-memo-card="'+index+'"]');(same&&!same.disabled?same:host.querySelector('[data-memo-card]:not(:disabled)'))?.focus({preventScroll:true});}return;}
    const action=event.target.closest('[data-trainer-action]')?.dataset.trainerAction;if(!action)return;
    if(action==='settings'){session=null;formError='';clampCount();update();return;}
    const task=session.tasks[session.index];
    if(action==='add-row'){task.electronRows.push({text:'',multiplier:''});update();return;}
    if(action==='remove-row'){task.electronRows.splice(Number(event.target.closest('[data-row]').dataset.row),1);update();return;}
    if(action==='reveal'&&!task.outcome){task.outcome='revealed';task.feedback=null;update();}
    if(action==='next'||action==='skip'){
     if(action==='skip')task.outcome='skipped';
     if(session.index===session.tasks.length-1)session.done=true;else session.index++;
     update(!session.done);
    }
   };
  }
  return {
   render(params={}){
    const key=JSON.stringify(params);
    if(!settings||key!==routeKey){routeKey=key;settings=defaultSettings(params);session=null;formError='';clampCount();}
    return crumbs([['Тренажёр']])+heading('Тренажёр реакций','Выберите режим и потренируйтесь на реакциях базы.')+'<div id="trainer-root">'+content()+'</div>';
   },
   mount(){host=document.getElementById('trainer-root');if(host)bind();}
  };
 };
})();
