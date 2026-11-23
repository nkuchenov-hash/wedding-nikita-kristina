import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RATING_CRITERIA,RATING_MAX,OBJECTIVE_CRITERIA,DEFAULT_RATING_RULES,validateRatingRules,migrateRatingRules,scoreVenue} from '../src/venue-evaluation.js';

test('Archive and global rating editor are adjacent actions on the main venues page',()=>{
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(source,/data-open-archive href="#\/admin\/venues\/archive"/);
 assert.match(source,/в архиве<\/a><button type="button" class="vw-rating-trigger" data-rating-open/);
 assert.match(source,/class="vw-rating-drawer"/);
 assert.match(source,/role="dialog" aria-modal="true"/);
 assert.match(source,/data-rating-form/);
 assert.match(source,/data-rating-weight/);
 assert.match(source,/data-rating-close/);
 assert.match(source,/admin\/settings/);
 assert.doesNotMatch(source,/\n  renderVenueRatingGuide\(\)\+/);
 assert.match(source,/data-venue-archive/);
 assert.match(source,/Вернуть из архива/);
});

test('There are 100 adjustable points and no subjective rating criteria',()=>{
 assert.equal(RATING_MAX,100);
 assert.equal(RATING_CRITERIA.reduce((sum,r)=>sum+r[2],0),100);
 assert.equal(OBJECTIVE_CRITERIA.length,2);
 assert.equal(RATING_CRITERIA.length,6);
 const names=RATING_CRITERIA.map(x=>x[1]).join(' ');
 for(const term of ['Атмосфера','Комфорт гостей','Логистика','Все гости в одном зале','Крытая рассадка при дожде','До 23:00 без доплаты','Свой алкоголь без пробкового сбора'])assert.ok(!names.includes(term));
 assert.ok(validateRatingRules(DEFAULT_RATING_RULES));
 assert.equal(validateRatingRules({...DEFAULT_RATING_RULES,weights:{...DEFAULT_RATING_RULES.weights,date:39}}),null);
 assert.equal(validateRatingRules({...DEFAULT_RATING_RULES,priceLimits:[650000,650000,1000000,1200000]}),null);
});

const sample=()=>({region:'city',capacity:80,
 dateAvailability:{'18':'unavailable','19':'available','20':'unavailable'},ratingFacts:{
  includedEquipment:'yes',outdoorArea:'yes'
 }});
const row=(score,key)=>score.breakdown.find(x=>x.key===key);

test('Objective facts use identical yes / no / unknown logic for every venue',()=>{
 const v=sample();
 const full=scoreVenue(v,80,{value:650000,isQuote:true,partial:false});
 assert.equal(full.value,100);
 assert.equal(row(full,'date').value,45);
 assert.equal(row(full,'city').value,10);
 assert.equal(row(full,'cost').value,20);
 assert.equal(row(full,'includedEquipment').value,7);
 const absent=scoreVenue({...v,ratingFacts:{...v.ratingFacts,includedEquipment:'no'}},80,{value:650000,isQuote:true,partial:false});
 assert.equal(row(absent,'includedEquipment').value,0);
 const unknown=scoreVenue({...v,ratingFacts:{...v.ratingFacts,includedEquipment:'unknown'}},80,{value:650000,isQuote:true,partial:false});
 assert.equal(row(unknown,'includedEquipment').value,null);
 assert.equal(unknown.provisional,true);
});

test('Changing shared rules recalculates all scores, thresholds and alternative-date points',()=>{
 const v=sample();
 const cost={value:700000,isQuote:true,partial:false};
 const before=scoreVenue(v,80,cost);
 const updated=validateRatingRules({...DEFAULT_RATING_RULES,weights:{...DEFAULT_RATING_RULES.weights,date:40,cost:25},
   alternativeDatePercent:50,priceLimits:[600000,750000,950000,1150000]});
 assert.ok(updated);
 const after=scoreVenue(v,80,cost,updated);
 assert.equal(row(before,'date').value,45);
 assert.equal(row(after,'date').value,40);
 assert.equal(row(before,'cost').value,16);
 assert.equal(row(after,'cost').value,20);
 const alternative=scoreVenue({...v,dateAvailability:{'18':'available','19':'unavailable','20':'unknown'}},80,cost,updated);
 assert.equal(row(alternative,'date').value,20);
});

test('Provisional working budgets are included but clearly marked, and can be disabled',()=>{
 const e={value:800000,partial:true,isQuote:false,kind:'planning'};
 const on=scoreVenue(sample(),80,e);
 assert.equal(row(on,'cost').value,16);
 assert.equal(on.provisional,true);
 const off=scoreVenue(sample(),80,e,{...DEFAULT_RATING_RULES,includeWorkingBudgets:false});
 assert.equal(row(off,'cost').value,null);
});

test('Venue rating page exposes editable evidence fields and saves them as venue overrides',()=>{
 const detail=readFileSync(new URL('../src/venue-detail-ui.js',import.meta.url),'utf8');
 const list=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(detail,/data-rating-fact/);
 assert.match(detail,/Нет подтверждения/);
 assert.match(detail,/Да, подтверждено/);
 assert.match(detail,/Нет, подтверждено/);
 assert.match(list,/changes\.ratingFacts/);
 assert.match(list,/commitInlineChanges\(id,changes,root\)/);
});

test('Previously saved ten-criterion rating preferences migrate without retaining rejected criteria',()=>{
 const legacy={
  weights:{date:40,cost:15,capacity:10,city:10,singleHall:6,indoorBackup:5,
    includedEquipment:5,until23:3,ownAlcohol:3,outdoorArea:3},
  alternativeDatePercent:50,priceLimits:[600000,850000,1050000,1400000],
  pricePercents:[100,75,50,25,0],includeWorkingBudgets:false
 };
 const migrated=migrateRatingRules(legacy);
 assert.ok(migrated);
 assert.deepEqual(migrated.weights,DEFAULT_RATING_RULES.weights);
 assert.deepEqual(migrated.priceLimits,legacy.priceLimits);
 assert.deepEqual(migrated.pricePercents,legacy.pricePercents);
 assert.equal(migrated.alternativeDatePercent,50);
 assert.equal(migrated.includeWorkingBudgets,false);
 for(const key of ['singleHall','indoorBackup','until23','ownAlcohol'])
  assert.equal(Object.hasOwn(migrated.weights,key),false);
 const custom={...legacy,weights:{...legacy.weights,date:50,singleHall:0,indoorBackup:1,until23:1,ownAlcohol:1}};
 // 50+15+10+10+0+1+5+1+1+3 = 96, so malformed older preferences are rejected.
 assert.equal(migrateRatingRules(custom),null);
});
