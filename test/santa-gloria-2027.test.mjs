import test from 'node:test';
import assert from 'node:assert/strict';
import {VENUE_RECORDS} from '../src/venues-data.js';
import {estimateVenue} from '../src/venue-evaluation.js';

test('Santa Gloria manager deposit conditions are date-specific and not mistaken for menu per guest',()=>{
 const v=VENUE_RECORDS['santa-gloria'];
 assert.equal(v.cost.minSpend,1300000);
 assert.equal(v.cost.service,10);
 assert.equal(v.cost.technical,35000);
 assert.equal(v.cost.extension,50000);
 assert.equal(v.cost.menu,undefined);
 assert.deepEqual(v.quotes.map(q=>[q.date,q.guests,q.total,q.kind]),[
  ['2027-06-19',80,1465000,'estimate'],
  ['2027-06-18',80,1465000,'estimate'],
  ['2027-06-20',80,1135000,'estimate']
 ]);
 assert.ok(v.quotes.every(q=>q.label.includes('депозит')||q.label.includes('Депозит')));
 assert.deepEqual(v.dateAvailability,{18:'unknown',19:'unknown',20:'unknown'});
 const calculated=estimateVenue({...v,id:'santa-gloria'},80);
 assert.equal(calculated.value,1465000);
 assert.equal(calculated.partial,true);
 assert.equal(calculated.isQuote,false);
 assert.ok(v.costSummary.includes('1 500 000'));
 assert.ok(v.costSummary.includes('не прибавлять'));
 assert.match(v.quoteSource,/docs\.google\.com\/spreadsheets/);
});
