// Wedding admin: day-first program and idea pool; same authenticated SQLite source.
export const BASE_TYPES=[
 {id:'ceremony',label:'Церемония',color:'#E5EAD8'},
 {id:'social',label:'Общение с гостями',color:'#D7ECE8'},
 {id:'dance',label:'Танцы',color:'#F3DAE5'},
 {id:'speech',label:'Выступление гостя',color:'#E4DFF5'},
 {id:'music',label:'Музыка',color:'#E3EDCB'},
 {id:'food',label:'Ужин и фуршет',color:'#F2E8D2'},
 {id:'game',label:'Интерактив',color:'#DDE9F5'},
 {id:'other',label:'Другое',color:'#E8EBE8'}
];
const $=(tag,className='',value)=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(value!==undefined)node.textContent=String(value);
 return node;
};
const makeButton=(name,action,cls='')=>{
 const b=$('button','ad-tl-button '+cls,name);b.type='button';
 b.addEventListener('click',action);return b;
};
const field=(label,input)=>{
 const wrapper=$('label','ad-tl-field');wrapper.append($('span','',label),input);return wrapper;
};
const hm=value=>{const match=String(value||'').match(/T(\d\d:\d\d)/);return match?match[1]:'';};
const mins=value=>{
 const found=/^(\d\d):(\d\d)$/.exec(String(value||''));
 if(!found)return null;
 const h=Number(found[1]),m=Number(found[2]);
 return h<24&&m<60?h*60+m:null;
};
const clock=minutes=>String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
const duration=entry=>Math.max(5,Number(entry?.duration_min)||30);
export const scheduled=entry=>entry?.stage==='program'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(entry.start_at||'');
export const assignedDay=entry=>{const date=entry?.activity_date||String(entry?.start_at||'').slice(0,10);return /^2027-06-(17|18|19)$/.test(date)?date:'2027-06-19';};
export const itemTags=item=>{
 try{const tags=JSON.parse(item?.tags_json||'[]');return Array.isArray(tags)?tags.filter(x=>typeof x==='string'):[]}
 catch{return []}
};
const typeColor=type=>/^#[0-9a-fA-F]{6}$/.test(type?.color||'')?type.color:'#E8EBE8';
const safeTypes=(saved,fallback)=>Array.isArray(saved)&&saved.length?saved.map(x=>({...x})):fallback.map(x=>({...x}));

// One fixed vertical time scale keeps start/end and stretch height in sync.
export const MINUTE_PX=3;
export const snapToFive=value=>Math.round(value/5)*5;
export function parallelEventLayout(items){
 const slots=items.map(item=>{
   const start=mins(hm(item.start_at));
   const end=mins(hm(item.end_at))??(start===null?null:start+duration(item));
   return {id:item.id,start,end};
 }).filter(x=>x.start!==null&&x.end!==null&&x.end>x.start)
   .sort((a,b)=>a.start-b.start||b.end-a.end||String(a.id).localeCompare(String(b.id)));
 const arranged=[];
 let group=[],groupEnd=-1;
 const flush=()=>{
   if(!group.length)return;
   const lanes=[];
   const placed=group.map(event=>{
     let lane=lanes.findIndex(end=>end<=event.start);
     if(lane===-1){lane=lanes.length;lanes.push(event.end)}
     else lanes[lane]=event.end;
     return {...event,lane};
   });
   for(const event of placed)arranged.push({...event,laneCount:lanes.length});
   group=[];groupEnd=-1;
 };
 for(const event of slots){
   if(group.length&&event.start>=groupEnd)flush();
   group.push(event);
   groupEnd=Math.max(groupEnd,event.end);
 }
 flush();
 return arranged;
}

export async function renderWeddingProgram(host,api,days){
 let entries=[],types=BASE_TYPES.map(t=>({...t})),tags=[],day='2027-06-19',view='program';
 let filter='all',notification='',busy=false;
 const timelineScrollByDay=new Map();
 const dateName=value=>days.find(d=>d.date===value)?.label||value;
 const entriesFor=which=>entries.filter(e=>assignedDay(e)===day&&(which==='program'?scheduled(e):!scheduled(e)))
   .sort((a,b)=>which==='program'
      ?String(a.start_at||'').localeCompare(String(b.start_at||''))||(Number(a.sort_order)||0)-(Number(b.sort_order)||0)
      :String(b.created_at||'').localeCompare(String(a.created_at||'')));
 const typesOf=e=>types.find(t=>t.id===e.activity_type)||BASE_TYPES.find(t=>t.id==='other');
 const visible=e=>filter==='all'||itemTags(e).includes(filter);
 async function load(){
   const [records,settings]=await Promise.all([
     api('admin/records?collection=schedule_items'),api('admin/settings')
   ]);
   entries=(records.items||[]).filter(e=>e&&typeof e.title==='string');
   types=safeTypes(settings.settings?.activity_types,BASE_TYPES);
   tags=Array.isArray(settings.settings?.activity_tags)?settings.settings.activity_tags.map(t=>({...t})):[];
 }
 async function reload(message=''){notification=message;await load();render();}
 async function saveSlot(item,startMinute,newLength,success='Время обновлено.'){
   if(busy)return false;
   const length=Math.round(Number(newLength)),start=snapToFive(Number(startMinute));
   if(!Number.isFinite(start)||!Number.isInteger(length)||length<5||length>600||
      start<0||start+length>=1440){
     notification='Время выходит за пределы дня или длительность недопустима.';render();return false;
   }
   busy=true;
   try{
     await api('admin/schedule/slot',{method:'POST',body:{
       id:item.id,day:assignedDay(item),start_time:clock(start),duration_min:length
     }});
     await reload(success);return true;
   }catch(error){await reload('Не удалось сохранить время: '+error.message);return false}
   finally{busy=false}
 }
 function attachTimelineHandles(node,item,clockLabel,lengthLabel){
   const start=mins(hm(item.start_at));
   if(start===null)return;
   let pointer=null,ignoreNextClick=false;
   // A short click edits the card. Hold for 230 ms, then drag the whole card
   // to another time slot. The bottom 16 px are the unmarked resize edge.
   node.addEventListener('click',event=>{
     if(!ignoreNextClick)return;
     ignoreNextClick=false;
     event.preventDefault();event.stopImmediatePropagation();
   },true);
   const refresh=(state,y)=>{
     const delta=snapToFive((y-state.initialY)/MINUTE_PX);
     if(state.mode==='resize'){
       state.length=Math.max(5,Math.min(600,1435-state.baseStart,
         snapToFive(state.baseLength+delta)));
       node.style.height=Math.max(15,state.length*MINUTE_PX)+'px';
     }else{
       state.start=Math.max(0,Math.min(1435-state.baseLength,
         snapToFive(state.baseStart+delta)));
       node.style.transform='translateY('+((state.start-state.baseStart)*MINUTE_PX)+'px)';
     }
     clockLabel.textContent=clock(state.start)+' — '+clock(state.start+state.length);
     lengthLabel.textContent=state.length+' мин';
   };
   const arm=state=>{
     if(pointer!==state)return;
     state.armed=true;ignoreNextClick=true;
     node.classList.add('ad-tl-adjusting','ad-tl-grabbing');
     refresh(state,state.lastY);
   };
   const reset=state=>{
     if(state.holdTimer!==null)clearTimeout(state.holdTimer);
     node.classList.remove('ad-tl-adjusting','ad-tl-grabbing');
     node.style.transform='';node.style.height='';
     clockLabel.textContent=clock(state.baseStart)+' — '+clock(state.baseStart+state.baseLength);
     lengthLabel.textContent=state.baseLength+' мин';
     try{if(node.hasPointerCapture(state.pointerId))node.releasePointerCapture(state.pointerId)}catch{}
     pointer=null;
   };
   node.addEventListener('pointerdown',event=>{
     if(busy||pointer||(event.pointerType==='mouse'&&event.button!==0)||
       event.target.closest('button,input,select,textarea,a'))return;
     const bounds=node.getBoundingClientRect();
     const resizing=event.clientY>=bounds.bottom-16;
     const state={
       pointerId:event.pointerId,initialY:event.clientY,lastY:event.clientY,
       baseStart:start,baseLength:duration(item),start,length:duration(item),
       mode:resizing?'resize':'move',armed:resizing,holdTimer:null
     };
     pointer=state;
     node.setPointerCapture(event.pointerId);
     if(resizing){
       ignoreNextClick=true;
       node.classList.add('ad-tl-adjusting','ad-tl-resizing');
       event.preventDefault();
     }else{
       state.holdTimer=setTimeout(()=>arm(state),230);
     }
   });
   node.addEventListener('pointermove',event=>{
     if(!pointer||pointer.pointerId!==event.pointerId)return;
     pointer.lastY=event.clientY;
     if(pointer.armed){event.preventDefault();refresh(pointer,event.clientY)}
   });
   node.addEventListener('pointerup',event=>{
     if(!pointer||pointer.pointerId!==event.pointerId)return;
     const state=pointer;
     if(state.armed)refresh(state,event.clientY);
     const changed=state.armed&&(state.start!==state.baseStart||state.length!==state.baseLength);
     if(state.armed)ignoreNextClick=true;
     reset(state);
     node.classList.remove('ad-tl-resizing');
     if(changed)void saveSlot(item,state.start,state.length,
       state.mode==='resize'?'Длительность изменена.':'Время начала изменено.');
   });
   node.addEventListener('pointercancel',event=>{
     if(!pointer||pointer.pointerId!==event.pointerId)return;
     const state=pointer;
     ignoreNextClick=state.armed;
     reset(state);node.classList.remove('ad-tl-resizing');
   });
   // Keyboard users can move by 5 minutes or resize with Shift + arrows.
   node.addEventListener('keydown',event=>{
     if(event.target!==node||!['ArrowUp','ArrowDown'].includes(event.key))return;
     event.preventDefault();event.stopPropagation();
     const delta=event.key==='ArrowDown'?5:-5;
     if(event.shiftKey)void saveSlot(item,start,Math.max(5,
       Math.min(600,1435-start,duration(item)+delta)),'Длительность изменена.');
     else void saveSlot(item,Math.max(0,Math.min(1435-duration(item),start+delta)),
       duration(item),'Время начала изменено.');
   });
 }
 async function removeItem(item){
   if(busy||!confirm('Удалить активность «'+item.title+'»? Это действие нельзя отменить.'))return false;
   busy=true;
   try{
     await api('admin/schedule/delete',{method:'POST',body:{id:item.id}});
     await reload('Активность удалена.');return true;
   }catch(err){await reload('Не удалось удалить: '+err.message);return false;}
   finally{busy=false}
 }
 function card(item,rows){
   const cat=typesOf(item),node=$('article','ad-tl-card ad-tl-card-clickable');
   let clockLabel=null,lengthLabel=null;
   node.style.setProperty('--activity-color',typeColor(cat));
   node.setAttribute('role','button');
   node.setAttribute('tabindex','0');
   node.setAttribute('aria-label','Открыть активность: '+item.title);
   node.addEventListener('click',e=>{
     if(e.target.closest('button'))return;
     openCard(item);
   });
   node.addEventListener('keydown',e=>{
     if(e.target!==node)return;
     if(e.key==='Enter'||e.key===' '){e.preventDefault();openCard(item)}
   });
   if(view==='program'){
     const from=hm(item.start_at);
     const until=hm(item.end_at)||(mins(from)!==null
       ?clock(Math.min(1439,mins(from)+duration(item))):'—');
     const top=$('div','ad-tl-card-top');
     clockLabel=$('span','ad-tl-clock',(from||'—')+' — '+until);
     top.append(clockLabel);
     node.append(top);
   }
   const meta=$('div','ad-tl-card-eyebrow');
   lengthLabel=$('span','ad-tl-length',duration(item)+' мин');
   meta.append($('span','ad-tl-type',cat?.label||'Другое'),lengthLabel);
   node.append(meta,$('h3','ad-tl-card-title',item.title));
   if(item.notes)node.append($('p','ad-tl-card-description',item.notes));
   const pills=$('div','ad-tl-tags-inline');
   for(const id of itemTags(item)){
     const tag=tags.find(t=>t.id===id);
     if(!tag)continue;
     const pill=$('span','ad-tl-tag',tag.label);
     pill.style.setProperty('--tag-color',typeColor(tag));pills.append(pill);
   }
   if(pills.childElementCount)node.append(pills);
   if(view==='program')attachTimelineHandles(node,item,clockLabel,lengthLabel);
   return node;
 }
 function renderTimeline(items){
   const container=$('section','ad-tl-calendar');
   if(!items.length){
     container.append($('div','ad-tl-empty','Для этого дня программа пока не составлена. Добавьте активность или переведите идею в программу.'));
     return container;
   }
   const layout=parallelEventLayout(items);
   const earliest=Math.min(...layout.map(x=>x.start));
   const latest=Math.max(...layout.map(x=>x.end));
   const axisStart=Math.max(0,Math.floor((earliest-75)/30)*30);
   const axisEnd=Math.min(1440,Math.max(axisStart+180,Math.ceil((latest+90)/30)*30));
   const height=(axisEnd-axisStart)*MINUTE_PX;
   const scroller=$('div','ad-tl-calendar-scroll');
   scroller.setAttribute('aria-label','Расписание по часам с параллельными дорожками');
   const grid=$('div','ad-tl-calendar-grid');
   grid.style.height=height+'px';
   const board=$('div','ad-tl-calendar-board');
   board.style.height=height+'px';
   for(let minute=Math.ceil(axisStart/30)*30;minute<=axisEnd;minute+=30){
     const major=minute%60===0;
     const top=(minute-axisStart)*MINUTE_PX;
     const label=$('span','ad-tl-time-tick'+(major?' is-hour':''),clock(minute));
     label.style.top=top+'px';grid.append(label);
     const line=$('div','ad-tl-calendar-line'+(major?' is-hour':''));
     line.style.top=top+'px';board.append(line);
   }
   const byId=new Map(items.map(x=>[x.id,x]));
   for(const slot of layout){
     const item=byId.get(slot.id);
     if(!item)continue;
     const tile=card(item,items);
     tile.classList.add('ad-tl-calendar-card');
     tile.style.top=((slot.start-axisStart)*MINUTE_PX)+'px';
     tile.style.height=((slot.end-slot.start)*MINUTE_PX)+'px';
     tile.style.left=(slot.lane/slot.laneCount*100)+'%';
     tile.style.width='calc('+(100/slot.laneCount)+'% - 8px)';
     tile.setAttribute('data-parallel-lane',String(slot.lane));
     tile.title=item.title+' · '+clock(slot.start)+'–'+clock(slot.end);
     if(slot.laneCount>1)tile.classList.add('ad-tl-is-parallel');
     board.append(tile);
   }
   grid.append(board);scroller.append(grid);container.append(scroller);
   const footer=$('p','ad-tl-timeline-foot',
     clock(earliest)+'–'+clock(latest)+' · '+items.length+' событий · '+
     (layout.some(x=>x.laneCount>1)?'Есть параллельные активности':'Без пересечений'));
   container.append(footer);
   // Initial scroll keeps the first event in sight without a blank prelude.
   const savedScroll=timelineScrollByDay.has(day)
     ?timelineScrollByDay.get(day)
     :Math.max(0,(earliest-axisStart)*MINUTE_PX-84);
   // The scrollable element receives real dimensions only after it joins the DOM.
   requestAnimationFrame(()=>{
     if(scroller.isConnected)scroller.scrollTop=savedScroll;
     scroller.addEventListener('scroll',()=>timelineScrollByDay.set(day,scroller.scrollTop));
   });
   return container;
 }
 function render(){
   host.replaceChildren();
   host.classList.add('ad-timeline-page');
   const header=$('header','ad-tl-header'),intro=$('div');
   intro.append($('h1','','Программа мероприятия'));
   const commands=$('div','ad-tl-top-actions');
   commands.append(makeButton('+ '+(view==='program'?'Активность':'Идея'),
     ()=>openCard(null,{stage:view}),'ad-tl-primary'));
   header.append(intro,commands);host.append(header);
   // Day is the first-level navigation; program and ideas live inside each day.
   const daysBar=$('nav','ad-tl-day-nav');
   daysBar.setAttribute('aria-label','Выбор дня свадьбы');
   for(const d of days){
     const b=makeButton(d.label,()=>{
       day=d.date;filter='all';notification='';render();
     },'ad-tl-day-tab'+(day===d.date?' is-active':''));
     b.setAttribute('aria-pressed',String(day===d.date));
     daysBar.append(b);
   }
   host.append(daysBar);
   const nav=$('nav','ad-tl-main-switch');
   nav.setAttribute('aria-label','Раздел выбранного дня');
   for(const [id,label,desc] of [
     ['program','Программа','Таймлайн'],
     ['idea','Пул идей','Активности без назначенного времени']]){
     const count=entries.filter(e=>assignedDay(e)===day&&(id==='program'?scheduled(e):!scheduled(e))).length;
     const button=makeButton(label+' · '+count,()=>{
       view=id;filter='all';notification='';render();
     },'ad-tl-main-tab'+(view===id?' is-active':''));
     button.setAttribute('aria-pressed',String(view===id));
     button.title=desc;
     nav.append(button);
   }
   host.append(nav);
   if(notification){const n=$('p','ad-tl-notice',notification);n.setAttribute('role','status');host.append(n);}
   const current=entriesFor(view);
   const toolbar=$('div','ad-tl-section-toolbar'),heading=$('div','ad-tl-section-heading');
   heading.append($('h2','',view==='program'?'Программа · '+dateName(day):'Пул идей · '+dateName(day)));
   heading.append($('span','ad-tl-help',view==='program'
     ?'Удерживайте карточку для перемещения. Растягивайте её за нижний край для изменения длительности.'
     :'Идеи принадлежат этому дню, но пока не имеют назначенного времени.'));
   toolbar.append(heading);
   const sum=$('span','ad-tl-summary',current.length+' '+(view==='program'?'событий':'идей'));
   toolbar.append(sum);
   host.append(toolbar);
   if(tags.length){
     const filters=$('div','ad-tl-tag-filters');filters.setAttribute('aria-label','Фильтр по тегу');
     const all=makeButton('Все теги',()=>{filter='all';render();},'ad-tl-filter'+(filter==='all'?' selected':''));
     all.setAttribute('aria-pressed',String(filter==='all'));filters.append(all);
     for(const tag of tags){
       const b=makeButton(tag.label,()=>{filter=tag.id;render();},'ad-tl-filter'+(filter===tag.id?' selected':''));
       b.style.setProperty('--tag-color',typeColor(tag));b.setAttribute('aria-pressed',String(filter===tag.id));filters.append(b);
     }
     host.append(filters);
   }
   const visibleRows=current.filter(visible);
   if(view==='program'){
     host.append(renderTimeline(visibleRows));
   }else{
     const content=$('div','ad-tl-single-content ad-tl-ideas-grid');
     if(!visibleRows.length)content.append($('div','ad-tl-empty',
       filter!=='all'?'В этом дне нет карточек с выбранным тегом.':
       'Для этого дня идей пока нет. Добавьте первую.'));
     else for(const item of visibleRows)content.append(card(item,current));
     host.append(content);
   }

 }
 function openCard(item=null,prefs={}){
   host.querySelector('.ad-tl-modal-cover')?.remove();
   const shade=$('div','ad-tl-modal-cover'),modal=$('section','ad-tl-modal');
   modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
   modal.setAttribute('aria-label','Редактирование активности');
   const title=$('div','ad-tl-modal-head');
   const heading=$('h2','ad-tl-editor-title',item?.title||(view==='idea'?'Новая идея':'Новая активность'));
   const pencil=$('span','ad-tl-editor-pencil','✎');
   pencil.setAttribute('aria-hidden','true');
   const headingWrap=$('div','ad-tl-editor-heading');
   headingWrap.append(heading,pencil);
   title.append(headingWrap,makeButton('Закрыть',()=>shade.remove(),'ad-tl-secondary'));
   modal.append(title);
   const form=$('form','ad-tl-form');
   const name=$('input');name.value=item?.title||'';name.required=true;name.maxLength=220;
   name.addEventListener('input',()=>heading.textContent=name.value.trim()||(view==='idea'?'Новая идея':'Новая активность'));
   const description=$('textarea');description.value=item?.notes||'';description.rows=3;description.maxLength=3000;
   const category=$('select');
   for(const type of types){const opt=$('option','',type.label);opt.value=type.id;category.append(opt)}
   if(types.some(t=>t.id===item?.activity_type))category.value=item.activity_type;
   else category.value=types.find(t=>t.id==='other')?.id||types[0]?.id||'other';
   const durationInput=$('input');durationInput.type='number';durationInput.step='1';
   durationInput.min='5';durationInput.max='600';durationInput.value=String(duration(item));
   const placement=$('input');
   placement.type='checkbox';
   placement.checked=prefs.stage==='program'||(!prefs.stage&&Boolean(item&&scheduled(item)));
   placement.setAttribute('role','switch');
   placement.setAttribute('aria-label','В программе');
   const statusLabel=$('label','ad-tl-placement-toggle');
   const track=$('span','ad-tl-switch-track');
   track.setAttribute('aria-hidden','true');
   const stateText=$('span','ad-tl-switch-state',placement.checked?'В программе':'В пуле идей');
   statusLabel.append(placement,track,stateText);
   const placementField=$('div','ad-tl-placement-field');
   placementField.append(statusLabel);
   const start=$('input');start.type='time';start.value=hm(item?.start_at);
   const end=$('input');end.type='time';
   end.value=hm(item?.end_at)||(mins(start.value)!==null&&mins(start.value)+duration(item)<1440
     ?clock(mins(start.value)+duration(item)):'');
   const parallel=$('select');
   const free=$('option','','Не привязывать — время вручную');
   free.value='';parallel.append(free);
   for(const other of entriesFor('program')){
     if(other.id===item?.id)continue;
     const option=$('option','',hm(other.start_at)+' · '+other.title);
     option.value=other.id;parallel.append(option);
   }
   const parallelField=field('Параллельно с',parallel);
   const startField=field('Начало',start),endField=field('Окончание',end);
   function updateVisible(){
     const enabled=placement.checked;
     parallelField.hidden=!enabled;startField.hidden=!enabled;endField.hidden=!enabled;
     stateText.textContent=enabled?'В программе':'В пуле идей';
     start.required=enabled;end.required=enabled;
     if(enabled&&!start.value){
       const last=Math.max(780,...entriesFor('program')
         .filter(other=>other.id!==item?.id)
         .map(other=>mins(hm(other.end_at))??(mins(hm(other.start_at))??0)+duration(other)));
       start.value=clock(Math.min(1380,last));
       fromStartOrDuration();
     }
   }
   function fromStartOrDuration(){
     const a=mins(start.value),d=Number(durationInput.value);
     if(a!==null&&Number.isInteger(d)&&d>=5&&d<=600&&a+d<1440)end.value=clock(a+d);
     else end.value='';
   }
   parallel.addEventListener('change',()=>{
     const other=entries.find(x=>x.id===parallel.value);
     if(!other)return;
     start.value=hm(other.start_at);
     fromStartOrDuration();
   });
   start.addEventListener('change',()=>{parallel.value='';fromStartOrDuration()});
   durationInput.addEventListener('change',fromStartOrDuration);
   end.addEventListener('change',()=>{
     const a=mins(start.value),b=mins(end.value);
     if(a!==null&&b!==null&&b>a&&b-a>=5&&b-a<=600)durationInput.value=String(b-a);
   });
   placement.addEventListener('change',updateVisible);
   const tagBox=$('div','ad-tl-tag-select-list');
   const selected=new Set(itemTags(item));
   for(const tag of tags){
     const chip=makeButton(tag.label,()=>toggleTag(),'ad-tl-tag-select');
     chip.style.setProperty('--tag-color',typeColor(tag));
     const refresh=()=>{
       const active=selected.has(tag.id);
       chip.classList.toggle('is-selected',active);
       chip.setAttribute('aria-pressed',String(active));
     };
     const toggleTag=()=>{if(selected.has(tag.id))selected.delete(tag.id);else selected.add(tag.id);refresh()};
     refresh();tagBox.append(chip);
   }
   const tagsField=$('div','ad-tl-tags-field');
   tagsField.append($('span','ad-tl-form-label','Теги'));
   if(tags.length)tagsField.append(tagBox);
   form.append(field('Название',name),field('Описание',description),field('Категория',category),
     field('Длительность, минут',durationInput),tagsField,
     placementField,
     parallelField,startField,endField);
   const feedback=$('p','ad-tl-form-error');feedback.setAttribute('role','alert');
   const buttons=$('div','ad-tl-modal-actions');
   const save=$('button','ad-tl-button ad-tl-primary','Сохранить');save.type='submit';
   buttons.append(save);
   if(item)buttons.append(makeButton('Удалить',()=>removeItem(item),'ad-tl-muted ad-tl-delete'));
   buttons.append(makeButton('Отмена',()=>shade.remove(),'ad-tl-secondary'));
   form.append(buttons,feedback);modal.append(form);shade.append(modal);host.append(shade);
   updateVisible();name.focus({preventScroll:true});
   form.addEventListener('submit',async event=>{
     event.preventDefault();if(busy)return;
     const startN=mins(start.value),endN=mins(end.value);
     const n=Number(durationInput.value),isProgram=placement.checked;
     if(!name.value.trim()){feedback.textContent='Укажите название активности.';return}
     if(!Number.isInteger(n)||n<5||n>600){feedback.textContent='Длительность должна составлять 5–600 минут.';return}
     if(isProgram&&(startN===null||endN===null||endN<=startN||endN-startN!==n)){
       feedback.textContent='Проверьте начало, окончание и длительность активности.';return;
     }
     if(isProgram&&endN>=1440){feedback.textContent='Событие должно завершиться до полуночи.';return}
     // An activity never changes its wedding day from within the card editor.
     const chosenDay=item?assignedDay(item):day;
     const checked=[...selected];
     const fields={
       title:name.value.trim(),notes:description.value.trim(),
       activity_type:category.value,duration_min:n,tags_json:JSON.stringify(checked),
       stage:isProgram?'program':'idea',activity_date:chosenDay,
       start_at:isProgram?chosenDay+'T'+start.value+':00':null,
       end_at:isProgram?chosenDay+'T'+end.value+':00':null,
       gap_before_min:0,sort_order:isProgram?(startN||0):0
     };
     busy=true;save.disabled=true;
     try{
       await api('admin/records',{method:item?.id?'PATCH':'POST',body:{
         collection:'schedule_items',...(item?.id?{id:item.id}:{}),fields
       }});
       view=isProgram?'program':'idea';filter='all';
       shade.remove();await reload('Карточка сохранена.');
     }catch(error){feedback.textContent=error.message||'Не удалось сохранить.';}
     finally{busy=false;save.disabled=false}
   });
 }
 await load();render();
}
