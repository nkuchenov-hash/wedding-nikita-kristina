import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
test('venue photo has a fixed large desktop grid track and full-size image inside its frame',()=>{
 const css=read('admin-heading.css'),base=read('venues.css'),js=read('venues.js');
 assert.match(css,/--venue-thumb-w:240px;--venue-thumb-h:160px/);
 assert.match(css,/grid-template-columns:var\(--venue-thumb-w\) minmax\(0,1fr\)/);
 assert.match(css,/\.vw-image-open>\.vw-row-thumb\{display:block;width:100%;height:100%/);
 assert.doesNotMatch(css,/\.vw-image-open>\.vw-row-thumb\{width:(?:56|72)px/);
 assert.doesNotMatch(base,/\.vw-image-open>\.vw-row-thumb\{width:(?:43|46)px/);
 assert.match(js,/&sz=w800/);
});
