import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
test('sidebar uses the approved groups, existing routes and consistent SVG icons',()=>{
 const app=read('admin-app.js'),data=read('data.js'),css=read('admin-heading.css');
 assert.match(app,/title:'УПРАВЛЕНИЕ',ids:\['overview','budget','tasks'\]/);
 assert.match(app,/title:'ОРГАНИЗАЦИЯ',ids:\['venues','vendors','decor','menu','schedule'\]/);
 assert.match(app,/title:'ГОСТИ И МАТЕРИАЛЫ',ids:\['guests','photos'\]/);
 assert.match(app,/\$\{sidebarIcon\(m\.id\)\}/);
 assert.match(app,/aria-current="page"/);
 assert.match(data,/id:'menu', label:'Банкетное меню'/);
 assert.match(css,/\.side-group-title\{font-size:11px;font-weight:300/);
 assert.match(css,/\.side-group\+\.side-group::before/);
 assert.match(css,/--side-inset:12px;--side-icon-size:20px/);
 assert.doesNotMatch(app,/class="side-caption"/);
});
