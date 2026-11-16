import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
