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
export function planningEstimate(v,guests){
 const hasOwnMenu=num(v.cost?.menu)!==null;
 if(hasOwnMenu)return null; // A manual correction of the actual banquet rate always wins.
 const plan=k2PlanningScenarios(v,guests)[0];
 if(!plan)return null;
 return {
  value:plan.total,knownSubtotal:plan.rent,partial:true,isQuote:false,
  kind:'planning',missing:['условия техники','сервис','окончательное меню','дополнительные услуги'],
  note:'Плановый бюджет, не предложение К2: аренда '+rub(plan.rent)+
   ', банкет '+rub(plan.menu)+', резерв техники '+rub(plan.tech)+
   ', резерв обслуживания '+rub(plan.service)+'. Техника и сервис не подтверждены.'
 };
}
