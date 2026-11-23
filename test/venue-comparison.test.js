import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VENUE_RECORDS} from '../src/venues-data.js';
import {estimateVenue, scoreVenue, RATING_CRITERIA, RATING_MAX} from '../src/venue-evaluation.js';
import {VENUE_PRICING} from '../src/venues-pricing.js';

const venue=(overrides={})=>({
 id:'venue-score-test', region:'city',capacity:100,
 dateAvailability:{'18':'unknown','19':'available','20':'unknown'},
 cost:{rent:100000,menu:5000,service:10},
 ratingFacts:{singleHall:'yes',indoorBackup:'yes',includedEquipment:'yes',until23:'yes',ownAlcohol:'yes',outdoorArea:'yes'},
 ...overrides
});

test('all criteria sum to 100 with June 19 the highest-weighted criterion',()=>{
 assert.equal(RATING_MAX,100);
 assert.equal(RATING_CRITERIA.reduce((s,[,,p])=>s+p,0),100);
 assert.equal(RATING_CRITERIA[0][0],'date');
 assert.equal(RATING_CRITERIA[0][2],40);
 assert.equal(RATING_CRITERIA.find(([key])=>key==='city')[2],10);
});

test('June 19 and ten objective facts reach 100 points with a preliminary budget',()=>{
 const v=venue();
 const score=scoreVenue(v,100);
 assert.equal(score.value,100);
 assert.equal(score.complete,RATING_CRITERIA.length);
 assert.equal(score.provisional,true); // Cost is a documented but provisional tariff scenario.
 assert.equal(score.breakdown.find(x=>x.key==='date').value,40);
 assert.equal(score.breakdown.find(x=>x.key==='city').value,10);
});

test('country venues earn no city bonus even when other scores are perfect',()=>{
 const v=venue({region:'country',quotes:[{guests:100,total:650000,kind:'quote'}]});
 const score=scoreVenue(v,100);
 assert.equal(score.breakdown.find(x=>x.key==='city').value,0);
 assert.equal(score.value,90);
});

test('alternate date yields 24 date points, not 40',()=>{
 const v=venue({quotes:[{guests:100,total:650000,kind:'quote'}],dateAvailability:{'18':'available','19':'unavailable','20':'unknown'}});
 const score=scoreVenue(v,100);
 assert.equal(score.breakdown.find(x=>x.key==='date').value,24);
 assert.equal(score.value,84);
});

test('unconfirmed date and verifiable conditions stay unknown',()=>{
 const v=venue({ratingFacts:{},dateAvailability:{'18':'unknown','19':'unknown','20':'unknown'}});
 const score=scoreVenue(v,100);
 assert.equal(score.breakdown.find(x=>x.key==='date').value,null);
 assert.equal(score.breakdown.find(x=>x.key==='outdoorArea').value,null);
 assert.equal(score.provisional,true);
});

test('guest count recalculates variable catering and service cost',()=>{
 const v=venue();
 assert.equal(estimateVenue(v,80).value,540000);
 assert.equal(estimateVenue(v,100).value,650000);
 assert.equal(estimateVenue(v,100).partial,true);
});

test('an exact quote stays exact; changing guest count yields a clearly provisional scenario',()=>{
 const v=venue({cost:{menu:5000},quotes:[{guests:80,total:650000,kind:'quote'}]});
 const quoted=estimateVenue(v,80);
 const changed=estimateVenue(v,100);
 assert.equal(quoted.value,650000);
 assert.equal(quoted.partial,false);
 assert.equal(changed.value,750000);
 assert.equal(changed.partial,true);
 assert.equal(changed.kind,'scenario');
});

test('ratings never presume that rental-only pricing is a comparable total',()=>{
 const v=venue({cost:{rent:250000},ratings:{}});
 const score=scoreVenue(v,80);
 assert.equal(score.breakdown.find(x=>x.key==='cost').value,null);
});

test('comparison keeps exactly six useful table columns and no extra import or comparison UI',()=>{
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 const columns=[...source.matchAll(/columnHeading\('(?:name|date|visit|price|capacity|score)'/g)];
 assert.equal(columns.length,6);
 assert.equal(source.includes('Импорт правок'),false);
 assert.equal(source.includes('Экспорт правок'),false);
 assert.equal(source.includes('Все материалы с фото и со сметой'),false);
 assert.equal(source.includes('Сравнить / подробности'),false);
 assert.match(source,/addEventListener\('input',event=>/);
 assert.match(source,/totalEstimate\(v\)/);
});

test('17 November updates preserve date specificity and only valid active June quotes',()=>{
 const dates=(id)=>VENUE_RECORDS[id].dateAvailability;
 assert.deepEqual(dates('vesenniy'),{'18':'available','19':'unavailable','20':'unavailable'});
 assert.deepEqual(dates('ermolinsky'),{'18':'available','19':'unavailable','20':'unavailable'});
 assert.deepEqual(dates('alex-park'),{'18':'unavailable','19':'unavailable','20':'available'});
 assert.deepEqual(dates('k2'),{'18':'available','19':'available','20':'available'});
 assert.deepEqual(dates('maryino'),{'18':'available','19':'available','20':'available'});
 assert.equal(dates('vinity')['20'],'available');
 assert.equal(VENUE_RECORDS.vinity.dateDiscounts['20'].percent,10);
 assert.equal(VENUE_RECORDS.vinity.dateDiscounts['20'].applied,false);
 assert.equal(VENUE_RECORDS['alex-park'].quotes.length,1);
 assert.equal(VENUE_RECORDS['alex-park'].quotes[0].total,687760);
 assert.equal(VENUE_RECORDS['alex-park'].historicalQuotes[0].total,712760);
 const price=estimateVenue({id:'alex-park',quotes:VENUE_RECORDS['alex-park'].quotes,cost:VENUE_RECORDS['alex-park'].cost},80);
 assert.equal(price.value,687760);
 assert.equal(price.quoteDate,'2027-06-20');
});

test('dismissed venues remain restorable inside the archive',()=>{
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 const list=source.slice(source.indexOf('export const PUBLIC_VENUES'),source.indexOf('const DATE_CHOICES'));
 for(const id of ['kraft','loft-roof','360','zhemchuzhny','english-roof','admiralty-roof']){
  assert.match(list,new RegExp("id:'"+id+"'"));
  assert.equal(VENUE_RECORDS[id].archived,true);
 }
 assert.match(source,/archiveFilter:'active'/);
 for(const id of ['vinity','vesenniy','k2','alex-park','ermolinsky','maryino','harmony','putilov']){
  assert.match(list,new RegExp("id:'"+id+"'"));
 }
 assert.match(source,/venueApi\('admin\/venue-dates'\)/);
 assert.match(source,/state\.venues=incoming/);
 assert.doesNotMatch(source,/function patch\(/);
 assert.match(source,/guestCount:state\.guestCount/);
});

test('Royal Beach June 19 is unavailable, June 20 available on 18 November',()=>{
 const royal=VENUE_RECORDS.royal;
 assert.equal(royal.dateAvailability['19'],'unavailable');
 assert.equal(royal.dateAvailability['18'],undefined);
 assert.equal(royal.dateAvailability['20'],'available');
 assert.equal(VENUE_RECORDS['alex-park'].dateAvailability['18'],'unavailable');
 assert.equal(VENUE_RECORDS['alex-park'].dateAvailability['20'],'available');
 const exporter=readFileSync(new URL('../tools/export-wedding-venues.mjs',import.meta.url),'utf8');
 assert.match(exporter,/venue-dates\.json/);
 assert.match(exporter,/source\.dateAvailability/);
});

test('date status is an atomic authenticated SQLite operation rather than a site rebuild',()=>{
 const api=readFileSync(new URL('../backend/src/api.php',import.meta.url),'utf8');
 const schema=readFileSync(new URL('../backend/schema.sql',import.meta.url),'utf8');
 const seeder=readFileSync(new URL('../backend/bin/seed-venue-dates.php',import.meta.url),'utf8');
 const frontend=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(schema,/CREATE TABLE IF NOT EXISTS venue_date_status/);
 assert.match(schema,/PRIMARY KEY \(venue_id,day\)/);
 assert.match(api,/admin\/venue-dates' && \$method==='PATCH'/);
 assert.match(api,/UPDATE venue_date_status SET status=\?/);
 assert.match(api,/WHERE venue_id=\? AND day=\?/);
 assert.match(seeder,/INSERT OR IGNORE INTO venue_date_status/);
 assert.match(frontend,/await commitVenueDate\(id,t\.dataset\.day,t\.value,root\)/);
 assert.match(frontend,/venueApi\('admin\/venue-dates'/);
 assert.match(frontend,/const dateAvailability=Object\.fromEntries/);
 assert.match(frontend,/if\(!venueDb\.ready\)/);
 assert.doesNotMatch(frontend,/patch\(id,'dateAvailability'/);
});

test('K2 rent-only 420k is never presented as the wedding budget or price score',()=>{
 const v={id:'k2',region:'city',capacity:200,dateAvailability:{'19':'available'},
  cost:VENUE_RECORDS.k2.cost,ratings:{}};
 const estimate=estimateVenue(v,80);
 assert.equal(estimate.value,null);
 assert.equal(estimate.knownSubtotal,420000);
 assert.equal(estimate.kind,'incomplete');
 assert.ok(estimate.missing.includes('банкет'));
 assert.equal(scoreVenue(v,80,estimate).breakdown.find(x=>x.key==='cost').value,null);
});
test('every venue has the same cost schema and table indicates missing quotes',()=>{
 const pricing=readFileSync(new URL('../src/venues-pricing.js',import.meta.url),'utf8');
 const detail=readFileSync(new URL('../src/venue-detail-ui.js',import.meta.url),'utf8');
 const list=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(pricing,/VENUE_COST_LABELS/);
 for(const label of ['menu','rent','sound','light','tech','service','welcome','drinks','corkage','staff','extension']){
  assert.ok(pricing.includes('"'+label+'"'),label);
 }
 assert.match(detail,/rowGroups\.map/);
 assert.match(detail,/vdp-cost-missing/);
 assert.match(list,/Нет достаточных тарифов/);
 assert.match(list,/data-list-date/);
 assert.doesNotMatch(list,/Сезоны в парке.*сообщили о занятости 19-го/);
});

test('new manager dates and Harmony wedding offer are not mistaken for 2027 fixed catering rates',()=>{
 assert.equal(VENUE_RECORDS.eva.dateAvailability['18'],'available');
 assert.equal(VENUE_RECORDS.eva.dateAvailability['20'],'available');
 assert.equal(VENUE_RECORDS.eva.dateAvailability['19'],undefined);
 assert.equal(VENUE_RECORDS.putilov.dateAvailability['20'],'available');
 assert.deepEqual(VENUE_RECORDS.harmony.dateAvailability,{'18':'available','19':'available','20':'available'});
 assert.equal(VENUE_RECORDS.harmony.capacity,170);
 assert.equal(VENUE_RECORDS.harmony.quotes[0].kind,'estimate');
 assert.equal(VENUE_RECORDS.harmony.quotes[1].total,720000);
 const source=VENUE_RECORDS.harmony;
 const exact=estimateVenue({id:'harmony',...source},80);
 assert.equal(exact.value,764000);
 assert.equal(exact.partial,true);
 const extrapolated=estimateVenue({id:'harmony',...source},100);
 assert.equal(extrapolated.value,912500);
 assert.equal(extrapolated.partial,true);
 assert.equal(VENUE_PRICING.harmony.corkage.unit,'/бут.');
 assert.equal(VENUE_PRICING.harmony.corkage.value,700);
 assert.ok(source.questions.some(x=>x.includes('10%')));
 assert.ok(source.documents.some(x=>x.url.includes('1PjAw62irJgQ6JgJ16Y9C1VHdz4jaXHUm')));
});


test('Palma menu tiers produce a dynamic, explicitly provisional 80 and 100 person budget',()=>{
 const v={id:'palma',region:'city',capacity:null,dateAvailability:{'19':'available'},
   cost:VENUE_RECORDS.palma.cost,quotes:VENUE_RECORDS.palma.quotes,ratings:{}};
 assert.equal(VENUE_PRICING.palma.menu.value,4700);
 assert.equal(estimateVenue(v,80).value,1013600);
 assert.equal(estimateVenue(v,100).value,1157000);
 assert.equal(estimateVenue(v,80).partial,true);
 assert.equal(estimateVenue(v,80).missing.length,0);
 assert.equal(estimateVenue({...v,cost:{...v.cost,menu:5900}},80).value,879200);
 assert.equal(VENUE_RECORDS.palma.cateringMenus.length,3);
 assert.equal(VENUE_RECORDS.palma.quotes.length,3);
});


test('Putilov has personal 2027 rental and menu quote',()=>{
 const source=VENUE_RECORDS.putilov;
 assert.equal(source.cost.rent,430000);
 assert.equal(source.cost.menu,7500);
 assert.equal(source.quotes[0].kind,'estimate');
 assert.equal(source.quotes[0].total,1200000);
 const v={id:'putilov',region:'city',cost:source.cost,quotes:source.quotes,dateAvailability:{'20':'available'},ratings:{}};
 assert.equal(estimateVenue(v,80).value,1200000);
 assert.equal(estimateVenue(v,100).value,1350000);
 assert.equal(estimateVenue(v,80).partial,true);
 assert.equal(source.cateringMenus.length,4);
});

test('one availability selector replaces separate day and status filters',()=>{
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.equal((source.match(/headerSelect\('dateFilter','Доступность по дате'/g)||[]).length,1);
 assert.doesNotMatch(source,/headerSelect\('chosenDay'|headerSelect\('date','Статус даты'|data-quick-filter|Любой статус/);
 assert.match(source,/\['19:available','19 июня · свободно'\]/);
 assert.match(source,/\['19:unavailable','19 июня · занято'\]/);
 assert.match(source,/&&matchesDateFilter\(v,ui\.dateFilter\)/);
});


test('broken venue thumbnails retry a same-venue image instead of showing broken text',()=>{
 const s=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(s,/getVenuePhotos\(v\)\.find\(p=>p\.id!==pic\?\.id\)/);
 assert.match(s,/data-fallback-cover/);
 assert.match(s,/root\.addEventListener\('error'/);
 assert.match(s,/img\.hidden=true/);
});
