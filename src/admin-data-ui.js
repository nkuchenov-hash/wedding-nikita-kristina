import {showAdminToast} from './admin-toast.js';
import {weddingDays} from './data.js';
const adminProgramDays=[...weddingDays,
 {date:'2027-06-20',label:'20 июня',weekday:'Воскресенье'},
 {date:'2027-06-21',label:'21 июня',weekday:'Понедельник'}];
import {renderWeddingProgram} from './admin-program.js';
import {renderWeddingSettings} from './admin-settings.js';
import {PUBLIC_VENUES} from './venues.js';
import {VENUE_RECORDS} from './venues-data.js';
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
  menu_options:[['category','Категория'],['title','Блюдо'],['description','Описание'],['allergens','Аллергены']]
};
const numeric=new Set(['capacity_max','quoted_total_rub','estimate_rub','planned_rub','committed_rub','paid_rub']);
const mapSection={budget:'budget_lines',tasks:'tasks'};
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
 const head=$('header','ad-overview-heading admin-page-heading');
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
 const docsCard=panel('Гостевые фотографии и материалы','photos','Открыть галерею');
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
 let photoCount=null,photoPublic=null;
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
   photos.append($('strong','',photoCount===null?'—':photoCount),$('span','','фотографий для гостей'),$('small','',photoPublic===null?'Проверка галереи':photoPublic+' подготовлено к публикации'))
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
   statistic('Гости',number(g.total),'Ответили «буду»: '+number(g.attending),'guests');
   statistic('Площадки',venueCount,'Осмотрели: '+visited,'venues');
   statistic('Задачи',number(tasks.open),'В работе','tasks');
   statistic('Бюджет',planned>0?planned.toLocaleString('ru-RU')+' ₽':'Не задан',paid>0?'Оплачено: '+paid.toLocaleString('ru-RU')+' ₽':'Суммы из утверждённого плана','budget');
   guestStats.replaceChildren();
   for(const [value,label]of [
     [number(g.total),'В списке'],[number(g.sent),'Пригласили'],
     [number(g.attending),'Будут'],[number(g.undecided_invitation),'Под вопросом']
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
 const [taskResult,docResult,galleryResult]=await Promise.allSettled([
    call('admin/records?collection=tasks'),call('admin/venue-files'),call('admin/gallery')
  ]);
 if(taskResult.status==='fulfilled'){
   openTasks=(taskResult.value.items||[]).filter(t=>!['done','completed','cancelled'].includes(String(t.status||'').toLowerCase()));
   openTasks.sort((a,b)=>String(a.due_at||'9999').localeCompare(String(b.due_at||'9999')));
   renderTasks();
 }else{taskList.replaceChildren($('p','ad-overview-muted','Список задач временно недоступен.'))}
 if(docResult.status==='fulfilled'){
   docsCount=(docResult.value.files||[]).length;renderDocs();
 }
 if(galleryResult.status==='fulfilled'){
  const assets=galleryResult.value.assets||[];
  photoCount=assets.length;
  photoPublic=assets.filter(photo=>Number(photo.is_public)===1).length;
  renderDocs();
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
     feedback.textContent='';showAdminToast('Изменения сохранены.');
     if(!defaults)form.reset();
   }catch(err){feedback.textContent='';showAdminToast(errorText(err),{kind:'error'})}
   finally{action.disabled=false}
 });
 host.append(form);
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

async function renderSection(host,section){
 if(section==='overview'){await overview(host);return}
 if(section==='menu'){await collection(host,'menu_options');return}
 if(section==='schedule'){await renderWeddingProgram(host,call,adminProgramDays,PUBLIC_VENUES);return}
 if(section==='settings'){await renderWeddingSettings(host,call);return}
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
 const supported=['overview','budget','tasks','schedule','menu','settings'];
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
