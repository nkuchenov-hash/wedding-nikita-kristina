import test from 'node:test';
import assert from 'node:assert/strict';
import {groupGuestsByConnections,normalizeGuestTableColumns,DEFAULT_GUEST_TABLE_COLUMNS} from '../src/admin-guests.js';

const people=[
 {id:'sam',display_name:'Сэм',side:'groom',community:'Друзья',seating_group:'Сэм с девушкой'},
 {id:'girlfriend',display_name:'Девушка Сэма',side:'groom',community:'Друзья',seating_group:'Сэм с девушкой'},
 {id:'roma',display_name:'Рома',side:'groom',community:'Семья',seating_group:'Рома и Алина'},
 {id:'alina',display_name:'Алина',side:'groom',community:'Семья',seating_group:'Рома и Алина'},
 {id:'university',display_name:'Анна',side:'groom',community:'Университет',seating_group:''},
 {id:'university2',display_name:'Илья',side:'groom',community:'Университет',seating_group:''},
 {id:'bride',display_name:'Катя',side:'bride',community:'Семья',seating_group:''}
];

test('group sorting keeps Sam and his girlfriend adjacent and in that order',()=>{
 const groups=groupGuestsByConnections(people,people,[{guest_id_1:'sam',guest_id_2:'girlfriend',relation_type:'partner'}]);
 const names=groups.flatMap(group=>group.members.map(person=>person.display_name));
 assert.equal(names.indexOf('Девушка Сэма'),names.indexOf('Сэм')+1);
 assert.equal(new Set(names).size,people.length);
 assert.equal(names.length,people.length);
});
test('families and university guests form their own circle groups',()=>{
 const groups=groupGuestsByConnections(people,people,[]);
 const byName=new Map(groups.flatMap(g=>g.members.map(person=>[person.id,g.label])));
 assert.equal(byName.get('roma'),byName.get('alina'));
 assert.equal(byName.get('university'),byName.get('university2'));
 assert.notEqual(byName.get('roma'),byName.get('bride'));
 assert.match(byName.get('university'),/Университет/);
});
test('filtering does not insert hidden relatives or duplicate rows',()=>{
 const selected=people.filter(person=>!['girlfriend','bride'].includes(person.id));
 const groups=groupGuestsByConnections(selected,people,[{guest_id_1:'sam',guest_id_2:'girlfriend'}]);
 assert.deepEqual(new Set(groups.flatMap(g=>g.members.map(p=>p.id))),new Set(selected.map(p=>p.id)));
});
test('guest identity stays first and invalid legacy selections use the current readable default',()=>{
 assert.deepEqual(normalizeGuestTableColumns(['city','name_en','city','not-a-column']),
 DEFAULT_GUEST_TABLE_COLUMNS);
 assert.deepEqual(normalizeGuestTableColumns(['city','city']),
 ['display_name','city']);
 assert.deepEqual(normalizeGuestTableColumns(null),DEFAULT_GUEST_TABLE_COLUMNS);
});

import {readFile} from 'node:fs/promises';
test('guest toolbar uses only header add, expandable search and icon-only settings',async()=>{
 const js=await readFile(new URL('../src/admin-guests.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/admin-guests.css',import.meta.url),'utf8');
 assert.match(js,/actions\.append\(searchWrap,columnPrefs,add\)/);
 assert.match(js,/searchField\.hidden=true/);
 assert.match(js,/searchWrap\.append\(searchField,searchToggle\)/);
 assert.match(css,/right:calc\(100% \+ 8px\)/);
 assert.match(css,/\.ad-guestbook \.ad-gb-top-actions>\.ad-gb-primary\{order:3/);
 assert.match(js,/searchToggle\.addEventListener\('click'/);
 assert.match(js,/filterField\('Сторона',side\)/);
 assert.match(js,/filterField\('Сортировка',sort\)/);
 assert.doesNotMatch(js,/bar\.append\(search,side,filter,sort,direction/);
 assert.match(css,/\.ad-gb-settings-icon\{[\s\S]*?border:0!important/);
 assert.match(css,/\.ad-gb-search-field\[hidden\]\{display:none!important\}/);
});

test('guest editor has a pinned Save Cancel Delete footer and icon-only close',async()=>{
 const ui=await readFile(new URL('../src/admin-guests.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/admin-guests.css',import.meta.url),'utf8');
 assert.match(ui,/ad-gb-panel-footer/);
 assert.match(ui,/ad-gb-footer-delete','Удалить'/);
 assert.match(ui,/ad-gb-footer-cancel','Отмена'/);
 assert.match(ui,/ad-gb-primary ad-gb-footer-save','Сохранить'/);
 assert.match(ui,/ad-gb-close','×'/);
 assert.doesNotMatch(ui,/ad-gb-close','Закрыть ×'/);
 assert.match(ui,/panelSave=async\(\)=>/);
 assert.match(ui,/panelDirty=/);
 assert.match(ui,/closeWithCheck/);
 assert.match(ui,/admin\/guest\/fields/);
 assert.match(ui,/admin\/guest\/rsvp/);
 assert.match(css,/\.ad-gb-panel-footer\{/);
 assert.match(css,/\.ad-gb-details\{flex:1 1 auto;min-height:0;overflow-y:auto/);
 assert.match(css,/\.ad-gb-panel-footer\[hidden\]\{display:none!important\}/);
});
