import test from 'node:test';
import assert from 'node:assert/strict';
import {VENUE_RECORDS} from '../src/venues-data.js';
import {VENUE_PRICING,VENUE_COST_LABELS} from '../src/venues-pricing.js';
import {getVenuePhotos,filteredVenuePhotos,renderVenueNewPage} from '../src/venue-detail-ui.js';

const allIds=[
 'vesenniy','kraft','loft-roof','alex-park','seasons','k2','putilov','ermolinsky',
 'royal','vinity','petr','roof18','bali','360','ambassador','english-roof',
 'admiralty-roof','palma','repino-riviera','panorama','eva','maryino','harmony','zarenkov-gallery'
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

test('All 24 venues have the same 13 price rows, even when price is unknown',()=>{
 assert.equal(VENUE_COST_LABELS.length,13);
 assert.deepEqual(Object.keys(VENUE_PRICING).sort(),[...allIds].sort());
 for(const id of allIds){
  const html=renderVenueNewPage(venue(id),context('budget'));
  for(const [,name] of VENUE_COST_LABELS)assert.ok(html.includes(name),id+' missing '+name);
  assert.match(html,/Неизвестные расходы не учтены/);
 }
});
test('Photo archive includes all 304 indexed photographs in source room categories',()=>{
 const total=allIds.reduce((s,id)=>s+getVenuePhotos(venue(id)).length,0);
 assert.equal(total,304);
 assert.equal(getVenuePhotos(venue('vinity')).length,24);
 assert.ok(getVenuePhotos(venue('royal')).some(f=>f.section==='Террасы и виды'));
 assert.ok(getVenuePhotos(venue('alex-park')).some(f=>f.section==='Санузлы'));
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
 const royal=renderVenueNewPage(venue('royal'),context('budget'));
 assert.match(royal,/852 165|852 165/);
 assert.match(royal,/567 100|567 100/);
 assert.match(royal,/200 000|200 000/);
 const vinity=renderVenueNewPage(venue('vinity'),context('budget'));
 assert.match(vinity,/863 500|863 500/);
 assert.match(vinity,/760 000|760 000/);
});
test('K2 rent and Zarenkov guest price are source-grounded, unknown components remain unknown',()=>{
 assert.equal(VENUE_PRICING.k2.rent.value,420000);
 assert.equal(VENUE_PRICING.k2.menu.value,null);
 assert.equal(VENUE_PRICING['zarenkov-gallery'].menu.value,4500);
 const html=renderVenueNewPage(venue('k2'),context('budget'));
 assert.match(html,/420 000|420 000/);
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
