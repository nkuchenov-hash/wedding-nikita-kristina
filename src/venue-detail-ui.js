
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
 'harmony':'1giLTNx8i-okBCfyiZChmaC0I3MTVsaAe'       // wide main event hall
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
 for(const [source,target] of [['menu','menu'],['rent','rent'],['service','service'],['technical','tech'],['minSpend','deposit']]){
  const raw=updates[source];
  if(raw===null||raw===undefined||raw==='')continue;
  const value=Number(raw);
  if(Number.isFinite(value)&&value>=0)cost[target]={...(base[target]||{}),value,note:'Указано организатором · '+(base[target]?.note||'')};
 }
 return cost;
};
function amountCell(entry,unit){
 if(!entry||entry.value===null||entry.value===undefined)return '<span class="vdp-unknown">Нет данных</span>';
 if(typeof entry.value==='string')return '<span class="vdp-included">'+h(entry.value)+'</span>';
 return '<strong class="vdp-amount">'+(unit==='%'?h(entry.value)+'%':money(entry.value))+(unit==='/гость'||unit==='/час'?'<small> '+h(unit)+'</small>':'')+'</strong>';
}
function costSchedule(v){
 const p=getCost(v);
 return rowGroups.map(([title,fields])=>'<section class="vdp-cost-group"><h3>'+h(title)+'</h3><div class="vdp-cost-list">'+fields.map(k=>{const f=labelMap[k],e=p[k];return '<div class="vdp-cost-row"><div><b>'+h(f.title)+'</b>'+(e?.note?'<small>'+h(e.note)+'</small>':'')+'</div><div>'+amountCell(e,f.unit)+'</div></div>'}).join('')+'</div></section>').join('');
}
function quoteCards(v,guests){
 const quotes=v.quotes||[];
 if(!quotes.length)return '<p class="vdp-subtle">Полученной полной сметы пока нет. Ниже приведён только известный минимум и открытые условия.</p>';
 return '<div class="vdp-quote-list">'+quotes.map(q=>'<article class="vdp-quote-card'+(Number(q.guests)===guests?' is-current':'')+'"><small>'+h(q.guests)+' гостей'+(q.date?' · '+h(q.date.slice(8,10))+'.06.2027':'')+' · '+(q.kind==='scenario'?'Альтернативный сценарий':q.kind==='estimate'?'Прогноз менеджера':'Полученная смета')+'</small><strong>'+money(q.total)+'</strong><p>'+h(q.label||'')+'</p></article>').join('')+'</div>';
}
function budget(v,ctx){
 const guests=ctx.guests,e=ctx.estimate(v),extra=ctx.extraTotal(v),total=e.value===null?null:e.value+extra;
 const selected=typeof e.value==='number';
 const known=selected?money(e.value):'Не рассчитано';
 const isQuote=e.isQuote&&!e.partial;
 return '<div class="vdp-budget-header"><div><small>Площадка · '+h(guests)+' гостей</small><strong>'+known+'</strong><span>'+(isQuote?'Полученная смета':e.partial?'Предварительный расчёт, не утверждённая смета':'Сумма предложения')+'</span></div><div><small>Внесённые доплаты</small><strong>'+money(extra)+'</strong><span>Только сверх суммы предложения</span></div><div><small>Суммарный известный бюджет</small><strong>'+money(total)+'</strong><span>Неизвестные расходы не учтены</span></div></div>';
}
function dates(v,ctx){
 return '<div class="vdp-dates">'+[['18','18 июня'],['19','19 июня'],['20','20 июня']].map(([n,label])=>{const s=ctx.dayStatus(v,n),txt=ctx.dayText(v,n);return '<div class="vdp-date '+h(s)+'"><span>'+label+(n==='19'?' · приоритет':'')+'</span><strong>'+h(txt)+'</strong></div>'}).join('')+'</div>';
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
 return '<div class="vdp-hero">'+(pic?'<div class="vdp-hero-image" style="background-image:linear-gradient(90deg,rgba(14,36,28,.86),rgba(14,36,28,.27)),url(&quot;'+thumb(pic.id,1600)+'&quot;)"></div>':'<div class="vdp-hero-image vdp-no-image"></div>')+'<div class="vdp-hero-content"><span class="vdp-eyebrow">'+(v.region==='city'?'САНКТ-ПЕТЕРБУРГ':'ЗА ГОРОДОМ')+' · '+(v.visited?'ПОСМОТРЕЛИ':'ОСМОТР НЕ ПОДТВЕРЖДЁН')+'</span><h1>'+h(v.name)+'</h1><p>'+h(v.area||'')+'</p><div class="vdp-hero-bottom"><div><small>Банкет на гостя</small><strong>'+(typeof menu?.value==='number'?money(menu.value):'Нет данных')+'</strong></div><div><small>Известная стоимость на '+ctx.guests+' гостей</small><strong>'+money(budgeted.value)+'</strong><span>'+(budgeted.partial?'Ориентир, не полная смета':'По полученной смете')+'</span></div><div><small>Фотографии</small><strong>'+photos.length+'</strong><span>С осмотров в Wedding Drive</span></div></div></div></div>';
}
function scopeList(v){
 const blocks=[['Что входит',v.included||[]],['Доплаты и ограничения',v.excluded||[]],['Открытые вопросы',v.questions||[]]];
 return '<div class="vdp-scope-grid">'+blocks.map(([title,values])=>'<section class="vdp-pane"><h3>'+title+'</h3>'+(values.length?'<ul>'+values.map(x=>'<li>'+h(x)+'</li>').join('')+'</ul>':'<p class="vdp-subtle">Пока нет сведений.</p>')+'</section>').join('')+'</div>';
}
function venueDocuments(v){
 return '<section class="vdp-pane vdp-files-pane"><div class="vdp-row-between"><div><h2>Документы и материалы площадки</h2><p class="vdp-files-intro">Исходные сметы, коммерческие предложения, документы, видео и папки Google Drive — всё привязано к этой площадке. Оригиналы хранятся в Wedding Drive.</p></div></div><div data-venue-files="'+h(v.id)+'"></div></section>';
}
function estimatePane(v,ctx){
 const p=getCost(v);
 const breakdown=v.budgetItems?.length?'<section class="vdp-pane"><h3>Строки из полученных материалов</h3><div class="vdp-source-rows">'+v.budgetItems.map(([n,c])=>'<div><span>'+h(n)+'</span><strong>'+money(c)+'</strong></div>').join('')+'</div><p class="vdp-note">Это строки источника, некоторые относятся к разным датам и пакетам. Точный итог берётся из полученной сметы, а не из произвольной суммы всех строк.</p></section>':'';
 const extras=[['alcohol','Алкоголь / сбор'],['decor','Декор'],['host','Ведущий и DJ'],['photoVideo','Фото / видео'],['transport','Транспорт'],['extension','Продление'],['other','Прочее']];
 return '<div class="vdp-budget-page"><div class="vdp-pane"><div class="vdp-row-between"><div><h2>Смета на '+ctx.guests+' гостей</h2><p>Единая структура для каждой площадки. Неизвестные суммы указаны отдельно, депозит не прибавляется дважды.</p></div><label>Гостей <input data-state="guestCount" type="number" min="1" max="300" step="1" value="'+ctx.guests+'" aria-label="Изменить число гостей и пересчитать смету"></label></div>'+budget(v,ctx)+'<p class="vdp-cost-summary"><strong>Основание расчёта:</strong> '+h(ctx.estimate(v).note||'Требует уточнения')+'</p><p class="vdp-cost-summary">'+h(p.summary||'Данные ещё уточняются')+'</p></div><div class="vdp-cost-grid">'+costSchedule(v)+'</div>'+breakdown+'<section class="vdp-pane"><h3>Полученные сметы и сценарии</h3>'+quoteCards(v,ctx.guests)+'</section><section class="vdp-pane vdp-files-pane"><div data-venue-files="'+h(v.id)+'" data-venue-files-kind="quotes"></div></section><section class="vdp-pane"><h3>Остальные расходы свадьбы</h3><p>Для общего бюджета вносите только расходы сверх предложения площадки. Поля сохраняются в этом браузере.</p><div class="vdp-extra-grid">'+extras.map(([k,n])=>'<label>'+n+'<input type="number" min="0" step="1" data-venue="'+h(v.id)+'" data-extra="'+k+'" placeholder="Не рассчитано" value="'+h(v.extras?.[k]??'')+'"></label>').join('')+'</div></section></div>';
}
function infoPane(v,ctx){
 const p=getCost(v);
 return '<div class="vdp-info-grid"><section class="vdp-pane"><h2>Условия площадки</h2><p>'+h(v.summary||'Условия ещё не получены')+'</p><p>'+h(p.summary||'')+'</p><h3>Даты 18–20 июня</h3>'+dates(v,ctx)+'<h3>Вместимость и формат</h3><p>'+h(v.capacityNote||('Заявленная вместимость: '+(v.capacity||'неизвестно')))+'</p><div class="vdp-source-links">'+sourceLinks(v)+'</div></section><section class="vdp-pane"><h2>Редактирование</h2><p>Изменения сохраняются на этом устройстве.</p><label>Лично смотрели<select data-venue="'+h(v.id)+'" data-field="visited"><option value="true" '+(v.visited?'selected':'')+'>Да</option><option value="false" '+(!v.visited?'selected':'')+'>Не подтверждено</option></select></label><div class="vdp-date-edit">'+[['18','18 июня'],['19','19 июня'],['20','20 июня']].map(([d,t])=>'<label>'+t+'<select data-venue="'+h(v.id)+'" data-day="'+d+'">'+[['unknown','Неизвестно'],['available','Свободно'],['pending','Уточняется'],['unavailable','Занято']].map(([s,l])=>'<option value="'+s+'" '+(ctx.dayStatus(v,d)===s?'selected':'')+'>'+l+'</option>').join('')+'</select></label>').join('')+'</div><label>Заметки<textarea rows="6" data-venue="'+h(v.id)+'" data-field="notes">'+h(v.notes||'')+'</textarea></label></section></div>'+scopeList(v);
}
function ratingPane(v,ctx){
 const sc=ctx.weighted(v);
 return '<section class="vdp-pane"><h2>Балльная оценка площадки</h2><p>19 июня — максимум 40 баллов; подтверждённые 18/20 июня — 24; город — 10. По остальным критериям выставляются баллы в пределах фактических условий. Отсутствующие сведения не считаются подтверждёнными.</p><div class="vdp-rating-summary"><strong>'+(sc.value===null?'Недостаточно данных':sc.value+' / '+RATING_MAX+' баллов')+'</strong><span>'+sc.complete+' из '+RATING_CRITERIA.length+' критериев оценены · '+(sc.provisional?'неполная оценка':'все учтены')+'</span></div><div class="vdp-rating-breakdown">'+(sc.breakdown||[]).map(x=>'<div title="'+h(x.note||'')+'"><span>'+h(x.label)+' <small>макс. '+x.maximum+'</small></span><strong>'+(x.value===null?'Нет данных':Math.round(x.value*10)/10+' / '+x.maximum)+'</strong></div>').join('')+'</div><h3>Оценка площадки после осмотра</h3><div class="vdp-extra-grid">'+PERSONAL_CRITERIA.map(([key,label])=>'<label>'+h(label)+'<select data-venue="'+h(v.id)+'" data-rating="'+key+'"><option value="">Пока не оценивали</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'" '+(Number(v.ratings?.[key])===n?'selected':'')+'>'+n+' / 5</option>').join('')+'</select></label>').join('')+'</div></section>';
}


/* Complete inline venue editor. Original PDFs and Google Drive images remain unchanged;
   organizer overrides are stored separately and can be revised here. */
const editField=(label,key,value,type='text',extra='')=>
 '<label>'+h(label)+'<input data-edit-field="'+h(key)+'" type="'+type+'" value="'+h(value??'')+'" '+extra+'></label>';
const editArea=(label,key,value,rows=3)=>
 '<label class="vdp-editor-full">'+h(label)+'<textarea data-edit-field="'+h(key)+'" rows="'+rows+'">'+h(value??'')+'</textarea></label>';
const editSelect=(label,key,value,choices)=>
 '<label>'+h(label)+'<select data-edit-field="'+h(key)+'">'+choices.map(([id,name])=>'<option value="'+h(id)+'" '+(String(value)===String(id)?'selected':'')+'>'+h(name)+'</option>').join('')+'</select></label>';
const editAmount=(label,key,value)=>
 editField(label,key,value??'','number','min="0" step="1" inputmode="decimal"');
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
function editPane(v,ctx){
 const editable=Object.assign({},v.cost||{});
 const statusList=[['unknown','Неизвестно'],['pending','Уточняется'],['available','Свободно подтверждено'],['unavailable','Занято']];
 const lines=key=>(v[key]||[]).join('\n');
 return '<form class="vdp-editor" data-venue-edit="'+h(v.id)+'">'+
  '<section class="vdp-pane vdp-editor-section"><h2>Основные сведения</h2><p>Редактируйте данные непосредственно здесь. Сохранение производится в базе админки, исходные документы и фотографии не изменяются.</p>'+
   '<div class="vdp-editor-grid">'+
   editField('Название площадки','name',v.name,'text','required maxlength="180"')+
   editField('Район / местоположение','area',v.area)+
   editSelect('Расположение','region',v.region,[['city','В городе'],['country','За городом']])+
   editAmount('Максимальная вместимость','capacity',v.capacity)+
   editSelect('Лично смотрели','visited',v.visited?'true':'false',[['true','Да'],['false','Пока не подтверждено']])+
   editField('Адрес','address',v.address)+
   editArea('Пояснения по вместимости и рассадке','capacityNote',v.capacityNote,3)+
   editArea('Описание, выводы после просмотра','summary',v.summary,4)+
   editArea('Заметки организаторов','notes',v.notes,4)+
   '</div></section>'+
  '<section class="vdp-pane vdp-editor-section"><h2>Доступность дат</h2><p>Приоритет — 19 июня. Отмечайте «Свободно» только после подтверждения менеджера.</p>'+
  '<div class="vdp-editor-dates">'+[['18','18 июня'],['19','19 июня · приоритет'],['20','20 июня']].map(([day,label])=>editSelect(label,'date-'+day,ctx.dayStatus(v,day),statusList)).join('')+'</div></section>'+
  '<section class="vdp-pane vdp-editor-section"><h2>Стоимость и расчёт</h2><p>Все значения в рублях, сервис — в процентах. При наличии полной сметы на конкретное число гостей она имеет приоритет перед расчётом по строкам.</p>'+
  '<div class="vdp-editor-grid">'+
   editAmount('Меню / гость, ₽','cost-menu',editable.menu)+
   editAmount('Аренда, ₽','cost-rent',editable.rent)+
   editAmount('Оборудование, ₽','cost-technical',editable.technical)+
   editAmount('Прочие расходы, ₽','cost-extra',editable.extra)+
   editAmount('Обслуживание, %','cost-service',editable.service)+
   editAmount('Минимальная сумма заказа / депозит, ₽','cost-minSpend',editable.minSpend)+
  '</div></section>'+
  '<section class="vdp-pane vdp-editor-section"><h2>Сметы от площадки</h2><p>Можно исправить сумму и число гостей или добавить новый расчёт. Исходные документы остаются в разделе «Документы».</p>'+
  '<div class="vdp-editor-quotes" data-venue-edit-quotes>'+(v.quotes||[]).map(renderVenueQuoteEditorRow).join('')+'</div>'+
  '<div class="vdp-editor-quote-controls"><button type="button" data-add-venue-quote>+ Добавить вариант сметы</button></div></section>'+
  '<section class="vdp-pane vdp-editor-section"><h2>Условия и ограничения</h2>'+
  '<div class="vdp-editor-grid">'+
   editArea('Что включено (один пункт на строку)','included',lines('included'),6)+
   editArea('Доплаты / ограничения (один пункт на строку)','excluded',lines('excluded'),6)+
   editArea('Что ещё уточнить (один пункт на строку)','questions',lines('questions'),6)+
   '</div></section>'+
  '<section class="vdp-pane vdp-editor-section"><h2>Ссылки и контакты</h2><div class="vdp-editor-grid">'+
   editField('Официальный сайт','website',v.website,'url')+
   editField('Папка площадки на Google Drive','drive',v.drive,'url')+
   editField('Папка фотографий','photos',v.photos,'url')+
   editField('Ссылка на предложение / смету','quoteSource',v.quoteSource,'url')+
   editField('Телефон менеджера','contactPhone',v.contactPhone||v.phone)+
   editField('Email менеджера','contactEmail',v.contactEmail||v.email,'email')+
   '</div></section>'+
  '<div class="vdp-editor-actions"><button type="submit" class="vdp-editor-save">Сохранить изменения</button><a class="vdp-editor-cancel" href="#/admin/venues/'+encodeURIComponent(v.id)+'">Отмена</a><span class="vdp-editor-feedback" data-venue-edit-feedback role="status" aria-live="polite">Изменения не сохранены</span></div>'+
  '</form>';
}

export function renderVenueNewPage(v,ctx){
 const tab=ctx.ui.detailTab||'overview',photos=getVenuePhotos(v);
 const tabs=[['overview','Обзор'],['photos','Фотографии'],['budget','Смета'],['documents','Документы'],['terms','Условия'],['rating','Рейтинг'],['edit','Редактировать']];
 let body='';
 if(tab==='photos')body=gallery(v,ctx.ui);
 else if(tab==='budget')body=estimatePane(v,ctx);
 else if(tab==='documents')body=venueDocuments(v);
 else if(tab==='terms')body=infoPane(v,ctx);
 else if(tab==='rating')body=ratingPane(v,ctx);
  else if(tab==='edit')body=editPane(v,ctx);
 else body='<div class="vdp-overview"><section class="vdp-pane"><div class="vdp-row-between"><h2>Фотографии с осмотра</h2><a href="#/admin/venues/'+encodeURIComponent(v.id)+'/photos">Все '+photos.length+' фото →</a></div>'+gallery(v,ctx.ui)+'</section><section class="vdp-pane"><h2>Даты и формат</h2>'+dates(v,ctx)+'<p>'+h(v.summary||'Данных пока мало')+'</p><p class="vdp-note">'+h(v.capacityNote||('Вместимость: '+(v.capacity||'не подтверждена')))+'</p></section><section class="vdp-pane"><h2>Стоимость</h2>'+budget(v,ctx)+'<div class="vdp-key-costs">'+[['menu','Меню'],['rent','Аренда'],['deposit','Депозит'],['sound','Звук'],['light','Свет'],['service','Сервис']].map(([k,l])=>'<div><span>'+l+'</span>'+amountCell(getCost(v)[k],labelMap[k]?.unit||'')+'</div>').join('')+'</div><div class="vdp-overview-actions"><a class="vdp-primary-link" href="#/admin/venues/'+encodeURIComponent(v.id)+'/budget">Полная смета по строкам →</a><a class="vdp-primary-link vdp-document-entry" href="#/admin/venues/'+encodeURIComponent(v.id)+'/documents">Файлы и предложения площадки →</a></div></section>'+scopeList(v)+'</div>';
 return '<div class="vdp-page"><div class="vdp-top-actions"><a class="vdp-back" href="#/admin/venues">← Все площадки</a><a class="vdp-edit-main" href="#/admin/venues/'+encodeURIComponent(v.id)+'/edit">✎ Редактировать данные и смету</a></div>'+hero(v,ctx,photos)+'<div class="vdp-layout"><nav class="vdp-tabs" aria-label="Разделы площадки">'+tabs.map(([id,l])=>'<a href="#/admin/venues/'+encodeURIComponent(v.id)+'/'+id+'" class="'+(id===tab?'selected':'')+'">'+l+'</a>').join('')+'</nav><div class="vdp-content">'+body+'</div><footer class="vdp-foot">Сметы и фотографии — из материалов площадок и Wedding Drive. Неизвестные расходы в итог не включены.</footer></div>'+lightbox(v,ctx.ui)+'</div>';
}
