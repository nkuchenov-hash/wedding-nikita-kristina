import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/venues.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../src/venues.js',import.meta.url),'utf8');

test('rating editor prevents full-width global inputs collapsing the label column',()=>{
 const global=css.indexOf('.vw-page select,.vw-page input:not([type=file]),.vw-page textarea{width:100%');
 const override=css.indexOf('.vw-page .vw-rating-drawer .vw-rating-rule input[type="number"]{');
 assert.ok(global>=0,'generic wide-input selector exists');
 assert.ok(override>global,'the stronger rating input selector must follow global rule');
 const rule=css.slice(override,css.indexOf('}',override));
 assert.match(rule,/width:80px/);
 assert.match(rule,/min-width:80px/);
 assert.match(rule,/max-width:80px/);
 assert.match(css,/\.vw-page \.vw-rating-drawer \.vw-rating-rule\{[^}]*grid-template-columns:minmax\(0,1fr\) 86px/s);
 assert.match(css,/\.vw-page \.vw-rating-drawer \.vw-rating-rule>span\{[^}]*min-width:0/s);
 assert.match(css,/\.vw-page \.vw-rating-drawer-body\{[^}]*overflow-x:clip/s);
});

test('narrow viewport and numeric budgets keep fixed-size inputs with no sideways scrolling',()=>{
 assert.match(css,/@media\(max-width:410px\)\{/);
 assert.match(css,/\.vw-page \.vw-rating-drawer \.vw-rating-rule\.small input\[type="number"\]\{[^}]*width:122px/s);
 assert.match(css,/\.vw-page \.vw-rating-drawer \.vw-rating-rule\.small input\[type="number"\]\{[^}]*width:110px/s);
 assert.match(css,/\.vw-page \.vw-rating-drawer \.vw-rating-price-columns\{[^}]*grid-template-columns:minmax\(0,1fr\)/s);
 assert.match(css,/\.vw-page \.vw-rating-drawer \.vw-rating-check input\[type="checkbox"\]\{[^}]*width:18px/s);
 assert.match(html,/class="vw-rating-drawer"/);
 assert.match(html,/class="vw-rating-rule"/);
 assert.match(html,/data-rating-weight/);
 assert.match(html,/data-rating-limit/);
 assert.match(html,/data-rating-percent/);
 assert.match(html,/data-rating-form/);
});
