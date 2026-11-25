import test from 'node:test';import assert from 'node:assert/strict';import {applyVenueSelection} from '../src/venues.js';
test('selection archives alternatives without mutating original archive state',()=>{
 const source=[{id:'a',archived:false},{id:'b',archived:false},{id:'c',archived:true,archiveReason:'Ранее исключена'}];
 const chosen=source.map(v=>applyVenueSelection(v,'a'));
 assert.deepEqual(chosen.filter(v=>!v.archived).map(v=>v.id),['a']);
 assert.equal(chosen[2].archiveReason,'Ранее исключена');
 assert.deepEqual(source.map(v=>applyVenueSelection(v,null)).filter(v=>!v.archived).map(v=>v.id),['a','b']);
 assert.equal(source[1].archived,false);
 assert.deepEqual(source.map(v=>applyVenueSelection(v,'c')).filter(v=>!v.archived).map(v=>v.id),['c']);
});
