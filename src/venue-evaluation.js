/* Private organizer venue cost & scoring rules.
   Never invent a quote. Partial calculations are explicitly labelled as such. */
import {VENUE_PRICING} from './venues-pricing.js';
import {planningEstimate} from './venue-budget-coverage.js';

const num=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const money=x=>x===null?null:Math.round(x);
const validDate=s=>['available','unavailable','pending','unknown'].includes(s)?s:'unknown';
const status=(v,d)=>validDate(v.dateAvailability?.[String(d)]||(String(d)==='19'?v.availability:null));
const uniqueQuotes=venue=>(venue.quotes||[]).filter(q=>q.kind!=='scenario'&&num(q.guests)>0&&num(q.total)!==null&&num(q.total)>=0);

function perGuestPrice(v){
 const price=VENUE_PRICING[v.id]||{};
 const direct=num(v.cost?.menu);
 if(direct!==null)return direct;
 const entry=price.menu||{};
 const advertised=/рекламн|каталог|от\s?\d|нельзя пересчитывать|не индивидуальн/i.test(String(entry.note||''));
 return !advertised?num(entry.value):null;
}
function explicitPerGuest(v,key){
 const entry=VENUE_PRICING[v.id]?.[key];
 if(!entry||typeof entry.note!=='string')return null;
 const pattern=/([\d\s]+)\s*₽?\s*[×x]\s*(\d+)\s*(?:гостей|чел)?/iu;
 const match=entry.note.match(pattern);
 if(match){
   const unit=Number(match[1].replace(/\s/g,''));
   return Number.isFinite(unit)&&unit>=0?unit:null;
 }
 return null;
}
function marginalPrice(v){
 const menu=perGuestPrice(v);
 const welcome=explicitPerGuest(v,'welcome');
 const drinks=explicitPerGuest(v,'drinks');
 const lines=[menu,welcome,drinks].filter(x=>x!==null);
 if(!lines.length)return null;
 const price=VENUE_PRICING[v.id]||{};
 const service=num(v.cost?.service)??num(price.service?.value);
 const note=String(price.service?.note||'');
 const menuService=menu!==null&&service!==null&&/меню/i.test(note)&&!/(только с дополнительн)/i.test(note)
   ?menu*service/100:0;
 const welcomeService=welcome!==null&&service!==null&&/фуршетн|welcome/i.test(note)&&!/(только с дополнительн)/i.test(note)
   ?welcome*service/100:0;
 return lines.reduce((a,b)=>a+b,0)+menuService+welcomeService;
}
export function estimateVenue(v,guests){
 const count=Math.max(1,Math.min(300,Math.round(Number(guests)||80)));
 const quotes=uniqueQuotes(v);
 const exact=quotes.find(q=>Number(q.guests)===count);
 if(exact)return {value:money(Number(exact.total)),partial:exact.kind==='estimate',isQuote:exact.kind==='quote',
   kind:exact.kind||'quote',quoteDate:exact.date||null,
   note:exact.kind==='estimate'?'Прогноз из исходных материалов, не утверждённая цена':'Исходная смета на '+count+' гостей'};
 const byGuests=quotes.filter(q=>q.kind==='quote').sort((a,b)=>Number(a.guests)-Number(b.guests));
 if(byGuests.length>=2){
   const lower=byGuests.filter(q=>q.guests<count).at(-1);
   const upper=byGuests.find(q=>q.guests>count);
   if(lower&&upper&&Number(lower.guests)!==Number(upper.guests)){
     const ratio=(count-lower.guests)/(upper.guests-lower.guests);
     return {value:money(Number(lower.total)+ratio*(Number(upper.total)-Number(lower.total))),
       partial:true,isQuote:false,kind:'interpolation',note:'Расчёт между сметами на '+lower.guests+' и '+upper.guests+' гостей. Цена требует подтверждения'};
   }
 }
 if(quotes.length){
   const base=[...quotes].sort((a,b)=>Math.abs(a.guests-count)-Math.abs(b.guests-count))[0];
   // Venue-specific 2027 offers may have a different variable menu rate from a
   // previously published catalogue. Preserve the catalogue while recomputing
   // the selected offer at other guest counts.
   const marginal=num(base.marginalPerGuest)??marginalPrice(v);
   if(marginal===null)return {value:null,partial:true,isQuote:false,kind:'unknown',
     note:'Есть исходная смета на '+base.guests+' гостей, но без расшифровки её нельзя честно пересчитать на '+count};
   const total=Math.max(0,Number(base.total)+(count-Number(base.guests))*marginal);
   return {value:money(total),partial:true,isQuote:false,kind:'scenario',
     note:'Предварительный пересчёт сметы на '+base.guests+' гостей: только известные переменные строки. Итог необходимо подтвердить'};
 }
 // If a proposal names an incomplete food option, build a visibly provisional
 // working budget with labeled reserves rather than presenting rent + food as complete.
 const planning=planningEstimate(v,count);
 if(planning)return planning;
 const cost=v.cost||{},pricing=VENUE_PRICING[v.id]||{};
 // A venue rental on its own is not the cost of a wedding.
 const menu=perGuestPrice(v);
 const included=key=>/^(?:включено|входит)/i.test(String(pricing[key]?.value||''));
 const entry=key=>num(cost[key])??num(pricing[key]?.value);
 const rent=entry('rent'),rentKnown=rent!==null||included('rent');
 const tech=num(cost.technical)??num(pricing.tech?.value);
 const sound=entry('sound'),light=entry('light');
 // A combined equipment package is a single charge, not sound + light again.
 const equipment=tech!==null?tech:(sound??0)+(light??0);
 const knownTechnology=tech!==null||sound!==null||light!==null;
 const extra=num(cost.extra);
 const minimum=num(cost.minSpend)??num(pricing.deposit?.value);
 const service=entry('service');
 const serviceNote=String(pricing.service?.note||'');
 const serviceOnMenu=service!==null&&!included('service')&&!/только.*дополнительн/i.test(serviceNote);
 const spend=menu===null?null:Math.max(menu*count,minimum??0);
 const menuCharge=spend===null?0:spend;
 const serviceCharge=spend!==null&&serviceOnMenu?spend*service/100:0;
 const knownSubtotal=money((rent??0)+menuCharge+equipment+(extra??0)+serviceCharge);
 const missing=[];
 if(menu===null)missing.push('банкет');
 if(!rentKnown)missing.push('аренда');
 if(!knownTechnology&&!included('sound')&&!included('light')&&!included('tech'))missing.push('звук и свет');
 if(service===null&&!included('service'))missing.push('обслуживание');
 if(menu===null||!rentKnown){
  return {value:null,knownSubtotal,partial:true,isQuote:false,kind:'incomplete',missing,
    note:'Полный бюджет не рассчитан: '+missing.join(', ')+'. Известные суммы нельзя считать окончательной ценой'};
 }
 // Known charges from a catalogue give only an indicative *lower bound*.
 // Unpriced food, equipment or service remain explicit missing components.
 return {value:knownSubtotal,knownSubtotal,partial:true,isQuote:false,kind:'minimum',missing,
   note:'Минимум по известным позициям, без неподтверждённых услуг'+(missing.length?': '+missing.join(', '):'')};

}

/* 100-point decision score: the desired 19 June is the strongest single criterion.
   Missing subjective evidence remains unrated, never silently treated as confirmed. */
export const RATING_CRITERIA=[
 ['date','Доступность 19 июня / альтернатив',40],
 ['cost','Полная стоимость для гостей',15],
 ['capacity','Вместимость',10],
 ['city','Городское расположение',10],
 ['look','Атмосфера',6],
 ['comfort','Комфорт гостей',3],
 ['food','Меню и обслуживание',3],
 ['travel','Логистика',3],
 ['terrace','Терраса, природа и виды',5],
 ['terms','Условия аренды и ограничения',5]
];
export const PERSONAL_CRITERIA=RATING_CRITERIA.filter(([key])=>['look','comfort','food','travel','terrace','terms'].includes(key));
export const RATING_MAX=RATING_CRITERIA.reduce((sum,[,,points])=>sum+points,0);
function pricePoints(total){
 if(total<=650000)return 15;
 if(total<=800000)return 12;
 if(total<=1000000)return 9;
 if(total<=1200000)return 5;
 return 0;
}
export function scoreVenue(v,guests,cost=estimateVenue(v,guests)){
 const breakdown=[];
 const add=(key,value,known,note='')=>{
   const row=RATING_CRITERIA.find(r=>r[0]===key);
   breakdown.push({key,label:row[1],maximum:row[2],value:known?Math.max(0,Math.min(row[2],value)):null,note});
 };
 const preferred=status(v,'19'),alternates=['18','20'].map(d=>status(v,d));
 if(preferred==='available')add('date',40,true,'19 июня подтверждено');
 else if(alternates.includes('available'))add('date',24,true,'Подтверждено 18 или 20 июня, но не 19');
 else if([preferred,...alternates].every(x=>x==='unavailable'))add('date',0,true,'Все рассматриваемые даты заняты');
 else add('date',0,false,'Доступность рассматриваемой даты не подтверждена');
 // Rent-only information is never a comparable total event quote.
 const comparableCost=cost.value!==null && ((cost.isQuote&&!cost.partial)||cost.basedOnQuote===true);
 if(comparableCost)add('cost',pricePoints(cost.value),true,cost.partial?'Предварительная стоимость':'Полученная смета');
 else add('cost',0,false,'Нет полноценного подтверждённого КП. Рабочая смета и минимум по тарифам не дают баллов за стоимость.');
 const cap=num(v.capacity),n=Math.round(Number(guests)||80);
 if(cap!==null&&cap>0)add('capacity',cap>=n?10:0,true,cap>=n?'Вмещает '+n+' гостей':'Недостаточная вместимость');
 else add('capacity',0,false,'Вместимость не подтверждена');
 add('city',v.region==='city'?10:0,true,v.region==='city'?'Городская площадка':'За городом — без бонуса за расположение');
 for(const [key,,weight] of PERSONAL_CRITERIA){
    const n=num(v.ratings?.[key]),known=n!==null&&n>=1&&n<=5;
    add(key,known?n/5*weight:0,known,known?'Ваша оценка '+n+'/5':'Личная оценка не заполнена');
 }
 const known=breakdown.filter(r=>r.value!==null);
 const total=known.reduce((sum,r)=>sum+r.value,0);
 const provisional=known.length<breakdown.length||cost.partial;
 // Zero is a meaningful score only when other criteria have been evaluated.
 return {value:known.every(x=>x.key==='city')?null:Math.round(total),complete:known.length,maximum:RATING_MAX,
   rated:PERSONAL_CRITERIA.filter(([key])=>num(v.ratings?.[key])!==null).length,
   provisional,preferred:preferred==='available',date:preferred,breakdown};
}
