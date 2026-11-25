import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('all organizer workspaces share the same content width and heading tokens',()=>{
 const css=read('src/admin-heading.css'),ui=read('src/admin-data-ui.js');
 assert.match(css,/--admin-workspace-max:1440px/);
 assert.match(css,/max-width:calc\(var\(--admin-workspace-max\) \+ var\(--admin-workspace-edge\) \* 2\)/);
 assert.match(css,/\.ad-premium,\.ad-overview-dashboard,\.ad-work-dashboard,\.ad-tl-calendar,\.ad-tl-settings-content,\.vw-detail-single,\.vw-method-page/);
 assert.match(css,/--admin-page-title-size:42px/);
 assert.match(ui,/const header=\$\('header','admin-page-heading'\);header.append\(\$\('h1','',heading\)\)/);
 assert.match(css,/--admin-control-height:44px/);
});
test('desktop planning date and program groups stay separate; mobile stacks them',()=>{
 const css=read('src/admin-heading.css'),base=read('src/admin-program.css');
 assert.match(css,/@media\(min-width:901px\)\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) minmax\(0,\.86fr\);[\s\S]*?column-gap:clamp\(44px,9vw,180px\)/);
 assert.match(css,/\.ad-timeline-page \.ad-tl-section-controls\{display:flex;flex-direction:column;gap:8px\}/);
 assert.doesNotMatch(base,/\.ad-tl-section-controls \.ad-tl-day-nav\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\);flex:1 1 100%\}/);
});
