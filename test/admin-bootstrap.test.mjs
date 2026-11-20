import test from 'node:test';
import assert from 'node:assert/strict';

// Test the real admin entrypoint, not only JavaScript syntax. A missing named
// ESM export or broken dependency prevents the entire organizer panel rendering.
test('the organizer app starts, shows the navigation and supports every route',async()=>{
 const listeners=new Map();
 const container={
   markup:'',
   set innerHTML(html){this.markup=String(html)},
   get innerHTML(){return this.markup},
   querySelector(){return null}
 };
 globalThis.document={
   querySelector:selector=>selector==='#app'?container:null,
   body:{classList:{add(){}}},
   addEventListener(){},
   visibilityState:'hidden'
 };
 globalThis.window={
   addEventListener:(name,fn)=>listeners.set(name,fn),
   scrollTo(){}
 };
 globalThis.location={
   hash:'#/admin/overview',
   replace(url){this.hash=url}
 };
 await import('../src/admin-app.js?test_bootstrap=1');
 assert.match(container.markup,/class="admin-layout"/);
 assert.match(container.markup,/class="admin-side"/);
 assert.match(container.markup,/Панель организаторов/);
 assert.match(container.markup,/#\/admin\/overview/);
 assert.match(container.markup,/#\/admin\/schedule/);
 assert.match(container.markup,/#\/admin\/settings/);
 assert.match(container.markup,/Никита и Кристина/);
 assert.equal(typeof listeners.get('hashchange'),'function');
 for(const section of ['guests','venues','photos','schedule','settings','budget','menu','tasks','overview']){
   globalThis.location.hash='#/admin/'+section;
   listeners.get('hashchange')();
   assert.match(container.markup,/class="admin-layout"/,section+' layout');
   assert.match(container.markup,/class="admin-side"/,section+' sidebar');
   assert.match(container.markup,/side-link/,section+' navigation');
 }
});
