import {weddingDays} from './data.js';
import {PUBLIC_VENUES} from './venues.js';
import {VENUE_RECORDS} from './venues-data.js';
// Wedding admin live-data layer. Never stores guest details in browser storage.
const API='/admin/index.php?api=';
const $=(tag,cls='',text='')=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el};
const state={csrf:'',role:'anonymous',busy:false};
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
 const data=await call('admin/overview');
 title(host,'Реальные данные подготовки','Сведения сохранены в закрытой базе REG.RU');
 const metrics=$('div','ad-live-metrics');host.append(metrics);
 metric(metrics,'Гостей',Number(data.guests?.total||0));
 metric(metrics,'Зарегистрировались',Number(data.guests?.registered||0));
 const yes=data.rsvp?.find(x=>x.attendance==='yes')?.total||0;
 metric(metrics,'Ответили «Да»',yes);
 metric(metrics,'Фото на проверке',data.photos_pending||0);
 metric(metrics,'Бюджет (план)',Number(data.budget?.planned||0).toLocaleString('ru-RU')+' ₽');
 metric(metrics,'Задачи',Number(data.tasks?.open||0));
 const p=$('p','ad-live-muted','Личные данные и ответы гостей хранятся только на сервере, а не в GitHub.');
 host.append(p);
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
 let editor=null;
 async function redraw(){
   host.replaceChildren();
   await collection(host,type);
   if(type==='budget_lines')budgetScenario(host);
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
   type==='budget_lines'?'Фактических платежей пока нет. Предложения площадок ниже не являются расходами.':
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
           is_public:Number(item?.is_public||0),
           sort_order:item?.sort_order??90
         }
       };
       if(!payload.fields.title)throw new Error('Укажите название события');
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
function budgetScenario(host){
 const estimates=[];
 for(const venue of PUBLIC_VENUES){
   const record=VENUE_RECORDS[venue.id]||{};
   const sourceQuotes=Array.isArray(record.quotes)?record.quotes:[];
   if(sourceQuotes.length){
     for(const quote of sourceQuotes){
       if(typeof quote.total!=='number'||!Number.isFinite(quote.total)||quote.total<=0)continue;
       estimates.push({
         name:venue.name,date:quote.date||'Не указана',guests:quote.guests||'—',
         total:quote.total,source:venue.quoteSource||record.quoteSource||''
       });
     }
   }else if(typeof venue.cost?.quoteTotal==='number'&&venue.cost.quoteTotal>0){
     estimates.push({
       name:venue.name,date:venue.quoteDate||'Не указана',
       guests:venue.cost.quoteGuests||'—',total:venue.cost.quoteTotal,
       source:venue.quoteSource||record.quoteSource||''
     });
   }
 }
 if(!estimates.length){
   message(host,'Отдельные сметы площадок доступны в разделе «Документы и сметы».');
   return;
 }
 const section=$('section','ad-live-subsection');title(section,'Полученные предложения площадок',
   'Это альтернативные варианты банкета, а не совместные расходы. Суммы нельзя складывать между площадками.');
 const rows=estimates.sort((a,b)=>a.total-b.total).map(item=>{
   const source=$('a','ad-live-document-link','Документ');
   try{
     const uri=new URL(item.source);
     if(!['https:'].includes(uri.protocol))throw Error('unsafe');
     source.href=uri.href;source.target='_blank';source.rel='noopener noreferrer';
   }catch{source.textContent='В архиве';source.removeAttribute('href')}
   return [item.name,item.date,item.guests,item.total.toLocaleString('ru-RU')+' ₽',source];
 });
 table(section,['Площадка','Дата','Гостей','Стоимость предложения','Источник'],rows);
 section.append($('p','ad-live-muted','Условия, состав услуг и итоговая цена требуют сверки с приложенными сметами. Подтверждённые платежи ведутся отдельно выше.'));
 host.append(section);
}
async function renderSection(host,section){
 if(section==='overview'){await overview(host);return}
 if(section==='moderation'){await moderation(host);return}
 if(section==='menu'){await collection(host,'menu_options');return}
 if(section==='guests'){await guests(host);return}
 if(section==='schedule'){await schedule(host);return}
 if(section==='venues'){await collection(host,'venues');return}
 if(mapSection[section]){
   await collection(host,mapSection[section]);
   if(section==='budget')budgetScenario(host);
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
 const destination=root.querySelector('.admin-content');if(!destination)return;
 const supported=['overview','venues','budget','tasks','schedule','moderation','menu'];
 if(!supported.includes(section))return;
 const host=$('section','ad-live-panel');host.setAttribute('aria-label','Данные свадебной базы');
 destination.prepend(host);
 try{
   const session=await call('auth/session');
   state.csrf=session.csrf;state.role=session.role;
   if(session.role!=='admin'){login(host,section);return}
   await renderSection(host,section);
   // Switch to live records only after the authenticated request succeeds.
   if(!['overview','venues'].includes(section))for(const el of [...destination.children])if(el!==host)el.hidden=true;
 }catch(err){
   // Live API is not enabled on this release. Leave the existing authenticated admin tools visible.
   host.remove();
 }
}
