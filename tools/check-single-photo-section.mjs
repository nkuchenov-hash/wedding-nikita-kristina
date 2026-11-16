import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adminModules} from '../src/data.js';
import {GUEST_PHOTO_CATEGORIES} from '../src/admin-photos.js';

// Non-negotiable deployment invariant: exactly one organizer photo section.
const photos=adminModules.filter(m=>m.id==='photos'||m.id==='moderation'||/фото|галере/i.test(m.label));
assert.deepEqual(photos.map(m=>m.id),['photos'],
 'В админке запрещены два раздела фотографий. Только одна гостевая галерея.');
assert.deepEqual(GUEST_PHOTO_CATEGORIES.map(x=>x.id),['couple','location','city','guide'],
 'Галерея предназначена только для пары, утверждённых мест, Петербурга и развлечений.');
const app=readFileSync(new URL('../src/admin-app.js',import.meta.url),'utf8');
const data=readFileSync(new URL('../src/admin-data-ui.js',import.meta.url),'utf8');
const archive=readFileSync(new URL('../src/admin-photos.js',import.meta.url),'utf8');
assert.match(app,/section==='photos'\)activatePhotoArchive/);
assert.match(app,/section==='moderation'\).*#\/admin\/photos/);
assert.doesNotMatch(data,/function moderation\s*\(/,
 'Запрещено добавлять старую страницу модерации как второй раздел.');
assert.doesNotMatch(data,/section==='moderation'/);
assert.doesNotMatch(archive,/getVenuePhotos|ALL_ALBUMS/,
 'Фото рассматриваемых площадок не должны попадать в гостевую галерею.');
console.log('CHECK PASSED: exactly one curated guest photo section; legacy route redirects there.');
