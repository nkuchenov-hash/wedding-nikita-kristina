import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adminModules} from '../src/data.js';
import {approvedVenueIds,GUEST_PHOTO_CATEGORIES,guestGalleryAssets} from '../src/admin-photos.js';

test('sidebar contains one photo section, not a duplicate moderation tab',()=>{
 const photoSections=adminModules.filter(x=>x.id==='photos'||x.id==='moderation'||/фото/i.test(x.label));
 assert.deepEqual(photoSections.map(x=>x.id),['photos']);
});

test('guest album has precisely the four requested content groups',()=>{
 assert.deepEqual(GUEST_PHOTO_CATEGORIES.map(x=>x.id),['couple','location','city','guide']);
 assert.match(GUEST_PHOTO_CATEGORIES[0].title,/фотограф/i);
 assert.match(GUEST_PHOTO_CATEGORIES[1].title,/регистрац/i);
 assert.match(GUEST_PHOTO_CATEGORIES[2].title,/Петербург/i);
 assert.match(GUEST_PHOTO_CATEGORIES[3].title,/развлечен/i);
});

test('only actual confirmed programme venue IDs qualify as approved',()=>{
 const ids=approvedVenueIds([
  {venue_id:'maryino',is_confirmed:1},
  {venue_id:'vinity',is_confirmed:0},
  {venue_id:'royal',is_confirmed:'1'},
  {venue_id:'alex-park',is_confirmed:null},
  {venue_id:'',is_confirmed:1},
  {venue_id:'maryino',is_confirmed:true}
 ]);
 assert.deepEqual([...ids],['maryino','royal']);
});

test('candidate venue photos are not imported into the guest gallery',()=>{
 const assets=[
  {id:'a',category:'couple',caption:'Никита и Кристина'},
  {id:'b',category:'location',venue_id:'maryino'},
  {id:'c',category:'location',venue_id:'vinity'},
  {id:'d',category:'city',caption:'Петербург'},
  {id:'e',category:'guide',caption:'Прогулка по городу'},
  {id:'f',category:'budget',caption:'Коммерческое предложение'},
  {id:'g',category:'location',venue_id:'',caption:'неподтверждено'}
 ];
 assert.deepEqual(guestGalleryAssets(assets,new Set(['maryino'])).map(x=>x.id),['a','b','d','e']);
 assert.deepEqual(guestGalleryAssets(assets,new Set()).map(x=>x.id),['a','d','e']);
});

test('guest-photo screen loads curated assets from protected gallery backend',()=>{
 const code=readFileSync(new URL('../src/admin-photos.js',import.meta.url),'utf8');
 assert.match(code,/request\('admin\/gallery'\)/);
 assert.match(code,/request\('admin\/gallery\/upload'/);
 assert.match(code,/request\('admin\/gallery\/update'/);
 assert.match(code,/media=gallery/);
 assert.doesNotMatch(code,/getVenuePhotos/);
 assert.doesNotMatch(code,/ALL_ALBUMS/);
 assert.doesNotMatch(code,/admin\/moderation/);
});

test('guest photo data is served behind admin auth; public gallery is not claimed live',()=>{
 const code=readFileSync(new URL('../src/admin-photos.js',import.meta.url),'utf8');
 assert.match(code,/credentials:'same-origin'/);
 assert.match(code,/X-CSRF-Token/);
 assert.match(code,/Новые фото сохраняются закрытыми/);
});
