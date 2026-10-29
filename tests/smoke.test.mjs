import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {wedding,adminModules,sampleGuests} from '../src/data.js';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
test('wedding details remain tentative',()=>{assert.equal(wedding.tentative,true);assert.equal(wedding.location,'Марьино');});
test('all required admin modules exist',()=>{const ids=new Set(adminModules.map(x=>x.id));for(const id of ['guests','catering','budget','vendors','venues','tasks','documents','schedule'])assert.ok(ids.has(id));});
test('no real attendees are seeded',()=>assert.ok(sampleGuests.every(x=>x.isSample)));
test('public shell exposes responsive entry point',async()=>{const html=await read('../index.html');assert.match(html,/viewport/);assert.match(html,/src\/app\.js/);});
test('migration has RLS and private storage',async()=>{const sql=await read('../supabase/migrations/001_initial.sql');assert.match(sql,/enable row level security/);assert.match(sql,/wedding-private.*false/);});
test('published workflow only copies known static assets',async()=>{const yaml=await read('../.github/workflows/pages.yml');assert.match(yaml,/cp src\/app\.js src\/data\.js src\/styles\.css/);assert.doesNotMatch(yaml,/cp -r \. /);});
test('photo-first homepage uses distinct depth layers and placeholder slots',async()=>{const js=await read('../src/app.js');assert.match(js,/hero-photo-stage/);assert.match(js,/depth-subject/);assert.match(js,/data-scroll-welcome/);});
test('guest tab bar uses accessible app navigation',async()=>{const js=await read('../src/app.js');assert.match(js,/aria-current="page"/);assert.match(js,/app-dock/);});

test('editorial guest screens are assembled from photographic sections',async()=>{const ui=await read('../src/editorial.js');for(const token of ['w-hero-photo','w-moment-grid','w-page-top','w-dock','w-rsvp-form','w-botanical'])assert.match(ui,new RegExp(token));});
test('every guest view renders through editorial route, admin stays separate',async()=>{const app=await read('../src/app.js');assert.match(app,/renderGuest\(p\)/);assert.match(app,/p\.startsWith\('\/admin'\)/);});
test('published site includes visual assets and editorial frontend',async()=>{const workflow=await read('../.github/workflows/pages.yml');assert.match(workflow,/src\/editorial\.js/);assert.match(workflow,/src\/editorial\.css/);});

test('app references the screenshot-matched guest UI',async()=>{const app=await read('../src/app.js');assert.match(app,/from '.\/replica\.js'/);});
test('all screenshot sections have real, separate HTML',async()=>{const ui=await read('../src/replica.js');for(const key of ['r-hero','r-invitation','r-timeline','v2-venue-thumbnails','r-dress-collage','r-rsvp-options','r-masonry','r-map','r-tabs'])assert.ok(ui.includes(key),key);});
test('replica stylesheet is loaded and published',async()=>{const html=await read('../index.html'),yaml=await read('../.github/workflows/pages.yml');assert.match(html,/src\/replica\.css/);assert.match(yaml,/src\/replica\.js src\/replica\.css/);});
