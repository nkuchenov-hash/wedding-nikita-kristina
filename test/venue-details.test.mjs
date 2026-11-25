import test from 'node:test';
import assert from 'node:assert/strict';
import {VENUE_RECORDS} from '../src/venues-data.js';
import {VENUE_PRICING,VENUE_COST_LABELS} from '../src/venues-pricing.js';
import {getVenuePhotos,getVenueCover,filteredVenuePhotos,renderVenueNewPage} from '../src/venue-detail-ui.js';

const allIds=[
 'vesenniy','kraft','loft-roof','alex-park','seasons','k2','putilov','ermolinsky',
 'royal','vinity','petr','roof18','bali','360','ambassador','english-roof',
 'admiralty-roof','palma','repino-riviera','panorama','eva','maryino','harmony','zarenkov-gallery','zhemchuzhny'
];
const context=(tab='overview',options={})=>({
 guests:80,
 ui:{detailTab:tab,photoSection:'all',photoView:'gallery',photoSort:'original',photoIndex:0,photoLightbox:false,...options},
 estimate:v=>v.quotes?.find(q=>q.guests===80&&q.kind==='quote')?{value:v.quotes.find(q=>q.guests===80&&q.kind==='quote').total,partial:false,isQuote:true}:{value:null,partial:true},
 extraTotal:()=>0,
 dayStatus:(v,d)=>v.dateAvailability?.[d]||'unknown',
 dayText:(v,d)=>({available:'Свободно',unavailable:'Занято',pending:'Уточняется',unknown:'Нет подтверждения'}[v.dateAvailability?.[d]||'unknown']),
 weighted:()=>({value:null,complete:0})
});
const venue=id=>({id,name:id,region:'city',area:'Санкт-Петербург',extras:{},ratings:{},...(VENUE_RECORDS[id]||{})});

test('All 25 venues have the same 13 price rows, even when price is unknown',()=>{
 assert.equal(VENUE_COST_LABELS.length,13);
 assert.deepEqual(Object.keys(VENUE_PRICING).sort(),[...allIds].sort());
 for(const id of allIds){
  const html=renderVenueNewPage(venue(id),context('budget'));
  for(const [,name] of VENUE_COST_LABELS)assert.ok(html.includes(name),id+' missing '+name);
  assert.match(html,/Неизвестные расходы не учтены\./);
  assert.match(html,/Неизвестные расходы в итог не включены\./);
 }
});
test('Photo archive contains 479 indexed photographs, including 103 new originals from four site visits',()=>{
 const total=[...allIds,'milyutin','glukhovsky','santa-gloria'].reduce((s,id)=>s+getVenuePhotos(venue(id)).length,0);
 assert.equal(total,479);
 assert.equal(getVenuePhotos(venue('vinity')).length,24);
 assert.equal(getVenuePhotos(venue('palma')).length,7,'all seven original Telegram photos must be displayed');
 for(const id of ['360','kraft','bali','ambassador','english-roof','admiralty-roof','eva','zhemchuzhny']){
  const photos=getVenuePhotos(venue(id));
  assert.ok(photos.length>0,id+' should show a verified venue image');
  assert.ok(photos.every(x=>x.src?.startsWith('https://')&&x.sourceUrl?.startsWith('https://')),id+' has a source link');
  assert.ok(getVenueCover(venue(id))?.src,id+' hero must not be empty');
 }
 const newlyUploaded={
  milyutin:{total:18,cover:'1wUoS4p2AEThmm1C7Droo6pu6o31RSdMm'},
  glukhovsky:{total:32,cover:'1-scO2kypBqMWZobP4dz4GFMD9X2D9SOl'},
  'santa-gloria':{total:24,cover:'1uYYIQZ8o8H8T6RVzx6k3GC_J8A2RVY0x'},
  roof18:{total:29,cover:'1nS6BYMQX0N5VHvddrZXBDP-5IQm-igtx'}
 };
 const newlyIndexed=[];
 for(const [id,{total,cover}] of Object.entries(newlyUploaded)){
  const photos=getVenuePhotos(venue(id));
  assert.equal(photos.length,total,id+' complete visit album');
  assert.equal(getVenueCover(venue(id))?.id,cover,id+' reviewed cover');
  assert.ok(photos.every(x=>x.id&&x.folder&&x.name&&x.section&&!x.src),id+' originals must be from Wedding Drive, not third-party shots');
  const html=renderVenueNewPage(venue(id),context('photos'));
  assert.match(html,new RegExp('Фотографии[^<]*<span>'+total+'</span>'),id+' photo count visible');
  newlyIndexed.push(...photos.map(p=>p.id));
 }
 assert.equal(newlyIndexed.length,103);
 assert.equal(new Set(newlyIndexed).size,103,'no repeated photos across new venue albums');
 assert.equal(getVenuePhotos(venue('palma')).filter(p=>p.section==='Залы').length,4);
 assert.equal(getVenuePhotos(venue('palma')).filter(p=>p.section==='Welcome-зона').length,3);
 assert.equal(getVenuePhotos(venue('maryino')).length,36,'show all 36 organizer-supplied photos and no external substitutes');
 assert.equal(new Set(getVenuePhotos(venue('maryino')).map(p=>p.id)).size,36,'all organizer photos must be unique');
 assert.equal(getVenuePhotos(venue('maryino')).filter(p=>p.section==='Общий альбом').length,0,'Maryino photos must be classified');
 assert.ok(getVenuePhotos(venue('maryino')).some(p=>p.section==='Залы'));
 assert.ok(getVenuePhotos(venue('maryino')).some(p=>p.section==='Территория'));
 assert.ok(getVenuePhotos(venue('maryino')).some(p=>p.section==='Лаунж и фотозоны'));
 assert.ok(getVenuePhotos(venue('maryino')).some(p=>p.section==='Входы и переходы'));
 assert.equal(venue('maryino').gallery.length,36,'legacy gallery uses the same unique archive');
 assert.ok(getVenuePhotos(venue('maryino')).some(p=>p.originalName==='IMG_20261031_144633_996.jpg'));
 assert.ok(getVenuePhotos(venue('royal')).some(f=>f.section==='Террасы и виды'));
 assert.ok(getVenuePhotos(venue('alex-park')).some(f=>f.section==='Санузлы'));
 // A venue hero must never start with a restroom or utility-room photo.
 for(const id of ['royal','vesenniy','alex-park','vinity'])assert.equal(getVenuePhotos(venue(id))[0].section,'Залы',id+' must open with the banquet hall');
});
test('Main covers use banquet halls or building facades; technical photos sort last',()=>{
 const expected={
  'vesenniy':'1xrDBe6UYNcGcxGFadQ-Di8LCnHeM36Ux',
  'putilov':'1Yo4j6ZhK_ycH38ZeHXKCGnaMmQfcHme4',
  'repino-riviera':'1PCv5jMFTatJ21kuaUD2RaPx7JFXYsfPM',
  'panorama':'1PwrAgzMU1kmK772YRhQWuQNGrfaU1d0X',
  'harmony':'1giLTNx8i-okBCfyiZChmaC0I3MTVsaAe',
  'palma':'1NoeveNL-VYzPILfXxUiC4nzBcgV_4BSp'
 };
 for(const [id,photoId] of Object.entries(expected))assert.equal(getVenueCover(venue(id)).id,photoId,id+' cover');
 assert.equal(getVenueCover(venue('maryino'))?.id,'1YIPooHlaubLUlADcQsbehmXEJboaJtoh','Maryino cover must come from organizer original, never a third-party image');
 const named=['royal','vesenniy','alex-park','loft-roof','seasons','petr','vinity'];
 for(const id of named)assert.equal(getVenueCover(venue(id))?.section,'Залы',id+' must show banquet hall');
 for(const id of ['royal','vesenniy','loft-roof','seasons','petr','alex-park']){
  for(const mode of ['original','name','reverse','section']){
   const photos=filteredVenuePhotos(venue(id),{photoSection:'all',photoSort:mode});
   const lastMain=Math.max(...photos.map((x,i)=>x.section==='Залы'?i:-1));
   const firstTechnical=photos.findIndex(x=>/техническ|оборудован|аппаратур|сануз|туалет|служеб/.test(String(x.name+' '+x.section).toLowerCase()));
   if(firstTechnical!==-1)assert.ok(firstTechnical>lastMain,id+' '+mode+': technical photos must remain after the banquet halls');
  }
 }
 for(const id of allIds){
  const photos=getVenuePhotos(venue(id));
  const indexes=photos.map((x,i)=>({i,name:String(x.name||'').toLowerCase()})).filter(x=>/техническ|оборудован|аппаратур|пульт управления|вентиляци/.test(x.name));
  const banquet=photos.findIndex(x=>/банкет|общий вид.*зал|фасад/.test(String(x.name).toLowerCase()));
  if(banquet>=0)for(const technical of indexes)assert.ok(technical.i>banquet,id+' technical image must follow banquet/facade');
 }
});
test('Photo viewer supports room filtering, mini-grid, gallery, sort, full-screen navigation',()=>{
 const v=venue('vesenniy');
 const selected=filteredVenuePhotos(v,{photoSection:'Залы',photoSort:'name'});
 assert.ok(selected.length>0);
 assert.ok(selected.every(f=>f.section==='Залы'));
 let html=renderVenueNewPage(v,context('photos'));
 assert.match(html,/data-photo-view="grid"/);
 assert.match(html,/data-photo-view="gallery"/);
 assert.match(html,/data-photo-sort/);
 assert.match(html,/data-photo-section="Залы"/);
 assert.match(html,/data-photo-open="0"/);
 html=renderVenueNewPage(v,context('photos',{photoLightbox:true}));
 assert.match(html,/class="vdp-lightbox"/);
 assert.match(html,/data-photo-step="-1"/);
 assert.match(html,/data-photo-close/);
 html=renderVenueNewPage(v,context('photos',{photoView:'grid'}));
 assert.match(html,/class="vdp-photo-grid"/);
});
test('Royal Beach and Vinity preserve original package amounts without multiplying menu twice',()=>{
 const normalize=html=>html.replace(/[\u00a0\u202f]/g,' ');
 const royal=normalize(renderVenueNewPage(venue('royal'),context('budget')));
 assert.ok(royal.includes('852 165'));
 assert.ok(royal.includes('567 100'));
 assert.ok(royal.includes('200 000'));
 const vinity=normalize(renderVenueNewPage(venue('vinity'),context('budget')));
 assert.ok(vinity.includes('863 500'));
 assert.ok(vinity.includes('760 000'));
});
test('Telegram source audits and previously missed venues retain their cost caveats',()=>{
 assert.equal(VENUE_PRICING.putilov.rent.value,190000);
 assert.equal(VENUE_PRICING.ermolinsky.rent.value,430000);
 assert.equal(VENUE_PRICING.zhemchuzhny.menu.value,5500);
 assert.equal(VENUE_RECORDS.ermolinsky.cost.technical,170000);
 assert.ok(VENUE_RECORDS.eva.documents.length>=3);
 assert.ok(VENUE_RECORDS.zhemchuzhny.drive.includes('1qM5zhh'));
 assert.equal(['alex-park','putilov','ermolinsky','panorama','eva'].reduce((n,id)=>n+VENUE_RECORDS[id].telegramLinks.length,0),18);
});
test('K2 rent and Zarenkov guest price are source-grounded, unknown components remain unknown',()=>{
 assert.equal(VENUE_PRICING.k2.rent.value,420000);
 assert.equal(VENUE_PRICING.k2.menu.value,null);
 assert.equal(VENUE_PRICING['zarenkov-gallery'].menu.value,4500);
 const html=renderVenueNewPage(venue('k2'),context('budget')).replace(/[\u00a0\u202f]/g,' ');
 assert.ok(html.includes('420 000'));
 assert.match(html,/Нет данных/);
});
test('All five tabs render for every venue with no missing sections',()=>{
 for(const id of allIds)for(const tab of ['overview','photos','budget','terms','rating']){
  const html=renderVenueNewPage(venue(id),context(tab));
  assert.match(html,/class="vdp-page"/);
  assert.match(html,/vdp-tabs/);
  assert.ok(html.includes('href="#/admin/venues/'+id+'/budget"'));
 }
});
test('HTML escapes user-supplied venue descriptions',()=>{
 const v={...venue('k2'),summary:'<script>alert(1)</script>',name:'<img src=x onerror=alert(1)>'};
 const html=renderVenueNewPage(v,context('terms'));
 assert.ok(!html.includes('<script>alert'));
 assert.ok(!html.includes('<img src=x onerror'));
});


test('Visit transcript insights are additive editable fields on seven correctly mapped venue cards',()=>{
 const venueIds=['putilov','ermolinsky','vinity','petr','vesenniy','seasons','zarenkov-gallery'];
 for(const id of venueIds){
  const item=venue(id);
  assert.ok(item.visitTranscriptNotes?.length>100,id+' should have detailed original meeting notes');
  assert.match(item.visitTranscriptSource,/^https:\/\/drive\.google\.com\/file\/d\//);
  const overview=renderVenueNewPage(item,context('terms'));
  assert.match(overview,/Расшифровка встречи/);
  assert.match(overview,/data-venue-inline="visitTranscriptNotes"/);
  assert.match(overview,/Исходная расшифровка/);
 }
 // A transcript of the separate Balinskogo mansion is not mixed with Bali.
 assert.equal(VENUE_RECORDS.bali.visitTranscriptNotes,undefined);
 for(const [id,docId] of [['k2','1yxll_uMcNO_j9mpSpCTkUgN86hGlrg55'],['alex-park','14FJ4Ogo8qB6_Ta4HNru8UMCB57ah53gG']]){
  const record=VENUE_RECORDS[id];
  assert.ok(record.visitTranscriptNotes?.length>100,id+' contains verified original visit details');
  assert.ok(record.visitTranscriptSource.includes(docId),id+' has the correct distinct transcript source');
  const overview=renderVenueNewPage(venue(id),context('terms'));
  assert.match(overview,/Расшифровка встречи/);
 }
 assert.ok(!VENUE_RECORDS.k2.visitTranscriptSource.includes('14FJ4Ogo8qB6'));
 assert.ok(!VENUE_RECORDS['alex-park'].visitTranscriptSource.includes('1yxll_uMcNO'));

});


test('Maryino cover never relies on broken third-party photographs',()=>{
 const record=venue('maryino');
 const cover=getVenueCover(record);
 assert.ok(cover);
 assert.equal(cover.originalName,'IMG_20261031_115200_257.jpg');
 assert.ok(cover.folder?.startsWith('1_S-g5GPwBQyWeHdLB6u2FiXgRCb6B3Ww'));
 assert.equal(cover.src,undefined);
 assert.equal(getVenuePhotos(record).filter(x=>x.src).length,0);
});

test('Unknown photos are not used as covers and album categories remain contiguous',()=>{
 const v={id:'unreviewed-test',gallery:[{id:'unknown',label:'IMG_20261121_112233.jpg'},{id:'toilet',label:'Санузел — общий вид'},{id:'hall',label:'Банкетный зал — общий вид'},{id:'detail',label:'Аквариум — деталь'}]};
 assert.equal(getVenueCover(v)?.id,'hall');
 assert.equal(getVenueCover({...v,gallery:v.gallery.filter(x=>x.id!=='hall')}),null);
 for(const mode of ['original','name','reverse','section']){
  const photos=filteredVenuePhotos(venue('alex-park'),{photoSection:'all',photoSort:mode});
  const seen=new Set();let previous=null;
  for(const p of photos){if(p.section!==previous){assert.ok(!seen.has(p.section),'section must be contiguous');seen.add(p.section);previous=p.section}}
 }
 assert.equal(getVenuePhotos(v).find(p=>p.id==='unknown').section,'Не разобрано');
 assert.match(renderVenueNewPage(venue('alex-park'),context('photos',{photoView:'grid'})),/class="vdp-photo-group"/);
});
