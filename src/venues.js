
/* Venue comparison — browser-side prototype hosted on public GitHub Pages.
 * Selected venue quote amounts supplied by the couple are deliberately preloaded
 * for immediate cross-device comparison; these numbers are PUBLIC in the frontend.
 * Original photographed documents remain in access-controlled Google Drive.
 * Backend authentication is REQUIRED before this can be called a private admin.
 */
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
  ['look','Атмосфера и красота',25],
  ['total','Соотношение цены и качества',25],
  ['comfort','Комфорт гостей / единый зал',15],
  ['travel','Логистика и дорога',15],
  ['food','Кухня и сервис',10],
  ['freedom','Гибкость / подрядчики',10]
];
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
let ui={kind:'all',query:'',sort:'name',expanded:null,compare:[],onlyVisited:false};
const h=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=(v)=>typeof v==='number'&&Number.isFinite(v)?Math.round(v).toLocaleString('ru-RU')+' ₽':'—';
const safeUrl=(v)=>{try{const u=new URL(String(v));return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}};
const get=(base)=>({...base,...(state.venues[base.id]||{}),cost:{...(base.publiclyAdvertised||{}),...(base.cost||{}),...(state.venues[base.id]?.cost||{})},ratings:{...(state.venues[base.id]?.ratings||{})}});
const numbers=(v)=>Number.isFinite(Number(v))&&v!==''&&v!==null?Math.max(0,Number(v)):null;
function save(){state.updated=new Date().toISOString();try{localStorage.setItem(STORE,JSON.stringify(state));}catch{}}
function patch(id,key,value){
 const old=state.venues[id]||{};
 state.venues[id]={...old,[key]:value};save();
}
function weighted(v){
 const xs=CRITERIA.filter(([k])=>v.ratings[k]!==null && v.ratings[k]!==undefined && v.ratings[k]!=='');
 if(xs.length!==CRITERIA.length)return {value:null,complete:xs.length};
 const denominator=CRITERIA.reduce((s,[k])=>s+(numbers(state.weights[k])??0),0)||1;
 const value=CRITERIA.reduce((s,[k])=>s+((numbers(v.ratings[k])??0)/5)*(numbers(state.weights[k])??0),0)/denominator*100;
 return {value:Math.round(value),complete:xs.length};
}
function estimate(v){
 const c=v.cost||{};
 const quoteTotal=numbers(c.quoteTotal),quoteGuests=numbers(c.quoteGuests);
 if(quoteTotal!==null&&quoteGuests===state.guestCount)return {value:Math.round(quoteTotal),partial:false,isQuote:true,quoteDate:v.quoteDate||null};
 const menu=numbers(c.menu),rent=numbers(c.rent),tech=numbers(c.technical),extra=numbers(c.extra),service=numbers(c.service),min=numbers(c.minSpend);
 if(menu===null&&rent===null)return {value:null,partial:true};
 const meal=menu===null?0:(menu*state.guestCount);
 const spend=Math.max(meal,min??0);
 const val=(rent??0)+spend+(tech??0)+(extra??0)+spend*(service??0)/100;
 return {value:Math.round(val),partial:menu===null||rent===null||tech===null||extra===null||service===null};
}
function external(v){
 return [['Документ со сметой',v.quoteSource],['Диск с файлами',v.drive],['Фотографии',v.photos],['Сайт',v.website]].filter(([,url])=>safeUrl(url))
 .map(([label,url])=>'<a href="'+h(safeUrl(url))+'" target="_blank" rel="noopener noreferrer">'+h(label)+' ↗</a>').join('');
}
function status(v){
 const status=v.availability||'unknown';
 return {available:'19 июня — подтверждено',unavailable:'19 июня — занято',pending:'19 июня — уточняется',unknown:'19 июня — неизвестно'}[status]||'19 июня — неизвестно';
}
function row(v){
 const score=weighted(v),cost=estimate(v);
 const selected=ui.compare.includes(v.id);
 return '<tr class="vw-row" data-id="'+h(v.id)+'"><td><button type="button" class="vw-name" data-detail="'+h(v.id)+'">'+h(v.name)+'</button><small>'+h(v.area)+' · '+(v.region==='country'?'За городом':'Город')+'</small></td>'+
 '<td><span class="vw-state '+(v.visited?'vw-seen':'')+'">'+(v.visited?'● Просмотрели':'○ Не отмечено')+'</span></td>'+
 '<td><span class="vw-date '+(v.availability==='unavailable'?'vw-no':v.availability==='available'?'vw-yes':'')+'">'+h(status(v))+'</span></td>'+
 '<td>'+h(v.capacity||'—')+'</td>'+
 '<td class="vw-money">'+(cost.value===null?'—':(cost.partial?'от ':'')+rub(cost.value))+'<small>'+(cost.isQuote?('смета для '+state.guestCount+' гостей'+(cost.quoteDate?' · '+cost.quoteDate:'')+'; уточнить'):cost.partial?'неполный расчёт':'ориентир, проверить')+'</small></td>'+
 '<td class="vw-score">'+(score.value===null?'—':score.value+' / 100')+'<small>'+score.complete+'/6 оценок</small></td>'+
 '<td><div class="vw-actions"><button type="button" data-compare="'+h(v.id)+'" aria-pressed="'+selected+'">'+(selected?'Убрать':'Сравнить')+'</button><button type="button" data-detail="'+h(v.id)+'">Подробнее</button></div></td></tr>';
}
function detail(v){
 const score=weighted(v);const estimateText=estimate(v);
 return '<section class="vw-detail"><header class="vw-detail-head"><div><span class="vw-kicker">'+(v.region==='country'?'ЗАГОРОДНАЯ':'ГОРОДСКАЯ')+' ПЛОЩАДКА</span><h2>'+h(v.name)+'</h2><p>'+h(v.area)+'</p></div><button type="button" class="vw-close" data-close aria-label="Закрыть">×</button></header>'+
 '<div class="vw-detail-links">'+external(v)+'</div>'+
 '<div class="vw-detail-grid"><div class="vw-detail-block"><h3>Организация и статус</h3>'+
 '<label>Просмотр <select data-venue="'+h(v.id)+'" data-field="visited"><option value="false" '+(!v.visited?'selected':'')+'>Ещё не отмечен</option><option value="true" '+(v.visited?'selected':'')+'>Лично смотрели</option></select></label>'+
 '<label>19 июня 2027 <select data-venue="'+h(v.id)+'" data-field="availability"><option value="unknown">Неизвестно</option><option value="pending">Уточняется</option><option value="available">Подтверждено свободно</option><option value="unavailable">Занято</option></select></label>'+
 '<label>Вместимость банкетом <input type="number" min="0" data-venue="'+h(v.id)+'" data-field="capacity" value="'+h(v.capacity??'')+'" placeholder="Неизвестно"></label>'+
 '<label>Дата сметы (если известна) <input type="date" data-venue="'+h(v.id)+'" data-field="quoteDate" value="'+h(v.quoteDate||'')+'"></label>'+
 '<label>Ссылка на папку Drive <input type="url" data-venue="'+h(v.id)+'" data-field="drive" value="'+h(v.drive||'')+'" placeholder="https://drive.google.com/..."></label>'+
 '<label>Ссылка на фотоальбом <input type="url" data-venue="'+h(v.id)+'" data-field="photos" value="'+h(v.photos||'')+'" placeholder="https://drive.google.com/..."></label>'+
 '<label>Контакт / сайт <input type="url" data-venue="'+h(v.id)+'" data-field="website" value="'+h(v.website||'')+'" placeholder="https://..."></label>'+
 '</div><div class="vw-detail-block"><h3>Бюджет для '+state.guestCount+' гостей</h3>'+
 COSTS.map(([key,label])=>'<label>'+h(label)+'<input type="number" min="0" step="any" data-venue="'+h(v.id)+'" data-cost="'+key+'" value="'+h(v.cost[key]??'')+'" placeholder="Неизвестно"></label>').join('')+
 '<p class="vw-calc-result">'+(estimateText.isQuote?'Сумма полученной сметы':'Расчёт')+': <strong>'+(estimateText.value===null?'Недостаточно данных':(estimateText.partial?'от ':'')+rub(estimateText.value))+'</strong></p>'+
 (estimateText.isQuote?'<p class="vw-muted">Сумма соответствует только '+state.guestCount+' гостям'+(estimateText.quoteDate?' на дату '+h(estimateText.quoteDate):'')+'. Это не подтверждение цены на 19 июня.</p>':'')+
 (v.quoteAlternatives?.length?'<div class="vw-quote-options"><strong>Полученные варианты сметы:</strong><ul>'+v.quoteAlternatives.map(q=>'<li>'+h(q.date)+' · '+h(q.guests)+' гостей · '+rub(q.total)+'</li>').join('')+'</ul></div>':'')+
 '<p class="vw-muted">Формула: аренда + максимум(меню × гости; минимальный заказ) + оборудование + прочие расходы + сервисный % от расходов на питание. Не включайте депозит второй раз. Для реального итога уточните базу сервисного сбора и все исключения.</p>'+
 '</div></div>'+
 '<div class="vw-detail-block"><h3>Ваша оценка по критериям</h3><p class="vw-muted">Рейтинг рассчитывается только после заполнения всех шести пунктов. Сейчас: '+score.complete+'/6.</p><div class="vw-rating-grid">'+
 CRITERIA.map(([key,label])=>'<label>'+h(label)+'<select data-venue="'+h(v.id)+'" data-rating="'+key+'"><option value="">—</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'" '+(Number(v.ratings[key])===n?'selected':'')+'>'+n+' / 5</option>').join('')+'</select></label>').join('')+
 '</div></div>'+
 '<div class="vw-detail-grid"><div class="vw-detail-block"><h3>Плюсы</h3><textarea rows="4" data-venue="'+h(v.id)+'" data-field="pros" placeholder="Что действительно понравилось">'+h(v.pros||'')+'</textarea><h3>Минусы / риски</h3><textarea rows="4" data-venue="'+h(v.id)+'" data-field="cons" placeholder="Что не подходит">'+h(v.cons||'')+'</textarea></div>'+
 '<div class="vw-detail-block"><h3>Договорённости и вопросы</h3><textarea rows="8" data-venue="'+h(v.id)+'" data-field="notes" placeholder="Даты, зал, договор, дополнительные сборы, контакты, источник">'+h(v.notes||'')+'</textarea>'+
 (v.publicNote?'<p class="vw-muted"><b>Открытая информация:</b> '+h(v.publicNote)+'</p>':'')+
 '<p class="vw-muted">Все изменения в этой демонстрации хранятся только в этом браузере. Сделайте экспорт JSON для резервной копии.</p></div></div></section>';
}
function selectedCompare(all){
 const subset=ui.compare.map(id=>all.find(v=>v.id===id)).filter(Boolean);
 if(subset.length<2)return '<p class="vw-muted">Выберите минимум две площадки кнопкой «Сравнить», чтобы увидеть их рядом.</p>';
 const fields=[['Район',v=>v.area],['19 июня',v=>status(v)],['Просмотр',v=>v.visited?'Да':'Не отмечено'],['Гостей',v=>v.capacity||'—'],['Бюджет',v=>{let q=estimate(v);return q.value===null?'—':(q.partial?'от ':'')+rub(q.value)+(q.isQuote&&q.quoteDate?' (смета '+q.quoteDate+')':'')}],['Рейтинг',v=>weighted(v).value===null?'Не заполнен':weighted(v).value+'/100'],['Плюсы',v=>v.pros||'—'],['Риски',v=>v.cons||'—']];
 return '<div class="vw-scroll"><table class="vw-matrix"><thead><tr><th>Критерий</th>'+subset.map(v=>'<th>'+h(v.name)+'</th>').join('')+'</tr></thead><tbody>'+fields.map(([label,fn])=>'<tr><th>'+label+'</th>'+subset.map(v=>'<td>'+h(fn(v))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
export function renderVenueAdmin(){
 const all=PUBLIC_VENUES.map(get);
 const visited=all.filter(v=>v.visited).length;
 const full=all.filter(v=>weighted(v).value!==null).length;
 let list=all.filter(v=>(ui.kind==='all'||v.region===ui.kind)&&(!ui.onlyVisited||v.visited)&&(v.name+' '+v.area).toLowerCase().includes(ui.query.toLowerCase()));
 if(ui.sort==='score')list.sort((a,b)=>(weighted(b).value??-1)-(weighted(a).value??-1)||a.name.localeCompare(b.name,'ru'));
 if(ui.sort==='price')list.sort((a,b)=>(estimate(a).value??Infinity)-(estimate(b).value??Infinity)||a.name.localeCompare(b.name,'ru'));
 if(ui.sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 const detailVenue=all.find(v=>v.id===ui.expanded);
 return '<div class="vw-page" data-venues-page><div class="dashboard-heading vw-head"><div><div class="eyebrow">ОРГАНИЗАЦИЯ / ВЫБОР МЕСТА</div><h1>Сравнение площадок</h1><p>Регистрация 17 июня · торжество желательно 19 июня 2027 · город и загород</p></div><div class="vw-count"><strong>'+all.length+'</strong><span>площадок</span></div></div>'+
 '<div class="vw-alert"><strong>Важная оговорка по доступу.</strong> Текущая админка на GitHub Pages публичная и пока без входа. Суммы смет Александровского парка и Vinity уже включены в каталог и видны на всех устройствах, а исходные документы остаются в Google Drive с отдельными правами доступа. Персональные заметки, введённые здесь вручную, сохраняются только в вашем браузере. Приватная синхронизация потребует серверной авторизации.</div>'+
 '<div class="vw-stats"><div><strong>'+all.length+'</strong><span>На рассмотрении</span></div><div><strong>'+visited+'</strong><span>Просмотрены</span></div><div><strong>'+full+'</strong><span>С полной оценкой</span></div><div><strong>'+all.filter(v=>v.availability==='available').length+'</strong><span>19 июня свободно (подтверждено)</span></div></div>'+
 '<div class="vw-toolbar"><div class="vw-filter"><label>Район <select data-ui="kind"><option value="all" '+(ui.kind==='all'?'selected':'')+'>Все</option><option value="city" '+(ui.kind==='city'?'selected':'')+'>В городе</option><option value="country" '+(ui.kind==='country'?'selected':'')+'>За городом</option></select></label><label>Гостей <select data-state="guestCount"><option value="60">60</option><option value="70">70</option><option value="80">80</option><option value="90">90</option><option value="100">100</option></select></label><label>Сортировать <select data-ui="sort"><option value="name">По названию</option><option value="price">По известной цене</option><option value="score">По вашей оценке</option></select></label><label class="vw-search">Поиск<input type="search" data-ui="query" value="'+h(ui.query)+'" placeholder="Название / район"></label></div>'+
 '<div class="vw-filetools"><label class="vw-upload">Импорт JSON <input type="file" accept="application/json,.json" data-import hidden></label><button type="button" data-export>Экспорт данных</button><button type="button" data-ui-toggle="onlyVisited" aria-pressed="'+ui.onlyVisited+'">Только просмотренные</button></div></div>'+
 '<div class="vw-panel"><div class="vw-panel-title"><h2>Все площадки</h2><span>Предварительные оценки не выдаются за коммерческие предложения</span></div><div class="vw-scroll"><table class="vw-table"><thead><tr><th>Площадка</th><th>Посещение</th><th>19 июня 2027</th><th>Вместимость</th><th>Оценка бюджета</th><th>Ваш рейтинг</th><th>Действие</th></tr></thead><tbody>'+
 list.map(row).join('')+'</tbody></table></div>'+(list.length?'':'<p class="vw-empty">По выбранному фильтру площадки не найдены.</p>')+'</div>'+
 '<div class="vw-panel"><div class="vw-panel-title"><h2>Сравнить рядом</h2><span>До четырёх вариантов</span></div>'+selectedCompare(all)+'</div>'+
 '<div class="vw-panel"><div class="vw-panel-title"><h2>Вес критериев рейтинга</h2><span>Рейтинг доступен только при 6/6 оценках</span></div><div class="vw-weights">'+CRITERIA.map(([key,label])=>'<label><span>'+h(label)+'</span><input type="number" min="0" max="100" step="1" data-weight="'+key+'" value="'+h(state.weights[key])+'"><span>%</span></label>').join('')+'</div><p class="vw-muted">Весовые коэффициенты автоматически нормируются при расчёте. Цена и доступность сравниваются дополнительно и не подменяются субъективной оценкой.</p></div>'+
 (detailVenue?'<div class="vw-modal-wrap"><div class="vw-modal" role="dialog" aria-modal="true" aria-label="Карточка площадки">'+detail(detailVenue)+'</div></div>':'')+'</div>';
}
function redraw(root){const el=root.querySelector('[data-venues-page]');if(!el)return;el.outerHTML=renderVenueAdmin();const n=root.querySelector('[data-state="guestCount"]');if(n)n.value=String(state.guestCount);for(const [key,v] of [['kind',ui.kind],['sort',ui.sort]]){const x=root.querySelector('[data-ui="'+key+'"]');if(x)x.value=v;}for(const s of root.querySelectorAll('select[data-field="availability"]'))s.value=get(PUBLIC_VENUES.find(x=>x.id===s.dataset.venue)).availability||'unknown';}
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
   const out={...old};for(const f of fields)if(Object.hasOwn(v,f))out[f]=v[f];
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
  const target=event.target.closest('[data-detail],[data-close],[data-compare],[data-export],[data-ui-toggle]');if(!target)return;
  if(target.dataset.detail){ui.expanded=target.dataset.detail;redraw(root);}
  else if(target.hasAttribute('data-close')){ui.expanded=null;redraw(root);}
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
    else if(t.dataset.rating){patch(id,'ratings',{...old.ratings,[t.dataset.rating]:t.value?Number(t.value):null});}
    redraw(root);
  }
 });
 // Search re-renders only when Enter is pressed or focus leaves input.
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&ui.expanded){ui.expanded=null;redraw(root);}
  if(event.key==='Enter'&&event.target.matches('[data-ui="query"]')){event.preventDefault();ui.query=event.target.value;redraw(root);}
 });
}
