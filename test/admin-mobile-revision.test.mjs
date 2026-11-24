import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
test('overview has no permanent refresh indicator; mobile uses one header and compact cards',()=>{
 const data=read('admin-data-ui.js'),css=read('admin-heading.css');
 assert.doesNotMatch(data,/Обновлено |ad-overview-sync/);
 assert.match(data,/overviewOffline/);
 assert.match(css,/\[data-admin-section="schedule"\] \.ad-timeline-page \.ad-tl-header\{display:none\}/);
 assert.match(css,/--admin-mobile-edge:14px/);
 assert.match(css,/\.ad-tl-ideas-grid \.ad-tl-card:not\(\.ad-tl-calendar-card\)\{min-height:0/);
});
test('guest participation is part of filters and settings always have explicit close',()=>{
 const guest=read('admin-guests.js');
 assert.match(guest,/filterField\('Дети',childrenToggle\)/);
 assert.match(guest,/childrenToggle=select/);
 assert.doesNotMatch(guest,/page\.append\(filterBar\)/);
 assert.match(guest,/Закрыть настройки/);
 assert.match(guest,/closeColumns\(\{focus:true\}\)/);
 assert.match(guest,/mobileAdd\.addEventListener\('click',createGuest\)/);
});
