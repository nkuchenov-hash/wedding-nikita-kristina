import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const gateway=readFileSync(new URL('../tools/admin-gateway.php',import.meta.url),'utf8');
const script=gateway.match(/<script id="login-auto-theme">([^]*?)<\/script>/)?.[1];
test('login follows local device time at all day/night boundaries and changes while open',()=>{
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
 for(const [h,expected] of [[20,true],[23,true],[0,true],[6,true],[7,false],[12,false],[19,false]]){
  hour=h;refresh();assert.equal(night,expected,'local hour '+h);
 }
 hour=0;listeners.visibilitychange();assert.equal(night,true);
 hour=9;listeners.pageshow();assert.equal(night,false);
});
test('night palette and system dark palette match; no manual login control',()=>{
 const system=gateway.match(/@media \(prefers-color-scheme: dark\)\{:root\{([^}]+)\}\}/)?.[1];
 const night=gateway.match(/:root\[data-login-night\]\{([^}]+)\}/)?.[1];
 assert.ok(system);assert.equal(night,system);
 assert.doesNotMatch(gateway,/id="login-theme"/);
 assert.doesNotMatch(script,/localStorage/);
});
