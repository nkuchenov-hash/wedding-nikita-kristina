// Wedding admin live-data layer. Never stores guest details in browser storage.
const API='/api/index.php?r=';
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
const mapSection={budget:'budget_lines',vendors:'vendors',tasks:'tasks',schedule:'schedule_items',catering:'vendors'};
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
function showForm(host,config,submit){
 const form=$('form','ad-live-form');
 for(const [key,label]of config)form.append(fieldInput(key,label));
 const action=$('button','ad-live-button','Сохранить');action.type='submit';form.append(action);
 const status=$('p','ad-live-message');form.append(status);
 form.addEventListener('submit',async e=>{
   e.preventDefault();action.disabled=true;
   const payload={};
   for(const [key]of config){const val=form.elements.namedItem(key)?.value?.trim()||'';
     if(!val)continue;payload[key]=numeric.has(key)?Number(val):val;
   }
   try{await submit(payload);status.textContent='Сохранено в базе';form.reset();}catch(err){status.textContent=errorText(err)}
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
 const imp=$('section','ad-live-subsection');title(imp,'Импорт гостей','Для Excel используйте конвертер XLSX→CSV; дубликаты не перезаписываются.');
 const form=$('form','ad-live-import');const file=$('input');file.type='file';file.accept='.csv,text/csv';file.required=true;
 const b=$('button','ad-live-button','Загрузить CSV');b.type='submit';const status=$('p','ad-live-message');
 form.append(file,b,status);host.append(imp);imp.append(form);
 form.addEventListener('submit',async e=>{
   e.preventDefault();const f=file.files?.[0];if(!f)return;
   const fd=new FormData();fd.append('file',f);
   b.disabled=true;try{const out=await call('admin/import/guests',{method:'POST',body:fd,form:true});
     status.textContent='Импортировано: '+out.imported+'; пропущено: '+out.skipped;
   }catch(err){status.textContent=errorText(err)}finally{b.disabled=false}
 });
}
async function collection(host,type){
 const data=await call('admin/records?collection='+encodeURIComponent(type));
 title(host,({venues:'Сравнение площадок',vendors:'Подрядчики',budget_lines:'Бюджет',tasks:'Задачи',menu_options:'Меню',schedule_items:'Программа'})[type]||type);
 const keys=fields[type]||[];
 const records=(data.items||[]).map(item=>keys.map(([k])=>item[k]??'—'));
 if(records.length)table(host,keys.map(([,label])=>label),records);
 else message(host,'Пока нет записей в базе');
 const section=$('section','ad-live-subsection');title(section,'Добавить запись');
 showForm(section,keys,async row=>call('admin/records',{method:'POST',body:{collection:type,fields:row}}));
 host.append(section);
}
async function renderSection(host,section){
 if(section==='overview'){await overview(host);return}
 if(section==='guests'){await guests(host);return}
 if(section==='venues'){await collection(host,'venues');return}
 if(mapSection[section]){await collection(host,mapSection[section]);return}
 title(host,'База данных подключена','Раздел будет подключён к защищённым записям.');
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
 const supported=['overview','guests','venues','budget','vendors','tasks','schedule','catering'];
 if(!supported.includes(section))return;
 const host=$('section','ad-live-panel');host.setAttribute('aria-label','Данные свадебной базы');
 destination.prepend(host);
 try{
   const session=await call('auth/session');
   state.csrf=session.csrf;state.role=session.role;
   if(session.role!=='admin'){login(host,section);return}
   // Remove stale demo-only figures once verified live data is available.
   for(const el of [...destination.children])if(el!==host)el.hidden=true;
   await renderSection(host,section);
 }catch(err){
   host.append($('div','ad-live-offline','Серверная база подготовлена, но онлайн-доступ к личным данным пока отключён до завершения HTTPS и авторизации.'));
 }
}
