import {mkdirSync,writeFileSync} from 'node:fs';
import {PUBLIC_VENUES} from '../src/venues.js';
import {VENUE_RECORDS} from '../src/venues-data.js';

const numberOrNull=x=>typeof x==='number'&&Number.isFinite(x)?Math.round(x):null;
const rows=PUBLIC_VENUES.map(v=>{
 const ext=VENUE_RECORDS[v.id]||{};
 const cost={...(ext.cost||{}),...(v.cost||{})};
 return {
   id:v.id,
   name:v.name,
   area:v.area||ext.area||'',
   address:v.address||ext.address||'',
   website:v.website||ext.website||'',
   capacity_min:numberOrNull(v.capacityMin??ext.capacityMin),
   capacity_max:numberOrNull(v.capacity??ext.capacity),
   quoted_total_rub:numberOrNull(cost.quoteTotal),
   quote_guests:numberOrNull(cost.quoteGuests),
   desired_date_status:ext.availability||v.availability||'unknown',
   contact_name:v.contactName||ext.contactName||'',
   contact_email:v.email||ext.email||'',
   contact_phone:v.phone||ext.phone||'',
   quote_source:v.quoteSource||ext.quoteSource||'',
   pros:v.pros||ext.pros||'',
   cons:v.cons||ext.cons||'',
   notes:v.notes||ext.notes||ext.summary||'',
   details_json:JSON.stringify({public:v,source:ext}),
   photo_refs_json:JSON.stringify(ext.photos||ext.photo_refs||[]),
 };
});
if(rows.length<20)throw Error('Venue catalog unexpectedly incomplete');
const ids=new Set(rows.map(x=>x.id));
if(ids.size!==rows.length)throw Error('Duplicate venue IDs');
mkdirSync('backend/seed',{recursive:true});
writeFileSync('backend/seed/venues.json',JSON.stringify(rows,null,2)+'\n','utf8');
console.log('VENUE_SEED_PREPARED count='+rows.length);
