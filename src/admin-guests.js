// Single organiser workspace. SQLite is the only live source of truth.
// Spreadsheet copies and CSV exports never overwrite responses or manual edits.
const API='/admin/index.php?api=';
const mk=(tag,cls='',value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=String(value??'');return x};
const s=v=>String(v??'').trim();
const SIDES=[['all','Все стороны'],['groom','Никита'],['bride','Кристина'],['both','Общие'],['other','Не определено']];
const DECISIONS=['Черновик','Решили пригласить','Под вопросом','Не приглашать'];
const ANSWERS=[['','Не ответил'],['yes','Буду'],['maybe','Пока не знаю'],['no','Не приду']];
const LANGUAGES=[['ru','Русский'],['en','English'],['de','Deutsch'],['other','Другой']];
const SIDENAME=Object.fromEntries(SIDES);
function option(value,title){const o=mk('option','',title);o.value=value;return o}
function select(items,value){const x=mk('select');for(const [a,b] of items)x.append(option(a,b));x.value=s(value);return x}
async function request(route,opts={}){
 const [path,query='']=route.split('?');
 const response=await fetch(API+encodeURIComponent(path)+(query?'&'+query:''),{
   method:opts.method||'GET',credentials:'same-origin',cache:'no-store',
   headers:{'Accept':'application/json',...(opts.method?{'Content-Type':'application/json','X-CSRF-Token':opts.csrf||''}:{})},
   body:opts.body===undefined?undefined:JSON.stringify(opts.body)
 });
 let data;try{data=await response.json()}catch{throw Error('Не удалось получить ответ сервера')}
 if(!response.ok||!data.ok)throw Error(data.message||'Не удалось сохранить изменение');
 return data;
}
let cleanupPreviousGuestView=null;
export async function activateGuestDirectory(root){
 cleanupPreviousGuestView?.();

 const destination=root.querySelector('.admin-content');
 if(!destination)return;
 destination.replaceChildren();
 const page=mk('section','ad-guestbook');
 const head=mk('div','ad-gb-top'),heading=mk('div');
 heading.append(mk('span','ad-gb-eyebrow','ГОСТИ · ЕДИНАЯ БАЗА'),mk('h1','','Список гостей'),
   mk('p','','Все люди, семьи, приглашения и ответы — в одной системе. Изменения сохраняются в базе сайта.'));
 const actions=mk('div','ad-gb-top-actions');
 const add=mk('button','ad-gb-primary','+ Добавить гостя'),reload=mk('button','ad-gb-light','Обновить');
 const exportBtn=mk('button','ad-gb-light','Экспорт CSV');
 for(const b of [add,reload,exportBtn])b.type='button';
 actions.append(add,exportBtn,reload);head.append(heading,actions);page.append(head);
 const metrics=mk('div','ad-gb-metrics');page.append(metrics);
 const bar=mk('div','ad-gb-bar'),search=mk('input','ad-gb-input'),side=select(SIDES,'all'),
       filter=select([['all','Все гости'],['base','В основном списке'],['question','Под вопросом'],['no-name','Нет имени'],['duplicates','Возможные дубли'],['yes','Будут'],['maybe','Не решили'],['no','Не придут'],['unsent','Не отправлено'],['archived','Исключённые']],'all');
 search.type='search';search.placeholder='Поиск по имени, связям, группе, контактам';search.setAttribute('aria-label','Найти гостя');
 side.className=filter.className='ad-gb-select';
 bar.append(search,side,filter);page.append(bar);
 const alert=mk('p','ad-gb-notice');alert.hidden=true;page.append(alert);
 const list=mk('div','ad-gb-list');page.append(list);
 const overlay=mk('div','ad-gb-shade');overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 const panel=mk('section','ad-gb-panel'),close=mk('button','ad-gb-close','Закрыть ×');close.type='button';
 const detail=mk('div','ad-gb-details');panel.append(close,detail);overlay.append(panel);page.append(overlay);
 destination.append(page);
 let people=[],csrf='',activeId=null,editing=false,lastSnapshot='',refreshing=false;
 const notice=(message,error=false)=>{alert.textContent=message;alert.hidden=!message;alert.className='ad-gb-notice'+(error?' ad-gb-error':'')};
 const byId=id=>people.find(p=>p.id===id);
 const status=p=>p.attendance==='yes'?'Будет':p.attendance==='no'?'Не придёт':p.attendance==='maybe'?'Не решил':'Нет ответа';
 const display=p=>s(p.display_name)||'[Имя не указано]';
 const isQuestion=p=>/вопрос|уточн/i.test(s(p.decision));
 const isBase=p=>/^(да|yes|1)$/i.test(s(p.base_count));
 function metric(label,value){const card=mk('div','ad-gb-metric');card.append(mk('strong','',value),mk('span','',label));metrics.append(card)}
 function badge(text,kind=''){return mk('span','ad-gb-stage'+(kind?' ad-gb-stage-'+kind:''),text)}
 async function saveFields(p,fields){
   await request('admin/guest/fields',{method:'PATCH',csrf,body:{id:p.id,fields}});
   Object.assign(p,fields);notice('Сохранено в базе');render();
 }
 async function saveAnswer(p,val){
   if(val===''&&p.attendance&&!confirm('Очистить ранее сохранённый ответ?'))return;
   const attending=val==='yes'||val==='maybe';
   const adults=attending?Math.max(1,Math.min(Number(p.adults)||1,1+Number(p.plus_one_allowed||0))):0;
   const children=attending?Math.min(Number(p.children||0),Number(p.children_count||0)):0;
   const result=await request('admin/guest/rsvp',{method:'PATCH',csrf,body:{
     id:p.id,attendance:val,adults,children,transport_needed:!!Number(p.transport_needed||0),
     arrival_notes:s(p.arrival_notes),dietary_notes:s(p.dietary_notes),other_notes:s(p.other_notes)
   }});
   Object.assign(p,{attendance:result.attendance,adults:val?adults:null,children:val?children:null,response_source:val?'admin':null});
   notice('Ответ сохранён с пометкой «внесено организатором»');render();
 }
 function editCell(p,key,placeholder,options=null){
   const td=mk('td','ad-gb-edit-cell'),btn=mk('button','ad-gb-cell-edit');
   btn.type='button';const raw=s(p[key]);
   const labels=Object.fromEntries(options||[]);
   btn.append(mk('span','',labels[raw]||raw||placeholder),mk('span','ad-gb-pencil','✎'));
   btn.title='Изменить';td.append(btn);
   btn.addEventListener('click',()=>{
     if(editing)return;
     editing=true;btn.hidden=true;
     const opts=options?[[raw,labels[raw]||raw||placeholder],...options.filter(([v])=>v!==raw)]:null;
     const input=opts?select(opts,raw):mk('input','ad-gb-cell-input');
     input.className='ad-gb-cell-input';
     if(!opts){input.type='text';input.value=raw;input.maxLength=key==='relation_to_couple'?320:255}
     td.append(input);input.focus();if(!opts)input.select();
     let finished=false;
     const restore=()=>{if(finished)return;finished=true;editing=false;input.remove();btn.hidden=false};
     const commit=async()=>{
       if(finished)return;
       const value=s(input.value);
       if(value===raw){restore();return}
       finished=true;input.disabled=true;
       try{if(key==='attendance')await saveAnswer(p,value);else await saveFields(p,{[key]:value})}
       catch(err){notice(err.message,true);input.remove();btn.hidden=false}
       finally{editing=false}
     };
     input.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.preventDefault();restore()}if(ev.key==='Enter'){ev.preventDefault();commit()}});
     if(opts)input.addEventListener('change',commit);else input.addEventListener('blur',commit);
   });
   return td;
 }
 function render(){
   metrics.replaceChildren();
   const current=people.filter(p=>p.status!=='archived');
   metric('Человек в списке',current.length);
   metric('В основном составе',current.filter(isBase).length);
   metric('Под вопросом',current.filter(isQuestion).length);
   metric('Уточнить имя',current.filter(p=>!s(p.first_name)).length);
   metric('Ответили «буду»',current.filter(p=>p.attendance==='yes').length);
   metric('Не отправлено',current.filter(p=>!p.invitation_sent_at).length);
   const query=s(search.value).toLocaleLowerCase('ru');
   const duplicateCounts=new Map();
   for(const p of current){const key=display(p).toLocaleLowerCase('ru').replace(/\s+/g,' ').trim();duplicateCounts.set(key,(duplicateCounts.get(key)||0)+1)}
   const chosen=people.filter(p=>{
     if(side.value!=='all'&&p.side!==side.value)return false;
     if(filter.value==='archived')return p.status==='archived';
     if(p.status==='archived')return false;
     if(filter.value==='base'&&!isBase(p))return false;
     if(filter.value==='question'&&!isQuestion(p))return false;
     if(filter.value==='no-name'&&s(p.first_name))return false;
     if(filter.value==='duplicates'&&(duplicateCounts.get(display(p).toLocaleLowerCase('ru').replace(/\s+/g,' ').trim())||0)<2)return false;
     if(filter.value==='yes'&&p.attendance!=='yes')return false;
     if(filter.value==='maybe'&&p.attendance!=='maybe')return false;
     if(filter.value==='no'&&p.attendance!=='no')return false;
     if(filter.value==='unsent'&&p.invitation_sent_at)return false;
     return !query||[p.display_name,p.name_en,p.relationship,p.relation_to_couple,p.seating_group,p.community,p.city,p.email,p.phone,p.source_person_id].some(v=>s(v).toLocaleLowerCase('ru').includes(query));
   }).sort((a,b)=>display(a).localeCompare(display(b),'ru'));
   list.replaceChildren();
   const holder=mk('div','ad-gb-scroll'),table=mk('table','ad-gb-table'),
     thead=mk('thead'),tr=mk('tr');
   for(const name of ['Гость','Сторона','Кем приходится','Рассадка','Решение','Приглашение','Ответ'])tr.append(mk('th','',name));
   thead.append(tr);table.append(thead);
   const body=mk('tbody');
   for(const p of chosen){
     const row=mk('tr','ad-gb-person-row'),nameCell=mk('td','ad-gb-name');
     const name=mk('button','ad-gb-person-link',display(p));name.type='button';name.addEventListener('click',()=>openGuest(p.id));
     nameCell.append(name,mk('small','',p.name_en||(!s(p.first_name)?'Требуется уточнить имя':' ')));
     const decisionChoices=[...new Set([s(p.decision),...DECISIONS])].filter(Boolean).map(v=>[v,v]);
     const sent=mk('td');sent.append(p.invitation_sent_at?badge('Отправлено','sent'):badge('Не отправлено','draft'));
     row.append(nameCell,editCell(p,'side','Уточнить',SIDES.filter(([v])=>v!=='all')),
       editCell(p,'relation_to_couple','Уточнить'),
       editCell(p,'seating_group','Не указана'),
       editCell(p,'decision','Не решено',decisionChoices),
       sent,editCell(p,'attendance','Не ответил',ANSWERS));
     body.append(row);
   }
   table.append(body);holder.append(table);list.append(holder);
   list.append(mk('p','ad-gb-count','Показано '+chosen.length+' из '+people.length+' · Нажмите на имя, чтобы открыть всю карточку. Поля таблицы редактируются нажатием.'));
 }
 function closeGuest(){activeId=null;overlay.hidden=true;document.body.classList.remove('ad-gb-lock');detail.replaceChildren()}
 function field(parent,label,key,value,type='text',items=null){
   const wrapper=mk('label','ad-gb-edit-field');wrapper.append(mk('span','',label));
   const input=items?select(items,value):type==='textarea'?mk('textarea'):mk('input');
   if(!items&&type!=='textarea'){input.type=type;input.maxLength=key==='private_notes'?2000:320}
   if(type==='textarea')input.rows=2;
   if(type==='number'){input.min='0';input.max='15'}
   if(!items)input.value=s(value);
   input.name=key;wrapper.append(input);parent.append(wrapper);return input;
 }
 function section(title){const el=mk('section','ad-gb-section');el.append(mk('h3','',title));detail.append(el);return el}
 async function openGuest(id){
   activeId=id;overlay.hidden=false;document.body.classList.add('ad-gb-lock');close.focus();
   detail.replaceChildren(mk('p','ad-gb-note','Открываю карточку…'));
   try{
     const [data,companionsData]=await Promise.all([
       request('admin/guest-profile?guest_id='+encodeURIComponent(id)),
       request('admin/companions?guest_id='+encodeURIComponent(id))
     ]);
     if(activeId!==id)return;
     const g=data.guest,p=byId(id)||g;
     detail.replaceChildren(mk('span','ad-gb-id',g.source_person_id||'Добавлен вручную'),mk('h2','',display(g)));
     detail.append(mk('p','ad-gb-note','Редактируйте поля ниже. Сохранение изменит единую базу сайта; исходные таблицы остаются архивом.'));
     const profile=section('Данные гостя');
     const form=mk('form','ad-gb-edit-grid');const controls={};
     const fields=[
       ['display_name','Имя в списке','text'],['name_en','Имя на английском','text'],
       ['first_name','Имя','text'],['last_name','Фамилия','text'],
       ['side','Сторона','select',SIDES.filter(([v])=>v!=='all')],
       ['relation_to_couple','Кем приходится Никите и Кристине','text'],
       ['relationship','Другие сведения о родстве','textarea'],
       ['seating_group','Группа рассадки','text'],
       ['decision','Решение о приглашении','text'],
       ['base_count','В основном подсчёте','select',[['','Не определено'],['Да','Да'],['Нет','Нет']]],
       ['plus_one_allowed','Разрешён +1','select',[['0','Нет'],['1','Да']]],
       ['children_count','Допустимое число детей','number'],
       ['city','Город','text'],['phone','Телефон','tel'],['email','Email','email'],
       ['language','Язык','select',LANGUAGES],
       ['community','Круг / сообщество','text'],
       ['about','О человеке / история на русском','textarea'],
       ['about_en','О человеке на английском','textarea'],['private_notes','Заметки организаторов','textarea']
     ];
     for(const [key,label,type,items]of fields)controls[key]=field(form,label,key,g[key],type,items||null);
     const submit=mk('button','ad-gb-primary','Сохранить изменения');submit.type='submit';
     const feedback=mk('span','ad-gb-feedback');const buttons=mk('div','ad-gb-edit-actions');buttons.append(submit,feedback);form.append(buttons);profile.append(form);
     form.addEventListener('submit',async ev=>{
       ev.preventDefault();const changed={};
       for(const key of Object.keys(controls)){const value=s(controls[key].value);if(value!==s(g[key]))changed[key]=value}
       if(!Object.keys(changed).length){feedback.textContent='Изменений нет';return}
       submit.disabled=true;feedback.textContent='Сохраняю…';
       try{await saveFields(p,changed);Object.assign(g,changed);feedback.textContent='Сохранено';detail.querySelector('h2').textContent=display(g)}
       catch(err){feedback.textContent=err.message}finally{submit.disabled=false}
     });
     const household=section('Семья и сопровождающие');
     household.append(mk('p','ad-gb-note','Связи указывают на существующих гостей, без создания повторных записей. Сопровождающие добавляются только по необходимости.'));
     const relList=mk('div','ad-gb-relations');
     async function refreshRel(){
       const response=await request('admin/guest-profile?guest_id='+encodeURIComponent(id));
       relList.replaceChildren();
       for(const link of response.relations||[]){
         const left=link.guest_id_1===id,otherId=left?link.guest_id_2:link.guest_id_1;
         const other=left?link.person_two:link.person_one;
         const label=left?link.relation_1_to_2:link.relation_2_to_1;
         const line=mk('div','ad-gb-related');
         const go=mk('button','ad-gb-related-name',other||'Уточнить имя');go.type='button';go.addEventListener('click',()=>openGuest(otherId));
         const relation=mk('span','',label||link.relation_type||'Связь не уточнена');
         const edit=mk('button','ad-gb-small','Изменить');edit.type='button';
         edit.addEventListener('click',async()=>{
           const forward=prompt('Кем первый человек приходится второму?',link.relation_1_to_2||'');
           if(forward===null)return;
           const reverse=prompt('Кем второй человек приходится первому?',link.relation_2_to_1||'');
           if(reverse===null)return;
           try{await request('admin/guest/connections',{method:'PATCH',csrf,body:{id:link.id,relation_1_to_2:forward,relation_2_to_1:reverse}});await refreshRel()}
           catch(err){notice(err.message,true)}
         });
         const remove=mk('button','ad-gb-small ad-gb-danger','Убрать связь');remove.type='button';
         remove.addEventListener('click',async()=>{
           if(!confirm('Удалить эту связь? Сами гости сохранятся.'))return;
           try{await request('admin/guest/connections',{method:'DELETE',csrf,body:{id:link.id}});await refreshRel()}
           catch(err){notice(err.message,true)}
         });
         line.append(go,relation,edit,remove);relList.append(line);
       }
       if(!relList.children.length)relList.append(mk('p','ad-gb-note','Связей пока нет'));
     }
     await refreshRel();household.append(relList);
     const addRel=mk('form','ad-gb-relation-form');
     const linkSelect=select(people.filter(x=>x.id!==id&&x.status!=='archived').map(x=>[x.id,display(x)]).sort((a,b)=>a[1].localeCompare(b[1],'ru')),'');
     const relText=mk('input');relText.placeholder='Кем этот гость приходится выбранному';relText.required=true;relText.maxLength=120;
     const relBack=mk('input');relBack.placeholder='Обратная связь (если известна)';relBack.maxLength=120;
     const linkBtn=mk('button','ad-gb-light','Добавить связь');linkBtn.type='submit';
     addRel.append(linkSelect,relText,relBack,linkBtn);household.append(addRel);
     addRel.addEventListener('submit',async ev=>{
       ev.preventDefault();linkBtn.disabled=true;
       try{await request('admin/guest/connections',{method:'POST',csrf,body:{
         guest_id:id,other_guest_id:linkSelect.value,relation_to_other:s(relText.value),
         other_relation_to_guest:s(relBack.value),relation_type:'other'
       }});relText.value='';relBack.value='';await refreshRel()}
       catch(err){notice(err.message,true)}finally{linkBtn.disabled=false}
     });
     const companions=mk('div','ad-gb-relations');household.append(mk('h4','','Сопровождающие'),companions);
     async function refreshComp(){
       const data=await request('admin/companions?guest_id='+encodeURIComponent(id));
       companions.replaceChildren();
       for(const c of data.companions||[]){
         const line=mk('div','ad-gb-related');
         line.append(mk('span','',c.display_name+' · '+({adult:'Взрослый',child:'Ребёнок',infant:'Младенец'}[c.age_group]||c.age_group)));
         const del=mk('button','ad-gb-small ad-gb-danger','Удалить');del.type='button';
         del.addEventListener('click',async()=>{if(!confirm('Удалить сопровождающего из этого приглашения?'))return;
           try{await request('admin/companions',{method:'DELETE',csrf,body:{guest_id:id,id:c.id}});await refreshComp()}catch(err){notice(err.message,true)}
         });line.append(del);companions.append(line);
       }
       if(!companions.children.length)companions.append(mk('p','ad-gb-note','Пока никого нет'));
     }
     await refreshComp();
     const compForm=mk('form','ad-gb-relation-form'),compName=mk('input'),compAge=select([['adult','Взрослый'],['child','Ребёнок'],['infant','Младенец']],'adult'),
         compAdd=mk('button','ad-gb-light','Добавить сопровождающего');compAdd.type='submit';
     compName.placeholder='Имя сопровождающего';compName.required=true;compName.maxLength=255;compForm.append(compName,compAge,compAdd);household.append(compForm);
     compForm.addEventListener('submit',async ev=>{ev.preventDefault();compAdd.disabled=true;
       try{await request('admin/companions',{method:'POST',csrf,body:{guest_id:id,display_name:s(compName.value),age_group:compAge.value}});
         compName.value='';await refreshComp()}catch(err){notice(err.message,true)}finally{compAdd.disabled=false}
     });
     const response=section('Ответ на приглашение');
     const rsp=mk('form','ad-gb-edit-grid'),r={};
     r.attendance=field(rsp,'Участие','attendance',g.attendance||'','select',ANSWERS);
     r.adults=field(rsp,'Взрослых','adults',g.adults??1,'number');
     r.children=field(rsp,'Детей','children',g.children??0,'number');
     r.transport_needed=field(rsp,'Нужен трансфер','transport_needed',g.transport_needed||0,'select',[['0','Нет'],['1','Да']]);
     r.dietary_notes=field(rsp,'Питание и аллергии','dietary_notes',g.dietary_notes||'','textarea');
     r.arrival_notes=field(rsp,'Транспорт и прибытие','arrival_notes',g.arrival_notes||'','textarea');
     r.other_notes=field(rsp,'Другие пожелания','other_notes',g.other_notes||'','textarea');
     const saveR=mk('button','ad-gb-primary','Сохранить ответ'),msgR=mk('span','ad-gb-feedback');
     saveR.type='submit';const f=mk('div','ad-gb-edit-actions');f.append(saveR,msgR);rsp.append(f);response.append(rsp);
     response.append(mk('p','ad-gb-note','Ответ, внесённый вручную, помечается как ответ со слов гостя. Он не означает, что гость заполнил анкету на сайте.'));
     rsp.addEventListener('submit',async ev=>{
       ev.preventDefault();saveR.disabled=true;msgR.textContent='Сохраняю…';
       const val=r.attendance.value;
       if(val===''&&g.attendance&&!confirm('Удалить сохранённый ответ?')){saveR.disabled=false;msgR.textContent='';return}
       try{const data=await request('admin/guest/rsvp',{method:'PATCH',csrf,body:{
         id,attendance:val,adults:Number(r.adults.value),children:Number(r.children.value),
         transport_needed:r.transport_needed.value==='1',dietary_notes:s(r.dietary_notes.value),
         arrival_notes:s(r.arrival_notes.value),other_notes:s(r.other_notes.value)
       }});Object.assign(g,{attendance:data.attendance});await reloadData();msgR.textContent='Сохранено в базе'}
       catch(err){msgR.textContent=err.message}finally{saveR.disabled=false}
     });
     const invites=section('Приглашение');
     const inviteInfo=mk('p','ad-gb-note',g.invitation_sent_at?'Отправлено: '+g.invitation_sent_at:'Пока не отправлено');
     invites.append(inviteInfo);
     const inviteActions=mk('div','ad-gb-invitation-actions');
     const issue=mk('button','ad-gb-light',g.active_invite_id?'Перевыпустить личную ссылку':'Создать личную ссылку'),
       sent=mk('button','ad-gb-light',g.invitation_sent_at?'Отменить отметку об отправке':'Отметить отправленным');
     issue.type=sent.type='button';sent.disabled=!g.active_invite_id;
     inviteActions.append(issue,sent);invites.append(inviteActions);
     invites.append(mk('p','ad-gb-note','Создание ссылки не отправляет сообщение. Гостевой кабинет ещё закрыт.'));
     issue.addEventListener('click',async()=>{
       if(g.active_invite_id&&!confirm('Существующая ссылка станет недействительной. Продолжить?'))return;
       issue.disabled=true;
       try{
         const data=await request('admin/invitations',{method:'POST',csrf,body:{guest_id:id}});
         const url='https://nikitakristina.ru/guest/#invite/'+data.token;
         const box=mk('div','ad-gb-personal-link'),inp=mk('input'),copy=mk('button','ad-gb-light','Скопировать');
         inp.readOnly=true;inp.value=url;copy.type='button';
         copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(url);copy.textContent='Скопировано'}catch{inp.focus();inp.select()}});
         box.append(inp,copy);invites.append(box);g.active_invite_id=data.id;sent.disabled=false;g.invitation_sent_at=null;inviteInfo.textContent='Пока не отправлено';
         const p=byId(id);if(p){p.active_invite_id=data.id;p.invitation_sent_at=null}render();
       }catch(err){notice(err.message,true)}finally{issue.disabled=false}
     });
     sent.addEventListener('click',async()=>{
       const value=!Boolean(g.invitation_sent_at);sent.disabled=true;
       try{await request('admin/invitations/sent',{method:'POST',csrf,body:{guest_id:id,sent:value}});
         g.invitation_sent_at=value?new Date().toISOString():null;
         const p=byId(id);if(p)p.invitation_sent_at=g.invitation_sent_at;
         inviteInfo.textContent=value?'Отправлено (отмечено организатором)':'Пока не отправлено';
         sent.textContent=value?'Отменить отметку об отправке':'Отметить отправленным';render();
       }catch(err){notice(err.message,true)}finally{sent.disabled=false}
     });
     const archiveSection=section('Учёт записи');
     const archiveButton=mk('button','ad-gb-light',g.status==='archived'?'Восстановить в списке':'Убрать из рабочего списка');
     archiveButton.type='button';archiveSection.append(archiveButton);
     archiveSection.append(mk('p','ad-gb-note','Запись не удаляется из базы. Приглашения и семейные связи сохраняются. Исключённые доступны через фильтр.'));
     archiveButton.addEventListener('click',async()=>{
       const next=g.status==='archived'?'draft':'archived';
       if(next==='archived'&&!confirm('Исключить человека из рабочего списка? Данные сохранятся.'))return;
       archiveButton.disabled=true;
       try{await request('admin/guest/update',{method:'POST',csrf,body:{id,status:next}});g.status=next;const p=byId(id);if(p)p.status=next;
         archiveButton.textContent=next==='archived'?'Восстановить в списке':'Убрать из рабочего списка';render()}
       catch(err){notice(err.message,true)}finally{archiveButton.disabled=false}
     });

   }catch(err){detail.replaceChildren(mk('p','ad-gb-error','Не удалось открыть карточку: '+err.message))}
 }
 async function reloadData(quiet=false){
   const data=await request('admin/guests');
   const next=data.guests||[];
   const fingerprint=JSON.stringify(next);
   if(quiet&&fingerprint===lastSnapshot)return;
   people=next;
   lastSnapshot=fingerprint;
   render();
 }
 async function createGuest(){
   activeId='new';overlay.hidden=false;document.body.classList.add('ad-gb-lock');
   detail.replaceChildren(mk('h2','','Добавить гостя'));
   const form=mk('form','ad-gb-edit-grid');
   const name=field(form,'Имя *','first_name','','text');
   const family=field(form,'Фамилия','last_name','','text');
   const display=field(form,'Отображаемое имя','display_name','','text');
   const side=field(form,'Сторона','side','other','select',SIDES.filter(([v])=>v!=='all'));
   const btn=mk('button','ad-gb-primary','Добавить в базу');btn.type='submit';
   const feedback=mk('span','ad-gb-feedback');const actions=mk('div','ad-gb-edit-actions');actions.append(btn,feedback);form.append(actions);detail.append(form);
   name.required=true;
   form.addEventListener('submit',async ev=>{
     ev.preventDefault();btn.disabled=true;feedback.textContent='Сохраняю…';
     try{
       const data=await request('admin/guests',{method:'POST',csrf,body:{
         first_name:s(name.value),last_name:s(family.value),display_name:s(display.value)||s([name.value,family.value].join(' ')),side:side.value
       }});
       await reloadData();await openGuest(data.id);
     }catch(err){feedback.textContent=err.message}finally{btn.disabled=false}
   });
 }
 function exportCsv(){
   if(!people.length)return;
   const fields=[['source_person_id','ID'],['display_name','Гость'],['name_en','Имя EN'],['side','Сторона'],
     ['relation_to_couple','Кем приходится'],['relationship','Связи'],['seating_group','Рассадка'],
     ['decision','Решение'],['base_count','Основной список'],['invitation_sent_at','Отправлено'],
     ['attendance','RSVP'],['adults','Взрослые'],['children','Дети'],['plus_one_allowed','Можно +1'],
     ['children_count','Дети разрешены'],['city','Город'],['phone','Телефон'],['email','Email'],
     ['community','Круг'],['about','О человеке'],['about_en','О человеке EN'],['private_notes','Заметки']];
   const safe=v=>{let t=s(v);if(/^[=+\-@\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
   const contents='\uFEFF'+[fields.map(x=>safe(x[1])).join(';'),...people.map(p=>fields.map(([k])=>safe(p[k])).join(';'))].join('\r\n');
   const url=URL.createObjectURL(new Blob([contents],{type:'text/csv;charset=utf-8'}));
   const a=mk('a');a.href=url;a.download='wedding-guests-export.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 for(const x of [search,side,filter])x.addEventListener(x===search?'input':'change',render);
 add.addEventListener('click',createGuest);reload.addEventListener('click',async()=>{try{await reloadData();notice('Данные обновлены')}catch(err){notice(err.message,true)}});
 exportBtn.addEventListener('click',exportCsv);
 close.addEventListener('click',closeGuest);overlay.addEventListener('click',ev=>{if(ev.target===overlay)closeGuest()});
 const onKey=ev=>{if(ev.key==='Escape'&&!overlay.hidden&&!editing)closeGuest()};
 document.addEventListener('keydown',onKey);
 try{const [session]=await Promise.all([request('auth/session')]);csrf=session.csrf;if(session.role!=='admin')throw Error('Требуется вход организатора');await reloadData()}
 catch(err){list.replaceChildren(mk('p','ad-gb-error','Не удалось открыть базу: '+err.message))}
 const updateFromServer=async()=>{
   if(!page.isConnected){cleanupPreviousGuestView?.();return;}
   if(document.visibilityState!=='visible'||editing||!overlay.hidden||refreshing)return;
   const focused=document.activeElement;
   if(focused&&page.contains(focused)&&focused.matches('input,select,textarea,[contenteditable]'))return;
   refreshing=true;
   try{await reloadData(true)}
   catch(err){notice('Нет связи с сервером. Последние загруженные данные сохранены.',true)}
   finally{refreshing=false}
 };
 const timer=setInterval(updateFromServer,30000);
 const onFocus=()=>updateFromServer();
 const onVisible=()=>{if(document.visibilityState==='visible')updateFromServer();};
 window.addEventListener('focus',onFocus);
 document.addEventListener('visibilitychange',onVisible);
 cleanupPreviousGuestView=()=>{
   clearInterval(timer);
   window.removeEventListener('focus',onFocus);
   document.removeEventListener('visibilitychange',onVisible);
   document.removeEventListener('keydown',onKey);
   if(page.isConnected)closeGuest();
   cleanupPreviousGuestView=null;
 };
 return cleanupPreviousGuestView;
}
