import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('program keeps original primary-tag color gradients and exact minute drag/resize',()=>{
 const css=read('src/admin-program.css'),shared=read('src/admin-heading.css'),js=read('src/admin-program.js');
 assert.match(css,/color-mix\(in srgb,var\(--activity-color/);
 assert.doesNotMatch(shared,/color-mix\(in srgb,var\(--activity-color,var\(--wd-soft\)\) 15%/);
 assert.match(js,/setTimeout\(\(\)=>arm\(state\),230\)/);
 assert.match(js,/snapToFive\(\(y-state.initialY\+scrollDelta\)\/MINUTE_PX\)/);
 assert.match(js,/data-parallel-lane/);
 assert.match(js,/saveSlot\(item,/);
});
