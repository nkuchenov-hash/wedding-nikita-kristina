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

/* Shared, evidence-based venue scoring. Every rule is the same for every venue.
   Unknown facts do not turn into automatic points or automatic failures.
   The administrator may change rules globally; all venues use the same rules. */
export const RATING_CRITERIA=[
 ['date','Доступность даты',40],
 ['cost','Бюджет на всех гостей',15],
 ['capacity','Вместимость',10],
 ['city','Местоположение в Санкт-Петербурге',10],
 ['singleHall','Все гости в одном зале',6],
 ['indoorBackup','Крытая рассадка при дожде',5],
 ['includedEquipment','Штатный звук и свет на площадке',5],
 ['until23','До 23:00 без доплаты',3],
 ['ownAlcohol','Свой алкоголь без пробкового сбора',3],
 ['outdoorArea','Доступная открытая зона или терраса',3]
];
export const OBJECTIVE_CRITERIA=[
 {key:'singleHall',label:'Все гости в одном зале',question:'80 гостей могут сидеть в одном помещении без разделения банкета между залами?',evidence:'План рассадки или подтверждённая вместимость одного зала'},
 {key:'indoorBackup',label:'Крытая рассадка при дожде',question:'Все гости могут разместиться внутри в дождь без дополнительной аренды?',evidence:'Письменно подтверждённый погодный вариант для полного числа гостей'},
 {key:'includedEquipment',label:'Штатный звук и свет на площадке',question:'Площадка располагает собственной звуковой и световой системой для ведущего и диджея (даже если аренда техники оплачивается отдельно)?',evidence:'Технический райдер или документальный перечень оборудования'},
 {key:'until23',label:'До 23:00 без доплаты',question:'Площадка доступна до 23:00 без отдельной почасовой оплаты?',evidence:'Договорные часы аренды и условия продления'},
 {key:'ownAlcohol',label:'Свой алкоголь без пробкового сбора',question:'Разрешено привезти свой алкоголь без пробкового сбора?',evidence:'Письменные условия площадки о своём алкоголе'},
 {key:'outdoorArea',label:'Доступная открытая зона или терраса',question:'Гостям разрешено пользоваться террасой, садом или внутренним двором в составе выбранного пакета?',evidence:'Описание включённой территории и условий пользования'}
];
export const PERSONAL_CRITERIA=[]; // Obsolete subjective 1–5 ratings are deliberately not used.
export const RATING_MAX=100;
export const DEFAULT_RATING_RULES=Object.freeze({
 weights:{date:40,cost:15,capacity:10,city:10,singleHall:6,indoorBackup:5,includedEquipment:5,until23:3,ownAlcohol:3,outdoorArea:3},
 alternativeDatePercent:60,
 priceLimits:[650000,800000,1000000,1200000],
 pricePercents:[100,80,60,33,0],
 includeWorkingBudgets:true
});
export function validateRatingRules(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const allowed=['weights','alternativeDatePercent','priceLimits','pricePercents','includeWorkingBudgets'];
 if(Object.keys(value).some(k=>!allowed.includes(k)))return null;
 if(!value.weights||Array.isArray(value.weights)||Object.keys(value.weights).length!==RATING_CRITERIA.length)return null;
 const keys=RATING_CRITERIA.map(([key])=>key);
 if(Object.keys(value.weights).some(k=>!keys.includes(k))||keys.some(k=>!Number.isInteger(value.weights[k])||value.weights[k]<0||value.weights[k]>100))return null;
 if(keys.reduce((sum,k)=>sum+value.weights[k],0)!==100)return null;
 if(!Number.isInteger(value.alternativeDatePercent)||value.alternativeDatePercent<0||value.alternativeDatePercent>100)return null;
 if(!Array.isArray(value.priceLimits)||value.priceLimits.length!==4||
  value.priceLimits.some((x,i)=>!Number.isInteger(x)||x<10000||x>100000000||(i>0&&x<=value.priceLimits[i-1])))return null;
 if(!Array.isArray(value.pricePercents)||value.pricePercents.length!==5||
  value.pricePercents.some((x,i)=>!Number.isInteger(x)||x<0||x>100||(i>0&&x>value.pricePercents[i-1])))return null;
 if(typeof value.includeWorkingBudgets!=='boolean')return null;
 return {
  weights:Object.fromEntries(keys.map(k=>[k,value.weights[k]])),
  alternativeDatePercent:value.alternativeDatePercent,
  priceLimits:[...value.priceLimits],
  pricePercents:[...value.pricePercents],
  includeWorkingBudgets:value.includeWorkingBudgets
 };
}
export function scoreVenue(v,guests,cost=estimateVenue(v,guests),rules=DEFAULT_RATING_RULES){
 const config=validateRatingRules(rules)||DEFAULT_RATING_RULES;
 const weights=config.weights;
 const breakdown=[];
 const add=(key,value,known,note='')=>{
  const criterion=RATING_CRITERIA.find(x=>x[0]===key);
  breakdown.push({key,label:criterion[1],maximum:weights[key],value:known?Math.max(0,Math.min(weights[key],value)):null,note});
 };
 const preferred=status(v,'19'),alternates=['18','20'].map(d=>status(v,d));
 if(preferred==='available')add('date',weights.date,true,'19 июня подтверждено свободно');
 else if(alternates.includes('available'))add('date',weights.date*config.alternativeDatePercent/100,true,'18 или 20 июня свободно; 19 июня не подтверждено');
 else if([preferred,...alternates].every(x=>x==='unavailable'))add('date',0,true,'18, 19 и 20 июня заняты');
 else add('date',0,false,'Нет подтверждённой свободной даты');
 const priceKnown=cost&&typeof cost.value==='number'&&Number.isFinite(cost.value)&&cost.value>=0;
 const admissible=priceKnown&&(config.includeWorkingBudgets||((cost.isQuote&&!cost.partial)||cost.basedOnQuote===true));
 if(admissible){
  let band=config.priceLimits.findIndex(limit=>cost.value<=limit);
  if(band<0)band=config.pricePercents.length-1;
  const preliminary=cost.partial||cost.kind==='planning';
  add('cost',weights.cost*config.pricePercents[band]/100,true,
   (preliminary?'Предварительная рабочая смета':'Подтверждённое предложение')+' на '+(Number(guests)||80)+' гостей: '+Math.round(cost.value).toLocaleString('ru-RU')+' ₽');
 }else add('cost',0,false,priceKnown?'Рабочий бюджет не учитывается по настройке рейтинга':'Нет расчёта банкета на нужное число гостей');
 const cap=num(v.capacity),n=Math.round(Number(guests)||80);
 if(cap!==null&&cap>0)add('capacity',cap>=n?weights.capacity:0,true,cap>=n?'Вмещает '+n+' гостей':'Не вмещает '+n+' гостей');
 else add('capacity',0,false,'Нет подтверждённой общей вместимости');
 add('city',v.region==='city'?weights.city:0,true,v.region==='city'?'В Санкт-Петербурге':'За городом');
 for(const item of OBJECTIVE_CRITERIA){
  const fact=v.ratingFacts?.[item.key];
  if(fact===true||fact==='yes')add(item.key,weights[item.key],true,'Да — '+item.evidence);
  else if(fact===false||fact==='no')add(item.key,0,true,'Нет — '+item.evidence);
  else add(item.key,0,false,'Не подтверждено: '+item.evidence);
 }
 const known=breakdown.filter(x=>x.value!==null);
 const total=known.reduce((sum,row)=>sum+row.value,0);
 const provisional=known.length<breakdown.length||!!cost?.partial;
 return {value:known.length===0?null:Math.round(total*10)/10,complete:known.length,maximum:100,
  rated:OBJECTIVE_CRITERIA.filter(x=>v.ratingFacts?.[x.key]==='yes'||v.ratingFacts?.[x.key]==='no').length,
  provisional,preferred:preferred==='available',date:preferred,breakdown};
}
