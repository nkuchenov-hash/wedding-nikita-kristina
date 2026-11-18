import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VENUE_RECORDS} from '../src/venues-data.js';
import {estimateVenue, scoreVenue, RATING_CRITERIA, RATING_MAX} from '../src/venue-evaluation.js';

const venue=(overrides={})=>({
 id:'venue-score-test', region:'city',capacity:100,
 dateAvailability:{'18':'unknown','19':'available','20':'unknown'},
 cost:{rent:100000,menu:5000,service:10},
 ratings:{look:5,comfort:5,food:5,travel:5,terrace:5,terms:5},
 ...overrides
});

test('all criteria sum to 100 with June 19 the highest-weighted criterion',()=>{
 assert.equal(RATING_MAX,100);
 assert.equal(RATING_CRITERIA.reduce((s,[,,p])=>s+p,0),100);
 assert.equal(RATING_CRITERIA[0][0],'date');
 assert.equal(RATING_CRITERIA[0][2],40);
 assert.equal(RATING_CRITERIA.find(([key])=>key==='city')[2],10);
});

test('June 19 and all verified criteria yield 100 points',()=>{
 const v=venue();
 const score=scoreVenue(v,100);
 assert.equal(score.value,100);
 assert.equal(score.complete,RATING_CRITERIA.length);
 assert.equal(score.provisional,true); // Formula without confirmed quote is still an estimate.
 assert.equal(score.breakdown.find(x=>x.key==='date').value,40);
 assert.equal(score.breakdown.find(x=>x.key==='city').value,10);
});

test('country venues earn no city bonus even when other scores are perfect',()=>{
 const v=venue({region:'country'});
 const score=scoreVenue(v,100);
 assert.equal(score.breakdown.find(x=>x.key==='city').value,0);
 assert.equal(score.value,90);
});

test('alternate date yields 24 date points, not 40',()=>{
 const v=venue({dateAvailability:{'18':'available','19':'unavailable','20':'unknown'}});
 const score=scoreVenue(v,100);
 assert.equal(score.breakdown.find(x=>x.key==='date').value,24);
 assert.equal(score.value,84);
});

test('unconfirmed date and subjective qualities stay unknown',()=>{
 const v=venue({ratings:{},dateAvailability:{'18':'unknown','19':'unknown','20':'unknown'}});
 const score=scoreVenue(v,100);
 assert.equal(score.breakdown.find(x=>x.key==='date').value,null);
 assert.equal(score.breakdown.find(x=>x.key==='terrace').value,null);
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

test('shortlist excludes six dismissed venues but retains archived records',()=>{
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 const list=source.slice(source.indexOf('export const PUBLIC_VENUES'),source.indexOf('const DATE_CHOICES'));
 for(const id of ['kraft','loft-roof','360','zhemchuzhny','english-roof','admiralty-roof']){
  assert.doesNotMatch(list,new RegExp("id:'"+id+"'"));
  assert.equal(VENUE_RECORDS[id].archived,true);
 }
 for(const id of ['vinity','vesenniy','k2','alex-park','ermolinsky','maryino','harmony','putilov']){
  assert.match(list,new RegExp("id:'"+id+"'"));
 }
 assert.match(source,/venueApi\('admin\/venue-dates'\)/);
 assert.match(source,/state\.venues=incoming/);
 assert.doesNotMatch(source,/function patch\(/);
 assert.match(source,/guestCount:state\.guestCount/);
});

test('Royal Beach June 19 is unavailable; June 18/20 remain unconfirmed',()=>{
 const royal=VENUE_RECORDS.royal;
 assert.equal(royal.dateAvailability['19'],'unavailable');
 assert.equal(royal.dateAvailability['18'],undefined);
 assert.equal(royal.dateAvailability['20'],undefined);
 assert.equal(VENUE_RECORDS['alex-park'].dateAvailability['18'],'unavailable');
 assert.equal(VENUE_RECORDS['alex-park'].dateAvailability['20'],'available');
 const js=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(js,/_royalDateRevision:'2026-11-18'/);
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
