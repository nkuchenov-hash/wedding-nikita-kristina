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
import {renderVenueNewPage,renderVenueQuoteEditorRow,filteredVenuePhotos,getVenuePhotos,getVenueCover,getVenueCoverCandidates} from './venue-detail-ui.js';
import {hydrateVenueFiles} from './venue-files-ui.js';
import {estimateVenue,summarizeVenueBudget,scoreVenue,OBJECTIVE_CRITERIA,DEFAULT_RATING_RULES,validateRatingRules,migrateRatingRules,RATING_CRITERIA,RATING_MAX} from './venue-evaluation.js';
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
let ratingRules=DEFAULT_RATING_RULES;
const effectiveRatingRules=()=>validateRatingRules(ui.ratingDraft)||ratingRules;
let ui={mobileFilters:false,archiveFilter:'active',kind:'all',query:'',sort:'score',sortDir:'desc',expanded:null,detailTab:'overview',dateFilter:'all',budget:'all',visit:'all',capacity:'all',photoSection:'all',photoView:'gallery',photoSort:'original',photoIndex:0,photoLightbox:false,ratingDrawer:false,ratingDraft:null,ratingDirty:false};
const h=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=(v)=>typeof v==='number'&&Number.isFinite(v)?Math.round(v).toLocaleString('ru-RU')+' ₽':'—';
const safeUrl=(v)=>{try{const u=new URL(String(v));return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}};
const get=(base)=>{
 const d=VENUE_RECORDS[base.id]||{},edit=state.venues[base.id]||{};
 const dates=venueDb.dates.get(base.id)||{};
 const dateAvailability=Object.fromEntries(['18','19','20'].map(day=>[day,dates[day]||'unknown']));
 return {...base,...d,...edit,cost:{...(base.publiclyAdvertised||{}),...(base.cost||{}),...(d.cost||{}),...(edit.cost||{})},
  ratings:{...(edit.ratings||{})},ratingFacts:{...(d.ratingFacts||{}),...(edit.ratingFacts||{})},extras:{...(edit.extras||{})},
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
  const [session,data,availability,settingsResponse]=await Promise.all([
   venueApi('auth/session'),venueApi('admin/records?collection=venues'),venueApi('admin/venue-dates'),venueApi('admin/settings')
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
  const serverRules=migrateRatingRules(settingsResponse.settings?.venue_rating_rules)||DEFAULT_RATING_RULES;
  changed=JSON.stringify(ratingRules)!==JSON.stringify(serverRules)||
    JSON.stringify(state.venues)!==JSON.stringify(incoming)||
    JSON.stringify([...venueDb.dates].sort())!==JSON.stringify([...dates].sort());
  // Only server responses populate venue state. Browser caches guestCount only.
  state.venues=incoming;
  ratingRules=serverRules;
  if(!ui.ratingDirty)ui.ratingDraft=null;
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
// Reuse exactly the same venue records, date statuses, rating and price scenario as the comparison.
export async function loadVenueBudgetOptions(root,guests){
 await initVenueDatabase(root,true);
 if(!venueDb.ready||venueDb.error)throw Error(venueDb.error||'Площадки недоступны');
 return PUBLIC_VENUES.map(get).filter(v=>!v.archived).map(v=>({id:v.id,name:v.name,estimate:estimateVenue(v,guests)}));
}
export async function loadVenueDashboard(root){
 await initVenueDatabase(root,true);
 if(!venueDb.ready||venueDb.error)throw Error(venueDb.error||'Площадки недоступны');
 const all=PUBLIC_VENUES.map(get),active=all.filter(v=>!v.archived);
 const leaders=active.map(v=>({id:v.id,name:v.name,score:weighted(v).value,date19:dayStatus(v,'19')}))
  .filter(v=>v.score!==null).sort((a,b)=>compareVenueScoreValues(a.score,b.score,'desc')).slice(0,3);
 return {active:active.length,archived:all.length-active.length,available19:active.filter(v=>dayStatus(v,'19')==='available').length,leaders,venues:all.map(v=>({id:v.id,name:v.name}))};
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
function budgetSummary(v){return summarizeVenueBudget(v,state.guestCount,extraTotal(v))}
function totalEstimate(v){return budgetSummary(v).scoreCost}
function weighted(v){return scoreVenue(v,state.guestCount,totalEstimate(v),effectiveRatingRules());}
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
 const alternate=getVenueCoverCandidates(v).find(p=>p.id!==pic?.id);
 const fallback=alternate?(alternate.src?safeUrl(alternate.src):'https://drive.google.com/thumbnail?id='+encodeURIComponent(alternate.id)+'&sz=w800'):'';
 const image=pic?'<img loading="lazy" class="vw-row-thumb" referrerpolicy="no-referrer" src="'+h(pic.src?safeUrl(pic.src):'https://drive.google.com/thumbnail?id='+encodeURIComponent(pic.id)+'&sz=w800')+'" data-fallback-cover="'+h(fallback)+'" alt="Фото площадки: '+h(v.name)+'">':'<span class="vw-row-thumb vw-no-image"></span>';
 const complete=cost.value!==null&&!cost.partial;
 const amount=cost.value===null?'Не рассчитано':(cost.kind==='planning'?'≈ '+rub(cost.value):complete?rub(cost.value):'от '+rub(cost.value));
 const known=cost.value===null&&cost.knownSubtotal>0?'Известно: '+rub(cost.knownSubtotal)+' (не итог)':'';
 const type=cost.value===null?'Нет достаточных тарифов':cost.kind==='planning'?'Рабочая смета':complete?'Полученное КП':cost.kind==='minimum'?'Минимум по тарифам':cost.kind==='estimate'?'Оценка по предложению':'Предварительная оценка';
 const missing=cost.missing?.length?'Нет: '+cost.missing.join(', '):'';
 const hint=cost.kind==='planning'?'Выбранный сценарий с отмеченными допущениями, не КП':[known,missing].filter(Boolean).join(' · ')||((cost.quoteDate&&complete)?'На '+cost.quoteDate.slice(8,10)+'.06':'');
 return '<tr class="vw-row'+(v.archived?' is-archived':'')+'" data-id="'+h(v.id)+'"><td><div class="vw-venue-cell"><span class="vw-venue-media"><button type="button" class="vw-image-open" data-detail="'+h(v.id)+'" aria-label="Открыть площадку '+h(v.name)+'">'+image+'</button></span><div class="vw-venue-label"><button class="vw-name" data-detail="'+h(v.id)+'" type="button">'+h(v.name)+'</button><small>'+h(v.area)+' · '+(v.region==='country'?'За городом':'Город')+'</small>'+(v.archived?'<a class="vw-archive-reason" data-open-archive href="#/admin/venues/archive" title="'+h(v.archiveReason||'')+'">В архиве</a>':'')+'<button type="button" class="vw-archive-action" data-venue-archive="'+h(v.id)+'" aria-label="'+(v.archived?'Вернуть из архива: ':'Убрать в архив: ')+h(v.name)+'">'+(v.archived?'Вернуть':'В архив')+'</button></div></div></td>'+
 '<td>'+tableDateControls(v)+'</td>'+
 '<td><span class="vw-state '+(v.visited?'vw-seen':'')+'">'+(v.visited?'● Были лично':'○ Не подтверждено')+'</span></td>'+
 '<td class="vw-money'+(complete?' vw-complete':' vw-incomplete')+'" title="'+h(cost.note||'')+'"><strong>'+h(amount)+'</strong><small>'+h(type)+(cost.value!==null?' · '+state.guestCount+' гостей':'')+'</small>'+(hint?'<small class="vw-cost-gap">'+h(hint)+'</small>':'')+offer+'</td>'+
 '<td>'+h(v.capacity??'—')+'</td><td class="vw-score"><a class="vw-score-link" href="#/admin/venues/'+encodeURIComponent(v.id)+'/rating" title="Открыть баллы и причины оценки">'+(score.value===null?'—':score.value+' / '+RATING_MAX)+'</a><small>'+(score.provisional?'Предварительно':'Проверено')+' · '+score.complete+'/'+RATING_CRITERIA.length+' критериев</small></td>'+
 '</tr>';
}
// Venue detail rendering is centralized in venue-detail-ui.js.
const SORT_DEFAULTS={name:'asc',date:'asc',visit:'asc',price:'asc',capacity:'desc',score:'desc'};
export const VENUE_DEFAULT_SORT=Object.freeze({sort:'score',sortDir:'desc'});
// Keep unknown ratings last, regardless of ascending/descending user choice.
export function compareVenueScoreValues(left,right,direction='desc'){
 const a=typeof left==='number'&&Number.isFinite(left)?left:null;
 const b=typeof right==='number'&&Number.isFinite(right)?right:null;
 if(a===null)return b===null?0:1;
 if(b===null)return -1;
 return direction==='asc'?a-b:b-a;
}
let lastVenueListRoute=null;
function applyListDefaultSort(route){
 if(route!==lastVenueListRoute){
  ui.sort=VENUE_DEFAULT_SORT.sort;
  ui.sortDir=VENUE_DEFAULT_SORT.sortDir;
  lastVenueListRoute=route;
 }
}
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
  if(ui.sort==='score'){
   const byRating=compareVenueScoreValues(weighted(a).value,weighted(b).value,ui.sortDir);
   return byRating||cmpName(a,b);
  }
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
function ratingMethodPage(){
 return '<div class="vw-page vw-method-page" data-venues-page>'+
  '<a href="#/admin/venues" class="vw-method-back">← Все площадки</a>'+
  '<section class="vw-panel vw-method-panel"><h1>Настройка рейтинга</h1>'+
  '<p>Все критерии теперь объективные. Общие веса, ценовые пороги и условия начисления редактируются в панели справа на главной странице площадок — кнопка «Настроить рейтинг» сразу после «В архиве».</p>'+
  '<p>Подтверждение фактов по отдельной площадке доступно во вкладке «Рейтинг» её карточки.</p>'+
  '<a class="vw-method-back" href="#/admin/venues">Перейти к настройке рейтинга</a></section></div>';
}
function cloneRatingRules(x){return JSON.parse(JSON.stringify(x))}
function ratingWeightTotal(x){return Object.values(x.weights).reduce((a,b)=>a+(Number(b)||0),0)}
function ratingDrawer(){
 if(!ui.ratingDrawer)return '';
 const x=ui.ratingDraft||ratingRules,sum=ratingWeightTotal(x);
 const criteria=RATING_CRITERIA.map(([key,name])=>{
  const f=OBJECTIVE_CRITERIA.find(z=>z.key===key);
  const tip=f?f.question:key==='date'?'19 июня — полный вес, 18/20 — его доля.':key==='cost'?'Общий бюджет на выбранное число гостей.':key==='capacity'?'Вмещаются все гости.':'Город или за городом.';
  return '<label class="vw-rating-rule"><span><b>'+h(name)+'</b><small>'+h(tip)+'</small></span><input type="number" min="0" max="100" data-rating-weight="'+key+'" value="'+h(x.weights[key])+'"></label>';
 }).join('');
 const limits=x.priceLimits.map((v,i)=>'<label class="vw-rating-rule small"><span>Граница '+(i+1)+', ₽</span><input type="number" data-rating-limit="'+i+'" min="10000" step="10000" value="'+h(v)+'"></label>').join('');
 const shares=x.pricePercents.map((v,i)=>'<label class="vw-rating-rule small"><span>'+(i===4?'Выше всех границ':'Диапазон '+(i+1))+', %</span><input type="number" data-rating-percent="'+i+'" min="0" max="100" value="'+h(v)+'"></label>').join('');
 return '<div class="vw-rating-overlay" data-rating-backdrop><aside class="vw-rating-drawer" role="dialog" aria-modal="true" aria-labelledby="vw-rating-title">'+
 '<header class="vw-rating-drawer-header"><div><h2 id="vw-rating-title">Настройка рейтинга</h2></div><button data-rating-close type="button" aria-label="Закрыть">×</button></header>'+
 '<form data-rating-form><div class="vw-rating-drawer-body"><p>Веса и пороги меняются для всех площадок. Факты оцениваются одинаково: подтверждено «Да» или «Нет», либо «Неизвестно».</p>'+
 '<div class="vw-rating-weights-title"><h3>Веса критериев</h3><strong data-rating-total class="'+(sum===100?'valid':'invalid')+'">'+sum+' / 100</strong></div>'+
 criteria+'<h3>Пороги и дополнительные правила</h3>'+
 '<label class="vw-rating-rule small"><span>18/20 июня: % от веса даты</span><input type="number" data-rating-alternative min="0" max="100" value="'+h(x.alternativeDatePercent)+'"></label>'+
 '<div class="vw-rating-price-columns"><section><h4>Порог стоимости</h4>'+limits+'</section><section><h4>Доля баллов</h4>'+shares+'</section></div>'+
 '<label class="vw-rating-check"><input type="checkbox" data-rating-working '+(x.includeWorkingBudgets?'checked':'')+'><span>Учитывать рабочие сметы с допущениями (рейтинг останется предварительным)</span></label>'+
 '<p class="vw-rating-description">Для каждой площадки ответы «Да / Нет / Неизвестно» редактируются во вкладке «Рейтинг». Неподтверждённое не считается ни плюсом, ни минусом.</p></div>'+
 '<footer class="vw-rating-drawer-footer"><span data-rating-validation>'+(sum===100?'':'Сумма весов должна быть ровно 100')+'</span>'+
 '<button type="button" data-rating-defaults>По умолчанию</button><button class="vw-rating-save" type="submit" '+(validateRatingRules(x)?'':'disabled')+'>Сохранить и пересчитать</button></footer></form></aside></div>';
}
export function renderVenueAdmin(){
 if(typeof location!=='undefined'&&/^#\/admin\/venues\/rating-method\/?$/.test(location.hash))return ratingMethodPage();
 if(!venueDb.ready){
  const feedback=venueDb.error?'Не удалось загрузить данные из базы: '+h(venueDb.error):'Загрузка данных площадок из базы…';
  return '<div class="vw-page" data-venues-page><div class="vw-panel" role="status" aria-live="polite"><h2>Сравнение площадок</h2><p>'+feedback+'</p><button type="button" data-venue-retry>Повторить загрузку</button></div></div>';
 }

 const route=typeof location!=='undefined'?location.hash:'';
 const availableRoute=/^#\/admin\/venues\/available\/?$/.test(route);
 const archiveRoute=/^#\/admin\/venues\/archive\/?$/.test(route);
 const allRoute=/^#\/admin\/venues\/all\/?$/.test(route);
 const ratingMethodRoute=/^#\/admin\/venues\/rating-method\/?$/.test(route);
 const activeRoute=/^#\/admin\/venues\/?$/.test(route);
 const changedListRoute=lastVenueListRoute!==route;
 if(archiveRoute||allRoute||activeRoute||availableRoute)applyListDefaultSort(route);
 if(availableRoute&&changedListRoute)Object.assign(ui,{archiveFilter:'active',kind:'all',query:'',dateFilter:'19:available',visit:'all',budget:'all',capacity:'all'});
 else if(activeRoute&&changedListRoute&&ui.dateFilter==='19:available')ui.dateFilter='all';
 if(archiveRoute&&ui.archiveFilter!=='archived')
  Object.assign(ui,{archiveFilter:'archived',kind:'all',query:'',dateFilter:'all',budget:'all',visit:'all',capacity:'all'});
 else if(allRoute)ui.archiveFilter='all';
 else if(activeRoute)ui.archiveFilter='active';
 const match=archiveRoute||allRoute||ratingMethodRoute||availableRoute?null:route.match(/^#\/admin\/venues\/([^/?]+)(?:\/([^/?]+))?/);
 if(match){const next=decodeURIComponent(match[1]);if(ui.expanded!==next){ui.photoSection='all';ui.photoView='gallery';ui.photoIndex=0;ui.photoLightbox=false;}ui.expanded=next;ui.detailTab=match[2]==='edit'?'terms':(match[2]||'overview');}else{ui.expanded=null;ui.photoLightbox=false;}
 const all=PUBLIC_VENUES.map(get);
 const archivedCount=all.filter(v=>v.archived).length;
 const activeCount=all.length-archivedCount;
 const list=visibleVenues(all);
 const detailVenue=all.find(v=>v.id===ui.expanded);
 if(match&&detailVenue){
   return '<div class="vw-page" data-venues-page>'+renderVenueNewPage(detailVenue,{guests:state.guestCount,ui,estimate,extraTotal,budgetSummary,dayStatus,dayText,weighted})+ratingDrawer()+'</div>';
  }
 if(ratingMethodRoute)return ratingMethodPage();
 return '<div class="vw-page vw-control-board" data-venues-page>'+
  '<div class="vw-control-head admin-page-heading"><div><h1>Площадки</h1></div><div class="vw-control-facts"><button type="button" class="vw-rating-trigger" data-rating-open>Настроить рейтинг</button></div></div>'+
  '<div class="vw-panel vw-table-panel"><div class="vw-panel-title vw-table-panel-title"><div class="vw-list-count" aria-label="Количество площадок"><span><b data-venues-visible>'+list.length+'</b> из '+(ui.archiveFilter==='active'?activeCount:ui.archiveFilter==='archived'?archivedCount:all.length)+'</span></div><div class="vw-table-tools"><select class="vw-list-select" data-ui="archiveFilter" aria-label="Показывать площадки">'+[['active','Активные'],['archived','Архив'],['all','Все']].map(([id,label])=>'<option value="'+id+'" '+(ui.archiveFilter===id?'selected':'')+'>'+label+'</option>').join('')+'</select><label class="vw-compact-control vw-guest-control">Гостей <input data-state="guestCount" type="number" min="1" max="300" step="1" value="'+state.guestCount+'" aria-label="Число гостей для пересчёта смет"></label><input type="search" data-ui="query" value="'+h(ui.query)+'" placeholder="Найти площадку" aria-label="Поиск площадки (Enter)"><button type="button" data-clear-filters>Сбросить</button></div></div>'+
  '<div class="vw-scroll" role="region" tabindex="0" aria-label="Список площадок"><input class="vw-mobile-filter-toggle" type="checkbox" id="vw-mobile-filters"'+(ui.mobileFilters?' checked':'')+'><label class="vw-mobile-filter-label" for="vw-mobile-filters">Фильтры и сортировка</label><table class="vw-table vw-table-sortable"><thead><tr>'+
  columnHeading('name','Площадка','<div class="vw-head-filter-row">'+headerSelect('kind','Расположение',[['all','Все районы'],['city','Город'],['country','За городом']])+'</div>')+
  columnHeading('date','18 / 19 / 20 июня',headerSelect('dateFilter','Доступность по дате',[['all','Все даты'],['19:available','19 июня · свободно'],['19:unavailable','19 июня · занято'],['18:available','18 июня · свободно'],['18:unavailable','18 июня · занято'],['20:available','20 июня · свободно'],['20:unavailable','20 июня · занято']]))+
  columnHeading('visit','Осмотр',headerSelect('visit','Фильтр по осмотру',[['all','Все'],['yes','Были лично'],['no','Не подтверждено']]))+
  columnHeading('price','Бюджет',headerSelect('budget','Верхняя граница бюджета',[['all','Любой бюджет'],['650000','До 650 тыс.'],['800000','До 800 тыс.'],['1000000','До 1 млн'],['1200000','До 1,2 млн']]))+
  columnHeading('capacity','Вместимость',headerSelect('capacity','Минимальная вместимость',[['all','Все'],['80','80+ гостей'],['100','100+ гостей']]))+
  columnHeading('score','Рейтинг')+
  '</tr></thead><tbody>'+list.map(row).join('')+'</tbody></table></div>'+(list.length?'':'<p class="vw-empty">Нет площадок по выбранным фильтрам.</p>')+'</div>'+
  ratingDrawer()+'</div>';
}
function redraw(root){
 const el=root.querySelector('[data-venues-page]');if(!el)return;
 const y=typeof window!=='undefined'?window.scrollY:0;
 const mobileFilter=root.querySelector('#vw-mobile-filters');if(mobileFilter)ui.mobileFilters=mobileFilter.checked;
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
  document.documentElement.style.overflow=(ui.photoLightbox||ui.ratingDrawer)?'hidden':'';
  const close=root.querySelector('[data-photo-close]');if(close)close.focus({preventScroll:true});
 }
 if(typeof window!=='undefined'&&Number.isFinite(y))window.scrollTo({top:y,behavior:'instant'});
}
let stopVenueAutoSync=null;
export function activateVenueAdmin(root){
 stopVenueAutoSync?.();
 let lastInteraction=0;
 const markInteraction=()=>{lastInteraction=Date.now()};
 root.addEventListener('touchstart',markInteraction,{passive:true});
 root.addEventListener('touchmove',markInteraction,{passive:true});
 const refresh=()=>{
  if(document.visibilityState!=='visible'||!root.querySelector('[data-venues-page]')||!venueDb.ready||Date.now()-lastInteraction<1800)return;
  // Never replace an inline editor or an unfinished save from another refresh.
  if(ui.ratingDrawer||root.querySelector('.vdp-inline-form,.vdp-inline-quote-form,.vdp-inline-quote-editor'))return;
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
 stopVenueAutoSync=()=>{root.removeEventListener('touchstart',markInteraction);root.removeEventListener('touchmove',markInteraction);clearInterval(interval);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visible);};

 if(root.dataset.venuesReady==='yes'){redraw(root);initVenueDatabase(root,true);return;}
 root.dataset.venuesReady='yes';
 redraw(root);
 initVenueDatabase(root);
 root.addEventListener('click',event=>{
  const target=event.target.closest('[data-detail],[data-close],[data-ui-toggle],[data-detail-tab],[data-sort-col],[data-clear-filters],[data-photo-section],[data-photo-view],[data-photo-open],[data-photo-step],[data-photo-close],[data-venue-inline],[data-inline-quote],[data-add-inline-quote],[data-cancel-inline],[data-remove-venue-quote],[data-venue-retry],[data-venue-archive],[data-open-archive],[data-rating-open],[data-rating-close],[data-rating-backdrop],[data-rating-defaults]');if(!target)return;
  const venueBase=PUBLIC_VENUES.find(x=>x.id===ui.expanded);
  const showError=message=>showAdminToast(message,{kind:'error'});
  if(target.hasAttribute('data-rating-open')){
   ui.ratingDrawer=true;ui.ratingDraft=cloneRatingRules(ratingRules);ui.ratingDirty=false;
   redraw(root);root.querySelector('[data-rating-close]')?.focus();
  }else if(target.hasAttribute('data-rating-close')||(target.hasAttribute('data-rating-backdrop')&&event.target===target)){
   if(ui.ratingDirty&&!window.confirm('Закрыть без сохранения правил рейтинга?'))return;
   ui.ratingDrawer=false;ui.ratingDraft=null;ui.ratingDirty=false;redraw(root);
  }else if(target.hasAttribute('data-rating-defaults')){
   ui.ratingDraft=cloneRatingRules(DEFAULT_RATING_RULES);ui.ratingDirty=true;redraw(root);
  }else if(target.hasAttribute('data-open-archive')){
   event.preventDefault();
   Object.assign(ui,{archiveFilter:'archived',kind:'all',query:'',dateFilter:'all',budget:'all',visit:'all',capacity:'all'});
   if(location.hash!=='#/admin/venues/archive')location.hash='#/admin/venues/archive';
   else redraw(root);
  }
  else if(target.hasAttribute('data-venue-retry')){initVenueDatabase(root,true);}
  else if(target.hasAttribute('data-cancel-inline')){redraw(root);}
   else if(target.hasAttribute('data-venue-archive')){
    const id=target.dataset.venueArchive,base=PUBLIC_VENUES.find(x=>x.id===id);
    if(!venueDb.ready||!base){showError('Общая база недоступна — действие не сохранено.');return;}
    const venue=get(base),archived=!venue.archived;
    if(archived&&!window.confirm('Убрать «'+venue.name+'» из основного списка? В архиве сохранятся фотографии, даты, сметы и заметки.'))return;
    target.disabled=true;
    const next={...(state.venues[id]||{}),archived};
    if(archived&&!venue.archiveReason)next.archiveReason='Убрано из сравнения вручную';
    commitInlineChanges(id,next,root).then(()=>{
     showAdminToast(archived?'Площадка перенесена в архив.':'Площадка возвращена в основной список.',{
      action:archived?{label:'Открыть архив',onClick:()=>{location.hash='#/admin/venues/archive';}}:null
     });
    }).catch(error=>showError('Не удалось изменить архив: '+error.message));
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
  if(ui.ratingDrawer&&(t.hasAttribute('data-rating-weight')||t.hasAttribute('data-rating-limit')||
   t.hasAttribute('data-rating-percent')||t.hasAttribute('data-rating-alternative')||
   t.hasAttribute('data-rating-working'))){
   const x=ui.ratingDraft||(ui.ratingDraft=cloneRatingRules(ratingRules));
   const number=t.value===''?NaN:Number(t.value);
   if(t.hasAttribute('data-rating-weight'))x.weights[t.dataset.ratingWeight]=number;
   if(t.hasAttribute('data-rating-limit'))x.priceLimits[Number(t.dataset.ratingLimit)]=number;
   if(t.hasAttribute('data-rating-percent'))x.pricePercents[Number(t.dataset.ratingPercent)]=number;
   if(t.hasAttribute('data-rating-alternative'))x.alternativeDatePercent=number;
   if(t.hasAttribute('data-rating-working'))x.includeWorkingBudgets=t.checked;
   ui.ratingDirty=true;
   const valid=validateRatingRules(x),sum=ratingWeightTotal(x),total=root.querySelector('[data-rating-total]');
   if(total){total.textContent=sum+' / 100';total.className=valid?'valid':'invalid';}
   const status=root.querySelector('[data-rating-validation]');
   if(status)status.textContent=valid?'':'Сумма весов должна быть 100, пороги возрастают, баллы не увеличиваются при росте цены.';
   const save=root.querySelector('.vw-rating-save');if(save)save.disabled=!valid;
   if(valid){
    // Keep the ordered table in sync with the draft score, not only its labels.
    const tbody=root.querySelector('.vw-table-sortable tbody');
    if(tbody){
     const ordered=visibleVenues(PUBLIC_VENUES.map(get));
     tbody.innerHTML=ordered.map(row).join('');
     const visible=root.querySelector('[data-venues-visible]');
     if(visible)visible.textContent=String(ordered.length);
    }
   }
   return;
  }
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
  if(event.target.matches('[data-rating-form]')){
   event.preventDefault();
   const form=event.target;if(form.dataset.saving)return;
   const validated=validateRatingRules(ui.ratingDraft);
   if(!validated){showAdminToast('Проверьте веса и пороги рейтинга.',{kind:'error'});return;}
   form.dataset.saving='yes';const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
   try{
    await venueApi('admin/settings',{method:'POST',body:{key:'venue_rating_rules',value:validated}});
    ratingRules=validated;ui.ratingDrawer=false;ui.ratingDraft=null;ui.ratingDirty=false;redraw(root);
    showAdminToast('Настройки сохранены. Рейтинг всех площадок пересчитан.');
   }catch(error){
    if(button?.isConnected)button.disabled=false;
    showAdminToast('Не удалось сохранить рейтинг: '+error.message,{kind:'error'});
   }finally{form.dataset.saving='';}
   return;
  }
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
  if(t.dataset.ui){
   ui[t.dataset.ui]=t.value;
   if(t.dataset.ui==='archiveFilter'){
    const next=t.value==='archived'?'#/admin/venues/archive':t.value==='all'?'#/admin/venues/all':'#/admin/venues';
    if(location.hash!==next)location.hash=next;
    else redraw(root);
   }else redraw(root);
   return;
  }
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
    else if(t.hasAttribute('data-rating-fact')){
      if(!OBJECTIVE_CRITERIA.some(x=>x.key===t.dataset.ratingFact)||!['yes','no','unknown'].includes(t.value))
       throw new Error('Недопустимый проверяемый критерий');
      changes.ratingFacts={...(old.ratingFacts||{}),[t.dataset.ratingFact]:t.value};
     }
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
   if(event.key==='Escape'&&ui.ratingDrawer){
    event.preventDefault();
    if(ui.ratingDirty&&!window.confirm('Закрыть настройки без сохранения?'))return;
    ui.ratingDrawer=false;ui.ratingDraft=null;ui.ratingDirty=false;redraw(root);return;
   }
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
