import test from 'node:test';
import assert from 'node:assert/strict';
import {VENUE_RECORDS} from '../src/venues-data.js';
import {VENUE_PRICING} from '../src/venues-pricing.js';
import {estimateVenue} from '../src/venue-evaluation.js';

test('Alexandrovsky Park 2026 rider confirms a basic technician without double billing',()=>{
 const v=VENUE_RECORDS['alex-park'],p=VENUE_PRICING['alex-park'];
 assert.ok(v.technicalRiderSource.includes('drive.google.com/file/d/'));
 assert.ok(v.technicalRiderNotes.includes('1 час подготовки + до 6 часов'));
 assert.ok(v.technicalRiderNotes.includes('НЕ входят'));
 assert.ok(v.visitIncludedEquipment.includes('штатный технический специалист'));
 assert.ok(v.excluded.some(x=>x.includes('Звукорежиссёр')&&x.includes('светорежиссёр')));
 assert.ok(v.excluded.some(x=>x.includes('ВОЗМЕЩЕНИЯ')||x.includes('возмещение')));
 assert.ok(v.questions.some(x=>x.includes('DJ')));
 assert.equal(p.sound.value,125000);
 assert.match(p.sound.note,/технический специалист/i);
 assert.match(p.light.note,/не включены/i);
 assert.match(p.tech.note,/не включены/i);
 assert.deepEqual(v.budgetItems.find(x=>String(x[0]).includes('Оборудование на 20 июня')),
  ['Оборудование на 20 июня (штатный техник включён)',125000]);
 assert.equal(v.quotes.find(q=>q.date==='2027-06-20').total,687760);
 assert.equal(estimateVenue({...v,id:'alex-park'},80).value,687760);
});
