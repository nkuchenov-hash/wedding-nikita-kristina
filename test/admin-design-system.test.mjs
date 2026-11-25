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

test('Guest relationships distinguish couples from family, with one guest database and preserved invitation extras',()=>{const s=read('src/admin-guests.js'),api=read('backend/src/api.php');assert.match(s,/section\('Связи с гостями'/);assert.match(s,/\['couple','Пара'\],\['family','Родственные связи'\]/);assert.match(s,/relation_type:type.value/);assert.match(api,/UPDATE guest_relationships SET relation_1_to_2=\?,relation_2_to_1=\?,relation_type=\?/);assert.doesNotMatch(s,/Добавить сопровождающего/);assert.match(s,/if\(invitationExtras.length\)/);assert.match(read('src/admin-heading.css'),/\.ad-gb-section>h3,\.ad-gb-field-group>h4,\.ad-gb-legacy-details>summary,\.ad-gb-secondary-section>summary/)});

import {guestRelationshipType} from '../src/admin-guests.js';
test('Explicit historical spouse links appear as couples without inferring undocumented partners',()=>{assert.equal(guestRelationshipType({relation_type:'family',relation_1_to_2:'Муж'}),'couple');assert.equal(guestRelationshipType({relation_type:'family',relation_1_to_2:'Брат'}),'family');assert.equal(guestRelationshipType({relation_type:'other',relation_1_to_2:'Коллега'}),'other');assert.equal(guestRelationshipType({relation_type:'friend',relation_1_to_2:'Друг'}),'friend');assert.equal(guestRelationshipType({relation_type:'couple'}),'couple')});
