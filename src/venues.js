
/* Venue comparison — browser-side prototype hosted on public GitHub Pages.
 * Selected venue quote amounts supplied by the couple are deliberately preloaded
 * for immediate cross-device comparison; these numbers are PUBLIC in the frontend.
 * Original photographed documents remain in access-controlled Google Drive.
 * Backend authentication is REQUIRED before this can be called a private admin.
 */
import {VENUE_RECORDS} from './venues-data.js';
import {renderVenueNewPage,filteredVenuePhotos,getVenueCover} from './venue-detail-ui.js';
import {hydrateVenueFiles} from './venue-files-ui.js';
import {estimateVenue,scoreVenue,PERSONAL_CRITERIA,RATING_CRITERIA,RATING_MAX} from './venue-evaluation.js';
export const PUBLIC_VENUES = [
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
  {id:'zhemchuzhny',name:'Event Hall Жемчужный',region:'city',area:'Приморский проспект, 50Ж',website:'https://xn--80aaaav9bebfeihcggq.xn--p1ai/prl',capacity:150},
  {id:'eva',name:'Шатёр Eva — Летний',region:'country',area:'Большая Купальная, 28'},
  {id:'maryino',name:'Усадьба Марьино — Белый зал',region:'country',area:'Андрианово, Тосненский район',website:'https://usadbamaryino.ru/rental/halls',capacity:80,
    publiclyAdvertised:{rent:250000,menu:6500,extension:35000},publicNote:'Белый зал предпочтителен. Вместимость до 80 по официальному сайту, в сторонних каталогах есть противоречия. Меню от 6 500 ₽/чел. — ориентир из каталога, не смета на июнь 2027.'},
  {id:'harmony',name:'Harmony Hall — Гармония',region:'country',area:'Солнечное, Приморское ш., 380И',website:'https://harmony-hall.ru/',capacity:200,
    publiclyAdvertised:{menu:4500},publicNote:'Конгресс-холл и ресторан имеют разные условия; аренда указана по-разному в каталогах. 4 500 ₽/чел. — рекламный ориентир, не предложение на июнь 2027.'}
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
const INITIAL=()=>({version:2,guestCount:80,venues:{},updated:null});
function read(){
 try {const v=JSON.parse(localStorage.getItem(STORE)||'null');if(v&&v.version===2&&v.venues&&typeof v.venues==='object')return {...INITIAL(),...v};}catch{}
 return INITIAL();
}
let state=read();
let ui={kind:'all',query:'',sort:'date',sortDir:'asc',expanded:null,detailTab:'overview',date:'all',chosenDay:'all',budget:'all',visit:'all',capacity:'all',photoSection:'all',photoView:'gallery',photoSort:'original',photoIndex:0,photoLightbox:false};
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
function estimate(v){return estimateVenue(v,state.guestCount);}
function extraTotal(v){return EXTRAS.reduce((s,[k])=>s+(numbers(v.extras?.[k])??0),0)}
// The comparison table and its cost score use the same total as the venue budget page.
function totalEstimate(v){
 const base=estimate(v),extra=extraTotal(v);
 if(base.value===null||extra===0)return base;
 return {...base,value:base.value+extra,partial:true,isQuote:false,kind:'scenario',
  note:base.note+'; добавлены указанные организаторами доплаты: '+rub(extra)};
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
function row(v){
 const score=weighted(v),cost=totalEstimate(v),pic=getVenueCover(v);
 const image=pic?'<img loading="lazy" class="vw-row-thumb" src="https://drive.google.com/thumbnail?id='+encodeURIComponent(pic.id)+'&sz=w240" alt="Фото площадки: '+h(v.name)+'">':'<span class="vw-row-thumb vw-no-image"></span>';
 return '<tr class="vw-row" data-id="'+h(v.id)+'"><td><div class="vw-venue-cell"><span class="vw-venue-media"><button type="button" class="vw-image-open" data-detail="'+h(v.id)+'" aria-label="Открыть площадку '+h(v.name)+'">'+image+'</button></span><div class="vw-venue-label"><button class="vw-name" data-detail="'+h(v.id)+'" type="button">'+h(v.name)+'</button><small>'+h(v.area)+' · '+(v.region==='country'?'За городом':'Город')+'</small></div></div></td>'+
 '<td><div class="vw-date-list">'+threeDates(v)+'</div></td>'+
 '<td><span class="vw-state '+(v.visited?'vw-seen':'')+'">'+(v.visited?'● Были лично':'○ Не подтверждено')+'</span></td>'+
 '<td class="vw-money" title="'+h(cost.note||'')+'">'+(cost.value===null?'—':(cost.partial?'≈ ':'')+rub(cost.value))+'<small>'+(cost.isQuote?'Полученная смета':cost.partial?'Предварительный расчёт':'Ориентир')+(cost.value===null?'':' · '+Math.round(cost.value/state.guestCount).toLocaleString('ru-RU')+' ₽/гость в среднем')+'</small></td>'+
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
 '<div class="vw-detail-block"><h3>Дополнительные расходы свадьбы</h3><p>Заполняйте только то, чего ещё нет в смете. Данные сохраняются в этом браузере.</p><div class="vw-input-grid">'+EXTRAS.map(([k,label])=>'<label>'+h(label)+'<input type="number" data-venue="'+h(v.id)+'" data-extra="'+k+'" min="0" value="'+h(v.extras?.[k]??'')+'" placeholder="Не рассчитано"></label>').join('')+'</div></div>'+
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
  if(ui.sort==='price')return totalEstimate(v).value;
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
function visibleVenues(all){
 return sortVenues(all.filter(v=>{
  const e=totalEstimate(v);
  return (ui.kind==='all'||v.region===ui.kind)
    &&(ui.date==='all'||(ui.chosenDay==='all'?DATE_CHOICES.some(([d])=>dayStatus(v,d)===ui.date):dayStatus(v,ui.chosenDay)===ui.date))
    &&(ui.visit==='all'||(ui.visit==='yes')===!!v.visited)
    &&(ui.budget==='all'||e.value!==null&&e.value<=Number(ui.budget))
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
 const match=(typeof location!=='undefined'?location.hash:'').match(/^#\/admin\/venues\/([^/?]+)(?:\/([^/?]+))?/);
 if(match){const next=decodeURIComponent(match[1]);if(ui.expanded!==next){ui.photoSection='all';ui.photoView='gallery';ui.photoIndex=0;ui.photoLightbox=false;}ui.expanded=next;ui.detailTab=match[2]||'overview';}else{ui.expanded=null;ui.photoLightbox=false;}
 const all=PUBLIC_VENUES.map(get);
 const visited=all.filter(v=>v.visited).length;
 const full=all.filter(v=>weighted(v).value!==null&&!weighted(v).provisional).length;
 const list=visibleVenues(all);
 const detailVenue=all.find(v=>v.id===ui.expanded);
 if(match&&detailVenue)return '<div class="vw-page" data-venues-page>'+renderVenueNewPage(detailVenue,{guests:state.guestCount,ui,estimate,extraTotal,dayStatus,dayText,weighted})+'</div>';
 return '<div class="vw-page" data-venues-page><div class="dashboard-heading vw-head"><div><div class="eyebrow">ОРГАНИЗАЦИЯ / ВЫБОР МЕСТА</div><h1>Сравнение площадок</h1><p>Регистрация 17 июня · торжество желательно 19 июня 2027 · город и загород</p></div><div class="vw-count"><strong>'+all.length+'</strong><span>площадок</span></div></div>'+
 '<div class="vw-alert"><strong>Даты свадьбы:</strong> 19 июня — предпочтительно, но 18 и 20 июня также рассматриваем. Занятость 19-го не исключает площадку: проверяйте все три даты и условия каждого предложения. «Весенний» и «Сезоны в парке» сообщили, что 19-е занято. Неизвестный статус не означает свободную дату.</div>'+
 '<div class="vw-stats"><div><strong>'+all.length+'</strong><span>На рассмотрении</span></div><div><strong>'+visited+'</strong><span>Просмотрены</span></div><div><strong>'+full+'</strong><span>С полной оценкой</span></div><div><strong>'+all.filter(v=>DATE_CHOICES.some(([d])=>dayStatus(v,d)==='available')).length+'</strong><span>Подтверждённая дата (18/19/20)</span></div></div>'+
 '<div class="vw-panel"><div class="vw-panel-title vw-table-panel-title"><div><h2>Все площадки</h2><span><b data-venues-visible>'+list.length+'</b> из '+all.length+' · нажмите на заголовок столбца для сортировки</span></div><div class="vw-table-tools"><label class="vw-compact-control">Гостей <input data-state="guestCount" type="number" min="1" max="300" step="1" value="'+state.guestCount+'" aria-label="Число гостей для пересчёта смет"></label><input type="search" data-ui="query" value="'+h(ui.query)+'" placeholder="Поиск по названию / району" aria-label="Поиск площадки (Enter)"><button type="button" data-clear-filters>Сбросить фильтры</button></div></div><div class="vw-scroll"><table class="vw-table vw-table-sortable"><thead><tr>'+
 columnHeading('name','Площадка','<div class="vw-head-filter-row">'+headerSelect('kind','Расположение',[['all','Все районы'],['city','Город'],['country','За городом']])+'</div>')+
 columnHeading('date','18 / 19 / 20 июня','<div class="vw-head-filter-row">'+headerSelect('chosenDay','День свадьбы',[['all','Все 3 даты'],['19','19 июня'],['18','18 июня'],['20','20 июня']])+headerSelect('date','Статус даты',[['all','Любой статус'],['available','Свободно'],['unavailable','Занято'],['pending','Уточняется'],['unknown','Нет ответа']])+'</div>')+
 columnHeading('visit','Осмотр',headerSelect('visit','Фильтр по осмотру',[['all','Все'],['yes','Были лично'],['no','Не подтверждено']]))+
 columnHeading('price','Бюджет',headerSelect('budget','Верхняя граница бюджета',[['all','Любой бюджет'],['650000','До 650 тыс.'],['800000','До 800 тыс.'],['1000000','До 1 млн'],['1200000','До 1,2 млн']]))+
 columnHeading('capacity','Вместимость',headerSelect('capacity','Минимальная вместимость',[['all','Все'],['80','80+ гостей'],['100','100+ гостей']]))+
 columnHeading('score','Рейтинг')+
 '</tr></thead><tbody>'+
 list.map(row).join('')+'</tbody></table></div>'+(list.length?'':'<p class="vw-empty">По выбранным фильтрам площадок нет. Измените условия или нажмите «Сбросить фильтры».</p>')+'</div>'+
 '</div>';
}
function redraw(root){
 const el=root.querySelector('[data-venues-page]');if(!el)return;
 const y=typeof window!=='undefined'?window.scrollY:0;
 const categoryScroll=root.querySelector('.vdp-photo-categories')?.scrollLeft??0;
 const stripScroll=root.querySelector('.vdp-filmstrip')?.scrollLeft??0;
 el.outerHTML=renderVenueAdmin();
 hydrateVenueFiles(root);
 const n=root.querySelector('[data-state="guestCount"]');if(n)n.value=String(state.guestCount);
 for(const [key,v] of [['kind',ui.kind],['sort',ui.sort],['date',ui.date],['chosenDay',ui.chosenDay],['visit',ui.visit],['budget',ui.budget],['capacity',ui.capacity]]){
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
export function activateVenueAdmin(root){
 if(root.dataset.venuesReady==='yes'){redraw(root);return;}
 root.dataset.venuesReady='yes';
 redraw(root);
 root.addEventListener('click',event=>{
  const target=event.target.closest('[data-detail],[data-close],[data-ui-toggle],[data-detail-tab],[data-sort-col],[data-clear-filters],[data-photo-section],[data-photo-view],[data-photo-open],[data-photo-step],[data-photo-close]');if(!target)return;
  if(target.hasAttribute('data-photo-close')){ui.photoLightbox=false;redraw(root);}
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
  else if(target.hasAttribute('data-clear-filters')){Object.assign(ui,{kind:'all',query:'',date:'all',chosenDay:'all',budget:'all',visit:'all',capacity:'all'});redraw(root);}
  else if(target.dataset.detail){location.hash='#/admin/venues/'+encodeURIComponent(target.dataset.detail);}else if(target.dataset.detailTab){location.hash='#/admin/venues/'+encodeURIComponent(ui.expanded)+'/'+target.dataset.detailTab;}
  else if(target.hasAttribute('data-close')){location.hash='#/admin/venues';}
  else if(target.dataset.uiToggle){ui.onlyVisited=!ui.onlyVisited;redraw(root);}
 });
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
 root.addEventListener('change',event=>{
  const t=event.target;
  if(t.hasAttribute('data-photo-sort')){ui.photoSort=t.value;ui.photoIndex=0;redraw(root);return;}
  if(t.dataset.state==='guestCount'){state.guestCount=Math.max(1,Math.min(300,Number(t.value)||80));save();redraw(root);return;}
  if(t.dataset.ui){ui[t.dataset.ui]=t.value;redraw(root);return;}
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
  if(event.key==='Escape'&&ui.expanded&&!ui.photoLightbox){location.hash='#/admin/venues';}
  if(event.key==='Enter'&&event.target.matches('[data-ui="query"]')){event.preventDefault();ui.query=event.target.value;redraw(root);}
 });
}
