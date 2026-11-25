import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
test('compact chronology has handle-free long press, scrolling and valid time anchors',()=>{
 const js=read('admin-program.js'),css=read('admin-heading.css');
 assert.match(js,/setTimeout\(arm,340\)/);
 assert.match(js,/touchmove/);
 assert.match(js,/if\(state\.armed&&e\.cancelable\)e\.preventDefault\(\)/);
 assert.match(js,/data(?:set)\.activityId/);
 assert.match(js,/requestAnimationFrame\(auto\)/);
 assert.doesNotMatch(js,/node\.append\(mobileDrag\)/);
 assert.match(css,/\.ad-tl-chronology-card[^}]*height:auto!important/);
});
test('mobile venue list scrolls normally and guest name keeps title scale',()=>{
 const css=read('admin-heading.css'),app=read('admin-app.js');
 assert.match(css,/\.vw-page\.vw-control-board \.vw-scroll\{height:auto;max-height:none;overflow:visible;touch-action:pan-y/);
 assert.match(css,/\.ad-gb-panel \.ad-gb-title-input\{font:400 30px/);
 assert.match(app,/document\.documentElement\.style\.overflow=''/);
});
