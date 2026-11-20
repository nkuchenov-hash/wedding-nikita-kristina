import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assignedDay,scheduled,itemTags,parallelEventLayout,snapToFive,MINUTE_PX,cardDescription,cardColorStyle,cardTagColors,DEFAULT_DAY_HOURS,displayHoursForDay} from '../src/admin-program.js';

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
 assert.match(source,/const sectionControls=\$\('div','ad-tl-section-controls'\)/);
 assert.match(source,/sectionControls\.append\(daysBar,nav\)/);
 assert.match(source,/host\.append\(sectionControls\)/);
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
 assert.doesNotMatch(app,/admin-topbar/);
  assert.match(app,/admin-page-heading/);
  assert.match(source,/ad-tl-header admin-page-heading/);
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
 assert.equal(MINUTE_PX*30,180);
 assert.equal(MINUTE_PX*60,360);
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
 assert.doesNotMatch(settings,/activity_types/);
 assert.doesNotMatch(settings,/Категории/);
 assert.doesNotMatch(source,/field\('Категория'/);
 assert.doesNotMatch(source,/field\('Название'/);
 assert.match(source,/ad-tl-editor-title-input/);
 assert.match(source,/name\.setAttribute\('form',form\.id\)/);
 assert.match(dataUi,/section==='settings'/);
 assert.match(sidebar,/id:'settings'/);
 assert.match(gateway,/src\/admin-settings\.js/);
 assert.match(release,/admin-settings\.js/);
});


test('timeline cards present time once, large titles and a single row of actual tags',()=>{
 assert.equal(cardDescription({notes:'Предложенный тайминг: 13:00–14:00.\nВстреча гостей'},true),'Встреча гостей');
 assert.equal(cardDescription({notes:'Предложенный тайминг: 13:00–14:00.\nВстреча гостей'},false),'Предложенный тайминг: 13:00–14:00.\nВстреча гостей');
 assert.equal(cardDescription({notes:'Обычная заметка'},true),'Обычная заметка');
 assert.match(source,/const cardHead=\$\('div','ad-tl-card-head'\)/);
 assert.match(source,/cardHead\.append\(lengthLabel\)/);
 assert.doesNotMatch(source,/ad-tl-type/);
 assert.doesNotMatch(source,/ad-tl-card-eyebrow/);
 assert.match(source,/ad-tl-short-event/);
 assert.match(source,/ad-tl-micro-event/);
 const css=readFileSync(new URL('../src/admin-program.css',import.meta.url),'utf8');
 assert.match(css,/\.ad-tl-calendar-card \.ad-tl-card-title\{font-size:18px!important/);
 assert.match(css,/\.ad-tl-calendar-card \.ad-tl-card-description\{font-size:13\.5px/);
 assert.match(css,/\.ad-tl-calendar-card \.ad-tl-length\{font-size:14px/);
 assert.match(css,/\.ad-tl-calendar-card\.ad-tl-micro-event \.ad-tl-card-title/);
 assert.match(css,/\.ad-tl-calendar-card\.ad-tl-short-event \.ad-tl-card-title/);
 assert.match(css,/\.ad-tl-ideas-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('the first selected tag alone sets the card color and additional tags remain labels',()=>{
 const item={tags_json:JSON.stringify(['photo','welcome','photo'])};
 const tags=[{id:'photo',label:'Фото',color:'#AABBCC'},
             {id:'welcome',label:'Встреча',color:'#DDEEFF'}];
 assert.deepEqual(cardTagColors(item,tags),['#AABBCC','#DDEEFF']);
 const painted=cardColorStyle(item,tags);
 assert.equal(painted.primary,'#AABBCC');
 assert.deepEqual(painted,{primary:'#AABBCC'});
 assert.equal('stripe' in painted,false);
 const changed=cardColorStyle(item,[{...tags[0],color:'#102030'},tags[1]]);
 assert.equal(changed.primary,'#102030');
 assert.notEqual(changed.primary,painted.primary);
 assert.equal(cardColorStyle({tags_json:'[]'},tags).primary,'#ECF2EC');
 const css=readFileSync(new URL('../src/admin-program.css',import.meta.url),'utf8');
 assert.match(source,/cardColorStyle\(item,tags\)/);
 assert.doesNotMatch(css,/\.ad-tl-card::before\s*\{/);
 assert.doesNotMatch(css,/border-left:5px/);
 assert.doesNotMatch(css,/--activity-stripe/);
 assert.match(css,/\.ad-tl-card\{[\s\S]*?border:1px solid #dce6dd/);
 assert.match(source,/node\.style\.setProperty\('--activity-color',palette\.primary\)/);
 assert.doesNotMatch(source,/node\.style\.setProperty\('--activity-stripe'/);
 assert.match(css,/\.ad-tl-calendar-card\.ad-tl-short-event \.ad-tl-tags-inline,[\s\S]*?display:flex!important/);
 assert.match(css,/\.ad-tl-calendar-card\.ad-tl-has-short-tags\{[\s\S]*?overflow:visible!important/);
 assert.match(css,/color-mix\(in srgb,var\(--activity-color/);
});


test('three independent hour ranges are validated and bound to the selected calendar day',()=>{
 assert.deepEqual(Object.keys(DEFAULT_DAY_HOURS),['2027-06-17','2027-06-18','2027-06-19']);
 assert.deepEqual(displayHoursForDay('2027-06-19'),{from:'12:00',to:'23:00'});
 const custom={
  '2027-06-17':{from:'09:00',to:'17:00'},
  '2027-06-18':{from:'11:30',to:'22:00'},
  '2027-06-19':{from:'13:15',to:'23:30'}
 };
 assert.deepEqual(displayHoursForDay('2027-06-17',custom),custom['2027-06-17']);
 assert.deepEqual(displayHoursForDay('2027-06-18',custom),custom['2027-06-18']);
 assert.deepEqual(displayHoursForDay('2027-06-19',custom),custom['2027-06-19']);
 assert.deepEqual(displayHoursForDay('2027-06-19',{'2027-06-19':{from:'20:00',to:'19:00'}}),DEFAULT_DAY_HOURS['2027-06-19']);
 assert.match(source,/settings\.settings\?\.program_day_hours/);
 assert.match(source,/const interval=displayHoursForDay\(day,dayHours\)/);
 assert.match(source,/visible=layout\.filter\(slot=>slot\.end>axisStart&&slot\.start<axisEnd\)/);
 assert.match(api,/program_day_hours/);
 assert.match(api,/to-\$from<60/);
});
test('the program has list and timeline views, independently from day and idea tabs',()=>{
 assert.match(source,/programDisplay='timeline'/);
 assert.match(source,/\['timeline','Таймлайн'\]/);
 assert.match(source,/\['list','Список'\]/);
 assert.match(source,/if\(programDisplay==='timeline'\)host\.append\(renderTimeline\(visibleRows\)\)/);
 assert.match(source,/ad-tl-program-list/);
 assert.match(source,/view==='program'&&programDisplay==='timeline'/);
 const css=readFileSync(new URL('../src/admin-program.css',import.meta.url),'utf8');
 assert.match(css,/\.ad-tl-display-modes\{/);
 assert.match(css,/\.ad-tl-program-list\{/);
});
test('settings saves daily visible hours, and the left sidebar places settings last',()=>{
 const settings=readFileSync(new URL('../src/admin-settings.js',import.meta.url),'utf8');
 const data=readFileSync(new URL('../src/data.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.match(settings,/Часы отображения программы/);
 assert.match(settings,/Сохранить часы/);
 assert.match(settings,/program_day_hours/);
 assert.match(settings,/input.*type='time'/);
 for(const day of ['2027-06-17','2027-06-18','2027-06-19'])assert.ok(settings.includes(day));
 const list=data.slice(data.indexOf('export const adminModules'));
 assert.ok(list.lastIndexOf("id:'settings'")>list.lastIndexOf("id:'tasks'"));
 assert.match(css,/\.admin-settings-footer/);
 assert.match(css,/height:100dvh/);
 assert.match(css,/overflow:hidden!important;overscroll-behavior:none/);
 assert.match(css,/flex:1 1 0;min-height:0;max-height:46px/);
 assert.match(css,/max-height:100dvh/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/overflow:visible!important;white-space:normal/);
 assert.match(css,/margin-top:auto/);
});


test('header is compact: dates with section tabs, tag strip with view switch',()=>{
 const css=readFileSync(new URL('../src/admin-program.css',import.meta.url),'utf8');
 assert.match(source,/const sectionControls=\$\('div','ad-tl-section-controls'\)/);
 assert.match(source,/sectionControls\.append\(daysBar,nav\)/);
 assert.match(source,/const compactTools=\$\('div','ad-tl-compact-tools'\)/);
 assert.match(source,/compactTools\.append\(filters\)/);
 assert.match(source,/compactTools\.append\(modes\)/);
 assert.match(source,/host\.append\(compactTools\)/);
 assert.match(css,/\.ad-tl-section-controls\{/);
 assert.match(css,/\.ad-tl-compact-tools\{/);
 assert.match(css,/\.ad-tl-compact-tools \.ad-tl-tag-filters\{/);
 assert.match(css,/flex-wrap:nowrap/);
 assert.match(css,/overflow-x:auto;overflow-y:hidden/);
 assert.match(css,/\.ad-timeline-page \.ad-tl-header h1\{/);
});

test('organizer sidebar never scrolls independently and settings stays visible',()=>{
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 const desktop=css.slice(css.indexOf('/* Sidebar is exactly one viewport high.'));
 assert.match(desktop,/height:100vh;height:100dvh;min-height:0;max-height:100dvh/);
 assert.match(desktop,/overflow:hidden!important;overscroll-behavior:none/);
 assert.doesNotMatch(desktop,/overflow-y:auto/);
 assert.doesNotMatch(desktop,/overflow-x:auto/);
 assert.match(desktop,/\.admin-settings-footer\{[\s\S]*?flex:0 0 auto/);
});


test('toolbar groups have their own spacing and independent visual separators',()=>{
 const css=readFileSync(new URL('../src/admin-program.css',import.meta.url),'utf8');
 assert.match(css,/\.ad-timeline-page \.ad-tl-section-controls\{[\s\S]*?column-gap:clamp\(110px,10vw,220px\)/);
 assert.match(css,/\.ad-timeline-page \.ad-tl-compact-tools\{[\s\S]*?column-gap:36px/);
 assert.match(css,/\.ad-timeline-page \.ad-tl-section-controls\{[\s\S]*?margin-bottom:20px/);
 assert.match(css,/\.ad-tl-section-controls \.ad-tl-main-switch::before/);
 assert.match(css,/\.ad-tl-compact-tools \.ad-tl-display-modes::before/);
});
test('program confirmations use the shared transient bottom toast',()=>{
 const notifier=readFileSync(new URL('../src/admin-toast.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.match(source,/showAdminToast\(notification/);
 assert.match(notifier,/document\.body\.append\(node\)/);
 assert.match(notifier,/setTimeout\(\(\)=>\{/);
 assert.match(notifier,/node\.remove\(\)/);
 assert.doesNotMatch(source,/host\.append\(n\)/);
 assert.match(css,/\.ad-global-toast\{/);
 assert.match(css,/bottom:max\(22px,env\(safe-area-inset-bottom\)\)/);
});
