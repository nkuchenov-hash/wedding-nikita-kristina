import {itemTags,DEFAULT_DAY_HOURS,displayHoursForDay} from './admin-program.js';
const $=(tag,cls='',value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
const button=(label,fn,cls='')=>{const e=$('button','ad-tl-button '+cls,label);e.type='button';e.addEventListener('click',fn);return e};
const color=value=>/^#[0-9a-fA-F]{6}$/.test(value||'')?value:'#DDE9DF';

export async function renderWeddingSettings(host,api){
 const [settings,records]=await Promise.all([api('admin/settings'),api('admin/records?collection=schedule_items')]);
 const tags=Array.isArray(settings.settings?.activity_tags)?settings.settings.activity_tags.map(x=>({...x})):[];
 const used=id=>(records.items||[]).some(item=>itemTags(item).includes(id));
 let saving=false;
 const header=$('header','ad-tl-settings-head');
 header.append($('h1','','Настройки'),$('p','','Общие теги для программы и пула идей.'));
 const panel=$('section','ad-tl-settings-content');
 panel.append($('h2','','Теги активностей'),$('p','ad-tl-settings-help','Теги объединяют классификацию и цвета карточек. У активности может быть несколько тегов.'));
 const list=$('div','ad-tl-settings-list'),actions=$('div','ad-tl-modal-actions');
 const dayHours={};
 for(const date of Object.keys(DEFAULT_DAY_HOURS))
   dayHours[date]=displayHoursForDay(date,settings.settings?.program_day_hours);
 const message=$('p','ad-tl-form-error');message.setAttribute('role','status');
 panel.append(list,actions);
 host.classList.add('ad-timeline-page','ad-global-settings-page');
 host.replaceChildren(header,panel,message);
 const hoursPanel=$('section','ad-tl-settings-content ad-tl-hours-panel');
 hoursPanel.append($('h2','','Часы отображения программы'));
 const hoursHelp=$('p','ad-tl-settings-help','У каждого дня свой временной диапазон таймлайна. Мероприятия за его пределами сохраняются в базе и доступны в режиме списка.');
 hoursPanel.append(hoursHelp);
 const hoursGrid=$('div','ad-tl-hours-grid');
 const values=new Map();
 for(const [date,label] of [['2027-06-17','17 июня'],['2027-06-18','18 июня'],['2027-06-19','19 июня']]){
   const row=$('div','ad-tl-hours-row'),dayLabel=$('strong','ad-tl-hours-day',label);
   const from=$('input');from.type='time';from.value=dayHours[date].from;from.step=300;
   const to=$('input');to.type='time';to.value=dayHours[date].to;to.step=300;
   from.setAttribute('aria-label',label+' — начало отображения');
   to.setAttribute('aria-label',label+' — конец отображения');
   const makeField=(label,input)=>{
     const field=$('label','ad-tl-hours-field');
     field.append($('span','',label),input);return field;
   };
   row.append(dayLabel,makeField('С',from),makeField('До',to));
   hoursGrid.append(row);values.set(date,{from,to});
 }
 hoursPanel.append(hoursGrid);
 const hourActions=$('div','ad-tl-modal-actions');
 const hourStatus=$('p','ad-tl-form-error');
 hourStatus.setAttribute('role','status');
 const saveHours=button('Сохранить часы',async()=>{
   if(saving)return;
   const value={};
   for(const [date,controls] of values){
     const from=controls.from.value,to=controls.to.value;
     const valid=displayHoursForDay(date,{[date]:{from,to}});
     if(!from||!to||valid.from!==from||valid.to!==to){
       hourStatus.textContent='Для каждого дня задайте корректный диапазон не короче одного часа.';
       return;
     }
     value[date]={from,to};
   }
   saving=true;saveHours.disabled=true;
   try{
     await api('admin/settings',{method:'POST',body:{key:'program_day_hours',value}});
     hourStatus.textContent='Интервалы сохранены. Они применятся к таймлайну при открытии программы.';
     hourStatus.classList.add('ad-tl-setting-success');
   }catch(error){
     hourStatus.classList.remove('ad-tl-setting-success');
     hourStatus.textContent=error.message||'Не удалось сохранить часы.';
   }finally{saving=false;saveHours.disabled=false}
 },'ad-tl-primary');
 hourActions.append(saveHours);
 hoursPanel.append(hourActions,hourStatus);
 host.append(hoursPanel);
 function draw(){
   list.replaceChildren();actions.replaceChildren();
   for(const tag of tags){
     const row=$('div','ad-tl-settings-row');
     const name=$('input');name.type='text';name.maxLength=60;name.value=tag.label;
     name.setAttribute('aria-label','Название тега');
     name.addEventListener('input',()=>tag.label=name.value);
     const paint=$('input');paint.type='color';paint.value=color(tag.color);
     paint.setAttribute('aria-label','Цвет тега');
     paint.addEventListener('input',()=>tag.color=paint.value);
     const remove=button('Удалить',()=>{
       if(used(tag.id)){message.textContent='Тег используется в карточках.';return}
       tags.splice(tags.indexOf(tag),1);draw();
     },'ad-tl-muted');
     remove.disabled=used(tag.id);
     if(remove.disabled)remove.title='Сначала снимите тег с карточек';
     row.append(name,paint,remove);list.append(row);
   }
   if(!tags.length)list.append($('p','ad-tl-settings-help','Тегов пока нет.'));
   actions.append(button('+ Добавить тег',()=>{
     if(tags.length>=30){message.textContent='Не более 30 тегов.';return}
     let id,n=0;
     do{id='tag_'+Date.now().toString(36)+'_'+(n++).toString(36)}while(tags.some(x=>x.id===id));
     tags.push({id,label:'Новый тег',color:'#DDE9DF'});message.textContent='';draw();
     list.lastElementChild?.querySelector('input[type=text]')?.focus();
   },'ad-tl-secondary'));
   const save=button('Сохранить',async()=>{
     if(saving)return;
     if(tags.some(x=>!x.label.trim()||x.label.length>60)){message.textContent='Заполните названия тегов.';return}
     saving=true;save.disabled=true;
     try{
       await api('admin/settings',{method:'POST',body:{key:'activity_tags',
         value:tags.map(x=>({id:x.id,label:x.label.trim(),color:color(x.color)}))}});
       message.textContent='Теги сохранены. Цвета карточек обновлены в базе.';
       message.classList.add('ad-tl-setting-success');
     }catch(err){message.classList.remove('ad-tl-setting-success');message.textContent=err.message||'Ошибка сохранения'}
     finally{saving=false;save.disabled=false}
   },'ad-tl-primary');
   actions.append(save);
 }
 draw();
}
