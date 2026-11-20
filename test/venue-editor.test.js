import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderVenueNewPage,renderVenueQuoteEditorRow} from '../src/venue-detail-ui.js';

const venue={
 id:'venue-editor-test',name:'Площадка для проверки',region:'city',area:'Санкт-Петербург',
 capacity:100,capacityNote:'80-100 гостей',visited:true,
 summary:'Сведения о площадке',notes:'Заметки организаторов',
 dateAvailability:{'18':'unknown','19':'available','20':'pending'},
 cost:{menu:5500,rent:110000,service:10},included:['Банкет'],
 excluded:['Продление'],questions:['Уточнить бронь'],
 quotes:[{date:'2027-06-19',guests:80,total:700000,kind:'quote',label:'Смета'}],ratings:{},extras:{}
};
const context=(detailTab)=>({
 guests:80,ui:{detailTab,photoView:'gallery',photoSection:'all'},
 estimate:()=>({value:700000,partial:false,isQuote:true,note:'Полученная смета'}),
 extraTotal:()=>0,
 dayStatus:(v,d)=>v.dateAvailability[d]||'unknown',
 dayText:(v,d)=>({available:'Свободно',pending:'Уточняется',unknown:'Нет подтверждения'}[v.dateAvailability[d]]||'Нет данных'),
 weighted:()=>({value:80,complete:6,provisional:true,breakdown:[]})
});

test('overview displays data directly as editable values, without an edit-only page',()=>{
 const html=renderVenueNewPage(venue,context('overview'));
 for(const key of ['name','area','summary','capacity','capacityNote',
  'date:18','date:19','date:20','cost:menu','cost:rent','cost:service',
  'included','excluded','questions']){
  assert.ok(html.includes('data-venue-inline="'+key+'"'),key+' not clickable');
 }
 assert.match(html,/Нажмите на значение, чтобы изменить его/);
 assert.doesNotMatch(html,/Редактировать данные и смету/);
 assert.doesNotMatch(html,/Изменить даты →/);
 assert.doesNotMatch(html,/data-venue-edit=/);
});


test('venue Overview begins with decision KPIs and keeps photo gallery last',()=>{
 const html=renderVenueNewPage(venue,context('overview'));
 const dashboard=html.indexOf('class="vdp-parameter-dashboard"');
 const detail=html.indexOf('class="vdp-dashboard-details"');
 const terms=html.indexOf('class="vdp-scope-grid"');
 const gallery=html.indexOf('class="vdp-pane vdp-overview-gallery"');
 assert.ok(dashboard>=0,'Decision dashboard must exist');
 assert.ok(detail>dashboard,'Dates and budget must follow dashboard');
 assert.ok(terms>detail,'Terms follow financial details');
 assert.ok(gallery>terms,'Photos come after all decision information');
 for(const key of ['date:19','capacity','region','visited']){
  assert.ok(html.slice(dashboard,detail).includes('data-venue-inline="'+key+'"'),key+' editable on first screen');
 }
 assert.match(html.slice(dashboard,detail),/Рейтинг/);
 assert.match(html.slice(dashboard,detail),/700 000|700 000|700 000/);
 assert.match(html.slice(dashboard,detail),/data-state="guestCount"/);
 assert.ok(!html.slice(dashboard,detail).includes('Фотографии с осмотра'),
  'Photography must not be the first section');
});

test('conditions values are clickable in the same cards, no repeated editing section',()=>{
 const html=renderVenueNewPage(venue,context('terms'));
 for(const key of ['summary','capacity','capacityNote','visited','notes',
  'contactPhone','contactEmail','date:18','date:19','date:20',
  'included','excluded','questions']){
  assert.ok(html.includes('data-venue-inline="'+key+'"'),key+' is missing');
 }
 assert.match(html,/Условия площадки/);
 assert.doesNotMatch(html,/<h2>Редактирование<\/h2>/);
 assert.doesNotMatch(html,/data-edit-field=/);
 assert.doesNotMatch(html,/href="#\/admin\/venues\/venue-editor-test\/edit"/);
});

test('budget sums and quote cards are editable in place',()=>{
 const html=renderVenueNewPage(venue,context('budget'));
 assert.match(html,/data-venue-inline="cost:menu"/);
 assert.match(html,/data-venue-inline="cost:rent"/);
 assert.match(html,/data-venue-inline="extra:alcohol"/);
 assert.match(html,/data-inline-quote="0"/);
 assert.match(html,/data-add-inline-quote/);
 assert.doesNotMatch(html,/data-venue-edit=/);
});

test('quote editing supports count, total, date, label and type',()=>{
 const html=renderVenueQuoteEditorRow(venue.quotes[0]);
 for(const field of ['guests','total','date','label','kind'])
  assert.ok(html.includes('data-quote-field="'+field+'"'),field+' missing');
 assert.match(html,/700000/);
 assert.match(html,/data-remove-venue-quote/);
});

test('in-place editing persists to protected database and keeps validation',()=>{
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(source,/admin\/records\?collection=venues/);
 assert.match(source,/X-CSRF-Token/);
 assert.match(source,/buildInlineFieldEditor/);
 assert.match(source,/buildInlineQuoteEditor/);
 assert.match(source,/updateInlineOverrides/);
 assert.match(source,/commitInlineChanges/);
 assert.match(source,/queueVenuePersist/);
 assert.match(source,/showAdminToast\('Не сохранено/);
 assert.doesNotMatch(source,/page\.prepend\(alert\)/);
 assert.match(source,/select\[data-inline-control\]/);
 assert.doesNotMatch(source,/function collectVenueEdit/);
});

test('responsive CSS uses full workspace without duplicate edit form',()=>{
 const base=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/venue-detail-ui.css',import.meta.url),'utf8');
 assert.match(base,/\.admin-content\{width:100%;max-width:none/);
 assert.match(css,/container-type:inline-size/);
 assert.match(css,/\.vdp-inline:hover/);
 assert.match(css,/\.vdp-inline-form\{/);
 assert.match(css,/\.vdp-date-editable\{/);
 assert.match(css,/@container\(max-width:520px\)/);
});
