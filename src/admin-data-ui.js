import {renderProduction,productionCost} from './admin-production.js';
import {showAdminToast} from './admin-toast.js';
import {weddingDays,adminModules} from './data.js';
const adminProgramDays=[...weddingDays,
 {date:'2027-06-20',label:'20 июня',weekday:'Воскресенье'},
 {date:'2027-06-21',label:'21 июня',weekday:'Понедельник'}];
import {renderWeddingProgram} from './admin-program.js';
import {renderWeddingSettings} from './admin-settings.js';
import {PUBLIC_VENUES,loadVenueDashboard,loadVenueBudgetOptions} from './venues.js';
import {assignedDay,scheduled} from './admin-program.js';
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
const mapSection={tasks:'tasks'};
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
// Dashboard: one source of truth per section; no static figures or duplicated summaries.
export const taskIsOpen=task=>!['done','completed','cancelled'].includes(String(task.status||'').toLowerCase());
export function dashboardTasks(tasks,today){
 return tasks.filter(taskIsOpen).sort((a,b)=>String(a.due_at||'9999').localeCompare(String(b.due_at||'9999'))||String(a.title).localeCompare(String(b.title),'ru'))
  .map(task=>({...task,overdue:!!task.due_at&&String(task.due_at).slice(0,10)<today}));
}
export function dashboardProgress(tasks){
 const counted=tasks.filter(t=>String(t.status||'').toLowerCase()!=='cancelled');
 const done=counted.filter(t=>['done','completed'].includes(String(t.status||'').toLowerCase())).length;
 return {done,total:counted.length,percent:counted.length?Math.round(done/counted.length*100):0};
}
async function overview(host){
 host.classList.add('ad-overview-shell','ad-premium-shell');
 const page=$('div','ad-premium');
 const money=n=>Math.round(Number(n)||0).toLocaleString('ru-RU')+' ₽',n=v=>Number(v)||0;
 const paths={users:'M15.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0M5 21v-3a7 7 0 0 1 14 0v3M5 4a4 4 0 0 0 0 8M19 4a4 4 0 0 1 0 8',house:'M2 10 12 2 22 10M5 9v12h14V9M9 21v-8h6v8',task:'M3 3h18v18H3zM7 12l3 3 7-7',money:'M4 5a8 3 0 1 0 16 0 8 3 0 1 0-16 0M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0',calendar:'M3 5h18v16H3zM7 2v6M17 2v6M3 10h18',photo:'M3 3h18v18H3zM8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4M3 18l7-7 4 4 3-3 4 4',pin:'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0ZM14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0',arrow:'m9 5 7 7-7 7',search:'M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',bell:'M5 9a7 7 0 0 1 14 0v5l2 3H3l2-3ZM9 20a3 3 0 0 0 6 0',check:'m5 12 4 4L19 6',grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'};
 function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.grid);svg.append(path);return svg}
 const link=(route,label,cls='pd-link')=>{const a=$('a',cls,label);a.href='#/admin/'+route;return a};
 const action=(label,fn,cls='pd-action')=>{const b=$('button',cls,label);b.type='button';b.addEventListener('click',fn);return b};
 const note=text=>$('p','pd-muted',text);
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const fmtDate=d=>{const date=new Date(String(d).slice(0,10)+'T12:00:00');return Number.isFinite(date.getTime())?date.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}).replace(/ г\.$/,''):String(d||'Дата уточняется')};
 const top=$('header','pd-top');top.append($('h1','','Никита и Кристина'));page.append(top);
 const hero=$('section','pd-hero'),heroContent=$('div','pd-hero-content');hero.append(heroContent);page.append(hero);
 const tiles=$('section','pd-tiles');tiles.setAttribute('aria-label','Основные разделы');page.append(tiles);
 const grid=$('div','pd-grid'),left=$('div','pd-stack'),right=$('div','pd-stack');grid.append(left,right);page.append(grid);
 function panel(parent,label,path,caption){const p=$('section','pd-panel'),h=$('header','pd-panel-head');h.append($('h2','',label));if(path){const a=link(path,caption||'Открыть');a.append(icon('arrow'));h.append(a)}const b=$('div','pd-panel-body');p.append(h,b);parent.append(p);return b}
 const tasksBody=panel(left,'Сейчас важно','tasks','Все задачи');
 const programBody=panel(left,'Программа',null);
 const progress=$('a','pd-progress');progress.href='#/admin/tasks';right.append(progress);
 const activityBody=panel(right,'Последние изменения',null);
 const extra=$('section','pd-extras');page.append(extra);
 host.replaceChildren(page);
 let snapshot={},loading=false,mutation=false,overviewOffline=false,fingerprint='',day='2027-06-19',chosenDay=false,expanded=false,allHistory=false,revision=null,forceRefresh=true;
 const dialog=$('dialog','pd-dialog');page.append(dialog);
 function showDialog(title,content){dialog.replaceChildren();const header=$('header','pd-panel-head');header.append($('h2','',title),action('×',()=>dialog.close(),'pd-close'));dialog.append(header,content);if(!dialog.open)dialog.showModal()}
 function activityRoute(a){
  const id=encodeURIComponent(a.entity_id||'');
  if(a.entity_type==='tasks')return 'tasks/'+id;
  if(a.entity_type==='schedule_items'){const e=(snapshot.schedule?.items||[]).find(x=>String(x.id)===String(a.entity_id));return e?'schedule/'+assignedDay(e)+'/'+(scheduled(e)?'event':'ideas')+'/'+id:'schedule'}
  if(['guest','guest_profile','rsvp','profile'].includes(a.entity_type))return a.guest_id?'guests/profile/'+encodeURIComponent(a.guest_id):'guests';
  if(a.entity_type==='venue_date_status')return 'venues/'+id;
  if(a.entity_type==='venues')return 'venues';
  if(a.entity_type==='event_setting')return 'settings';
  if(a.entity_type==='vendors')return 'vendors';
  if(a.entity_type==='decor_items')return 'decor';
  if(a.entity_type==='budget_lines')return 'budget';
  if(['menu','menu_options'].includes(a.entity_type))return 'menu';
  if(['gallery_photo','photo','photos'].includes(a.entity_type))return 'photos';
  return 'guests';
 }
 function historyRows(parent,limit){
  const history=snapshot.overview?.dashboard_activity;
  if(!Array.isArray(history)){parent.append(note('Журнал изменений недоступен.'));return}
  const names={tasks:'Задачи',schedule_items:'Программа',guest:'Гости',guest_profile:'Профиль гостя',profile:'Профиль гостя',rsvp:'Ответ гостя',venues:'Площадки',venue_date_status:'Доступность площадки',event_setting:'Настройки',budget_lines:'Бюджет',vendors:'Подрядчики',decor_items:'Декор',menu_options:'Меню',menu:'Меню',gallery_photo:'Галерея',photo:'Фотографии',guest_relationship:'Связи гостей',companion:'Сопровождение',invitation:'Приглашения'};
  const verbs={create:'Добавлено',update:'Изменено',delete:'Удалено',edit_slot:'Изменено время',arrange:'Перестроено расписание',upload:'Загружено',submit:'Получен ответ',clear:'Очищено',mark_sent:'Отправлено',mark_not_sent:'Отменена отправка',issue:'Создано приглашение',choose:'Выбрано'};
  const icons={tasks:'task',schedule_items:'calendar',venues:'house',venue_date_status:'house',budget_lines:'money',gallery_photo:'photo',photo:'photo'};
  for(const a of history.slice(0,limit)){
   const row=link(activityRoute(a),'','pd-activity'),circle=$('span','pd-activity-icon');circle.append(icon(icons[a.entity_type]||'users'));
   const desc=$('span','pd-activity-text'),title=names[a.entity_type]||'Подготовка',verb=verbs[a.action]||'Изменение';
   desc.append($('strong','',title),$('small','',verb+(a.entity_label?' · '+a.entity_label:'')));
   const stamp=new Date(String(a.created_at||'').replace(' ','T')+'Z'),time=$('time','',Number.isFinite(stamp.getTime())?(stamp.toLocaleDateString('ru-RU')===new Date().toLocaleDateString('ru-RU')?stamp.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):stamp.toLocaleDateString('ru-RU',{day:'numeric',month:'short'})):'');
   row.append(circle,desc,time);parent.append(row);
  }
  if(!history.length)parent.append(note('Изменений пока нет.'));
 }
 function search(){
  const box=$('div'),input=$('input','pd-search');input.placeholder='Найти раздел, задачу, площадку…';input.setAttribute('aria-label','Поиск');const results=$('div');box.append(input,results);
  const update=()=>{const q=input.value.trim().toLocaleLowerCase('ru');const entries=[...adminModules.map(x=>[x.label,x.id]),...(snapshot.tasks?.items||[]).map(t=>[t.title,'tasks/'+encodeURIComponent(t.id)]),...(snapshot.venues?.venues||[]).map(v=>[v.name,'venues/'+encodeURIComponent(v.id)]),...(snapshot.schedule?.items||[]).map(e=>[e.title,'schedule/'+assignedDay(e)+'/'+(scheduled(e)?'event':'ideas')+'/'+encodeURIComponent(e.id)])];results.replaceChildren();for(const [name,route] of entries.filter(([name])=>String(name).toLocaleLowerCase('ru').includes(q)).slice(0,15)){const a=link(route,name,'pd-search-result');a.addEventListener('click',()=>dialog.close());results.append(a)}if(!results.childElementCount)results.append(note('Ничего не найдено.'))};input.addEventListener('input',update);update();showDialog('Поиск',box);input.focus()
 }
 const headerActions=$('div','pd-header-actions');
 for(const [label,i,fn] of [['Поиск','search',search],['История изменений','bell',()=>{const list=$('div');historyRows(list,50);showDialog('История изменений',list)}]]){
  const b=action('',fn,'pd-icon-button');b.setAttribute('aria-label',label);b.append(icon(i));headerActions.append(b);
 }
 top.append(headerActions);
 const mobileActions=host.closest('.admin-layout')?.querySelector('.admin-mobile-actions');
 if(mobileActions){for(const [label,i,fn] of [['Поиск','search',search],['История изменений','bell',()=>{const list=$('div');historyRows(list,50);showDialog('История изменений',list)}]]){const b=action('',fn,'pd-icon-button');b.setAttribute('aria-label',label);b.append(icon(i));mobileActions.append(b)}}
 function renderTasks(){
  tasksBody.replaceChildren();
  if(!snapshot.tasks){tasksBody.append(note('Задачи недоступны.'));return}
  const all=dashboardTasks(snapshot.tasks.items||[],today());
  for(const [i,task] of (expanded?all:all.slice(0,4)).entries()){
   const row=$('div','pd-task'+(i===0?' featured':''));
   const done=action('',async()=>{
    if(mutation)return;mutation=true;renderTasks();
    try{await call('admin/records',{method:'PATCH',body:{collection:'tasks',id:task.id,fields:{status:'done'}}});
     snapshot.tasks.items=snapshot.tasks.items.map(t=>t.id===task.id?{...t,status:'done'}:t);showAdminToast('Задача выполнена.');
    }catch(e){showAdminToast(errorText(e),{kind:'error'})}
    finally{mutation=false;render();forceRefresh=true;void refresh()}
   },'pd-check');done.setAttribute('aria-label','Завершить: '+task.title);done.disabled=mutation;
   const a=link('tasks/'+encodeURIComponent(task.id),'','pd-task-info');a.append($('strong','',task.title));
   const subtitle=[task.due_at?'Срок: '+String(task.due_at).slice(0,10).split('-').reverse().join('.'):null,task.owner||null].filter(Boolean).join(' · ');
   if(subtitle)a.append($('small',task.overdue?'pd-overdue':'',subtitle));
   row.append(done,a,icon('arrow'));tasksBody.append(row);
  }
  if(!all.length)tasksBody.append(note('Все открытые задачи выполнены.'));
  if(all.length>4)tasksBody.append(action(expanded?'Свернуть':'Ещё '+(all.length-4)+' задач',()=>{expanded=!expanded;renderTasks()},'pd-link'));
 }
 function render(){
  const settings=snapshot.settings?.settings,g=snapshot.overview?.guests,v=snapshot.venues,b=snapshot.overview?.budget,taskData=snapshot.tasks?.items;
  const eventDate=settings?.event_date||weddingDays.find(d=>d.date==='2027-06-19')?.date;
  if(!chosenDay&&adminProgramDays.some(d=>d.date===eventDate))day=eventDate;
  heroContent.replaceChildren($('div','pd-eyebrow','ПОДГОТОВКА К СВАДЬБЕ'),$('h2','',fmtDate(eventDate)), $('p','',settings?settings.date_confirmed?'Дата торжества подтверждена':'Предварительная дата торжества':'Данные даты уточняются'));
  const meta=$('div','pd-hero-meta');
  const city=link('settings','','pd-hero-meta-link');city.append(icon('pin'),$('span','',settings?.place_confirmed&&settings.event_venue?settings.event_venue:'Санкт-Петербург'));
  const reg=link('schedule/2027-06-17','','pd-hero-meta-link');reg.append(icon('calendar'),$('span','','17 июня · регистрация'));
  meta.append(city,reg);heroContent.append(meta);
  const go=hero.querySelector('.pd-hero-link');go?.remove();hero.append(link('schedule/'+day,'Открыть программу →','pd-hero-link'));
  tiles.replaceChildren();
  for(const [label,i,value,sub,route] of [
   ['Гости','users',g?n(g.total):'—',g?n(g.attending)+' подтвердили':'','guests/base'],
   ['Площадки','house',v?v.active:'—',v?v.available19+' свободны 19 июня':'','venues'],
   ['Задачи','task',taskData?taskData.filter(taskIsOpen).length:'—','Осталось выполнить','tasks'],
   ['Бюджет','money',b?(n(b.planned)?money(b.planned):'Не задан'):'—',b?n(b.paid)?'Оплачено '+money(b.paid):'План расходов':'','budget']]){
   const a=link(route,'','pd-tile'),h=$('span','pd-tile-head');h.append(icon(i),$('span','',label));a.append(h,$('strong','pd-tile-value',value));if(sub)a.append($('span','pd-tile-sub',sub));tiles.append(a);
  }
  renderTasks();
  const p=taskData?dashboardProgress(taskData):null,ph=$('div','pd-progress-top');ph.append($('span','','Выполнено задач'),$('strong','',p?p.percent+'%':'—'));
  const track=$('div','pd-track');track.setAttribute('role','progressbar');track.setAttribute('aria-label','Выполнено задач');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');if(p)track.setAttribute('aria-valuenow',p.percent);const bar=$('span');bar.style.width=(p?.percent||0)+'%';track.append(bar);
  progress.replaceChildren(ph,track,$('p','',p?p.done+' из '+p.total+' задач выполнено':'Данные недоступны'));
  programBody.replaceChildren();
  const planLink=programBody.parentElement.querySelector('.pd-panel-head .pd-link');planLink?.remove();const pl=link('schedule/'+day,'К плану');pl.append(icon('arrow'));programBody.parentElement.querySelector('.pd-panel-head').append(pl);
  const days=$('div','pd-days');
  for(const [i,d] of adminProgramDays.entries()){const btn=action('',()=>{day=d.date;chosenDay=true;render()},'pd-day'+(day===d.date?' selected':''));btn.setAttribute('aria-pressed',String(day===d.date));btn.append($('strong','',d.date.slice(-2)),$('small','',['чт','пт','сб','вс','пн'][i]));days.append(btn)}
  programBody.append(days);
  if(snapshot.schedule){const items=snapshot.schedule.items||[],events=items.filter(e=>assignedDay(e)===day&&scheduled(e)).sort((a,b)=>String(a.start_at).localeCompare(String(b.start_at))),ideas=items.filter(e=>assignedDay(e)===day&&!scheduled(e)).length;
   for(const e of events.slice(0,3)){const a=link('schedule/'+day+'/event/'+encodeURIComponent(e.id),'','pd-event'),text=$('span');text.append($('strong','',e.title));if(e.place)text.append($('small','',e.place));a.append($('time','',String(e.start_at).slice(11,16)),text,icon('arrow'));programBody.append(a)}
   if(!events.length)programBody.append(note('На этот день программа пока не составлена.'));
   if(events.length>3)programBody.append(link('schedule/'+day,'Ещё '+(events.length-3)+' активностей'));
   if(ideas)programBody.append(link('schedule/'+day+'/ideas',ideas+' идей →'));
  }else programBody.append(note('Программа недоступна.'));
  activityBody.replaceChildren();historyRows(activityBody,allHistory?12:4);
  if((snapshot.overview?.dashboard_activity||[]).length>4)activityBody.append(action(allHistory?'Свернуть':'Все события',()=>{allHistory=!allHistory;render()},'pd-link'));
  extra.replaceChildren();
  const assets=snapshot.gallery?.assets;
  const menu=snapshot.menu?.items;
  for(const [route,label,i,sub] of [['photos','Фотографии','photo',assets?assets.length+' в галерее':''],['menu','Банкетное меню','grid',menu?menu.length+' позиций меню':''],['settings','Настройки','grid','Дата, место и программа']]){
   const a=link(route,'','pd-extra'),txt=$('span');txt.append($('strong','',label));if(sub)txt.append($('small','',sub));a.append(icon(i),txt,icon('arrow'));extra.append(a);
  }
 }
 async function refresh(){
  if(loading||mutation||!host.isConnected)return;
  loading=true;
  try{
   const check=await call('admin/guests/revision');
   if(!forceRefresh&&revision===Number(check.revision))return;
   forceRefresh=false;
   const results=await Promise.allSettled([call('admin/overview'),call('admin/records?collection=tasks'),call('admin/records?collection=schedule_items'),loadVenueDashboard(host),call('admin/gallery'),call('admin/settings'),call('admin/records?collection=menu_options')]);
   if(!host.isConnected||mutation){forceRefresh=true;return}
   const keys=['overview','tasks','schedule','venues','gallery','settings','menu'];let failed=false;
   results.forEach((r,i)=>{if(r.status==='fulfilled')snapshot[keys[i]]=r.value;else failed=true});
   if(!failed)revision=Number(check.revision);else forceRefresh=true;
   if(failed&&!overviewOffline)showAdminToast('Часть данных недоступна. Сохранены последние загруженные значения.',{kind:'error'});
   overviewOffline=failed;
   const next=JSON.stringify(snapshot);if(next!==fingerprint){fingerprint=next;render()}
  }catch(e){forceRefresh=true;if(!overviewOffline)showAdminToast('Нет связи с базой.',{kind:'error'});overviewOffline=true}
  finally{loading=false}
 }
 render();await refresh();if(!host.isConnected)return;
 const wake=()=>{if(!host.isConnected){window.removeEventListener('focus',wake);document.removeEventListener('visibilitychange',wake);return}if(document.visibilityState==='visible'){forceRefresh=true;void refresh()}};
 window.addEventListener('focus',wake);document.addEventListener('visibilitychange',wake);
 if(overviewTimer)clearInterval(overviewTimer);
 overviewTimer=setInterval(()=>{if(!host.isConnected){clearInterval(overviewTimer);overviewTimer=null;window.removeEventListener('focus',wake);document.removeEventListener('visibilitychange',wake);return}if(document.visibilityState==='visible')void refresh()},3000);
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
 const heading=({venues:'Сравнение площадок',budget_lines:'Бюджет',tasks:'Задачи',menu_options:'Банкетное меню',schedule_items:'Программа'})[type]||type;
 const root=host;root.classList.add('ad-collection-page');
 const header=$('header','admin-page-heading');header.append($('h1','',heading));root.append(header);
 host=$('div','ad-collection-content');root.append(host);
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
   root.replaceChildren();
   await collection(root,type);
 }
 function edit(item){
   if(editor)editor.remove();
   editor=$('section','ad-live-subsection');title(editor,'Редактирование записи');
   showForm(editor,keys,async fields=>{
     await call('admin/records',{method:'PATCH',body:{collection:type,id:item.id,fields}});
     if(type==='tasks'&&location.hash.startsWith('#/admin/tasks/'))location.hash='#/admin/tasks';
     else await redraw();
   },item,'Сохранить изменения');
   host.prepend(editor);
   editor.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 const records=items.map(item=>{
   const row=keys.map(([k])=>item[k]??'—');
   const action=type==='budget_lines'&&String(item.id).startsWith('prod-')?button('Открыть карточку',()=>{location.hash='#/admin/'+(item.vendor_id?'vendors':'decor')}):button('Изменить',()=>edit(item));
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
 const requested=type==='tasks'?location.hash.match(/^#\/admin\/tasks\/([^/]+)$/)?.[1]:null;
 if(requested){const target=items.find(item=>String(item.id)===decodeURIComponent(requested));if(target)edit(target)}
}


const budgetCategories=['Площадка','Подрядчики','Декор','Фото и видео','Образы и кольца','Транспорт','Алкоголь и торт','Полиграфия и подарки','Прочее'];
const budgetRub=v=>Math.round(Number(v)||0).toLocaleString('ru-RU')+' ₽';
const budgetNumber=v=>Number(v)||0;
const budgetDetails=r=>{try{return JSON.parse(r?.details_json||'{}')||{}}catch{return {}}};
export function budgetTotals(rows,limit=null){
 const result={planned:0,committed:0,paid:0,remaining:0,unknown:0};let allocated=0;
 for(const r of rows){result.planned+=budgetNumber(r.planned_rub);result.committed+=budgetNumber(r.committed_rub);result.paid+=budgetNumber(r.paid_rub);result.remaining+=Math.max(0,budgetNumber(r.committed_rub)-budgetNumber(r.paid_rub));if(r.unknown)result.unknown++;allocated+=Math.max(budgetNumber(r.planned_rub),budgetNumber(r.committed_rub),budgetNumber(r.paid_rub))}
 return {...result,free:limit==null?null:limit-allocated};
}
export function budgetRows(lines,vendors,decor,guests){
 const sources=new Map([...vendors.map(r=>[r.id,{r,section:'vendors'}]),...decor.map(r=>[r.id,{r,section:'decor'}])]);
 return lines.map(row=>{
  const linked=String(row.id).startsWith('prod-'),source=linked?sources.get(String(row.id).slice(5)):null;
  const details=budgetDetails(source?.r),isDecor=source?.section==='decor';
  const inclusion=(isDecor&&details.included)||(details.venues||[]).some(v=>v.id===details.venue&&v.mode==='included');
  const fallback=!isDecor&&!['fee','travel','hotel','food','equipment','extras'].some(k=>Object.hasOwn(details,k));
  const unknown=linked&&(!source||(!inclusion&&(fallback?source.r.estimate_rub==null:productionCost(details,isDecor,guests).unknown)));
  return {...row,linked,source,details,unknown,due:linked?details.due||null:row.due_at||null};
 });
}
async function renderBudget(host){
 host.classList.add('ad-budget-shell','ad-collection-page');host.replaceChildren();
 const header=$('header','admin-page-heading budget-heading');header.append($('h1','','Бюджет'));
 const actions=$('div','budget-actions');header.append(actions);host.append(header);
 const body=$('div','budget-body');host.append(body);
 let rows=[],limit=null,guests=80,category='',status='all',search='',venueId='',venueOptions=[],loading=false;
 const primary=(label,fn)=>button(label,fn);
 const secondary=(label,fn)=>{const b=button(label,fn);b.classList.add('budget-secondary');return b};
 const error=e=>showAdminToast(errorText(e),{kind:'error'});
 const select=(options,value,change)=>{const s=$('select');for(const [v,label] of options){const o=$('option','',label);o.value=v;s.append(o)}s.value=value;s.addEventListener('change',()=>change(s.value));return s};
 const field=(form,label,key,value='',type='text')=>{const l=$('label','production-field');l.append($('span','',label));const x=$('input');x.name=key;x.type=type;x.value=value??'';if(type==='number'){x.min='0';x.max='100000000';x.step='1'}l.append(x);form.append(l);return x};
 function drawer(title,build){
  const d=$('dialog','production-drawer budget-drawer'),h=$('header','production-drawer-head'),close=secondary('Закрыть',()=>d.close());h.append($('h2','',title),close);d.append(h);host.append(d);d.addEventListener('close',()=>d.remove());build(d);d.showModal();
 }
 function submitForm(d,form,save){
  const footer=$('div','production-footer'),saveButton=$('button','ad-live-button','Сохранить');saveButton.type='submit';footer.append(secondary('Отмена',()=>d.close()),saveButton);form.append(footer);
  form.addEventListener('submit',async e=>{e.preventDefault();saveButton.disabled=true;try{await save();d.close();await reload();showAdminToast('Изменения сохранены.')}catch(e){error(e)}finally{saveButton.disabled=false}});
 }
 function edit(row={},prefill={}){
  const linked=row.linked,source=row.source;
  if(linked&&!source){error(new Error('Исходная карточка недоступна'));return}
  drawer(row.id?row.description:'Новая статья расходов',d=>{
   const form=$('form','production-form budget-form');d.append(form);
   if(linked){
    const info=$('p','budget-muted',row.unknown?'Часть стоимости пока неизвестна. Уточните состав расходов в карточке.':'Изменения оплаты сохраняются в исходной карточке.');
    const a=$('a','budget-source-link','Открыть исходную карточку →');a.href='#/admin/'+source.section+'/item/'+encodeURIComponent(source.r.id);a.addEventListener('click',()=>d.close());form.append(info,a);
    const p=field(form,'Оплачено всего, ₽','paid',row.paid_rub,'number'),due=field(form,'Срок следующей оплаты','due',row.details.due,'date');
    const agreed=$('label','budget-agreed'),check=$('input');check.type='checkbox';check.checked=!!row.details.agreed;agreed.append(check,$('span','','Известная сумма согласована'));form.append(agreed);
    submitForm(d,form,()=>call('admin/records',{method:'PATCH',body:{collection:source.section==='vendors'?'vendors':'decor_items',id:source.r.id,fields:{details_json:JSON.stringify({...row.details,paid:budgetNumber(p.value),due:due.value,agreed:check.checked})}}}));
   }else{
    const data={...row,...prefill},categoryField=field(form,'Категория','category',data.category||category||'Прочее'),name=field(form,'Статья расходов','description',data.description);name.required=true;categoryField.required=true;
    const plan=field(form,'План, ₽','planned_rub',data.planned_rub??0,'number'),committed=field(form,'Согласовано, ₽','committed_rub',data.committed_rub??0,'number'),paid=field(form,'Оплачено всего, ₽','paid_rub',data.paid_rub??0,'number'),due=field(form,'Срок оплаты','due_at',String(data.due_at||'').slice(0,10),'date'),notes=field(form,'Примечание / источник','notes',data.notes);
    submitForm(d,form,()=>call('admin/records',{method:row.id?'PATCH':'POST',body:{collection:'budget_lines',...(row.id?{id:row.id}:{}),fields:{category:categoryField.value.trim(),description:name.value.trim(),planned_rub:budgetNumber(plan.value),committed_rub:budgetNumber(committed.value),paid_rub:budgetNumber(paid.value),due_at:due.value||null,notes:notes.value}}}));
   }
  });
 }
 function editLimit(){drawer('Лимит бюджета',d=>{const f=$('form','production-form budget-form');d.append(f);const v=field(f,'Общий лимит, ₽','limit',limit??'','number');f.append($('p','budget-muted','Оставьте поле пустым, если общий лимит ещё не определён.'));submitForm(d,f,()=>call('admin/settings',{method:'POST',body:{key:'budget_limit_rub',value:v.value===''?null:budgetNumber(v.value)}}))})}
 actions.append(secondary('Лимит',editLimit),primary('+ Расход',()=>edit()));
 function draw(){
  body.replaceChildren();const totals=budgetTotals(rows,limit);
  const summary=$('div','budget-summary');
  for(const [label,value,sub] of [['Учтено в плане',budgetRub(totals.planned),totals.unknown?totals.unknown+' позиций требуют уточнения':'Известные суммы'],['Согласовано',budgetRub(totals.committed),'Принятые обязательства'],['Оплачено',budgetRub(totals.paid),'Фактические платежи'],['К оплате',budgetRub(totals.remaining),'По согласованным статьям']]){
   const c=$('article','budget-stat');c.append($('span','',label),$('strong','',value),$('small','',sub));summary.append(c)
  }
  body.append(summary);
  const cap=$('section','budget-panel budget-limit'),caphead=$('div','budget-panel-head');caphead.append($('h2','','Общий лимит'),secondary(limit==null?'Задать лимит':'Изменить',editLimit));cap.append(caphead);
  if(limit==null)cap.append($('p','budget-muted','Не задан'));else{const line=$('div','budget-limit-values');line.append($('strong','',budgetRub(limit)), $('span',totals.free<0?'budget-over':'',totals.free<0?'Превышение '+budgetRub(-totals.free):'Остаток '+budgetRub(totals.free)));const p=$('progress');p.max=Math.max(1,limit);p.value=Math.min(p.max,Math.max(0,limit-totals.free));p.setAttribute('aria-label','Использование лимита');cap.append(line,p)}
  body.append(cap);
  const scenario=$('section','budget-panel budget-scenario'),sh=$('div','budget-panel-head');sh.append($('h2','','Площадка и банкет'),$('span','budget-muted',guests+' гостей'));scenario.append(sh);
  const selectVenue=select([['','Выберите вариант для расчёта'],...venueOptions.map(v=>[v.id,v.name])],venueId,v=>{venueId=v;draw()});scenario.append(selectVenue);
  const selected=venueOptions.find(v=>v.id===venueId);
  if(selected){
   const e=selected.estimate,known=e.value??e.knownSubtotal??null;
   const line=$('div','budget-scenario-value');line.append($('strong','',known==null?'Сумма уточняется':(e.partial?'≈ ':'')+budgetRub(known)),$('span','budget-muted',e.note||''));scenario.append(line);
   const link=$('a','budget-source-link','Открыть смету площадки →');link.href='#/admin/venues/'+encodeURIComponent(selected.id)+'/budget';scenario.append(link);
   const existing=rows.find(r=>!r.linked&&String(r.notes||'').startsWith('План площадки:'));
   const anyVenue=rows.some(r=>r.category==='Площадка'&&r!==existing);
   const changingCommittedVenue=existing&&(!String(existing.notes||'').startsWith('План площадки: '+selected.id+';'))&&(budgetNumber(existing.paid_rub)>0||budgetNumber(existing.committed_rub)>0);
   if(e.value!=null&&!anyVenue&&!changingCommittedVenue){const apply=secondary(existing?'Обновить статью площадки':'Включить в план',()=>edit(existing?{...existing,description:selected.name,planned_rub:Math.round(e.value),notes:'План площадки: '+selected.id+'; '+guests+' гостей; '+(e.note||'') }:{},{category:'Площадка',description:selected.name,planned_rub:Math.round(e.value),notes:'План площадки: '+selected.id+'; '+guests+' гостей; '+(e.note||'')}));scenario.append(apply)}
   else if(changingCommittedVenue)scenario.append($('p','budget-muted','По прежней площадке уже есть обязательства или платежи. Сначала урегулируйте их, не переносите автоматически на другой вариант.'));
   else if(anyVenue)scenario.append($('p','budget-muted','Статья площадки уже существует — измените её в списке, чтобы не задвоить сумму.'));
   scenario.append($('small','budget-muted','Расчёт не включается в общий план автоматически. Дополнительные расходы организаторов не прибавляются повторно.'));
  }
  body.append(scenario);
  const panel=$('section','budget-panel budget-ledger'),ph=$('div','budget-panel-head');ph.append($('h2','','Статьи расходов'),$('span','budget-muted',rows.length+' записей'));panel.append(ph);
  const filters=$('div','budget-filters'),q=$('input');q.type='search';q.placeholder='Найти расход';q.value=search;
  const categories=[...new Set([...budgetCategories,...rows.map(r=>r.category)])];
  const cat=select([['','Все категории'],...categories.map(c=>[c,c])],category,v=>{category=v;draw()});
  const st=select([['all','Все расходы'],['unknown','Уточнить стоимость'],['due','К оплате'],['paid','Оплачено']],status,v=>{status=v;draw()});
  filters.append(q,cat,st);panel.append(filters);
  const content=$('div','budget-ledger-content');panel.append(content);body.append(panel);
  const showRows=()=>{
   content.replaceChildren();const visible=rows.filter(r=>(!category||r.category===category)&&(!search||[r.description,r.category,r.notes].join(' ').toLowerCase().includes(search.toLowerCase()))&&(status==='all'||status==='unknown'&&r.unknown||status==='due'&&budgetNumber(r.committed_rub)>budgetNumber(r.paid_rub)||status==='paid'&&budgetNumber(r.paid_rub)>0));
   for(const c of categories.filter(c=>!category||c===category)){
    const group=visible.filter(r=>r.category===c);if(!group.length&&status!=='all'||!group.length&&search)continue;
    const section=$('section','budget-category'),top=$('div','budget-category-head');top.append($('h3','',c),$('strong','',group.length?budgetRub(group.reduce((sum,r)=>sum+budgetNumber(r.planned_rub),0)):'—'));section.append(top);
    if(!group.length){section.append($('p','budget-muted','Расходы пока не добавлены'));section.append(secondary('+ Добавить',()=>edit({}, {category:c})))}
    for(const r of group){
     const entry=$('button','budget-entry');entry.type='button';entry.addEventListener('click',()=>edit(r));
     const desc=$('div','budget-entry-name');desc.append($('strong','',r.description),$('small','budget-muted',r.linked?'Связано с карточкой':r.notes||'Ручная статья'));
     if(r.unknown)desc.append($('span','budget-unknown','Стоимость уточняется'));
     const amounts=$('div','budget-entry-amounts');
     for(const [label,val] of [['План',r.unknown&&!budgetNumber(r.planned_rub)?'—':(r.unknown?'от ':'')+budgetRub(r.planned_rub)],['Согласовано',budgetRub(r.committed_rub)],['Оплачено',budgetRub(r.paid_rub)],['К оплате',budgetRub(Math.max(0,budgetNumber(r.committed_rub)-budgetNumber(r.paid_rub)))]]){const cell=$('div');cell.append($('small','',label),$('strong','',val));amounts.append(cell)}
     entry.append(desc,amounts,$('span','budget-entry-arrow','›'));section.append(entry);
     if(r.due)section.append($('p','budget-due','Срок оплаты: '+String(r.due).slice(0,10).split('-').reverse().join('.')));
    }
    content.append(section);
   }
   if(!content.childElementCount)content.append($('p','budget-muted','Нет расходов по выбранным фильтрам.'));
  };
  q.addEventListener('input',()=>{search=q.value;showRows()});showRows();
 }
 async function reload(){
  if(loading)return;loading=true;
  try{
   const [lines,vendors,decor,settings,overview]=await Promise.all([call('admin/records?collection=budget_lines'),call('admin/records?collection=vendors'),call('admin/records?collection=decor_items'),call('admin/settings'),call('admin/overview')]);
   guests=Math.max(1,Number(overview.guests?.total)||80);limit=settings.settings?.budget_limit_rub??null;
   rows=budgetRows(lines.items||[],vendors.items||[],decor.items||[],guests);
   try{venueOptions=await loadVenueBudgetOptions(host,guests)}catch{venueOptions=[];showAdminToast('Сметы площадок недоступны.',{kind:'error'})}
   draw();
  }finally{loading=false}
 }
 await reload();
}

async function renderSection(host,section){
 if(section==='budget'){await renderBudget(host);return}
 if(section==='vendors'||section==='decor'){await renderProduction(host,call,section);return}
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
 const supported=['overview','budget','tasks','schedule','menu','settings','vendors','decor'];
 if(!supported.includes(section))return;
 const host=$('section','ad-live-panel');host.setAttribute('aria-label','Данные свадебной базы');
 if(section==='overview'){host.append($('p','ad-work-muted','Загрузка дашборда…'));destination.replaceChildren(host)}else destination.prepend(host);
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
   if(['overview','vendors','decor','budget'].includes(section)&&host.isConnected)host.replaceChildren($('p','ad-work-muted','Раздел недоступен: '+errorText(err)));else host.remove();
 }
}
