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
  schedule_items:[['title','Событие'],['start_at','Начало'],['end_at','Конец'],['place','Место'],['notes','Примечание']],
  documents:[['category','Категория'],['label','Название'],['reference','Ссылка на файл'],['visibility','Доступ']]
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
async function settings(host){
 const data=await call('admin/settings');
 title(host,'Настройки свадьбы','Гостевые функции изначально закрыты и включаются только организаторами.');
 const cfg=[
   ['event_date','Дата (ГГГГ-ММ-ДД)'],['event_time','Время'],['event_venue','Площадка'],
   ['venue_address','Адрес'],['rsvp_deadline','Срок подтверждения'],
   ['dress_code','Дресс-код'],['transport_info','Трансфер'],['public_notes','Информация гостям']
 ];
 const form=$('form','ad-live-form');
 const inputs=[];
 for(const [key,label]of cfg){
   const wrap=fieldInput(key,label),input=wrap.querySelector('input');
   input.value=data.settings?.[key]??'';inputs.push([key,input]);form.append(wrap);
 }
 const b=$('button','ad-live-button','Сохранить информацию');b.type='submit';
 const status=$('p','ad-live-message');form.append(b,status);host.append(form);
 form.addEventListener('submit',async e=>{e.preventDefault();b.disabled=true;
   try{
     for(const [key,input]of inputs)await call('admin/settings',{method:'POST',body:{key,value:input.value.trim()}});
     status.textContent='Настройки сохранены';
   }catch(err){status.textContent=errorText(err)}finally{b.disabled=false}
 });
 const flags=[
  ['guest_rsvp_open','Открыть подтверждение участия'],
  ['menu_open','Открыть выбор меню'],
  ['directory_open','Показывать согласованные карточки гостей'],
  ['photos_open','Разрешить загрузку фотографий'],
  ['stories_open','Разрешить истории и пожелания']
 ];
 const section=$('section','ad-live-subsection');title(section,'Доступность гостевых функций','Все переключатели по умолчанию выключены.');
 for(const [key,label]of flags){
   const l=$('label','ad-live-setting');
   const checkbox=$('input');checkbox.type='checkbox';checkbox.checked=data.settings?.[key]===true;
   l.append(checkbox,$('span','',label));section.append(l);
   checkbox.addEventListener('change',async()=>{
      checkbox.disabled=true;
      try{await call('admin/settings',{method:'POST',body:{key,value:checkbox.checked}})}
      catch(err){checkbox.checked=!checkbox.checked;message(section,errorText(err),'error')}
      finally{checkbox.disabled=false}
   });
 }
 host.append(section);
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
async function documents(host){
  title(host,'Документы и сметы','Материалы хранятся в Wedding Drive. Новые записи можно добавлять прямо здесь.');
  const a=$('a','ad-live-button','Открыть Wedding Drive');
  a.href='https://drive.google.com/drive/folders/195OYX_CPglwFmwSqwzRhQt7yrYyIPeBi';
  a.target='_blank';a.rel='noopener noreferrer';host.append(a);
  await collection(host,'documents');
}
function budgetScenario(host){
 const panel=$('section','ad-live-subsection');
 title(panel,'Сценарий банкета — Марьино','Предварительный ориентир 7 500 ₽ на человека из материалов от 29 октября. Не подтверждённая итоговая смета.');
 const grid=$('div','ad-live-metrics');
 for(const count of [50,80,100])metric(grid,count+' гостей',(count*7500).toLocaleString('ru-RU')+' ₽');
 panel.append(grid);host.append(panel);
}
async function renderSection(host,section){
 if(section==='overview'){await overview(host);return}
 if(section==='settings'){await settings(host);return}
 if(section==='moderation'){await moderation(host);return}
 if(section==='menu'){await collection(host,'menu_options');return}
 if(section==='documents'){await documents(host);return}
 if(section==='guests'){await guests(host);return}
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
 const supported=['overview','guests','venues','budget','vendors','tasks','schedule','catering','settings','moderation','menu','documents'];
 if(!supported.includes(section))return;
 const host=$('section','ad-live-panel');host.setAttribute('aria-label','Данные свадебной базы');
 destination.prepend(host);
 try{
   const session=await call('auth/session');
   state.csrf=session.csrf;state.role=session.role;
   if(session.role!=='admin'){login(host,section);return}
   await renderSection(host,section);
   // Switch to live records only after the authenticated request succeeds.
   if(!['overview','venues','catering'].includes(section))for(const el of [...destination.children])if(el!==host)el.hidden=true;
 }catch(err){
   // Live API is not enabled on this release. Leave the existing authenticated admin tools visible.
   host.remove();
 }
}
