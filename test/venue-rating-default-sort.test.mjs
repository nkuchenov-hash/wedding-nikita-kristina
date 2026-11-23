import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VENUE_DEFAULT_SORT,compareVenueScoreValues} from '../src/venues.js';

test('Venue lists start with descending rating on every list route',()=>{
 assert.deepEqual(VENUE_DEFAULT_SORT,{sort:'score',sortDir:'desc'});
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(source,/sort:'score',sortDir:'desc'/);
 assert.match(source,/if\(archiveRoute\|\|allRoute\|\|activeRoute\)applyListDefaultSort\(route\)/);
 assert.match(source,/ui\.sort=VENUE_DEFAULT_SORT\.sort/);
 assert.match(source,/ui\.sortDir=VENUE_DEFAULT_SORT\.sortDir/);
 assert.match(source,/columnHeading\('score','Рейтинг'\)/);
});

test('Rating sort is numerical and leaves unknown scores last',()=>{
 const input=[{id:'a',score:36.5},{id:'b',score:87.1},{id:'c',score:null},
              {id:'d',score:87},{id:'e',score:0}];
 const desc=[...input].sort((a,b)=>compareVenueScoreValues(a.score,b.score));
 assert.deepEqual(desc.map(x=>x.id),['b','d','a','e','c']);
 const asc=[...input].sort((a,b)=>compareVenueScoreValues(a.score,b.score,'asc'));
 assert.deepEqual(asc.map(x=>x.id),['e','a','d','b','c']);
 assert.equal(compareVenueScoreValues(null,undefined),0);
 assert.equal(compareVenueScoreValues(25,25),0);
});

test('Edits to scoring rules reorder rows immediately before save',()=>{
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 const onInput=source.slice(source.indexOf("root.addEventListener('input',"),source.indexOf("root.addEventListener('submit',"));
 assert.match(onInput,/if\(valid\)\{/);
 assert.match(onInput,/visibleVenues\(PUBLIC_VENUES\.map\(get\)\)/);
 assert.match(onInput,/tbody\.innerHTML=ordered\.map\(row\)\.join\(''\)/);
 assert.match(source,/if\(ui\.sort==='score'\)\{\s*const byRating=compareVenueScoreValues/);
});
