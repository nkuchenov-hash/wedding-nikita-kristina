// Closed organiser directory — all personal data stays behind /admin session.
const apiRoot='/admin/index.php?api=';
const e=(tag,cls='',text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text??'');return x};
const sideLabels={groom:'Никита',bride:'Кристина',both:'Общие',other:'Не уточнено'};
const stringify=(x)=>String(x??'').trim();
async function api(route,{method='GET',body,csrf}={}){
 const [path,query='']=route.split('?');
 const headers={'Accept':'application/json'};
 if(method!=='GET'){headers['Content-Type']='application/json';headers['X-CSRF-Token']=csrf||''}
 const res=await fetch(apiRoot+encodeURIComponent(path)+(query?'&'+query:''),{
   method,headers,credentials:'same-origin',cache:'no-store',body:body?JSON.stringify(body):undefined
 });
 const result=await res.json();
 if(!res.ok||!result.ok)throw new Error(result.message||'Ошибка соединения');
 return result;
}
export async function activateGuestDirectory(root){
 const target=root.querySelector('.admin-content');
 if(!target)return;
 target.replaceChildren();
 const page=e('section','ad-guestbook');
 const header=e('header','ad-gb-header');
 header.append(e('span','ad-gb-eyebrow','ЛЮДИ · РОДСТВО · ПРИГЛАШЕНИЯ'),
   e('h1','','Список гостей'),
   e('p','','Единая база с русскими и английскими именами, связями, группами рассадки и статусами. Приглашения пока не отправлены.'));
 page.append(header);
 const metrics=e('div','ad-gb-metrics');page.append(metrics);
 const bar=e('div','ad-gb-bar'),q=e('input','ad-gb-input'),side=e('select','ad-gb-select'),status=e('select','ad-gb-select');
 q.type='search';q.placeholder='Найти человека, группу или связь';q.setAttribute('aria-label','Поиск гостей');
 for(const [value,label] of [['all','Все стороны'],['groom','Никита'],['bride','Кристина'],['both','Общие'],['other','Не уточнено']]){
   const option=e('option','',label);option.value=value;side.append(option);
 }
 for(const [value,label] of [['all','Все приглашения'],['question','Под вопросом'],['draft','Не отправлено'],['registered','Ответили']]){
   const option=e('option','',label);option.value=value;status.append(option);
 }
 bar.append(q,side,status);page.append(bar);
 const list=e('div','ad-gb-list');page.append(list);
 const shade=e('div','ad-gb-shade');shade.hidden=true;shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');
 const panel=e('section','ad-gb-panel'),close=e('button','ad-gb-close','Закрыть ×');close.type='button';
 const details=e('div','ad-gb-details');panel.append(close,details);shade.append(panel);page.append(shade);
 target.append(page);
 let people=[],csrf='';
 const modalClose=()=>{shade.hidden=true;document.body.classList.remove('ad-gb-lock')};
 function metric(label,value){
   const box=e('div','ad-gb-metric');box.append(e('strong','',value),e('span','',label));metrics.append(box);
 }
 function repaint(){
   metrics.replaceChildren();
   metric('Всего человек',people.length);
   metric('Сторона Никиты',people.filter(x=>x.side==='groom').length);
   metric('Сторона Кристины',people.filter(x=>x.side==='bride').length);
   metric('Под вопросом',people.filter(x=>/вопрос/i.test(stringify(x.decision))).length);
   metric('Получено RSVP',people.filter(x=>x.attendance).length);
   let filtered=people.filter(person=>{
     const query=q.value.trim().toLocaleLowerCase('ru');
     if(side.value!=='all'&&person.side!==side.value)return false;
     if(status.value==='question'&&!/вопрос/i.test(stringify(person.decision)))return false;
     if(status.value==='draft'&&person.attendance)return false;
     if(status.value==='registered'&&!person.attendance)return false;
     return !query||[person.display_name,person.name_en,person.relationship,person.seating_group,
       person.source_person_id].some(s=>stringify(s).toLocaleLowerCase('ru').includes(query));
   }).sort((a,b)=>a.display_name.localeCompare(b.display_name,'ru',{numeric:true}));
   list.replaceChildren();
   const table=e('table','ad-gb-table');
   const headings=e('thead'),thRow=e('tr');
   for(const name of ['Гость','Сторона','Связь','Рассадка','Статус',''])thRow.append(e('th','',name));
   headings.append(thRow);table.append(headings);
   const tbody=e('tbody');
   for(const p of filtered){
     const row=e('tr'),name=e('td','ad-gb-name');
     name.append(e('strong','',p.display_name),e('small','',p.name_en||p.source_person_id||''));
     const state=/вопрос/i.test(stringify(p.decision))?'Под вопросом':p.attendance?'Ответил':'Черновик';
     const action=e('button','ad-gb-view','Открыть');action.type='button';action.addEventListener('click',()=>open(p));
     const buttonCell=e('td');buttonCell.append(action);
     row.append(name,e('td','',sideLabels[p.side]||'—'),e('td','',p.relationship||'—'),
       e('td','',p.seating_group||'—'),e('td','',state),buttonCell);
     tbody.append(row);
   }
   table.append(tbody);const holder=e('div','ad-gb-scroll');holder.append(table);list.append(holder);
   list.append(e('p','ad-gb-count','Показано '+filtered.length+' из '+people.length+' · данные защищены авторизацией'));
 }
 function factSection(title,rows){
   const section=e('section','ad-gb-section');section.append(e('h3','',title));
   const dl=e('dl','ad-gb-facts');
   for(const [key,value]of rows){
     if(!stringify(value))continue;
     dl.append(e('dt','',key),e('dd','',value));
   }
   if(!dl.children.length)section.append(e('p','ad-gb-note','Пока нет заполненных данных'));
   else section.append(dl);
   details.append(section);
 }
 async function open(person){
   shade.hidden=false;document.body.classList.add('ad-gb-lock');close.focus();
   details.replaceChildren(e('p','ad-gb-note','Открываю карточку…'));
   try{
     const result=await api('admin/guest-profile?guest_id='+encodeURIComponent(person.id));
     const g=result.guest;
     details.replaceChildren(e('span','ad-gb-id',g.source_person_id||''),
       e('h2','',g.display_name),e('p','ad-gb-english',g.name_en||'Английское имя не заполнено'));
     factSection('Контакты и приглашение',[
       ['Сторона',sideLabels[g.side]],['Связи',g.relationship],['Город',g.city],
       ['Email',g.email],['Телефон',g.phone],['Рассадка',g.seating_group],
       ['Решение',g.decision],['Приглашение',g.source_invitation_json?.['Приглашение']],
       ['RSVP',g.source_invitation_json?.RSVP],
       ['В базовом подсчёте',g.base_count]
     ]);
     const relations=(result.relations||[]).map(r=>{
       const first=r.guest_id_1===g.id;
       const who=first?r.person_two:r.person_one,relationship=first?r.relation_1_to_2:r.relation_2_to_1;
       return [who,relationship];
     });
     factSection('Родственные и другие связи',relations);
     const source=Object.entries(g.source_people_json||{}).filter(([k,v])=>v&&
       !['ID человека','Имя','Фамилия','Отображаемое имя','Сторона'].includes(k)).slice(0,24);
     factSection('Подробности из таблицы',source);
     const srcProfile=Object.entries(g.source_profile_json||{}).filter(([k,v])=>v&&
       k!=='ID'&&stringify(v).length<1200).slice(0,28);
     factSection('Профиль RU / EN',srcProfile);
     const section=e('section','ad-gb-section');section.append(e('h3','','Редактировать'));
     const form=e('form','ad-gb-form'),inputMap={};
     for(const [field,label,value]of [
       ['display_name','Имя в списке',g.display_name],['relationship','Отношения',g.relationship],
       ['city','Город',g.city],['email','Email',g.email],['phone','Телефон',g.phone],
       ['name_en','Имя на английском',g.name_en],['seating_group','Группа рассадки',g.seating_group]]){
       const wrap=e('label','ad-gb-field');wrap.append(e('span','',label));
       const inp=e('input');inp.value=stringify(value);inp.name=field;wrap.append(inp);inputMap[field]=inp;form.append(wrap);
     }
     const submit=e('button','ad-gb-submit','Сохранить изменения');submit.type='submit';
     const feedback=e('p','ad-gb-feedback');form.append(submit,feedback);section.append(form);details.append(section);
     form.addEventListener('submit',async ev=>{
       ev.preventDefault();submit.disabled=true;feedback.textContent='Сохранение…';
       try{
         await api('admin/guest/update',{method:'POST',csrf,body:{
           id:g.id,display_name:inputMap.display_name.value,
           relationship:inputMap.relationship.value,city:inputMap.city.value,
           email:inputMap.email.value,phone:inputMap.phone.value
         }});
         if(g.source_person_id)await api('admin/guest-profile/update',{method:'PATCH',csrf,body:{
           id:g.id,name_en:inputMap.name_en.value,seating_group:inputMap.seating_group.value
         }});
         person.display_name=inputMap.display_name.value;
         person.name_en=inputMap.name_en.value;
         person.relationship=inputMap.relationship.value;
         person.seating_group=inputMap.seating_group.value;
         feedback.textContent='Сохранено в базе';repaint();
       }catch(err){feedback.textContent=err.message}finally{submit.disabled=false}
     });
   }catch(err){details.replaceChildren(e('p','ad-gb-error','Не удалось открыть карточку: '+err.message))}
 }
 q.addEventListener('input',repaint);side.addEventListener('change',repaint);status.addEventListener('change',repaint);
 close.addEventListener('click',modalClose);shade.addEventListener('click',ev=>{if(ev.target===shade)modalClose()});
 const onKey=ev=>{if(ev.key==='Escape'&&!shade.hidden)modalClose()};
 document.addEventListener('keydown',onKey);
 try{
   const [session,data]=await Promise.all([api('auth/session'),api('admin/guests')]);
   csrf=session.csrf;people=data.guests||[];repaint();
 }catch(err){list.replaceChildren(e('p','ad-gb-error','Реестр не загрузился: '+err.message))}
 return ()=>{document.removeEventListener('keydown',onKey);modalClose()};
}
