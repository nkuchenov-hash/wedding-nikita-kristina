/* Coverage and non-binding planning estimates for venue budgets.
   Venue quotes are authoritative; missing charges must never be silently zero.
   Assumptions from another venue are clearly marked as provisional reserves. */
import {VENUE_PRICING} from './venues-pricing.js';

const num=x=>x===null||x===undefined||x===''?null:(Number.isFinite(Number(x))?Number(x):null);
const included=x=>typeof x==='string'&&/^(?:включено|входит|без доплат)/i.test(x);
const priced=x=>num(x)!==null;
const rub=x=>Math.round(x).toLocaleString('ru-RU')+' ₽';
const getEntry=(v,key,priceKey=key)=>{
 const own=v.cost?.[key];
 return own===null||own===undefined||own===''?VENUE_PRICING[v.id]?.[priceKey]?.value:own;
};
const make=(label,state,amount,detail)=>({label,state,amount,detail});
export function venueBudgetCoverage(v){
 const price=VENUE_PRICING[v.id]||{};
 const rent=getEntry(v,'rent');
 const menu=getEntry(v,'menu');
 const service=getEntry(v,'service');
 const tech=getEntry(v,'technical','tech');
 const sound=getEntry(v,'sound');
 const light=getEntry(v,'light');
 const rental=priced(rent)?make('Аренда','priced',Number(rent),'Аренда указана отдельной суммой')
   :included(rent)?make('Аренда','included',0,'Аренда входит в заявленный пакет')
   :make('Аренда','unknown',null,'В документах нет подтверждённой отдельной цены или включения');
 const banquet=priced(menu)?make('Питание','priced',Number(menu),'Указана стоимость меню на одного гостя')
   :included(menu)?make('Питание','included',0,'Питание обозначено как включённое')
   :make('Питание','unknown',null,'В смете нет согласованной цены меню');
 const serviceStatus=priced(service)?make('Обслуживание','priced',Number(service),'Ставка обслуживания '+Number(service)+'%; учитывайте базу начисления')
   :included(service)?make('Обслуживание','included',0,'Сервис включён в стоимость')
   :make('Обслуживание','unknown',null,'Включение сервиса или ставка не подтверждены');
 // One combined A/V package always outranks separate sound and light values.
 let equipment;
 if(priced(tech))equipment=make('Звук, свет, техника','priced',Number(tech),'Единый технический пакет — не прибавлять звук и свет повторно');
 else if(included(tech)){
  const sum=(priced(sound)?Number(sound):0)+(priced(light)?Number(light):0);
  if(!(priced(sound)||included(sound))||!(priced(light)||included(light)))
   equipment=make('Звук, свет, техника','partial',sum,'Включена лишь часть комплектации. Не подтверждены все необходимые звук, сценический свет или работа техперсонала');
  else
   equipment=sum>0?make('Звук, свет, техника','priced',sum,'Отдельно оплачиваемая часть единого пакета указана; остальные позиции включены')
     :make('Звук, свет, техника','included',0,'Полный звук, свет и техническая комплектация обозначены как включённые');
 }else if((included(sound)||priced(sound))&&(included(light)||priced(light))){
  const sum=(priced(sound)?Number(sound):0)+(priced(light)?Number(light):0);
  equipment=make('Звук, свет, техника','partial',sum,'Цена звука и света указана, но отдельно не подтверждено, что входит работа технического персонала');
 }else {
  equipment=make('Звук, свет, техника','unknown',null,
    'Нет подтверждения, что полный технический пакет включён; стоимость требуемого оснащения не установлена');
 }
 return [rental,banquet,equipment,serviceStatus];
}
export function k2PlanningScenarios(v,guests){
 if(v.id!=='k2'||!Array.isArray(v.visitBudgetScenarios))return [];
 const count=Math.max(1,Math.min(300,Math.round(Number(guests)||80)));
 const rent=num(getEntry(v,'rent'));
 if(rent===null)return [];
 const techActual=num(getEntry(v,'technical','tech'));
 const serviceActual=num(getEntry(v,'service'));
 const reserve=v.visitBudgetPlanning||{};
 const tech=techActual??num(reserve.technicalReserve);
 const serviceRate=serviceActual??num(reserve.serviceReservePercent);
 if(tech===null||serviceRate===null)return [];
 return v.visitBudgetScenarios.filter(x=>num(x.menuPerGuest)!==null).map(x=>{
  const menu=Number(x.menuPerGuest)*count;
  const service=menu*serviceRate/100;
  const total=Math.round(rent+menu+tech+service);
  return {
   id:x.id,name:x.name,comment:x.comment,sourceTime:x.sourceTime,
   guests:count,rent,menuRate:Number(x.menuPerGuest),menu,tech,serviceRate,service,
   total,technicalEstimated:techActual===null,serviceEstimated:serviceActual===null,menuEstimated:true,
   reserveBasis:reserve.technicalReserveBasis||'',serviceBasis:reserve.serviceReserveBasis||'',
   unresolved:['Питание: условия и состав пакета не утверждены',
    ...(techActual===null?['Техника: использован ориентир другой площадки, а не КП К2']:[]),
    ...(serviceActual===null?['Обслуживание: принята временная ставка, подлежит согласованию']:[]),
    'Напитки, welcome, работа отдельных подрядчиков: возможные расходы уточняются']
  };
 });
}
/* Chosen working budgets for 80 guests (dynamic for any guest count).
   Confirmed rates come from individual venue records and organizer materials.
   Any chosen reserve is identified as an assumption, not a supplier quotation.
   Deposits replace covered food/drink spend; they are never added twice. */
export const VENUE_WORKING_BUDGETS={
 'milyutin':{rent:99750,menu:4500,service:10,tech:80000,drinks:40000,alcohol:60000,corkage:500,drinkersRatio:.625,cake:30000,decor:50000,
  note:'7 ч × 14 250 ₽/ч аренды из расшифровки осмотра (порог более 5 ч; состав залов уточнить). Меню 4 500 ₽/чел и техника 80 000 ₽ — из переписки. Сервис 10%, напитки, алкоголь, торт, декор и 50 пьющих — рабочие допущения, не тарифы площадки.'},
 'glukhovsky':{rent:0,menu:5000,service:10,tech:25000,drinks:40000,alcohol:60000,corkage:650,drinkersRatio:.625,cake:30000,decor:50000,
  note:'Меню 5 000 ₽/гость, аренда 0 и 10% сервис из сообщения менеджера. Для дискозоны во втором зале заложено 25 000 ₽ на дополнительный свет/звук (неразборчивая реплика 20–30 тыс. из записи; не КП). 50 пьющих × 650 ₽, покупка алкоголя, напитки, торт и декор — выбранные допущения.'},
 'roof18':{rent:0,minSpend:750000,menu:6500,service:10,tech:60000,cake:30000,decor:50000,
  note:'Депозит 750 000 ₽ — сообщён организатором 23.11; отдельная аренда предполагается включённой в депозит (уточнить). В модель заложено меню обычного ресторана 6 500 ₽/гость как допущение, но его сумма НЕ прибавляется к депозиту. Звук/DJ со специалистом ≈ 60 000 ₽ из записи. Обслуживание 10%, торт и декор — резервы. Внутри депозита предполагается выбранный заказ кухни, напитков и бара; погодный сценарий на 80 человек внутри не подтверждён.'},
 'ermolinsky':{rent:430000,menu:7500,service:0,tech:170000,drinks:40000,alcohol:60000,cake:30000,decor:50000,
  note:'Аренда 430 000 ₽, меню 7 500 ₽/гость с обслуживанием и технический пакет от 170 000 ₽ — по персональному КП. Напитки, алкоголь, торт и декор — резерв, не договорные позиции.'},
 'zarenkov-gallery':{rent:30000,menu:4500,service:10,tech:30000,drinks:40000,alcohol:60000,cake:30000,decor:50000,
  note:'Аренда от 30 000 ₽, меню от 4 500 ₽/гость из собранных данных. Звук/свет на площадке есть; 30 000 ₽ оставлено как резерв на дискотечное дополнение, не подтверждённая аренда. Сервис 10%, напитки, алкоголь, торт и декор — плановые допущения.'},
 'palma':{rent:360000,menu:4700,service:10,tech:0,welcome:40000,drinks:40000,alcohol:60000,staff:20000,cake:30000,decor:50000,
  note:'Выбран Eat Catering №1: 4 700 ₽/гость, аренда 360 000 ₽, сервис 10% на банкет. Базовые свет/звук и техперсонал входят. Фуршет 40 000 ₽, безалкогольные 40 000 ₽, алкоголь 60 000 ₽, дополнительный персонал 20 000 ₽, торт 30 000 ₽ и декор 50 000 ₽ — резервы; налогообложение/сервис на добавленные позиции уточнить.'},
 'panorama':{rent:150000,menu:7800,service:10,tech:0,drinks:60000,alcohol:60000,cake:30000,decor:50000,
  note:'Аренда 150 000 ₽, меню 7 800 ₽, 10% сервис; штатная техника включена. Обязательные 80 л безалкогольного из меню 2026: 40 л воды ×550 ₽ +40 л морса ×950 ₽=60 000 ₽ (цены 2027 уточнить). Свой алкоголь без сбора; закупка алкоголя, торт и декор — резервы. Депозит не добавлять поверх меню.'},
 'eva':{rent:90000,menu:5000,service:10,tech:0,drinks:38000,alcohol:60000,cake:4500,decor:50000,
  note:'90 000 ₽ аренда, 5 000 ₽/гость меню, сервис 10%, штатная техника включена. Безалкогольные: вода 40 л ×250 ₽ + морс 40 л ×700 ₽ по прайсу 2027; алкоголь без пробкового сбора, тортовый сбор 4 500 ₽, декор 50 000 ₽ (резерв). Депозит 350 000 ₽ расходуется на меню, не прибавлять.'},
 'petr':{rent:0,menu:4500,service:10,tech:35000,drinks:40000,alcohol:60000,cake:30000,decor:50000,
  note:'Зал без отдельной аренды, меню 4 500 ₽/гость, сервис 10%, техника от 35 000 ₽. Свой алкоголь без пробкового сбора. Напитки, закупка алкоголя, торт и декор — рабочие резервы; два зала остаются минусом для единой программы.'},
 'maryino':{rent:250000,menu:6500,service:10,tech:80000,drinks:40000,alcohol:60000,cake:30000,decor:50000,
  note:'Белый зал 250 000 ₽, публичное меню от 6 500 ₽/гость. Сервис 10%, техника 80 000 ₽, напитки, алкоголь, торт и декор — допущения для сравнения, не подтверждённые условия усадьбы. Трансфер не заложен.'},
 'repino-riviera':{rent:1000000,menu:6500,service:10,tech:0,drinks:40000,alcohol:60000,cake:30000,decor:50000,
  note:'По переписке: два варианта залов с террасой, каждый «около миллиона плюс еда»; для сценария принята аренда 1 млн ₽. В присланной свадебной презентации есть меню 5 500/6 500 ₽ на персону; выбран вариант 6 500 ₽. Сервис 10%, напитки, алкоголь, торт и декор — рабочие допущения. В презентации указано базовое оснащение, но выбранный состав нужно сверить.'},
 'bali':{rent:150000,menu:5500,service:10,tech:60000,drinks:40000,alcohol:60000,cake:30000,decor:50000,
  note:'По Bali есть лишь сообщение «сильно дешевле» и ссылка на банкет, без индивидуального прайса. ВСЕ ставки (150 тыс. аренда, 5 500 ₽/гость, 10% сервис, 60 тыс. техника, напитки/алкоголь, торт и декор) — сравнительные предположения, а не утверждения ресторана.'},
 'ambassador':{rent:200000,menu:6500,service:10,tech:80000,drinks:40000,alcohol:60000,cake:30000,decor:50000,
  note:'По Амбассадор Ивент в переписке нет числового КП. ВЕСЬ бюджет — рабочая гипотеза: 200 тыс. аренда, 6 500 ₽/гость, 10% сервис, 80 тыс. техника, стандартные напитки, алкоголь, торт и декор. Не выдавать за предложение площадки.'}
};
function workingBudget(v,guests){
 const spec=VENUE_WORKING_BUDGETS[v.id];
 if(!spec)return null;
 const count=Math.max(1,Math.min(300,Math.round(Number(guests)||80)));
 const price=VENUE_PRICING[v.id]||{};
 const own=k=>num(v.cost?.[k]);
 const includedCost=x=>included(x);
 const menuRate=own('menu')??spec.menu;
 const rent=own('rent')??spec.rent;
 const serviceRate=own('service')??(includedCost(price.service?.value)?0:(num(price.service?.value)??spec.service));
 const tech=own('technical')??spec.tech??0;
 const variable=(fixed,key)=>Math.round((fixed||0)*count/80);
 const food=Math.round(menuRate*count);
 const welcome=variable(spec.welcome,'welcome');
 const drinks=variable(spec.drinks,'drinks');
 const covered=Math.max(food+welcome+drinks,num(v.cost?.minSpend)??spec.minSpend??0);
 const amountService=Math.round((spec.serviceOnAllFood?covered:Math.max(food,covered-(drinks+welcome)))*serviceRate/100);
 const alcohol=variable(spec.alcohol,'alcohol');
 const cake=spec.cake??0;
 const decor=spec.decor??0;
 const staff=variable(spec.staff,'staff');
 const drinkers=spec.corkage?Math.round(count*(spec.drinkersRatio||.625)):0;
 const corkage=drinkers*(spec.corkage||0);
 const items=[
  {label:'Аренда (выбранный вариант)',amount:rent},
  {label:'Банкет: '+menuRate.toLocaleString('ru-RU')+' ₽ × '+count,amount:food},
  ...(welcome?[{label:'Приветственный фуршет (план)',amount:welcome}]:[]),
  ...(drinks?[{label:'Безалкогольные напитки (план)',amount:drinks}]:[]),
  ...(covered>food+welcome+drinks?[{label:'Доведение заказа до минимального депозита (не сверху)',amount:covered-food-welcome-drinks}]:[]),
  {label:'Обслуживание '+serviceRate+'%',amount:amountService},
  ...(tech?[{label:'Технический пакет / доп. свет и звук',amount:tech}]:[]),
  ...(staff?[{label:'Дополнительный обслуживающий персонал (план)',amount:staff}]:[]),
  ...(alcohol?[{label:'Покупка алкоголя (план)',amount:alcohol}]:[]),
  ...(corkage?[{label:'Пробковый сбор: '+drinkers+' пьющих × '+spec.corkage+' ₽',amount:corkage}]:[]),
  ...(cake?[{label:'Торт / тортовый сбор (план)',amount:cake}]:[]),
  ...(decor?[{label:'Декор (план)',amount:decor}]:[])
 ];
 const sum=Math.round(rent+covered+amountService+tech+staff+alcohol+corkage+cake+decor);
 if(sum!==items.reduce((t,x)=>t+x.amount,0))throw Error('Planning venue budget mismatch: '+v.id);
 return {value:sum,knownSubtotal:sum,partial:true,isQuote:false,kind:'planning',items,
  missing:[],note:'Сценарий для сравнения, не договорная смета. '+spec.note};
}

export function planningEstimate(v,guests){
 const hasOwnMenu=num(v.cost?.menu)!==null;
 const budget=VENUE_WORKING_BUDGETS[v.id];
 // A genuinely revised banquet rate must override a default working scenario.
 if(hasOwnMenu&&(!budget||num(v.cost.menu)!==budget.menu))return null;
 const plan=k2PlanningScenarios(v,guests)[0];
 if(!plan)return workingBudget(v,guests);
 return {
  value:plan.total,knownSubtotal:plan.rent,partial:true,isQuote:false,
  kind:'planning',missing:['условия техники','сервис','окончательное меню','дополнительные услуги'],
  note:'Плановый бюджет, не предложение К2: аренда '+rub(plan.rent)+
   ', банкет '+rub(plan.menu)+', резерв техники '+rub(plan.tech)+
   ', резерв обслуживания '+rub(plan.service)+'. Техника и сервис не подтверждены.'
 };
}
