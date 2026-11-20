// Private organizer-only wedding program editor. All changes persist through the authenticated API.
const DEFAULT_TYPES=[
 {id:'ceremony',label:'Церемония',color:'#E5EAD8'},
 {id:'social',label:'Общение с гостями',color:'#D7ECE8'},
 {id:'dance',label:'Танцы',color:'#F3DAE5'},
 {id:'speech',label:'Выступление гостя',color:'#E4DFF5'},
 {id:'music',label:'Музыка',color:'#E3EDCB'},
 {id:'food',label:'Ужин и фуршет',color:'#F2E8D2'},
 {id:'game',label:'Интерактив',color:'#DDE9F5'},
 {id:'other',label:'Другое',color:'#E8EBE8'}
];
const element=(tag,cls='',text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
const timeOf=item=>String(item?.start_at||'').match(/T(\d\d:\d\d)/)?.[1]||'';
const dateOf=item=>String(item?.start_at||'').slice(0,10);
const asMinutes=value=>{const m=/^(\d\d):(\d\d)$/.exec(String(value||''));return m?Number(m[1])*60+Number(m[2]):null;};
const clock=minute=>String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
const planned=item=>item.stage==='program' && /^\d{4}-\d{2}-\d{2}T\d\d:\d\d/.test(item.start_at||'');
const button=(label,cb,cls='')=>{const b=element('button','ad-tl-button '+cls,label);b.type='button';b.addEventListener('click',cb);return b;};
const field=(label,control)=>{const wrap=element('label','ad-tl-field');wrap.append(element('span','',label),control);return wrap;};

export async function renderWeddingProgram(host,call,weddingDays,venues){
 let entries=[],types=DEFAULT_TYPES.map(x=>({...x})),day='2027-06-19',notice='',dragId='',working=false;
 const dayName=d=>weddingDays.find(x=>x.date===d)?.label||d;
 const dayEntries=d=>entries.filter(e=>planned(e)&&dateOf(e)===d)
   .sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||String(a.start_at).localeCompare(String(b.start_at)));
 const ideaEntries=()=>entries.filter(e=>!planned(e)).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
 const category=e=>types.find(t=>t.id===e.activity_type)||types.find(t=>t.id==='other')||DEFAULT_TYPES[7];
 const duration=e=>Math.max(5,Number(e.duration_min)||30);
 const lastEnd=arr=>{
   const item=arr[arr.length-1];if(!item)return '';
   if(item.end_at)return String(item.end_at).match(/T(\d\d:\d\d)/)?.[1]||'';
   const n=asMinutes(timeOf(item));return n===null?'':clock(Math.min(1439,n+duration(item)));
 };
 async function fetchData(){
   const [records,settings]=await Promise.all([
     call('admin/records?collection=schedule_items'),call('admin/settings')
   ]);
   entries=(records.items||[]).filter(e=>e&&typeof e.title==='string');
   const saved=settings.settings?.activity_types;
   types=Array.isArray(saved)&&saved.length?saved.map(t=>({...t})):DEFAULT_TYPES.map(x=>({...x}));
 }
 async function refresh(message=''){
   notice=message;await fetchData();draw();
 }
 async function arrange(target,ids,start){
   if(!ids.length)return;
   if(!start)throw new Error('Укажите начало первого события');
   await call('admin/schedule/arrange',{method:'POST',body:{day:target,ids,start_time:start}});
 }
 async function shift(target,movedId,beforeId=null){
   if(working)return;
   const items=dayEntries(target);
   if(!items.some(e=>e.id===movedId))return;
   const ordered=items.map(e=>e.id).filter(id=>id!==movedId);
   const at=beforeId?ordered.indexOf(beforeId):-1;
   ordered.splice(at<0?ordered.length:at,0,movedId);
   const first=items[0];
   working=true;
   try{await arrange(target,ordered,timeOf(first));await refresh('Порядок и время обновлены.');}
   catch(e){await refresh('Не удалось изменить порядок: '+e.message);}
   finally{working=false}
 }
 async function returnToIdeas(item){
   if(working)return;
   working=true;const oldDay=dateOf(item);const old=dayEntries(oldDay);
   try{
     await call('admin/records',{method:'PATCH',body:{collection:'schedule_items',id:item.id,fields:{
       stage:'idea',start_at:null,end_at:null,gap_before_min:0
     }}});
     if(old.length>1){
       const remain=old.filter(e=>e.id!==item.id);
       await arrange(oldDay,remain.map(e=>e.id),timeOf(remain[0]));
     }
     await refresh('Карточка возвращена в пул идей.');
   }catch(e){await refresh('Не удалось переместить: '+e.message);}
   finally{working=false}
 }
 function drawCard(item,where,dayList){
   const type=category(item),card=element('article','ad-tl-card');
   card.style.setProperty('--activity-color',type.color);
   card.draggable=true;
   card.dataset.id=item.id;
   card.addEventListener('dragstart',e=>{
     dragId=item.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',item.id);
     card.classList.add('ad-tl-dragging');
   });
   card.addEventListener('dragend',()=>{dragId='';card.classList.remove('ad-tl-dragging');});
   card.addEventListener('dragover',e=>{e.preventDefault();card.classList.add('ad-tl-over');});
   card.addEventListener('dragleave',()=>card.classList.remove('ad-tl-over'));
   card.addEventListener('drop',async e=>{
     e.preventDefault();e.stopPropagation();card.classList.remove('ad-tl-over');
     const source=entries.find(x=>x.id===(dragId||e.dataTransfer.getData('text/plain')));
     if(!source||source.id===item.id)return;
     if(where==='timeline'){
       if(planned(source)&&dateOf(source)===day)await shift(day,source.id,item.id);
       else openEditor(source,{stage:'program',date:day,beforeId:item.id});
     }
   });
   const eyebrow=element('div','ad-tl-card-eyebrow');
   eyebrow.append(element('span','ad-tl-type',type.label),element('span','ad-tl-length',duration(item)+' мин'));
   card.append(eyebrow);
   card.append(element('h3','ad-tl-card-title',item.title));
   if(item.notes)card.append(element('p','ad-tl-card-description',item.notes));
   if(item.place)card.append(element('small','ad-tl-place',item.place));
   if(where==='timeline'){
     const start=timeOf(item),end=String(item.end_at||'').match(/T(\d\d:\d\d)/)?.[1]||'';
     card.prepend(element('div','ad-tl-clock',(start||'—')+' — '+(end||'—')));
     if(Number(item.gap_before_min)>0)card.append(element('small','ad-tl-break','Пауза перед: '+item.gap_before_min+' мин'));
   }
   const actions=element('div','ad-tl-card-actions');
   actions.append(button('Изменить',()=>openEditor(item),'ad-tl-edit'));
   if(where==='idea'){
     actions.append(button('В программу',()=>openEditor(item,{stage:'program',date:day}),'ad-tl-green'));
   }else{
     const i=dayList.findIndex(x=>x.id===item.id);
     actions.append(button('↑',()=>i>0&&shift(day,item.id,dayList[i-1].id),'ad-tl-icon'));
     actions.append(button('↓',()=>i<dayList.length-1&&shift(day,dayList[i+1].id,item.id),'ad-tl-icon'));
     actions.append(button('В идеи',()=>returnToIdeas(item),'ad-tl-muted'));
     actions[0];
   }
   card.append(actions);
   return card;
 }
 function dropTarget(target){
   target.addEventListener('dragover',e=>{e.preventDefault();target.classList.add('ad-tl-target-over')});
   target.addEventListener('dragleave',e=>{if(!target.contains(e.relatedTarget))target.classList.remove('ad-tl-target-over')});
   target.addEventListener('drop',async e=>{
     if(e.target.closest('.ad-tl-card'))return;
     e.preventDefault();target.classList.remove('ad-tl-target-over');
     const source=entries.find(x=>x.id===(dragId||e.dataTransfer.getData('text/plain')));
     if(!source)return;
     if(planned(source)&&dateOf(source)===day)return;
     openEditor(source,{stage:'program',date:day});
   });
 }
 function draw(){
   host.replaceChildren();
   host.classList.add('ad-timeline-page');
   const header=element('header','ad-tl-header');
   const heading=element('div');
   heading.append(element('div','ad-tl-kicker','СЦЕНАРИЙ СВАДЬБЫ'),element('h1','','Программа мероприятия'),
     element('p','','Идеи без времени — слева. Утверждённые активности с точным таймингом — справа.'));
   const topActions=element('div','ad-tl-top-actions');
   topActions.append(button('+ Новая идея',()=>openEditor(null,{stage:'idea'}),'ad-tl-primary'),
     button('Типы и цвета',editTypes,'ad-tl-secondary'));
   header.append(heading,topActions);host.append(header);
   if(notice){const alert=element('p','ad-tl-notice',notice);alert.setAttribute('role','status');host.append(alert);}
   const layout=element('div','ad-tl-layout');
   const pool=element('section','ad-tl-pool');
   const poolHead=element('div','ad-tl-section-head');
   poolHead.append(element('h2','','Пул идей'),element('span','ad-tl-count',ideaEntries().length));
   pool.append(poolHead,element('p','ad-tl-help','Без утверждённого времени. Перетащите в расписание или нажмите «В программу».'));
   const poolList=element('div','ad-tl-pool-list');
   for(const item of ideaEntries())poolList.append(drawCard(item,'idea',[]));
   if(!ideaEntries().length)poolList.append(element('p','ad-tl-empty','Идей пока нет. Добавьте первую карточку.'));
   pool.append(poolList);
   const timeline=element('section','ad-tl-timeline');
   const timelineHead=element('div','ad-tl-section-head');
   timelineHead.append(element('h2','','Таймлайн'),button('+ Активность',()=>openEditor(null,{stage:'program',date:day}),'ad-tl-secondary'));
   timeline.append(timelineHead);
   const tabs=element('div','ad-tl-tabs');
   for(const weddingDay of weddingDays){
     const b=button(weddingDay.label+(dayEntries(weddingDay.date).length?' · '+dayEntries(weddingDay.date).length:''),()=>{
       day=weddingDay.date;notice='';draw();
     },day===weddingDay.date?'ad-tl-tab active':'ad-tl-tab');
     b.setAttribute('aria-pressed',day===weddingDay.date?'true':'false');tabs.append(b);
   }
   timeline.append(tabs);
   const dayList=dayEntries(day);
   const summary=element('div','ad-tl-summary');
   const total=dayList.reduce((n,e)=>n+duration(e)+(Number(e.gap_before_min)||0),0);
   summary.append(element('span','','Активностей: '+dayList.length),element('span','','Продолжительность: '+Math.floor(total/60)+' ч '+total%60+' мин'));
   timeline.append(summary);
   const track=element('div','ad-tl-track');dropTarget(track);
   if(dayList.length){
     for(const item of dayList)track.append(drawCard(item,'timeline',dayList));
     const sortedByStart=[...dayList].sort((a,b)=>String(a.start_at).localeCompare(String(b.start_at)));
     const overlaps=sortedByStart.some((x,i)=>i>0&&String(x.start_at)<String(sortedByStart[i-1].end_at||''));
     if(overlaps)timeline.append(element('p','ad-tl-warning','Обнаружено пересечение времени. Измените карточку или переставьте события.'));
   }else{
     track.append(element('p','ad-tl-empty','На '+dayName(day)+' пока нет активностей с назначенным временем. Перетащите идею сюда.'));
   }
   timeline.append(track);
   layout.append(pool,timeline);host.append(layout);
 }
 function openEditor(item=null,options={}){
   host.querySelector('.ad-tl-modal-cover')?.remove();
   const cover=element('div','ad-tl-modal-cover'),dialog=element('section','ad-tl-modal');
   dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Редактирование активности');
   const head=element('div','ad-tl-modal-head');
   head.append(element('h2','',item?'Редактировать активность':'Новая активность'),
     button('Закрыть',()=>cover.remove(),'ad-tl-secondary'));dialog.append(head);
   const form=element('form','ad-tl-form');
   const name=element('input');name.value=item?.title||'';name.maxLength=200;name.required=true;
   const notes=element('textarea');notes.value=item?.notes||'';notes.rows=4;notes.maxLength=3000;
   const type=element('select');for(const cat of types){const opt=element('option','',cat.label);opt.value=cat.id;type.append(opt);}
   type.value=item?.activity_type||'other';
   const minutes=element('input');minutes.type='number';minutes.min='5';minutes.max='600';minutes.step='5';minutes.value=String(duration(item));
   const stage=element('select');
   for(const [id,label] of [['idea','Пул идей — время не назначено'],['program','В программе — назначено время']]){
     const opt=element('option','',label);opt.value=id;stage.append(opt);
   }
   stage.value=options.stage||(item&&planned(item)?'program':'idea');
   const date=element('select');
   for(const d of weddingDays){const opt=element('option','',d.label);opt.value=d.date;date.append(opt);}
   date.value=options.date||(item&&weddingDays.some(d=>d.date===dateOf(item))?dateOf(item):day);
   const start=element('input');start.type='time';start.value=timeOf(item)||'';
   const place=element('input');place.value=item?.place||'';place.maxLength=250;
   const venue=element('select');const noVenue=element('option','','Не выбрана');noVenue.value='';venue.append(noVenue);
   for(const v of venues){const opt=element('option','',v.name);opt.value=v.id;venue.append(opt);}
   venue.value=item?.venue_id||'';
   const confirmed=element('input');confirmed.type='checkbox';confirmed.checked=Number(item?.is_confirmed||0)===1;
   const dateWrap=field('Дата',date),timeWrap=field('Начало',start);
   const endPreview=element('p','ad-tl-end-preview');
   function updateTiming(){
     const inProgram=stage.value==='program';dateWrap.hidden=!inProgram;timeWrap.hidden=!inProgram;start.required=inProgram;
     const n=asMinutes(start.value),m=Number(minutes.value);
     endPreview.textContent=inProgram?(n!==null&&m>0&&n+m<=1440?'Окончание: '+clock(n+m):'Выберите начало и длительность'):'Идея хранится без времени начала и окончания';
   }
   stage.addEventListener('change',updateTiming);start.addEventListener('input',updateTiming);minutes.addEventListener('input',updateTiming);
   form.append(field('Название активности',name),field('Описание',notes),field('Тип активности',type),
     field('Длительность, минут',minutes),field('Где находится карточка',stage),
     dateWrap,timeWrap,endPreview,field('Место / зона (необязательно)',place),
     field('Площадка из списка (необязательно)',venue));
   const venueConfirm=field('Место утверждено',confirmed);venueConfirm.classList.add('ad-tl-checkbox');
   form.append(venueConfirm);
   const actions=element('div','ad-tl-modal-actions');
   const save=element('button','ad-tl-button ad-tl-primary','Сохранить');save.type='submit';
   actions.append(save,button('Отмена',()=>cover.remove(),'ad-tl-secondary'));
   const status=element('p','ad-tl-form-error');status.setAttribute('role','alert');
   form.append(actions,status);dialog.append(form);cover.append(dialog);host.append(cover);updateTiming();
   form.addEventListener('submit',async e=>{
     e.preventDefault();if(working)return;
     const n=Number(minutes.value),begin=asMinutes(start.value),previousDay=item&&planned(item)?dateOf(item):'';
     const target=date.value,isProgram=stage.value==='program';
     if(!name.value.trim()){status.textContent='Укажите название';return;}
     if(!Number.isInteger(n)||n<5||n>600){status.textContent='Длительность от 5 до 600 минут';return;}
     if(isProgram&&(begin===null||begin+n>1440)){
       status.textContent='Укажите время, позволяющее закончить активность в тот же день';return;
     }
     let gap=0;
     const before=dayEntries(target).filter(x=>x.id!==item?.id);
     let ordered=before.map(x=>x.id),at=ordered.length;
     if(isProgram&&item&&previousDay===target){
       const original=dayEntries(target).map(x=>x.id);
       at=Math.min(original.indexOf(item.id),ordered.length);
     }
     if(isProgram&&options.beforeId){
       const targetIndex=ordered.indexOf(options.beforeId);
       if(targetIndex>=0)at=targetIndex;
     }
     if(isProgram&&at>0){
       const prior=before[at-1],end=asMinutes(lastEnd(before.slice(0,at)));
       if(end!==null&&begin<end){
         status.textContent='Начало раньше окончания предыдущей активности. Измените время или порядок.';return;
       }
       gap=Math.min(240,Math.max(0,(begin??0)-(end??0)));
       if(begin!==null&&end!==null&&begin-end>240){
         status.textContent='Пауза до активности больше 4 часов. Уточните начало.';return;
       }
     }
     const fields={
       title:name.value.trim(),notes:notes.value.trim(),activity_type:type.value,
       duration_min:n,stage:isProgram?'program':'idea',gap_before_min:isProgram?gap:0,
       start_at:isProgram?target+'T'+start.value+':00':null,
       end_at:isProgram?target+'T'+clock(begin+n)+':00':null,
       place:place.value.trim(),venue_id:venue.value,
       is_confirmed:confirmed.checked&&!!venue.value?1:0,
       is_public:Number(item?.is_public||0),
       sort_order:isProgram?(item&&previousDay===target?Number(item.sort_order)||90:10000):Number(item?.sort_order)||0
     };
     working=true;save.disabled=true;
     try{
       const result=await call('admin/records',{method:item?.id?'PATCH':'POST',body:{
         collection:'schedule_items',...(item?.id?{id:item.id}:{}),fields
       }});
       if(isProgram){
         const newId=item?.id||result.id;
         ordered.splice(at,0,newId);
         const priorFirst=before[0];
         const firstTime=at===0?start.value:(priorFirst?timeOf(priorFirst):start.value);
         await arrange(target,ordered,firstTime);
       }
       if(previousDay&&(!isProgram||previousDay!==target)){
         const remaining=dayEntries(previousDay).filter(x=>x.id!==item.id);
         if(remaining.length)await arrange(previousDay,remaining.map(x=>x.id),timeOf(remaining[0]));
       }
       cover.remove();await refresh('Изменения сохранены в базе.');
     }catch(err){
       status.textContent=err.message||'Не удалось сохранить';
       await fetchData();
     }finally{working=false;save.disabled=false}
   });
   name.focus({preventScroll:true});
 }
 function editTypes(){
   host.querySelector('.ad-tl-modal-cover')?.remove();
   const cover=element('div','ad-tl-modal-cover'),dialog=element('section','ad-tl-modal');
   const head=element('div','ad-tl-modal-head');
   head.append(element('h2','','Типы активностей и цвета'),button('Закрыть',()=>cover.remove(),'ad-tl-secondary'));dialog.append(head);
   const rows=element('div','ad-tl-types');
   let local=types.map(t=>({...t}));
   const note=element('p','ad-tl-help','Каждому типу соответствует цвет всех карточек этого типа.');
   const info=element('p','ad-tl-form-error');info.setAttribute('role','alert');
   const redraw=()=>{
     rows.replaceChildren();
     for(const type of local){
       const row=element('div','ad-tl-type-row');
       const name=element('input');name.value=type.label;name.maxLength=60;
       name.addEventListener('input',()=>{type.label=name.value;});
       const color=element('input');color.type='color';color.value=type.color;
       color.addEventListener('input',()=>{type.color=color.value;});
       const del=button('Удалить',()=>{
         if(entries.some(e=>e.activity_type===type.id)){info.textContent='Этот тип используется в карточках. Сначала смените их тип.';return;}
         local=local.filter(t=>t.id!==type.id);redraw();
       },'ad-tl-muted');
       row.append(name,color,del);rows.append(row);
     }
   };
   redraw();
   const footer=element('div','ad-tl-modal-actions');
   footer.append(button('+ Тип',()=>{
     local.push({id:'custom_'+Date.now().toString(36),label:'Новый тип',color:'#DCE8DE'});redraw();
   },'ad-tl-secondary'));
   footer.append(button('Сохранить типы',async ()=>{
     if(!local.every(t=>t.label.trim())){info.textContent='Укажите название каждого типа';return;}
     try{
       await call('admin/settings',{method:'POST',body:{key:'activity_types',value:local}});
       cover.remove();await refresh('Типы и цвета сохранены.');
     }catch(e){info.textContent=e.message;}
   },'ad-tl-primary'));
   dialog.append(note,rows,info,footer);cover.append(dialog);host.append(cover);
 }
 await fetchData();draw();
}
