import {showAdminToast} from './admin-toast.js';
import {itemTags,DEFAULT_DAY_HOURS,displayHoursForDay} from './admin-program.js';
import {GUEST_TABLE_FIELDS,DEFAULT_GUEST_TABLE_COLUMNS,normalizeGuestTableColumns,DEFAULT_GUEST_TABLE_LAYOUT,normalizeGuestTableLayout} from './admin-guests.js';
const $=(tag,cls='',value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
const button=(label,fn,cls='')=>{const e=$('button','ad-tl-button '+cls,label);e.type='button';e.addEventListener('click',fn);return e};
const color=value=>/^#[0-9a-fA-F]{6}$/.test(value||'')?value:'#DDE9DF';

export async function renderWeddingSettings(host,api){
 const [settings,records]=await Promise.all([api('admin/settings'),api('admin/records?collection=schedule_items')]);
 const tags=Array.isArray(settings.settings?.activity_tags)?settings.settings.activity_tags.map(x=>({...x})):[];
 const used=id=>(records.items||[]).some(item=>itemTags(item).includes(id));
 let saving=false;
 const header=$('header','ad-tl-settings-head admin-page-heading');
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
 for(const [date,label] of [['2027-06-17','17 июня'],['2027-06-18','18 июня'],['2027-06-19','19 июня'],['2027-06-20','20 июня'],['2027-06-21','21 июня']]){
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
     showAdminToast('Интервалы часов сохранены.');
   }catch(error){
     showAdminToast(error.message||'Не удалось сохранить часы.',{kind:'error'});
   }finally{saving=false;saveHours.disabled=false}
 },'ad-tl-primary');
 hourActions.append(saveHours);
 hoursPanel.append(hourActions,hourStatus);
 host.append(hoursPanel);
 // Guest roster display is a real server setting, shared with the icon in the roster.
 const guestPanel=$('section','ad-tl-settings-content ad-gb-global-settings');
 guestPanel.append($('h2','','Гости · отображение таблицы'),
   $('p','ad-tl-settings-help','Выберите столбцы и их порядок. Имя гостя остаётся первым, остальные поля можно скрыть или переставить.'));
 const groupMode=$('div','ad-gb-global-sort-mode');
 const groupLabel=$('label','ad-gb-global-children-choice');
 const groupCheck=$('input');groupCheck.type='checkbox';
 groupCheck.checked=settings.settings?.guest_sort_mode==='connections';
 groupLabel.append(groupCheck,$('span','','Расположить гостей по семьям, связям и кругам общения'));
 const groupResult=$('span','ad-gb-feedback');groupResult.setAttribute('role','status');
 groupCheck.addEventListener('change',async()=>{
   const checked=groupCheck.checked;groupCheck.disabled=true;groupResult.textContent='';
   try{
     await api('admin/settings',{method:'POST',body:{key:'guest_sort_mode',
       value:checked?'connections':'alphabetical'}});
     showAdminToast('Настройка группировки гостей сохранена.');
   }catch(error){groupCheck.checked=!checked;showAdminToast(error.message||'Ошибка сохранения',{kind:'error'})}
   finally{groupCheck.disabled=false}
 });
 groupMode.append(groupLabel,groupResult);guestPanel.append(groupMode);
 // These are shared with the icon settings in the guest list; only SQLite stores them.
 const layoutPanel=$('div','ad-gb-global-layout');
 const currentLayout=normalizeGuestTableLayout(settings.settings?.guest_table_layout);
 let guestLayout={...currentLayout,widths:{...currentLayout.widths}},savingLayout=false;
 const heightLabel=$('label','','Высота строк');
 const heightSelect=$('select');
 for(const [size,caption] of [['56','Компактные — 56 px'],['72','Стандартные — 72 px'],
   ['96','Увеличенные — 96 px'],['128','Большие — 128 px'],
   ['0','Автоматическая, по тексту']]){
   const option=$('option','',caption);option.value=size;heightSelect.append(option);
 }
 heightSelect.value=String(guestLayout.row_height);
 heightLabel.append(heightSelect);
 const textLabel=$('label','ad-gb-menu-wrap-choice');
 const textToggle=$('input');textToggle.type='checkbox';textToggle.checked=guestLayout.truncate;
 textLabel.append(textToggle,$('span','','Обрезать текст по высоте строки (полный текст — при наведении)'));
 const saveLayout=async()=>{
   if(savingLayout)return;
   const updated=normalizeGuestTableLayout({...guestLayout,
     row_height:Number(heightSelect.value),truncate:textToggle.checked});
   const previous=guestLayout;guestLayout=updated;
   savingLayout=true;heightSelect.disabled=textToggle.disabled=true;
   try{
     await api('admin/settings',{method:'POST',body:{key:'guest_table_layout',value:updated}});
     showAdminToast('Размеры строк и отображение текста сохранены.');
   }catch(error){
     guestLayout=previous;heightSelect.value=String(previous.row_height);
     textToggle.checked=previous.truncate;
     showAdminToast(error.message||'Не удалось сохранить вид таблицы',{kind:'error'});
   }finally{savingLayout=false;heightSelect.disabled=textToggle.disabled=false}
 };
 heightSelect.addEventListener('change',saveLayout);
 textToggle.addEventListener('change',saveLayout);
 layoutPanel.append(heightLabel,textLabel,
   $('p','','Ширину любого столбца можно изменить перетаскиванием его правой границы прямо в списке гостей. Ширина сохранится автоматически.'));
 guestPanel.append(layoutPanel);
 const guestRows=$('div','ad-gb-global-settings-list');
 let chosen=normalizeGuestTableColumns(settings.settings?.guest_table_columns);
 let savingGuests=false;
 const guestActions=$('div','ad-tl-modal-actions');
 const guestNotice=$('p','ad-tl-form-error');guestNotice.setAttribute('role','status');
 const saveGuest=button('Сохранить столбцы',async()=>{
   if(savingGuests)return;
   savingGuests=true;saveGuest.disabled=true;
   try{
     await api('admin/settings',{method:'POST',body:{key:'guest_table_columns',value:chosen}});
     showAdminToast('Столбцы списка гостей сохранены.');
   }catch(err){
     showAdminToast(err.message||'Не удалось сохранить столбцы',{kind:'error'});
   }finally{savingGuests=false;saveGuest.disabled=false}
 },'ad-tl-primary');
 const resetGuest=button('Сбросить',()=>{chosen=[...DEFAULT_GUEST_TABLE_COLUMNS];drawGuestRows()},'ad-tl-muted');
 guestActions.append(resetGuest,saveGuest);
 function drawGuestRows(){
   guestRows.replaceChildren();
   for(const [key,label] of GUEST_TABLE_FIELDS){
     const line=$('div','ad-gb-global-setting-row');
     const control=$('label','ad-gb-global-setting-choice');
     const check=$('input');check.type='checkbox';check.checked=chosen.includes(key);
     check.disabled=key==='display_name';
     check.addEventListener('change',()=>{
       chosen=normalizeGuestTableColumns(check.checked?[...chosen,key]:chosen.filter(item=>item!==key));
       drawGuestRows();
     });
     control.append(check,$('span','',label));line.append(control);
     if(chosen.includes(key)&&key!=='display_name'){
       const order=$('div','ad-gb-global-setting-order');
       for(const [arrow,delta]of [['↑',-1],['↓',1]]){
         const move=button(arrow,()=>{
           const i=chosen.indexOf(key),j=i+delta;
           if(j<=0||j>=chosen.length)return;
           const next=[...chosen];[next[i],next[j]]=[next[j],next[i]];chosen=next;drawGuestRows();
         },'ad-gb-global-setting-move');
         const i=chosen.indexOf(key);move.disabled=i+delta<=0||i+delta>=chosen.length;
         move.title=delta<0?'Переместить левее':'Переместить правее';
         order.append(move);
       }
       line.append(order);
     }
     guestRows.append(line);
   }
 }
 guestPanel.append(guestRows,guestActions,guestNotice);
 drawGuestRows();
 const childrenPanel=$('div','ad-gb-global-children');
 childrenPanel.append($('h3','','Участие детей'),
   $('p','ad-tl-settings-help','Отключение исключает детей из расчётов и новых ответов RSVP, но сохраняет все записи и ранее введённые данные.'));
 const childrenLabel=$('label','ad-gb-global-children-choice');
 const childrenCheck=$('input');childrenCheck.type='checkbox';
 childrenCheck.checked=settings.settings?.children_enabled!==false;
 childrenLabel.append(childrenCheck,$('span','','Учитывать детей в планировании'));
 const childrenStatus=$('p','ad-tl-form-error');childrenStatus.setAttribute('role','status');
 childrenCheck.addEventListener('change',async()=>{
   const next=childrenCheck.checked;
   if(!next&&!confirm('Отключить учёт детей в расчётах и приглашениях? Данные сохранятся.')){
     childrenCheck.checked=true;return;
   }
   childrenCheck.disabled=true;
   try{
     await api('admin/settings',{method:'POST',body:{key:'children_enabled',value:next}});
     showAdminToast(next?'Учёт детей включён.':'Учёт детей отключён.');
   }catch(err){
     childrenCheck.checked=!next;
     showAdminToast(err.message||'Не удалось сохранить настройку',{kind:'error'});
   }finally{childrenCheck.disabled=false}
 });
 childrenPanel.append(childrenLabel,childrenStatus);guestPanel.append(childrenPanel);
 const exportPanel=$('div','ad-gb-live-excel');
 exportPanel.append($('h3','','Единая база гостей'));
 const exportButton=$('a','ad-tl-button ad-tl-primary','Скачать актуальный Excel · 1 вкладка');
 exportButton.href='/admin/index.php?api='+encodeURIComponent('admin/guests/excel');
 exportButton.setAttribute('download','wedding-guests.xlsx');
 exportPanel.append(exportButton);
 guestPanel.append(exportPanel);
 host.append(guestPanel);
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
       showAdminToast('Теги сохранены.');
     }catch(err){showAdminToast(err.message||'Ошибка сохранения',{kind:'error'})}
     finally{saving=false;save.disabled=false}
   },'ad-tl-primary');
   actions.append(save);
 }
 draw();
}
