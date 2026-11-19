/* Supplemental amounts heard during venue visits. These are not final offers.
   Never replace current signed / organizer-entered prices with transcript data.
   Optional extras enter the estimate ONLY after explicit selection. */
const amount=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
export function transcriptAddons(v,guests){
 const count=Math.max(1,Math.min(300,Math.round(Number(guests)||80)));
 const selected=v.visitSelectedAddons||{};
 return (Array.isArray(v.visitAddons)?v.visitAddons:[])
  .filter(x=>x&&typeof x.id==='string'&&amount(x.amount)!==null&&['fixed','perGuest'].includes(x.unit))
  .map(x=>{
   // A replacement equipment configuration charges only the incremental
   // difference from the organizer's current price, never the full package twice.
   const current=amount(v.cost?.[x.alreadyQuotedField]);
   const upgrade=amount(x.upgradeTargetTotal);
   const unitAmount=x.alreadyQuotedField&&upgrade!==null&&current!==null
     ? Math.max(0,upgrade-current) : x.amount;
   return {...x,total:Math.round(unitAmount*(x.unit==='perGuest'?count:1)),
   selected:selected[x.id]===true,
   potentialDuplicate:!!x.category&&Number(v.extras?.[x.category])>0};
  });
}
export function transcriptAddonTotal(v,guests){
 return transcriptAddons(v,guests).reduce((sum,x)=>sum+(x.selected?x.total:0),0);
}
export function transcriptMenuScenarios(v,guests){
 const count=Math.max(1,Math.min(300,Math.round(Number(guests)||80)));
 const rent=amount(v.cost?.rent);
 return (Array.isArray(v.visitBudgetScenarios)?v.visitBudgetScenarios:[])
  .filter(x=>x&&amount(x.menuPerGuest)!==null)
  .map(x=>({...x,guests:count,rent,
   cateringTotal:Math.round(x.menuPerGuest*count),
   indicativeTotal:rent===null?null:Math.round(rent+x.menuPerGuest*count)}));
}
