import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assignedDay,scheduled,itemTags} from '../src/admin-program.js';

const source=readFileSync(new URL('../src/admin-program.js',import.meta.url),'utf8');
const schema=readFileSync(new URL('../backend/schema.sql',import.meta.url),'utf8');
const migrate=readFileSync(new URL('../backend/bin/migrate.php',import.meta.url),'utf8');
const api=readFileSync(new URL('../backend/src/api.php',import.meta.url),'utf8');

test('activities and un-timed ideas belong to a distinct wedding day',()=>{
 assert.equal(assignedDay({activity_date:'2027-06-17',start_at:null}),'2027-06-17');
 assert.equal(assignedDay({activity_date:'2027-06-18',start_at:null}),'2027-06-18');
 assert.equal(assignedDay({activity_date:'2027-06-19',start_at:null}),'2027-06-19');
 assert.equal(assignedDay({start_at:'2027-06-17T14:00:00'}),'2027-06-17');
 assert.equal(assignedDay({start_at:'2027-06-19'}),'2027-06-19');
 assert.match(schema,/activity_date TEXT NOT NULL/);
 assert.match(migrate,/ADD COLUMN activity_date/);
 assert.match(migrate,/activity_date=substr\(start_at,1,10\)/);
});
test('ideas are not scheduled just because a day was assigned',()=>{
 assert.equal(scheduled({activity_date:'2027-06-19',stage:'idea',start_at:null}),false);
 assert.equal(scheduled({activity_date:'2027-06-19',stage:'idea',start_at:'2027-06-19'}),false);
 assert.equal(scheduled({activity_date:'2027-06-19',stage:'program',start_at:'2027-06-19T19:00:00'}),true);
});
test('tags are stored as arrays on activity cards and are independently editable',()=>{
 assert.deepEqual(itemTags({tags_json:'["welcome","host"]'}),['welcome','host']);
 assert.deepEqual(itemTags({tags_json:'not-json'}),[]);
 assert.deepEqual(itemTags({}),[]);
 assert.match(api,/activity_tags/);
 assert.match(api,/tags_json/);
 assert.match(source,/itemTags\(e\)\.includes\(filter\)/);
});
test('program and idea pool have separate day-specific views and editable start and end times',()=>{
 assert.match(source,/\['program','Программа'/);
 assert.match(source,/\['idea','Пул идей'/);
 assert.match(source,/assignedDay\(e\)===day/);
 assert.match(source,/field\('Начало',start\)/);
 assert.match(source,/field\('Окончание',end\)/);
 assert.match(source,/card\(item,rows\)/);
 assert.match(source,/openCard\(item\)/);
 assert.doesNotMatch(source,/field\('Место/);
 assert.doesNotMatch(source,/В программу',\s*\(\)=>openCard/);
});
