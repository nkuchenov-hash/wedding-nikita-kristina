import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const gateway=readFileSync(new URL('../tools/admin-gateway.php',import.meta.url),'utf8');
const script=gateway.match(/<script id="login-auto-theme">([^]*?)<\/script>/)?.[1];
test('login automatically follows local time, not the OS theme',()=>{
 assert.ok(script);
 let hour=19,night=null,refresh;
 const listeners={};
 runInNewContext(script,{
  Date:class{getHours(){return hour}},
  document:{documentElement:{toggleAttribute(name,value){assert.equal(name,'data-login-night');night=value}},addEventListener(name,fn){listeners[name]=fn}},
  window:{addEventListener(name,fn){listeners[name]=fn}},
  setInterval(fn,ms){assert.equal(ms,15000);refresh=fn}
 });
 assert.equal(night,false);
 for(const [h,expected] of [[20,true],[23,true],[0,true],[6,true],[7,false],[12,false],[19,false]]){hour=h;refresh();assert.equal(night,expected)}
 hour=0;listeners.visibilitychange();assert.equal(night,true);
 hour=9;listeners.pageshow();assert.equal(night,false);
 assert.match(gateway,/name="color-scheme" content="light dark"/);
 assert.match(gateway,/:root\[data-login-night\]\{color-scheme:dark/);
 assert.doesNotMatch(gateway,/prefers-color-scheme: dark|id="login-theme"/);
 assert.match(gateway,/class="login-art-top"/);
 assert.match(gateway,/class="login-art-bottom"/);
 assert.match(gateway,/name="username" value="wedding-admin" autocomplete="username"/);
 assert.match(gateway,/name="password" type="password" autocomplete="current-password"/);
 assert.match(gateway,/button\[type=submit\]/);
 assert.match(gateway,/refresh_login_csrf=1/);
});
test('desktop login uses a two-column layout while mobile keeps the vertical artwork',()=>{
 assert.match(gateway,/@media\(min-width:700px\)\{[^]*?grid-template-columns:minmax\(0,43fr\) minmax\(0,57fr\)/);
 assert.match(gateway,/\.login-art-top\{height:auto;[^}]*background-size:contain/);
 assert.match(gateway,/\.login-art-bottom\{display:none\}/);
 assert.match(gateway,/@media\(max-width:500px\)/);
});
