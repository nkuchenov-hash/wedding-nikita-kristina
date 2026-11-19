import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VENUE_RECORDS} from '../src/venues-data.js';
import {VENUE_PRICING} from '../src/venues-pricing.js';
import {estimateVenue} from '../src/venue-evaluation.js';
import {transcriptAddons,transcriptAddonTotal,transcriptMenuScenarios} from '../src/venue-transcript-costs.js';
import {renderVenueNewPage} from '../src/venue-detail-ui.js';
import {venueBudgetCoverage,k2PlanningScenarios} from '../src/venue-budget-coverage.js';

const venue=(id,extras={})=>({id,name:id,region:'city',area:'Санкт-Петербург',
  dateAvailability:{'18':'unknown','19':'unknown','20':'unknown'},
  cost:VENUE_RECORDS[id].cost||{},quotes:VENUE_RECORDS[id].quotes||[],
  ratings:{},extras:{},...VENUE_RECORDS[id],...extras});
const context=(guests=80)=>({
 guests,ui:{detailTab:'budget',photoSection:'all',photoView:'grid',photoSort:'original',photoIndex:0},
 estimate:v=>estimateVenue(v,guests),
 extraTotal:v=>transcriptAddonTotal(v,guests),
 dayStatus:()=> 'unknown', dayText:()=> 'Уточняется',
 weighted:()=>({value:null,complete:0,maximum:100})
});

test('Alexandrovsky and K2 transcripts are attached to distinct venue IDs and files',()=>{
 assert.match(VENUE_RECORDS.k2.visitTranscriptSource,/1yxll_uMcNO_j9mpSpCTkUgN86hGlrg55/);
 assert.match(VENUE_RECORDS['alex-park'].visitTranscriptSource,/14FJ4Ogo8qB6_Ta4HNru8UMCB57ah53gG/);
 assert.ok(!VENUE_RECORDS.k2.visitTranscriptSource.includes('14FJ4Ogo'));
 assert.equal(VENUE_RECORDS.k2.cost.menu,undefined);
});

test('Transcript scenarios illustrate K2 catering without changing the authoritative quotation',()=>{
 const k2=venue('k2');
 assert.equal(k2.cost.rent,420000);
 const plan=estimateVenue(k2,80);
 assert.equal(plan.value,1558000,'K2 plan must include technical and servicing reserves');
 assert.equal(plan.kind,'planning');
 assert.equal(plan.partial,true);
 assert.equal(plan.isQuote,false);
 const eighty=transcriptMenuScenarios(k2,80);
 assert.deepEqual(eighty.map(x=>x.indicativeTotal).sort((a,b)=>a-b),[820000,1300000]);
 assert.deepEqual(transcriptMenuScenarios(k2,100).map(x=>x.indicativeTotal).sort((a,b)=>a-b),[920000,1520000]);
 const html=renderVenueNewPage(k2,context());
 assert.match(html,/Плановые сметы К2/);
 assert.match(html,/1\\s?558\\s?000|1 558 000/);
 assert.match(html,/1\\s?030\\s?000|1 030 000/);
 assert.match(html,/Техника в аренду 420/);
 assert.match(html,/Звук, свет и техника/);
 assert.match(html,/Обслуживание/);
 assert.match(html,/не окончательное КП/);
});

test('Transcript extras do not get added unless explicitly chosen',()=>{
 for(const id of ['alex-park','putilov','vesenniy','petr']){
  const v=venue(id);
  assert.ok(transcriptAddons(v,80).length>0);
  assert.equal(transcriptAddonTotal(v,80),0);
  assert.ok(renderVenueNewPage(v,context()).includes('data-transcript-addon='));
 }
});

test('Alexandrovsky optional corkage scales with guests and does not replace its quote',()=>{
 const base=venue('alex-park');
 assert.equal(estimateVenue(base,80).value,687760);
 assert.equal(VENUE_PRICING['alex-park'].deposit.value,50000);
 assert.equal(VENUE_PRICING['alex-park'].light.value,'Включено');
 assert.equal(VENUE_PRICING['alex-park'].tech.value,'Включено');
 assert.equal(transcriptAddonTotal(base,80),0);
 const checked=venue('alex-park',{visitSelectedAddons:{'own-alcohol-corkage':true}});
 assert.equal(transcriptAddonTotal(checked,80),56000);
 assert.equal(transcriptAddonTotal(checked,100),70000);
 assert.equal(estimateVenue(checked,80).value,687760);
});

test('Putilov terrace and Petr AV upgrade are incremental optional charges',()=>{
 const p=venue('putilov',{visitSelectedAddons:{'outside-welcome':true}});
 assert.equal(transcriptAddonTotal(p,80),120000);
 assert.equal(estimateVenue(p,80).value,1200000);
 const petr=venue('petr',{visitSelectedAddons:{'upgraded-av':true}});
 assert.equal(transcriptAddonTotal(petr,80),50000);
 assert.equal(petr.cost.technical,35000,'current equipment cost stays unchanged');
 const revised=venue('petr',{cost:{...petr.cost,technical:85000},
   visitSelectedAddons:{'upgraded-av':true}});
 assert.equal(transcriptAddonTotal(revised,80),0,
   'once base tech reaches the upgraded 85k, no surcharge can be counted');
});

test('Selectable options persist through the existing authenticated venue record updates',()=>{
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(source,/t\.hasAttribute\('data-transcript-addon'\)/);
 assert.match(source,/visitSelectedAddons:/);
 assert.match(source,/commitInlineChanges\(base\.id,update,root\)/);
 assert.match(source,/transcriptAddonTotal\(v,state\.guestCount\)/);
});


test('K2 gives the same inclusive planning arithmetic at 80 or 100 guests',()=>{
 const k2=venue('k2');
 assert.deepEqual(k2PlanningScenarios(k2,80).map(x=>x.total),[1558000,1030000]);
 assert.deepEqual(k2PlanningScenarios(k2,100).map(x=>x.total),[1800000,1140000]);
 const rows=venueBudgetCoverage(k2);
 assert.deepEqual(rows.map(x=>x.label),['Аренда','Питание','Звук, свет, техника','Обслуживание']);
 assert.equal(rows[2].state,'unknown','technical included status cannot be inferred from rent');
 assert.equal(rows[3].state,'unknown','service rate cannot be inferred from other venue');
 assert.equal(estimateVenue(venue('k2',{cost:{rent:420000,menu:5900,technical:125000,service:10}}),80).value,1064200,
   'organizer-supplied complete price should supersede planning guess');
});

test('Full cost audit distinguishes bundled equipment from unknown light',()=>{
 for(const id of Object.keys(VENUE_PRICING)){
  const v=VENUE_RECORDS[id]?venue(id):{id,cost:{}};
  const list=venueBudgetCoverage(v);
  assert.equal(list.length,4);
  assert.ok(list.every(x=>['priced','included','partial','unknown'].includes(x.state)));
 }
 assert.notEqual(venueBudgetCoverage(venue('palma'))[2].state,'unknown');
 assert.equal(venueBudgetCoverage(venue('k2'))[2].state,'unknown');
 const count=renderVenueNewPage(venue('k2'),context());
 assert.match(count,/Проверка состава сметы/);
 assert.match(count,/Не подтверждены/);
});
