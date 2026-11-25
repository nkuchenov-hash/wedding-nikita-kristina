import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
test('touch dragging has a dedicated gesture target and follows scrolled timeline coordinates',()=>{
 const js=read('admin-program.js'),css=read('admin-heading.css');
 assert.match(js,/if\(touch&&!moveHandle&&!resizeHandle\)return/);
 assert.match(js,/pointerMinuteDelta\(y-state.initialY,scrollDelta,state.scale\)/);
 assert.match(js,/requestAnimationFrame\(autoScroll\)/);
 assert.match(css,/\.ad-tl-calendar-card\{touch-action:pan-y/);
 assert.match(css,/\.ad-tl-touch-move\{[^}]*touch-action:none/);
});
test('mobile venue list scrolls normally and guest name keeps title scale',()=>{
 const css=read('admin-heading.css'),app=read('admin-app.js');
 assert.match(css,/\.vw-page\.vw-control-board \.vw-scroll\{height:auto;max-height:none;overflow:visible;touch-action:pan-y/);
 assert.match(css,/\.ad-gb-panel \.ad-gb-title-input\{font:400 30px/);
 assert.match(app,/document\.documentElement\.style\.overflow=''/);
});
