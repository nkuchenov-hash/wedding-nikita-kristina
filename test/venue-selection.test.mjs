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

import {readFileSync} from 'node:fs';
test('venue comparison contains no selection or archive actions; decisions live on venue detail',()=>{const s=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');const d=readFileSync(new URL('../src/venue-detail-ui.js',import.meta.url),'utf8');const row=s.slice(s.indexOf('return \'<tr class="vw-row'),s.indexOf('// Venue detail rendering is centralized'));assert.doesNotMatch(row,/data-venue-select|data-venue-unselect/);assert.match(row,/vw-archive-cell/);assert.ok(row.indexOf('vw-archive-cell')>row.indexOf('vw-score'));assert.match(d,/Утвердить местом торжества/);assert.match(d,/vdp-archive-footer/);assert.match(d,/data-venue-archive/);assert.ok(d.indexOf('vdp-archive-footer')>d.indexOf('vdp-foot'))});

import {normalizeVenueTableLayout} from '../src/venues.js';
test('Venue table layout uses bounded column widths and valid row heights',()=>{assert.deepEqual(normalizeVenueTableLayout({row_height:128,truncate:false,widths:{name:20,date:3000,score:180,invalid:33}}),{row_height:128,truncate:false,widths:{name:260,date:1000,score:180}});assert.equal(normalizeVenueTableLayout(null).row_height,192)});
