
/* Single consistent venue card, cost schedule and fully browseable Wedding Drive galleries. */
import {VENUE_PHOTOS_1} from './venues-photos-1.js';
import {VENUE_PHOTOS_2} from './venues-photos-2.js';
import {VENUE_PHOTOS_3} from './venues-photos-3.js';
import {VENUE_PHOTOS_4} from './venues-photos-4.js';
import {VENUE_PRICING,VENUE_COST_LABELS} from './venues-pricing.js';
import {PERSONAL_CRITERIA,RATING_CRITERIA,RATING_MAX} from './venue-evaluation.js';

const ALL_PHOTOS={...VENUE_PHOTOS_1,...VENUE_PHOTOS_2,...VENUE_PHOTOS_3,...VENUE_PHOTOS_4};
const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>typeof n==='number'&&Number.isFinite(n)?Math.round(n).toLocaleString('ru-RU')+' ₽':'—';
const escUrl=u=>{try{const x=new URL(String(u));return /^https?:$/.test(x.protocol)?x.href:''}catch{return ''}};
const thumb=(id,size=920)=>'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w'+size;
const original=id=>'https://drive.google.com/file/d/'+encodeURIComponent(id)+'/view';
const rowGroups=[['Основные расходы',['menu','rent','deposit','service']],['Техника',['sound','light','tech']],['Еда и дополнительные услуги',['welcome','drinks','cake','corkage','staff','extension']]];
const labelMap=Object.fromEntries(VENUE_COST_LABELS.map(([key,title,unit])=>[key,{title,unit}]));

// Photo priority for BOTH the main table and every venue hero/gallery.
// Never allow rooms with equipment, toilets, corridors or close-ups to outrank
// a representative banquet hall, ceremonial interior or exterior facade.
const photoPriority=x=>{
 const section=String(x.section||'').toLowerCase();
 const name=String(x.name||'').toLowerCase();
 if(/техническ|техзон|пульт|оборудован|аппаратур|коммуникаци|монтаж|вентиляци|кабель|щитова/.test(name))return 100;
 if(/сануз|туалет|унитаз|раковин|кабин|писсуар|wc/.test(name)||/сануз/.test(section))return 95;
 if(/грим|служеб|подсоб|кухн|склад|персонал|гардероб/.test(name)||/служебн|грим/.test(section))return 90;
 if(/банкетный зал.*переход/.test(name))return 60;
 if(/коридор|проход|лестниц|перехо|лифт|двер|вешалк/.test(name)||/входы и переходы/.test(section))return 80;
 if(/детал|аквариум|светильник|поручень|табличк|сервировк|крупный план|настил/.test(name))return 70;
 if(/банкет|парадн.*зал|основн.*зал|торжественн.*зал|застеклённ.*галер/.test(name)||/залы/.test(section))return 0;
 if(/фасад|здани|дворец|особняк|главный вход|архитектур/.test(name))return 1;
 if(/вид|панорам|террас|балкон|крыша|залив/.test(name)||/террас|виды/.test(section))return 2;
 if(/парк|сад|территор|двор|входная группа/.test(name)||/территор/.test(section))return 3;
 if(/лаунж|фотозон|фойе|холл|гостиная/.test(name)||/лаунж|фотозон/.test(section))return 4;
 return 5; // Generic IMG files remain visible, but are not misrepresented as banquet halls.
};
// Reviewed phone-photo covers for albums where filenames are only IMG timestamps.
const FEATURED_COVERS={
 'vesenniy':'1xrDBe6UYNcGcxGFadQ-Di8LCnHeM36Ux',    // verified wide banquet hall 02 (3072x1728)
 'putilov':'1Yo4j6ZhK_ycH38ZeHXKCGnaMmQfcHme4',       // ceremonial grand hall
 'repino-riviera':'1PCv5jMFTatJ21kuaUD2RaPx7JFXYsfPM', // building and bay
 'panorama':'1PwrAgzMU1kmK772YRhQWuQNGrfaU1d0X',     // building from outside
 'harmony':'1giLTNx8i-okBCfyiZChmaC0I3MTVsaAe',      // wide main event hall
 'palma':'1NoeveNL-VYzPILfXxUiC4nzBcgV_4BSp'        // full panoramic view of the 256 m² ceremonial hall supplied via Telegram
};
// In the current Maryino phone album there is no qualifying building or
// banquet-hall photograph. A neutral hero is preferable to a painting/close-up.
const NO_COVER_UNTIL_REVIEW=new Set(['maryino']);
const KNOWN_TECHNICAL=new Set([
 '1VBBVH6mF20BLN6X8BoEVxiE2AlOlibcC', // Putilov personal/auxiliary photo
 '1CYyg_cZbFreCVrWC3ML8CzOqTNhSMyzo', // Repino-Riviera dark corridor
 '1h7ssR49QTrOuJGft4e3qnFmI96ICBMcw'  // Panorama equipment close-up
]);
const imageRelevance=x=>{
 const name=String(x.name||'').toLowerCase();
 return (/общий вид|панорам|парадн|фасад|целиком/.test(name)?120:0)
   +(/банкетный зал|павильон|главный зал|основной зал|здание|особняк/.test(name)?45:0)
   +(/сцена|столы|вход/.test(name)?10:0)
   -(/другой|дополнительный/.test(name)?15:0)
   -(/детал|аквариум|светильник|поручень|табличка|сервировка/.test(name)?70:0);
};
export function getVenuePhotos(v){
 const files=ALL_PHOTOS[v.id]?.length?ALL_PHOTOS[v.id]:(v.gallery||[]).map(x=>({id:x.id,name:x.label||'Фотография',section:x.label||'Общий альбом',folder:x.folder||null}));
 return [...files].sort((a,b)=>{
  const featured=FEATURED_COVERS[v.id];
  const apr=featured===a.id?-20:KNOWN_TECHNICAL.has(a.id)?120:photoPriority(a);
  const bpr=featured===b.id?-20:KNOWN_TECHNICAL.has(b.id)?120:photoPriority(b);
  return apr-bpr||imageRelevance(b)-imageRelevance(a)||a.name.localeCompare(b.name,'ru',{numeric:true});
 });
}
export function getVenueCover(v){
 const files=getVenuePhotos(v);
 // The ordered collection already puts banquet halls and ceremonial exteriors first.
 return NO_COVER_UNTIL_REVIEW.has(v.id)?null:(files[0]||null);
}
export function filteredVenuePhotos(v,ui={}){
 const photos=getVenuePhotos(v).filter(x=>ui.photoSection==='all'||!ui.photoSection||x.section===ui.photoSection);
 const mode=ui.photoSort||'original';
 // Sorting controls may rearrange main images, but never move technical
 // rooms, toilets, corridors or equipment photos ahead of the main spaces.
 const tail=x=>photoPriority(x)>=80?1:0;
 if(mode==='name')return [...photos].sort((a,b)=>tail(a)-tail(b)||a.name.localeCompare(b.name,'ru',{numeric:true}));
 if(mode==='reverse'){
  const indexes=new Map(photos.map((x,i)=>[x,i]));
  return [...photos].sort((a,b)=>tail(a)-tail(b)||indexes.get(b)-indexes.get(a));
 }
 if(mode==='section')return [...photos].sort((a,b)=>tail(a)-tail(b)||photoPriority(a)-photoPriority(b)||a.name.localeCompare(b.name,'ru',{numeric:true}));
 return photos;
}
const sourceLinks=v=>{
 const all=[['Документы и предложение',v.quoteSource],['Папка документов',v.documentsFolder],['Фотографии в Google Drive',v.photos],['Папка площадки',v.drive],['Официальный сайт',v.website],...((v.documents||[]).map(x=>[x.label,x.url])),...((v.telegramLinks||[]).map(x=>[x.label,x.url]))];
 const seen=new Set();
 return all.filter(([l,u])=>{const safe=escUrl(u);if(!safe||seen.has(safe))return false;seen.add(safe);return true;})
  .map(([l,u])=>'<a href="'+h(escUrl(u))+'" target="_blank" rel="noopener noreferrer">'+h(l)+' ↗</a>').join('');
};
const getCost=v=>{
 const base=VENUE_PRICING[v.id]||{};
 const cost={...base},updates=v.cost||{};
 // Explicit organizer corrections appear everywhere, not just in the calculator.
 for(const [source,target] of [['menu','menu'],['rent','rent'],['service','service'],['technical','tech'],['minSpend','deposit'],['sound','sound'],['light','light'],['welcome','welcome'],['drinks','drinks'],['cake','cake'],['corkage','corkage'],['staff','staff'],['extension','extension']]){
  const raw=updates[source];
  if(raw===null||raw===undefined||raw==='')continue;
  const value=Number(raw);
  if(Number.isFinite(value)&&value>=0)cost[target]={...(base[target]||{}),value,note:'Указано организатором · '+(base[target]?.note||'')};
 }
 return cost;
};
// The value the organizer sees is also its editor. Never render a second edit-only card.
function inlineValue(key,value,{label='',kind='text',className='',empty='Нажмите, чтобы добавить'}={}){
 const missing=value===null||value===undefined||String(value).trim()==='';
 const numeric=Number(value);
 const show=missing?empty:kind==='number'&&Number.isFinite(numeric)&&/^(?:cost:|extra:)/.test(key)?(key==='cost:service'?numeric.toLocaleString('ru-RU')+'%':money(numeric)):String(value);
 return '<button type="button" class="vdp-inline '+className+'" data-venue-inline="'+h(key)+'" data-inline-kind="'+h(kind)+'" title="Изменить: '+h(label||key)+'" aria-label="Редактировать: '+h(label||key)+'"><span class="vdp-inline-text">'+h(show)+'</span><span class="vdp-inline-pencil" aria-hidden="true">✎</span></button>';
}
const lineItems=items=>(items||[]).map(item=>'• '+item).join('\n');
function amountCell(entry,unit){
 if(!entry||entry.value===null||entry.value===undefined)return '<span class="vdp-unknown">Нет данных</span>';
 if(typeof entry.value==='string')return '<span class="vdp-included">'+h(entry.value)+'</span>';
 return '<strong class="vdp-amount">'+(unit==='%'?h(entry.value)+'%':money(entry.value))+(unit==='/гость'||unit==='/час'?'<small> '+h(unit)+'</small>':'')+'</strong>';
}
function costSchedule(v){
 const p=getCost(v);
 return rowGroups.map(([title,fields])=>'<section class="vdp-cost-group"><h3>'+h(title)+'</h3><div class="vdp-cost-list">'+fields.map(k=>{
  const f=labelMap[k],e=p[k],value=e?.value;
  const included=typeof value==='string'&&/включено|входит/i.test(value);
  const current=(value===null||value===undefined)?'unknown':included?'included':'priced';
  const field='cost:'+({deposit:'minSpend',tech:'technical'}[k]||k);
  return '<div class="vdp-cost-row vdp-cost-'+current+'"><div><b>'+h(f.title)+'</b>'+(e?.note?'<details class="vdp-cost-note"><summary>Условия</summary><p>'+h(e.note)+'</p></details>':'')+'</div><div>'+inlineValue(field,value,{label:f.title,kind:'number',empty:'Не рассчитано'})+((e?.unit||f.unit)&&typeof value==='number'?'<small class="vdp-cost-unit">'+h(e?.unit||f.unit)+'</small>':'')+'</div></div>';
 }).join('')+'</div></section>').join('');
}
function quoteCards(v,guests){
 const quotes=v.quotes||[];
 if(!quotes.length)return '<p class="vdp-subtle">Полученной сметы пока нет. Добавьте вариант здесь, без перехода к отдельному редактору.</p>';
 return '<div class="vdp-quote-list">'+quotes.map((q,i)=>'<button type="button" class="vdp-quote-card vdp-quote-editable'+(Number(q.guests)===guests?' is-current':'')+'" data-inline-quote="'+i+'" aria-label="Изменить смету на '+h(q.guests)+' гостей"><small>'+h(q.guests)+' гостей'+(q.date?' · '+h(q.date.slice(8,10))+'.06.2027':'')+' · '+(q.kind==='scenario'?'Сценарий':q.kind==='estimate'?'Прогноз менеджера':'Полученная смета')+'</small><strong>'+money(q.total)+'</strong><p>'+h(q.label||'')+'</p><span class="vdp-inline-pencil" aria-hidden="true">✎</span></button>').join('')+'</div>';
}
function budget(v,ctx){
 const guests=ctx.guests,e=ctx.estimate(v),extra=ctx.extraTotal(v);
 const total=e.value===null?null:e.value+extra;
 const base=e.value===null?'Не рассчитано':money(e.value);
 const basis=e.value===null?'Нет цены банкета или аренды':e.isQuote&&!e.partial?'Полученная смета':'Неполный расчёт';
 const missing=e.missing?.length?'<p class="vdp-cost-missing"><strong>Нужно уточнить:</strong> '+h(e.missing.join(', '))+'</p>':'';
 const known=e.value===null&&e.knownSubtotal>0?'<p class="vdp-cost-known">Сейчас известно: '+money(e.knownSubtotal)+' — это не итоговая стоимость.</p>':'';
 return '<div class="vdp-budget-header"><div><small>Смета / оценка · '+h(guests)+' гостей</small><strong>'+base+'</strong><span>'+basis+'</span></div>'+
 '<div><small>Дополнительные расходы</small><strong>'+money(extra)+'</strong><span>Поверх стоимости площадки</span></div>'+
 '<div><small>Итого с доплатами</small><strong>'+(total===null?'Не рассчитано':(e.partial?'от ':'')+money(total))+'</strong><span>'+(e.partial?'Только известные суммы':'На основании полученной сметы')+'</span></div></div>'+known+missing;
}
function dates(v,ctx){
 return '<div class="vdp-dates">'+[['18','18 июня'],['19','19 июня'],['20','20 июня']].map(([n,label])=>{const status=ctx.dayStatus(v,n),txt=ctx.dayText(v,n);return '<button type="button" data-venue-inline="date:'+n+'" data-inline-kind="date" class="vdp-date vdp-date-editable '+h(status)+'" aria-label="Изменить доступность '+label+'"><span>'+label+(n==='19'?' · приоритет':'')+'</span><strong>'+h(txt)+' <span class="vdp-inline-pencil" aria-hidden="true">✎</span></strong></button>'}).join('')+'</div>';
}
function photoTile(photo,i,isSelected){
 return '<button type="button" class="vdp-thumb '+(isSelected?'is-active':'')+'" data-photo-open="'+i+'" title="'+h(photo.name)+'"><img loading="lazy" alt="'+h(photo.name)+'" src="'+thumb(photo.id,550)+'"><span>'+h(photo.name)+'</span></button>';
}
function gallery(v,ui){
 const all=getVenuePhotos(v),items=filteredVenuePhotos(v,ui),selected=Math.max(0,Math.min(items.length-1,ui.photoIndex||0));
 if(!all.length)return '<div class="vdp-emptyphotos"><div class="vdp-emptyicon">▧</div><h3>Фотографии пока не загружены</h3><p>В Wedding Drive для этой площадки пока нет доступных фотографий с телефона.</p>'+(v.photos?'<a href="'+h(v.photos)+'" target="_blank" rel="noopener noreferrer">Открыть папку с фотографиями ↗</a>':'')+'</div>';
 const sections=[...new Set(all.map(x=>x.section))];
 const pills='<div class="vdp-photo-categories"><button type="button" data-photo-section="all" class="'+(ui.photoSection==='all'||!ui.photoSection?'active':'')+'">Все фото <b>'+all.length+'</b></button>'+sections.map(s=>'<button type="button" data-photo-section="'+h(s)+'" class="'+(ui.photoSection===s?'active':'')+'">'+h(s)+' <b>'+all.filter(x=>x.section===s).length+'</b></button>').join('')+'</div>';
 const buttons='<div class="vdp-photo-tools"><div class="vdp-view-switch"><button type="button" data-photo-view="grid" class="'+(ui.photoView!=='gallery'?'active':'')+'">▦ Миниатюры</button><button type="button" data-photo-view="gallery" class="'+(ui.photoView==='gallery'?'active':'')+'">▣ Галерея</button></div><label>Порядок<select data-photo-sort><option value="original" '+(ui.photoSort==='original'?'selected':'')+'>Сначала залы и виды</option><option value="name" '+(ui.photoSort==='name'?'selected':'')+'>По названию</option><option value="section" '+(ui.photoSort==='section'?'selected':'')+'>По разделам</option><option value="reverse" '+(ui.photoSort==='reverse'?'selected':'')+'>Обратный</option></select></label></div>';
 const galleryMode='<div class="vdp-photo-focus"><div class="vdp-photo-main"><button type="button" data-photo-step="-1" aria-label="Предыдущее фото">‹</button><button type="button" data-photo-open="'+selected+'" class="vdp-photo-main-image" title="Открыть на весь экран"><img src="'+thumb(items[selected]?.id||all[0].id,1600)+'" alt="'+h(items[selected]?.name||'Фото')+'"></button><button type="button" data-photo-step="1" aria-label="Следующее фото">›</button></div><div class="vdp-photo-meta"><span>'+h(items[selected]?.section||'Фото')+' · '+(selected+1)+' / '+items.length+'</span><strong>'+h(items[selected]?.name||'')+'</strong></div><div class="vdp-filmstrip">'+items.map((x,i)=>photoTile(x,i,i===selected)).join('')+'</div></div>';
 const gridMode='<div class="vdp-photo-grid">'+items.map((x,i)=>photoTile(x,i,false)).join('')+'</div>';
 return '<div class="vdp-photos"><div class="vdp-photo-header"><div><h2>Фотографии <span>'+all.length+'</span></h2><p>Выберите комнату, переключите вид и откройте любой снимок на весь экран.</p></div>'+(v.photos?'<a href="'+h(v.photos)+'" target="_blank" rel="noopener noreferrer">Папки на Google Drive ↗</a>':'')+'</div>'+pills+buttons+(items.length?(ui.photoView==='gallery'?galleryMode:gridMode):'<p class="vdp-empty">В этом разделе снимков нет.</p>')+'</div>';
}
function lightbox(v,ui){
 if(!ui.photoLightbox)return '';
 const photos=filteredVenuePhotos(v,ui),index=Math.max(0,Math.min(photos.length-1,ui.photoIndex||0)),item=photos[index];
 if(!item)return '';
 return '<div class="vdp-lightbox" role="dialog" aria-modal="true" aria-label="Просмотр фотографий" data-photo-lightbox><div class="vdp-lightbox-top"><div><strong>'+h(v.name)+'</strong><span>'+h(item.section)+' · '+(index+1)+' из '+photos.length+'</span></div><a href="'+original(item.id)+'" target="_blank" rel="noopener noreferrer">Оригинал ↗</a><button type="button" data-photo-close aria-label="Закрыть">×</button></div><div class="vdp-lightbox-stage"><button type="button" data-photo-step="-1" aria-label="Предыдущее фото">‹</button><img src="'+thumb(item.id,2000)+'" alt="'+h(item.name)+'"><button type="button" data-photo-step="1" aria-label="Следующее фото">›</button></div><p class="vdp-lightbox-caption">'+h(item.name)+'</p><div class="vdp-lightbox-strip">'+photos.map((x,i)=>'<button type="button" data-photo-open="'+i+'" class="'+(i===index?'selected':'')+'" title="'+h(x.name)+'"><img loading="lazy" src="'+thumb(x.id,220)+'" alt=""></button>').join('')+'</div></div>';
}
function priceLine(v){
 const p=getCost(v),menu=p.menu;
 return (typeof menu?.value==='number'?'Меню '+money(menu.value)+' / гость':'Меню: уточнить')+' · '+(p.rent?typeof p.rent.value==='number'?'Аренда '+money(p.rent.value):String(p.rent.value||'условия уточняются'):'Аренда: уточнить');
}
function hero(v,ctx,photos){
 const pic=getVenueCover(v),budgeted=ctx.estimate(v),menu=getCost(v).menu;
 return '<div class="vdp-hero">'+(pic?'<div class="vdp-hero-image" style="background-image:linear-gradient(90deg,rgba(14,36,28,.86),rgba(14,36,28,.27)),url(&quot;'+thumb(pic.id,1600)+'&quot;)"></div>':'<div class="vdp-hero-image vdp-no-image"></div>')+'<div class="vdp-hero-content"><span class="vdp-eyebrow">'+(v.region==='city'?'САНКТ-ПЕТЕРБУРГ':'ЗА ГОРОДОМ')+' · '+(v.visited?'ПОСМОТРЕЛИ':'ОСМОТР НЕ ПОДТВЕРЖДЁН')+'</span><h1>'+inlineValue('name',v.name,{label:'Название площадки',className:'vdp-inline-hero'})+'</h1><div class="vdp-hero-area">'+inlineValue('area',v.area,{label:'Местоположение'})+'</div><div class="vdp-hero-bottom"><div><small>Банкет на гостя</small><strong>'+(typeof menu?.value==='number'?money(menu.value):'Нет данных')+'</strong></div><div><small>Бюджет на '+ctx.guests+' гостей</small><strong>'+(budgeted.value===null?'Не рассчитано':money(budgeted.value))+'</strong><span>'+(budgeted.value===null?'Известно: '+money(budgeted.knownSubtotal)+'; не итог':budgeted.partial?'Неполный расчёт':'По полученной смете')+'</span></div><div><small>Фотографии</small><strong>'+photos.length+'</strong><span>С осмотров в Wedding Drive</span></div></div></div></div>';
}
function scopeList(v){
 const blocks=[['Что входит','included'],['Доплаты и ограничения','excluded'],['Открытые вопросы','questions']];
 return '<div class="vdp-scope-grid">'+blocks.map(([title,key])=>'<section class="vdp-pane"><h3>'+title+'</h3>'+inlineValue(key,lineItems(v[key]),{label:title,kind:'lines',className:'vdp-inline-list',empty:'Добавить пункты'})+'</section>').join('')+'</div>';
}
function venueDocuments(v){
 return '<section class="vdp-pane vdp-files-pane"><div class="vdp-row-between"><div><h2>Документы и материалы площадки</h2><p class="vdp-files-intro">Исходные сметы, коммерческие предложения, документы, видео и папки Google Drive — всё привязано к этой площадке. Оригиналы хранятся в Wedding Drive.</p></div></div><div data-venue-files="'+h(v.id)+'"></div></section>';
}
function estimatePane(v,ctx){
 const p=getCost(v);
 const breakdown=v.budgetItems?.length?'<section class="vdp-pane"><h3>Строки из полученных материалов</h3><div class="vdp-source-rows">'+v.budgetItems.map(([n,c])=>'<div><span>'+h(n)+'</span><strong>'+money(c)+'</strong></div>').join('')+'</div><p class="vdp-note">Это строки источника, некоторые относятся к разным датам и пакетам. Точный итог берётся из полученной сметы, а не из произвольной суммы всех строк.</p></section>':'';
 const extras=[['alcohol','Алкоголь / сбор'],['decor','Декор'],['host','Ведущий и DJ'],['photoVideo','Фото / видео'],['transport','Транспорт'],['extension','Продление'],['other','Прочее']];
 return '<div class="vdp-budget-page"><div class="vdp-pane"><div class="vdp-row-between"><div><h2>Смета на '+ctx.guests+' гостей</h2><p>Единая структура для каждой площадки. Неизвестные суммы указаны отдельно, депозит не прибавляется дважды.</p></div><label>Гостей <input data-state="guestCount" type="number" min="1" max="300" step="1" value="'+ctx.guests+'" aria-label="Изменить число гостей и пересчитать смету"></label></div>'+budget(v,ctx)+'<details class="vdp-budget-context"><summary>Источник и пояснения к расчёту</summary><p>Неизвестные расходы не учтены.</p><p>'+h(ctx.estimate(v).note||'Требует уточнения')+'</p><p>'+h(p.summary||'Данные ещё уточняются')+'</p></details></div><div class="vdp-cost-grid">'+costSchedule(v)+'</div>'+breakdown+'<section class="vdp-pane"><div class="vdp-row-between"><h3>Полученные сметы и сценарии</h3><button type="button" class="vdp-inline-add" data-add-inline-quote>+ Добавить смету</button></div>'+quoteCards(v,ctx.guests)+'</section><section class="vdp-pane vdp-files-pane"><div data-venue-files="'+h(v.id)+'" data-venue-files-kind="quotes"></div></section><section class="vdp-pane"><h3>Остальные расходы свадьбы</h3><p>Вносите только расходы сверх предложения площадки. Нажмите на сумму, чтобы изменить её.</p><div class="vdp-extra-grid">'+extras.map(([k,n])=>'<div class="vdp-inline-extra"><span>'+n+'</span>'+inlineValue('extra:'+k,v.extras?.[k],{label:n,kind:'number',empty:'Не рассчитано'})+'</div>').join('')+'</div></section></div>';
}
function infoPane(v,ctx){
 const p=getCost(v);
 return '<div class="vdp-info-grid"><section class="vdp-pane vdp-live-terms"><h2>Условия площадки</h2>'+
 '<p class="vdp-inline-label">Описание</p>'+inlineValue('summary',v.summary,{label:'Условия площадки',kind:'multiline',className:'vdp-inline-block'})+
 '<p class="vdp-inline-label">Пояснение по стоимости из предложения</p>'+inlineValue('costSummary',v.costSummary??p.summary,{label:'Пояснение по смете',kind:'multiline',className:'vdp-inline-block',empty:'Добавить пояснение по стоимости'})+
 '<h3>Даты 18–20 июня</h3>'+dates(v,ctx)+
 '<h3>Вместимость и формат</h3><div class="vdp-inline-facts"><div><small>Максимум гостей</small>'+inlineValue('capacity',v.capacity,{label:'Вместимость',kind:'number'})+'</div><div><small>Формат и рассадка</small>'+inlineValue('capacityNote',v.capacityNote,{label:'Формат и рассадка',kind:'multiline'})+'</div></div>'+
 '<h3>Личный осмотр</h3>'+inlineValue('visited',v.visited?'Да':'Не подтверждено',{label:'Осмотр',kind:'visited'})+
 '<h3>Заметки</h3>'+inlineValue('notes',v.notes,{label:'Заметки организаторов',kind:'multiline',className:'vdp-inline-block'})+
 '<h3>Контакты</h3><div class="vdp-inline-facts"><div><small>Телефон</small>'+inlineValue('contactPhone',v.contactPhone||v.phone,{label:'Телефон'})+'</div><div><small>Email</small>'+inlineValue('contactEmail',v.contactEmail||v.email,{label:'Email',kind:'email'})+'</div></div>'+
 '<div class="vdp-source-links">'+sourceLinks(v)+'</div></section></div>'+scopeList(v);
}
function ratingPane(v,ctx){
 const sc=ctx.weighted(v);
 return '<section class="vdp-pane"><h2>Балльная оценка площадки</h2><p>19 июня — максимум 40 баллов; подтверждённые 18/20 июня — 24; город — 10. По остальным критериям выставляются баллы в пределах фактических условий. Отсутствующие сведения не считаются подтверждёнными.</p><div class="vdp-rating-summary"><strong>'+(sc.value===null?'Недостаточно данных':sc.value+' / '+RATING_MAX+' баллов')+'</strong><span>'+sc.complete+' из '+RATING_CRITERIA.length+' критериев оценены · '+(sc.provisional?'неполная оценка':'все учтены')+'</span></div><div class="vdp-rating-breakdown">'+(sc.breakdown||[]).map(x=>'<div title="'+h(x.note||'')+'"><span>'+h(x.label)+' <small>макс. '+x.maximum+'</small></span><strong>'+(x.value===null?'Нет данных':Math.round(x.value*10)/10+' / '+x.maximum)+'</strong></div>').join('')+'</div><h3>Оценка площадки после осмотра</h3><div class="vdp-extra-grid">'+PERSONAL_CRITERIA.map(([key,label])=>'<label>'+h(label)+'<select data-venue="'+h(v.id)+'" data-rating="'+key+'"><option value="">Пока не оценивали</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'" '+(Number(v.ratings?.[key])===n?'selected':'')+'>'+n+' / 5</option>').join('')+'</select></label>').join('')+'</div></section>';
}


export function renderVenueQuoteEditorRow(q={}){
 const amount=(k,v)=>'<label>'+h(k)+'<input data-quote-field="'+h(v)+'" type="number" min="0" step="1" value="'+h(q[v]??'')+'"></label>';
 return '<div class="vdp-editor-quote-row" data-venue-quote-row>'+
  amount('Гостей','guests')+amount('Сумма сметы, ₽','total')+
  '<label>Дата предложения<input data-quote-field="date" type="date" value="'+h(q.date||'')+'"></label>'+
  '<label>Примечание<input data-quote-field="label" type="text" value="'+h(q.label||'')+'" placeholder="Условия и состав предложения"></label>'+
  '<label>Тип<select data-quote-field="kind">'+[['quote','Подтверждённая смета'],['estimate','Прогноз'],['scenario','Сценарий']].map(([id,label])=>'<option value="'+id+'" '+((q.kind||'quote')===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
  '<button data-remove-venue-quote type="button" title="Убрать вариант из расчётов">Убрать</button>'+
  '</div>';
}

/* Prioritize decision data over venue research photos on the Overview tab.
   The gallery stays intact but appears AFTER all costs and conditions. */
function venueOverview(v,ctx,photos){
 const sc=ctx.weighted(v),quoted=ctx.estimate(v),extras=ctx.extraTotal(v);
 const total=quoted.value===null?null:quoted.value+extras;
 const day19=ctx.dayStatus(v,'19');
 const score=sc.value===null?'Не оценено':sc.value+' / '+RATING_MAX;
 const venueStatus=day19==='available'?'Свободно':ctx.dayText(v,'19');
 const prices=[['menu','Меню'],['rent','Аренда'],['deposit','Депозит'],['sound','Звук'],['light','Свет'],['service','Сервис']];
 const sourceCost=getCost(v);
 const metric=(label,main,note='',tone='')=>'<article class="vdp-overview-metric '+tone+'"><span class="vdp-overview-metric-label">'+label+'</span><div class="vdp-overview-metric-value">'+main+'</div>'+(note?'<small>'+note+'</small>':'')+'</article>';
 const head='<section class="vdp-parameter-dashboard" aria-label="Главные параметры площадки">'+
  '<div class="vdp-dashboard-title"><div><span class="vdp-dashboard-eyebrow">КРАТКО О ПЛОЩАДКЕ</span><h2>Параметры для выбора</h2></div><label class="vdp-dashboard-guest-count">Гостей <input data-state="guestCount" type="number" min="1" max="300" step="1" value="'+ctx.guests+'" aria-label="Число гостей для пересчёта сметы площадки"></label></div>'+
  '<div class="vdp-overview-metrics">'+
  metric('19 июня · приоритет',inlineValue('date:19',venueStatus,{label:'Доступность 19 июня',kind:'date'}),'Нажмите, чтобы уточнить дату','is-date '+h(day19))+
  metric('Бюджет · '+ctx.guests+' гостей','<strong>'+(total===null?'Не рассчитано':money(total))+'</strong>',quoted.value===null?'Известно: '+money(quoted.knownSubtotal)+'; не итог':quoted.partial?'Минимум, без неизвестных расходов':'Полученная смета','is-budget')+
  metric('Вместимость',inlineValue('capacity',v.capacity,{label:'Количество гостей',kind:'number',empty:'Уточнить'}),'Человек максимум')+
  metric('Рейтинг','<a class="vdp-metric-link" href="#/admin/venues/'+encodeURIComponent(v.id)+'/rating">'+h(score)+'</a>',sc.provisional?'Оценка предварительная':'Критерии учтены')+
  metric('Расположение',inlineValue('region',v.region==='country'?'За городом':'Санкт-Петербург',{label:'Расположение',kind:'region'}),'Город предпочтительнее')+
  metric('Осмотр',inlineValue('visited',v.visited?'Посмотрели':'Не подтверждён',{label:'Личный осмотр',kind:'visited'}),'Статус посещения')+
  '</div></section>';
 const detail='<div class="vdp-dashboard-details">'+
  '<section class="vdp-pane"><h2>Даты и формат</h2>'+dates(v,ctx)+
    '<details class="vdp-optional-notes"><summary>Полные условия и заметки менеджера</summary>'+inlineValue('summary',v.summary,{label:'Условия',kind:'multiline',className:'vdp-inline-block'})+'</details>'+
    '<p class="vdp-inline-label">Особенности вместимости и рассадки</p>'+inlineValue('capacityNote',v.capacityNote,{label:'Формат и рассадка',kind:'multiline',className:'vdp-inline-block'})+'</section>'+
  '<section class="vdp-pane"><h2>Стоимость и условия оплаты</h2>'+budget(v,ctx)+
    '<div class="vdp-key-costs">'+prices.map(([key,label])=>'<div><span>'+label+'</span>'+
       inlineValue('cost:'+({deposit:'minSpend'}[key]||key),sourceCost[key]?.value,{label,kind:'number',empty:'Нет данных'})+'</div>').join('')+'</div>'+
    '<div class="vdp-overview-actions"><a class="vdp-primary-link" href="#/admin/venues/'+encodeURIComponent(v.id)+'/budget">Полная смета по строкам →</a>'+
      '<a class="vdp-primary-link vdp-document-entry" href="#/admin/venues/'+encodeURIComponent(v.id)+'/documents">Файлы и предложения площадки →</a></div></section>'+
  '</div>';
 const gallerySection='<section class="vdp-pane vdp-overview-gallery"><div class="vdp-row-between"><div><h2>Фотографии площадки</h2><p class="vdp-gallery-context">Материалы осмотров для подробного знакомства с площадкой</p></div><a href="#/admin/venues/'+encodeURIComponent(v.id)+'/photos">Все '+photos.length+' фото →</a></div>'+gallery(v,ctx.ui)+'</section>';
 return '<div class="vdp-overview">'+head+detail+scopeList(v)+gallerySection+'</div>';
}

export function renderVenueNewPage(v,ctx){
 const tab=ctx.ui.detailTab||'overview',photos=getVenuePhotos(v);
 const tabs=[['overview','Обзор'],['photos','Фотографии'],['budget','Смета'],['documents','Документы'],['terms','Условия'],['rating','Рейтинг']];
 let body='';
 if(tab==='photos')body=gallery(v,ctx.ui);
 else if(tab==='budget')body=estimatePane(v,ctx);
 else if(tab==='documents')body=venueDocuments(v);
 else if(tab==='terms')body=infoPane(v,ctx);
 else if(tab==='rating')body=ratingPane(v,ctx);
 else body=venueOverview(v,ctx,photos);
 return '<div class="vdp-page"><div class="vdp-top-actions"><a class="vdp-back" href="#/admin/venues">← Все площадки</a><span class="vdp-inline-hint">Нажмите на значение, чтобы изменить его ✎</span></div>'+(ctx.ui.savedVenue===v.id?'<p class="vdp-save-confirmation" role="status">Изменения сохранены в общей базе. Таблица, рейтинг и смета обновлены.</p>':'')+hero(v,ctx,photos)+'<div class="vdp-layout"><nav class="vdp-tabs" aria-label="Разделы площадки">'+tabs.map(([id,l])=>'<a href="#/admin/venues/'+encodeURIComponent(v.id)+'/'+id+'" class="'+(id===tab?'selected':'')+'">'+l+'</a>').join('')+'</nav><div class="vdp-content">'+body+'</div><footer class="vdp-foot">Сметы и фотографии — из материалов площадок и Wedding Drive. Неизвестные расходы в итог не включены.</footer></div>'+lightbox(v,ctx.ui)+'</div>';
}
