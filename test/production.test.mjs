import test from 'node:test';import assert from 'node:assert/strict';import {productionCost} from '../src/admin-production.js';
test('vendor costs distinguish known zero and missing',()=>{assert.deepEqual(productionCost({fee:0,travel:12000}),{sum:12000,unknown:true})});
test('decor recalculates per guest',()=>{assert.deepEqual(productionCost({unit:'guest',unitPrice:150,install:0,delivery:1000},true,80),{sum:13000,unknown:false})});
