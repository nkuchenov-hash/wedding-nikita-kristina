import {showAdminToast} from './admin-toast.js';
// Single organiser workspace. SQLite is the only live source of truth.
// Spreadsheet copies and CSV exports never overwrite responses or manual edits.
const API='/admin/index.php?api=';
const mk=(tag,cls='',value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=String(value??'');return x};
const s=v=>String(v??'').trim();
const SIDES=[['all','Все стороны'],['groom','Никита'],['bride','Кристина'],['both','Общие'],['other','Не определено']];
const DECISIONS=['Черновик','Решили пригласить','Под вопросом','Не приглашать'];
const ANSWERS=[['','Не ответил'],['yes','Буду'],['maybe','Пока не знаю'],['no','Не приду']];
const LANGUAGES=[['ru','Русский'],['en','English'],['de','Deutsch'],['other','Другой']];
const PLANNING=[['main','Основной'],['reserve','Резерв']];
const AGE=[['unknown','Не уточнено'],['adult','Взрослый'],['child','Ребёнок'],['infant','Младенец']];
export const GUEST_TABLE_FIELDS=[
 ['display_name','Гость'],
 ['side','Сторона'],
 ['community','Круг / группа'],
 ['relation_to_couple','Кем приходится'],
 ['about','Профиль гостя'],
 ['about_en','Профиль EN'],
 ['city','Город проживания'],
 ['country','Страна проживания'],
 ['planning_status','Состав'],
 ['age_group','Возраст'],
 ['decision','Приглашение'],
 ['attendance','Ответ'],
 ['seating_group','Рассадка'],
 ['phone','Телефон'],
 ['email','Email'],
 ['birth_city','Город рождения'],
 ['birth_country','Страна рождения']
];
export const DEFAULT_GUEST_TABLE_COLUMNS=['display_name','side','community','about','planning_status','attendance'];
export const DEFAULT_GUEST_TABLE_LAYOUT={row_height:72,truncate:true,widths:{}};
const GUEST_TABLE_WIDTHS={display_name:242,side:130,community:182,relation_to_couple:180,
 about:460,about_en:440,city:185,country:150,origin_place:190,origin_country:165,
 planning_status:140,age_group:142,decision:190,attendance:155,seating_group:190,
 phone:180,email:210,birth_city:195,birth_country:175};
export function normalizeGuestTableLayout(value){
 const heights=[0,56,72,96,128];
 const height=heights.includes(value?.row_height)?value.row_height:72;
 const truncate=typeof value?.truncate==='boolean'?value.truncate:true;
 const widths={};
 if(value?.widths&&typeof value.widths==='object'&&!Array.isArray(value.widths)){
   for(const [key,number] of Object.entries(value.widths))
     if(Object.hasOwn(GUEST_TABLE_WIDTHS,key)&&Number.isInteger(number)&&number>=100&&number<=900)
       widths[key]=number;
 }
 return {row_height:height,truncate,widths};
}

export function normalizeGuestTableColumns(value){
 if(!Array.isArray(value))return [...DEFAULT_GUEST_TABLE_COLUMNS];
 const allowed=new Set(GUEST_TABLE_FIELDS.map(([key])=>key));
 const oldDefault=['display_name','planning_status','side','relation_to_couple','seating_group','decision','attendance'];
 // Migrate previously saved "from" columns to the two unambiguous city/country fields.
 // Preserve ordering and existing widths rather than resetting valid selections.
 const legacy={origin_place:'birth_city',origin_country:'birth_country'};
 const migrated=value.map(key=>legacy[key]||key);
 if(value.join('|')===oldDefault.join('|')||migrated.some(key=>!allowed.has(key)))
   return [...DEFAULT_GUEST_TABLE_COLUMNS];
 const columns=['display_name'];
 for(const key of migrated)if(key!=='display_name'&&allowed.has(key)&&!columns.includes(key))columns.push(key);
 return columns;
}
// Display-only grouping: never modifies guest rows, IDs, families or seating plans.
export function groupGuestsByConnections(selected,allGuests,links,descending=false){
 const full=new Map(allGuests.map(p=>[String(p.id),p]));
 const parent=new Map([...full.keys()].map(id=>[id,id]));
 const find=id=>{let a=id;while(parent.get(a)!==a){const next=parent.get(a);parent.set(a,parent.get(next));a=next}return a};
 const union=(a,b)=>{a=String(a);b=String(b);if(!parent.has(a)||!parent.has(b))return;const x=find(a),y=find(b);if(x!==y)parent.set(y,x)};
 for(const e of links||[]){
   // Broad social acquaintances still share the circle, not a single enormous family component.
   if(/^(?:friend|colleague|acquaintance|coworker)$/i.test(String(e.relation_type||'')))continue;
   union(e.guest_id_1,e.guest_id_2);
 }
 const seatMembers=new Map();
 for(const p of allGuests){
   const seat=String(p.seating_group||'').trim().toLocaleLowerCase('ru');
   if(!seat||seat.length<4)continue;
   // Seat labels are used as a fallback link only within the same social circle.
   const key=[p.side,String(p.community||'').trim().toLowerCase(),seat].join('|');
   if(seatMembers.has(key))union(p.id,seatMembers.get(key));else seatMembers.set(key,p.id);
 }
 const components=new Map();
 for(const p of selected){
   const root=find(String(p.id));
   if(!components.has(root))components.set(root,[]);
   components.get(root).push(p);
 }
 const primary=p=>/^(?:\(?имя не указано|name not provided|жена |муж |девушка |парень |сын |дочь |реб[её]нок |супруг)/i.test(String(p.display_name||''))?1:0;
 const compare=(a,b)=>String(a.display_name||'').localeCompare(String(b.display_name||''),'ru',{numeric:true,sensitivity:'base'});
 const byCircle=new Map();
 for(const members of components.values()){
   members.sort((a,b)=>primary(a)-primary(b)||compare(a,b));
   const ranks=new Map();
   for(const person of members){
     const circle=String(person.community||'').trim(),side=String(person.side||'other');
     const key=side+'|'+circle;
     ranks.set(key,(ranks.get(key)||0)+1);
   }
   const key=[...ranks.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ru'))[0]?.[0]||'other|';
   if(!byCircle.has(key))byCircle.set(key,[]);
   byCircle.get(key).push(members);
 }
 const sideLabels={groom:'Никита',bride:'Кристина',both:'Общие',other:'Без стороны'};
 const sideOrder={groom:0,bride:1,both:2,other:3};
 const sortGroups=(a,b)=>{
   const [sa,ca='']=a.split('|'),[sb,cb='']=b.split('|');
   const af=/семь|родств/i.test(ca)?0:/школ/i.test(ca)?1:/универ|вуз|эшм|cems|высш|финэк|спбгу/i.test(ca)?2:3;
   const bf=/семь|родств/i.test(cb)?0:/школ/i.test(cb)?1:/универ|вуз|эшм|cems|высш|финэк|спбгу/i.test(cb)?2:3;
   return (sideOrder[sa]??4)-(sideOrder[sb]??4)||af-bf||ca.localeCompare(cb,'ru',{sensitivity:'base'});
 };
 const keys=[...byCircle.keys()].sort(sortGroups);
 if(descending)keys.reverse();
 return keys.map(key=>{
   const [side,circle='']=key.split('|');
   const components=byCircle.get(key);
   components.sort((a,b)=>compare(a[0],b[0]));
   if(descending)components.reverse();
   return {key,label:(sideLabels[side]||'Гости')+' · '+(circle||'Без группы'),members:components.flat()};
 });
}
const SORT_FIELDS=[
 ['display_name','Имя'],['__connections','По семьям и кругам'],['side','Сторона'],
 ['community','Круг'],['planning_status','Состав'],['attendance','Ответ RSVP'],
 ['city','Город проживания'],['birth_city','Город рождения'],
 ['country','Страна проживания'],['birth_country','Страна рождения'],
 ['decision','Решение о приглашении'],['about','Профиль'],
 ['seating_group','Рассадка']
];
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
 const head=mk('div','ad-gb-top admin-page-heading'),heading=mk('div');
 heading.append(mk('h1','','Список гостей'));
 const actions=mk('div','ad-gb-top-actions');
 const add=mk('button','ad-gb-primary','+ Гость');add.type='button';
 const mobileAdd=mk('button','admin-mobile-primary','+ Гость');mobileAdd.type='button';
 root.querySelector('.admin-mobile-actions')?.append(mobileAdd);
 const searchWrap=mk('div','ad-gb-search-wrap'),searchToggle=mk('button','ad-gb-settings-icon ad-gb-search-icon');
 searchToggle.type='button';searchToggle.title='Поиск гостей';
 searchToggle.setAttribute('aria-label','Открыть поиск гостей');
 searchToggle.setAttribute('aria-expanded','false');
 searchToggle.setAttribute('aria-controls','ad-gb-search-field');
 searchToggle.innerHTML='<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 5 5"/></svg>';
 const searchField=mk('div','ad-gb-search-field');searchField.id='ad-gb-search-field';searchField.hidden=true;
 const search=mk('input','ad-gb-input ad-gb-search-input');
 search.type='search';search.placeholder='Найти гостя';search.setAttribute('aria-label','Поиск по имени, связям, группе, контактам');
 search.autocomplete='off';searchField.append(search);searchWrap.append(searchField,searchToggle);
 const side=select(SIDES,'all'),
   filter=select([['all','Все активные'],['base','Основной состав'],['question','Под вопросом'],['reserve','Резерв'],['kids','Дети в базе'],['archived','Архив']],'all');
 side.className=filter.className='ad-gb-select';
 const sort=select(SORT_FIELDS,'display_name'),direction=mk('button','ad-gb-sort-direction','А → Я');
 sort.className='ad-gb-select ad-gb-sort-select';sort.setAttribute('aria-label','Сортировать по полю');
 direction.type='button';direction.title='Изменить направление сортировки';
 const columnPrefs=mk('div','ad-gb-column-prefs');
 const columnsButton=mk('button','ad-gb-settings-icon');columnsButton.type='button';
 columnsButton.title='Настройки списка гостей';columnsButton.setAttribute('aria-label','Настройки списка гостей');
 columnsButton.setAttribute('aria-expanded','false');columnsButton.setAttribute('aria-haspopup','dialog');
 columnsButton.innerHTML='<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.3" fill="white"/><circle cx="16" cy="17" r="2.3" fill="white"/></svg>';
 const columnsMenu=mk('dialog','ad-gb-columns-menu ad-gb-settings-drawer');columnsMenu.hidden=true;
 columnsMenu.id='guest-list-settings';columnsMenu.setAttribute('aria-labelledby','guest-list-settings-title');
 columnsButton.setAttribute('aria-controls',columnsMenu.id);
 columnsButton.append(mk('span','ad-gb-settings-label','Фильтры'));
 let settingsTab='filters';
 columnPrefs.append(columnsButton);
 actions.append(searchWrap,columnPrefs,add);head.append(heading,actions);page.append(head,columnsMenu);
 const metrics=mk('div','ad-gb-metrics');page.append(metrics);
 const filterBar=mk('div','ad-gb-visible-filters');
 const childrenToggle=select([['yes','Учитывать'],['no','Исключить']],'yes');childrenToggle.className='ad-gb-select';childrenToggle.disabled=true;
 const filterField=(label,control)=>{const el=mk('label','ad-gb-visible-filter');el.append(mk('span','',label),control);return el};
 const rsvpFilter=select([['all','Любой ответ'],['yes','Будут'],['maybe','Не решили'],['no','Не придут'],['unanswered','Нет ответа']],'all');
 const qualityFilter=select([['all','Все записи'],['no-name','Нет имени'],['duplicates','Возможные дубли'],['unsent','Не отправлено']],'all');
 rsvpFilter.className=qualityFilter.className='ad-gb-select';
 const resetFilters=mk('button','ad-gb-columns-reset','Сбросить фильтры');resetFilters.type='button';
 filterBar.append(filterField('Сторона',side),filterField('Состав',filter),filterField('Дети',childrenToggle),filterField('Ответ RSVP',rsvpFilter),filterField('Проверка данных',qualityFilter),resetFilters);
 const list=mk('div','ad-gb-list');page.append(list);
 const overlay=mk('div','ad-gb-shade');overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 const panel=mk('section','ad-gb-panel'),panelHeader=mk('header','ad-gb-panel-header'),
   titleArea=mk('div','ad-gb-panel-identity'),close=mk('button','ad-gb-close','×');close.type='button';
 close.title='Закрыть карточку';close.setAttribute('aria-label','Закрыть карточку');
 panelHeader.append(titleArea,close);
 const detail=mk('div','ad-gb-details');
 const footer=mk('div','ad-gb-panel-footer');
 footer.hidden=true;
 const footerFeedback=mk('span','ad-gb-footer-feedback');footerFeedback.setAttribute('role','status');
 const footerDelete=mk('button','ad-gb-footer-delete','Удалить');
 const footerCancel=mk('button','ad-gb-footer-cancel','Отмена');
 const footerSave=mk('button','ad-gb-primary ad-gb-footer-save','Сохранить');
 for(const b of [footerDelete,footerCancel,footerSave])b.type='button';
 const footerControls=mk('div','ad-gb-footer-controls');
 footerControls.append(footerDelete,footerCancel,footerSave);
 footer.append(footerFeedback,footerControls);
 panel.append(panelHeader,detail,footer);overlay.append(panel);page.append(overlay);
 destination.append(page);
 let mobileGuestTable=false;
 let people=[],csrf='',activeId=null,editing=false,lastSnapshot='',lastRevision=0,refreshing=false,childrenEnabled=true,descending=false;
 let visibleColumns=[...DEFAULT_GUEST_TABLE_COLUMNS],savingColumns=false,relationshipEdges=[];
 let tableLayout=normalizeGuestTableLayout(null),savingLayout=false;
 let panelSave=null,panelDirty=null,panelDelete=null,panelBusy=false;
 const notice=(message,error=false)=>showAdminToast(message,{kind:error?'error':'success'});
 const tooltip=mk('div','ad-gb-clipped-tooltip');
 tooltip.hidden=true;tooltip.setAttribute('role','tooltip');page.append(tooltip);
 function hideClippedTooltip(){tooltip.hidden=true;tooltip.textContent=''}
 // Some browsers report the visible, clamped height as scrollHeight.
 // Measure an unclamped clone before deciding whether to show the full text.
 function cellIsClipped(node){
   if(node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1)return true;
   const probe=node.cloneNode(true);
   probe.style.setProperty('position','fixed','important');
   probe.style.setProperty('visibility','hidden','important');
   probe.style.setProperty('pointer-events','none','important');
   probe.style.setProperty('height','auto','important');
   probe.style.setProperty('max-height','none','important');
   probe.style.setProperty('overflow','visible','important');
   probe.style.setProperty('display','block','important');
   probe.style.setProperty('-webkit-line-clamp','unset','important');
   probe.style.setProperty('line-clamp','unset','important');
   probe.style.setProperty('width',node.getBoundingClientRect().width+'px','important');
   node.parentElement.append(probe);
   const clipped=probe.getBoundingClientRect().height>node.getBoundingClientRect().height+1;
   probe.remove();
   return clipped;
 }
 function showClippedTooltip(node){
   if(!tableLayout.truncate||tableLayout.row_height===0){hideClippedTooltip();return}
   if(!cellIsClipped(node)){hideClippedTooltip();return}

   tooltip.textContent=node.textContent;
   tooltip.hidden=false;
   const bounds=node.getBoundingClientRect();
   const width=Math.min(470,window.innerWidth-24);
   tooltip.style.maxWidth=width+'px';
   const measured=tooltip.getBoundingClientRect();
   tooltip.style.left=Math.max(12,Math.min(window.innerWidth-measured.width-12,bounds.left))+'px';
   const below=bounds.bottom+10;
   tooltip.style.top=(below+measured.height<window.innerHeight-12?below:
     Math.max(12,bounds.top-measured.height-10))+'px';
 }

 const byId=id=>people.find(p=>p.id===id);
 const status=p=>p.attendance==='yes'?'Будет':p.attendance==='no'?'Не придёт':p.attendance==='maybe'?'Не решил':'Нет ответа';
 const display=p=>s(p.display_name)||'[Имя не указано]';
 const isQuestion=p=>/вопрос|уточн/i.test(s(p.decision));
 const missingName=p=>!s(p.display_name)||/^(?:\(?имя не указано\)?|name not provided)$/i.test(s(p.display_name));
 const isChild=p=>['child','infant'].includes(p.age_group);
 const isReserve=p=>p.planning_status==='reserve';
 const eligible=p=>p.status!=='archived'&&!isReserve(p)&&(childrenEnabled||!isChild(p));
 const sortingValue=(p,key)=>key==='planning_status'?s(p.planning_status||'main'):p[key];
 function compareRows(a,b,key){
   const x=sortingValue(a,key),y=sortingValue(b,key),empty=v=>v===null||v===undefined||s(v)==='';
   if(empty(x)&&!empty(y))return 1;
   if(empty(y)&&!empty(x))return -1;
   const numeric=['adults','children','children_count'].includes(key);
   const result=numeric?(Number(x||0)-Number(y||0)):
     s(x).localeCompare(s(y),'ru',{numeric:true,sensitivity:'base'});
   return (descending?-result:result)||display(a).localeCompare(display(b),'ru')||s(a.id).localeCompare(s(b.id));
 }
 function closeColumns({focus=false}={}){if(columnsMenu.open)columnsMenu.close();columnsMenu.hidden=true;columnPrefs.classList.remove('ad-gb-settings-open');columnsButton.setAttribute('aria-expanded','false');if(focus&&columnsButton.isConnected)columnsButton.focus()}
 columnsMenu.addEventListener('cancel',ev=>{ev.preventDefault();closeColumns({focus:true})});
 columnsMenu.addEventListener('click',ev=>{if(ev.target!==columnsMenu)return;const r=columnsMenu.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)closeColumns({focus:true})});
 function setSearchOpen(open){
   searchField.hidden=!open;
   searchToggle.setAttribute('aria-expanded',String(open));
   searchToggle.setAttribute('aria-label',open?'Закрыть поиск гостей':'Открыть поиск гостей');
   searchWrap.classList.toggle('ad-gb-search-open',open);
   if(open)search.focus();
   else if(search.value){search.value='';render()}
 }
 searchToggle.addEventListener('click',()=>{closeColumns();setSearchOpen(searchField.hidden)});
 async function applyTableLayout(next,{rerender=true}={}){
   if(savingLayout||!csrf)return;
   const normalized=normalizeGuestTableLayout(next),previous=tableLayout;
   tableLayout=normalized;
   if(rerender)render();
   savingLayout=true;
   try{
     await request('admin/settings',{method:'POST',csrf,
       body:{key:'guest_table_layout',value:normalized}});
     if(rerender&& !columnsMenu.hidden)renderColumnMenu();
   }catch(error){
     tableLayout=previous;if(rerender){render();if(!columnsMenu.hidden)renderColumnMenu()}
     notice(error.message,true);
   }finally{savingLayout=false}
 }
 async function applyColumns(next){
   if(savingColumns||!csrf)return;
   savingColumns=true;
   try{
     const cols=normalizeGuestTableColumns(next);
     await request('admin/settings',{method:'POST',csrf,body:{key:'guest_table_columns',value:cols}});
     visibleColumns=cols;render();renderColumnMenu();notice('Столбцы сохранены');
   }catch(error){notice(error.message,true);renderColumnMenu()}
   finally{savingColumns=false}
 }
 function renderColumnMenu({resetScroll=false}={}){
   const oldScroll=columnsMenu.querySelector('.ad-gb-settings-body')?.scrollTop||0;
   columnsMenu.replaceChildren();
   const menuHead=mk('div','ad-gb-settings-head');
   const menuTitle=mk('strong','','Настройки списка');menuTitle.id='guest-list-settings-title';
   const menuClose=mk('button','ad-gb-settings-close','×');menuClose.type='button';menuClose.setAttribute('aria-label','Закрыть настройки');menuClose.addEventListener('click',()=>closeColumns({focus:true}));
   menuHead.append(menuTitle,menuClose);columnsMenu.append(menuHead);
   const tabs=mk('div','ad-gb-settings-tabs');
   for(const [id,label] of [['filters','Фильтры'],['table','Таблица']]){
     const tab=mk('button','ad-gb-settings-tab'+(settingsTab===id?' is-active':''),label);tab.type='button';tab.setAttribute('aria-pressed',String(settingsTab===id));tab.addEventListener('click',()=>{settingsTab=id;renderColumnMenu({resetScroll:true});columnsMenu.querySelector('.ad-gb-settings-tab.is-active')?.focus()});tabs.append(tab);
   }
   columnsMenu.append(tabs);
   const content=mk('div','ad-gb-settings-body');
   const actions=mk('div','ad-gb-settings-actions');
   const done=mk('button','ad-gb-primary ad-gb-settings-done','Готово');done.type='button';done.addEventListener('click',()=>closeColumns({focus:true}));actions.append(done);
   columnsMenu.append(content,actions);
   const filters=mk('div','ad-gb-menu-filters');
   if(settingsTab==='filters'){
   filters.append(filterBar);
   filters.append(mk('strong','ad-gb-columns-heading','Сортировка'));
   const filterField=(label,control)=>{
     const row=mk('label','ad-gb-menu-filter-row');
     row.append(mk('span','',label),control);filters.append(row);
   };
   filterField('Поле',sort);
   const directionRow=mk('div','ad-gb-menu-sort-direction');
   directionRow.append(mk('span','','Направление'),direction);
   filters.append(directionRow);
   content.append(filters);content.scrollTop=resetScroll?0:oldScroll;return;
   }
   const appearance=mk('div','ad-gb-menu-layout');
   appearance.append(mk('strong','ad-gb-columns-heading','Размер ячеек'));
   const sizeRow=mk('label','ad-gb-menu-filter-row');
   sizeRow.append(mk('span','','Высота строки'));
   const size=select([['56','Компактная · 56 px'],['72','Стандартная · 72 px'],
     ['96','Высокая · 96 px'],['128','Очень высокая · 128 px'],['0','По содержимому']],
     String(tableLayout.row_height));
   size.className='ad-gb-select';size.addEventListener('change',()=>{
     applyTableLayout({...tableLayout,row_height:Number(size.value)});
   });
   sizeRow.append(size);appearance.append(sizeRow);
   const wrapLabel=mk('label','ad-gb-menu-wrap-choice'),wrapCheck=mk('input');
   wrapCheck.type='checkbox';wrapCheck.checked=tableLayout.truncate;
   wrapCheck.addEventListener('change',()=>applyTableLayout({...tableLayout,truncate:wrapCheck.checked}));
   wrapLabel.append(wrapCheck,mk('span','','Обрезать текст до высоты строки'));
   appearance.append(wrapLabel,mk('p','ad-gb-columns-hint',
      'Потяните правую границу заголовка, чтобы изменить ширину столбца. Наведите на обрезанный текст для полного просмотра.'));
   content.append(appearance);
   content.append(mk('strong','ad-gb-columns-heading','Отображаемые столбцы'),
     mk('p','ad-gb-columns-hint','Выберите поля и порядок. Изменения сохраняются в настройках.'));
   for(const [key,label] of GUEST_TABLE_FIELDS){
     const checked=visibleColumns.includes(key),row=mk('div','ad-gb-columns-option');
     const toggle=mk('label','ad-gb-columns-toggle'),check=mk('input');check.type='checkbox';check.checked=checked;
     check.disabled=key==='display_name'||savingColumns;
     check.addEventListener('change',()=>{
       applyColumns(check.checked?[...visibleColumns,key]:visibleColumns.filter(v=>v!==key));
     });
     toggle.append(check,mk('span','',label));row.append(toggle);
     if(checked&&key!=='display_name'){
       const move=mk('div','ad-gb-columns-move');
       for(const [symbol,delta]of [['↑',-1],['↓',1]]){
         const b=mk('button','ad-gb-columns-move-button',symbol);b.type='button';
         const i=visibleColumns.indexOf(key),j=i+delta;
         b.disabled=j<=0||j>=visibleColumns.length||savingColumns;
         b.title=delta<0?'Переместить левее':'Переместить правее';
         b.addEventListener('click',()=>{const next=[...visibleColumns];[next[i],next[j]]=[next[j],next[i]];applyColumns(next)});
         move.append(b);
       }
       row.append(move);
     }
     content.append(row);
   }
   const foot=mk('div','ad-gb-columns-footer'),reset=mk('button','ad-gb-columns-reset','По умолчанию');
   reset.type='button';reset.addEventListener('click',()=>applyColumns(DEFAULT_GUEST_TABLE_COLUMNS));
   const more=mk('a','ad-gb-columns-settings-link','Все настройки');more.href='#/admin/settings';
   more.addEventListener('click',()=>closeColumns());foot.append(reset,more);content.append(foot);content.scrollTop=resetScroll?0:oldScroll;
 }
 columnsButton.addEventListener('click',()=>{
   const open=columnsMenu.hidden;
   if(open){if(!searchField.hidden)setSearchOpen(false);renderColumnMenu({resetScroll:true});columnsMenu.hidden=false;columnsMenu.showModal();columnPrefs.classList.add('ad-gb-settings-open')}else closeColumns();
   columnsButton.setAttribute('aria-expanded',String(open));
 });
 function metric(label,value){const card=mk('div','ad-gb-metric');card.append(mk('strong','',value),mk('span','',label));metrics.append(card)}
 function badge(text,kind=''){return mk('span','ad-gb-stage'+(kind?' ad-gb-stage-'+kind:''),text)}
 async function saveFields(p,fields){
   await request('admin/guest/fields',{method:'PATCH',csrf,body:{id:p.id,fields}});
   await reloadData();notice('Изменение сохранено в базе');
 }
 async function saveAnswer(p,val){
   if(val===''&&p.attendance&&!confirm('Очистить ранее сохранённый ответ?'))return;
   const attending=val==='yes'||val==='maybe';
   const adults=attending?Math.max(1,Math.min(Number(p.adults)||1,2)):0;
   const children=attending&&childrenEnabled?Math.max(0,Math.min(16,Number(p.children)||0)):0;
   const result=await request('admin/guest/rsvp',{method:'PATCH',csrf,body:{
     id:p.id,attendance:val,adults,children,
     dietary_notes:s(p.dietary_notes),other_notes:s(p.other_notes)
   }});
   await reloadData();
   notice('Ответ сохранён в базе с пометкой «внесено организатором»');
 }
 function editCell(p,key,placeholder,options=null){
   const td=mk('td','ad-gb-edit-cell'),btn=mk('button','ad-gb-cell-edit');
   btn.type='button';const raw=s(p[key]);
   const labels=Object.fromEntries(options||[]);
   btn.append(mk('span','ad-gb-cell-value',labels[raw]||raw||placeholder));
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
   hideClippedTooltip();metrics.replaceChildren();
   childrenToggle.value=childrenEnabled?'yes':'no';
   const current=people.filter(p=>p.status!=='archived');
   const actual=current.filter(eligible);
   const children=people.filter(isChild);
   metric('Основной состав',actual.length);
   metric('Резерв',current.filter(isReserve).length);
   metric('Детей в базе',children.length);
   metric('Будут',actual.filter(p=>p.attendance==='yes').length);
   metric('Под вопросом',actual.filter(isQuestion).length);
   metric('Всего записей',people.length);
    const query=s(search.value).toLocaleLowerCase('ru');
   const duplicateCounts=new Map();
   for(const p of current){const key=display(p).toLocaleLowerCase('ru').replace(/\s+/g,' ').trim();duplicateCounts.set(key,(duplicateCounts.get(key)||0)+1)}
   const chosen=people.filter(p=>{
     if(side.value!=='all'&&p.side!==side.value)return false;
     if(filter.value==='archived' ? p.status!=='archived' : p.status==='archived')return false;
     if(!childrenEnabled&&isChild(p)&&filter.value!=='kids'&&filter.value!=='archived')return false;
     if(filter.value==='base'&&!eligible(p))return false;
     if(filter.value==='reserve'&&!isReserve(p))return false;
     if(filter.value==='kids'&&!isChild(p))return false;
     if(filter.value==='question'&&!isQuestion(p))return false;
     if(qualityFilter.value==='no-name'&&!missingName(p))return false;
     if(qualityFilter.value==='duplicates'&&(duplicateCounts.get(display(p).toLocaleLowerCase('ru').replace(/\s+/g,' ').trim())||0)<2)return false;
     if(rsvpFilter.value==='yes'&&p.attendance!=='yes')return false;
     if(rsvpFilter.value==='maybe'&&p.attendance!=='maybe')return false;
     if(rsvpFilter.value==='no'&&p.attendance!=='no')return false;
     if(qualityFilter.value==='unsent'&&p.invitation_sent_at)return false;
     if(rsvpFilter.value==='unanswered'&&p.attendance)return false;
     return !query||[p.display_name,p.name_en,p.relationship,p.relation_to_couple,p.seating_group,p.community,p.city,p.country,p.origin_place,p.origin_country,p.birth_city,p.birth_country,p.email,p.phone,p.source_person_id].some(v=>s(v).toLocaleLowerCase('ru').includes(query));
   });
   const grouped=sort.value==='__connections';
   const groups=grouped?groupGuestsByConnections(chosen,people,relationshipEdges,descending):
     [{key:'all',label:'',members:chosen.sort((a,b)=>compareRows(a,b,sort.value))}];
   list.replaceChildren();
   const holder=mk('div','ad-gb-scroll'),table=mk('table','ad-gb-table'),thead=mk('thead'),tr=mk('tr');
   const headings=visibleColumns.map(key=>GUEST_TABLE_FIELDS.find(([field])=>field===key))
     .filter(Boolean).map(([key,label])=>[label,key]);
   table.classList.toggle('ad-gb-rows-clipped',tableLayout.truncate&&tableLayout.row_height!==0);
   table.classList.toggle('ad-gb-rows-wrapped',!tableLayout.truncate||tableLayout.row_height===0);
   table.style.setProperty('--guest-row-height',(tableLayout.row_height||72)+'px');
   table.style.setProperty('--guest-line-count',String(
     tableLayout.row_height<=56?1:tableLayout.row_height<=72?2:tableLayout.row_height<=96?3:5
   ));
   const colgroup=mk('colgroup'),colWidths={},columnElements={};
   for(const [,field] of headings){
     colWidths[field]=tableLayout.widths[field]||GUEST_TABLE_WIDTHS[field]||180;
     const col=mk('col');col.style.width=colWidths[field]+'px';columnElements[field]=col;colgroup.append(col);
   }
   const setPhysicalWidths=()=>{
     for(const key of Object.keys(columnElements))columnElements[key].style.width=colWidths[key]+'px';
     const total=Object.values(colWidths).reduce((sum,width)=>sum+width,0);
     table.style.width=total+'px';table.style.minWidth=total+'px';
   };
   setPhysicalWidths();table.append(colgroup);
   for(const [label,key] of headings){
     const th=mk('th'),button=mk('button','ad-gb-th-sort',label+(sort.value===key?(descending?' ↓':' ↑'):''));
     button.type='button';button.title='Сортировать: '+label;
     button.addEventListener('click',()=>{
       if(sort.value===key)descending=!descending;else{sort.value=key;descending=false}
       direction.textContent=descending?'Я → А':'А → Я';render();saveSortMode();
     });
     const resize=mk('span','ad-gb-col-resize');
     resize.setAttribute('role','separator');resize.setAttribute('tabindex','0');
     resize.setAttribute('aria-orientation','vertical');
     resize.setAttribute('aria-label','Ширина: '+label);
     resize.title='Потяните, чтобы изменить ширину столбца';
     const persistWidth=()=>applyTableLayout({...tableLayout,widths:{...tableLayout.widths,
       [key]:colWidths[key]}},{rerender:false});
     resize.addEventListener('pointerdown',ev=>{
       if(ev.button!==0)return;ev.preventDefault();ev.stopPropagation();
       const startX=ev.clientX,startWidth=colWidths[key];
       resize.classList.add('ad-gb-col-resizing');
       document.body.classList.add('ad-gb-is-resizing');
       const move=event=>{
         colWidths[key]=Math.max(100,Math.min(900,Math.round(startWidth+event.clientX-startX)));
         setPhysicalWidths();hideClippedTooltip();
       };
       const end=()=>{
         window.removeEventListener('pointermove',move);
         window.removeEventListener('pointerup',end);
         window.removeEventListener('pointercancel',end);
         resize.classList.remove('ad-gb-col-resizing');
         document.body.classList.remove('ad-gb-is-resizing');
         if(startWidth!==colWidths[key])persistWidth();
       };
       window.addEventListener('pointermove',move);
       window.addEventListener('pointerup',end,{once:true});
       window.addEventListener('pointercancel',end,{once:true});
     });
     resize.addEventListener('keydown',ev=>{
       if(ev.key!=='ArrowLeft'&&ev.key!=='ArrowRight')return;
       ev.preventDefault();ev.stopPropagation();
       colWidths[key]=Math.max(100,Math.min(900,colWidths[key]+(ev.key==='ArrowRight'?20:-20)));
       setPhysicalWidths();persistWidth();
     });
     th.append(button,resize);tr.append(th);
   }
   thead.append(tr);table.append(thead);
   const body=mk('tbody');
   const editable=new Set(['first_name','last_name','name_en','planning_status','age_group',
     'side','relation_to_couple','relationship','community','seating_group','decision',
     'attendance','city','country','origin_place','origin_country','birth_city','birth_country','phone','email','language']);
   function tableCell(p,key){
     if(key==='display_name'){
       const td=mk('td','ad-gb-name');
       const name=mk('button','ad-gb-person-link',display(p));
       name.type='button';name.addEventListener('click',()=>openGuest(p.id));
       td.append(name,mk('small','',p.name_en||(missingName(p)?'Требуется уточнить имя':'')));
       if(!childrenEnabled&&isChild(p))td.append(badge('Дети отключены','draft'));
       return td;
     }
     if(key==='invitation_sent_at'){
       const td=mk('td','ad-gb-plain-cell');
       td.append(p.invitation_sent_at?badge('Отправлено','sent'):badge('Не отправлено','draft'));
       return td;
     }
     if(editable.has(key)){
       const choices=key==='planning_status'?PLANNING:
         key==='age_group'?AGE:key==='side'?SIDES.filter(([v])=>v!=='all'):
         key==='attendance'?ANSWERS:key==='language'?LANGUAGES:
         key==='decision'?[...new Set([s(p.decision),...DECISIONS])].filter(Boolean).map(v=>[v,v]):null;
       const td=editCell(p,key,'Не указано',choices);
       if(key==='planning_status'&&isReserve(p))td.classList.add('ad-gb-reserve-cell');
       if(key==='age_group'&&!childrenEnabled&&isChild(p))td.classList.add('ad-gb-child-off-cell');
       return td;
     }
     const td=mk('td','ad-gb-plain-cell');
     const content=key==='status'?({'draft':'Черновик','invited':'Приглашён','registered':'Зарегистрирован','archived':'Архив'}[p[key]]||p[key]):
       key==='adults'||key==='children'?s(p[key]??'—'):s(p[key]);
     if(['about','about_en','private_notes','dietary_notes','other_notes'].includes(key)){
       const preview=mk('button','ad-gb-text-preview');
       const text=mk('span','ad-gb-cell-value',content||'—');
       preview.type='button';preview.setAttribute('aria-label','Открыть профиль гостя');
       preview.append(text);preview.addEventListener('click',()=>openGuest(p.id));
       td.append(preview);
     }else{
       const span=mk('span','ad-gb-plain-value ad-gb-cell-value',content||'—');td.append(span);
     }
     return td;
   }
   for(const group of groups){
     if(grouped){
       const separator=mk('tr','ad-gb-group-row'),cell=mk('th','ad-gb-group-label',group.label);
       cell.colSpan=headings.length;cell.scope='rowgroup';separator.append(cell);body.append(separator);
     }
     for(const p of group.members){
     const row=mk('tr','ad-gb-person-row');
     row.classList.toggle('ad-gb-reserve-row',isReserve(p));
     row.classList.toggle('ad-gb-child-off-row',!childrenEnabled&&isChild(p));
     for(const [,key]of headings)row.append(tableCell(p,key));
     body.append(row);
     }
   }
   table.append(body);holder.append(table);list.append(holder);
   // Phones show compact profiles by default, retaining the full editable table on demand.
   list.classList.toggle('ad-gb-mobile-table',mobileGuestTable);
   const mobileSwitch=mk('button','ad-gb-mobile-view',mobileGuestTable?'Карточки гостей':'Полная таблица');
   mobileSwitch.type='button';mobileSwitch.addEventListener('click',()=>{mobileGuestTable=!mobileGuestTable;render()});
   const mobileCards=mk('div','ad-gb-mobile-cards');
   const optionLabel=(options,value)=>options.find(([v])=>v===value)?.[1]||'Не уточнено';
   for(const group of groups){
     if(grouped)mobileCards.append(mk('h3','ad-gb-mobile-group',group.label));
     for(const p of group.members){
       const card=mk('button','ad-gb-mobile-person');card.type='button';
       card.setAttribute('aria-label','Открыть профиль: '+display(p));
       const details=mk('span','ad-gb-mobile-person-info');
       details.append(mk('strong','',display(p)));
       const relation=[p.relation_to_couple||p.relationship,optionLabel(SIDES,p.side)].filter(Boolean).join(' · ');
       details.append(mk('span','',relation),mk('span','ad-gb-mobile-person-status',[isReserve(p)?'Резерв':'Основной',isChild(p)?optionLabel(AGE,p.age_group):'',optionLabel(ANSWERS,p.attendance||'')].filter(Boolean).join(' · ')));
       card.append(details,mk('span','ad-gb-mobile-arrow','›'));
       card.addEventListener('click',()=>openGuest(p.id));mobileCards.append(card);
     }
   }
   if(!chosen.length)mobileCards.append(mk('p','ad-gb-mobile-empty','Нет гостей по выбранным фильтрам.'));
   list.prepend(mobileSwitch,mobileCards);
   table.addEventListener('pointerover',event=>{
     const el=event.target.closest?.('.ad-gb-cell-value');
     if(el&&table.contains(el))showClippedTooltip(el);
   });
   table.addEventListener('pointerout',event=>{
     if(!event.relatedTarget||!event.target.contains?.(event.relatedTarget))hideClippedTooltip();
   });
   table.addEventListener('focusin',event=>{
     const el=event.target.querySelector?.('.ad-gb-cell-value');
     if(el)showClippedTooltip(el);
   });
   table.addEventListener('focusout',hideClippedTooltip);
   holder.addEventListener('scroll',hideClippedTooltip,{passive:true});
   list.append(mk('p','ad-gb-count','Показано '+chosen.length+' из '+people.length));
 }
 function closeGuest(){
   if(panelBusy)return;
   activeId=null;panelSave=null;panelDelete=null;panelDirty=null;
   overlay.hidden=true;footer.hidden=true;footerFeedback.textContent='';
   document.body.classList.remove('ad-gb-lock');
   detail.replaceChildren();titleArea.replaceChildren();
 }
 function closeWithCheck(){
   if(panelBusy)return;
   if(panelDirty?.()&&!confirm('Отменить несохранённые изменения?'))return;
   closeGuest();
 }
 footerSave.addEventListener('click',()=>panelSave?.());
 footerCancel.addEventListener('click',closeGuest);
 footerDelete.addEventListener('click',()=>panelDelete?.());
 function updateGuestSaveVisibility(){
   // An existing guest has no Save button until an actual edit is pending.
   // During creation, the Add button remains available.
   footerSave.hidden=activeId!=='new'&&!Boolean(panelDirty?.());
 }
 function showGuestFooter(options={}){
   footerFeedback.textContent='';
   footerSave.textContent=options.saveText||'Сохранить';
   footerDelete.hidden=options.showDelete===false;
   footer.hidden=false;
   updateGuestSaveVisibility();
 }
 for(const container of [detail,titleArea]){
   container.addEventListener('input',updateGuestSaveVisibility);
   container.addEventListener('change',updateGuestSaveVisibility);
 }
 function field(parent,label,key,value,type='text',items=null){
   const wrapper=mk('label','ad-gb-edit-field');wrapper.append(mk('span','',label));
   const input=items?select(items,value):type==='textarea'?mk('textarea'):mk('input');
   if(!items&&type!=='textarea'){input.type=type;input.maxLength=320}
   if(type==='textarea'){input.rows=key==='about'?6:key==='about_en'?4:3;input.maxLength=key==='private_notes'?12000:5000}
   if(type==='number'){input.min='0';input.max='15'}
   if(!items)input.value=s(value);
   input.name=key;wrapper.append(input);parent.append(wrapper);return input;
 }
 function section(title,{collapsed=false}={}){
   const el=mk(collapsed?'details':'section',collapsed?'ad-gb-section ad-gb-secondary-section':'ad-gb-section');
   el.append(mk(collapsed?'summary':'h3','',title));detail.append(el);return el;
 }
 async function openGuest(id){
   activeId=id;overlay.hidden=false;document.body.classList.add('ad-gb-lock');
   titleArea.replaceChildren(mk('span','ad-gb-loading-name','Загрузка…'));detail.scrollTop=0;
   footer.hidden=true;panelSave=null;panelDirty=null;panelDelete=null;
   detail.replaceChildren(mk('p','ad-gb-note','Открываю карточку…'));
   try{
     const [data,companionsData]=await Promise.all([
       request('admin/guest-profile?guest_id='+encodeURIComponent(id)),
       request('admin/companions?guest_id='+encodeURIComponent(id))
     ]);
     if(activeId!==id)return;
     const g=data.guest,p=byId(id)||g;
     detail.replaceChildren();
     const titleInput=mk('input','ad-gb-title-input'),titleEn=mk('input','ad-gb-subtitle-input');
     titleInput.type=titleEn.type='text';
     titleInput.maxLength=titleEn.maxLength=320;
     titleInput.value=missingName(g)?'':display(g);titleInput.placeholder=missingName(g)?'Указать имя гостя':'Имя гостя';
     titleEn.value=s(g.name_en);titleEn.placeholder='Имя латиницей';
     titleInput.setAttribute('aria-label','Имя гостя');
     titleEn.setAttribute('aria-label','Имя латиницей');
     const nameStatus=mk('span','ad-gb-name-status');
     for(const [key,input] of [['display_name',titleInput],['name_en',titleEn]]){
       input.addEventListener('keydown',event=>{
         if(event.key==='Enter'){event.preventDefault();input.blur()}
         if(event.key==='Escape'){event.preventDefault();input.value=key==='display_name'&&missingName(g)?'':s(g[key]);input.blur()}
       });
     }
     titleArea.replaceChildren(titleInput,titleEn,nameStatus);
     const registration=section('Регистрация на свадьбу');
     registration.classList.add('ad-gb-registration');
     const registrationGrid=mk('div','ad-gb-registration-grid');
     function statusItem(label,value){
       const item=mk('div','ad-gb-registration-item');
       item.append(mk('span','',label),mk('strong','',value));registrationGrid.append(item);
     }
     const sentAt=s(g.invitation_sent_at);
     const openedAt=s(g.first_opened_at);
     const answered=s(g.attendance);
     statusItem('Приглашение',sentAt?'Отправлено':'Не отправлено');
     statusItem('Гостевая анкета',g.profile_completed_at?'Заполнена':openedAt?'Открыта, не заполнена':'Не открыта');
     const answerName=ANSWERS.find(([id])=>id===answered)?.[1];
     statusItem('Ответ',answerName||'Нет ответа');
     registration.append(registrationGrid);
     const profile=mk('section','ad-gb-section');detail.append(profile);
     const form=mk('form','ad-gb-unified-form'),controls={},initial={};
     // Imported sheets repeat the social-circle label in the bio fields.
     // Hide *only* recognisable boilerplate, without changing the stored
     // value until the organiser actually edits that particular field.
     function displayedFieldValue(key){
       const raw=s(g[key]);
       if(key==='about' && /^Круг общения:\s*[^\n]{1,90}\.?$/i.test(raw))return '';
       if(key==='about_en' && /^Social circle:\s*[^\n]{1,90}\.?$/i.test(raw))
          return '';
       return raw;
     }
     function group(title,items,container=form){
       const wrapper=mk('div','ad-gb-field-group');
       if(title)wrapper.append(mk('h4','',title));
       const body=mk('div','ad-gb-edit-grid');
       for(const [key,label,type,opts]of items){
         const value=displayedFieldValue(key);
         controls[key]=field(body,label,key,value,type,opts||null);
         initial[key]=value;
       }
       wrapper.append(body);container.append(wrapper);return wrapper;
     }
     const decisionOptions=[['','Не решено'],...
       [...new Set([s(g.decision),...DECISIONS])].filter(Boolean).map(v=>[v,v])];
     const basics=group('О человеке',[
       ['relation_to_couple','Кем приходится','text'],
       ['community','Круг общения','text'],
       ['birth_city','Город рождения','text'],
       ['birth_country','Страна рождения','text'],
       ['city','Город проживания','text'],
       ['country','Страна проживания','text'],
       ['language','Язык общения','select',LANGUAGES]
     ]);
     basics.classList.add('ad-gb-main-details');
     const bio=group('Профиль гостя',[
       ['about','Характер, работа, интересы и увлечения','textarea']
     ]);
     bio.classList.add('ad-gb-main-profile');
     group('Контакты',[
       ['phone','Телефон','tel'],['email','Email','email']
     ]);
     // Seating is a future planning decision, not a duplicate social circle.
     // Preserve values imported from spreadsheets, but don't present them
     // alongside the social circle as two equivalent identity fields.
     group('Рассадка',[
       ['seating_group','С кем посадить / компания для стола','text']
     ]);
     const notesDetails=mk('details','ad-gb-legacy-details ad-gb-bio-details');
     notesDetails.append(mk('summary','','Дополнительные заметки организаторов'));
     form.append(notesDetails);
     group('',[['private_notes','Что важно учесть на свадьбе','textarea']],notesDetails);
     const englishDetails=mk('details','ad-gb-legacy-details ad-gb-english-details');
     englishDetails.append(mk('summary','','Профиль на английском'));
     form.append(englishDetails);
     group('',[
       ['about_en','Полный профиль EN','textarea']
     ],englishDetails);
     // Organizational attributes are preserved but deliberately separated from biography.
     const adminDetails=mk('details','ad-gb-legacy-details ad-gb-organizer-details');
     adminDetails.append(mk('summary','','Организация приглашения'));
     form.append(adminDetails);
     group('',[
       ['side','Сторона','select',SIDES.filter(([v])=>v!=='all')],
       ['planning_status','Состав гостей','select',PLANNING],
       ['age_group','Возрастная категория','select',AGE],
       ['decision','Решение о приглашении','select',decisionOptions]
     ],adminDetails);


     profile.append(form);
     form.addEventListener('submit',event=>{event.preventDefault();panelSave?.()});
     const household=section('Связи с гостями',{collapsed:true});
     const relationTypes=[['couple','Пара'],['family','Родственные связи'],['friend','Дружеские связи'],['other','Другие связи']];
     const typeOf=link=>relationTypes.some(([key])=>key===link.relation_type)?link.relation_type: 'other';
     const relList=mk('div','ad-gb-relations');household.append(relList);
     const editor=mk('div','ad-gb-relation-editor');household.append(editor);
     const addButton=mk('button','ad-gb-light','+ Добавить связь');addButton.type='button';household.append(addButton);
     function closeRelationEditor(){editor.replaceChildren();addButton.hidden=false}
     function editRelation(link=null){
       editor.replaceChildren();addButton.hidden=true;
       const form=mk('form','ad-gb-relation-edit-form'),grid=mk('div','ad-gb-edit-grid');form.append(grid);
       const left=link?.guest_id_1===id,otherId=link?(left?link.guest_id_2:link.guest_id_1):'';
       const others=people.filter(x=>x.id!==id&&(x.status!=='archived'||x.id===otherId)).map(x=>[x.id,display(x)]).sort((a,b)=>a[1].localeCompare(b[1],'ru'));
       const person=field(grid,'Гость','related_guest',otherId,'select',[['','Выберите гостя'],...others]);person.required=true;person.disabled=!!link;
       const type=field(grid,'Тип связи','relation_type',link?typeOf(link):'','select',[['','Выберите тип'],...relationTypes]);type.required=true;
       const forward=field(grid,'Кем текущий гость приходится выбранному','forward',link?(left?link.relation_1_to_2:link.relation_2_to_1):'');
       const reverse=field(grid,'Кем выбранный гость приходится текущему','reverse',link?(left?link.relation_2_to_1:link.relation_1_to_2):'');
       forward.maxLength=reverse.maxLength=120;
       function updateType(){forward.required=type.value!=='couple'&&(!link||left);reverse.required=type.value!=='couple'&&!!link&&!left;forward.placeholder=reverse.placeholder=type.value==='couple'?'Пара':'Например, брат';}
       type.onchange=updateType;updateType();
       const controls=mk('div','ad-gb-relation-edit-actions'),cancel=mk('button','ad-gb-light','Отмена'),save=mk('button','ad-gb-primary',link?'Сохранить связь':'Добавить связь');cancel.type='button';save.type='submit';cancel.onclick=closeRelationEditor;controls.append(cancel,save);form.append(controls);editor.append(form);
       form.onsubmit=async ev=>{
         ev.preventDefault();save.disabled=true;
         const a=s(forward.value)||(type.value==='couple'?'Пара':''),b=s(reverse.value)||(type.value==='couple'?'Пара':'');
         try{
           if(link)await request('admin/guest/connections',{method:'PATCH',csrf,body:{id:link.id,relation_1_to_2:left?a:b,relation_2_to_1:left?b:a,relation_type:type.value}});
           else await request('admin/guest/connections',{method:'POST',csrf,body:{guest_id:id,other_guest_id:person.value,relation_to_other:a,other_relation_to_guest:b,relation_type:type.value}});
           closeRelationEditor();await refreshRel();await reloadData();
         }catch(err){notice(err.message,true)}finally{save.disabled=false}
       };
       (link?type:person).focus();
     }
     addButton.onclick=()=>editRelation();
     async function refreshRel(){
       const response=await request('admin/guest-profile?guest_id='+encodeURIComponent(id));
       relList.replaceChildren();
       for(const [type,title] of relationTypes){
         const links=(response.relations||[]).filter(link=>typeOf(link)===type);if(!links.length)continue;
         const group=mk('div','ad-gb-relation-group');group.append(mk('h4','ad-gb-relation-group-title',title));
         for(const link of links){
           const left=link.guest_id_1===id,otherId=left?link.guest_id_2:link.guest_id_1;
           const other=left?link.person_two:link.person_one;
           const label=left?link.relation_2_to_1:link.relation_1_to_2;
           const line=mk('div','ad-gb-related');
           const go=mk('button','ad-gb-related-name',other||'Уточнить имя');go.type='button';go.onclick=()=>openGuest(otherId);
           const relation=mk('span','',label||(type==='couple'?'Пара':'Связь не уточнена'));
           const edit=mk('button','ad-gb-small','Изменить');edit.type='button';edit.onclick=()=>editRelation(link);
           const remove=mk('button','ad-gb-small ad-gb-danger','Убрать связь');remove.type='button';
           remove.onclick=async()=>{if(!confirm('Удалить эту связь? Сами гости сохранятся.'))return;
             try{await request('admin/guest/connections',{method:'DELETE',csrf,body:{id:link.id}});await refreshRel();await reloadData()}catch(err){notice(err.message,true)}
           };
           line.append(go,relation,edit,remove);group.append(line);
         }
         relList.append(group);
       }
       if(!relList.children.length)relList.append(mk('p','ad-gb-note','Связей пока нет'));
     }
     await refreshRel();
     // Historical invitation extras are not independent guest records.
     // Preserve existing entries without creating a second manual guest register.
     const invitationExtras=companionsData.companions||[];
     if(invitationExtras.length){
       const extraSection=section('Дополнительные гости по приглашению',{collapsed:true});
       extraSection.append(mk('p','ad-gb-note','Эти люди указаны в приглашении, но не имеют отдельной карточки в списке гостей. Новых гостей добавляйте в общий список и связывайте с нужным человеком.'));
       const extraList=mk('div','ad-gb-relations');extraSection.append(extraList);
       for(const c of invitationExtras){
         const line=mk('div','ad-gb-related');
         line.append(mk('span','',c.display_name+' · '+({adult:'Взрослый',child:'Ребёнок',infant:'Младенец'}[c.age_group]||c.age_group)));extraList.append(line);
       }
     }
     // Active guests have exactly one Main/Reserve control, in Planning.
     // Only legacy archived records require an additional recovery action.
     if(g.status==='archived'){
       const recovery=section('Восстановление архивной записи',{collapsed:true});
       const restore=mk('button','ad-gb-light','Вернуть из архива');restore.type='button';
       recovery.append(restore);
       restore.addEventListener('click',async()=>{
         restore.disabled=true;
         try{
           await request('admin/guest/update',{method:'POST',csrf,body:{id,status:'draft'}});
           await reloadData();
           notice('Запись восстановлена. Её основной/резервный статус не изменён.');
           await openGuest(id);
         }catch(err){notice(err.message,true);restore.disabled=false}
       });
     }


     const fieldsChanged=()=>{
       const updated={};
       for(const key of Object.keys(controls)){
         const value=s(controls[key].value);
         if(value!==s(initial[key]))updated[key]=value;
       }
       const ru=s(titleInput.value),en=s(titleEn.value);
       if(ru!==s(g.display_name)&&ru!=='')updated.display_name=ru;
       if(en!==s(g.name_en))updated.name_en=en;
       return updated;
     };
     panelDirty=()=>Object.keys(fieldsChanged()).length>0||
       (!missingName(g)&&!s(titleInput.value));
     panelSave=async()=>{
       if(panelBusy||activeId!==id)return;
       if(!s(titleInput.value)&&!missingName(g)){
         footerFeedback.textContent='Укажите имя гостя';titleInput.focus();return;
       }
       if(!form.reportValidity())return;
       const changed=fieldsChanged();
       if(!Object.keys(changed).length){showAdminToast('Изменений нет.');return}
       panelBusy=true;footerSave.disabled=footerCancel.disabled=footerDelete.disabled=true;
       footerFeedback.textContent='Сохранение…';
       try{
         if(Object.keys(changed).length)
           await request('admin/guest/fields',{method:'PATCH',csrf,body:{id,fields:changed}});
         await reloadData();
         footerFeedback.textContent='';
         panelBusy=false;closeGuest();
         showAdminToast('Данные гостя сохранены.');
       }catch(error){
         footerFeedback.textContent='Не удалось сохранить все изменения: '+error.message+
           '. Некоторые поля могли сохраниться. Проверьте перед повтором.';
       }finally{
         panelBusy=false;footerSave.disabled=footerCancel.disabled=footerDelete.disabled=false;
       }
     };
     panelDelete=async()=>{
       if(panelBusy||activeId!==id)return;
       if(!confirm('Удалить гостя из списка? Запись будет перемещена в архив и её можно восстановить.'))return;
       panelBusy=true;footerSave.disabled=footerCancel.disabled=footerDelete.disabled=true;
       footerFeedback.textContent='Удаление…';
       try{
         await request('admin/guest/update',{method:'POST',csrf,body:{id,status:'archived'}});
         await reloadData();panelBusy=false;closeGuest();
         showAdminToast('Гость удалён из активного списка.');
       }catch(error){
         footerFeedback.textContent=error.message;
       }finally{
         panelBusy=false;footerSave.disabled=footerCancel.disabled=footerDelete.disabled=false;
       }
     };
     // Guest-site submissions populate the statuses above automatically.
     showGuestFooter({showDelete:g.status!=='archived'});

   }catch(err){titleArea.replaceChildren(mk('h2','ad-gb-new-title','Гость'));detail.replaceChildren(mk('p','ad-gb-error','Не удалось открыть карточку: '+err.message))}
 }
 async function reloadData(quiet=false){
   const data=await request('admin/guests');
   const next=data.guests||[];
   relationshipEdges=Array.isArray(data.relationships)?data.relationships:[];
   const fingerprint=JSON.stringify({guests:next,relationships:relationshipEdges,children_enabled:data.children_enabled});
   lastRevision=Number(data.revision||0);
   if(quiet&&fingerprint===lastSnapshot)return;
   people=next;
   childrenEnabled=data.children_enabled!==false;
   lastSnapshot=fingerprint;
   render();
 }
 async function createGuest(){
   activeId='new';overlay.hidden=false;document.body.classList.add('ad-gb-lock');
   titleArea.replaceChildren(mk('h2','ad-gb-new-title','Добавить гостя'));detail.scrollTop=0;detail.replaceChildren();
   showGuestFooter({saveText:'Добавить',showDelete:false});
   panelDirty=()=>Boolean(detail.querySelector('input')?.value?.trim());
   panelDelete=null;
   const form=mk('form','ad-gb-edit-grid');
   const name=field(form,'Имя *','first_name','','text');
   const family=field(form,'Фамилия','last_name','','text');
   const display=field(form,'Отображаемое имя','display_name','','text');
   const side=field(form,'Сторона','side','other','select',SIDES.filter(([v])=>v!=='all'));
   const age=field(form,'Возраст','age_group','unknown','select',AGE);
   const planning=field(form,'Список','planning_status','main','select',PLANNING);
   detail.append(form);
   panelSave=()=>form.requestSubmit();
   name.required=true;
   form.addEventListener('submit',async ev=>{
     ev.preventDefault();if(panelBusy)return;
     panelBusy=true;footerSave.disabled=footerCancel.disabled=true;
     footerFeedback.textContent='Сохранение…';
     try{
       const data=await request('admin/guests',{method:'POST',csrf,body:{
         first_name:s(name.value),last_name:s(family.value),display_name:s(display.value)||s([name.value,family.value].join(' ')),side:side.value,
         age_group:age.value,planning_status:planning.value
       }});
       await reloadData();await openGuest(data.id);
     }catch(err){footerFeedback.textContent=err.message}
     finally{panelBusy=false;footerSave.disabled=footerCancel.disabled=false}
   });
 }
 for(const x of [search,side,filter,rsvpFilter,qualityFilter])x.addEventListener(x===search?'input':'change',render);
 resetFilters.addEventListener('click',()=>{side.value=filter.value=rsvpFilter.value=qualityFilter.value='all';search.value='';render()});
 childrenToggle.addEventListener('change',async()=>{
   const next=childrenToggle.value==='yes';
   if(!csrf){childrenToggle.value=childrenEnabled?'yes':'no';return}
   childrenToggle.disabled=true;
   try{
     await request('admin/settings',{method:'POST',csrf,body:{key:'children_enabled',value:next}});
     childrenEnabled=next;
     // Explicit child-only filters remain usable even when children are excluded from planning.
     render();
     await reloadData();
     notice(next?'Учёт детей включён.':'Дети исключены из планирования. Записи сохранены.');
   }catch(error){childrenToggle.value=childrenEnabled?'yes':'no';notice(error.message,true)}
   finally{childrenToggle.disabled=false}
 });
 const saveSortMode=async()=>{if(!csrf)return;
   try{await request('admin/settings',{method:'POST',csrf,
     body:{key:'guest_sort_mode',value:sort.value==='__connections'?'connections':'alphabetical'}})}
   catch(error){notice(error.message,true)}
 };
 sort.addEventListener('change',()=>{descending=false;direction.textContent='А → Я';render();saveSortMode()});
 direction.addEventListener('click',()=>{descending=!descending;direction.textContent=descending?'Я → А':'А → Я';render()});
 add.addEventListener('click',createGuest);mobileAdd.addEventListener('click',createGuest);
 close.addEventListener('click',closeWithCheck);overlay.addEventListener('click',ev=>{if(ev.target===overlay)closeWithCheck()});
 const onKey=ev=>{
   if(ev.key!=='Escape')return;
   if(!overlay.hidden&&!editing){closeWithCheck();return}
   if(columnsMenu.open)return;
   if(!searchField.hidden){setSearchOpen(false);searchToggle.focus()}
 };
 document.addEventListener('keydown',onKey);
 try{
   const session=await request('auth/session');csrf=session.csrf;
   if(session.role!=='admin')throw Error('Требуется вход организатора');
   try{
     const saved=await request('admin/settings');
     visibleColumns=normalizeGuestTableColumns(saved.settings?.guest_table_columns);
     tableLayout=normalizeGuestTableLayout(saved.settings?.guest_table_layout);
     if(saved.settings?.guest_sort_mode==='connections')sort.value='__connections';
   }catch(error){notice('Настройки столбцов недоступны; выбран стандартный вид.',true)}
   const route=location.hash.split('/');
   if(route[3]==='base'||route[3]==='reserve')filter.value=route[3];
   if(route[4]==='yes'||route[4]==='unanswered')rsvpFilter.value=route[4];
   if(route[4]==='unsent')qualityFilter.value='unsent';
   await reloadData();childrenToggle.disabled=false;
   if(route[3]==='profile'&&route[4]&&byId(decodeURIComponent(route[4])))await openGuest(decodeURIComponent(route[4]));
 }
 catch(err){list.replaceChildren(mk('p','ad-gb-error','Не удалось открыть базу: '+err.message))}
 const updateFromServer=async()=>{
   if(!page.isConnected){cleanupPreviousGuestView?.();return;}
   if(document.visibilityState!=='visible'||editing||!overlay.hidden||refreshing)return;
   const focused=document.activeElement;
   if(focused&&page.contains(focused)&&focused.matches('input,select,textarea,[contenteditable]'))return;
   refreshing=true;
   try{const change=await request('admin/guests/revision');if(Number(change.revision)!==lastRevision)await reloadData(true)}
   catch(err){notice('Нет связи с сервером. Последние загруженные данные сохранены.',true)}
   finally{refreshing=false}
 };
 const timer=setInterval(updateFromServer,12000);
 const onFocus=()=>{if(!refreshing&&!editing&&overlay.hidden)reloadData(true).catch(err=>notice(err.message,true))};
 const onVisible=()=>{if(document.visibilityState==='visible')updateFromServer();};
 window.addEventListener('focus',onFocus);
 document.addEventListener('visibilitychange',onVisible);
 cleanupPreviousGuestView=()=>{
   clearInterval(timer);
   window.removeEventListener('focus',onFocus);
   document.removeEventListener('visibilitychange',onVisible);
   document.removeEventListener('keydown',onKey);
   closeColumns();
   hideClippedTooltip();tooltip.remove();
   if(page.isConnected)closeGuest();
   cleanupPreviousGuestView=null;
 };
 return cleanupPreviousGuestView;
}
