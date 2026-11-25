import {showAdminToast} from './admin-toast.js';
export const vendorTypes=['Ведущий','Диджей','Музыкальный коллектив','Артисты','Фотограф','Видеограф','Декоратор','Флорист','Кондитер','Стилист / визажист','Звук и свет','Координатор','Транспорт','Кейтеринг','Полиграфия','Аренда оборудования'];
export const vendorIconPaths={
 'Ведущий':'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
 'Диджей':'<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="12" width="5" height="9" rx="2"/><rect x="16" y="12" width="5" height="9" rx="2"/>',
 'Музыкальный коллектив':'<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="18" cy="16" rx="3" ry="2.5"/>',
 'Артисты':'<path d="M3 3h12v8c0 4-3 7-6 7s-6-3-6-7zM15 7h6v8c0 4-3 7-6 7-2 0-4-1-5-3M6 8h1m4 0h1M6 12q3 4 6 0m5 1h1m-4 5q2-3 4-2"/>',
 'Фотограф':'<path d="M4 6h4l2-3h4l2 3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/>',
 'Видеограф':'<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-4v12l-6-4"/>',
 'Декоратор':'<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-2 2-2h2c5 0 4-12-6-12Z"/><circle cx="6.5" cy="11" r=".7"/><circle cx="9" cy="7" r=".7"/><circle cx="15" cy="7" r=".7"/>',
 'Флорист':'<path d="M12 12v10m0-5c-4-4-7-3-7-3s1 5 7 5m0-3c4-4 7-3 7-3s-1 5-7 5"/><path d="M12 4c-3-5-7 0-4 3-6 0-5 6 0 5 0 5 6 5 6 0 5 2 8-4 2-5 3-4-2-7-4-3Z"/>',
 'Кондитер':'<path d="M3 12h18v9H3zM3 16c3 3 6-3 9 0s6-3 9 0M7 12V8m5 4V8m5 4V8M7 5v1m5-1v1m5-1v1"/>',
 'Стилист / визажист':'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8 8 13 13M8 16 21 3M14 12l-2-2"/>',
 'Звук и свет':'<rect x="3" y="3" width="11" height="18" rx="2"/><circle cx="8.5" cy="15" r="3"/><circle cx="8.5" cy="7" r="1"/><path d="M19 4v3m-2-1h4m-2 9v3m-2-1h4"/>',
 'Координатор':'<rect x="4" y="4" width="16" height="18" rx="2"/><path d="M9 4V2h6v2M8 10l2 2 4-4m-6 8h8m-8 3h6"/>',
 'Транспорт':'<path d="m3 11 2-5h14l2 5M3 11h18a1 1 0 0 1 1 1v6H2v-6a1 1 0 0 1 1-1ZM5 18v3m14-3v3M5 14h2m10 0h2"/>',
 'Кейтеринг':'<path d="M3 16h18M5 16a7 7 0 0 1 14 0M12 6V4M2 20h20"/>',
 'Полиграфия':'<path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6zM17 11h1"/>',
 'Аренда оборудования':'<path d="m12 2 10 5v10l-10 5-10-5V7zM2 7l10 5 10-5M12 12v10M7 4.5l10 5"/>'
};
const zones=['Гостевые столы','Рассадка','Стол молодожёнов','Входная зона','Фотозона','Интерактивные зоны','Церемония','Другое'];
const specs={'Ведущий':['Часы работы','Подготовка сценария','Языки'],'Диджей':['Часы работы','Оборудование','Музыкальная программа'],'Музыкальный коллектив':['Состав','Жанр','Количество сетов','Длительность сета','Технический райдер'],'Фотограф':['Часы съёмки','Количество фото','Срок готовности'],'Видеограф':['Количество операторов','Длительность фильма','Срок готовности'],'Декоратор':['Монтаж','Демонтаж','Материалы'],'Кондитер':['Вес','Цена за кг','Доставка']};
const statuses={candidate:'Кандидат',research:'Кандидат',negotiating:'На согласовании',selected:'Выбран',ordered:'Заказан',ready:'Готов',archived:'Архив'};
export function statusTone(status){return ({selected:'green',ready:'green',candidate:'gray',research:'gray',negotiating:'amber',ordered:'blue',archived:'gray'})[status]||'gray'}
const costFields=['fee','travel','hotel','food','equipment','extras'];
const costLabels=['Гонорар','Проезд','Проживание','Питание','Оборудование','Дополнительные расходы'];
const el=(tag,cls='',text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const btn=(text,fn,cls='ad-tl-button')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b};
function vendorIcon(type){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);
 svg.classList.add('production-type-icon');
 const path=vendorIconPaths[type];
 if(path)svg.innerHTML=path;else{const box=document.createElementNS(svg.namespaceURI,'rect');for(const [k,v] of Object.entries({x:'2',y:'2',width:'20',height:'20',rx:'5'}))box.setAttribute(k,v);svg.append(box);const text=document.createElementNS(svg.namespaceURI,'text');for(const [k,v] of Object.entries({x:'12',y:'15.5','text-anchor':'middle','font-size':'9',stroke:'none',fill:'currentColor'}))text.setAttribute(k,v);text.textContent=type.split(/\s+/).map(s=>s[0]).join('').slice(0,2).toUpperCase();svg.append(text)}
 return svg;
}
const vendorTones=['sage','blue','violet','rose','amber','blue','rose','sage','amber','rose','violet','sage','blue','amber','violet','slate'];
function typeTile(types){const type=types[0]||'Подрядчик',tile=el('span','production-type-tile');tile.dataset.tone=vendorTones[vendorTypes.indexOf(type)]||'slate';tile.title=type;tile.append(vendorIcon(type));return tile}
function typeTags(types,decor,withIcons=true){const row=el('div','production-type-tags');for(const type of types){const tag=el('span','production-type-tag');if(!decor&&withIcons)tag.append(vendorIcon(type));tag.append(el('span','',type));row.append(tag)}return row}
const safeJson=x=>{try{return JSON.parse(x)||{}}catch{return {}}};
const money=x=>x==null?'Уточняется':Number(x).toLocaleString('ru-RU')+' ₽';
const amount=x=>x===''||x==null?null:Math.max(0,Math.round(Number(x)||0));
export function productionCost(d,decor=false,guests=0){
 const known=decor?[d.unitPrice==null||(!['guest','fixed'].includes(d.unit)&&d.quantity==null)?null:d.unitPrice*(d.unit==='guest'?guests:d.unit==='fixed'?1:Number(d.quantity||0)),d.install,d.delivery]:costFields.map(k=>d[k]);
 const sum=known.reduce((s,v)=>s+(Number(v)||0),0);
 return {sum,unknown:known.some(v=>v==null)};
}
export function productionEstimateFields(record,updates,decor,guests){
 const d=safeJson(record.details_json);
 if(!decor&&!costFields.some(k=>Object.hasOwn(d,k)))d.fee=record.estimate_rub??null;
 Object.assign(d,updates);
 const result=productionCost(d,decor,guests),selected=(d.venues||[]).find(v=>v.id===d.venue);
 return {details_json:JSON.stringify(d),estimate_rub:(decor&&d.included)||selected?.mode==='included'?0:result.sum+(selected?.extra||0)};
}
export async function renderProduction(host,call,section){
 const decor=section==='decor',collection=decor?'decor_items':'vendors';
 const [records,venues,vendors,overview]=await Promise.all([call('admin/records?collection='+collection),call('admin/records?collection=venues'),decor?call('admin/records?collection=vendors'):Promise.resolve({items:[]}),call('admin/overview')]);
 let items=records.items||[],view='cards',filter='all',category='',search='',archive=false,venueFilter=location.hash.split('/')[3]==='item'?'':decodeURIComponent(location.hash.split('/')[3]||'');
 const places=venues.items||[],suppliers=vendors.items||[],guests=Number(overview.guests?.total)||0;
 const details=r=>safeJson(r.details_json),tags=r=>String(r.category||'').split(',').map(x=>x.trim()).filter(Boolean);
 const venueName=id=>places.find(v=>v.id===id)?.name||'Площадка не выбрана';
 host.classList.add('production-shell');const root=el('div','production-page');host.replaceChildren(root);
 const header=el('header','admin-page-heading production-heading'),heading=el('div','production-heading-title'),count=el('span','production-count');heading.append(el('h1','',decor?'Декор':'Подрядчики'),count);header.append(heading);
 const actions=el('div','production-actions');header.append(actions);root.append(header);
 const toolbar=el('div','production-toolbar'),body=el('div','production-body');root.append(toolbar,body);
 const err=e=>showAdminToast(e.message||'Не удалось сохранить',{kind:'error'});
 let inlineSaving=false;
 async function inlineSave(r,fields,control){
  if(inlineSaving)return false;inlineSaving=true;if(control)control.disabled=true;
  try{await save(r,fields);return true}catch(e){err(e);return false}finally{inlineSaving=false;if(control?.isConnected)control.disabled=false}
 }
 function editCell(cell,r,label,current,display,commit,numeric=false){
  const trigger=btn('',()=>{if(inlineSaving)return;const field=el('input','production-inline-input');field.type=numeric?'number':'text';if(numeric){field.min='0';field.step='1';field.inputMode='numeric'}field.value=current??'';field.setAttribute('aria-label',label);
   const form=el('form','production-inline-form'),ok=btn('✓',()=>form.requestSubmit(),'production-inline-confirm'),cancel=btn('×',()=>{cell.replaceChildren(trigger);trigger.focus()},'production-inline-cancel');ok.setAttribute('aria-label','Сохранить');cancel.setAttribute('aria-label','Отмена');
   form.append(field,ok,cancel);cell.replaceChildren(form);field.focus();field.select();
   form.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();cell.replaceChildren(trigger);trigger.focus()}};
   form.onsubmit=async e=>{e.preventDefault();if(inlineSaving||!field.reportValidity())return;let fields;try{fields=commit(field.value)}catch(e){err(e);return}if(await inlineSave(r,fields,ok))return;field.focus()};
  },'production-inline-value');trigger.append(el('span','',display));trigger.setAttribute('aria-label','Изменить '+label+': '+display);cell.append(trigger);return cell
 }
 function statusControl(r){const s=select(Object.entries(statuses).filter(([k])=>k!=='research'||r.status==='research'),r.status||'candidate');s.className='production-status production-status-select';s.dataset.tone=statusTone(r.status);s.setAttribute('aria-label','Статус: '+r.name);s.onchange=async()=>{if(!await inlineSave(r,{status:s.value},s))s.value=r.status};return s}
 function categoryCell(r){const cell=el('td'),trigger=btn('',()=>{if(inlineSaving)return;const chosen=new Set(tags(r)),form=el('form','production-inline-categories'),options=el('div','production-inline-category-options');for(const type of new Set([...(decor?zones:vendorTypes),...items.flatMap(tags)])){const l=el('label'),check=el('input');check.type='checkbox';check.checked=chosen.has(type);check.onchange=()=>check.checked?chosen.add(type):chosen.delete(type);l.append(check,el('span','',type));options.append(l)}const actions=el('div','production-inline-category-actions'),ok=btn('Сохранить',()=>form.requestSubmit(),'ad-tl-button ad-tl-primary'),cancel=btn('Отмена',()=>{cell.replaceChildren(trigger);trigger.focus()});actions.append(ok,cancel);form.append(options,actions);form.onsubmit=async e=>{e.preventDefault();await inlineSave(r,{category:[...chosen].join(', ')},ok)};form.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();cell.replaceChildren(trigger);trigger.focus()}};cell.replaceChildren(form);options.querySelector('input')?.focus()},'production-inline-value production-inline-tags');trigger.append(tags(r).length?typeTags(tags(r),decor,false):el('span','','Добавить'));trigger.setAttribute('aria-label','Изменить категории: '+r.name);cell.append(trigger);return cell}
 function detailCell(r,key,label,value,display,numeric=true){return editCell(el('td'),r,label,value,display,raw=>productionEstimateFields(r,{[key]:numeric?amount(raw):raw.trim()},decor,guests),numeric)}

 async function save(r,fields){await call('admin/records',{method:r.id?'PATCH':'POST',body:{collection,...(r.id?{id:r.id}:{}),fields}});items=(await call('admin/records?collection='+collection)).items||[];draw();showAdminToast('Изменения сохранены.')}
 function openDrawer(title){const d=el('dialog','production-drawer');const head=el('header','production-drawer-head');head.append(el('h2','',title),btn('Закрыть',()=>d.close()));d.append(head);root.append(d);d.addEventListener('close',()=>d.remove());d.showModal();return d}
 function select(values,current){const e=el('select');for(const [v,t] of values){const o=el('option','',t);o.value=v;e.append(o)}e.value=current??'';return e}
 function edit(r={}){
  const d=details(r);if(!r.id&&venueFilter)d.venue=venueFilter;const drawer=openDrawer(r.id?r.name:'Новая позиция'),form=el('form','production-form');drawer.append(form);
  const inputs={};
  function group(title){const g=el('fieldset');g.append(el('legend','',title));form.append(g);return g}
  function field(g,key,label,value='',type='text',options){const l=el('label','production-field');l.append(el('span','',label));let e;if(options)e=select(options,value);else{e=el(type==='textarea'?'textarea':'input');if(type!=='textarea')e.type=type;if(type==='number'){e.min='0';e.step='1'}e.value=value??''}l.append(e);g.append(l);inputs[key]=e;return e}
  const base=group('Основное');field(base,'name','Название',r.name).required=true;const categoryBox=el('div','production-category-editor');categoryBox.append(el('span','production-field-label',decor?'Категории':'Типы подрядчика'));const categoryInput=el('input');categoryInput.type='hidden';categoryInput.value=r.category||'';inputs.category=categoryInput;categoryBox.append(categoryInput);const suggested=el('div','production-tags');categoryBox.append(suggested);base.append(categoryBox);
  const chosenTypes=()=>categoryInput.value.split(',').map(s=>s.trim()).filter(Boolean);
  const availableTypes=new Set([...(decor?zones:vendorTypes),...items.flatMap(tags),...chosenTypes()]);
  function drawTypes(){suggested.replaceChildren();for(const t of availableTypes){const selected=chosenTypes().includes(t),b=btn('',()=>{const ts=chosenTypes();categoryInput.value=(selected?ts.filter(x=>x!==t):[...ts,t]).join(', ');drawTypes();showSpecs()},'production-type-choice');b.setAttribute('aria-pressed',String(selected));if(!decor)b.append(vendorIcon(t));b.append(el('span','',t));suggested.append(b)}}
  const customRow=el('div','production-custom-tag'),custom=el('input');custom.placeholder='Новый тег';custom.setAttribute('aria-label','Новый тег');const addTag=()=>{const t=custom.value.trim();if(!t||t.includes(','))return;availableTypes.add(t);if(!chosenTypes().includes(t))categoryInput.value=[...chosenTypes(),t].join(', ');custom.value='';drawTypes();showSpecs()};custom.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addTag()}});customRow.append(custom,btn('Добавить тег',addTag));categoryBox.append(customRow);drawTypes();
  field(base,'status','Статус',r.status||'candidate','text',Object.entries(statuses));
  if(!decor){field(base,'contact','Контакты',r.contact);field(base,'website','Сайт / портфолио',r.website);field(base,'city','Город отправления',d.city);field(base,'contract_ref','Договор / предложение',r.contract_ref)}
  const costs=group('Стоимость и оплата');
  if(decor){field(costs,'unit','Единица расчёта',d.unit||'guest','text',[['guest','На гостя'],['table','На стол'],['piece','За штуку'],['zone','За зону'],['fixed','За проект']]);field(costs,'quantity','Количество (кроме гостей и проекта)',d.quantity,'number');field(costs,'unitPrice','Цена за единицу, ₽',d.unitPrice,'number');field(costs,'install','Монтаж, ₽',d.install,'number');field(costs,'delivery','Доставка, ₽',d.delivery,'number');field(base,'vendor','Подрядчик',d.vendor||'','text',[['','Не выбран'],...suppliers.filter(x=>x.status!=='archived').map(v=>[v.id,v.name])]);field(costs,'included','Уже входит в стоимость подрядчика',d.included?'yes':'no','text',[['no','Нет'],['yes','Да']]);}
  else for(const [i,k] of costFields.entries())field(costs,k,costLabels[i],Object.hasOwn(d,k)?d[k]:(k==='fee'?r.estimate_rub:null),'number');
  field(costs,'paid','Оплачено, ₽',d.paid,'number');field(costs,'agreed','Сумма согласована',d.agreed?'yes':'no','text',[['no','Нет'],['yes','Да']]);field(costs,'due','Срок оплаты',d.due,'date');
  const specGroup=group('Характеристики'),specInputs={};
  function showSpecs(){const old={...(d.specs||{}),...Object.fromEntries(Object.entries(specInputs).map(([k,e])=>[k,e.value]))};for(const k of Object.keys(specInputs))delete specInputs[k];specGroup.replaceChildren(el('legend','','Характеристики'));for(const k of new Set(inputs.category.value.split(',').flatMap(t=>specs[t.trim()]||[]))){specInputs[k]=field(specGroup,'spec:'+k,k,old[k]);}if(!Object.keys(specInputs).length)specGroup.append(el('p','','Дополнительные параметры можно указать ниже.'))}
  inputs.category.addEventListener('change',showSpecs);showSpecs();
  const notes=group('Материалы и договорённости');field(notes,'notes','Примечания',r.notes,'textarea');field(notes,'custom','Дополнительные параметры (по строкам: название: значение)',d.custom,'textarea');field(notes,'reference','Ссылка на материалы / референс',d.reference);field(notes,'owner','Ответственный',d.owner);field(notes,'deadline','Срок подготовки',d.deadline,'date');
  const footer=el('div','production-footer');const submit=el('button','ad-tl-button ad-tl-primary','Сохранить');submit.type='submit';footer.append(submit);form.append(footer);
  form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{const value=k=>inputs[k]?.value??'',next={...d,city:value('city'),paid:amount(value('paid')),agreed:value('agreed')==='yes',due:value('due'),custom:value('custom'),reference:value('reference'),owner:value('owner'),deadline:value('deadline'),specs:Object.fromEntries(Object.entries(specInputs).map(([k,e])=>[k,e.value]))};
   if(decor)Object.assign(next,{unit:value('unit'),quantity:amount(value('quantity')),unitPrice:amount(value('unitPrice')),install:amount(value('install')),delivery:amount(value('delivery')),vendor:value('vendor'),included:value('included')==='yes'});
   else for(const k of costFields)next[k]=amount(value(k));
   const result=productionCost(next,decor,guests),selected=(next.venues||[]).find(v=>v.id===next.venue);let estimate=(decor&&next.included)||selected?.mode==='included'?0:result.sum+(selected?.extra||0);
   await save(r,{name:value('name').trim(),category:[...new Set(value('category').split(',').map(x=>x.trim()).filter(Boolean))].join(', '),status:value('status'),notes:value('notes'),estimate_rub:estimate,details_json:JSON.stringify(next),...(!decor?{contact:value('contact'),website:value('website'),contract_ref:value('contract_ref')}:{})});drawer.close();
  }catch(e){err(e)}finally{submit.disabled=false}};
 }
 function editVenues(r){
 const d=details(r),drawer=openDrawer('Площадки · '+r.name),form=el('form','production-form');drawer.append(form);
 const g=el('fieldset');g.append(el('legend','','Привязка к площадке'));form.append(g);
 const label=el('label','production-field');label.append(el('span','','Основная площадка'));const venue=select([['','Не выбрана'],...places.map(v=>[v.id,v.name])],d.venue||venueFilter||'');label.append(venue);g.append(label);
 const links=el('div','production-links');g.append(links);const venueRows=[];
   function addVenue(v={}){const row=el('div','production-link-row'),place=select([['','Выберите площадку'],...places.map(x=>[x.id,x.name])],v.id||''),mode=select([['unknown','Уточняется'],['external','Отдельный подрядчик'],['included','Включено площадкой'],['restricted','Есть ограничения'],['unavailable','Недоступно']],v.mode||'unknown'),extra=el('input'),note=el('textarea');extra.type='number';extra.min='0';extra.placeholder='Доплата, ₽';extra.value=v.extra??'';note.placeholder='Условия, монтаж, ограничения';note.value=v.note||'';const entry={row,place,mode,extra,note};venueRows.push(entry);row.append(place,mode,extra,note,btn('Удалить',()=>{venueRows.splice(venueRows.indexOf(entry),1);row.remove()}));links.append(row)}
 for(const v of d.venues||[])addVenue(v);g.append(btn('Добавить условия площадки',()=>addVenue()));
 const footer=el('div','production-footer'),submit=el('button','ad-tl-button ad-tl-primary','Сохранить');submit.type='submit';footer.append(submit);form.append(footer);
 form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{const next={...d,venue:venue.value,venues:venueRows.filter(x=>x.place.value).map(x=>({id:x.place.value,mode:x.mode.value,extra:amount(x.extra.value),note:x.note.value}))};const chosen=next.venues.find(x=>x.id===next.venue),sum=productionCost(next,decor,guests).sum;const estimate=(decor&&next.included)||chosen?.mode==='included'?0:sum+(chosen?.extra||0);await save(r,{details_json:JSON.stringify(next),estimate_rub:estimate});drawer.close()}catch(e){err(e)}finally{submit.disabled=false}};
 }
 function archiveItem(r){save(r,{status:r.status==='archived'?'candidate':'archived'}).catch(err)}
 async function refs(r){const drawer=openDrawer('Референсы · '+r.name);const container=el('div','production-ref-grid');drawer.append(container);const upload=el('input');upload.type='file';upload.accept='image/jpeg,image/png,image/webp';drawer.append(upload);async function refresh(){const data=await call('admin/production-images?item='+encodeURIComponent(r.id));container.replaceChildren();for(const x of data.items){const card=el('article','production-card'),im=el('img');im.src='data:'+x.mime+';base64,'+x.data;im.alt=r.name;card.append(im,btn('Удалить',async()=>{try{await call('admin/production-images',{method:'DELETE',body:{id:x.id}});await refresh()}catch(e){err(e)}}));container.append(card)}}upload.onchange=async()=>{try{const file=upload.files[0];if(!file)return;if(file.size>1900000)throw Error('Максимальный размер изображения 1,9 МБ');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file)});await call('admin/production-images',{method:'POST',body:{item:r.id,data}});await refresh();upload.value=''}catch(e){err(e)}};try{await refresh()}catch(e){err(e)}}
 function importPrivate(){
  const drawer=openDrawer('Импорт подрядчиков и декора'),form=el('form','production-form'),file=el('input');file.type='file';file.accept='.json,application/json';file.required=true;
  form.append(el('p','','Файл содержит записи подрядчиков, декора и изображения. Существующие записи с такими названиями не перезаписываются.'),file);const submit=el('button','ad-live-button','Импортировать');submit.type='submit';form.append(submit);drawer.append(form);
  form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{const source=JSON.parse(await file.files[0].text());if(source.format!=='wedding-production-v1'||!Array.isArray(source.records)||source.records.length>100)throw Error('Неверный формат файла');
   let added=0;for(const c of ['vendors','decor_items']){const existing=(await call('admin/records?collection='+c)).items||[];for(const record of source.records.filter(x=>x.collection===c)){const fields=record.fields;if(!fields||typeof fields.name!=='string')throw Error('Отсутствует название');let found=existing.find(x=>x.name.trim().toLowerCase()===fields.name.trim().toLowerCase());if(!found){const result=await call('admin/records',{method:'POST',body:{collection:c,fields}});found={id:result.id,name:fields.name};existing.push(found);added++}
   if(c==='decor_items'&&Array.isArray(record.images)&&record.images.length){const old=(await call('admin/production-images?item='+encodeURIComponent(found.id))).items||[];for(const data of record.images)if(typeof data==='string'&&!old.some(x=>x.data===data)){await call('admin/production-images',{method:'POST',body:{item:found.id,data}});old.push({data})}}}}
   items=(await call('admin/records?collection='+collection)).items||[];drawer.close();draw();showAdminToast('Добавлено записей: '+added);
  }catch(e){err(e)}finally{submit.disabled=false}};
 }
 function draw(){actions.replaceChildren(btn(archive?'Активные':'Архив',()=>{archive=!archive;filter='all';draw()}),btn('Импорт',importPrivate),btn('Добавить',()=>edit(),'ad-tl-button ad-tl-primary'));toolbar.replaceChildren();
  if(venueFilter){const back=el('a','ad-tl-button','К площадке');back.href='#/admin/venues/'+encodeURIComponent(venueFilter);actions.prepend(back,btn('Привязать существующего',()=>{const d=openDrawer('Привязать к площадке'),form=el('form','production-form'),choice=select([['','Выберите запись'],...items.filter(r=>r.status!=='archived').map(r=>[r.id,r.name])],'');choice.required=true;const submit=el('button','ad-tl-button ad-tl-primary','Продолжить');submit.type='submit';form.append(choice,submit);d.append(form);form.onsubmit=e=>{e.preventDefault();const r=items.find(x=>x.id===choice.value);if(r){d.close();editVenues(r)}}}));}
  const active=items.filter(r=>(r.status==='archived')===archive);count.textContent=String(active.length);count.setAttribute('aria-label','Количество записей: '+active.length);
  const tabs=el('div','production-tabs ad-tl-main-switch'),filters=el('div','production-filters');toolbar.append(tabs,filters);
  for(const [v,t] of [['cards','Карточки'],['table','Таблица'],[decor?'refs':'compare',decor?'Референсы':'Сравнение'],...(decor?[['budget','Смета']]:[])]){const b=btn(t,()=>{view=v;draw()},'ad-tl-main-tab'+(view===v?' is-active':''));b.setAttribute('aria-pressed',String(view===v));tabs.append(b)}
  const cats=select([['','Все категории'],...[...new Set([...(decor?zones:vendorTypes),...items.flatMap(tags)])].map(t=>[t,t])],category);cats.setAttribute('aria-label','Категория');cats.onchange=()=>{category=cats.value;draw()};filters.append(cats);
 
  const stat=select([['all','Все статусы'],...Object.entries(statuses).filter(([k])=>k!=='archived')],filter);stat.setAttribute('aria-label','Статус');stat.onchange=()=>{filter=stat.value;draw()};filters.append(stat);
  const q=el('input');q.placeholder='Поиск';q.type='search';q.setAttribute('aria-label','Поиск по записям');q.value=search;q.oninput=()=>{search=q.value;renderBody()};filters.append(q);renderBody();
 }
 function renderBody(){body.replaceChildren();const list=items.filter(r=>(r.status==='archived')===archive&&(!category||tags(r).includes(category))&&(!venueFilter||details(r).venue===venueFilter||(details(r).venues||[]).some(v=>v.id===venueFilter))&&(filter==='all'||r.status===filter)&&String(r.name+' '+r.category+' '+r.notes).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>Number(b.status==='selected')-Number(a.status==='selected')||a.name.localeCompare(b.name,'ru'));
  if(view==='compare'&&!category){body.append(el('p','','Выберите категорию для сравнения исполнителей.'));return}
  if(!list.length){const empty=el('div','production-empty');empty.append(el('h2','',items.length?'Ничего не найдено':decor?'Добавьте первую идею оформления':'Добавьте первого подрядчика'));empty.append(btn(items.length?'Сбросить фильтры':'Добавить',()=>{if(items.length){category='';filter='all';search='';draw()}else edit()}));body.append(empty);return}
  const displayCost=r=>{const d=details(r);if(!decor&&!costFields.some(k=>Object.hasOwn(d,k)))d.fee=r.estimate_rub??null;const c=productionCost(d,decor,guests),v=(d.venues||[]).find(x=>x.id===d.venue);return ((decor&&d.included)||v?.mode==='included')?'Включено':(c.unknown&&c.sum+(v?.extra||0)===0?'Уточняется':money(c.sum+(v?.extra||0))+(c.unknown?' + уточняется':''))};
  if(['table','compare','budget'].includes(view)){
   const wrap=el('div','ad-live-table-scroll production-table-wrap'),table=el('table','ad-live-table production-table'),head=el('thead'),hr=el('tr'),tbody=el('tbody');
   const keys=view==='compare'?[...new Set([...(specs[category]||[]),...list.flatMap(r=>Object.keys(details(r).specs||{}))])]:[];
   for(const h of [...(!decor?['Тип']:[]),'Название','Категории','Статус',...(!decor?['Гонорар','Проезд']:[]),'Стоимость','Оплачено',...keys,''])hr.append(el('th','',h));head.append(hr);
   for(const r of list){const d=details(r),tr=el('tr');if(!decor){const iconCell=el('td','production-icon-cell');iconCell.append(typeTile(tags(r)));tr.append(iconCell)}
    const nameCell=editCell(el('td','production-name-cell'),r,'название',r.name,r.name,raw=>{const name=raw.trim();if(!name)throw Error('Укажите название');return {name}});tr.append(nameCell,categoryCell(r));
    const statusCell=el('td');statusCell.append(statusControl(r));tr.append(statusCell);
    if(!decor){const fee=Object.hasOwn(d,'fee')?d.fee:(!costFields.some(k=>Object.hasOwn(d,k))?r.estimate_rub:null);tr.append(detailCell(r,'fee','гонорар',fee,money(fee)),detailCell(r,'travel','проезд',d.travel,money(d.travel)))}
    const totalCell=el('td','production-calculated-cell',displayCost(r));totalCell.title='Рассчитывается автоматически по статьям расходов';tr.append(totalCell,detailCell(r,'paid','оплачено',d.paid,money(d.paid)));
    for(const k of keys)tr.append(editCell(el('td'),r,k,d.specs?.[k],d.specs?.[k]||'—',raw=>productionEstimateFields(r,{specs:{...(d.specs||{}),[k]:raw.trim()}},decor,guests)));
    const a=el('td'),row=el('div','production-table-actions');row.append(btn('Открыть',()=>edit(r)));if(venueFilter)row.append(btn('Условия',()=>editVenues(r)));a.append(row);tr.append(a);tbody.append(tr)}
   table.append(head,tbody);wrap.append(table);body.append(wrap);return
  }
  if(view==='refs'){const grid=el('div','production-ref-grid');body.append(grid);for(const r of list){const card=el('article','production-card');card.append(el('h2','',r.name),btn('Добавить / редактировать',()=>refs(r)));grid.append(card);call('admin/production-images?item='+encodeURIComponent(r.id)).then(data=>{for(const x of data.items){const im=el('img');im.src='data:'+x.mime+';base64,'+x.data;im.alt=r.name;card.append(im)}}).catch(err)}return}
  const grid=el('div','production-grid');for(const r of list){
   const d=details(r),types=tags(r),card=el('article','production-card'+(decor?'':' production-vendor-card'));
   const top=el('div','production-card-top'),identity=el('div','production-card-identity');
   if(!decor)top.append(typeTile(types));
   const status=el('span','production-status',statuses[r.status]||r.status);status.dataset.tone=statusTone(r.status);top.append(status);
   identity.append(el('h2','',r.name),typeTags(types,decor,false));card.append(top,identity);
   const facts=el('dl','production-facts');const fact=(label,value)=>{const row=el('div');row.append(el('dt','',label),el('dd','',value));facts.append(row)};
   if(!decor){fact('Гонорар',money(d.fee));fact('Проезд',money(d.travel));fact('Город отправления',d.city||'—')}else{fact('Количество',d.unit==='guest'?guests+' гостей':String(d.quantity??'—'));fact('Цена за единицу',money(d.unitPrice))}
   card.append(facts);const cost=el('div','production-cost');cost.append(el('span','','Общая стоимость'),el('strong','production-price',displayCost(r)));card.append(cost);
   const notes=el('div','production-card-notes');if(d.reference&&/^https?:\/\//i.test(d.reference)){const a=el('a','','Материалы');a.href=d.reference;a.target='_blank';a.rel='noopener noreferrer';notes.append(a)}if(r.notes)notes.append(el('p','production-note',r.notes));card.append(notes);
   const row=el('div','production-actions production-card-actions');row.append(btn('Открыть',()=>edit(r),'ad-tl-button ad-tl-primary'));
   if(venueFilter)row.append(btn('Условия',()=>editVenues(r)));
   if(decor){row.append(btn('Референсы',()=>refs(r)));call('admin/production-images?item='+encodeURIComponent(r.id)).then(data=>{if(data.items?.length&&card.isConnected){const im=el('img','production-cover');im.src='data:'+data.items[0].mime+';base64,'+data.items[0].data;im.alt=r.name;card.prepend(im)}}).catch(()=>{})}
   if(r.status!=='selected'&&!archive)row.append(btn('Выбрать',()=>save(r,{status:'selected'}).catch(err)));
   const archiveButton=btn('',()=>archiveItem(r),'ad-tl-button production-archive-action');archiveButton.title=archive?'Восстановить':'В архив';archiveButton.setAttribute('aria-label',archiveButton.title);
   const archiveIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))archiveIcon.setAttribute(k,v);archiveIcon.innerHTML=archive?'<path d="M4 12a8 8 0 1 1 3 6M4 5v7h7"/>':'<rect x="3" y="3" width="18" height="4" rx="1"/><path d="M5 7v14h14V7m-10 5h6"/>';archiveButton.append(archiveIcon);top.append(archiveButton);card.append(row);grid.append(card)
  }body.append(grid)
 }
 draw();
 const direct=location.hash.match(/^#\/admin\/(?:vendors|decor)\/item\/([^/]+)$/);
 if(direct){const r=items.find(x=>String(x.id)===decodeURIComponent(direct[1]));if(r)edit(r)}
}
