// Wedding admin: separate per-day ideas and timed program; same private SQLite source.
const BASE_TYPES=[
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
const scheduled=entry=>entry?.stage==='program'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(entry.start_at||'');
const assignedDay=entry=>entry?.activity_date||String(entry?.start_at||'').slice(0,10)||'2027-06-19';
const itemTags=item=>{
 try{const tags=JSON.parse(item?.tags_json||'[]');return Array.isArray(tags)?tags.filter(x=>typeof x==='string'):[]}
 catch{return []}
};
const typeColor=type=>/^#[0-9a-fA-F]{6}$/.test(type?.color||'')?type.color:'#E8EBE8';
const safeTypes=(saved,fallback)=>Array.isArray(saved)&&saved.length?saved.map(x=>({...x})):fallback.map(x=>({...x}));

export async function renderWeddingProgram(host,api,days){
 let entries=[],types=BASE_TYPES.map(t=>({...t})),tags=[],day='2027-06-19',view='program';
 let filter='all',notification='',busy=false,dragged='';
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
 const order=()=>entriesFor('program');
 async function moveInTimeline(id,beforeId){
   if(busy)return;
   const rows=order(),source=rows.find(e=>e.id===id);
   if(!source)return;
   const ids=rows.map(e=>e.id).filter(x=>x!==id);
   const index=beforeId===null?ids.length:ids.indexOf(beforeId);
   ids.splice(index<0?ids.length:index,0,id);
   if(ids.join('|')===rows.map(x=>x.id).join('|'))return;
   const start=hm(rows[0].start_at);
   if(!start)return;
   busy=true;
   try{
     await api('admin/schedule/arrange',{method:'POST',body:{day,ids,start_time:start}});
     await reload('Порядок и время обновлены.');
   }catch(error){await reload('Не удалось переставить: '+error.message);}
   finally{busy=false}
 }
 async function removeItem(item){
   if(busy||!confirm('Удалить активность «'+item.title+'»? Это действие нельзя отменить.'))return;
   busy=true;
   try{
     await api('admin/schedule/delete',{method:'POST',body:{id:item.id}});
     await reload('Активность удалена.');
   }catch(err){await reload('Не удалось удалить: '+err.message);}
   finally{busy=false}
 }
 function card(item,rows){
   const cat=typesOf(item),node=$('article','ad-tl-card ad-tl-card-clickable');
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
     node.draggable=true;
     node.addEventListener('dragstart',e=>{
       dragged=item.id;e.dataTransfer.effectAllowed='move';
       e.dataTransfer.setData('text/plain',item.id);node.classList.add('ad-tl-dragging');
     });
     node.addEventListener('dragend',()=>{dragged='';node.classList.remove('ad-tl-dragging');});
     node.addEventListener('dragover',e=>{e.preventDefault();node.classList.add('ad-tl-over')});
     node.addEventListener('dragleave',()=>node.classList.remove('ad-tl-over'));
     node.addEventListener('drop',e=>{
       e.preventDefault();e.stopPropagation();node.classList.remove('ad-tl-over');
       const id=dragged||e.dataTransfer.getData('text/plain');
       if(id&&id!==item.id)moveInTimeline(id,item.id);
     });
     const from=hm(item.start_at);
     const until=hm(item.end_at)||(mins(from)!==null?clock(Math.min(1439,mins(from)+duration(item))):'—');
     node.append($('div','ad-tl-clock',from+' — '+until));
   }
   const meta=$('div','ad-tl-card-eyebrow');
   meta.append($('span','ad-tl-type',cat?.label||'Другое'),$('span','ad-tl-length',duration(item)+' мин'));
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
   if(view==='program'){
     const actions=$('div','ad-tl-card-actions');
     const index=rows.findIndex(x=>x.id===item.id);
     if(index>0){
       const up=makeButton('↑',e=>{e.stopPropagation();moveInTimeline(item.id,rows[index-1].id)},'ad-tl-icon');
       up.setAttribute('aria-label','Поднять активность');actions.append(up);
     }
     if(index<rows.length-1){
       const down=makeButton('↓',e=>{e.stopPropagation();
         moveInTimeline(item.id,rows[index+2]?.id||null)},'ad-tl-icon');
       down.setAttribute('aria-label','Опустить активность');actions.append(down);
     }
     if(actions.childElementCount)node.append(actions);
   }else{
     const hint=$('span','ad-tl-card-hint','Нажмите, чтобы изменить или включить в программу');
     node.append(hint);
   }
   return node;
 }
 function render(){
   host.replaceChildren();
   host.classList.add('ad-timeline-page');
   const header=$('header','ad-tl-header'),intro=$('div');
   intro.append($('span','ad-tl-kicker','СВАДЬБА · СЦЕНАРИЙ'),$('h1','','Программа мероприятия'),
     $('p','','У каждого дня — собственные идеи и расписание. Нажмите на карточку, чтобы изменить её.'));
   const commands=$('div','ad-tl-top-actions');
   commands.append(makeButton('+ '+(view==='program'?'Активность':'Идея'),
     ()=>openCard(null,{stage:view}),'ad-tl-primary'),
     makeButton('Категории и теги',openTaxonomy,'ad-tl-secondary'));
   header.append(intro,commands);host.append(header);
   const nav=$('nav','ad-tl-main-switch');nav.setAttribute('aria-label','Идеи или программа');
   for(const [id,label,desc] of [
     ['program','Программа','Таймлайн'],
     ['idea','Пул идей','Без назначенного времени']]){
     const count=entries.filter(e=>(id==='program'?scheduled(e):!scheduled(e))&&assignedDay(e)===day).length;
     const button=makeButton(label+' · '+count,()=>{view=id;filter='all';notification='';render();},'ad-tl-main-tab'+(view===id?' is-active':''));
     button.setAttribute('aria-pressed',String(view===id));button.title=desc;nav.append(button);
   }
   host.append(nav);
   const daysBar=$('div','ad-tl-day-nav');
   for(const d of days){
     const b=makeButton(d.label,()=>{day=d.date;filter='all';notification='';render();},'ad-tl-day-tab'+(day===d.date?' is-active':''));
     b.setAttribute('aria-pressed',String(day===d.date));
     daysBar.append(b);
   }
   host.append(daysBar);
   if(notification){const n=$('p','ad-tl-notice',notification);n.setAttribute('role','status');host.append(n);}
   const current=entriesFor(view);
   const toolbar=$('div','ad-tl-section-toolbar'),heading=$('div','ad-tl-section-heading');
   heading.append($('h2','',view==='program'?'Программа · '+dateName(day):'Идеи · '+dateName(day)));
   heading.append($('span','ad-tl-help',view==='program'
     ?'Перетаскивайте карточки для изменения порядка. Время пересчитывается автоматически.'
     :'Идеи принадлежат выбранному дню и не имеют времени начала или окончания.'));
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
   const content=$('div','ad-tl-single-content'+(view==='idea'?' ad-tl-ideas-grid':' ad-tl-track'));
   const visibleRows=current.filter(visible);
   if(view==='program'){
     content.addEventListener('dragover',event=>event.preventDefault());
     content.addEventListener('drop',event=>{
       if(event.target.closest('.ad-tl-card'))return;
       event.preventDefault();
       if(dragged)moveInTimeline(dragged,null);
     });
   }
   if(!visibleRows.length)content.append($('div','ad-tl-empty',
      filter!=='all'?'В этом дне нет карточек с выбранным тегом.'
      :view==='idea'?'Для этого дня идей пока нет. Добавьте первую.'
      :'Для этого дня программа пока не составлена.'));
   else for(const item of visibleRows)content.append(card(item,current));
   host.append(content);
   if(view==='program'&&current.length){
     const timeline=[...current].sort((a,b)=>String(a.start_at).localeCompare(String(b.start_at)));
     const overlap=timeline.some((e,i)=>i>0&&String(e.start_at)<String(timeline[i-1].end_at||''));
     if(overlap)host.append($('p','ad-tl-warning','В расписании есть наложения. Нажмите на карточку и исправьте время.'));
     const start=hm(timeline[0].start_at),end=hm(timeline[timeline.length-1].end_at);
     const sum=$('p','ad-tl-timeline-foot',(start||'—')+' — '+(end||'—')+
       ' · '+current.reduce((n,x)=>n+duration(x),0)+' минут активностей');
     host.append(sum);
   }
 }
 function openCard(item=null,prefs={}){
   host.querySelector('.ad-tl-modal-cover')?.remove();
   const shade=$('div','ad-tl-modal-cover'),modal=$('section','ad-tl-modal');
   modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
   modal.setAttribute('aria-label','Редактирование активности');
   const title=$('div','ad-tl-modal-head');
   title.append($('h2','',item?'Карточка активности':view==='idea'?'Новая идея':'Новая активность'),
     makeButton('Закрыть',()=>shade.remove(),'ad-tl-secondary'));modal.append(title);
   const form=$('form','ad-tl-form');
   const name=$('input');name.value=item?.title||'';name.required=true;name.maxLength=220;
   const description=$('textarea');description.value=item?.notes||'';description.rows=3;description.maxLength=3000;
   const category=$('select');
   for(const type of types){const opt=$('option','',type.label);opt.value=type.id;category.append(opt)}
   if(types.some(t=>t.id===item?.activity_type))category.value=item.activity_type;
   else category.value=types.find(t=>t.id==='other')?.id||types[0]?.id||'other';
   const durationInput=$('input');durationInput.type='number';durationInput.step='1';
   durationInput.min='5';durationInput.max='600';durationInput.value=String(duration(item));
   const targetDay=$('select');
   for(const d of days){const option=$('option','',d.label);option.value=d.date;targetDay.append(option)}
   targetDay.value=item?assignedDay(item):day;
   const placement=$('select');
   for(const [id,label] of [['idea','Пул идей'],['program','В программе']]){
     const option=$('option','',label);option.value=id;placement.append(option)
   }
   placement.value=prefs.stage||(item&&scheduled(item)?'program':'idea');
   const start=$('input');start.type='time';start.value=hm(item?.start_at);
   const end=$('input');end.type='time';
   end.value=hm(item?.end_at)||(mins(start.value)!==null&&mins(start.value)+duration(item)<1440
     ?clock(mins(start.value)+duration(item)):'');
   const startField=field('Начало',start),endField=field('Окончание',end);
   const timeHint=$('p','ad-tl-end-preview','');
   function updateVisible(){
     const enabled=placement.value==='program';
     startField.hidden=!enabled;endField.hidden=!enabled;
     start.required=enabled;end.required=enabled;
     timeHint.textContent=enabled?'Время начала и окончания можно менять. Длительность синхронизируется автоматически.'
       :'У идеи есть длительность, но нет назначенного времени.';
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
   const tagBox=$('div','ad-tl-tag-checkboxes');const selected=new Set(itemTags(item));
   for(const tag of tags){
     const check=$('input');check.type='checkbox';check.value=tag.id;check.checked=selected.has(tag.id);
     const chip=field(tag.label,check);chip.classList.add('ad-tl-check-chip');
     chip.style.setProperty('--tag-color',typeColor(tag));tagBox.append(chip);
   }
   const tagsField=$('div','ad-tl-tags-field');
   tagsField.append($('span','ad-tl-form-label','Теги'));
   if(tags.length)tagsField.append(tagBox);
   else tagsField.append($('p','ad-tl-help','Теги пока не созданы.'));
   tagsField.append(makeButton('Управлять тегами',()=>{shade.remove();openTaxonomy('tags')},'ad-tl-text-button'));
   form.append(field('Название',name),field('Описание',description),field('Категория',category),
     field('Длительность, минут',durationInput),tagsField,
     field('День мероприятия',targetDay),field('Раздел',placement),
     startField,endField,timeHint);
   const feedback=$('p','ad-tl-form-error');feedback.setAttribute('role','alert');
   const buttons=$('div','ad-tl-modal-actions');
   const save=$('button','ad-tl-button ad-tl-primary','Сохранить');save.type='submit';
   buttons.append(save);
   if(item)buttons.append(makeButton('Удалить',()=>removeItem(item).then(()=>shade.remove()),'ad-tl-muted ad-tl-delete'));
   buttons.append(makeButton('Отмена',()=>shade.remove(),'ad-tl-secondary'));
   form.append(buttons,feedback);modal.append(form);shade.append(modal);host.append(shade);
   updateVisible();name.focus({preventScroll:true});
   form.addEventListener('submit',async event=>{
     event.preventDefault();if(busy)return;
     const startN=mins(start.value),endN=mins(end.value);
     const n=Number(durationInput.value),isProgram=placement.value==='program';
     if(!name.value.trim()){feedback.textContent='Укажите название активности.';return}
     if(!Number.isInteger(n)||n<5||n>600){feedback.textContent='Длительность должна составлять 5–600 минут.';return}
     if(isProgram&&(startN===null||endN===null||endN<=startN||endN-startN!==n)){
       feedback.textContent='Проверьте начало, окончание и длительность активности.';return;
     }
     if(isProgram&&endN>=1440){feedback.textContent='Событие должно завершиться до полуночи.';return}
     const chosenDay=targetDay.value;
     if(isProgram){
       const conflict=entries.find(x=>x.id!==item?.id&&scheduled(x)&&assignedDay(x)===chosenDay&&
         startN<mins(hm(x.end_at)||clock(Math.min(1439,mins(hm(x.start_at))+duration(x))))&&
         endN>mins(hm(x.start_at)));
       if(conflict){feedback.textContent='Время пересекается с «'+conflict.title+'». Исправьте расписание.';return}
     }
     const checked=[...tagBox.querySelectorAll('input:checked')].map(x=>x.value);
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
       day=chosenDay;view=isProgram?'program':'idea';filter='all';
       shade.remove();await reload('Карточка сохранена.');
     }catch(error){feedback.textContent=error.message||'Не удалось сохранить.';}
     finally{busy=false;save.disabled=false}
   });
 }
 function openTaxonomy(initial='types'){
   host.querySelector('.ad-tl-modal-cover')?.remove();
   let part=initial==='tags'?'tags':'types';
   let newTypes=types.map(x=>({...x})),newTags=tags.map(x=>({...x}));
   const shade=$('div','ad-tl-modal-cover'),modal=$('section','ad-tl-modal ad-tl-settings-modal');
   modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
   modal.setAttribute('aria-label','Управление категориями и тегами');
   const title=$('div','ad-tl-modal-head');
   title.append($('h2','','Категории и теги'),makeButton('Закрыть',()=>shade.remove(),'ad-tl-secondary'));modal.append(title);
   const tabs=$('div','ad-tl-settings-tabs'),list=$('div','ad-tl-settings-list');
   const error=$('p','ad-tl-form-error');error.setAttribute('role','alert');
   const footer=$('div','ad-tl-modal-actions');
   const preview=()=>{
     list.replaceChildren();tabs.replaceChildren();error.textContent='';
     for(const [id,label] of [['types','Категории'],['tags','Теги']]){
       tabs.append(makeButton(label,()=>{part=id;preview()},'ad-tl-main-tab'+(part===id?' is-active':'')));
     }
     const data=part==='types'?newTypes:newTags;
     list.append($('p','ad-tl-help',part==='types'
        ?'Категория определяет основной цвет карточки. Здесь можно менять её название и цвет.'
        :'Тегов у одной карточки может быть несколько. Они отображаются на карточках и используются для фильтрации.'));
     for(const entry of data){
       const row=$('div','ad-tl-settings-row');
       const name=$('input');name.value=entry.label;name.maxLength=60;
       name.setAttribute('aria-label','Название');
       name.addEventListener('input',()=>{entry.label=name.value});
       const color=$('input');color.type='color';color.value=typeColor(entry);
       color.setAttribute('aria-label','Цвет');
       color.addEventListener('input',()=>{entry.color=color.value});
       row.append(name,color,makeButton('Удалить',()=>{
         const used=entries.some(x=>part==='types'?x.activity_type===entry.id:itemTags(x).includes(entry.id));
         if(used){error.textContent='Этот '+(part==='types'?'тип':'тег')+' используется в карточках. Сначала измените карточки.';return}
         const listToEdit=part==='types'?newTypes:newTags;
         listToEdit.splice(listToEdit.indexOf(entry),1);preview();
       },'ad-tl-muted'));
       list.append(row);
     }
     if(!data.length)list.append($('p','ad-tl-empty','Пока ничего нет.'));
   };
   preview();
   footer.append(makeButton('+ Добавить '+(part==='types'?'категорию':'тег'),()=>{
      const arr=part==='types'?newTypes:newTags;
      if(arr.length>=30){error.textContent='Не более 30 записей.';return}
      const id=(part==='types'?'category_':'tag_')+(Date.now().toString(36))+'_'+arr.length;
      arr.push({id,label:part==='types'?'Новая категория':'Новый тег',color:'#DDE9DF'});
      preview();
   },'ad-tl-secondary'));
   // The Add button follows the selected management tab.
   const add=footer.querySelector('button');
   const originalAdd=add;originalAdd.addEventListener('click',()=>{});
   footer.append(makeButton('Сохранить',async()=>{
     if(!newTypes.length){error.textContent='Добавьте хотя бы одну категорию.';return}
     if([...newTypes,...newTags].some(x=>!x.label.trim())){
       error.textContent='Название не может быть пустым.';return;
     }
     if(busy)return;busy=true;
     try{
       await api('admin/settings',{method:'POST',body:{key:'activity_types',value:newTypes}});
       await api('admin/settings',{method:'POST',body:{key:'activity_tags',value:newTags}});
       shade.remove();await reload('Категории и теги сохранены.');
     }catch(err){error.textContent='Не удалось сохранить: '+err.message}
     finally{busy=false}
   },'ad-tl-primary'));
   modal.append(tabs,list,error,footer);shade.append(modal);host.append(shade);
 }
 await load();render();
}
