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
 ['date','Доступность даты',45],
 ['cost','Бюджет на всех гостей',18],
 ['capacity','Вместимость',11],
 ['city','Местоположение в Санкт-Петербурге',9],
 ['includedEquipment','Штатный звук и свет на площадке',6],
 ['outdoorArea','Терраса, балкон или открытая зона',3],
 ['entrance','Презентабельность и удобство входа',8]
];
export const OBJECTIVE_CRITERIA=[
 {key:'includedEquipment',label:'Штатный звук и свет на площадке',question:'Площадка располагает собственной звуковой и световой системой для ведущего и диджея (вне зависимости от стоимости аренды)?',evidence:'Технический райдер или перечень оборудования'},
 {key:'outdoorArea',label:'Терраса, балкон или открытая зона',question:'Есть ли у площадки балкон, терраса, сад или внутренний двор? Само наличие проверяется по осмотру и фото; доступность гостям и плату за использование показываем отдельно.',evidence:'Фото осмотра, план помещений или описание площадки'},
 {key:'entrance',label:'Презентабельность и удобство входа',question:'Вход легко найти, маршрут для гостей удобен и входная группа выглядит аккуратно и достойно свадебного приёма? «Да» — все три условия; «Нет» — хотя бы одно не выполнено; «Неизвестно» — нет достоверных сведений.',evidence:'Фото входа, осмотр маршрута от улицы и оценка организатора по единому чек-листу'}
];
export const PERSONAL_CRITERIA=[];
export const RATING_MAX=100;
export const DEFAULT_RATING_RULES=Object.freeze({
 weights:{date:45,cost:18,capacity:11,city:9,includedEquipment:6,outdoorArea:3,entrance:8},
 alternativeDatePercent:60,
 priceLimits:[650000,800000,1000000,1200000],
 pricePercents:[100,80,60,33,0],
 includeWorkingBudgets:true
});
const SIX_RATING_WEIGHTS={date:45,cost:20,capacity:13,city:10,includedEquipment:7,outdoorArea:5};
const TEN_RATING_WEIGHTS={
 date:40,cost:15,capacity:10,city:10,singleHall:6,indoorBackup:5,
 includedEquipment:5,until23:3,ownAlcohol:3,outdoorArea:3
};
function integerWeights(value,keys){
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&
  keys.every(key=>Number.isInteger(value[key])&&value[key]>=0&&value[key]<=100)&&
  keys.reduce((sum,key)=>sum+value[key],0)===100;
}
function distributeWeight(value,keys,total){
 const current=keys.reduce((s,k)=>s+value[k],0);
 if(current===0)return null;
 const fractions=keys.map((key,index)=>({key,index,raw:value[key]*total/current}));
 const next=Object.fromEntries(fractions.map(x=>[x.key,Math.floor(x.raw)]));
 const remaining=total-Object.values(next).reduce((sum,w)=>sum+w,0);
 fractions.sort((a,b)=>(b.raw-Math.floor(b.raw))-(a.raw-Math.floor(a.raw))||a.index-b.index);
 for(let i=0;i<remaining;i++)next[fractions[i].key]++;
 return next;
}
/** Convert old saved 6/10-criterion weights to 7 without discarding
 * customized date or price thresholds. The new entrance weighs 8/100.
 * Previously customized weights retain their relative proportions. */
export function migrateRatingRules(value){
 const valid=validateRatingRules(value);
 if(valid)return valid;
 if(!value||typeof value!=='object'||!value.weights)return null;
 const oldSixKeys=Object.keys(SIX_RATING_WEIGHTS),oldTenKeys=Object.keys(TEN_RATING_WEIGHTS);
 let previous;
 if(integerWeights(value.weights,oldSixKeys)){
  previous=value.weights;
 }else if(integerWeights(value.weights,oldTenKeys)){
  const sameTen=oldTenKeys.every(k=>value.weights[k]===TEN_RATING_WEIGHTS[k]);
  previous=sameTen?SIX_RATING_WEIGHTS:distributeWeight(value.weights,oldSixKeys,100);
 }else return null;
 const sameSix=oldSixKeys.every(k=>previous[k]===SIX_RATING_WEIGHTS[k]);
 const retained=sameSix?Object.fromEntries(oldSixKeys.map(k=>[k,DEFAULT_RATING_RULES.weights[k]])):
  distributeWeight(previous,oldSixKeys,92);
 if(!retained)return null;
 return validateRatingRules({...value,weights:{...retained,entrance:8}});
}
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
