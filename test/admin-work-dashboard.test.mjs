import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dashboardTasks,taskIsOpen,dashboardProgress} from '../src/admin-data-ui.js';
const read=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
test('dashboard task status and deadline derive from live records',()=>{
 const rows=dashboardTasks([{id:'a',status:'done'},{id:'b',status:'open',title:'B',due_at:'2027-01-01'},{id:'c',status:'open',title:'C'},{id:'d',status:'cancelled'}],'2027-01-02');
 assert.deepEqual(rows.map(x=>[x.id,x.overdue]),[['b',true],['c',false]]);
 assert.equal(taskIsOpen({status:'completed'}),false);
});
test('dashboard links to actual records and writes through same task collection',()=>{
 const source=read('admin-data-ui.js'),guest=read('admin-guests.js'),venue=read('venues.js'),program=read('admin-program.js');
 assert.match(source,/collection:'tasks',id:task.id,fields:\{status:'done'\}/);
 assert.match(source,/loadVenueDashboard\(host\)/);
 assert.match(source,/call\('admin\/records\?collection=schedule_items'\)/);
 assert.match(guest,/route\[4\]==='unsent'/);
 assert.match(venue,/availableRoute/);
 assert.match(program,/day=route\[3\]/);
 assert.doesNotMatch(source,/VENUE_RECORDS|ad-overview-plan-day/);
});

test('premium dashboard uses real tasks and excludes cancelled work from progress',()=>{
 assert.deepEqual(dashboardProgress([{status:'done'},{status:'open'},{status:'cancelled'}]),{done:1,total:2,percent:50});
 assert.deepEqual(dashboardProgress([]),{done:0,total:0,percent:0});
 const source=read('admin-data-ui.js'),css=read('admin-heading.css');
 assert.match(source,/call\('admin\/guests\/revision'\)/);
 assert.match(source,/dashboard_activity/);
 assert.match(source,/call\('admin\/settings'\)/);
 assert.match(css,/\.pd-hero\{background:linear-gradient[^\n]*data:image\/webp;base64,/);
 assert.doesNotMatch(source,/wedding-demo-done|Демонстрационная запись/);
});
