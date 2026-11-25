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
test('Venue table layout uses bounded column widths and valid row heights',()=>{assert.deepEqual(normalizeVenueTableLayout({row_height:128,truncate:false,widths:{name:20,date:3000,score:180,invalid:33}}),{row_height:128,truncate:false,widths:{name:260,date:1000,score:180},visible:['name','date','visit','price','capacity','score','archive']});assert.equal(normalizeVenueTableLayout(null).row_height,192)});

test('Venue table settings reuse the guest toolbar icon instead of a filled rating button',()=>{const s=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');const g=readFileSync(new URL('../src/admin-guests.js',import.meta.url),'utf8');const css=readFileSync(new URL('../src/admin-guests.css',import.meta.url),'utf8');assert.match(s,/class="ad-gb-settings-icon" data-table-settings/);assert.doesNotMatch(s,/class="vw-rating-trigger" data-table-settings/);const icon=g.match(/columnsButton\.innerHTML='([^']+)'/)[1];assert.ok(s.includes(icon));assert.ok(css.includes(':is(.ad-guestbook,.vw-control-board) .ad-gb-settings-icon'));assert.match(s,/id="venue-table-settings"/)});

test('Venue table settings show visibility checkboxes and keep width resizing in table',()=>{const s=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');const api=readFileSync(new URL('../backend/src/api.php',import.meta.url),'utf8');assert.deepEqual(normalizeVenueTableLayout({visible:['score','invalid','price']}).visible,['name','price','score']);assert.deepEqual(normalizeVenueTableLayout({visible:[]}).visible,['name']);assert.match(s,/Отображаемые столбцы/);assert.match(s,/data-layout-column/);assert.doesNotMatch(s,/data-layout-width/);assert.match(s,/cell\.hidden=!visible/);assert.match(s,/data-vw-resize/);assert.match(api,/\['row_height','truncate','widths','visible'\]/)});
