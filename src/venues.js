
/* Venue comparison — browser-side prototype hosted on public GitHub Pages.
 * Selected venue quote amounts supplied by the couple are deliberately preloaded
 * for immediate cross-device comparison; these numbers are PUBLIC in the frontend.
 * Original photographed documents remain in access-controlled Google Drive.
 * Backend authentication is REQUIRED before this can be called a private admin.
 */
import {VENUE_RECORDS} from './venues-data.js';
const PUBLIC_VENUES = [
  {id:'vesenniy',name:'Весенний',region:'city',area:'Обводный канал',website:''},
  {id:'kraft',name:'Крафт — лофт',region:'city',area:'Санкт-Петербург'},
  {id:'loft-roof',name:'Лофт на крыше',region:'city',area:'Санкт-Петербург'},
  {id:'alex-park',name:'Александровский парк',region:'city',area:'Санкт-Петербург',
    drive:'https://drive.google.com/drive/folders/1bzMTrULC8Qqve92-ugybFXZzHTu0A-9f',
    quoteSource:'https://docs.google.com/document/d/1bOdS2FWzTOLC9vsTn-S8ywb9gp0Ey2eRRyh4dCMG3wQ/edit',
    quoteDate:'2027-06-18',cost:{quoteTotal:712760,quoteGuests:80},
    quoteAlternatives:[{date:'2027-06-18',guests:80,total:712760},{date:'2027-06-20',guests:80,total:687760}],
    notes:'Предварительная рукописная смета для 80 гостей. Банкет 5 500 ₽ × 80 = 440 000 ₽; фуршет 195 ₽ × 80 = 15 600 ₽; напитки 650 ₽ × 80 = 52 000 ₽; питание специалистов 1 500 ₽ × 2 = 3 000 ₽. Аренда оборудования: 150 000 ₽ (18.06) / 125 000 ₽ (20.06). Сервисный сбор 10%. Рукописные итоги 712 760 ₽ и 687 760 ₽ отличаются от суммы читаемых строк на 1 100 ₽. Пробковый сбор 700 ₽/чел. (потенциально +56 000 ₽) — уточнить, входит ли. Консультационный договор 50 000 ₽, условия зачёта уточнить. На 19 июня цены нет.',
    cons:'Итог рукописной сметы отличается от суммы читаемых строк на 1 100 ₽. Предложения только на 18 и 20 июня, дата 19 июня и пробковый сбор не подтверждены.'},
  {id:'seasons',name:'Сезоны в парке',region:'city',area:'Санкт-Петербург'},
  {id:'k2',name:'К2',region:'city',area:'Санкт-Петербург'},
  {id:'putilov',name:'Особняк Путилова',region:'city',area:'Санкт-Петербург',website:'https://putilovevent.tilda.ws/'},
  {id:'ermolinsky',name:'Особняк Ермолинского',region:'city',area:'Санкт-Петербург',website:'https://www.ermolinskievent.ru/kp'},
  {id:'royal',name:'Royal Beach — Крестовский',region:'city',area:'Крестовский остров'},
  {id:'vinity',name:'Vinity — Таврический сад',region:'city',area:'Потёмкинская, 4А',visited:true,
    drive:'https://drive.google.com/drive/folders/1SoO1HSmdw_e1TBo_LrQB5HcvBrU1WaqK',
    photos:'https://drive.google.com/drive/folders/1ufIQOjp0BiHqyvy0ew6C36od1z4ZX3ce',
    quoteSource:'https://docs.google.com/document/d/1t37Broaa6dE4L8MJmJBTxMeDie1kZMd6or3h6zMv66Q/edit',
    cost:{quoteTotal:863500,quoteGuests:80},
    notes:'Предварительный расчёт на 80 гостей: пакет 760 000 ₽ (не подменять рекламным меню от 6 500 ₽/гость); фуршет 48 000 ₽ (600 ₽ × 80), безалкогольные напитки 36 000 ₽ (450 ₽ × 80), персонал 6 000 ₽ (2 000 ₽ × 3); дополнительные услуги 90 000 ₽; сервисный сбор 15% только от дополнительных услуг = 13 500 ₽. Итого 863 500 ₽. В пакете заявлены 5 часов зала, свет/звук и часть оформления. Чай/кофе 300 ₽/чел. по факту, продление 30 000 ₽/час, торт и дополнительный декор — отдельно. Дату торжества и включённые услуги необходимо подтвердить.',
    cons:'Дата 19 июня не подтверждена; чай/кофе, продление, торт и дополнительный декор не входят в смету.'},
  {id:'petr',name:'Банкетный зал «Петръ»',region:'city',area:'Гороховая, 1',website:'https://www.petrbanket.com/'},
  {id:'roof18',name:'Крыша 18',region:'city',area:'Петроградская наб., 18',website:'https://roof18.ru'},
  {id:'bali',name:'Ресторан Bali',region:'city',area:'Савушкина, 98',website:'https://balispb.ru/banket/svadby'},
  {id:'360',name:'Пространство 360',region:'city',area:'Санкт-Петербург'},
  {id:'ambassador',name:'Амбассадор Ивент',region:'city',area:'Римского-Корсакова, 5–7'},
  {id:'english-roof',name:'Крыша на Английской',region:'city',area:'Галерная, 73'},
  {id:'admiralty-roof',name:'Крыша — Адмиралтейский, 8',region:'city',area:'Адмиралтейский пр., 8'},
  {id:'palma',name:'Пальма',region:'city',area:'пер. Пирогова, 18'},
  {id:'repino-riviera',name:'Репинская Ривьера',region:'country',area:'Репино'},
  {id:'panorama',name:'Панорама — Репино',region:'country',area:'Приморское шоссе, 428Д'},
  {id:'eva',name:'Шатёр Eva — Летний',region:'country',area:'Большая Купальная, 28'},
  {id:'maryino',name:'Усадьба Марьино — Белый зал',region:'country',area:'Андрианово, Тосненский район',website:'https://usadbamaryino.ru/rental/halls',capacity:80,
    publiclyAdvertised:{rent:250000,menu:6500,extension:35000},publicNote:'Белый зал предпочтителен. Вместимость до 80 по официальному сайту, в сторонних каталогах есть противоречия. Меню от 6 500 ₽/чел. — ориентир из каталога, не смета на июнь 2027.'},
  {id:'harmony',name:'Harmony Hall — Гармония',region:'country',area:'Солнечное, Приморское ш., 380И',website:'https://harmony-hall.ru/',capacity:200,
    publiclyAdvertised:{menu:4500},publicNote:'Конгресс-холл и ресторан имеют разные условия; аренда указана по-разному в каталогах. 4 500 ₽/чел. — рекламный ориентир, не предложение на июнь 2027.'}
];
const CRITERIA=[
  ['look','Атмосфера и красота',15],
  ['total','Соотношение цены и комплектации',20],
  ['comfort','Комфорт гостей / единый зал',15],
  ['travel','Логистика и дорога',10],
  ['food','Кухня и сервис',5],
  ['freedom','Гибкость / подрядчики',5]
];
const DATE_WEIGHT=30;
const DATE_CHOICES=[['18','18 июня'],['19','19 июня'],['20','20 июня']];

const EXTRAS=[['alcohol','Алкоголь и пробковый сбор'],['decor','Декор'],['host','Ведущий и DJ'],['photoVideo','Фото и видео'],['transport','Трансфер'],['extension','Продление'],['other','Другие расходы']];
const COSTS=[
 ['quoteTotal','Полная сумма полученной сметы, ₽'],['quoteGuests','Гостей в этой смете'],
 ['rent','Аренда зала, ₽'],['menu','Меню на гостя, ₽'],
 ['technical','Оборудование, ₽'],['extra','Прочие известные расходы, ₽'],
 ['service','Сервисный сбор, %'],['minSpend','Минимальный депозит / заказ, ₽']
];
const STORE='nk-wedding-venues-comparison-v2';
const DEFAULT_WEIGHTS=Object.fromEntries(CRITERIA.map(([id,,weight])=>[id,weight]));
const INITIAL=()=>({version:2,guestCount:80,weights:{...DEFAULT_WEIGHTS},venues:{},updated:null});
function read(){
 try {const v=JSON.parse(localStorage.getItem(STORE)||'null');if(v&&v.version===2&&v.venues&&typeof v.venues==='object')return {...INITIAL(),...v,weights:{...DEFAULT_WEIGHTS,...v.weights}};}catch{}
 return INITIAL();
}
let state=read();
let ui={kind:'all',query:'',sort:'date',sortDir:'asc',expanded:null,detailTab:'overview',compare:[],onlyVisited:false,date:'all',chosenDay:'all',budget:'all',visit:'all',materials:'all',capacity:'all'};
const h=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=(v)=>typeof v==='number'&&Number.isFinite(v)?Math.round(v).toLocaleString('ru-RU')+' ₽':'—';
const safeUrl=(v)=>{try{const u=new URL(String(v));return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}};
const get=(base)=>{const d=VENUE_RECORDS[base.id]||{},edit=state.venues[base.id]||{};return {...base,...d,...edit,cost:{...(base.publiclyAdvertised||{}),...(base.cost||{}),...(d.cost||{}),...(edit.cost||{})},ratings:{...(edit.ratings||{})},extras:{...(edit.extras||{})},quotes:d.quotes||[],gallery:d.gallery||[],dateAvailability:{'18':'unknown','19':edit.availability||d.availability||base.availability||'unknown','20':'unknown',...(d.dateAvailability||{}),...(edit.dateAvailability||{}),...(edit.availability?{'19':edit.availability}:{})}};};
const dayStatus=(v,day)=>v.dateAvailability?.[String(day)]||(String(day)==='19'?(v.availability||'unknown'):'unknown');
const dayText=(v,day)=>({available:'Свободно',unavailable:'Занято',pending:'Уточняется',unknown:'Нет подтверждения'}[dayStatus(v,day)]||'Нет подтверждения');
const datePriority=v=>dayStatus(v,'19')==='available'?0:(dayStatus(v,'18')==='available'||dayStatus(v,'20')==='available')?1:(DATE_CHOICES.some(([d])=>dayStatus(v,d)==='pending'))?2:(DATE_CHOICES.some(([d])=>dayStatus(v,d)==='unknown'))?3:4;
const bestAvailable=v=>dayStatus(v,'19')==='available'?'19':(dayStatus(v,'18')==='available'?'18':(dayStatus(v,'20')==='available'?'20':null));
const threeDates=v=>DATE_CHOICES.map(([day])=>'<span class="vw-date-chip vw-day-'+dayStatus(v,day)+'"><b>'+day+'.06</b> '+h(dayText(v,day))+'</span>').join('');

const numbers=(v)=>Number.isFinite(Number(v))&&v!==''&&v!==null?Math.max(0,Number(v)):null;
function save(){state.updated=new Date().toISOString();try{localStorage.setItem(STORE,JSON.stringify(state));}catch{}}
function patch(id,key,value){
 const old=state.venues[id]||{};
 state.venues[id]={...old,[key]:value};save();
}
function weighted(v){
 const xs=CRITERIA.filter(([k])=>v.ratings[k]!==null&&v.ratings[k]!==undefined&&v.ratings[k]!=='');
 if(xs.length!==CRITERIA.length)return {value:null,complete:xs.length,provisional:true};
 const best=bestAvailable(v);
 const datePoints=best==='19'?DATE_WEIGHT:best?22:0;
 const den=DATE_WEIGHT+CRITERIA.reduce((s,[k])=>s+(numbers(state.weights[k])??0),0);
 const points=datePoints+CRITERIA.reduce((s,[k])=>s+((numbers(v.ratings[k])??0)/5)*(numbers(state.weights[k])??0),0);
 return {value:Math.round(points/(den||100)*100),complete:xs.length,provisional:!best,preferred:best==='19',date:best};
}
function estimate(v){
 const q=(v.quotes||[]).find(q=>q.guests===state.guestCount&&q.kind!=='scenario');
 if(q)return {value:Number(q.total),partial:q.kind==='estimate',isQuote:true,kind:q.kind,quoteDate:q.date||null};
 const c=v.cost||{},total=numbers(c.quoteTotal),guests=numbers(c.quoteGuests);
 if(total!==null&&guests===state.guestCount)return {value:total,partial:false,isQuote:true,kind:'quote',quoteDate:v.quoteDate||null};
 const menu=numbers(c.menu),rent=numbers(c.rent),tech=numbers(c.technical),extra=numbers(c.extra),service=numbers(c.service),min=numbers(c.minSpend);
 if(menu===null&&rent===null)return {value:null,partial:true};
 const spend=Math.max(menu===null?0:menu*state.guestCount,min??0);
 return {value:Math.round((rent??0)+spend+(tech??0)+(extra??0)+spend*(service??0)/100),partial:true,isQuote:false,kind:'minimum'};
}
function extraTotal(v){return EXTRAS.reduce((s,[k])=>s+(numbers(v.extras?.[k])??0),0)}
function sourceThumb(g){if(!g)return '';const id=encodeURIComponent(g.id);return '<a href="https://drive.google.com/file/d/'+id+'/view" target="_blank" rel="noopener noreferrer" class="vw-photo"><img loading="lazy" src="https://drive.google.com/thumbnail?id='+id+'&sz=w800" alt="'+h(g.label)+'"><span>'+h(g.label)+'</span></a>'}
function photoGallery(v){return v.gallery?.length?'<div class="vw-gallery">'+v.gallery.map(sourceThumb).join('')+'</div>':'<p class="vw-muted">Фотографий с телефона пока нет.</p>'}
function budgetTotal(v){const e=estimate(v);return '<div class="vw-budget-boxes"><div><small>По смете / минимум</small><strong>'+rub(e.value)+'</strong></div><div><small>Добавленные доплаты</small><strong>'+rub(extraTotal(v))+'</strong></div><div><small>Суммарный известный бюджет</small><strong>'+rub(e.value===null?null:e.value+extraTotal(v))+'</strong></div></div><p class="vw-muted">Неизвестные позиции не считаются нулевыми. Не добавляйте депозит к уже оплаченному меню второй раз.</p>'}

function external(v){
 return [['Документ со сметой',v.quoteSource],['Диск с файлами',v.drive],['Фотографии',v.photos],['Сайт',v.website]].filter(([,url])=>safeUrl(url))
 .map(([label,url])=>'<a href="'+h(safeUrl(url))+'" target="_blank" rel="noopener noreferrer">'+h(label)+' ↗</a>').join('');
}
function status(v){
 const status=v.availability||'unknown';
 return {available:'19 июня — подтверждено',unavailable:'19 июня — занято',pending:'19 июня — уточняется',unknown:'19 июня — неизвестно'}[status]||'19 июня — неизвестно';
}
function row(v){
 const score=weighted(v),cost=estimate(v),selected=ui.compare.includes(v.id),pic=v.gallery?.[0];
 const image=pic?'<img loading="lazy" class="vw-row-thumb" src="https://drive.google.com/thumbnail?id='+encodeURIComponent(pic.id)+'&sz=w240" alt="">':'<span class="vw-row-thumb vw-no-image"></span>';
 return '<tr class="vw-row" data-id="'+h(v.id)+'"><td><div class="vw-venue-cell">'+image+'<div><button class="vw-name" data-detail="'+h(v.id)+'" type="button">'+h(v.name)+'</button><small>'+h(v.area)+' · '+(v.region==='country'?'За городом':'Город')+'</small></div></div></td>'+
 '<td><div class="vw-date-list">'+threeDates(v)+'</div></td>'+
 '<td><span class="vw-state '+(v.visited?'vw-seen':'')+'">'+(v.visited?'● Были лично':'○ Не подтверждено')+'</span></td>'+
 '<td class="vw-money">'+(cost.value===null?'—':(cost.partial?'от ':'')+rub(cost.value))+'<small>'+(cost.isQuote?'По смете / условиям':cost.partial?'Расчётный минимум':'Ориентир')+(cost.value===null?'':' · '+Math.round(cost.value/state.guestCount).toLocaleString('ru-RU')+' ₽/гость')+'</small></td>'+
 '<td>'+h(v.capacity??'—')+'</td><td class="vw-score">'+(score.value===null?'Не оценено':score.value+' / 100')+'<small>'+(score.value!==null&&score.provisional?'Предварительно: дата не подтверждена':score.complete+'/6 оценок')+'</small></td>'+
 '<td><div class="vw-actions"><button type="button" data-compare="'+h(v.id)+'" aria-pressed="'+selected+'">'+(selected?'✓ Выбрано':'Сравнить')+'</button><button type="button" data-detail="'+h(v.id)+'">Подробнее</button></div></td></tr>';
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
 '<div class="vw-detail-block"><h3>Дополнительные расходы свадьбы</h3><p>Заполняйте только то, чего ещё нет в смете. Данные сохраняются в этом браузере.</p><div class="vw-input-grid">'+EXTRAS.map(([k,label])=>'<label>'+h(label)+'<input type="number" data-venue="'+h(v.id)+'" data-extra="'+k+'" min="0" value="'+h(v.extras?.[k]??'')+'" placeholder="Не рассчитано"></label>').join('')+'</div></div>'+
 '<div class="vw-detail-block"><h3>Ручная корректировка расчёта</h3><p>Для площадок без сметы: аренда + банкет + техника + прочие расходы + обслуживание. Точная смета имеет приоритет для соответствующего числа гостей.</p><div class="vw-input-grid">'+COSTS.map(([k,label])=>'<label>'+h(label)+'<input type="number" data-venue="'+h(v.id)+'" data-cost="'+k+'" min="0" value="'+h(v.cost[k]??'')+'" placeholder="Неизвестно"></label>').join('')+'</div></div>'+bullets('Исключения / неопределённые позиции',v.excluded);
 if(tab==='terms')content='<div class="vw-detail-grid"><div><div class="vw-detail-block"><h3>Условия и договорённости</h3><p>'+h(v.summary||'Неизвестно')+'</p></div>'+bullets('Входит',v.included)+bullets('Доплаты / ограничения',v.excluded)+'</div><div>'+bullets('Открытые вопросы',v.questions)+
 '<div class="vw-detail-block"><h3>Статус</h3><label>Лично смотрели<select data-venue="'+h(v.id)+'" data-field="visited"><option value="true" '+(v.visited?'selected':'')+'>Да</option><option value="false" '+(!v.visited?'selected':'')+'>Не подтверждено</option></select></label>'+DATE_CHOICES.map(([day,label])=>'<label>'+label+' 2027<select data-venue="'+h(v.id)+'" data-day="'+day+'">'+[['unknown','Неизвестно'],['pending','Уточняется'],['available','Свободно подтверждено'],['unavailable','Занято']].map(([k,title])=>'<option value="'+k+'" '+(dayStatus(v,day)===k?'selected':'')+'>'+title+'</option>').join('')+'</select></label>').join('')+'<label>Вместимость <input type="number" min="0" data-venue="'+h(v.id)+'" data-field="capacity" value="'+h(v.capacity??'')+'"></label><h3>Ваши заметки</h3><textarea rows="7" data-venue="'+h(v.id)+'" data-field="notes">'+h(v.notes||'')+'</textarea></div></div></div>';
 if(tab==='rating')content='<div class="vw-detail-block"><h3>Рейтинг площадки с учётом даты</h3><p>19 июня — предпочтительная дата, даёт до 30 баллов. Подтверждённые 18 или 20 июня — допустимые альтернативы, дают 22 балла. Если ни одна дата пока не подтверждена, оценка предварительная, но площадка не исключается.</p><div class="vw-rating-result"><strong>'+(s.value===null?'Пока нет итогового балла':s.value+' / 100'+(s.provisional?' · предварительно':''))+'</strong><span>'+s.complete+'/6 личных оценок заполнено</span></div><div class="vw-rating-grid">'+CRITERIA.map(([key,label])=>'<label>'+h(label)+' · '+h(state.weights[key]||0)+'%<select data-venue="'+h(v.id)+'" data-rating="'+key+'"><option value="">Не оценивали</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'" '+(Number(v.ratings[key])===n?'selected':'')+'>'+n+' / 5</option>').join('')+'</select></label>').join('')+'</div></div>';
 return '<section class="vw-detail"><header class="vw-detail-head"><div><span class="vw-kicker">'+(v.region==='country'?'ЗАГОРОДНАЯ':'ГОРОДСКАЯ')+' ПЛОЩАДКА</span><h2>'+h(v.name)+'</h2><p>'+h(v.area)+' · '+h(status(v))+'</p></div><button class="vw-close" type="button" data-close aria-label="Закрыть">×</button></header>'+
 '<div class="vw-detail-links">'+external(v)+'</div><nav class="vw-detail-tabs">'+tabs.map(([key,title])=>'<button type="button" data-detail-tab="'+key+'" class="'+(key===tab?'selected':'')+'">'+title+'</button>').join('')+'</nav>'+
 '<div class="vw-tab-content">'+content+'</div></section>';
}
function selectedCompare(all){
 const subset=ui.compare.map(id=>all.find(v=>v.id===id)).filter(Boolean);
 if(subset.length<2)return '<p class="vw-muted">Выберите минимум две площадки кнопкой «Сравнить», чтобы увидеть их рядом.</p>';
 const fields=[['Район',v=>v.area],['18 июня',v=>dayText(v,'18')],['19 июня',v=>dayText(v,'19')],['20 июня',v=>dayText(v,'20')],['Просмотр',v=>v.visited?'Да':'Не отмечено'],['Гостей',v=>v.capacity||'—'],['Бюджет',v=>{let q=estimate(v);return q.value===null?'—':(q.partial?'от ':'')+rub(q.value)+(q.isQuote&&q.quoteDate?' (смета '+q.quoteDate+')':'')}],['Рейтинг',v=>weighted(v).value===null?'Не заполнен':weighted(v).value+'/100'],['Плюсы',v=>v.pros||'—'],['Риски',v=>v.cons||'—']];
 return '<div class="vw-scroll"><table class="vw-matrix"><thead><tr><th>Критерий</th>'+subset.map(v=>'<th>'+h(v.name)+'</th>').join('')+'</tr></thead><tbody>'+fields.map(([label,fn])=>'<tr><th>'+label+'</th>'+subset.map(v=>'<td>'+h(fn(v))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
const SORT_DEFAULTS={name:'asc',date:'asc',visit:'asc',price:'asc',capacity:'desc',score:'desc'};
function sortVenues(rows){
 const cmpName=(a,b)=>a.name.localeCompare(b.name,'ru');
 const ordinal={available:0,pending:1,unknown:2,unavailable:3};
 function key(v){
  if(ui.sort==='name')return v.name;
  if(ui.sort==='visit')return v.visited?0:1;
  if(ui.sort==='price')return estimate(v).value;
  if(ui.sort==='capacity')return numbers(v.capacity);
  if(ui.sort==='score')return weighted(v).value;
  if(ui.sort==='date')return ui.chosenDay==='all'?datePriority(v):(ordinal[dayStatus(v,ui.chosenDay)]??2);
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
function columnHeading(key,label,filters=''){
 const active=ui.sort===key,arrow=!active?'↕':ui.sortDir==='asc'?'↑':'↓';
 return '<th scope="col" aria-sort="'+(active?(ui.sortDir==='asc'?'ascending':'descending'):'none')+'"><button type="button" class="vw-th-sort" data-sort-col="'+key+'" aria-label="Сортировать: '+h(label)+'; '+(active?(ui.sortDir==='asc'?'сейчас по возрастанию':'сейчас по убыванию'):'нажмите для сортировки')+'"><span>'+h(label)+'</span><span class="vw-sort-arrow'+(active?' active':'')+'" aria-hidden="true">'+arrow+'</span></button>'+filters+'</th>';
}
function headerSelect(id,aria,options){
 return '<select class="vw-head-filter" aria-label="'+h(aria)+'" data-ui="'+h(id)+'">'+options.map(([value,label])=>'<option value="'+h(value)+'" '+(ui[id]===value?'selected':'')+'>'+h(label)+'</option>').join('')+'</select>';
}
export function renderVenueAdmin(){
 const match=(typeof location!=='undefined'?location.hash:'').match(/^#\/admin\/venues\/([^/?]+)(?:\/([^/?]+))?/);
 if(match){ui.expanded=decodeURIComponent(match[1]);ui.detailTab=match[2]||'overview';}else{ui.expanded=null;}
 const all=PUBLIC_VENUES.map(get);
 const visited=all.filter(v=>v.visited).length;
 const full=all.filter(v=>weighted(v).value!==null).length;
 let list=all.filter(v=>{const e=estimate(v);return (ui.kind==='all'||v.region===ui.kind)&&(ui.date==='all'||(ui.chosenDay==='all'?DATE_CHOICES.some(([d])=>dayStatus(v,d)===ui.date):dayStatus(v,ui.chosenDay)===ui.date))&&(ui.visit==='all'||(ui.visit==='yes')===!!v.visited)&&(ui.materials==='all'||ui.materials==='photos'&&v.gallery?.length||ui.materials==='quotes'&&v.quotes?.length)&&(ui.budget==='all'||e.value!==null&&e.value<=Number(ui.budget))&&(ui.capacity==='all'||v.capacity>=Number(ui.capacity))&&(v.name+' '+v.area).toLowerCase().includes(ui.query.toLowerCase())});
 sortVenues(list);
 const detailVenue=all.find(v=>v.id===ui.expanded);
 if(match&&detailVenue)return '<div class="vw-page" data-venues-page><a class="vw-back" href="#/admin/venues">← Назад к сравнению</a><div class="vw-detail-single">'+detail(detailVenue)+'</div></div>';
 return '<div class="vw-page" data-venues-page><div class="dashboard-heading vw-head"><div><div class="eyebrow">ОРГАНИЗАЦИЯ / ВЫБОР МЕСТА</div><h1>Сравнение площадок</h1><p>Регистрация 17 июня · торжество желательно 19 июня 2027 · город и загород</p></div><div class="vw-count"><strong>'+all.length+'</strong><span>площадок</span></div></div>'+
 '<div class="vw-alert"><strong>Даты свадьбы:</strong> 19 июня — предпочтительно, но 18 и 20 июня также рассматриваем. Занятость 19-го не исключает площадку: проверяйте все три даты и условия каждого предложения. «Весенний» и «Сезоны в парке» сообщили, что 19-е занято. Неизвестный статус не означает свободную дату.</div>'+
 '<div class="vw-stats"><div><strong>'+all.length+'</strong><span>На рассмотрении</span></div><div><strong>'+visited+'</strong><span>Просмотрены</span></div><div><strong>'+full+'</strong><span>С полной оценкой</span></div><div><strong>'+all.filter(v=>DATE_CHOICES.some(([d])=>dayStatus(v,d)==='available')).length+'</strong><span>Подтверждённая дата (18/19/20)</span></div></div>'+
 '<div class="vw-panel"><div class="vw-panel-title vw-table-panel-title"><div><h2>Все площадки</h2><span>'+list.length+' из '+all.length+' · нажмите на заголовок столбца для сортировки</span></div><div class="vw-table-tools"><label class="vw-compact-control">Гостей <select data-state="guestCount">'+[60,70,80,90,100].map(n=>'<option value="'+n+'" '+(state.guestCount===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label><input type="search" data-ui="query" value="'+h(ui.query)+'" placeholder="Поиск по названию / району" aria-label="Поиск площадки (Enter)"><button type="button" data-clear-filters>Сбросить фильтры</button><details class="vw-table-extra"><summary>Данные</summary><div><label class="vw-upload">Импорт правок<input type="file" accept=".json" data-import hidden></label><button type="button" data-export>Экспорт правок</button></div></details></div></div><div class="vw-scroll"><table class="vw-table vw-table-sortable"><thead><tr>'+
 columnHeading('name','Площадка','<div class="vw-head-filter-row">'+headerSelect('kind','Расположение',[['all','Все районы'],['city','Город'],['country','За городом']])+headerSelect('materials','Материалы',[['all','Все материалы'],['photos','С фото'],['quotes','Со сметой']])+'</div>')+
 columnHeading('date','18 / 19 / 20 июня','<div class="vw-head-filter-row">'+headerSelect('chosenDay','День свадьбы',[['all','Все 3 даты'],['19','19 июня'],['18','18 июня'],['20','20 июня']])+headerSelect('date','Статус даты',[['all','Любой статус'],['available','Свободно'],['unavailable','Занято'],['pending','Уточняется'],['unknown','Нет ответа']])+'</div>')+
 columnHeading('visit','Осмотр',headerSelect('visit','Фильтр по осмотру',[['all','Все'],['yes','Были лично'],['no','Не подтверждено']]))+
 columnHeading('price','Бюджет',headerSelect('budget','Верхняя граница бюджета',[['all','Любой бюджет'],['650000','До 650 тыс.'],['800000','До 800 тыс.'],['1000000','До 1 млн'],['1200000','До 1,2 млн']]))+
 columnHeading('capacity','Вместимость',headerSelect('capacity','Минимальная вместимость',[['all','Все'],['80','80+ гостей'],['100','100+ гостей']]))+
 columnHeading('score','Рейтинг')+
 '<th scope="col">Действие</th></tr></thead><tbody>'+
 list.map(row).join('')+'</tbody></table></div>'+(list.length?'':'<p class="vw-empty">По выбранным фильтрам площадок нет. Измените условия или нажмите «Сбросить фильтры».</p>')+'</div>'+
 '<div class="vw-panel"><div class="vw-panel-title"><h2>Сравнить рядом</h2><span>До четырёх вариантов</span></div>'+selectedCompare(all)+'</div>'+
 '<div class="vw-panel"><div class="vw-panel-title"><h2>Вес критериев рейтинга</h2><span>Рейтинг доступен только при 6/6 оценках</span></div><div class="vw-weights">'+CRITERIA.map(([key,label])=>'<label><span>'+h(label)+'</span><input type="number" min="0" max="100" step="1" data-weight="'+key+'" value="'+h(state.weights[key])+'"><span>%</span></label>').join('')+'</div><p class="vw-muted">Весовые коэффициенты автоматически нормируются при расчёте. Цена и доступность сравниваются дополнительно и не подменяются субъективной оценкой.</p></div>'+
 '</div>';
}
function redraw(root){const el=root.querySelector('[data-venues-page]');if(!el)return;el.outerHTML=renderVenueAdmin();const n=root.querySelector('[data-state="guestCount"]');if(n)n.value=String(state.guestCount);for(const [key,v] of [['kind',ui.kind],['sort',ui.sort],['date',ui.date],['chosenDay',ui.chosenDay],['visit',ui.visit],['materials',ui.materials],['budget',ui.budget],['capacity',ui.capacity]]){const x=root.querySelector('[data-ui="'+key+'"]');if(x)x.value=v;}for(const s of root.querySelectorAll('select[data-field="availability"]'))s.value=get(PUBLIC_VENUES.find(x=>x.id===s.dataset.venue)).availability||'unknown';}
function upload(file,root){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{try{
  const p=JSON.parse(String(reader.result));const rows=Array.isArray(p)?p:Array.isArray(p.venues)?p.venues:null;
  if(!rows||!rows.length)throw Error('Нужен JSON с массивом venues.');
  const allowed=new Set(PUBLIC_VENUES.map(v=>v.id));let count=0;
  for(const v of rows){
   if(!v||!allowed.has(v.id))continue;
   const old=state.venues[v.id]||{};
   const fields=['visited','availability','capacity','quoteDate','website','drive','photos','pros','cons','notes','region','area','name'];
   const out={...old};
   if(v.extras&&typeof v.extras==='object')out.extras={...(old.extras||{}),...v.extras};
   if(v.dateAvailability&&typeof v.dateAvailability==='object')out.dateAvailability={...(old.dateAvailability||{}),...v.dateAvailability};for(const f of fields)if(Object.hasOwn(v,f))out[f]=v[f];
   if(v.cost&&typeof v.cost==='object')out.cost={...old.cost,...v.cost};
   if(v.ratings&&typeof v.ratings==='object')out.ratings={...old.ratings,...v.ratings};
   state.venues[v.id]=out;count++;
  }
  save();redraw(root);alert('Импортировано площадок: '+count+'. Данные сохранены только в браузере.');
 }catch(err){alert('Ошибка импорта: '+err.message);}};
 reader.readAsText(file,'utf-8');
}
function download(){
 const rows=PUBLIC_VENUES.map(v=>({id:v.id,...(state.venues[v.id]||{})}));
 const data={schema:'wedding-venues-private-v1',date:'2027-06-19',venues:rows};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='wedding-venues-private.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export function activateVenueAdmin(root){
 if(root.dataset.venuesReady==='yes'){redraw(root);return;}
 root.dataset.venuesReady='yes';
 redraw(root);
 root.addEventListener('click',event=>{
  const target=event.target.closest('[data-detail],[data-close],[data-compare],[data-export],[data-ui-toggle],[data-detail-tab],[data-sort-col],[data-clear-filters]');if(!target)return;
  if(target.dataset.sortCol){const key=target.dataset.sortCol;if(ui.sort===key)ui.sortDir=ui.sortDir==='asc'?'desc':'asc';else{ui.sort=key;ui.sortDir=SORT_DEFAULTS[key]||'asc';}redraw(root);}
  else if(target.hasAttribute('data-clear-filters')){Object.assign(ui,{kind:'all',query:'',date:'all',chosenDay:'all',budget:'all',visit:'all',materials:'all',capacity:'all'});redraw(root);}
  else if(target.dataset.detail){location.hash='#/admin/venues/'+encodeURIComponent(target.dataset.detail);}else if(target.dataset.detailTab){location.hash='#/admin/venues/'+encodeURIComponent(ui.expanded)+'/'+target.dataset.detailTab;}
  else if(target.hasAttribute('data-close')){location.hash='#/admin/venues';}
  else if(target.dataset.compare){const id=target.dataset.compare;ui.compare=ui.compare.includes(id)?ui.compare.filter(x=>x!==id):ui.compare.length>=4?[...ui.compare.slice(1),id]:[...ui.compare,id];redraw(root);}
  else if(target.hasAttribute('data-export'))download();
  else if(target.dataset.uiToggle){ui.onlyVisited=!ui.onlyVisited;redraw(root);}
 });
 root.addEventListener('change',event=>{
  const t=event.target;
  if(t.matches('[data-import]')){upload(t.files?.[0],root);return;}
  if(t.dataset.state==='guestCount'){state.guestCount=Math.max(1,Math.min(300,Number(t.value)||80));save();redraw(root);return;}
  if(t.dataset.ui){ui[t.dataset.ui]=t.value;redraw(root);return;}
  if(t.dataset.weight){state.weights[t.dataset.weight]=Math.max(0,Math.min(100,Number(t.value)||0));save();redraw(root);return;}
  if(t.dataset.venue){
    const id=t.dataset.venue,old=state.venues[id]||{};
    if(t.dataset.field){
      const val=t.dataset.field==='visited'?t.value==='true':t.dataset.field==='capacity'?numbers(t.value):t.value;
      patch(id,t.dataset.field,val);
    }else if(t.dataset.cost){patch(id,'cost',{...old.cost,[t.dataset.cost]:numbers(t.value)});}
    else if(t.dataset.day){patch(id,'dateAvailability',{...(old.dateAvailability||{}),[t.dataset.day]:t.value});if(t.dataset.day==='19')patch(id,'availability',t.value);}
    else if(t.dataset.extra){patch(id,'extras',{...(old.extras||{}),[t.dataset.extra]:numbers(t.value)});}
    else if(t.dataset.rating){patch(id,'ratings',{...old.ratings,[t.dataset.rating]:t.value?Number(t.value):null});}
    redraw(root);
  }
 });
 // Search re-renders only when Enter is pressed or focus leaves input.
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&ui.expanded){location.hash='#/admin/venues';}
  if(event.key==='Enter'&&event.target.matches('[data-ui="query"]')){event.preventDefault();ui.query=event.target.value;redraw(root);}
 });
}
