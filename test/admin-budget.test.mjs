import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetTotals,budgetRows} from '../src/admin-data-ui.js';
test('budget distinguishes unknown supplier expenses, paid amounts and outstanding commitments',()=>{
 const rows=budgetRows([{id:'prod-a',planned_rub:0,committed_rub:0,paid_rub:0},{id:'b',planned_rub:800000,committed_rub:500000,paid_rub:100000}], [{id:'a',details_json:'{"fee":0,"travel":null}',estimate_rub:0}],[],80);
 assert.equal(rows[0].unknown,true);
 assert.deepEqual(budgetTotals(rows,1000000),{planned:800000,committed:500000,paid:100000,remaining:400000,unknown:1,free:200000});
});
test('known zero is not missing when all cost fields are explicit',()=>{
 const rows=budgetRows([{id:'prod-a'}],[{id:'a',details_json:'{"fee":0,"travel":0,"hotel":0,"food":0,"equipment":0,"extras":0}'}],[],80);
 assert.equal(rows[0].unknown,false);
});
