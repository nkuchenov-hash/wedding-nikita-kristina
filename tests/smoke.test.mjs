import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {wedding,adminModules,sampleGuests} from '../src/data.js';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
test('wedding details remain tentative',()=>{assert.equal(wedding.tentative,true);assert.match(wedding.location,/Марьино/);assert.match(wedding.location,/Санкт-Петербург/);});
test('required organizer modules are present',()=>{
 const ids=new Set(adminModules.map(x=>x.id));
 for(const id of ['guests','budget','venues','photos','tasks','schedule'])assert.ok(ids.has(id));
 assert.equal(adminModules.filter(x=>x.id==='photos').length,1);
 assert.ok(!ids.has('moderation'),'No second photo or moderation section allowed');
 assert.equal(adminModules.length,ids.size);
});
test('no real attendees are seeded',()=>assert.ok(sampleGuests.every(x=>x.isSample)));
test('public shell exposes responsive entry point',async()=>{const html=await read('../index.html');assert.match(html,/viewport/);assert.match(html,/src\/app\.js/);});
test('migration has RLS and private storage',async()=>{const sql=await read('../supabase/migrations/001_initial.sql');assert.match(sql,/enable row level security/);assert.match(sql,/wedding-private.*false/);});
test('admin-only release compiles known assets then unpublishes the guest bundle',async()=>{const yaml=await read('../.github/workflows/pages.yml');assert.match(yaml,/cp src\/admin-app\.js src\/admin-toast\.js src\/admin-data-ui\.js src\/admin-data\.css/);assert.match(yaml,/node tools\/prepare-admin-release\.mjs/);assert.match(yaml,/--delete --exclude=/);assert.match(yaml,/path: _pages/);assert.doesNotMatch(yaml,/cp -r \. /);});
test('photo-first homepage uses distinct depth layers and placeholder slots',async()=>{const js=await read('../src/app.js');assert.match(js,/hero-photo-stage/);assert.match(js,/depth-subject/);assert.match(js,/data-scroll-welcome/);});
test('guest tab bar uses accessible app navigation',async()=>{const js=await read('../src/app.js');assert.match(js,/aria-current="page"/);assert.match(js,/app-dock/);});

test('editorial guest screens are assembled from photographic sections',async()=>{const ui=await read('../src/editorial.js');for(const token of ['w-hero-photo','w-moment-grid','w-page-top','w-dock','w-rsvp-form','w-botanical'])assert.match(ui,new RegExp(token));});
test('every guest view renders through editorial route, admin stays separate',async()=>{const app=await read('../src/app.js');assert.match(app,/renderGuest\(p\)/);assert.match(app,/p\.startsWith\('\/admin'\)/);});
test('guest editorial code is retained but excluded from live admin release',async()=>{const workflow=await read('../.github/workflows/pages.yml');assert.doesNotMatch(workflow,/cp src\/editorial\.js/);assert.match(workflow,/tools\/prepare-admin-release\.mjs/);});

test('app references the screenshot-matched guest UI',async()=>{const app=await read('../src/app.js');assert.match(app,/from '.\/replica\.js'/);});
test('all screenshot sections have real, separate HTML',async()=>{const ui=await read('../src/replica.js');for(const key of ['r-hero','r-invitation','r-schedule','v2-venue-thumbnails','r-dress-collage','r-rsvp-options','r-masonry','r-map','r-tabs'])assert.ok(ui.includes(key),key);});
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

test('one protected gallery only: pair, registration, approved programme places, Petersburg and activities',async()=>{
 const {adminModules}=await import('../src/data.js');
 const sections=adminModules.filter(x=>x.id==='photos'||x.id==='moderation'||/фото/i.test(x.label));
 assert.deepEqual(sections.map(x=>x.id),['photos']);
 const src=await read('../src/admin-photos.js');
 assert.match(src,/GUEST_PHOTO_CATEGORIES/);
 assert.match(src,/admin\/gallery/);
 assert.match(src,/Наши фотографии/);
 assert.match(src,/места регистрации/);
 assert.match(src,/Петербург/);
 assert.match(src,/развлечений/);
 assert.doesNotMatch(src,/getVenuePhotos/);
 const app=await read('../src/admin-app.js');
 assert.match(app,/section==='moderation'.*#\/admin\/photos/);
 const data=await read('../src/admin-data-ui.js');
 assert.doesNotMatch(data,/async function moderation\(/);
 assert.doesNotMatch(data,/section==='moderation'/);
 const stager=await read('../tools/prepare-admin-release.mjs');
 assert.match(stager,/admin-photos\.js/);
});

test('guest records use authenticated database CRUD without file import UI',async()=>{
 const ui=await read('../src/admin-guests.js');
 assert.match(ui,/request\('admin\/guests'\)/);
 assert.match(ui,/request\('admin\/guests',\{method:'POST'/);
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
 assert.match(backend,/INSERT OR IGNORE INTO schedule_items\(id,title,start_at,place,notes,is_public,sort_order,stage,activity_type,duration_min,activity_date\)/);
 const admin=await read('../src/admin-data-ui.js');
 const program=await read('../src/admin-program.js');
 assert.match(admin,/renderWeddingProgram\(host,call,weddingDays,PUBLIC_VENUES\)/);
 assert.match(admin,/section==='schedule'/);
 assert.match(program,/admin\/records\?collection=schedule_items/);
 assert.match(program,/admin\/schedule\/slot/);
 assert.match(program,/pointerdown/);
 assert.match(program,/parallelEventLayout/);
 assert.match(program,/ad-tl-resizing/);
 assert.match(program,/230/);
 assert.match(program,/ad-tl-tag-select/);
 assert.match(program,/activity_tags/);
 assert.match(program,/tags_json/);
 assert.match(program,/startField,endField/);
 assert.match(program,/openCard\(item\)/);
 assert.doesNotMatch(program,/field\('Место/);
 const schema=await read('../backend/schema.sql');
 assert.match(schema,/activity_date TEXT/);
 assert.match(schema,/tags_json TEXT/);
});

test('protected guest roster edits any core field inline and separates relationship to the couple',async()=>{
 const ui=await read('../src/admin-guests.js');
 assert.match(ui,/Кем приходится/);
 assert.match(ui,/relation_to_couple/);
 assert.match(ui,/admin\/guest\/fields/);
 assert.match(ui,/ad-gb-panel/);
 assert.match(ui,/admin\/guest\/rsvp/);
 assert.match(ui,/Семья и сопровождающие/);
 assert.match(ui,/ad-gb-relations/);
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
 assert.match(venue,/headerSelect\('dateFilter','Доступность по дате'/);
 assert.doesNotMatch(venue,/selectedCompare\(all\)/);
 assert.match(css,/\.vw-table/);
});


test('venue table has six data columns with no useless actions column or clipped 1150px minimum',async()=>{
 const venue=await read('../src/venues.js');
 const css=await read('../src/venues.css');
 assert.ok(!venue.includes('<th scope="col">Действие</th>'));
 assert.ok(!venue.includes('class="vw-actions"'));
 assert.doesNotMatch(venue,/vw-compare-toggle/);
 assert.match(venue,/vw-name/);
 assert.match(venue,/data-detail/);
 assert.doesNotMatch(venue,/data-compare/);
 assert.match(css,/\.vw-page \.vw-table-sortable\{width:100%;min-width:910px;table-layout:fixed\}/);
 assert.match(css,/\.vw-page \.vw-scroll\{overflow-x:auto/);
});

test('venue page stays a single detailed table with no import, export, comparison, material or adjustable-weights widget',async()=>{
 const ui=await read('../src/venues.js');
 for(const forbidden of ['Импорт правок','Экспорт правок','Сравнить рядом','Все материалы','Со сметой','С фото','data-export','data-import','data-compare','data-weight','selectedCompare(']){
   assert.ok(!ui.includes(forbidden),'Unexpected venue clutter: '+forbidden);
 }
 assert.match(ui,/data-state="guestCount"/);
 assert.match(ui,/type="number"/);
 assert.match(ui,/scoreVenue/);
 const build=await read('../tools/prepare-admin-release.mjs');
 assert.match(build,/venue-evaluation\.js/);
 const gate=await read('../tools/admin-gateway.php');
 assert.match(gate,/src\/venue-evaluation\.js/);
});
test('wedding venue scoring is traceable and stays tentative for missing evidence',async()=>{
 const {estimateVenue,scoreVenue,RATING_CRITERIA}=await import('../src/venue-evaluation.js');
 const sum=RATING_CRITERIA.reduce((n,x)=>n+x[2],0);
 assert.equal(sum,100);
 const venue={id:'test',region:'country',dateAvailability:{'19':'available'},
   capacity:100,cost:{menu:5000,rent:120000,service:10},ratings:{}};
 const eighty=estimateVenue(venue,80),ninety=estimateVenue(venue,90);
 assert.equal(eighty.value,560000);
 assert.equal(ninety.value,615000);
 assert.ok(ninety.value>eighty.value);
 const rating=scoreVenue(venue,80,eighty);
 assert.equal(rating.breakdown.find(x=>x.key==='date').value,40);
 assert.equal(rating.breakdown.find(x=>x.key==='city').value,0);
 assert.equal(scoreVenue({...venue,region:'city'},80,eighty).breakdown.find(x=>x.key==='city').value,10);
 assert.equal(rating.breakdown.find(x=>x.key==='capacity').value,10);
 assert.equal(rating.provisional,true);
 const alternative={...venue,dateAvailability:{'19':'unavailable','18':'available'}};
 assert.equal(scoreVenue(alternative,80,eighty).breakdown.find(x=>x.key==='date').value,24);
 const unknown={...venue,dateAvailability:{'19':'unknown','18':'unknown','20':'unknown'}};
 assert.equal(scoreVenue(unknown,80,eighty).breakdown.find(x=>x.key==='date').value,null);
});


test('real venue quotes adjust to guest count without converting unsupported extras into confirmed rates',async()=>{
 const {VENUE_RECORDS}=await import('../src/venues-data.js');
 const {estimateVenue,scoreVenue}=await import('../src/venue-evaluation.js');
 const vinity={id:'vinity',region:'city',ratings:{},...(VENUE_RECORDS.vinity||{})};
 const v80=estimateVenue(vinity,80),v90=estimateVenue(vinity,90);
 assert.equal(v80.value,863500);
 assert.ok(v90.value>v80.value);
 assert.equal(v90.partial,true);
 assert.match(v90.note,/предварительн|пересчёт/i);
 const royal={id:'royal',region:'city',ratings:{},...(VENUE_RECORDS.royal||{})};
 const r80=estimateVenue(royal,80),r90=estimateVenue(royal,90),r100=estimateVenue(royal,100);
 assert.equal(r80.value,852165);
 assert.equal(r100.value,1079118);
 assert.ok(r90.value>r80.value&&r90.value<r100.value);
 assert.equal(r90.partial,true);
 const rentOnly={id:'k2',region:'city',ratings:{},capacity:200,cost:{rent:420000},dateAvailability:{'19':'unknown'}};
 const rated=scoreVenue(rentOnly,80,estimateVenue(rentOnly,80));
 assert.equal(rated.breakdown.find(x=>x.key==='cost').value,null);
});
