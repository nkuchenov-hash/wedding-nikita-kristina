import test from 'node:test';
import assert from 'node:assert/strict';
import {VENUE_RECORDS} from '../src/venues-data.js';
import {estimateVenue} from '../src/venue-evaluation.js';
import {VENUE_WORKING_BUDGETS} from '../src/venue-budget-coverage.js';
import {renderVenueNewPage} from '../src/venue-detail-ui.js';

const venue=id=>({id,name:id,region:'city',area:'СПб',quotes:VENUE_RECORDS[id]?.quotes||[],cost:VENUE_RECORDS[id]?.cost||{},
 dateAvailability:VENUE_RECORDS[id]?.dateAvailability||{},...VENUE_RECORDS[id]});
const cases={
 'milyutin':780750,'glukhovsky':677500,'roof18':965000,'ermolinsky':1380000,
 'zarenkov-gallery':636000,'palma':1013600,'panorama':1036400,'eva':682500,
 'petr':611000,'maryino':1082000,'repino-riviera':1752000,
 'bali':874000,'ambassador':1032000
};
test('Working comparisons for 13 wedding venues are itemized, dynamic and visibly assumptions',()=>{
 assert.equal(Object.keys(VENUE_WORKING_BUDGETS).length,Object.keys(cases).length);
 for(const [id,total] of Object.entries(cases)){
  const v=venue(id),estimate=estimateVenue(v,80);
  assert.equal(estimate.value,total,id);
  assert.equal(estimate.kind,'planning',id);
  assert.equal(estimate.partial,true,id);
  assert.equal(estimate.isQuote,false,id);
  assert.equal(estimate.items.reduce((sum,x)=>sum+x.amount,0),total,id);
  assert.equal(estimate.missing.length,0,id);
  assert.match(estimate.note,/не (договорная|тариф|КП)|не подтвержд|рабоч|допущ/i,id);
  assert.notEqual(estimateVenue(v,100).value,total,id+' guest count must recompute');
  assert.ok(renderVenueNewPage(v,{guests:80,ui:{detailTab:'budget',photoSection:'all',photoView:'grid',photoSort:'original',photoIndex:0},estimate:x=>estimateVenue(x,80),extraTotal:()=>0,dayStatus:()=> 'unknown',dayText:()=> 'Нет подтверждения',weighted:()=>({value:null,complete:0,maximum:100})}).includes('Выбранный сценарий'),id);
 }
});
test('Roof 18 deposit counts toward banquet, rather than on top of it',()=>{
 const v=venue('roof18'),e=estimateVenue(v,80);
 assert.equal(v.cost.minSpend,750000);
 assert.equal(e.value,965000);
 assert.equal(e.items.find(x=>x.label.includes('Доведение заказа')).amount,230000);
 assert.ok(e.note.includes('НЕ прибавляется'));
});
test('Glukhovsky uses a separate 25k disco reserve without claiming it is a quote',()=>{
 const e=estimateVenue(venue('glukhovsky'),80);
 assert.equal(e.items.find(x=>x.label.includes('свет и звук')).amount,25000);
 assert.equal(e.items.find(x=>x.label.includes('Пробковый сбор')).amount,32500);
 assert.match(e.note,/не КП|НЕ подписанное КП/);
});
test('K2 still retains its two source-grounded menu scenarios and quoted rental',()=>{
 assert.equal(estimateVenue(venue('k2'),80).value,1558000);
 assert.equal(estimateVenue(venue('k2'),80).kind,'planning');
});
