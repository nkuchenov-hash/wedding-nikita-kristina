import test from 'node:test';
import assert from 'node:assert/strict';
import {shortWeekday} from '../src/admin-program.js';
test('standard Russian weekday abbreviations',()=>assert.deepEqual(['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'].map(shortWeekday),['пн','вт','ср','чт','пт','сб','вс']));
