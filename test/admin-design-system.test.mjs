import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unifyAdminPalette} from '../tools/admin-design-system.mjs';
test('all protected module palettes use shared whites and greens; semantic red is retained',()=>{
 assert.equal(unifyAdminPalette('.a{background:#f6f7f4;color:#213e2c;border:1px solid #dce8dd}.error{color:#c32232}'),'.a{background:#ffffff;color:#194b30;border:1px solid #dce6dc}.error{color:#c32232}');
 const css=readFileSync(new URL('../src/admin-heading.css',import.meta.url),'utf8');
 assert.match(css,/--wd-bg:#ffffff/);
 assert.match(css,/--wd-accent:#194b30/);
 assert.match(css,/\.ad-tl-chronology-row\{display:grid/);
});
