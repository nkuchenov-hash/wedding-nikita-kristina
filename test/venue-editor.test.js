import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderVenueNewPage,renderVenueQuoteEditorRow} from '../src/venue-detail-ui.js';

const venue={
 id:'venue-editor-test',name:'Площадка для проверки',region:'city',
 area:'Санкт-Петербург',capacity:100,visited:true,
 summary:'Сведения о площадке',notes:'Заметки',
 dateAvailability:{'18':'unknown','19':'available','20':'pending'},
 cost:{menu:5500,rent:110000,service:10},
 included:['Банкет'],excluded:['Продление'],questions:['Уточнить бронь'],
 quotes:[{date:'2027-06-19',guests:80,total:700000,kind:'quote',label:'Смета'}],
 ratings:{},extras:{}
};
const ctx=(tab)=>({
 guests:80,ui:{detailTab:tab,photoView:'gallery',photoSection:'all'},
 estimate:()=>({value:700000,partial:false,isQuote:true,note:'Полученная смета'}),
 extraTotal:()=>0,
 dayStatus:(v,d)=>v.dateAvailability[d]||'unknown',
 dayText:(v,d)=>({available:'Свободно',pending:'Уточняется',unknown:'Нет подтверждения',unavailable:'Занято'}[v.dateAvailability[d]]||'Нет подтверждения'),
 weighted:()=>({value:80,complete:6,provisional:true,breakdown:[]})
});

test('venue overview gives clear edit entry points without extra table columns',()=>{
 const html=renderVenueNewPage(venue,ctx('overview'));
 assert.match(html,/vdp-edit-main/);
 assert.match(html,/Редактировать данные и смету/);
 assert.match(html,/Изменить даты/);
 assert.match(html,/Изменить смету/);
 assert.match(html,/vdp-overview-actions/);
 assert.match(html,/Все площадки/);
});

test('editor supports directly changing all substantive venue facts',()=>{
 const html=renderVenueNewPage(venue,ctx('edit'));
 for(const field of ['name','area','region','capacity','capacityNote','visited',
  'summary','notes','date-18','date-19','date-20',
  'cost-menu','cost-rent','cost-technical','cost-extra','cost-service','cost-minSpend',
  'included','excluded','questions','website','drive','photos','quoteSource',
  'contactPhone','contactEmail']){
  assert.ok(html.includes('data-edit-field="'+field+'"'),field+' not editable');
 }
 assert.match(html,/data-venue-edit="venue-editor-test"/);
 assert.match(html,/data-venue-edit-quotes/);
 assert.match(html,/Сохранить изменения/);
 assert.match(html,/Изменения не сохранены/);
});

test('existing offer variants are editable with amount, date and guest count',()=>{
 const html=renderVenueQuoteEditorRow(venue.quotes[0]);
 for(const field of ['guests','total','date','label','kind'])
  assert.ok(html.includes('data-quote-field="'+field+'"'),field+' missing');
 assert.match(html,/700000/);
 assert.match(html,/2027-06-19/);
 assert.match(html,/data-remove-venue-quote/);
});

test('admin venue editing uses protected server DB and visible success/error feedback',()=>{
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(source,/auth\/session/);
 assert.match(source,/admin\/records\?collection=venues/);
 assert.match(source,/details_json/);
 assert.match(source,/wedding_comparison_id/);
 assert.match(source,/queueVenuePersist/);
 assert.match(source,/data-venue-edit-feedback/);
 assert.match(source,/Сервер недоступен/);
 assert.match(source,/Загружаем актуальные данные площадки/);
});

test('CSS uses full admin width with container-aware no-overlap venue cards',()=>{
 const base=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 const detail=readFileSync(new URL('../src/venue-detail-ui.css',import.meta.url),'utf8');
 assert.match(base,/\.admin-content\{width:100%;max-width:none/);
 assert.match(detail,/container-type:inline-size/);
 assert.match(detail,/@container\(max-width:1250px\)/);
 assert.match(detail,/\.vdp-overview-actions\{display:flex;flex-wrap:wrap;gap:12px/);
 assert.match(detail,/\.vdp-budget-header strong\{[^}]*white-space:normal/);
 assert.match(detail,/@container\(max-width:580px\)/);
});
