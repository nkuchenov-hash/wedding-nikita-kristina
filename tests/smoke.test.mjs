import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {wedding,adminModules,sampleGuests} from '../src/data.js';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
test('wedding details remain tentative',()=>{assert.equal(wedding.tentative,true);assert.equal(wedding.location,'Марьино');});
test('all required admin modules exist',()=>{const ids=new Set(adminModules.map(x=>x.id));for(const id of ['guests','budget','venues','tasks','documents','schedule'])assert.ok(ids.has(id));for(const id of ['catering','vendors'])assert.ok(!ids.has(id),'deprecated section must not appear: '+id);});
test('no real attendees are seeded',()=>assert.ok(sampleGuests.every(x=>x.isSample)));
test('public shell exposes responsive entry point',async()=>{const html=await read('../index.html');assert.match(html,/viewport/);assert.match(html,/src\/app\.js/);});
test('migration has RLS and private storage',async()=>{const sql=await read('../supabase/migrations/001_initial.sql');assert.match(sql,/enable row level security/);assert.match(sql,/wedding-private.*false/);});
test('admin-only release compiles known assets then unpublishes the guest bundle',async()=>{const yaml=await read('../.github/workflows/pages.yml');assert.match(yaml,/cp src\/admin-app\.js src\/admin-data-ui\.js src\/admin-data\.css/);assert.match(yaml,/node tools\/prepare-admin-release\.mjs/);assert.match(yaml,/--delete --exclude=/);assert.match(yaml,/path: _pages/);assert.doesNotMatch(yaml,/cp -r \. /);});
test('photo-first homepage uses distinct depth layers and placeholder slots',async()=>{const js=await read('../src/app.js');assert.match(js,/hero-photo-stage/);assert.match(js,/depth-subject/);assert.match(js,/data-scroll-welcome/);});
test('guest tab bar uses accessible app navigation',async()=>{const js=await read('../src/app.js');assert.match(js,/aria-current="page"/);assert.match(js,/app-dock/);});

test('editorial guest screens are assembled from photographic sections',async()=>{const ui=await read('../src/editorial.js');for(const token of ['w-hero-photo','w-moment-grid','w-page-top','w-dock','w-rsvp-form','w-botanical'])assert.match(ui,new RegExp(token));});
test('every guest view renders through editorial route, admin stays separate',async()=>{const app=await read('../src/app.js');assert.match(app,/renderGuest\(p\)/);assert.match(app,/p\.startsWith\('\/admin'\)/);});
test('guest editorial code is retained but excluded from live admin release',async()=>{const workflow=await read('../.github/workflows/pages.yml');assert.doesNotMatch(workflow,/cp src\/editorial\.js/);assert.match(workflow,/tools\/prepare-admin-release\.mjs/);});

test('app references the screenshot-matched guest UI',async()=>{const app=await read('../src/app.js');assert.match(app,/from '.\/replica\.js'/);});
test('all screenshot sections have real, separate HTML',async()=>{const ui=await read('../src/replica.js');for(const key of ['r-hero','r-invitation','r-timeline','v2-venue-thumbnails','r-dress-collage','r-rsvp-options','r-masonry','r-map','r-tabs'])assert.ok(ui.includes(key),key);});
test('replica is retained in draft source and withheld from production admin',async()=>{const html=await read('../index.html'),yaml=await read('../.github/workflows/pages.yml');assert.match(html,/src\/replica\.css/);assert.doesNotMatch(yaml,/cp src\/replica\.js/);});

test('protected wedding admin has no development warnings or demo badges',async()=>{
 const ui=await read('../src/admin-app.js');
 const data=await read('../src/admin-data-ui.js');
 for(const text of ['Демо-панель:', 'ДЕМО · БЕЗ БАЗЫ ДАННЫХ','Раздел подготовлен','после настройки backend','Ожидаем референсы','Черновой список','0 проверенных предложений']){
  assert.ok(!ui.includes(text),'Remove obsolete admin copy: '+text);
 }
 assert.ok(!ui.includes('class="admin-warning"'),'No yellow admin warning band');
 assert.ok(!ui.includes('class="demo-badge"'),'No demo badge');
 assert.ok(!data.includes('Серверная база подготовлена, но онлайн-доступ'),'No offline technical filler');
 assert.ok(ui.includes('venueSummary.total'),'Venue dashboard must use real recorded data');
 const detail=await read('../src/venue-detail-ui.js');
 assert.ok(!detail.includes('Пока без серверной авторизации'),'Remove obsolete publicly-accessible banner');
 assert.ok(!detail.includes('Для общей синхронизации необходим сервер'),'No future-implementation copy');
 const workflow=await read('../.github/workflows/pages.yml');
 assert.match(workflow,/Deploy to REG\.RU via SSH/);
 assert.match(workflow,/admin-gateway\.php/);
});

test('removed sections have no admin navigation or reachable content routes',async()=>{
 const app=await read('../src/admin-app.js');
 const ui=await read('../src/admin-data-ui.js');
 assert.doesNotMatch(app,/adminCatering|active==='catering'/);
 assert.match(app,/adminModules.some\(m=>m.id===section\)/);
 assert.doesNotMatch(ui,/vendors:'vendors'|catering:'vendors'/);
 assert.doesNotMatch(ui,/supported=\[[^\]]*'catering'/);
});
