import {showAdminToast} from './admin-toast.js';

/* Venue comparison — browser-side prototype hosted on public GitHub Pages.
 * Selected venue quote amounts supplied by the couple are deliberately preloaded
 * for immediate cross-device comparison; these numbers are PUBLIC in the frontend.
 * Original photographed documents remain in access-controlled Google Drive.
 * Backend authentication is REQUIRED before this can be called a private admin.
 */
import {VENUE_RECORDS} from './venues-data.js';
import {VENUE_PRICING} from './venues-pricing.js';
import {transcriptAddonTotal} from './venue-transcript-costs.js';
import {renderVenueNewPage,renderVenueQuoteEditorRow,filteredVenuePhotos,getVenuePhotos,getVenueCover} from './venue-detail-ui.js';
import {hydrateVenueFiles} from './venue-files-ui.js';
import {estimateVenue,scoreVenue,PERSONAL_CRITERIA,RATING_CRITERIA,RATING_MAX} from './venue-evaluation.js';
export const PUBLIC_VENUES = [
  {id:'360',name:'Пространство 360',region:'city',area:'Санкт-Петербург'},
  {id:'loft-roof',name:'Лофт на крыше',region:'city',area:'Обводный канал'},
  {id:'kraft',name:'Крафт лофт',region:'city',area:'Обводный канал'},
  {id:'zhemchuzhny',name:'Event Hall «Жемчужный»',region:'city',area:'Приморский пр., 50Ж',capacity:150},
  {id:'english-roof',name:'Крыша на Английской набережной',region:'city',area:'Английская наб.'},
  {id:'admiralty-roof',name:'Крыша у Адмиралтейства',region:'city',area:'Центр Санкт-Петербурга'},
  {id:'vesenniy',name:'Весенний',region:'city',area:'Обводный канал',website:''},
  {id:'alex-park',name:'Александровский парк',region:'city',area:'Санкт-Петербург',
    drive:'https://drive.google.com/drive/folders/1bzMTrULC8Qqve92-ugybFXZzHTu0A-9f',
    quoteSource:'https://docs.google.com/document/d/1bOdS2FWzTOLC9vsTn-S8ywb9gp0Ey2eRRyh4dCMG3wQ/edit',
    quoteDate:'2027-06-20',cost:{quoteTotal:687760,quoteGuests:80},
    quoteAlternatives:[{date:'2027-06-18',guests:80,total:712760},{date:'2027-06-20',guests:80,total:687760}],
    notes:'Предварительная рукописная смета для 80 гостей. Банкет 5 500 ₽ × 80 = 440 000 ₽; фуршет 195 ₽ × 80 = 15 600 ₽; напитки 650 ₽ × 80 = 52 000 ₽; питание специалистов 1 500 ₽ × 2 = 3 000 ₽. Аренда оборудования: 150 000 ₽ (18.06) / 125 000 ₽ (20.06). Сервисный сбор 10%. Рукописные итоги 712 760 ₽ и 687 760 ₽ отличаются от суммы читаемых строк на 1 100 ₽. Пробковый сбор 700 ₽/чел. (потенциально +56 000 ₽) — уточнить, входит ли. Консультационный договор 50 000 ₽, условия зачёта уточнить. На 19 июня цены нет.',
    cons:'На 18 и 19 июня мест уже нет, свободно только 20-е. Итог рукописной сметы отличается от суммы читаемых строк на 1 100 ₽. Пробковый сбор остаётся неясным.'},
  {id:'seasons',name:'Сезоны в парке',region:'city',area:'Санкт-Петербург'},
  {id:'k2',name:'К2',region:'city',area:'Каменный остров, Санкт-Петербург',capacity:200},
  {id:'putilov',name:'Особняк Путилова',region:'city',area:'Крестовский остров, пр. Динамо, 2Б',capacity:120,website:'https://putilovevent.ru/'},
  {id:'ermolinsky',name:'Особняк Ермолинского',region:'city',area:'Гродненский пер., 4',capacity:90,website:'https://www.ermolinskievent.ru/kp'},
  {id:'royal',name:'Royal Beach — Крестовский',region:'city',area:'Крестовский остров'},
  {id:'zarenkov-gallery',name:'Zarenkov Gallery — Галерея Заренкова',region:'city',area:'ул. Социалистическая, 21 · 10 этаж',website:'https://zarenkov-gallery.com/rent/',capacity:100},
  {id:'vinity',name:'Vinity — Таврический сад',region:'city',area:'Потёмкинская, 4А',visited:true,
    drive:'https://drive.google.com/drive/folders/1SoO1HSmdw_e1TBo_LrQB5HcvBrU1WaqK',
    photos:'https://drive.google.com/drive/folders/1ufIQOjp0BiHqyvy0ew6C36od1z4ZX3ce',
    quoteSource:'https://docs.google.com/document/d/1t37Broaa6dE4L8MJmJBTxMeDie1kZMd6or3h6zMv66Q/edit',
    cost:{quoteTotal:863500,quoteGuests:80},
    notes:'Предварительный расчёт на 80 гостей: пакет 760 000 ₽ (не подменять рекламным меню от 6 500 ₽/гость); фуршет 48 000 ₽ (600 ₽ × 80), безалкогольные напитки 36 000 ₽ (450 ₽ × 80), персонал 6 000 ₽ (2 000 ₽ × 3); дополнительные услуги 90 000 ₽; сервисный сбор 15% только от дополнительных услуг = 13 500 ₽. Итого 863 500 ₽. В пакете заявлены 5 часов зала, свет/звук и часть оформления. Чай/кофе 300 ₽/чел. по факту, продление 30 000 ₽/час, торт и дополнительный декор — отдельно. Дату торжества и включённые услуги необходимо подтвердить.',
    cons:'Скидка 10% на 20 июня подтверждена, но база её начисления пока не ясна; чай/кофе, продление, торт и дополнительный декор не входят в смету.'},
  {id:'petr',name:'Банкетный зал «Петръ»',region:'city',area:'Гороховая, 1',website:'https://www.petrbanket.com/'},
  {id:'roof18',name:'Крыша 18',region:'city',area:'Петроградская наб., 18',website:'https://roof18.ru'},
  {id:'bali',name:'Ресторан Bali',region:'city',area:'Савушкина, 98',website:'https://balispb.ru/banket/svadby'},
  {id:'ambassador',name:'Амбассадор Ивент',region:'city',area:'Римского-Корсакова, 5–7'},
  {id:'palma',name:'Пальма',region:'city',area:'пер. Пирогова, 18'},
  {id:'repino-riviera',name:'Репинская Ривьера',region:'country',area:'Репино'},
  {id:'panorama',name:'Панорама — Репино',region:'country',area:'Приморское шоссе, 428Д'},
  {id:'eva',name:'Шатёр Eva — Летний',region:'country',area:'Большая Купальная, 28'},
  {id:'maryino',name:'Усадьба Марьино — Белый зал',region:'country',area:'Андрианово, Тосненский район',website:'https://usadbamaryino.ru/rental/halls',capacity:80,
    publiclyAdvertised:{rent:250000,menu:6500,extension:35000},publicNote:'Белый зал предпочтителен. Вместимость до 80 по официальному сайту, в сторонних каталогах есть противоречия. Меню от 6 500 ₽/чел. — ориентир из каталога, не смета на июнь 2027.'},
  {id:'milyutin',name:'Особняк Милютина',region:'city',area:'Садовая, 4',website:'https://milutin.spb.ru/contacts'},
  {id:'glukhovsky',name:'Особняк Глуховского',region:'city',area:'наб. Адмирала Лазарева, 10/18',website:'https://banket-parkking.ru/'},
  {id:'santa-gloria',name:'Санта Глория',region:'city',area:'Мытнинская наб., 6',website:'https://santagloria.ru/',capacity:100},
  {id:'chadu',name:'Чаду',region:'city',area:'Боткинская улица, Санкт-Петербург'},
  {id:'harmony',name:'Harmony Hall — Гармония',region:'country',area:'Солнечное, Приморское ш., 380И',website:'https://harmony-hall.ru/',capacity:170,
    publicNote:'Конгресс-холл: банкет до 170 гостей; предложение менеджера на июнь 2027 — аренда 170 000 ₽. Питание по ставкам 2026, расчёт уточняется.'}
];
const DATE_CHOICES=[['18','18 июня'],['19','19 июня'],['20','20 июня']];

const EXTRAS=[['alcohol','Алкоголь и пробковый сбор'],['decor','Декор'],['host','Ведущий и DJ'],['photoVideo','Фото и видео'],['transport','Трансфер'],['extension','Продление'],['other','Другие расходы']];
const COSTS=[
 ['quoteTotal','Полная сумма полученной сметы, ₽'],['quoteGuests','Гостей в этой смете'],
 ['rent','Аренда зала, ₽'],['menu','Меню на гостя, ₽'],
 ['technical','Оборудование, ₽'],['extra','Прочие известные расходы, ₽'],
 ['service','Сервисный сбор, %'],['minSpend','Минимальный депозит / заказ, ₽']
];
const STORE='nk-wedding-venues-comparison-v2';
const INITIAL=()=>({version:2,guestCount:80,venues:{}});
// Only the personal guest-count preference is cached in the browser.
// All venue changes and date statuses are read from the authenticated database.
function read(){
 try {
  const cached=JSON.parse(localStorage.getItem(STORE)||'null');
  if(cached&&cached.version===2){
   const guestCount=Number(cached.guestCount);
   if(Number.isInteger(guestCount)&&guestCount>=1&&guestCount<=300)
    return {...INITIAL(),guestCount};
  }
 }catch{}
 return INITIAL();
}
let state=read();
let ui={archiveFilter:'active',kind:'all',query:'',sort:'date',sortDir:'asc',expanded:null,detailTab:'overview',dateFilter:'all',budget:'all',visit:'all',capacity:'all',photoSection:'all',photoView:'gallery',photoSort:'original',photoIndex:0,photoLightbox:false};
const h=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=(v)=>typeof v==='number'&&Number.isFinite(v)?Math.round(v).toLocaleString('ru-RU')+' ₽':'—';
const safeUrl=(v)=>{try{const u=new URL(String(v));return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}};
const get=(base)=>{
 const d=VENUE_RECORDS[base.id]||{},edit=state.venues[base.id]||{};
 const dates=venueDb.dates.get(base.id)||{};
 const dateAvailability=Object.fromEntries(['18','19','20'].map(day=>[day,dates[day]||'unknown']));
 return {...base,...d,...edit,cost:{...(base.publiclyAdvertised||{}),...(base.cost||{}),...(d.cost||{}),...(edit.cost||{})},
  ratings:{...(edit.ratings||{})},extras:{...(edit.extras||{})},
  quotes:edit.quotes??d.quotes??[],gallery:d.gallery||[],
  dateAvailability,availability:dateAvailability['19']};
};
const dayStatus=(v,day)=>v.dateAvailability?.[String(day)]||'unknown';
const dayText=(v,day)=>({available:'Свободно',unavailable:'Занято',pending:'Уточняется',unknown:'Нет подтверждения'}[dayStatus(v,day)]||'Нет подтверждения');
const datePriority=v=>dayStatus(v,'19')==='available'?0:(dayStatus(v,'18')==='available'||dayStatus(v,'20')==='available')?1:(DATE_CHOICES.some(([d])=>dayStatus(v,d)==='pending'))?2:(DATE_CHOICES.some(([d])=>dayStatus(v,d)==='unknown'))?3:4;
const bestAvailable=v=>dayStatus(v,'19')==='available'?'19':(dayStatus(v,'18')==='available'?'18':(dayStatus(v,'20')==='available'?'20':null));
const threeDates=v=>DATE_CHOICES.map(([day])=>'<span class="vw-date-chip vw-day-'+dayStatus(v,day)+'"><b>'+day+'.06</b> '+h(dayText(v,day))+'</span>').join('');

const numbers=(v)=>Number.isFinite(Number(v))&&v!==''&&v!==null?Math.max(0,Number(v)):null;
function save(){try{localStorage.setItem(STORE,JSON.stringify({version:2,guestCount:state.guestCount}));}catch{}}
// Durable organizer edits use the existing authenticated wedding admin SQLite API.
// Static venue facts and original source materials remain untouched.
const venueDb={rows:new Map(),dates:new Map(),csrf:'',ready:false,loading:false,error:''};
const formNumber=(raw,label)=>{
 const text=String(raw??'').trim();
 if(!text)return null;
 const n=Number(text);
 if(!Number.isFinite(n)||n<0)throw new Error('Неверное число: '+label);
 return n;
};
const formTextLines=value=>String(value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
async function venueApi(route,{method='GET',body}={}){
 const [name,params='']=route.split('?');
 const headers={Accept:'application/json'};
 if(method!=='GET'){
  if(!venueDb.csrf)throw new Error('Нет защищённой сессии для сохранения');
  headers['X-CSRF-Token']=venueDb.csrf;
  headers['Content-Type']='application/json';
 }
 const response=await fetch('/admin/index.php?api='+encodeURIComponent(name)+(params?'&'+params:''),{
  method,headers,body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store'
 });
 let payload;
 try{payload=await response.json()}catch{throw new Error('Сервер не вернул данные')}
 if(!response.ok||!payload.ok)throw new Error(payload.message||'Сервер не принял изменения ('+response.status+')');
 return payload;
}
function parseOverrides(row){
 try{
  const data=JSON.parse(row.details_json||'{}');
  const venueId=data.wedding_comparison_id||data.public?.id||row.id;
  if(PUBLIC_VENUES.some(x=>x.id===venueId)){
   return {venueId,overrides:data.overrides&&typeof data.overrides==='object'&&!Array.isArray(data.overrides)?data.overrides:{},
    priority:data.wedding_comparison_id?1:0};
  }
 }catch{}
 return null;
}
async function initVenueDatabase(root,force=false){
 if(venueDb.loading||(venueDb.ready&&!force))return;
 const background=venueDb.ready&&force;
 let changed=false;
 venueDb.loading=true;
 if(!background){venueDb.ready=false;redraw(root);}
 try{
  const [session,data,availability]=await Promise.all([
   venueApi('auth/session'),venueApi('admin/records?collection=venues'),venueApi('admin/venue-dates')
  ]);
  if(session.role!=='admin'||!session.csrf)throw new Error('Требуется вход администратора');
  venueDb.csrf=session.csrf;
  const incoming={},rows=new Map(),priorities=new Map(),dates=new Map();
  for(const row of data.items||[]){
   const item=parseOverrides(row);
   if(!item)continue;
   const prev=priorities.get(item.venueId);
   if(prev!==undefined&&prev>=item.priority)continue;
   rows.set(item.venueId,row.id);
   incoming[item.venueId]=item.overrides;
   priorities.set(item.venueId,item.priority);
  }
  const accepted=new Set(['unknown','pending','available','unavailable']);
  for(const item of availability.dates||[]){
   if(!PUBLIC_VENUES.some(v=>v.id===item.venue_id))continue;
   if(!/^2027-06-(18|19|20)$/.test(item.day)||!accepted.has(item.status))
    throw new Error('Некорректные статусы дат в базе');
   const current=dates.get(item.venue_id)||{};
   current[item.day.slice(-2)]=item.status;
   dates.set(item.venue_id,current);
  }
  for(const venue of PUBLIC_VENUES){
   if(['18','19','20'].some(d=>!dates.get(venue.id)?.[d]))
    throw new Error('Не загружены статусы дат для '+venue.name);
  }
  // Revalidate silently: other-device edits redraw only when data has changed.
  changed=JSON.stringify(state.venues)!==JSON.stringify(incoming)||
    JSON.stringify([...venueDb.dates].sort())!==JSON.stringify([...dates].sort());
  // Only server responses populate venue state. Browser caches guestCount only.
  state.venues=incoming;
  venueDb.rows=rows;
  venueDb.dates=dates;
  venueDb.ready=true;
  venueDb.error='';
 }catch(error){
  venueDb.error=error.message;
  if(!background)venueDb.ready=false;
 }finally{
  venueDb.loading=false;
  if(root.querySelector('[data-venues-page]')&&(!background||changed))redraw(root);
 }
}
async function commitVenueDate(id,day,status,root){
 if(!venueDb.ready)throw new Error('Общая база недоступна');
 if(!['18','19','20'].includes(day)||!['unknown','pending','available','unavailable'].includes(status))
  throw new Error('Недопустимый статус даты');
 const saved=await venueApi('admin/venue-dates',{
  method:'PATCH',body:{venue_id:id,day:'2027-06-'+day,status}
 });
 if(saved.venue_id!==id||saved.day!=='2027-06-'+day||saved.status!==status)
  throw new Error('Сервер вернул неожиданный результат');
 const current={...(venueDb.dates.get(id)||{})};
 current[day]=status;
 venueDb.dates.set(id,current);
 ui.savedVenue=id;
 redraw(root);
 showAdminToast('Доступность даты сохранена.');
}
let venuePersistQueue=Promise.resolve();
function queueVenuePersist(id){
 venuePersistQueue=venuePersistQueue.catch(()=>{}).then(()=>persistVenue(id));
 return venuePersistQueue;
}
async function persistVenue(id){
 if(!venueDb.ready)throw new Error(venueDb.error||'Связь с базой не установлена. Изменения не отправлены на сервер');
 const current=PUBLIC_VENUES.find(v=>v.id===id);
 if(!current)throw new Error('Площадка не найдена');
 const v=get(current);
 const fields={
  name:String(v.name||current.name),area:String(v.area||''),
  details_json:JSON.stringify({wedding_comparison_id:id,overrides:state.venues[id]||{}})
 };
 const rowId=venueDb.rows.get(id);
 const method=rowId?'PATCH':'POST';
 const body={collection:'venues',fields,...(rowId?{id:rowId}:{})};
 const saved=await venueApi('admin/records',{method,body});
 if(!rowId)venueDb.rows.set(id,saved.id);
 return saved;
}
// One editor per displayed value. No second "Редактирование" section.
const INLINE_DAYS=['unknown','available','pending','unavailable'];
const INLINE_FIELD_ALLOW=new Set(['name','area','region','capacity','capacityNote','visited','summary','costSummary','notes','visitTranscriptNotes','contactPhone','contactEmail','address','website','drive','photos','quoteSource','included','excluded','questions']);
const INLINE_COST_ALLOW=new Set(['menu','rent','technical','extra','service','minSpend','sound','light','welcome','drinks','cake','corkage','staff','extension']);
const INLINE_EXTRA_ALLOW=new Set(EXTRAS.map(([key])=>key));
const PRICING_KEY={technical:'tech',minSpend:'deposit'};
function currentInlineValue(v,key){
 if(key.startsWith('date:'))return dayStatus(v,key.slice(5));
 if(key.startsWith('cost:')){
  const field=key.slice(5),current=v.cost?.[field];
  if(current!==undefined&&current!==null&&current!=='')return String(current);
  const pricing=VENUE_PRICING[v.id]?.[PRICING_KEY[field]||field];
  return typeof pricing?.value==='number'?String(pricing.value):'';
 }
 if(key.startsWith('extra:'))return v.extras?.[key.slice(6)]??'';
 if(['included','excluded','questions'].includes(key))return (v[key]||[]).join('\n');
 if(key==='visited')return v.visited?'true':'false';
 return v[key]??'';
}
function updateInlineOverrides(id,key,raw){
 const base=PUBLIC_VENUES.find(x=>x.id===id);
 if(!base)throw new Error('Площадка не найдена');
 const v=get(base),old=state.venues[id]||{},text=String(raw??'').trim();
 const changes={...old};
 if(key.startsWith('cost:')){
  const field=key.slice(5);
  if(!INLINE_COST_ALLOW.has(field))throw new Error('Неизвестный расход');
  const value=formNumber(text,field);
  if(field==='service'&&value!==null&&value>100)throw new Error('Сервисный сбор должен быть не более 100%');
  changes.cost={...v.cost,[field]:value};
 }else if(key.startsWith('extra:')){
  const field=key.slice(6);
  if(!INLINE_EXTRA_ALLOW.has(field))throw new Error('Неизвестная доплата');
  changes.extras={...v.extras,[field]:formNumber(text,field)};
 }else if(INLINE_FIELD_ALLOW.has(key)){
  if(key==='capacity'){const n=formNumber(text,'вместимость');if(n!==null&&!Number.isInteger(n))throw new Error('Вместимость должна быть целым числом');changes[key]=n}
  else if(key==='visited')changes.visited=text==='true';
  else if(key==='region'){if(!['city','country'].includes(text))throw new Error('Неизвестное расположение');changes.region=text}
  else if(['included','excluded','questions'].includes(key))changes[key]=formTextLines(text.replace(/^[•\-]\s*/gm,''));
  else if(key==='name'){if(!text)throw new Error('Название не может быть пустым');changes.name=text}
  else changes[key]=text;
 }else throw new Error('Редактирование этого поля запрещено');
 return changes;
}
async function commitInlineChanges(id,updates,root){
 if(!venueDb.ready)throw new Error(venueDb.error||'Общая база недоступна');
 const had=Object.prototype.hasOwnProperty.call(state.venues,id);
 const previous=state.venues[id];
 state.venues[id]=updates;
 try{
  await queueVenuePersist(id);
  save();ui.savedVenue=id;
  redraw(root);
  showAdminToast('Изменения площадки сохранены.');
 }catch(error){
  if(had)state.venues[id]=previous;else delete state.venues[id];
  save();redraw(root);
  throw error;
 }
}
function buildInlineFieldEditor(trigger,v){
 const key=trigger.dataset.venueInline,kind=trigger.dataset.inlineKind||'text';
 const form=document.createElement('form');
 form.className='vdp-inline-form';
 form.dataset.inlineKey=key;
 const value=currentInlineValue(v,key);
 let control;
 if(kind==='date'||kind==='visited'||kind==='region'){
  control=document.createElement('select');
  const list=kind==='date'
   ?[['unknown','Нет подтверждения'],['available','Свободно'],['pending','Уточняется'],['unavailable','Занято']]
   :kind==='region'?[['city','Санкт-Петербург'],['country','За городом']]
   :[['false','Не подтверждено'],['true','Да, осматривали']];
  for(const [id,label] of list){const o=document.createElement('option');o.value=id;o.textContent=label;control.add(o)}
  control.value=kind==='region'?String(v.region||'city'):String(value);
 }else if(kind==='multiline'||kind==='lines'){
  control=document.createElement('textarea');control.rows=kind==='lines'?6:4;control.value=String(value);
  control.placeholder=kind==='lines'?'По одному пункту на строку':'Введите значение';
 }else{
  control=document.createElement('input');control.type=kind==='number'?'number':kind==='email'?'email':'text';
  if(kind==='number'){control.min='0';control.step='any';control.inputMode='decimal'}
  control.value=String(value);
 }
 control.dataset.inlineControl='yes';control.setAttribute('aria-label','Новое значение');
 const actions=document.createElement('div');actions.className='vdp-inline-actions';
 const ok=document.createElement('button');ok.type='submit';ok.textContent='Сохранить';ok.className='vdp-inline-save';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Отмена';cancel.dataset.cancelInline='';
 actions.append(ok,cancel);form.append(control,actions);
 trigger.replaceWith(form);control.focus();if(typeof control.select==='function'&&control.tagName!=='SELECT')control.select();
 return form;
}
function buildInlineQuoteEditor(trigger,v,index){
 const quotes=v.quotes||[];
 const quote=quotes[index]||{};
 const form=document.createElement('form');
 form.className='vdp-inline-quote-form';
 form.dataset.inlineQuoteIndex=String(index);
 form.innerHTML=renderVenueQuoteEditorRow(quote)+
 '<div class="vdp-inline-actions"><button type="submit" class="vdp-inline-save">Сохранить смету</button>'+
 '<button type="button" data-cancel-inline>Отмена</button></div>';
 if(trigger)trigger.replaceWith(form);
 else{
  const heading=document.querySelector('[data-add-inline-quote]')?.closest('.vdp-pane');
  if(heading)heading.append(form);
 }
 form.querySelector('[data-quote-field="guests"]')?.focus();
 return form;
}
function collectInlineQuote(form,v){
 const row=form.querySelector('[data-venue-quote-row]');
 const val=field=>row?.querySelector('[data-quote-field="'+field+'"]')?.value?.trim()||'';
 const guests=formNumber(val('guests'),'Гостей в смете');
 const total=formNumber(val('total'),'Сумма сметы');
 if(!Number.isInteger(guests)||guests<1||guests>500||total===null)throw new Error('Укажите число гостей и полную сумму сметы');
 const kind=val('kind')||'quote';
 if(!['quote','estimate','scenario'].includes(kind))throw new Error('Неизвестный тип расчёта');
 const quote={guests,total,kind,date:val('date'),label:val('label')};
 const index=Number(form.dataset.inlineQuoteIndex);
 const quotes=[...(v.quotes||[])];
 if(Number.isInteger(index)&&index>=0&&index<quotes.length)quotes[index]=quote;
 else quotes.push(quote);
 return quotes;
}

function estimate(v){return estimateVenue(v,state.guestCount);}
function extraTotal(v){return EXTRAS.reduce((s,[k])=>s+(numbers(v.extras?.[k])??0),0)+transcriptAddonTotal(v,state.guestCount)}
// The comparison table and its cost score use the same total as the venue budget page.
function totalEstimate(v){
 const base=estimate(v),extra=extraTotal(v);
 if(extra===0)return base;
 if(base.value===null)return {...base,knownSubtotal:(base.knownSubtotal??0)+extra,
  note:base.note+'; также внесены дополнительные расходы: '+rub(extra)};
 return {...base,value:base.value+extra,basedOnQuote:base.isQuote===true&&!base.partial,
  partial:true,isQuote:false,kind:'scenario',
  note:base.note+'; добавлены расходы организаторов: '+rub(extra)};
}
function weighted(v){return scoreVenue(v,state.guestCount,totalEstimate(v));}
function sourceThumb(g){if(!g)return '';const id=encodeURIComponent(g.id);return '<a href="https://drive.google.com/file/d/'+id+'/view" target="_blank" rel="noopener noreferrer" class="vw-photo"><img loading="lazy" src="https://drive.google.com/thumbnail?id='+id+'&sz=w800" alt="'+h(g.label)+'"><span>'+h(g.label)+'</span></a>'}
function photoGallery(v){return v.gallery?.length?'<div class="vw-gallery">'+v.gallery.map(sourceThumb).join('')+'</div>':'<p class="vw-muted">Фотографий с телефона пока нет.</p>'}
function budgetTotal(v){const e=estimate(v);return '<div class="vw-budget-boxes"><div><small>По смете / минимум</small><strong>'+rub(e.value)+'</strong></div><div><small>Добавленные доплаты</small><strong>'+rub(extraTotal(v))+'</strong></div><div><small>Суммарный известный бюджет</small><strong>'+rub(e.value===null?null:e.value+extraTotal(v))+'</strong></div></div><p class="vw-muted">Неизвестные позиции не считаются нулевыми. Не добавляйте депозит к уже оплаченному меню второй раз.</p>'}

function external(v){
 return [['Смета или условия',v.quoteSource],['Диск с файлами',v.drive],['Фотографии',v.photos],['Сайт',v.website]].filter(([,url])=>safeUrl(url))
 .map(([label,url])=>'<a href="'+h(safeUrl(url))+'" target="_blank" rel="noopener noreferrer">'+h(label)+' ↗</a>').join('');
}
function status(v){
 const status=v.availability||'unknown';
 return {available:'19 июня — подтверждено',unavailable:'19 июня — занято',pending:'19 июня — уточняется',unknown:'19 июня — неизвестно'}[status]||'19 июня — неизвестно';
}
function tableDateControls(v){
 return '<div class="vw-date-list">'+DATE_CHOICES.map(([day])=>{
  const st=dayStatus(v,day);
  const opts=[['unknown','?'],['available','Свободно'],['pending','Уточнить'],['unavailable','Занято']];
  return '<label class="vw-date-edit vw-day-'+h(st)+'"><span>'+day+'.06</span><select data-list-date="'+day+'" data-venue-id="'+h(v.id)+'" aria-label="'+h(v.name)+' — '+day+' июня 2027">'+opts.map(([value,label])=>'<option value="'+value+'" '+(st===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label>';
 }).join('')+'</div>';
}
function row(v){
 const score=weighted(v),cost=totalEstimate(v),pic=getVenueCover(v);
 const offer=v.offerNote?'<small class="vw-offer-note">'+h(v.offerNote)+'</small>':'';
 const alternate=getVenuePhotos(v).find(p=>p.id!==pic?.id);
 const fallback=alternate?(alternate.src?safeUrl(alternate.src):'https://drive.google.com/thumbnail?id='+encodeURIComponent(alternate.id)+'&sz=w240'):'';
 const image=pic?'<img loading="lazy" class="vw-row-thumb" referrerpolicy="no-referrer" src="'+h(pic.src?safeUrl(pic.src):'https://drive.google.com/thumbnail?id='+encodeURIComponent(pic.id)+'&sz=w240')+'" data-fallback-cover="'+h(fallback)+'" alt="Фото площадки: '+h(v.name)+'">':'<span class="vw-row-thumb vw-no-image"></span>';
 const complete=cost.value!==null&&!cost.partial;
 const amount=cost.value===null?'Не рассчитано':(cost.kind==='planning'?'≈ '+rub(cost.value):complete?rub(cost.value):'от '+rub(cost.value));
 const known=cost.value===null&&cost.knownSubtotal>0?'Известно: '+rub(cost.knownSubtotal)+' (не итог)':'';
 const type=cost.value===null?'Нет полной цены':cost.kind==='planning'?'План с резервами, не КП':complete?'Смета':'Неполный расчёт';
 const missing=cost.missing?.length?'Нет: '+cost.missing.join(', '):'';
 const hint=cost.kind==='planning'?'Техника и сервис — рабочие резервы, не подтверждены площадкой':[known,missing].filter(Boolean).join(' · ')||((cost.quoteDate&&complete)?'На '+cost.quoteDate.slice(8,10)+'.06':'');
 return '<tr class="vw-row'+(v.archived?' is-archived':'')+'" data-id="'+h(v.id)+'"><td><div class="vw-venue-cell"><span class="vw-venue-media"><button type="button" class="vw-image-open" data-detail="'+h(v.id)+'" aria-label="Открыть площадку '+h(v.name)+'">'+image+'</button></span><div class="vw-venue-label"><button class="vw-name" data-detail="'+h(v.id)+'" type="button">'+h(v.name)+'</button><small>'+h(v.area)+' · '+(v.region==='country'?'За городом':'Город')+'</small>'+(v.archived?'<small class="vw-archive-reason" title="'+h(v.archiveReason||'')+'">В архиве</small>':'')+'<button type="button" class="vw-archive-action" data-venue-archive="'+h(v.id)+'" aria-label="'+(v.archived?'Вернуть из архива: ':'Убрать в архив: ')+h(v.name)+'">'+(v.archived?'Вернуть':'В архив')+'</button></div></div></td>'+
 '<td>'+tableDateControls(v)+'</td>'+
 '<td><span class="vw-state '+(v.visited?'vw-seen':'')+'">'+(v.visited?'● Были лично':'○ Не подтверждено')+'</span></td>'+
 '<td class="vw-money'+(complete?' vw-complete':' vw-incomplete')+'" title="'+h(cost.note||'')+'"><strong>'+h(amount)+'</strong><small>'+h(type)+(cost.value!==null?' · '+state.guestCount+' гостей':'')+'</small>'+(hint?'<small class="vw-cost-gap">'+h(hint)+'</small>':'')+offer+'</td>'+
 '<td>'+h(v.capacity??'—')+'</td><td class="vw-score"><a class="vw-score-link" href="#/admin/venues/'+encodeURIComponent(v.id)+'/rating" title="Открыть баллы и причины оценки">'+(score.value===null?'—':score.value+' / '+RATING_MAX)+'</a><small>'+(score.provisional?'Предварительно':'Проверено')+' · '+score.complete+'/'+RATING_CRITERIA.length+' критериев</small></td>'+
 '</tr>';
}
function detail(v){
 const e=estimate(v),s=weighted(v),tab=ui.detailTab||'overview';
 const tabs=[['overview','Обзор'],['photos','Фотографии'],['budget','Бюджет'],['terms','Условия'],['rating','Рейтинг']];
 const qs=(v.quotes||[]),bullets=(title,rows)=>rows?.length?'<div class="vw-detail-block"><h3>'+h(title)+'</h3><ul>'+rows.map(x=>'<li>'+h(x)+'</li>').join('')+'</ul></div>':'';
 const tiles='<div class="vw-quickfacts"><div><span>18 / 19 / 20 июня</span><strong class="vw-date-list">'+threeDates(v)+'</strong></div><div><span>Просмотр</span><strong>'+(v.visited?'Да · есть фото':'Не подтверждён')+'</strong></div><div><span>Вместимость</span><strong>'+h(v.capacityNote||v.capacity||'Уточнить')+'</strong></div></div>';
 let content='';
 if(tab==='overview')content='<div class="vw-detail-grid"><div><div class="vw-detail-block"><h3>Что известно о площадке</h3><p>'+h(v.summary||'Описание нужно дополнить')+'</p>'+tiles+'</div><div class="vw-detail-block"><h3>Фото с телефона</h3>'+photoGallery({...v,gallery:v.gallery.slice(0,4)})+'</div>'+bullets('Что входит',v.included)+'</div><div><div class="vw-detail-block"><h3>Общий бюджет для '+state.guestCount+' гостей</h3>'+budgetTotal(v)+'</div>'+bullets('Что не входит / ограничения',v.excluded)+bullets('Что уточнить',v.questions)+'</div></div>';
 if(tab==='photos')content='<div class="vw-detail-block"><h3>Фотографии осмотра</h3><p>Фотографии открываются в полном размере через Google Drive.</p>'+photoGallery(v)+(v.photos?'<p><a href="'+h(v.photos)+'" target="_blank" rel="noopener noreferrer">Открыть полный альбом по помещениям ↗</a></p>':'')+'</div>';
 if(tab==='budget')content='<div class="vw-detail-block"><h3>Итоговая стоимость для '+state.guestCount+' гостей</h3>'+budgetTotal(v)+'</div>'+
 (qs.length?'<div class="vw-detail-block"><h3>Все полученные варианты сметы</h3><div class="vw-quote-grid">'+qs.map(q=>'<div><span>'+h(q.guests)+' гостей · '+h(q.date||'Дата не установлена')+'</span><strong>'+rub(q.total)+'</strong><small>'+h(q.label||'')+(q.kind==='scenario'?' · сценарий, не смета':'')+'</small></div>').join('')+'</div></div>':'')+
 (v.budgetItems?.length?'<div class="vw-detail-block"><h3>Позиции по исходным материалам</h3><div class="vw-breakdown">'+v.budgetItems.map(([name,value])=>'<div><span>'+h(name)+'</span><strong>'+rub(value)+'</strong></div>').join('')+'</div><p>Некоторые строки относятся к разным вариантам условий; их не всегда следует суммировать.</p></div>':'')+
 '<div class="vw-detail-block"><h3>Дополнительные расходы свадьбы</h3><p>Заполняйте только то, чего ещё нет в смете. Изменения сохраняются в общей базе, доступной на всех устройствах.</p><div class="vw-input-grid">'+EXTRAS.map(([k,label])=>'<label>'+h(label)+'<input type="number" data-venue="'+h(v.id)+'" data-extra="'+k+'" min="0" value="'+h(v.extras?.[k]??'')+'" placeholder="Не рассчитано"></label>').join('')+'</div></div>'+
 '<div class="vw-detail-block"><h3>Ручная корректировка расчёта</h3><p>Для площадок без сметы: аренда + банкет + техника + прочие расходы + обслуживание. Точная смета имеет приоритет для соответствующего числа гостей.</p><div class="vw-input-grid">'+COSTS.map(([k,label])=>'<label>'+h(label)+'<input type="number" data-venue="'+h(v.id)+'" data-cost="'+k+'" min="0" value="'+h(v.cost[k]??'')+'" placeholder="Неизвестно"></label>').join('')+'</div></div>'+bullets('Исключения / неопределённые позиции',v.excluded);
 if(tab==='terms')content='<div class="vw-detail-grid"><div><div class="vw-detail-block"><h3>Условия и договорённости</h3><p>'+h(v.summary||'Неизвестно')+'</p></div>'+bullets('Входит',v.included)+bullets('Доплаты / ограничения',v.excluded)+'</div><div>'+bullets('Открытые вопросы',v.questions)+
 '<div class="vw-detail-block"><h3>Статус</h3><label>Лично смотрели<select data-venue="'+h(v.id)+'" data-field="visited"><option value="true" '+(v.visited?'selected':'')+'>Да</option><option value="false" '+(!v.visited?'selected':'')+'>Не подтверждено</option></select></label>'+DATE_CHOICES.map(([day,label])=>'<label>'+label+' 2027<select data-venue="'+h(v.id)+'" data-day="'+day+'">'+[['unknown','Неизвестно'],['pending','Уточняется'],['available','Свободно подтверждено'],['unavailable','Занято']].map(([k,title])=>'<option value="'+k+'" '+(dayStatus(v,day)===k?'selected':'')+'>'+title+'</option>').join('')+'</select></label>').join('')+'<label>Вместимость <input type="number" min="0" data-venue="'+h(v.id)+'" data-field="capacity" value="'+h(v.capacity??'')+'"></label><h3>Ваши заметки</h3><textarea rows="7" data-venue="'+h(v.id)+'" data-field="notes">'+h(v.notes||'')+'</textarea></div></div></div>';
 if(tab==='rating')content='<div class="vw-detail-block"><h3>Баллы площадки — максимум 100</h3><p>Подтверждённое 19 июня даёт 40 баллов, 18/20 июня — 24. Городское расположение +10. Неизвестные значения не оцениваются.</p><div class="vw-rating-result"><strong>'+(s.value===null?'Недостаточно данных':s.value+' баллов из '+RATING_MAX)+'</strong><span>'+s.complete+'/'+RATING_CRITERIA.length+' критериев известны · '+(s.provisional?'предварительно':'проверено')+'</span></div><div class="vw-breakdown">'+s.breakdown.map(x=>'<div><span>'+h(x.label)+' / '+x.maximum+'</span><strong>'+(x.value===null?'Уточнить':x.value+' баллов')+'</strong></div>').join('')+'</div><div class="vw-rating-grid">'+PERSONAL_CRITERIA.map(([key,label])=>'<label>'+h(label)+'<select data-venue="'+h(v.id)+'" data-rating="'+key+'"><option value="">Не оценивали</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'" '+(Number(v.ratings[key])===n?'selected':'')+'>'+n+' / 5</option>').join('')+'</select></label>').join('')+'</div></div>';
 return '<section class="vw-detail"><header class="vw-detail-head"><div><span class="vw-kicker">'+(v.region==='country'?'ЗАГОРОДНАЯ':'ГОРОДСКАЯ')+' ПЛОЩАДКА</span><h2>'+h(v.name)+'</h2><p>'+h(v.area)+' · '+h(status(v))+'</p></div><button class="vw-close" type="button" data-close aria-label="Закрыть">×</button></header>'+
 '<div class="vw-detail-links">'+external(v)+'</div><nav class="vw-detail-tabs">'+tabs.map(([key,title])=>'<button type="button" data-detail-tab="'+key+'" class="'+(key===tab?'selected':'')+'">'+title+'</button>').join('')+'</nav>'+
 '<div class="vw-tab-content">'+content+'</div></section>';
}
const SORT_DEFAULTS={name:'asc',date:'asc',visit:'asc',price:'asc',capacity:'desc',score:'desc'};
function sortVenues(rows){
 const cmpName=(a,b)=>a.name.localeCompare(b.name,'ru');
 const ordinal={available:0,pending:1,unknown:2,unavailable:3};
 function key(v){
  if(ui.sort==='name')return v.name;
  if(ui.sort==='visit')return v.visited?0:1;
  if(ui.sort==='price'){
   const e=totalEstimate(v);
   return e.value!==null&&(e.isQuote||e.basedOnQuote)?e.value:null;
  }
  if(ui.sort==='capacity')return numbers(v.capacity);
  if(ui.sort==='score')return weighted(v).value;
  if(ui.sort==='date'){const day=ui.dateFilter.split(':')[0];return ui.dateFilter==='all'?datePriority(v):(ordinal[dayStatus(v,day)]??2);}
  return v.name;
 }
 rows.sort((a,b)=>{
  const ak=key(a),bk=key(b);
  // Unknown costs, capacities and ratings always go last, even in descending order.
  if(ak===null||ak===undefined)return bk===null||bk===undefined?cmpName(a,b):1;
  if(bk===null||bk===undefined)return -1;
  const cmp=typeof ak==='string'?ak.localeCompare(bk,'ru'):ak-bk;
  return (ui.sortDir==='desc'?-cmp:cmp)||cmpName(a,b);
 });
 return rows;
}
function matchesDateFilter(v,filter){
 if(filter==='all')return true;
 const [day,status]=filter.split(':');
 return DATE_CHOICES.some(([d])=>d===day)&&['available','unavailable'].includes(status)&&dayStatus(v,day)===status;
}
function visibleVenues(all){
 return sortVenues(all.filter(v=>{
  const e=totalEstimate(v);
  return (ui.archiveFilter==='all'||(ui.archiveFilter==='archived'?!!v.archived:!v.archived))
     &&(ui.kind==='all'||v.region===ui.kind)
    &&matchesDateFilter(v,ui.dateFilter)
    &&(ui.visit==='all'||(ui.visit==='yes')===!!v.visited)
    &&(ui.budget==='all'||(e.isQuote||e.basedOnQuote)&&e.value!==null&&e.value<=Number(ui.budget))
    &&(ui.capacity==='all'||v.capacity>=Number(ui.capacity))
    &&(v.name+' '+v.area).toLowerCase().includes(ui.query.toLowerCase());
 }));
}
function columnHeading(key,label,filters=''){
 const active=ui.sort===key,arrow=!active?'↕':ui.sortDir==='asc'?'↑':'↓';
 return '<th scope="col" aria-sort="'+(active?(ui.sortDir==='asc'?'ascending':'descending'):'none')+'"><button type="button" class="vw-th-sort" data-sort-col="'+key+'" aria-label="Сортировать: '+h(label)+'; '+(active?(ui.sortDir==='asc'?'сейчас по возрастанию':'сейчас по убыванию'):'нажмите для сортировки')+'"><span>'+h(label)+'</span><span class="vw-sort-arrow'+(active?' active':'')+'" aria-hidden="true">'+arrow+'</span></button>'+filters+'</th>';
}
function headerSelect(id,aria,options){
 return '<select class="vw-head-filter" aria-label="'+h(aria)+'" data-ui="'+h(id)+'">'+options.map(([value,label])=>'<option value="'+h(value)+'" '+(ui[id]===value?'selected':'')+'>'+h(label)+'</option>').join('')+'</select>';
}
export function renderVenueAdmin(){
 if(!venueDb.ready){
  const feedback=venueDb.error?'Не удалось загрузить данные из базы: '+h(venueDb.error):'Загрузка данных площадок из базы…';
  return '<div class="vw-page" data-venues-page><div class="vw-panel" role="status" aria-live="polite"><h2>Сравнение площадок</h2><p>'+feedback+'</p><button type="button" data-venue-retry>Повторить загрузку</button></div></div>';
 }

 const match=(typeof location!=='undefined'?location.hash:'').match(/^#\/admin\/venues\/([^/?]+)(?:\/([^/?]+))?/);
 if(match){const next=decodeURIComponent(match[1]);if(ui.expanded!==next){ui.photoSection='all';ui.photoView='gallery';ui.photoIndex=0;ui.photoLightbox=false;}ui.expanded=next;ui.detailTab=match[2]==='edit'?'terms':(match[2]||'overview');}else{ui.expanded=null;ui.photoLightbox=false;}
 const all=PUBLIC_VENUES.map(get);
 const archivedCount=all.filter(v=>v.archived).length;
 const activeCount=all.length-archivedCount;
 const visited=all.filter(v=>v.visited).length;
 const full=all.filter(v=>weighted(v).value!==null&&!weighted(v).provisional).length;
 const list=visibleVenues(all);
 const detailVenue=all.find(v=>v.id===ui.expanded);
 if(match&&detailVenue){
   return '<div class="vw-page" data-venues-page>'+renderVenueNewPage(detailVenue,{guests:state.guestCount,ui,estimate,extraTotal,dayStatus,dayText,weighted})+'</div>';
  }
 return '<div class="vw-page vw-control-board" data-venues-page>'+
  '<div class="vw-control-head admin-page-heading"><div><h1>Площадки <span>'+activeCount+'</span></h1><p>19 июня — приоритет · 18 и 20 июня — альтернативы</p></div><div class="vw-control-facts"><span>'+visited+' осмотрено</span><span>'+all.filter(v=>!v.archived&&DATE_CHOICES.some(([d])=>dayStatus(v,d)==='available')).length+' со свободной датой</span><span>'+archivedCount+' в архиве</span></div></div>'+
  '<div class="vw-panel vw-table-panel"><div class="vw-panel-title vw-table-panel-title"><div><h2>Управление площадками</h2><span><b data-venues-visible>'+list.length+'</b> из '+(ui.archiveFilter==='active'?activeCount:ui.archiveFilter==='archived'?archivedCount:all.length)+'</span></div><div class="vw-table-tools"><label class="vw-compact-control">Список <select data-ui="archiveFilter" aria-label="Показывать площадки">'+[['active','Активные'],['archived','Архив'],['all','Все']].map(([id,label])=>'<option value="'+id+'" '+(ui.archiveFilter===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label class="vw-compact-control">Гостей <input data-state="guestCount" type="number" min="1" max="300" step="1" value="'+state.guestCount+'" aria-label="Число гостей для пересчёта смет"></label><input type="search" data-ui="query" value="'+h(ui.query)+'" placeholder="Найти площадку" aria-label="Поиск площадки (Enter)"><button type="button" data-clear-filters>Сбросить</button></div></div>'+
  '<div class="vw-scroll" role="region" tabindex="0" aria-label="Таблица площадок, прокрутка по горизонтали"><table class="vw-table vw-table-sortable"><thead><tr>'+
  columnHeading('name','Площадка','<div class="vw-head-filter-row">'+headerSelect('kind','Расположение',[['all','Все районы'],['city','Город'],['country','За городом']])+'</div>')+
  columnHeading('date','18 / 19 / 20 июня',headerSelect('dateFilter','Доступность по дате',[['all','Все даты'],['19:available','19 июня · свободно'],['19:unavailable','19 июня · занято'],['18:available','18 июня · свободно'],['18:unavailable','18 июня · занято'],['20:available','20 июня · свободно'],['20:unavailable','20 июня · занято']]))+
  columnHeading('visit','Осмотр',headerSelect('visit','Фильтр по осмотру',[['all','Все'],['yes','Были лично'],['no','Не подтверждено']]))+
  columnHeading('price','Бюджет',headerSelect('budget','Верхняя граница бюджета',[['all','Любой бюджет'],['650000','До 650 тыс.'],['800000','До 800 тыс.'],['1000000','До 1 млн'],['1200000','До 1,2 млн']]))+
  columnHeading('capacity','Вместимость',headerSelect('capacity','Минимальная вместимость',[['all','Все'],['80','80+ гостей'],['100','100+ гостей']]))+
  columnHeading('score','Рейтинг')+
  '</tr></thead><tbody>'+list.map(row).join('')+'</tbody></table></div>'+(list.length?'':'<p class="vw-empty">Нет площадок по выбранным фильтрам.</p>')+'</div>'+
  '</div>';
}
function redraw(root){
 const el=root.querySelector('[data-venues-page]');if(!el)return;
 const y=typeof window!=='undefined'?window.scrollY:0;
 const tableScroll=root.querySelector('.vw-scroll')?.scrollLeft??0;
 const categoryScroll=root.querySelector('.vdp-photo-categories')?.scrollLeft??0;
 const stripScroll=root.querySelector('.vdp-filmstrip')?.scrollLeft??0;
 el.outerHTML=renderVenueAdmin();
 hydrateVenueFiles(root);
 const boardScroll=root.querySelector('.vw-scroll');if(boardScroll)boardScroll.scrollLeft=tableScroll;
 const n=root.querySelector('[data-state="guestCount"]');if(n)n.value=String(state.guestCount);
 for(const [key,v] of [['archiveFilter',ui.archiveFilter],['kind',ui.kind],['sort',ui.sort],['dateFilter',ui.dateFilter],['visit',ui.visit],['budget',ui.budget],['capacity',ui.capacity]]){
  const x=root.querySelector('[data-ui="'+key+'"]');if(x)x.value=v;
 }
 for(const s of root.querySelectorAll('select[data-field="availability"]')){
  const base=PUBLIC_VENUES.find(x=>x.id===s.dataset.venue);if(base)s.value=get(base).availability||'unknown';
 }
 const categories=root.querySelector('.vdp-photo-categories');if(categories)categories.scrollLeft=categoryScroll;
 const strip=root.querySelector('.vdp-filmstrip');
 if(strip){
  strip.scrollLeft=stripScroll;
  const active=strip.querySelector('.vdp-thumb.is-active');
  if(active){
   const a=active.getBoundingClientRect(),b=strip.getBoundingClientRect();
   if(a.left<b.left||a.right>b.right)strip.scrollLeft+=a.left-b.left+(a.width-b.width)/2;
  }
 }
 if(typeof document!=='undefined'){
  document.documentElement.style.overflow=ui.photoLightbox?'hidden':'';
  const close=root.querySelector('[data-photo-close]');if(close)close.focus({preventScroll:true});
 }
 if(typeof window!=='undefined'&&Number.isFinite(y))window.scrollTo({top:y,behavior:'instant'});
}
let stopVenueAutoSync=null;
export function activateVenueAdmin(root){
 stopVenueAutoSync?.();
 const refresh=()=>{
  if(document.visibilityState!=='visible'||!root.querySelector('[data-venues-page]')||!venueDb.ready)return;
  // Never replace an inline editor or an unfinished save from another refresh.
  if(root.querySelector('.vdp-inline-form,.vdp-inline-quote-form,.vdp-inline-quote-editor'))return;
  const active=document.activeElement;
  if(active&&root.contains(active)&&active.matches('input,select,textarea,[contenteditable]'))return;
  initVenueDatabase(root,true);
 };
 const interval=setInterval(()=>{
  if(!root.querySelector('[data-venues-page]'))return;
  refresh();
 },30000);
 const focus=()=>refresh();
 const visible=()=>{if(document.visibilityState==='visible')refresh();};
 window.addEventListener('focus',focus);
 document.addEventListener('visibilitychange',visible);
 stopVenueAutoSync=()=>{clearInterval(interval);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visible);};

 if(root.dataset.venuesReady==='yes'){redraw(root);initVenueDatabase(root,true);return;}
 root.dataset.venuesReady='yes';
 redraw(root);
 initVenueDatabase(root);
 root.addEventListener('click',event=>{
  const target=event.target.closest('[data-detail],[data-close],[data-ui-toggle],[data-detail-tab],[data-sort-col],[data-clear-filters],[data-photo-section],[data-photo-view],[data-photo-open],[data-photo-step],[data-photo-close],[data-venue-inline],[data-inline-quote],[data-add-inline-quote],[data-cancel-inline],[data-remove-venue-quote],[data-venue-retry],[data-venue-archive]');if(!target)return;
  const venueBase=PUBLIC_VENUES.find(x=>x.id===ui.expanded);
  const showError=message=>showAdminToast(message,{kind:'error'});
  if(target.hasAttribute('data-venue-retry')){initVenueDatabase(root,true);}
  else if(target.hasAttribute('data-cancel-inline')){redraw(root);}
   else if(target.hasAttribute('data-venue-archive')){
    const id=target.dataset.venueArchive,base=PUBLIC_VENUES.find(x=>x.id===id);
    if(!venueDb.ready||!base){showError('Общая база недоступна — действие не сохранено.');return;}
    const venue=get(base),archived=!venue.archived;
    if(archived&&!window.confirm('Убрать «'+venue.name+'» из основного списка? В архиве сохранятся фотографии, даты, сметы и заметки.'))return;
    target.disabled=true;
    const next={...(state.venues[id]||{}),archived};
    if(archived&&!venue.archiveReason)next.archiveReason='Убрано из сравнения вручную';
    commitInlineChanges(id,next,root).catch(error=>showError('Не удалось изменить архив: '+error.message));
   }
  else if(target.hasAttribute('data-venue-inline')){
   if(!venueDb.ready){showError('Общая база недоступна. Редактирование не открывается: '+(venueDb.error||'нет соединения'));return}
   if(!venueBase)return;
   if(root.querySelector('.vdp-inline-form,.vdp-inline-quote-form')){showError('Сначала сохраните или отмените открытое изменение.');return}
   buildInlineFieldEditor(target,get(venueBase));
  }
  else if(target.hasAttribute('data-inline-quote')||target.hasAttribute('data-add-inline-quote')){
   if(!venueDb.ready){showError('Общая база недоступна — смету нельзя безопасно сохранить.');return}
   if(!venueBase)return;
   if(root.querySelector('.vdp-inline-form,.vdp-inline-quote-form')){showError('Сначала сохраните или отмените открытое изменение.');return}
   buildInlineQuoteEditor(target.hasAttribute('data-add-inline-quote')?null:target,get(venueBase),
    target.hasAttribute('data-add-inline-quote')?-1:Number(target.dataset.inlineQuote));
  }
  else if(target.hasAttribute('data-remove-venue-quote')){
   const form=target.closest('[data-inline-quote-index]');if(!form)return;
   const index=Number(form.dataset.inlineQuoteIndex);
   if(index<0){redraw(root);return}
   if(!window.confirm('Удалить выбранный вариант сметы из расчётов?'))return;
   if(!venueBase)return;
   const current=get(venueBase),quotes=[...(current.quotes||[])];quotes.splice(index,1);
   target.disabled=true;
   commitInlineChanges(venueBase.id,{...(state.venues[venueBase.id]||{}),quotes},root).catch(()=>{});
  }
  else if(target.hasAttribute('data-photo-close')){ui.photoLightbox=false;redraw(root);}
  else if(target.dataset.photoSection!==undefined){ui.photoSection=target.dataset.photoSection;ui.photoIndex=0;ui.photoLightbox=false;redraw(root);}
  else if(target.dataset.photoView!==undefined){ui.photoView=target.dataset.photoView;ui.photoIndex=0;ui.photoLightbox=false;redraw(root);}
  else if(target.dataset.photoOpen!==undefined){
    ui.photoIndex=Math.max(0,parseInt(target.dataset.photoOpen,10)||0);
    if(!target.closest('.vdp-filmstrip')&&!target.closest('.vdp-lightbox-strip'))ui.photoLightbox=true;
    redraw(root);
  }
  else if(target.dataset.photoStep!==undefined){
    const venue=PUBLIC_VENUES.find(v=>v.id===ui.expanded);
    const photos=venue?filteredVenuePhotos(get(venue),ui):[];
    if(photos.length){ui.photoIndex=(ui.photoIndex+Number(target.dataset.photoStep)+photos.length)%photos.length;redraw(root);}
  }
  else if(target.dataset.sortCol){const key=target.dataset.sortCol;if(ui.sort===key)ui.sortDir=ui.sortDir==='asc'?'desc':'asc';else{ui.sort=key;ui.sortDir=SORT_DEFAULTS[key]||'asc';}redraw(root);}
  else if(target.hasAttribute('data-clear-filters')){Object.assign(ui,{archiveFilter:'active',kind:'all',query:'',dateFilter:'all',budget:'all',visit:'all',capacity:'all'});redraw(root);}
  else if(target.dataset.detail){location.hash='#/admin/venues/'+encodeURIComponent(target.dataset.detail);}else if(target.dataset.detailTab){location.hash='#/admin/venues/'+encodeURIComponent(ui.expanded)+'/'+target.dataset.detailTab;}
  else if(target.hasAttribute('data-close')){location.hash='#/admin/venues';}
  else if(target.dataset.uiToggle){ui.onlyVisited=!ui.onlyVisited;redraw(root);}
 });
 // Retry a second photograph of the same venue if the image CDN blocks hotlinking.
 // A permanent image failure displays a neutral tile, never browser broken-image text.
 root.addEventListener('error',event=>{
  const img=event.target;
  if(!(img instanceof HTMLImageElement)||!img.classList.contains('vw-row-thumb'))return;
  if(img.dataset.coverRetry!=='1'&&img.dataset.fallbackCover){
   img.dataset.coverRetry='1';
   img.src=img.dataset.fallbackCover;
   return;
  }
  img.hidden=true;
  img.closest('.vw-image-open')?.classList.add('vw-photo-unavailable');
 },true);
 // Guest count updates budgets and scores while typing without dropping focus.
 root.addEventListener('input',event=>{
  const t=event.target;
  if(t.dataset.state!=='guestCount')return;
  const count=Number(t.value);
  if(!Number.isInteger(count)||count<1||count>300||count===state.guestCount)return;
  state.guestCount=count;save();
  const tbody=root.querySelector('.vw-table-sortable tbody');
  if(!tbody)return;
  const rows=visibleVenues(PUBLIC_VENUES.map(get));
  tbody.innerHTML=rows.map(row).join('');
  const visible=root.querySelector('[data-venues-visible]');
  if(visible)visible.textContent=String(rows.length);
 });
 // Save the field right where it was displayed, not in a second editor.
 root.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-inline-key],[data-inline-quote-index]');
  if(!form)return;
  event.preventDefault();
  if(form.dataset.saving==='yes')return;
  form.dataset.saving='yes';
  const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
  const base=PUBLIC_VENUES.find(x=>x.id===ui.expanded);
  if(!base){form.dataset.saving='';return}
  try{
   const id=base.id,current=get(base);
   let updates;
   if(form.hasAttribute('data-inline-key')){
     const key=form.dataset.inlineKey,value=form.querySelector('[data-inline-control]')?.value;
     if(key.startsWith('date:')){
      await commitVenueDate(id,key.slice(5),value,root);
      return;
     }
     updates=updateInlineOverrides(id,key,value);
    }else updates={...(state.venues[id]||{}),quotes:collectInlineQuote(form,current)};
    await commitInlineChanges(id,updates,root);
  }catch(error){
   if(form.isConnected){
    let notice=form.querySelector('.vdp-inline-error');
    if(!notice){notice=document.createElement('p');notice.className='vdp-inline-error';notice.setAttribute('role','alert');form.append(notice)}
    notice.textContent='Не сохранено: '+error.message;
   }
  }finally{form.dataset.saving='';if(button&&button.isConnected)button.disabled=false}
 });
 root.addEventListener('change',async event=>{
  const t=event.target;
  if(t.hasAttribute('data-transcript-addon')){
   const base=PUBLIC_VENUES.find(x=>x.id===ui.expanded);
   if(!base||!venueDb.ready){redraw(root);return;}
   const venue=get(base),addonId=t.dataset.transcriptAddon;
   if(!(venue.visitAddons||[]).some(x=>x.id===addonId)){redraw(root);return;}
   const update={...(state.venues[base.id]||{}),
     visitSelectedAddons:{...(venue.visitSelectedAddons||{}),[addonId]:t.checked}};
   t.disabled=true;
   try{await commitInlineChanges(base.id,update,root);}
   catch(error){redraw(root);}
   finally{if(t.isConnected)t.disabled=false;}
   return;
  }
  if(t.dataset.listDate){
   t.disabled=true;
   try{await commitVenueDate(t.dataset.venueId,t.dataset.listDate,t.value,root);}
   catch(error){redraw(root);showAdminToast('Не сохранено: '+error.message,{kind:'error'});}
   finally{if(t.isConnected)t.disabled=false;}
   return;
  }
  if(t.hasAttribute('data-photo-sort')){ui.photoSort=t.value;ui.photoIndex=0;redraw(root);return;}
  if(t.matches('select[data-inline-control]')){t.closest('form')?.requestSubmit();return;}
  if(t.dataset.state==='guestCount'){state.guestCount=Math.max(1,Math.min(300,Number(t.value)||80));save();redraw(root);return;}
  if(t.dataset.ui){ui[t.dataset.ui]=t.value;redraw(root);return;}
  if(t.dataset.venue){
   const id=t.dataset.venue,old=state.venues[id]||{};
   if(!venueDb.ready){redraw(root);return;}
   t.disabled=true;
   try{
    if(t.dataset.day){
     await commitVenueDate(id,t.dataset.day,t.value,root);
     return;
    }
    let changes={...old};
    if(t.dataset.field){
     const val=t.dataset.field==='visited'?t.value==='true':t.dataset.field==='capacity'?numbers(t.value):t.value;
     changes[t.dataset.field]=val;
    }else if(t.dataset.cost){changes.cost={...old.cost,[t.dataset.cost]:numbers(t.value)};}
    else if(t.dataset.extra){changes.extras={...old.extras,[t.dataset.extra]:numbers(t.value)};}
    else if(t.dataset.rating){changes.ratings={...old.ratings,[t.dataset.rating]:t.value?Number(t.value):null};}
    else return;
    await commitInlineChanges(id,changes,root);
   }catch(error){
    redraw(root);
    showAdminToast('Не сохранено в общей базе: '+error.message,{kind:'error'});
   }finally{if(t.isConnected)t.disabled=false;}
  }
 });
 document.addEventListener('keydown',event=>{
   if(!ui.photoLightbox)return;
   if(event.key==='Escape'){event.preventDefault();ui.photoLightbox=false;redraw(root);return;}
   if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
     const venue=PUBLIC_VENUES.find(v=>v.id===ui.expanded),photos=venue?filteredVenuePhotos(get(venue),ui):[];
     if(photos.length){event.preventDefault();ui.photoIndex=(ui.photoIndex+(event.key==='ArrowRight'?1:-1)+photos.length)%photos.length;redraw(root);}
   }
 });
 let touchX=null;
 root.addEventListener('touchstart',event=>{if(ui.photoLightbox&&event.target.closest('.vdp-lightbox'))touchX=event.changedTouches[0]?.clientX??null;},{passive:true});
 root.addEventListener('touchend',event=>{
   if(!ui.photoLightbox||touchX===null)return;
   const endX=event.changedTouches[0]?.clientX??touchX,diff=endX-touchX;touchX=null;
   if(Math.abs(diff)<60)return;
   const venue=PUBLIC_VENUES.find(v=>v.id===ui.expanded),photos=venue?filteredVenuePhotos(get(venue),ui):[];
   if(photos.length){ui.photoIndex=(ui.photoIndex+(diff<0?1:-1)+photos.length)%photos.length;redraw(root);}
 },{passive:true});
 // Search re-renders only when Enter is pressed or focus leaves input.
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&event.target.closest('.vdp-inline-form,.vdp-inline-quote-form')){event.preventDefault();redraw(root);return;}
  if(event.key==='Escape'&&ui.expanded&&!ui.photoLightbox){location.hash='#/admin/venues';}
  if(event.key==='Enter'&&event.target.matches('[data-ui="query"]')){event.preventDefault();ui.query=event.target.value;redraw(root);}
 });
}
