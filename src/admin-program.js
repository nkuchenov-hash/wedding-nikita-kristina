import {showAdminToast} from './admin-toast.js';
// Wedding admin: day-first program and idea pool; same authenticated SQLite source.
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
export const assignedDay=entry=>{const date=entry?.activity_date||String(entry?.start_at||'').slice(0,10);return /^2027-06-(17|18|19|20|21)$/.test(date)?date:'2027-06-19';};
export const itemTags=item=>{
 try{const tags=JSON.parse(item?.tags_json||'[]');return Array.isArray(tags)?tags.filter(x=>typeof x==='string'):[]}
 catch{return []}
};
const tagColor=type=>/^#[0-9a-fA-F]{6}$/.test(type?.color||'')?type.color:'#E8EBE8';
export function cardTagColors(item,definitions){
 const ids=itemTags(item);
 const palette=new Map((Array.isArray(definitions)?definitions:[])
   .filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x.color]));
 return [...new Set(ids)].map(id=>palette.get(id))
   .filter(color=>typeof color==='string'&&/^#[0-9a-fA-F]{6}$/.test(color));
}
export function cardColorStyle(item,definitions){
 const colors=cardTagColors(item,definitions);
 const primary=colors[0]||'#ECF2EC';
 // The first selected tag alone determines the background.
 // Other tags remain visible on the card without secondary stripes.
 return {primary};
}


// Editable timeline viewport for each wedding date; not a hard event constraint.
export const DEFAULT_DAY_HOURS={
 '2027-06-17':{from:'11:00',to:'22:00'},
 '2027-06-18':{from:'10:00',to:'23:00'},
 '2027-06-19':{from:'12:00',to:'23:00'},
 '2027-06-20':{from:'09:00',to:'23:00'},
 '2027-06-21':{from:'09:00',to:'23:00'}
};
export function displayHoursForDay(date,saved){
 const fallback=DEFAULT_DAY_HOURS[date]||{from:'09:00',to:'23:00'};
 const value=saved?.[date];
 const pattern=/^([01]\d|2[0-3]):[0-5]\d$/;
 if(!value||!pattern.test(value.from)||!pattern.test(value.to))return {...fallback};
 const from=mins(value.from),to=mins(value.to);
 return from!==null&&to!==null&&to-from>=60?{from:value.from,to:value.to}:{...fallback};
}

// One fixed vertical time scale keeps start/end and stretch height in sync.
export function cardDescription(item,isScheduled){
 const notes=String(item?.notes||'');
 // The original draft time remains in the editor, but does not repeat the
 // actual program start/end time printed on the timeline card.
 return isScheduled
   ?notes.replace(/^\s*Предложенный тайминг:[^\r\n]*(?:\r?\n|$)/iu,'').trim()
   :notes.trim();
}
export const MINUTE_PX=6;
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
 let entries=[],tags=[],day='2027-06-19',view='program',programDisplay='timeline',dayHours={...DEFAULT_DAY_HOURS};
 let filter='all',notification='',busy=false;
 const timelineScrollByDay=new Map();
 const dateName=value=>days.find(d=>d.date===value)?.label||value;
 const entriesFor=which=>entries.filter(e=>assignedDay(e)===day&&(which==='program'?scheduled(e):!scheduled(e)))
   .sort((a,b)=>which==='program'
      ?String(a.start_at||'').localeCompare(String(b.start_at||''))||(Number(a.sort_order)||0)-(Number(b.sort_order)||0)
      :String(b.created_at||'').localeCompare(String(a.created_at||'')));
 const visible=e=>filter==='all'||itemTags(e).includes(filter);
 async function load(){
   const [records,settings]=await Promise.all([
     api('admin/records?collection=schedule_items'),api('admin/settings')
   ]);
   entries=(records.items||[]).filter(e=>e&&typeof e.title==='string');
   tags=Array.isArray(settings.settings?.activity_tags)?settings.settings.activity_tags.map(t=>({...t})):[];
   dayHours=settings.settings?.program_day_hours||DEFAULT_DAY_HOURS;
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
 // A card is a compact time anchor, not a height proportional to duration.
 function attachTimelineHandles(node,item,clockLabel,lengthLabel){
   const start=mins(hm(item.start_at)),baseLength=duration(item);
   if(start===null)return;
   let state=null,suppress=false;
   const cleanup=()=>{
     if(!state)return;
     clearTimeout(state.timer);cancelAnimationFrame(state.frame);
     state.target?.classList.remove('ad-tl-drop-target');
     node.classList.remove('ad-tl-dragging');state.float?.remove();state=null;
   };
   function targetAt(y){
     const candidates=[...host.querySelectorAll('.ad-tl-chronology-row,.ad-tl-program-list > [data-activity-id]')].filter(r=>r.dataset.activityId!==String(item.id));
     if(!candidates.length)return null;
     return candidates.reduce((best,r)=>Math.abs(r.getBoundingClientRect().top+r.getBoundingClientRect().height/2-y)<Math.abs(best.getBoundingClientRect().top+best.getBoundingClientRect().height/2-y)?r:best,candidates[0]);
   }
   function move(x,y){
     if(!state)return;
     state.x=x;state.y=y;
     if(!state.armed){if(Math.hypot(x-state.x0,y-state.y0)>12)cleanup();return}
     const target=targetAt(y);state.target?.classList.remove('ad-tl-drop-target');state.target=target;
     if(target){
       const bounds=target.getBoundingClientRect();
       const next=y>bounds.top+bounds.height/2?Number(target.dataset.end):Number(target.dataset.start);
       state.next=Math.max(0,Math.min(1435-baseLength,snapToFive(next)));
       target.classList.add('ad-tl-drop-target');
     }
     state.float.style.top=Math.max(0,y-36)+'px';state.float.style.left=Math.max(8,Math.min(x-90,window.innerWidth-190))+'px';
     state.float.textContent=clock(state.next)+' · '+item.title;
   }
   function arm(){
     if(!state||busy)return;
     state.armed=true;state.float=$('div','ad-tl-drag-preview');document.body.append(state.float);node.classList.add('ad-tl-dragging');
     const auto=()=>{if(!state?.armed)return;const y=state.y,edge=72;if(y<edge)window.scrollBy(0,-10);else if(y>window.innerHeight-edge)window.scrollBy(0,10);move(state.x,y);state.frame=requestAnimationFrame(auto)};
     move(state.x,state.y);state.frame=requestAnimationFrame(auto);
   }
   function begin(x,y){if(busy||state)return;suppress=false;state={x0:x,y0:y,x,y,next:start,armed:false,frame:0,timer:setTimeout(arm,340),target:null,float:null}}
   function finish(cancel=false){if(!state)return;const {armed,next}=state;cleanup();if(armed){suppress=true;setTimeout(()=>{suppress=false},500);if(!cancel&&next!==start)void saveSlot(item,next,baseLength,'Время начала изменено.')}}
   node.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false}},true);
   node.addEventListener('contextmenu',e=>e.preventDefault());
   node.addEventListener('touchstart',e=>{if(e.touches.length===1)begin(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
   node.addEventListener('touchmove',e=>{if(!state)return;if(state.armed&&e.cancelable)e.preventDefault();const t=e.touches[0];if(t)move(t.clientX,t.clientY)},{passive:false});
   node.addEventListener('touchend',e=>{if(state?.armed&&e.cancelable)e.preventDefault();finish()},{passive:false});
   node.addEventListener('touchcancel',()=>finish(true));
   node.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0)return;begin(e.clientX,e.clientY);try{node.setPointerCapture(e.pointerId)}catch{}});
   node.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')move(e.clientX,e.clientY)});
   node.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')finish()});
   node.addEventListener('pointercancel',e=>{if(e.pointerType!=='touch')finish(true)});
   node.addEventListener('keydown',event=>{
     if(event.target!==node||!['ArrowUp','ArrowDown'].includes(event.key))return;
     event.preventDefault();event.stopPropagation();const delta=event.key==='ArrowDown'?5:-5;
     if(event.shiftKey)void saveSlot(item,start,Math.max(5,Math.min(600,1435-start,baseLength+delta)),'Длительность изменена.');
     else void saveSlot(item,Math.max(0,Math.min(1435-baseLength,start+delta)),baseLength,'Время начала изменено.');
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
   const node=$('article','ad-tl-card ad-tl-card-clickable');
   let clockLabel=null,lengthLabel=null;
   const palette=cardColorStyle(item,tags);
   node.style.setProperty('--activity-color',palette.primary);
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
   const scheduledCard=view==='program';
   const cardHead=$('div','ad-tl-card-head');
   if(scheduledCard){
     const from=hm(item.start_at);
     const until=hm(item.end_at)||(mins(from)!==null
       ?clock(Math.min(1439,mins(from)+duration(item))):'—');
     clockLabel=$('span','ad-tl-clock',(from||'—')+' — '+until);
     cardHead.append(clockLabel);
   }
   // Category only colors the card; it is not repeated as another tag group.
   lengthLabel=$('span','ad-tl-length',duration(item)+' мин');
   cardHead.append(lengthLabel);
   node.append(cardHead,$('h3','ad-tl-card-title',item.title));
   const visibleNotes=cardDescription(item,scheduledCard);
   if(visibleNotes)node.append($('p','ad-tl-card-description',visibleNotes));
   if(scheduledCard){
     if(duration(item)<10){
       node.classList.add('ad-tl-micro-event');
       // Extremely short slots have space for only one line: show the
       // activity's name and duration instead of truncating both away.
       const heading=node.querySelector('.ad-tl-card-title');
       if(heading)heading.title=item.title;
     }
     else if(duration(item)<25)node.classList.add('ad-tl-short-event');
   }
   const pills=$('div','ad-tl-tags-inline');
   for(const id of itemTags(item)){
     const tag=tags.find(t=>t.id===id);
     if(!tag)continue;
     const pill=$('span','ad-tl-tag',tag.label);
     pill.style.setProperty('--tag-color',tagColor(tag));pills.append(pill);
   }
   if(pills.childElementCount){
     pills.setAttribute('aria-label','Теги');
     node.append(pills);
     // Do not clip tag chips when the time slot is shorter than the label area.
     if(scheduledCard && duration(item)<25)node.classList.add('ad-tl-has-short-tags');
   }
   if(view==='program'){
     node.dataset.activityId=String(item.id);node.dataset.start=String(mins(hm(item.start_at)));node.dataset.end=String(mins(hm(item.end_at))??(mins(hm(item.start_at))+duration(item)));
     attachTimelineHandles(node,item,clockLabel,lengthLabel);
   }
   return node;
 }
 function renderTimeline(items){
   const container=$('section','ad-tl-chronology');
   const interval=displayHoursForDay(day,dayHours),axisStart=mins(interval.from),axisEnd=mins(interval.to);
   const layout=parallelEventLayout(items),byId=new Map(layout.map(s=>[String(s.id),s]));
   const head=$('div','ad-tl-chronology-head');
   head.append($('h2','',dateName(day)+', '+(days.find(d=>d.date===day)?.weekday||'').toLowerCase()));
   const settings=$('a','ad-tl-day-settings','Настройки дня');settings.href='#/admin/settings';head.append(settings);container.append(head);
   const list=$('div','ad-tl-chronology-list');container.append(list);
   if(!items.length)list.append($('p','ad-tl-empty','Для этого дня программа пока не составлена.'));
   for(const item of items){
     const slot=byId.get(String(item.id));if(!slot)continue;
     const row=$('div','ad-tl-chronology-row');row.dataset.activityId=String(item.id);row.dataset.start=String(slot.start);row.dataset.end=String(slot.end);
     const time=$('div','ad-tl-chronology-time');time.append($('strong','',clock(slot.start)),$('small','',duration(item)+' мин'));
     const tile=card(item,items);tile.classList.add('ad-tl-chronology-card');
     if(slot.laneCount>1)tile.append($('span','ad-tl-parallel-label','Параллельно'));
     if(slot.start<axisStart||slot.end>axisEnd)tile.append($('span','ad-tl-outside-label','Вне заданных часов'));
     row.append(time,tile);list.append(row);
   }
   return container;
 }
 function render(){
   host.replaceChildren();
   host.classList.add('ad-timeline-page');
   const header=$('header','ad-tl-header admin-page-heading'),intro=$('div');
   intro.append($('h1','','Программа мероприятия'));
   const commands=$('div','ad-tl-top-actions');
   const actionLabel='+ '+(view==='program'?'Активность':'Идея');
   const addActivity=()=>openCard(null,{stage:view});
   commands.append(makeButton(actionLabel,addActivity,'ad-tl-primary'));
   const mobileActions=document.querySelector('.admin-mobile-actions');
   if(mobileActions&&host.isConnected&&mobileActions.closest('[data-admin-section="schedule"]')){
     const mobileAdd=makeButton(actionLabel,addActivity,'admin-mobile-primary');mobileActions.replaceChildren(mobileAdd);
   }
   header.append(intro,commands);host.append(header);
   // One compact navigation row: the date is primary, the program/idea
   // selector is secondary, and both remain visible without tall stacked bars.
   const sectionControls=$('div','ad-tl-section-controls');
   const daysBar=$('nav','ad-tl-day-nav');
   daysBar.setAttribute('aria-label','Выбор дня свадьбы');
   for(const d of days){
     const b=makeButton(d.date.slice(-2),()=>{
       day=d.date;filter='all';notification='';render();
     },'ad-tl-day-tab'+(day===d.date?' is-active':''));
     b.setAttribute('aria-label',d.label);b.append($('small','ad-tl-weekday',d.weekday.slice(0,2).toLowerCase()));
     b.setAttribute('aria-pressed',String(day===d.date));
     daysBar.append(b);
   }
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
   sectionControls.append(daysBar,nav);
   host.append(sectionControls);
   if(notification){
     showAdminToast(notification,{
       kind:/^(Не удалось|Время выходит|Ошибка)/.test(notification)?'error':'success'
     });
     notification='';
   }
   const current=entriesFor(view);
   const compactTools=$('div','ad-tl-compact-tools');
   if(tags.length){
     const filters=$('div','ad-tl-tag-filters');filters.setAttribute('aria-label','Фильтр по тегу');
     const all=makeButton('Все теги',()=>{filter='all';render();},'ad-tl-filter'+(filter==='all'?' selected':''));
     all.setAttribute('aria-pressed',String(filter==='all'));filters.append(all);
     for(const tag of tags){
       const b=makeButton(tag.label,()=>{filter=tag.id;render();},'ad-tl-filter'+(filter===tag.id?' selected':''));
       b.style.setProperty('--tag-color',tagColor(tag));b.setAttribute('aria-pressed',String(filter===tag.id));filters.append(b);
     }
     compactTools.append(filters);
     const tagSelect=$('select','ad-tl-mobile-tag-select');tagSelect.setAttribute('aria-label','Фильтр по тегу');
     for(const [id,label] of [['all','Все теги'],...tags.map(t=>[t.id,t.label])]){const option=$('option','',label);option.value=id;tagSelect.append(option)}
     tagSelect.value=filter;tagSelect.addEventListener('change',()=>{filter=tagSelect.value;render()});compactTools.append(tagSelect);
   }
   const visibleRows=current.filter(visible);
   if(view==='program'){
     const modes=$('div','ad-tl-display-modes');
     modes.setAttribute('role','group');
     modes.setAttribute('aria-label','Вид программы');
     for(const [mode,label] of [['timeline','Таймлайн'],['list','Список']]){
       const btn=makeButton(label,()=>{
         programDisplay=mode;render();
       },'ad-tl-display-option'+(programDisplay===mode?' is-active':''));
       btn.setAttribute('aria-pressed',String(programDisplay===mode));
       modes.append(btn);
     }
     compactTools.append(modes);
   }
   if(compactTools.childElementCount)host.append(compactTools);
   if(view==='program'){
     if(programDisplay==='timeline')host.append(renderTimeline(visibleRows));
     else{
       const list=$('div','ad-tl-single-content ad-tl-ideas-grid ad-tl-program-list');
       if(!visibleRows.length)list.append($('div','ad-tl-empty','Для этого дня программа пока не составлена.'));
       else for(const item of visibleRows)list.append(card(item,current));
       host.append(list);
     }
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
   const form=$('form','ad-tl-form');
   form.id='ad-tl-card-editor';
   // The title itself is the input. No second "Название" field.
   const name=$('textarea','ad-tl-editor-title-input');
   name.value=item?.title||'';
   name.rows=1;name.required=true;name.maxLength=220;
   name.placeholder=view==='idea'?'Новая идея':'Новая активность';
   name.setAttribute('aria-label','Название активности');
   name.setAttribute('form',form.id);
   const resizeTitle=()=>{
     name.style.height='auto';
     name.style.height=Math.max(48,name.scrollHeight)+'px';
   };
   name.addEventListener('input',resizeTitle);
   name.addEventListener('keydown',event=>{
     if(event.key==='Enter'){event.preventDefault();name.blur();}
   });
   const pencil=makeButton('✎',()=>name.focus({preventScroll:true}),'ad-tl-editor-pencil');
   pencil.setAttribute('aria-label','Изменить название');
   const headingWrap=$('div','ad-tl-editor-heading');
   headingWrap.append(name,pencil);
   const title=$('div','ad-tl-modal-head');
   title.append(headingWrap,makeButton('Закрыть',()=>shade.remove(),'ad-tl-secondary'));
   modal.append(title);
   const description=$('textarea');description.value=item?.notes||'';description.rows=3;description.maxLength=3000;
   const durationInput=$('input');durationInput.type='number';durationInput.step='1';
   durationInput.min='5';durationInput.max='600';durationInput.value=String(duration(item));
   const placement=$('input');
   placement.type='checkbox';
   placement.checked=prefs.stage==='program'||(!prefs.stage&&Boolean(item&&scheduled(item)));
   placement.setAttribute('role','switch');
   const switchCaption=enabled=>enabled?'Включено в программу':'Включить в программу';
   placement.setAttribute('aria-label',switchCaption(placement.checked));
   const statusLabel=$('label','ad-tl-placement-toggle');
   const track=$('span','ad-tl-switch-track');
   track.setAttribute('aria-hidden','true');
   const stateText=$('span','ad-tl-switch-state',switchCaption(placement.checked));
   statusLabel.append(placement,track,stateText);
   const placementField=$('div','ad-tl-placement-field');
   placementField.append(statusLabel);
   const start=$('input');start.type='time';start.value=hm(item?.start_at);
   const end=$('input');end.type='time';
   end.value=hm(item?.end_at)||(mins(start.value)!==null&&mins(start.value)+duration(item)<1440
     ?clock(mins(start.value)+duration(item)):'');
   const startField=field('Начало',start),endField=field('Окончание',end);
   const timeRow=$('div','ad-tl-time-row');
   timeRow.append(startField,endField);
   function updateVisible(){
     const enabled=placement.checked;
     timeRow.classList.toggle('is-inactive',!enabled);
     timeRow.setAttribute('aria-hidden',String(!enabled));
     stateText.textContent=switchCaption(enabled);
     placement.setAttribute('aria-label',switchCaption(enabled));
     start.required=enabled;end.required=enabled;
     start.disabled=!enabled;end.disabled=!enabled;
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
   start.addEventListener('change',fromStartOrDuration);
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
     chip.style.setProperty('--tag-color',tagColor(tag));
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
   form.append(field('Описание',description),field('Длительность, минут',durationInput),tagsField,
     placementField,timeRow);
   const feedback=$('p','ad-tl-form-error');feedback.setAttribute('role','alert');
   const buttons=$('div','ad-tl-modal-actions');
   const save=$('button','ad-tl-button ad-tl-primary','Сохранить');save.type='submit';
   buttons.append(save);
   if(item)buttons.append(makeButton('Удалить',()=>removeItem(item),'ad-tl-muted ad-tl-delete'));
   buttons.append(makeButton('Отмена',()=>shade.remove(),'ad-tl-secondary'));
   form.append(buttons,feedback);modal.append(form);shade.append(modal);host.append(shade);
   updateVisible();
   requestAnimationFrame(()=>{if(name.isConnected)resizeTitle()});
   if(!item)name.focus({preventScroll:true});
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
       duration_min:n,tags_json:JSON.stringify(checked),
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
 await load();
 const route=location.hash.split('/');
 if(days.some(d=>d.date===route[3]))day=route[3];
 if(route[4]==='ideas')view='idea';
 render();
 if(route[5]&&['event','ideas'].includes(route[4])){const target=entries.find(e=>String(e.id)===decodeURIComponent(route[5])&&assignedDay(e)===day);if(target)openCard(target)}
}
