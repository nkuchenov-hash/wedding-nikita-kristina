import {weddingDays} from './data.js';
import {PUBLIC_VENUES} from './venues.js';
import {VENUE_RECORDS} from './venues-data.js';
import {getVenuePhotos} from './venue-detail-ui.js';
// Wedding admin live-data layer. Never stores guest details in browser storage.
const API='/admin/index.php?api=';
const $=(tag,cls='',text='')=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el};
const state={csrf:'',role:'anonymous',busy:false};
let overviewTimer=null;
const fields={
  venues:[['name','Площадка'],['area','Район'],['address','Адрес'],['capacity_max','Вместимость'],['quoted_total_rub','Стоимость, ₽'],['notes','Примечания']],
  vendors:[['category','Категория'],['name','Подрядчик'],['contact','Контакт'],['website','Сайт'],['estimate_rub','Оценка, ₽'],['notes','Примечания']],
  budget_lines:[['category','Категория'],['description','Статья'],['planned_rub','План, ₽'],['committed_rub','Согласовано, ₽'],['paid_rub','Оплачено, ₽']],
  tasks:[['title','Задача'],['description','Описание'],['status','Статус'],['owner','Ответственный'],['due_at','Срок']],
  menu_options:[['category','Категория'],['title','Блюдо'],['description','Описание'],['allergens','Аллергены']],
  schedule_items:[['title','Событие'],['start_at','Начало'],['end_at','Конец'],['place','Место'],['notes','Примечание']]
};
const numeric=new Set(['capacity_max','quoted_total_rub','estimate_rub','planned_rub','committed_rub','paid_rub']);
const mapSection={budget:'budget_lines',tasks:'tasks',schedule:'schedule_items'};
function errorText(e){return e instanceof Error?e.message:'Не удалось выполнить запрос'}
async function call(route,{method='GET',body,form=false}={}){
 const headers={'Accept':'application/json'};
 if(method!=='GET'&&state.csrf)headers['X-CSRF-Token']=state.csrf;
 if(body && !form)headers['Content-Type']='application/json';
 const [endpoint,params='']=route.split('?');
 const url=API+encodeURIComponent(endpoint)+(params?'&'+params:'');
 const response=await fetch(url,{
   method,headers,credentials:'same-origin',
   body:form?body:(body?JSON.stringify(body):undefined),
   cache:'no-store'
 });
 let data;try{data=await response.json()}catch{throw new Error('Сервер API пока недоступен')}
 if(!response.ok || !data.ok)throw new Error(data.message||'Ошибка сервера: '+response.status);
 return data;
}
function message(parent,text,kind=''){const el=$('p','ad-live-message '+kind,text);parent.append(el);return el}
function controls(parent,items){const wrap=$('div','ad-live-actions');for(const el of items)wrap.append(el);parent.append(wrap);return wrap}
function button(label,fn){const b=$('button','ad-live-button',label);b.type='button';b.addEventListener('click',()=>fn(b));return b}
function title(parent,text,subtitle=''){parent.append($('h2','',text));if(subtitle)parent.append($('p','ad-live-muted',subtitle))}
function metric(parent,label,value){const c=$('div','ad-live-metric');c.append($('span','',label),$('strong','',String(value??'—')));parent.append(c)}
function table(parent,headers,rows){
 const holder=$('div','ad-live-table-scroll');const table=$('table','ad-live-table');const h=$('thead'),tr=$('tr');
 for(const label of headers)tr.append($('th','',label));
 h.append(tr);table.append(h);const tbody=$('tbody');
 for(const row of rows){const r=$('tr');for(const value of row){const td=$('td');if(value instanceof Node)td.append(value);else td.textContent=String(value??'—');r.append(td)}tbody.append(r)}
 table.append(tbody);holder.append(table);parent.append(holder);
}
async function overview(host){
 // The home screen is a balanced overview of the whole wedding, not a guest-only funnel.
 host.classList.add('ad-overview-shell');
 const page=$('div','ad-overview-dashboard');
 const head=$('header','ad-overview-heading');
 const headingText=$('div');
 headingText.append($('span','ad-overview-kicker','ЦЕНТР ПОДГОТОВКИ СВАДЬБЫ'),
   $('h1','','Никита и Кристина'),
   $('p','','Общая картина подготовки · 17–19 июня 2027'));
 const sync=$('span','ad-overview-sync','Загрузка данных…');
 head.append(headingText,sync);page.append(head);
 const plan=$('div','ad-overview-plan');
 const registry=$('div','ad-overview-plan-day');
 registry.append($('strong','','17 июня'),$('span','','Регистрация · 14:00 · Марьино'));
 const event=$('div','ad-overview-plan-day');
 event.append($('strong','','19 июня'),$('span','','Торжество · площадка выбирается'));
 plan.append(registry,event);page.append(plan);
 const stats=$('div','ad-overview-stats');page.append(stats);
 const content=$('div','ad-overview-sections');page.append(content);
 function anchor(href,label){
   const a=$('a','ad-overview-more',label);a.href='#/admin/'+href;return a;
 }
 function panel(title,section,label){
   const block=$('section','ad-overview-card');
   const cap=$('div','ad-overview-card-head');
   cap.append($('h2','',title),anchor(section,label||'Подробнее'));
   block.append(cap);content.append(block);return block;
 }
 function statistic(label,value,subtitle,section){
   const a=$('a','ad-overview-stat');a.href='#/admin/'+section;
   a.append($('span','ad-overview-stat-label',label),
     $('strong','ad-overview-stat-value',String(value)),
     $('small','',subtitle));
   stats.append(a);
 }
 const tasksCard=panel('Задачи и решения','tasks','Все задачи');
 const taskList=$('div','ad-overview-task-list');tasksCard.append(taskList);
 const guestsCard=panel('Гости','guests','Управление гостями');
 const guestStats=$('div','ad-overview-guest-stats');guestsCard.append(guestStats);
 const guestHint=$('p','ad-overview-help','Отправка приглашений, анкеты и ответы отслеживаются в разделе «Гости».');
 guestsCard.append(guestHint);
 const venuesCard=panel('Площадки','venues','Сравнить');
 const venueBox=$('div','ad-overview-venue-summary');venuesCard.append(venueBox);
 const financeCard=panel('Бюджет','budget','Смотреть бюджет');
 const budgetBox=$('div','ad-overview-finance');financeCard.append(budgetBox);
 const docsCard=panel('Материалы площадок','venues','Открыть площадки');
 const docBox=$('div','ad-overview-docs');docsCard.append(docBox);
 const programCard=panel('Программа свадьбы','schedule','Открыть программу');
 const schedule=$('div','ad-overview-schedule');
 const line1=$('div','ad-overview-schedule-line');
 line1.append($('span','ad-overview-date','17 июня'),$('span','','Регистрация в Марьино · 14:00'));
 const line2=$('div','ad-overview-schedule-line');
 line2.append($('span','ad-overview-date','18 июня'),$('span','','Программа уточняется'));
 const line3=$('div','ad-overview-schedule-line');
 line3.append($('span','ad-overview-date','19 июня'),$('span','','Свадебное торжество · место выбирается'));
 schedule.append(line1,line2,line3);programCard.append(schedule);
 host.append(page);
 const venueCount=PUBLIC_VENUES.length;
 const visited=PUBLIC_VENUES.filter(v=>VENUE_RECORDS[v.id]?.visited===true).length;
 const photoAlbums=PUBLIC_VENUES.map(v=>getVenuePhotos(v));
 const photoCount=photoAlbums.reduce((sum,photos)=>sum+photos.length,0);
 const photoVenues=photoAlbums.filter(photos=>photos.length).length;
 const quoted=PUBLIC_VENUES.filter(v=>(VENUE_RECORDS[v.id]?.quotes||[]).some(q=>Number(q.total)>0)).length;
 let docsCount=null;
 let openTasks=null;
 const renderTasks=()=>{
   taskList.replaceChildren();
   if(openTasks===null){taskList.append($('p','ad-overview-muted','Список задач загружается…'));return}
   if(!openTasks.length){taskList.append($('p','ad-overview-muted','Открытых задач нет.'));return}
   for(const task of openTasks.slice(0,5)){
     const a=$('a','ad-overview-task');a.href='#/admin/tasks';
     const bullet=$('span','ad-overview-task-dot');
     const content=$('span','ad-overview-task-title',task.title);
     const meta=$('small','',task.due_at?String(task.due_at).slice(0,10):'Без срока');
     a.append(bullet,content,meta);taskList.append(a);
   }
   if(openTasks.length>5)taskList.append($('p','ad-overview-muted','Ещё '+(openTasks.length-5)+' задач в полном списке'));
 };
 const renderDocs=()=>{
   docBox.replaceChildren();
   const photos=$('a','ad-overview-doc-item');photos.href='#/admin/photos';
   photos.append($('strong','',photoCount),$('span','','фотографий'),$('small','',photoVenues+' альбомов'));
   const documents=$('a','ad-overview-doc-item');documents.href='#/admin/venues';
   documents.append($('strong','',docsCount===null?'—':docsCount),
     $('span','','документов и видео'),$('small','',docsCount===null?'Проверка архива':'В карточках площадок'));
   docBox.append(photos,documents);
 };
 const renderVenues=()=>{
   venueBox.replaceChildren();
   const main=$('p','ad-overview-venue-line');
   main.append($('strong','',venueCount),$('span','','площадок в сравнении'));
   const sub=$('div','ad-overview-pills');
   sub.append($('span','',visited+' осмотрели'),$('span','',quoted+' смет с итогом'));
   const note=$('p','ad-overview-muted','Место торжества ещё выбирается. Предложения не означают бронирование.');
   venueBox.append(main,sub,note);
 };
 const renderOverview=data=>{
   const g=data.guests||{},budget=data.budget||{},tasks=data.tasks||{};
   const number=(v)=>Number(v||0);
   const paid=number(budget.paid),planned=number(budget.planned),committed=number(budget.committed);
   stats.replaceChildren();
   statistic('Гости',number(g.total),'Подтвердили: '+number(g.confirmed),'guests');
   statistic('Площадки',venueCount,'Осмотрели: '+visited,'venues');
   statistic('Задачи',number(tasks.open),'В работе','tasks');
   statistic('Бюджет',planned>0?planned.toLocaleString('ru-RU')+' ₽':'Не задан',paid>0?'Оплачено: '+paid.toLocaleString('ru-RU')+' ₽':'Суммы из утверждённого плана','budget');
   guestStats.replaceChildren();
   for(const [value,label]of [
     [number(g.total),'В списке'],[number(g.sent),'Пригласили'],
     [number(g.registered),'Анкеты'],[number(g.confirmed),'Подтвердили']
   ]){
     const block=$('div','ad-overview-guest-stat');
     block.append($('strong','',value),$('span','',label));
     guestStats.append(block);
   }
   budgetBox.replaceChildren();
   const amount=$('div','ad-overview-budget-value',planned>0?planned.toLocaleString('ru-RU')+' ₽':'Бюджет не утверждён');
   const note=$('p','ad-overview-muted',committed>0?'Согласовано: '+committed.toLocaleString('ru-RU')+' ₽':'Согласованные расходы ещё не внесены');
   const paidText=$('p','ad-overview-muted',paid>0?'Оплачено: '+paid.toLocaleString('ru-RU')+' ₽':'Подтверждённых платежей в базе пока нет');
   const important=$('p','ad-overview-budget-note','Сметы площадок — альтернативные предложения, не общая сумма расходов.');
   budgetBox.append(amount,note,paidText,important);
   sync.textContent='Обновлено '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
 };
 renderVenues();renderDocs();renderTasks();
 const initial=await call('admin/overview');
 renderOverview(initial);
 const [taskResult,docResult]=await Promise.allSettled([
   call('admin/records?collection=tasks'),call('admin/venue-files')
 ]);
 if(taskResult.status==='fulfilled'){
   openTasks=(taskResult.value.items||[]).filter(t=>!['done','completed','cancelled'].includes(String(t.status||'').toLowerCase()));
   openTasks.sort((a,b)=>String(a.due_at||'9999').localeCompare(String(b.due_at||'9999')));
   renderTasks();
 }else{taskList.replaceChildren($('p','ad-overview-muted','Список задач временно недоступен.'))}
 if(docResult.status==='fulfilled'){
   docsCount=(docResult.value.files||[]).length;renderDocs();
 }
 if(overviewTimer)clearInterval(overviewTimer);
 overviewTimer=setInterval(()=>{
   if(!host.isConnected){clearInterval(overviewTimer);overviewTimer=null;return}
   if(document.visibilityState==='visible')call('admin/overview').then(renderOverview)
     .catch(()=>{sync.textContent='Нет связи — показаны последние данные'});
 },15000);
}

function fieldInput(field,label){
 const wrap=$('label','ad-live-field');wrap.append($('span','',label));
 const inp=$('input');inp.name=field;inp.placeholder=label;inp.type=numeric.has(field)?'number':'text';
 if(inp.type==='number')inp.min='0';
 wrap.append(inp);return wrap;
}
function showForm(host,config,submit,defaults=null,actionLabel='Сохранить'){
 const form=$('form','ad-live-form');
 for(const [key,label]of config){
   const wrap=fieldInput(key,label),input=wrap.querySelector('input');
   if(defaults&&defaults[key]!==undefined&&defaults[key]!==null)input.value=String(defaults[key]);
   form.append(wrap);
 }
 const action=$('button','ad-live-button',actionLabel);action.type='submit';form.append(action);
 const feedback=$('p','ad-live-message');form.append(feedback);
 form.addEventListener('submit',async event=>{
   event.preventDefault();action.disabled=true;
   const payload={};
   for(const [key]of config){
     const val=String(form.elements.namedItem(key)?.value||'').trim();
     if(val===''&&defaults===null)continue;
     payload[key]=numeric.has(key)?(val===''?0:Number(val)):val;
   }
   try{
     await submit(payload);
     feedback.textContent='Изменения сохранены в базе';
     if(!defaults)form.reset();
   }catch(err){feedback.textContent=errorText(err)}
   finally{action.disabled=false}
 });
 host.append(form);
}
async function guests(host){
 const data=await call('admin/guests');
 title(host,'Гости — защищённый реестр','Контакты, RSVP и особые пожелания видны только организаторам');
 message(host,'Гостей в базе: '+data.guests.length);

 const rows=data.guests.map(g=>{
   const action=button('Приглашение',async b=>{
     if(!window.confirm('Создать новый персональный токен? Старый токен этого гостя станет недействительным.'))return;
     b.disabled=true;
     try{
       const r=await call('admin/invitations',{method:'POST',body:{guest_id:g.id}});
       const token=$('code','ad-live-token',r.token);
       const p=$('div','ad-live-invite');
       p.append($('p','', 'Токен создан, но приглашение не отправлено. Сохраните его для отправки после запуска гостевого сайта.'),token);
       host.prepend(p);
     }catch(e){message(host,errorText(e),'error')}finally{b.disabled=false}
   });
   return [g.display_name,g.side,g.email||'—',g.attendance||'Не ответил',g.adults??'—',g.children??'—',action];
 });
 table(host,['Имя','Сторона','Email','RSVP','Взрослые','Дети','Действие'],rows);
 const add=$('section','ad-live-subsection');title(add,'Добавить гостя');
 showForm(add,[['first_name','Имя'],['last_name','Фамилия'],['display_name','Имя для отображения'],['city','Город'],['email','Email'],['phone','Телефон']],async d=>{
   await call('admin/guests',{method:'POST',body:d});
 });
 host.append(add);

}
async function collection(host,type){
 const data=await call('admin/records?collection='+encodeURIComponent(type));
 const heading=({venues:'Сравнение площадок',budget_lines:'Бюджет',tasks:'Задачи',menu_options:'Меню',schedule_items:'Программа'})[type]||type;
 title(host,heading);
 const keys=fields[type]||[];
 const items=data.items||[];
 if(type==='budget_lines'){
   const totals=items.reduce((sum,row)=>{
     for(const field of ['planned_rub','committed_rub','paid_rub'])
       sum[field]+=Number(row[field])||0;
     return sum;
   },{planned_rub:0,committed_rub:0,paid_rub:0});
   const summary=$('div','ad-live-metrics');
   const rub=value=>Math.round(value).toLocaleString('ru-RU')+' ₽';
   metric(summary,'План',totals.planned_rub?rub(totals.planned_rub):'Не задан');
   metric(summary,'Согласовано',rub(totals.committed_rub));
   metric(summary,'Оплачено',rub(totals.paid_rub));
   metric(summary,'Остаток по плану',totals.planned_rub?rub(totals.planned_rub-totals.paid_rub):'—');
   host.append(summary);
   message(host,'Здесь учитываются только планируемые расходы свадьбы, принятые обязательства и реальные платежи. Альтернативные коммерческие предложения хранятся в карточках площадок.');
 }
 let editor=null;
 async function redraw(){
   host.replaceChildren();
   await collection(host,type);
 }
 function edit(item){
   if(editor)editor.remove();
   editor=$('section','ad-live-subsection');title(editor,'Редактирование записи');
   showForm(editor,keys,async fields=>{
     await call('admin/records',{method:'PATCH',body:{collection:type,id:item.id,fields}});
     await redraw();
   },item,'Сохранить изменения');
   host.prepend(editor);
   editor.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 const records=items.map(item=>{
   const row=keys.map(([k])=>item[k]??'—');
   const action=button('Изменить',()=>edit(item));
   row.push(action);
   return row;
 });
 if(records.length)table(host,[...keys.map(([,label])=>label),'Действие'],records);
 else message(host,type==='menu_options'?'Меню пока не утверждено — блюда можно добавить после выбора площадки.':
   type==='budget_lines'?'Статей расходов пока нет. Добавьте планируемые суммы, обязательства или оплаты.':
   'Подтверждённых записей пока нет');
 const section=$('section','ad-live-subsection');title(section,'Добавить запись');
 showForm(section,keys,async fields=>{
   await call('admin/records',{method:'POST',body:{collection:type,fields}});
   await redraw();
 });
 host.append(section);
}

const scheduleDay=x=>String(x.start_at||'').slice(0,10);
const scheduleTime=x=>{
 const found=String(x.start_at||'').match(/T(\d{2}:\d{2})/);
 return found?found[1]:'Время уточняется';
};
async function schedule(host){
 const response=await call('admin/records?collection=schedule_items');
 const entries=(response.items||[]).filter(x=>x&&typeof x.title==='string');
 title(host,'Программа свадьбы','17–19 июня 2027 года');
 const cards=$('div','ad-program-days');host.append(cards);
 let editor=null;
 const eventForm=(item=null,selectedDay='2027-06-19')=>{
   if(editor)editor.remove();
   editor=$('section','ad-program-editor');host.append(editor);
   title(editor,item?'Изменить событие':'Добавить событие');
   const form=$('form','ad-program-form');
   const makeField=(label,type,value='')=>{
     const wrap=$('label','ad-live-field'),heading=$('span','',label),input=$('input');input.type=type;input.value=value;wrap.append(heading,input);form.append(wrap);return input;
   };
   const dateWrapper=$('label','ad-live-field');dateWrapper.append($('span','','Дата'));
   const date=$('select');for(const day of weddingDays){const option=$('option','',day.label);option.value=day.date;date.append(option)}
   date.value=item? (scheduleDay(item)||selectedDay):selectedDay;
   dateWrapper.append(date);form.append(dateWrapper);
   const timeText=String(item?.start_at||'').match(/T(\d{2}:\d{2})/);
   const time=makeField('Время (необязательно)','time',timeText?timeText[1]:'');
   const name=makeField('Событие','text',item?.title||'');name.required=true;
   const place=makeField('Место','text',item?.place||'');
   const notes=makeField('Примечание','text',item?.notes||'');
   const venueField=$('label','ad-live-field');
   venueField.append($('span','','Площадка из списка (для фотогалереи)'));
   const venueSelect=$('select');
   const noVenue=$('option','','Не выбрана');noVenue.value='';venueSelect.append(noVenue);
   for(const venue of PUBLIC_VENUES){
     const option=$('option','',venue.name);option.value=venue.id;venueSelect.append(option);
   }
   venueSelect.value=item?.venue_id||'';
   venueField.append(venueSelect);form.append(venueField);
   const confirmField=$('label','ad-live-field');
   const confirmBox=$('input');confirmBox.type='checkbox';
   confirmBox.checked=Number(item?.is_confirmed||0)===1;
   confirmField.append(confirmBox,$('span','','Место утверждено — включить его фотографии в свадебную галерею'));
   form.append(confirmField);
   venueSelect.addEventListener('change',()=>{if(!venueSelect.value)confirmBox.checked=false});
   const actions=$('div','ad-program-actions'),save=$('button','ad-live-button','Сохранить'),cancel=$('button','ad-program-secondary','Отмена');
   save.type='submit';cancel.type='button';cancel.addEventListener('click',()=>{editor.remove();editor=null});
   actions.append(save,cancel);form.append(actions);
   const feedback=$('p','ad-live-message');form.append(feedback);editor.append(form);
   form.addEventListener('submit',async event=>{
     event.preventDefault();save.disabled=true;
     try{
       const payload={
         collection:'schedule_items',
         fields:{
           title:name.value.trim(),
           start_at:date.value+(time.value?'T'+time.value+':00':''),
           place:place.value.trim(),
           notes:notes.value.trim(),
           venue_id:venueSelect.value,
           is_confirmed:confirmBox.checked?1:0,
           is_public:Number(item?.is_public||0),
           sort_order:item?.sort_order??90
         }
       };
       if(!payload.fields.title)throw new Error('Укажите название события');
       if(payload.fields.is_confirmed&&!payload.fields.venue_id)throw new Error('Для утверждённой площадки выберите место из списка');
       if(item?.id)payload.id=item.id;
       await call('admin/records',{method:item?.id?'PATCH':'POST',body:payload});
       host.replaceChildren();await schedule(host);
     }catch(error){feedback.textContent=errorText(error);save.disabled=false}
   });
   name.focus({preventScroll:true});
 };
 for(const [index,day] of weddingDays.entries()){
   const card=$('article','ad-program-card');
   const header=$('header','ad-program-card-head');
   const counter=$('span','ad-program-card-number','0'+(index+1));
   const dateBlock=$('div','ad-program-card-date');
   dateBlock.append($('span','',day.weekday),$('strong','',day.label));
   header.append(counter,dateBlock);card.append(header);
   const dayEvents=entries.filter(item=>scheduleDay(item)===day.date).sort((a,b)=>String(a.start_at||'').localeCompare(String(b.start_at||''))||(a.sort_order||0)-(b.sort_order||0));
   if(dayEvents.length){
     for(const entry of dayEvents){
       const row=$('div','ad-program-event');
       row.append($('time','ad-program-time',scheduleTime(entry)));
       const content=$('div','ad-program-event-body');
       content.append($('h3','',entry.title));
       if(entry.place)content.append($('p','',entry.place));
       if(entry.notes)content.append($('small','',entry.notes));
       if(Number(entry.is_confirmed)===1)content.append($('small','ad-program-confirmed','Площадка утверждена — фото в свадебной галерее'));
       row.append(content,button('Изменить',()=>eventForm(entry,day.date)));
       card.append(row);
     }
   }else if(day.date==='2027-06-17'||day.date==='2027-06-19'){
     // Display established facts even if a prior database installation has not yet run the seed.
     const row=$('div','ad-program-event');
     row.append($('time','ad-program-time',day.time||'Время уточняется'));
     const content=$('div','ad-program-event-body');
     content.append($('h3','',day.title),$('p','',day.place||''));row.append(content);card.append(row);
   }else{
     card.append($('p','ad-program-empty','Программа на этот день ещё не определена'));
   }
   const add=button('+ Добавить событие',()=>eventForm(null,day.date));
   add.classList.add('ad-program-add');card.append(add);
   cards.append(card);
 }
 const undated=entries.filter(x=>!weddingDays.some(day=>scheduleDay(x)===day.date)&&!/^draft-schedule-/.test(x.id||''));
 if(undated.length){
   const section=$('section','ad-program-other');section.append($('h3','','События без даты'));
   for(const item of undated){
     const row=$('div','ad-program-event');
     row.append($('strong','',item.title),button('Указать дату',()=>eventForm(item)));
     section.append(row);
   }
   host.append(section);
 }
}
async function moderation(host){
 const data=await call('admin/moderation');
 title(host,'Модерация фотографий и историй','Ничего не публикуется автоматически.');
 const list=(items,type)=>{const group=$('section','ad-live-subsection');
   title(group,type==='photos'?'Фотографии на проверке':'Истории на проверке');
   if(!items.length)message(group,'Новых материалов нет');
   for(const item of items){
      const article=$('div','ad-live-review');
      article.append($('strong','',item.display_name||'Гость'));
      if(type==='photos'){
        const link=$('a','ad-live-photo','Открыть фото');link.href='/api/index.php?r=media%2Fphoto&id='+encodeURIComponent(item.id);
        link.target='_blank';link.rel='noopener noreferrer';article.append(link,$('p','',item.caption||'Без подписи'));
      }else article.append($('p','',item.content||''));
      for(const [status,label]of [['approved','Одобрить'],['rejected','Отклонить']]){
        const b=button(label,async()=>{b.disabled=true;
          try{await call('admin/review',{method:'POST',body:{type,id:item.id,status}});article.remove()}
          catch(err){message(article,errorText(err),'error')}finally{b.disabled=false}
        });
        article.append(b);
      }
      group.append(article);
   }
   host.append(group);
 };
 list(data.photos||[],'photos');list(data.stories||[],'stories');
}
async function renderSection(host,section){
 if(section==='overview'){await overview(host);return}
 if(section==='moderation'){await moderation(host);return}
 if(section==='menu'){await collection(host,'menu_options');return}
 if(section==='guests'){await guests(host);return}
 if(section==='schedule'){await schedule(host);return}
 if(mapSection[section]){
   await collection(host,mapSection[section]);
   return;
 }
 return;
}
function login(host,section){
 title(host,'Подключение к базе данных','Для работы с персональными данными требуется отдельный вход администратора.');
 const form=$('form','ad-live-form');const user=fieldInput('login','Логин');const pass=fieldInput('password','Пароль');
 pass.querySelector('input').type='password';pass.querySelector('input').autocomplete='current-password';
 const b=$('button','ad-live-button','Войти');b.type='submit';
 const status=$('p','ad-live-message');form.append(user,pass,b,status);host.append(form);
 form.addEventListener('submit',async e=>{
   e.preventDefault();b.disabled=true;try{const result=await call('auth/admin',{method:'POST',body:{
     login:user.querySelector('input').value,password:pass.querySelector('input').value
   }});state.csrf=result.csrf;state.role='admin';host.replaceChildren();await renderSection(host,section);
   }catch(err){status.textContent=errorText(err)}finally{b.disabled=false}
 });
}
export async function activateAdminData(root,section){
 if(overviewTimer){clearInterval(overviewTimer);overviewTimer=null;}
 const destination=root.querySelector('.admin-content');if(!destination)return;
 // Venue comparison has its own approved detailed table in venues.js.
 // Never inject a generic database table above it.
 const supported=['overview','budget','tasks','schedule','moderation','menu'];
 if(!supported.includes(section))return;
 const host=$('section','ad-live-panel');host.setAttribute('aria-label','Данные свадебной базы');
 destination.prepend(host);
 try{
   const session=await call('auth/session');
   state.csrf=session.csrf;state.role=session.role;
   if(session.role!=='admin'){login(host,section);return}
   await renderSection(host,section);
   // Remove the old placeholder rather than only marking it hidden:
   // authored CSS may override HTML's hidden attribute, duplicating dashboards.
   if(section!=='venues')destination.replaceChildren(host);
 }catch(err){
   // Live API is not enabled on this release. Leave the existing authenticated admin tools visible.
   host.remove();
 }
}
