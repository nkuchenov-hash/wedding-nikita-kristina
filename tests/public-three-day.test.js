import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const guest=readFileSync('src/replica.js','utf8');
const data=readFileSync('src/data.js','utf8');
const index=readFileSync('index.html','utf8');
const theme=readFileSync('src/petersburg-story.css','utf8');

test('public landing retains approved section order',()=>{
  const hero=guest.indexOf('r-hero r-hero--editorial');
  const invite=guest.indexOf('r-invitation w-invite');
  const rsvp=guest.indexOf('section class="w-rsvp"');
  assert.ok(hero>=0 && invite>hero && rsvp>invite);
  assert.match(guest,/Разделите<br><em>эту историю с нами/);
  assert.match(guest,/ответ не отправляется и не сохраняется/);
});

test('the tentative programme assigns each date to the right event',()=>{
  const schedule=guest.slice(guest.indexOf('function schedule(){'),guest.indexOf('function guests(){'));
  assert.match(schedule,/17<\/b>.*?Официальная регистрация/);
  assert.match(schedule,/18<\/b>.*?Свободный день/);
  assert.match(schedule,/19<\/b>.*?Большой праздник/);
  assert.match(schedule,/Место в Санкт-Петербурге и время начала уточняются/);
  assert.doesNotMatch(schedule,/data-program-mode/);
  assert.match(data,/17–19 июня 2027/);
});

test('Petersburg transition preserves botanical guest visual system',()=>{
  assert.match(index,/petersburg-story\.css/);
  assert.match(theme,/spb-transition/);
  assert.match(theme,/spb-skyline/);
  assert.match(theme,/#214934/);
  assert.match(guest,/spbMotif/);
});

test('no unconfirmed Saint Petersburg venue is invented',()=>{
  assert.match(guest,/адрес торжества уточняется/);
  assert.match(guest,/ПЛОЩАДКА И ВРЕМЯ УТОЧНЯЮТСЯ/);
});
