import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {wedding,adminModules,sampleGuests} from '../src/data.js';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
test('wedding details remain tentative',()=>{assert.equal(wedding.tentative,true);assert.equal(wedding.location,'Марьино');});
test('required organizer modules are present',()=>{
 const ids=new Set(adminModules.map(x=>x.id));
 for(const id of ['guests','budget','venues','photos','tasks','schedule','moderation'])assert.ok(ids.has(id));
 assert.equal(adminModules.length,ids.size);
});
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

test('photo archive is a dedicated protected organizer module',async()=>{
 const {adminModules}=await import('../src/data.js');
 assert.ok(adminModules.some(m=>m.id==='photos'));
 const src=await read('../src/admin-photos.js');
 assert.match(src,/getVenuePhotos/);
 assert.match(src,/ArrowRight/);
 assert.match(src,/photo\.section/);
 const stager=await read('../tools/prepare-admin-release.mjs');
 assert.match(stager,/admin-photos\.js/);
});

test('guest records use authenticated database CRUD without file import UI',async()=>{
 const ui=await read('../src/admin-data-ui.js');
 assert.match(ui,/call\('admin\/guests'\)/);
 assert.match(ui,/call\('admin\/guests',\{method:'POST'/);
 for(const term of ['Импорт гостей','Загрузить CSV','admin/import/guests','documents(host)','section===\'documents\''])
  assert.ok(!ui.includes(term),'Removed UI still references '+term);
});

test('three-day wedding itinerary contains only organizer-confirmed events',async()=>{
 const {weddingDays}=await import('../src/data.js');
 assert.deepEqual(weddingDays.map(day=>day.date),['2027-06-17','2027-06-18','2027-06-19']);
 assert.equal(weddingDays[0].time,'14:00');
 assert.match(weddingDays[0].place,/Марьино/);
 assert.equal(weddingDays[1].time,null);
 assert.equal(weddingDays[2].time,null);
 assert.match(weddingDays[2].place,/Санкт-Петербург/);
 const seed=JSON.parse(await read('../backend/seed/planning.json'));
 assert.deepEqual(seed.schedule.map(e=>e.start_at),['2027-06-17T14:00:00','2027-06-19']);
 assert.equal(seed.schedule[0].place,'Усадьба Марьино');
 assert.equal(seed.schedule[1].title,'Торжественная часть');
 assert.ok(!seed.schedule.some(e=>e.id.startsWith('draft-schedule-')));
 const backend=await read('../backend/bin/seed-planning.php');
 assert.match(backend,/DELETE FROM schedule_items WHERE id=/);
 assert.match(backend,/INSERT OR IGNORE INTO schedule_items\(id,title,start_at,place,notes,is_public,sort_order\)/);
 const admin=await read('../src/admin-data-ui.js');
 assert.match(admin,/async function schedule\(host\)/);
 assert.match(admin,/admin\/records\?collection=schedule_items/);
 assert.match(admin,/section==='schedule'/);
});

test('protected guest roster edits any core field inline and separates relationship to the couple',async()=>{
 const ui=await read('../src/admin-guests.js');
 assert.match(ui,/Кем приходится нам/);
 assert.match(ui,/relation_to_couple/);
 assert.match(ui,/admin\/guest\/fields/);
 assert.match(ui,/ad-gb-expanded-row/);
 assert.match(ui,/admin\/guest\/rsvp/);
 assert.match(ui,/Связи с другими людьми/);
 const schema=await read('../backend/schema.sql');
 assert.match(schema,/relation_to_couple TEXT/);
 assert.match(schema,/response_source TEXT/);
 const api=await read('../backend/src/api.php');
 assert.match(api,/admin\/guest\/fields/);
 assert.match(api,/admin\/guest\/rsvp/);
});

test('all venue documents and quotes are embedded in venue cards, not a separate admin section',async()=>{
 const {adminModules}=await import('../src/data.js');
 assert.ok(!adminModules.some(section=>section.id==='documents'));
 assert.ok(adminModules.some(section=>section.id==='venues'));
 const admin=await read('../src/admin-app.js');
 assert.ok(!admin.includes('activateDocumentArchive'));
 const venue=await read('../src/venue-detail-ui.js');
 assert.match(venue,/\['documents','Документы'\]/);
 assert.match(venue,/data-venue-files/);
 assert.match(venue,/data-venue-files-kind/);
 const renderer=await read('../src/venues.js');
 assert.match(renderer,/hydrateVenueFiles\(root\)/);
 const loader=await read('../src/venue-files-ui.js');
 assert.match(loader,/admin%2Fvenue-files/);
 assert.match(loader,/f\.venue_id===id/);
 const gate=await read('../tools/admin-gateway.php');
 assert.match(gate,/src\/venue-files-ui\.js/);
});


test('wedding budget excludes unaccepted venue quotes and tracks only costs',async()=>{
 const ui=await read('../src/admin-data-ui.js');
 assert.ok(!ui.includes('budgetScenario('));
 assert.ok(!ui.includes('Полученные предложения площадок'));
 assert.match(ui,/Остаток по плану/);
 assert.match(ui,/planned_rub/);
 assert.match(ui,/paid_rub/);
 assert.match(ui,/Альтернативные коммерческие предложения хранятся в карточках площадок/);
 const venue=await read('../src/venue-detail-ui.js');
 assert.match(venue,/Полученные сметы и сценарии/);
});


test('approved comprehensive venue comparison is never overlaid by generic database table',async()=>{
 const admin=await read('../src/admin-app.js');
 const data=await read('../src/admin-data-ui.js');
 const venue=await read('../src/venues.js');
 const css=await read('../src/venues.css');
 assert.match(admin,/if\(active==='venues'\)return renderVenueAdmin\(\)/);
 assert.match(admin,/if\(section==='venues'\)activateVenueAdmin\(app\)/);
 assert.doesNotMatch(data,/collection\(host,'venues'\)/);
 assert.doesNotMatch(data,/supported=\[[^\]]*'venues'/);
 for(const heading of ['Площадка','18 / 19 / 20 июня','Осмотр','Бюджет','Вместимость','Рейтинг'])
   assert.ok(venue.includes(heading),'Missing approved venue comparison column: '+heading);
 assert.match(venue,/vw-table vw-table-sortable/);
 assert.match(venue,/data-sort-col/);
 assert.match(venue,/data-clear-filters/);
 assert.match(venue,/headerSelect\('chosenDay'/);
 assert.match(venue,/selectedCompare\(all\)/);
 assert.match(css,/\.vw-table/);
});


test('venue table has six data columns with no useless actions column or clipped 1150px minimum',async()=>{
 const venue=await read('../src/venues.js');
 const css=await read('../src/venues.css');
 assert.ok(!venue.includes('<th scope="col">Действие</th>'));
 assert.ok(!venue.includes('class="vw-actions"'));
 assert.match(venue,/vw-compare-toggle/);
 assert.match(venue,/vw-name/);
 assert.match(venue,/data-detail/);
 assert.match(venue,/data-compare/);
 assert.match(css,/\.vw-page \.vw-table-sortable\{width:100%;min-width:910px;table-layout:fixed\}/);
 assert.match(css,/\.vw-page \.vw-scroll\{overflow-x:auto/);
});
