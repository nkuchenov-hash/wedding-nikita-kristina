import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assignedDay,scheduled,itemTags,parallelEventLayout,snapToFive,MINUTE_PX} from '../src/admin-program.js';

const source=readFileSync(new URL('../src/admin-program.js',import.meta.url),'utf8');
const schema=readFileSync(new URL('../backend/schema.sql',import.meta.url),'utf8');
const migrate=readFileSync(new URL('../backend/bin/migrate.php',import.meta.url),'utf8');
const api=readFileSync(new URL('../backend/src/api.php',import.meta.url),'utf8');

test('each idea and scheduled activity belongs to one wedding day',()=>{
 assert.equal(assignedDay({activity_date:'2027-06-17',stage:'idea',start_at:null}),'2027-06-17');
 assert.equal(assignedDay({activity_date:'2027-06-18',stage:'idea',start_at:null}),'2027-06-18');
 assert.equal(assignedDay({activity_date:'2027-06-19',stage:'idea',start_at:null}),'2027-06-19');
 assert.equal(assignedDay({activity_date:'2027-06-17',stage:'program',start_at:'2027-06-17T14:00:00'}),'2027-06-17');
 assert.equal(assignedDay({activity_date:'2027-06-18',stage:'program',start_at:'2027-06-18T15:00:00'}),'2027-06-18');
 assert.equal(assignedDay({stage:'program',start_at:'2027-06-19T18:00:00'}),'2027-06-19');
 assert.equal(assignedDay({stage:'idea',start_at:'2027-06-17'}),'2027-06-17');
 assert.equal(assignedDay({stage:'idea',start_at:null}),'2027-06-19');
 assert.match(schema,/activity_date TEXT NOT NULL DEFAULT '2027-06-19'/);
 assert.match(migrate,/ADD COLUMN activity_date/);
 assert.match(migrate,/WHERE stage='idea' AND \(activity_date='' OR activity_date IS NULL\)/);
});

test('ideas are not scheduled just because a day was assigned',()=>{
 assert.equal(scheduled({activity_date:'2027-06-19',stage:'idea',start_at:null}),false);
 assert.equal(scheduled({activity_date:'2027-06-19',stage:'idea',start_at:'2027-06-19'}),false);
 assert.equal(scheduled({activity_date:'2027-06-19',stage:'program',start_at:'2027-06-19T19:00:00'}),true);
});
test('tags are stored as arrays on activity cards and are independently editable',()=>{
 assert.deepEqual(itemTags({tags_json:'["welcome","host"]'}),['welcome','host']);
 assert.deepEqual(itemTags({tags_json:'not-json'}),[]);
 assert.deepEqual(itemTags({}),[]);
 assert.match(api,/activity_tags/);
 assert.match(api,/tags_json/);
 assert.match(source,/itemTags\(e\)\.includes\(filter\)/);
});
test('the day is primary navigation with program and idea sub-tabs',()=>{
 assert.match(source,/const daysBar=\$\('nav','ad-tl-day-nav'\)/);
 assert.match(source,/host\.append\(daysBar\);\s*const nav=/);
 assert.match(source,/\['program','Программа'/);
 assert.match(source,/\['idea','Пул идей'/);
 assert.match(source,/assignedDay\(e\)===day&&\(which==='program'\?scheduled\(e\):!scheduled\(e\)\)/);
 assert.match(source,/id==='program'\?scheduled\(e\):!scheduled\(e\)/);
 assert.match(source,/activity_date:chosenDay/);
 assert.match(source,/const chosenDay=item\?assignedDay\(item\):day/);
 assert.doesNotMatch(source,/targetDay/);
 assert.doesNotMatch(source,/dayField/);
 assert.doesNotMatch(source,/День мероприятия/);
 assert.match(source,/field\('Начало',start\)/);
 assert.match(source,/field\('Окончание',end\)/);
 assert.match(source,/card\(item,rows\)/);
 assert.match(source,/openCard\(item\)/);
 assert.doesNotMatch(source,/Общий пул идей/);
 assert.doesNotMatch(source,/field\('Место/);
 assert.doesNotMatch(source,/Нажмите, чтобы изменить или включить в программу/);
 assert.doesNotMatch(source,/ad-tl-card-hint/);
});

test('program page omits redundant admin bar and explanatory header text',()=>{
 const app=readFileSync(new URL('../src/admin-app.js',import.meta.url),'utf8');
 assert.match(app,/active==='schedule'\?'':/);
 assert.match(source,/\$\('h1','','Программа мероприятия'\)/);
 assert.doesNotMatch(source,/СВАДЬБА · СЦЕНАРИЙ/);
 assert.doesNotMatch(source,/Выберите день, затем откройте его программу/);
});

test('simultaneous events receive separate lanes; sequential events stay full width',()=>{
 const entries=[
  {id:'welcome',start_at:'2027-06-19T13:00:00',end_at:'2027-06-19T14:00:00'},
  {id:'photos',start_at:'2027-06-19T13:30:00',end_at:'2027-06-19T14:15:00'},
  {id:'speech',start_at:'2027-06-19T14:30:00',end_at:'2027-06-19T15:00:00'}
 ];
 const layout=parallelEventLayout(entries);
 assert.equal(layout.length,3);
 const byId=Object.fromEntries(layout.map(x=>[x.id,x]));
 assert.equal(byId.welcome.laneCount,2);
 assert.equal(byId.photos.laneCount,2);
 assert.notEqual(byId.welcome.lane,byId.photos.lane);
 assert.equal(byId.speech.laneCount,1);
 assert.equal(byId.speech.lane,0);
});
test('triple parallel events have 3 lanes and time sizing is proportional to minutes',()=>{
 const layout=parallelEventLayout([
  {id:'one',start_at:'2027-06-19T16:00:00',duration_min:60},
  {id:'two',start_at:'2027-06-19T16:05:00',duration_min:30},
  {id:'three',start_at:'2027-06-19T16:15:00',duration_min:15}
 ]);
 assert.deepEqual(layout.map(x=>x.laneCount),[3,3,3]);
 assert.deepEqual(layout.map(x=>x.lane).sort(),[0,1,2]);
 assert.equal(MINUTE_PX*30,90);
 assert.equal(MINUTE_PX*60,180);
 assert.equal(snapToFive(29),30);
 assert.equal(snapToFive(32),30);
});
test('calendar supports vertical time dragging, bottom-edge resizing and manual concurrency',()=>{
 assert.match(source,/attachTimelineHandles/);
 assert.match(source,/setTimeout\(\(\)=>arm\(state\),230\)/);
 assert.match(source,/baseLength/);
 assert.doesNotMatch(source,/ad-tl-move-grip/);
 assert.doesNotMatch(source,/ad-tl-resize-grip/);
 assert.match(source,/pointerdown/);
 assert.match(source,/pointermove/);
 assert.match(source,/pointerup/);
 assert.match(source,/admin\/schedule\/slot/);
 assert.doesNotMatch(source,/Параллельно с/);
 assert.doesNotMatch(source,/parallelField/);
 assert.match(source,/parallelEventLayout/);
 assert.doesNotMatch(source,/Время пересекается с/);
 assert.match(api,/admin\/schedule\/slot/);
 assert.match(api,/duration_min=\?,sort_order=\?,gap_before_min=0/);
});

test('activity editor uses title, visual tag chips and program switch; global settings manages tags',()=>{
 const settings=readFileSync(new URL('../src/admin-settings.js',import.meta.url),'utf8');
 const dataUi=readFileSync(new URL('../src/admin-data-ui.js',import.meta.url),'utf8');
 const sidebar=readFileSync(new URL('../src/data.js',import.meta.url),'utf8');
 const gateway=readFileSync(new URL('../tools/admin-gateway.php',import.meta.url),'utf8');
 const release=readFileSync(new URL('../tools/prepare-admin-release.mjs',import.meta.url),'utf8');
 assert.match(source,/ad-tl-editor-title/);
 assert.match(source,/ad-tl-editor-pencil/);
 assert.doesNotMatch(source,/Карточка активности/);
 assert.match(source,/ad-tl-tag-select/);
 assert.match(source,/aria-pressed/);
 assert.doesNotMatch(source,/tagBox\.querySelectorAll\('input:checked'\)/);
 assert.doesNotMatch(source,/Управлять тегами/);
 assert.doesNotMatch(source,/У идеи есть длительность/);
 assert.match(source,/placement\.type='checkbox'/);
 assert.match(source,/placement\.setAttribute\('role','switch'\)/);
 assert.match(source,/Включить в программу/);
 assert.match(source,/Включено в программу/);
 assert.match(source,/placement\.setAttribute\('aria-label',switchCaption\(enabled\)\)/);
 assert.match(source,/ad-tl-time-row/);
 assert.match(source,/timeRow\.append\(startField,endField\)/);
 assert.match(source,/timeRow\.classList\.toggle\('is-inactive',!enabled\)/);
 const css=readFileSync(new URL('../src/admin-program.css',import.meta.url),'utf8');
 assert.match(css,/ad-tl-time-row\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.ad-tl-time-row\.is-inactive\{visibility:hidden/);
 assert.match(css,/\.ad-tl-placement-toggle\{[^}]*grid-template-columns:46px/);
 assert.doesNotMatch(source,/placement\.value==='program'/);
 assert.match(settings,/renderWeddingSettings/);
 assert.match(settings,/activity_tags/);
 assert.match(settings,/activity_types/);
 assert.match(dataUi,/section==='settings'/);
 assert.match(sidebar,/id:'settings'/);
 assert.match(gateway,/src\/admin-settings\.js/);
 assert.match(release,/admin-settings\.js/);
});
