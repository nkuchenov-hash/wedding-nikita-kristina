import test from 'node:test';
import assert from 'node:assert/strict';
import {VENUE_RECORDS} from '../src/venues-data.js';
import {VENUE_PRICING} from '../src/venues-pricing.js';
import {estimateVenue,scoreVenue,OBJECTIVE_CRITERIA} from '../src/venue-evaluation.js';
import {VENUE_PHOTOS_1} from '../src/venues-photos-1.js';

test('Alexandrovsky Park 2026 rider confirms a basic technician without double billing',()=>{
 const v=VENUE_RECORDS['alex-park'],p=VENUE_PRICING['alex-park'];
 assert.ok(v.technicalRiderSource.includes('drive.google.com/file/d/'));
 assert.ok(v.technicalRiderNotes.includes('1 час подготовки + до 6 часов'));
 assert.match(v.technicalRiderNotes,/не входят/i);
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


test('Alexandrovsky Park terrace appears in photos and contributes to rating',()=>{
 const venue=VENUE_RECORDS['alex-park'],photos=VENUE_PHOTOS_1['alex-park'];
 assert.equal(photos.length,33,'Original inspection photo inventory preserved');
 const glazed=['1IBFm7pJCBJml34-_BsfMzJrjHuNQTVIC','1rxj_m8FvyUQrnZ_Nx-vDms6I2K2KuLZ4','1VTr5e0bZz74An49js2mjsHga1XNha_Jw'];
 for(const id of glazed){
  const file=photos.find(x=>x.id===id);
  assert.ok(file,'Terrace photo '+id);
  assert.equal(file.section,'Террасы и виды');
  assert.ok(file.name.startsWith('Крытая терраса'));
  assert.equal(file.folder,'17V-_fThWRq7z1s5219I9NIbEjMZ-vPni');
 }
 assert.equal(venue.gallery.find(x=>x.label==='Крытая терраса')?.folder,'17V-_fThWRq7z1s5219I9NIbEjMZ-vPni');
 assert.equal(venue.ratingFacts.outdoorArea,'yes');
 assert.match(venue.ratingFactSources.outdoorArea,/80 м²/);
 assert.match(OBJECTIVE_CRITERIA.find(x=>x.key==='outdoorArea').question,/балкон, терраса/);
 const rated=scoreVenue({id:'alex-park',region:'city',capacity:300,...venue},80,estimateVenue(venue,80));
 const terrace=rated.breakdown.find(x=>x.key==='outdoorArea');
 assert.equal(terrace.value,terrace.maximum);
 assert.equal(terrace.maximum,5);
 assert.equal(rated.breakdown.find(x=>x.key==='includedEquipment').value,7);
});
