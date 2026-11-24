import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {themeAdminStyles,darkAdminVariables,darkColor} from '../tools/admin-dark-theme.mjs';
test('admin palette keeps light fallbacks and darkens backgrounds without changing layout',()=>{
 const tokens=new Map();
 const result=themeAdminStyles('.panel{background:#fff;color:#214734;border:1px solid #dce6dd;width:42px} @media(max-width:600px){.panel{background:rgba(255,255,255,.97)}}',tokens);
 assert.match(result,/var\(--admin-dark-surface-fff,#fff\)/);
 assert.match(result,/var\(--admin-dark-text-214734,#214734\)/);
 assert.match(result,/width:42px/);
 assert.match(result,/@media\(max-width:600px\)/);
 assert.match(darkAdminVariables(tokens),/html\[data-admin-theme="dark"\]/);
 assert.notEqual(darkColor('#fff','surface'),'#ffffff');
 assert.equal(darkColor('#fff','text'),'#ffffff');
 assert.equal(themeAdminStyles('.a{background:url("x.svg#abc");color:red}'),'.a{background:url("x.svg#abc");color:red}');
});
test('all private admin styles receive palette and persistent control is wired before first paint',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const build=read('tools/prepare-admin-release.mjs'),app=read('src/admin-app.js');
 assert.match(build,/required\.filter\(n=>n\.endsWith\('\.css'\)\)/);
 assert.match(build,/themeAdminStyles/);
 assert.match(build,/wedding-admin-theme/);
 assert.match(app,/localStorage\.setItem\(themeKey,themePreference\)/);
 assert.match(app,/applyAdminTheme\(\)/);
 assert.match(app,/id="admin-theme-toggle"/);
});
