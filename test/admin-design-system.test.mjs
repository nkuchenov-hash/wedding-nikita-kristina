import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('shared design does not flatten semantic module colors',()=>{
 const build=read('tools/prepare-admin-release.mjs'),css=read('src/admin-heading.css');
 assert.doesNotMatch(build,/unifyAdminPalette\(/);
 assert.match(css,/--pd-bg:#ffffff/);
 assert.match(css,/--wd-accent:#214d35/);
 assert.match(read('src/admin-program.css'),/var\(--activity-color/);
 assert.match(css,/\.pd-hero\{background:linear-gradient[^\n]*data:image\/webp;base64,/);
});
test('dashboard and login use separate high-resolution WebP artwork',()=>{
 const css=read('src/admin-heading.css'),gateway=read('tools/admin-gateway.php');
 const get=s=>s.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/)?.[1];
 const hero=get(css),login=get(gateway);assert.ok(hero&&login);assert.notEqual(hero,login);
 for(const [art,w,h] of [[hero,1600,900],[login,900,1600]]){
  const bytes=Buffer.from(art,'base64');assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.length>65000);assert.equal(bytes.toString('ascii',12,16),'VP8 ');
  assert.ok((bytes.readUInt16LE(26)&0x3fff)>=w);assert.ok((bytes.readUInt16LE(28)&0x3fff)>=h);
 }
});
