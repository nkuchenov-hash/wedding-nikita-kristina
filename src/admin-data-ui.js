import {showAdminToast} from './admin-toast.js';
import {weddingDays} from './data.js';
const adminProgramDays=[...weddingDays,
 {date:'2027-06-20',label:'20 июня',weekday:'Воскресенье'},
 {date:'2027-06-21',label:'21 июня',weekday:'Понедельник'}];
import {renderWeddingProgram} from './admin-program.js';
import {renderWeddingSettings} from './admin-settings.js';
import {PUBLIC_VENUES,loadVenueDashboard} from './venues.js';
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
// Dashboard: one source of truth per section; no static figures or duplicated summaries.
export const taskIsOpen=task=>!['done','completed','cancelled'].includes(String(task.status||'').toLowerCase());
export function dashboardTasks(tasks,today){
 return tasks.filter(taskIsOpen).sort((a,b)=>String(a.due_at||'9999').localeCompare(String(b.due_at||'9999'))||String(a.title).localeCompare(String(b.title),'ru'))
  .map(task=>({...task,overdue:!!task.due_at&&String(task.due_at).slice(0,10)<today}));
}
async function overview(host){
 host.classList.add('ad-overview-shell');
 const page=$('div','ad-overview-dashboard ad-work-dashboard');
 const head=$('header','ad-overview-heading admin-page-heading');
 head.append($('h1','','Обзор подготовки'));page.append(head);
 const money=n=>Math.round(Number(n)||0).toLocaleString('ru-RU')+' ₽';
 const n=v=>Number(v)||0;
 const link=(path,label,cls='ad-work-link')=>{const a=$('a',cls,label);a.href='#/admin/'+path;return a};
 const dateLabel=d=>d.slice(8,10)+' июня';
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const blocks=$('div','ad-work-grid');page.append(blocks);host.replaceChildren(page);
 function panel(label,path){
  const el=$('section','ad-work-panel');
  const header=$('div','ad-work-panel-head');header.append($('h2','',label),link(path,'Открыть →'));
  const body=$('div','ad-work-body');body.append($('p','ad-work-muted','Загрузка…'));el.append(header,body);blocks.append(el);return body;
 }
 const tasksBody=panel('Задачи','tasks');
 const guestsBody=panel('Гости','guests');
 const venuesBody=panel('Площадки','venues');
 const programBody=panel('Программа','schedule');
 const budgetBody=panel('Бюджет','budget');
 const photosBody=panel('Галерея','photos');
 const taskFilter=$('select','ad-work-task-filter');taskFilter.setAttribute('aria-label','Показать задачи');
 for(const [key,label] of [['all','Открытые'],['overdue','Просроченные'],['unscheduled','Без срока']]){const o=$('option','',label);o.value=key;taskFilter.append(o)}
 let snapshot={},loading=false,mutation=false,overviewOffline=false,expanded=false,taskMode='all';
 const unavailable=body=>body.replaceChildren($('p','ad-work-muted','Данные временно недоступны.'));
 const dataRow=(path,label,value)=>{const a=link(path,'','ad-work-data-row');a.append($('span','',label),$('strong','',String(value)));return a};
 const note=text=>$('p','ad-work-muted',text);
 function renderTasks(){
  if(!snapshot.tasks){unavailable(tasksBody);return}
  const all=dashboardTasks(snapshot.tasks.items||[],today());
  const overdue=all.filter(t=>t.overdue).length;
  const bar=$('div','ad-work-toolbar');bar.append($('strong','',all.length+' открыто'+(overdue?' · '+overdue+' просрочено':'')),taskFilter);
  taskFilter.value=taskMode;tasksBody.replaceChildren(bar);
  const selected=all.filter(t=>taskMode==='overdue'?t.overdue:taskMode==='unscheduled'?!t.due_at:true);
  const rows=$('div','ad-work-task-list');
  for(const task of (expanded?selected:selected.slice(0,4))){
   const row=$('div','ad-work-task-row');
   const done=$('button','ad-work-task-done','✓');done.type='button';done.setAttribute('aria-label','Завершить: '+task.title);done.disabled=mutation;
   done.addEventListener('click',async()=>{
    if(mutation)return;
    mutation=true;renderTasks();
    try{await call('admin/records',{method:'PATCH',body:{collection:'tasks',id:task.id,fields:{status:'done'}}});
     snapshot.tasks.items=snapshot.tasks.items.map(t=>t.id===task.id?{...t,status:'done'}:t);
     showAdminToast('Задача выполнена.');
    }catch(error){showAdminToast(errorText(error),{kind:'error'})}
    finally{mutation=false;renderTasks();void refresh()}
   });
   const a=link('tasks/'+encodeURIComponent(task.id),task.title,'ad-work-task-name');
   if(task.due_at){const d=String(task.due_at).slice(0,10);a.append($('small',task.overdue?'ad-work-overdue':'',d.split('-').reverse().join('.')))}
   row.append(done,a);rows.append(row);
  }
  if(!selected.length)rows.append(note('Нет задач по выбранному фильтру.'));
  tasksBody.append(rows);
  if(selected.length>4){const more=button(expanded?'Свернуть':'Показать все '+selected.length,()=>{expanded=!expanded;renderTasks()});more.classList.add('ad-work-more');tasksBody.append(more)}
 }
 taskFilter.addEventListener('change',()=>{taskMode=taskFilter.value;expanded=false;renderTasks()});
 function render(){
  renderTasks();
  const g=snapshot.overview?.guests;
  if(g){
   guestsBody.replaceChildren(
    dataRow('guests/base','Основной состав',n(g.total)),
    dataRow('guests/base/yes','Подтвердили',n(g.attending)),
    dataRow('guests/base/unsent','Приглашения не отправлены',Math.max(0,n(g.total)-n(g.sent))),
    dataRow('guests/base/unanswered','Нет ответа',Math.max(0,n(g.total)-n(g.responded))),
    dataRow('guests/reserve','Резерв',n(g.reserved)));
  }else unavailable(guestsBody);
  const v=snapshot.venues;
  if(v){
   venuesBody.replaceChildren(dataRow('venues','В сравнении',v.active),dataRow('venues/available','Свободны 19 июня',v.available19),dataRow('venues/archive','В архиве',v.archived));
   if(v.leaders.length){
    venuesBody.append($('h3','ad-work-subhead','Лучшие по текущему рейтингу'));
    for(const venue of v.leaders){
     const a=link('venues/'+encodeURIComponent(venue.id),'','ad-work-data-row');
     const left=$('span','',venue.name);
     if(venue.date19!=='available')left.append($('small','ad-work-muted',venue.date19==='unavailable'?'19 июня занято':'19 июня не подтверждено'));
     a.append(left,$('strong','',String(venue.score)));venuesBody.append(a);
    }
   }
  }else unavailable(venuesBody);
  if(snapshot.schedule){
   const items=snapshot.schedule.items||[];
   programBody.replaceChildren();
   for(const d of adminProgramDays){
    const day=items.filter(x=>assignedDay(x)===d.date),placed=day.filter(scheduled),ideas=day.length-placed.length;
    const row=$('div','ad-work-day');
    row.append(link('schedule/'+d.date,dateLabel(d.date)),link('schedule/'+d.date,placed.length+' в программе','ad-work-day-count'),link('schedule/'+d.date+'/ideas',ideas+' идей','ad-work-day-count'));programBody.append(row);
   }
  }else unavailable(programBody);
  const b=snapshot.overview?.budget;
  if(b){
   budgetBody.replaceChildren(dataRow('budget','План',n(b.planned)?money(b.planned):'Не задан'),dataRow('budget','Согласовано',money(b.committed)),dataRow('budget','Оплачено',money(b.paid)));
   if(n(b.planned)>0)budgetBody.append(dataRow('budget','Остаток плана',money(n(b.planned)-n(b.paid))));
  }else unavailable(budgetBody);
  if(snapshot.gallery){const assets=snapshot.gallery.assets||[];photosBody.replaceChildren(dataRow('photos','Фотографии',assets.length),dataRow('photos','Отмечены для гостей',assets.filter(x=>Number(x.is_public)===1).length))}
  else unavailable(photosBody);
 }
 let fingerprint='';
 async function refresh(){
  if(loading||mutation||!host.isConnected)return;
  loading=true;
  try{
   const results=await Promise.allSettled([call('admin/overview'),call('admin/records?collection=tasks'),call('admin/records?collection=schedule_items'),loadVenueDashboard(host),call('admin/gallery')]);
   if(!host.isConnected||mutation)return;
   const keys=['overview','tasks','schedule','venues','gallery'];
   let failed=false;results.forEach((r,i)=>{if(r.status==='fulfilled')snapshot[keys[i]]=r.value;else failed=true});
   if(failed&&!overviewOffline)showAdminToast('Часть данных недоступна. Сохранены последние загруженные значения.',{kind:'error'});
   overviewOffline=failed;
   const next=JSON.stringify(snapshot);if(next!==fingerprint){fingerprint=next;render()}else if(!fingerprint)render();
  }finally{loading=false}
 }
 await refresh();
 if(!host.isConnected)return;
 if(overviewTimer)clearInterval(overviewTimer);
 overviewTimer=setInterval(()=>{
  if(!host.isConnected){clearInterval(overviewTimer);overviewTimer=null;return}
  if(document.visibilityState==='visible')void refresh();
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
     if(type==='tasks'&&location.hash.startsWith('#/admin/tasks/'))location.hash='#/admin/tasks';
     else await redraw();
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
 const requested=type==='tasks'?location.hash.match(/^#\/admin\/tasks\/([^/]+)$/)?.[1]:null;
 if(requested){const target=items.find(item=>String(item.id)===decodeURIComponent(requested));if(target)edit(target)}
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
   if(section==='overview'&&host.isConnected)host.replaceChildren($('p','ad-work-muted','Дашборд недоступен: '+errorText(err)));else host.remove();
 }
}
