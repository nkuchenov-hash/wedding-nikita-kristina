import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const modules=[
 'venue-detail-ui.css','venues.css','admin-data.css','admin-program.css',
 'admin-guests.css','admin-photos.css','venue-files-ui.css','admin-heading.css'
];
test('No organizer module has font declarations below 16 CSS px',()=>{
 for(const file of modules){
  const css=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
  // Approved exception for non-interactive sidebar group captions only.
  const readableCss=file==='admin-heading.css'?css.replace(/body\.admin-body \.admin-side \.side-group-title\{[^}]*\}/g,''):css;
  const values=[...readableCss.matchAll(/(?:font-size|(?<!-)font)\s*:\s*([^;}]+)/g)].map(m=>m[1]);
  const tooSmall=values.flatMap(value=>[...value.matchAll(/(\d+(?:\.\d+)?)px\b/g)]
   .filter(([,number])=>Number(number)>0&&Number(number)<16).map(([raw])=>raw));
  assert.deepEqual(tooSmall,[],file+' contains miniature text');
 }
});
test('Organizer design tokens set readable body, navigation, labels and inputs',()=>{
 const css=readFileSync(new URL('../src/admin-heading.css',import.meta.url),'utf8');
 assert.match(css,/--admin-text-size:17px/);
 assert.match(css,/--admin-label-size:16px/);
 assert.match(css,/\.admin-side \.side-link\{font-size:17px/);
 assert.match(css,/\.admin-content small\{font-size:16px/);
 assert.match(css,/\.admin-content :is\(input,select,textarea\)\{min-height:42px/);
});
