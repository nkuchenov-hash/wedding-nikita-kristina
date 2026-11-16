import test from 'node:test';
import assert from 'node:assert/strict';
import {adminModules} from '../src/data.js';
import {approvedVenueIds} from '../src/admin-photos.js';
import {readFileSync} from 'node:fs';

test('organizer sidebar contains exactly one photo section',()=>{
 const photoSections=adminModules.filter(x=>x.id==='photos'||x.id==='moderation'||/фото/i.test(x.label));
 assert.deepEqual(photoSections.map(x=>x.id),['photos']);
});

test('only explicitly approved programme venues are eligible for photo archive',()=>{
 const ids=approvedVenueIds([
  {venue_id:'maryino',is_confirmed:1},
  {venue_id:'vinity',is_confirmed:0},
  {venue_id:'royal',is_confirmed:'1'},
  {venue_id:'alex-park',is_confirmed:null},
  {venue_id:'',is_confirmed:1},
  {venue_id:'maryino',is_confirmed:true}
 ]);
 assert.deepEqual([...ids],['maryino','royal']);
});

test('empty or missing approval never implies every venue approved',()=>{
 assert.equal(approvedVenueIds([]).size,0);
 assert.equal(approvedVenueIds([{venue_id:'vinity'}]).size,0);
});

test('single gallery pulls approval from schedule, not all comparison venues',()=>{
 const code=readFileSync(new URL('../src/admin-photos.js',import.meta.url),'utf8');
 assert.match(code,/collection=schedule_items/);
 assert.match(code,/ALL_ALBUMS\.filter\(album=>approved\.has\(album\.id\)\)/);
 assert.match(code,/albumList=\[\]/);
 assert.match(code,/Fail closed/);
});
