import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderGuest} from '../src/replica.js';

const guest=readFileSync('src/replica.js','utf8');
const data=readFileSync('src/data.js','utf8');
const index=readFileSync('index.html','utf8');
const referenceCss=readFileSync('src/wedding-reference-2026.css','utf8');

test('approved botanical layout has hero, invitation and RSVP in original section order',()=>{
 const html=renderGuest('/');
 const hero=html.indexOf('<section class="r-hero ');
 const invite=html.indexOf('<section class="r-invitation ');
 const rsvp=html.indexOf('<section class="w-rsvp ');
 assert.ok(hero>=0 && invite>hero && rsvp>invite,'RSVP remains third main section');
 assert.match(html,/Дорогие друзья!/);
 assert.match(html,/Программа наших дней/);
 assert.match(html,/wref-polaroid--estate/);
 assert.match(html,/wref-polaroid--city/);
 assert.match(html,/wref-venue-grid/);
 assert.match(html,/wref-gallery-preview/);
 assert.match(html,/wref-rsvp-disclaimer/);
 assert.match(html,/не отправляются и не сохраняются/);
 assert.match(html,/data-site-menu-toggle/);
 assert.match(html,/wg-couple-photo/);
 assert.doesNotMatch(html,/portrait-clean\.webp|portrait-extended-background\.webp/);
 assert.match(html,/wref-city-panorama/);
});

test('programme dates match tentative schedule without inventing a venue',()=>{
 const html=renderGuest('/schedule');
 const program=html.slice(html.indexOf('spb-program'));
 assert.match(program,/17<\/b>[\s\S]*?Официальная регистрация/);
 assert.match(program,/18<\/b>[\s\S]*?Свободный день/);
 assert.match(program,/19<\/b>[\s\S]*?Большой праздник/);
 assert.match(program,/Место в Санкт-Петербурге и время начала уточняются/);
 assert.doesNotMatch(program,/data-program-mode/);
 assert.match(data,/17–19 июня 2027/);
});

test('selected visual reference is applied to every guest route',()=>{
 const paths=['/','/schedule','/info','/guests','/gallery'];
 for(const path of paths){
   const html=renderGuest(path);
   assert.match(html,/class="r-app wref-app /,path+' uses redesigned shell');
   assert.match(html,/class="wref-header/,path+' has navigation');
   assert.match(html,/class="r-tabs"/,path+' keeps footer navigation');
 }
 assert.match(index,/src\/wedding-reference-2026\.css/);
 for(const motif of ['wref-polaroid','wref-day','wref-venue-card','wref-gallery-preview','wref-menu-toggle','@media(max-width:720px)'])
   assert.ok(referenceCss.includes(motif),'missing approved design: '+motif);
});

test('the invitation discloses tentative arrangements and avoids unconfirmed RSVP',()=>{
 const home=renderGuest('/');
 const info=renderGuest('/info');
 assert.match(home,/МАРЬИНО · САНКТ-ПЕТЕРБУРГ/);
 assert.match(home,/17 — 19 июня 2027/);
 assert.match(home,/Время и площадка уточняются/);
 assert.match(info,/ПЛОЩАДКА И ВРЕМЯ УТОЧНЯЮТСЯ/);
 assert.match(guest,/предварительный просмотр: ответ не сохранён и не отправлен/);
});

test('editorial invitation is restored without admin dashboard cards or fake couple portraits',()=>{
 const html=renderGuest('/');assert.match(html,/wref-hero-copy/);assert.match(html,/wref-polaroid--estate/);assert.doesNotMatch(html,/wg-hero-content|wref-hero-skyline/);assert.doesNotMatch(renderGuest('/gallery'),/gallery-clean-/);assert.match(referenceCss,/Restore the botanical editorial invitation/);
});
