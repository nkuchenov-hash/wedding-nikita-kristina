import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderVenueAdmin,renderVenueRatingGuide} from '../src/venues.js';
import {RATING_CRITERIA,RATING_MAX,scoreVenue} from '../src/venue-evaluation.js';

test('Archive can be opened by its counter, link, selector, and post-save action',()=>{
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(source,/data-open-archive href="#\/admin\/venues\/archive"/);
 assert.match(source,/archiveRoute=/);
 assert.match(source,/archiveFilter:'archived'/);
 assert.match(source,/t\.dataset\.ui==='archiveFilter'/);
 assert.match(source,/Открыть архив/);
 assert.match(source,/Вернуть из архива/);
 assert.match(source,/commitInlineChanges\(id,next,root\)/);
 assert.match(source,/allRoute=/);
 assert.match(source,/activeRoute=/);
});

test('Rating methodology deep link renders even if protected venue database is not loaded',()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'location');
 try{
  Object.defineProperty(globalThis,'location',{configurable:true,value:{hash:'#/admin/venues/rating-method'}});
  const html=renderVenueAdmin();
  assert.match(html,/Как рассчитывается рейтинг/);
  assert.match(html,/href="#\/admin\/venues"/);
  assert.match(html,/до 650 000 ₽/);
  assert.match(html,/40 баллов/);
  assert.match(html,/Рабочий расчёт с резервами пока не получает баллов/);
  assert.match(html,/Неподтверждённые данные/);
  assert.equal((html.match(/class="vw-method-criterion"/g)||[]).length,RATING_CRITERIA.length);
 }finally{
  if(old)Object.defineProperty(globalThis,'location',old);
  else delete globalThis.location;
 }
});

test('Rating weights and price thresholds match the user-facing methodology',()=>{
 assert.equal(RATING_MAX,100);
 const v={region:'city',capacity:80,dateAvailability:{'18':'unavailable','19':'available','20':'unavailable'},ratings:{
  look:5,comfort:4,food:3,travel:2,terrace:5,terms:4
 }};
 const row=(score,key)=>score.breakdown.find(x=>x.key===key);
 const score=scoreVenue(v,80,{value:650000,isQuote:true,partial:false});
 assert.equal(row(score,'date').value,40);
 assert.equal(row(score,'city').value,10);
 assert.equal(row(score,'capacity').value,10);
 assert.equal(row(score,'cost').value,15);
 assert.equal(row(score,'look').value,6);
 assert.ok(Math.abs(row(score,'comfort').value-2.4)<1e-9);
 for(const [price,expected] of [[650000,15],[800000,12],[1000000,9],[1200000,5],[1200001,0]]){
  const quote=scoreVenue(v,80,{value:price,isQuote:true,partial:false});
  assert.equal(row(quote,'cost').value,expected,'Price '+price);
 }
 const working=scoreVenue(v,80,{value:650000,isQuote:false,partial:true,kind:'planning'});
 assert.equal(row(working,'cost').value,null,'Working budgets must not be scored as received full quotes');
});

test('Main venues list exposes expanded rating formulas inline, not only via navigation',()=>{
 const source=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');
 assert.match(source,/renderVenueRatingGuide\(\)\+\s*'\u003cdiv class="vw-panel vw-table-panel"/);
 const html=renderVenueRatingGuide();
 assert.match(html,/^\u003cdetails class="vw-rating-guide"/);
 assert.match(html,/\u003csummary\u003e/);
 assert.match(html,/Как рассчитывается рейтинг/);
 assert.match(html,/100 баллов/);
 assert.equal((html.match(/class="vw-method-criterion"/g)||[]).length,10);
 assert.match(html,/до 650 000 ₽/);
 assert.match(html,/19 июня подтверждено свободно/);
 assert.match(html,/Рабочий расчёт с резервами пока не получает баллов/);
 assert.match(html,/href="#\/admin\/venues\/rating-method"/);
 assert.match(html,/\u003c\/details\u003e$/);
});
