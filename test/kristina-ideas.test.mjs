import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const seed=JSON.parse(readFileSync(new URL('../backend/seed/kristina-ideas-20261120.json',import.meta.url),'utf8'));
const importer=readFileSync(new URL('../backend/bin/import-kristina-ideas-20261120.php',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/backend.yml',import.meta.url),'utf8');

test('Kristina draft ideas are all on June 19, are distinct, and never pre-scheduled',()=>{
 assert.equal(seed.activity_date,'2027-06-19');
 assert.equal(seed.status,'idea');
 assert.equal(seed.ideas.length,30);
 const ids=new Set(),titles=new Set();
 for(const entry of seed.ideas){
  assert.equal(entry.activity_date,'2027-06-19');
  assert.match(entry.id,/^[a-z0-9-]{1,40}$/);
  assert.ok(!ids.has(entry.id));ids.add(entry.id);
  assert.ok(!titles.has(entry.title));titles.add(entry.title);
  assert.ok(entry.notes.length>30);
  assert.ok(Number.isInteger(entry.duration_min)&&entry.duration_min>=5&&entry.duration_min<=600);
  assert.ok(Array.isArray(entry.tags));
  for(const tag of entry.tags)
   assert.ok(seed.tags.some(x=>x.id===tag),'missing tag '+tag);
  assert.ok(!('start_at' in entry),'tentative hours must not become scheduled events');
 }
});
test('all important proposal groups are preserved without duplicate creative bureau',()=>{
 const names=seed.ideas.map(x=>x.title).join(' ');
 for(const phrase of ['Фотосессия','шампанским','пожеланий','фотоаппарат','хлопушками','Ротация','Тосты','Выступления','горячего','танец','торта','Дискотека','творческое бюро','Подарки талантами'])
  assert.match(names,new RegExp(phrase,'i'));
 assert.equal(seed.ideas.filter(x=>/творческое бюро/i.test(x.title)).length,1);
 assert.match(seed.ideas.find(x=>/Свадьба, созданная/.test(x.title)).notes,/добровольно/);
});
test('backend import is idempotent, private and keeps existing organizer changes',()=>{
 assert.match(importer,/INSERT OR IGNORE INTO schedule_items/);
 assert.match(importer,/stage,activity_type,duration_min,gap_before_min,activity_date,tags_json/);
 assert.match(importer,/kristina_ideas_20261120_tags_initialized/);
 assert.match(importer,/WHERE id=\? OR \(activity_date=\? AND title=\?\)/);
 assert.match(importer,/beginTransaction\(\)/);
 assert.match(workflow,/php bin\/seed-planning\.php\s+php bin\/import-kristina-ideas-20261120\.php/);
});
