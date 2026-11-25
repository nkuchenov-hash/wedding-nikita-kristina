import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('admin dropdown is shared, top-layer aware, keyboard accessible and preserves native form events',()=>{
 const js=read('admin-app.js'),css=read('admin-heading.css');
 assert.match(js,/select:not\(\[multiple\]\):not\(\[size\]\)/);
 assert.match(js,/menu\.setAttribute\('role','listbox'\)/);
 assert.match(js,/menu\.showPopover\(\)/);
 assert.match(js,/select\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
 assert.match(js,/select\.dispatchEvent\(new Event\('input',\{bubbles:true\}\)\)/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(css,/\.admin-select-popup\{/);
 assert.match(css,/\.admin-select-option\.is-highlighted/);
 assert.match(css,/\.admin-select-status\[data-status="available"\]/);
});
