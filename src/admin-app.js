import {showAdminToast} from './admin-toast.js';
import {renderVenueAdmin,activateVenueAdmin} from './venues.js';
import {activateAdminData} from './admin-data-ui.js';
import {activatePhotoArchive} from './admin-photos.js';
import {activateGuestDirectory} from './admin-guests.js';
import {adminModules,weddingDays} from './data.js';
import {VENUE_RECORDS} from './venues-data.js';
const app=document.querySelector('#app');
const themeKey='wedding-admin-theme';
const systemTheme=window.matchMedia?.('(prefers-color-scheme: dark)')||{matches:false};
let themePreference=null;
try{const saved=localStorage.getItem(themeKey);if(saved==='light'||saved==='dark')themePreference=saved}catch{}
function applyAdminTheme(){
 const mode=themePreference||(systemTheme.matches?'dark':'light');
 document.documentElement.dataset.adminTheme=mode;
 const toggle=document.querySelector('#admin-theme-toggle');
 if(toggle){
   const dark=mode==='dark';
   toggle.setAttribute('aria-pressed',String(dark));
   toggle.dataset.preference=themePreference||'auto';
   const modeLabel=themePreference==='dark'?'Тёмная':themePreference==='light'?'Светлая':'Системная';
   toggle.setAttribute('aria-label','Тема: '+modeLabel+'. Нажмите для смены режима');
   toggle.title='Тема: '+modeLabel+' · авто → светлая → тёмная';
   toggle.innerHTML=dark?'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/></svg>':'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20.5 15.5A9 9 0 0 1 8.5 3.5 9 9 0 1 0 20.5 15.5Z"/></svg>';
 }
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',mode==='dark'?'#151d18':'#ffffff');
}
applyAdminTheme();
systemTheme.addEventListener?.('change',()=>{if(!themePreference)applyAdminTheme()});
window.addEventListener('storage',event=>{if(event.key===themeKey){themePreference=['light','dark'].includes(event.newValue)?event.newValue:null;applyAdminTheme()}});
app.addEventListener('click',event=>{
 if(!event.target.closest('#admin-theme-toggle'))return;
 themePreference=themePreference===null?'light':themePreference==='light'?'dark':null;
 try{if(themePreference)localStorage.setItem(themeKey,themePreference);else localStorage.removeItem(themeKey)}catch{}
 applyAdminTheme();
});
const escapeHtml=str=>String(str??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(path,title,className='')=>`<a href="#${path}" class="${className}">${escapeHtml(title)}</a>`;
const stamp=(t='Дата и место уточняются')=>`<span class="status-stamp"><span class="stamp-dot"></span>${t}</span>`;
const venueIds=Object.keys(VENUE_RECORDS);
const venueSummary={
 total:venueIds.length,
 inspected:venueIds.filter(id=>VENUE_RECORDS[id].visited===true).length,
 quotes:venueIds.filter(id=>VENUE_RECORDS[id].quotes?.length>0).length
};
const mobileNavMedia=window.matchMedia?.('(max-width: 900px)');
function setMobileNav(open,{restoreFocus=true}={}){
 const layout=app.querySelector('.admin-layout'),button=app.querySelector('#admin-menu-toggle'),panel=app.querySelector('#admin-navigation'),main=app.querySelector('.admin-main');
 if(!layout||!button||!panel||!main)return;
 const visible=!!open&&!!mobileNavMedia?.matches;
 layout.toggleAttribute('data-mobile-nav-open',visible);
 button.setAttribute('aria-expanded',String(visible));
 if(mobileNavMedia?.matches){
   panel.inert=!visible;
   main.inert=visible;
 }else{panel.inert=false;main.inert=false}
 if(visible)panel.querySelector('[data-admin-menu-close]')?.focus();
 else if(restoreFocus&&mobileNavMedia?.matches)button.focus();
}
mobileNavMedia?.addEventListener?.('change',()=>setMobileNav(false,{restoreFocus:false}));
app.addEventListener('click',event=>{
 const target=event.target.closest?.('#admin-menu-toggle,[data-admin-menu-close],.admin-side .side-link,.admin-side .admin-brand');
 if(!target)return;
 if(target.id==='admin-menu-toggle')setMobileNav(target.getAttribute('aria-expanded')!=='true');
 else if(app.querySelector('.admin-layout')?.hasAttribute('data-mobile-nav-open'))setMobileNav(false,{restoreFocus:target.hasAttribute('data-admin-menu-close')});
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&app.querySelector('.admin-layout')?.hasAttribute('data-mobile-nav-open')){
   event.preventDefault();setMobileNav(false);
 }
});
// Shared, non-collapsible navigation groups. Route IDs remain unchanged.
const sidebarGroups=[
 {title:'УПРАВЛЕНИЕ',ids:['overview','budget','tasks']},
 {title:'ОРГАНИЗАЦИЯ',ids:['venues','vendors','decor','menu','schedule']},
 {title:'ГОСТИ И МАТЕРИАЛЫ',ids:['guests','photos']}
];
const sidebarIcons={
 overview:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 budget:'<path d="M20 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6"/><path d="M22 12h-5a2 2 0 0 0 0 4h5"/><path d="M17 14h.01"/>',
 tasks:'<path d="m3 6 2 2 4-4M11 6h10M3 12l2 2 4-4m2 2h10M3 18l2 2 4-4m2 2h10"/>',
 venues:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 vendors:'<path d="m2 12 4-6 5 2m11 4-4-6-5 2-4 4a2 2 0 0 0 3 2l2-2 6 5M4 13l5 5a2 2 0 0 0 3 0m-1-3 3 3a2 2 0 0 0 3 0m-2-4 3 3a2 2 0 0 0 3-2"/>',
 decor:'<circle cx="12" cy="12" r="3"/><path d="M12 9C8 9 7 4 10 3c2-1 4 1 4 4 3-3 7-1 7 2 0 2-2 4-5 4 4 2 3 6 0 7-2 1-4-1-4-5-2 4-6 4-8 1-1-2 1-4 5-4-4-1-5-5-2-7 2-1 4 1 5 4Z"/>',
 menu:'<path d="M3 2v7a4 4 0 0 0 8 0V2M7 2v20M21 2c-4 0-6 5-6 10h6m0-10v20"/>',
 schedule:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><circle cx="15" cy="15.5" r="3"/><path d="M15 14v1.5l1 1"/>',
 guests:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="10" cy="7" r="4"/>',
 photos:'<rect x="5" y="5" width="16" height="16" rx="2"/><path d="M3 17H2V3a1 1 0 0 1 1-1h14v1m4 13-4-4-7 9"/><circle cx="10" cy="10" r="1.5"/>',
 settings:'<path d="m9 3 .6 2.3 2.4 1 2.4-1L15 3l3 1.7-.7 2.3 1.3 2.1 2.4.6v3.6l-2.4.6-1.3 2.1.7 2.3-3 1.7-.6-2.3-2.4-1-2.4 1L9 20l-3-1.7.7-2.3-1.3-2.1-2.4-.6V9.7l2.4-.6L6.7 7 6 4.7 9 3Z"/><circle cx="12" cy="11.5" r="3"/>'
};
const sidebarIcon=id=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(sidebarIcons[id]||'')+'</svg>';
function adminSidebar(active){
 const items=adminModules.filter(m=>m.id!=='settings');
 const byId=new Map(items.map(m=>[m.id,m]));
 const settings=adminModules.find(m=>m.id==='settings');
 const navLink=m=>`<a href="#/admin/${m.id}" class="side-link ${active===m.id?'selected':''}" ${active===m.id?'aria-current="page"':''}><span class="side-icon" aria-hidden="true">${sidebarIcon(m.id)}</span><span class="side-label">${escapeHtml(m.label)}</span></a>`;
 return `<aside class="admin-side" id="admin-navigation" aria-label="Навигация">
   <div class="admin-brand-row"><a href="#/admin/overview" class="admin-brand"><span class="admin-brand-logo">НК</span><span>Wedding</span></a></div>
   <button type="button" class="admin-menu-close" data-admin-menu-close aria-label="Закрыть меню"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
   <nav aria-label="Разделы админки">${sidebarGroups.map((group,i)=>`<div class="side-group" role="group" aria-labelledby="side-group-${i}"><div class="side-group-title" id="side-group-${i}">${group.title}</div>${group.ids.map(id=>byId.get(id)).filter(Boolean).map(navLink).join('')}</div>`).join('')}</nav>
   <div class="admin-settings-footer">${settings?navLink(settings):''}<button id="admin-theme-toggle" class="admin-theme-toggle" type="button" aria-label="Переключить тему"></button></div>
 </aside>`;
}
function adminOverview(){
 return `<div class="dashboard-heading admin-page-heading"><div><div class="eyebrow">ПОДГОТОВКА СВАДЬБЫ</div><h1>Никита и Кристина</h1><p>Площадки, условия и бюджет праздника</p></div></div>
 <div class="metrics-grid">
  <article class="metric"><span>Площадок</span><strong>${venueSummary.total}</strong><small>В сравнении</small></article>
  <article class="metric"><span>Посмотрели</span><strong>${venueSummary.inspected}</strong><small>По материалам осмотров</small></article>
  <article class="metric"><span>Гостевая галерея</span><strong>—</strong><small>Только специально отобранные фотографии</small></article>
  <article class="metric"><span>Полученных смет</span><strong>${venueSummary.quotes}</strong><small>С полным указанным итогом</small></article>
 </div>
 <div class="admin-columns">
  <section class="admin-panel"><div class="panel-header"><h2>Сравнение площадок</h2></div>
   <p><b>17 июня, 14:00</b> — регистрация в Марьино. <b>19 июня</b> — торжественная часть в Санкт-Петербурге. Площадка ещё выбирается.</p>
   <p><a class="text-link" href="#/admin/venues">Открыть все площадки →</a></p>
  </section>
  <section class="admin-panel"><div class="panel-header"><h2>Гостевые фотографии и документы</h2></div>
   <p>Фотографии осмотров, предложения менеджеров и документы собраны в Wedding Drive.</p>
   <p><a class="text-link" href="https://drive.google.com/drive/folders/195OYX_CPglwFmwSqwzRhQt7yrYyIPeBi" target="_blank" rel="noopener noreferrer">Открыть Wedding Drive ↗</a></p>
  </section>
 </div>`;
}
function adminProgram(){
 return `<div class="dashboard-heading admin-page-heading"><div><div class="eyebrow">17—19 ИЮНЯ 2027</div><h1>Программа свадьбы</h1><p>Три дня · место торжества выбирается</p></div></div>
 <div class="ad-wedding-days">${weddingDays.map((day,i)=>`<article class="ad-day-card"><div class="ad-day-number">0${i+1}</div><div class="ad-day-date"><span>${day.weekday}</span><strong>${day.label}</strong></div><div class="ad-day-content"><h2>${escapeHtml(day.title)}</h2><p>${escapeHtml(day.description)}</p><div class="ad-day-facts"><span>${day.time||'Время уточняется'}</span><span>${escapeHtml(day.place||'Место не определено')}</span></div></div></article>`).join('')}</div>`;
}
function adminGeneric(active){const m=adminModules.find(m=>m.id===active);if(!m)return adminOverview();if(active==='guests')return '';if(active==='venues')return renderVenueAdmin();if(active==='overview')return adminOverview();if(active==='schedule')return adminProgram();if(active==='settings')return '';return `<div class="dashboard-heading admin-page-heading"><div><div class="eyebrow">ОРГАНИЗАЦИЯ</div><h1>${m.label}</h1><p>${m.text}</p></div></div><div class="admin-panel module-empty"><div class="module-symbol">${m.icon}</div><h2>${m.label}</h2></div>`;}
function admin(active='overview'){
 const label=active==='overview'?'Никита и Кристина':adminModules.find(m=>m.id===active)?.label||'Обзор';
 return `<div class="admin-layout" data-admin-section="${escapeHtml(active)}"><header class="admin-mobile-bar"><button type="button" id="admin-menu-toggle" aria-label="Открыть меню" aria-expanded="false" aria-controls="admin-navigation"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><span class="admin-mobile-title">${escapeHtml(label)}</span><div class="admin-mobile-actions"></div></header><button type="button" class="admin-menu-backdrop" data-admin-menu-close aria-label="Закрыть меню" tabindex="-1"></button>${adminSidebar(active)}<main class="admin-main"><div class="admin-content">${adminGeneric(active)}</div></main></div>`;
}


// One popup for all single-choice controls, including dynamically rendered forms.
// Keep the actual select in place for form values, labels, validation and existing handlers.
const adminSelectSelector='select:not([multiple]):not([size]),select[size="1"]:not([multiple])';
let selectPopup=null,selectTypeahead='',selectTypeTime=0;
function adminSelectTarget(target){
 const select=target?.closest?.(adminSelectSelector);
 return select&&!select.disabled&&select.closest('.admin-body')?select:null;
}
function closeAdminSelect(){
 if(!selectPopup)return;
 const {select,menu}=selectPopup;selectPopup=null;
 select.removeAttribute('aria-controls');select.removeAttribute('aria-activedescendant');
 select.setAttribute('aria-expanded','false');
 menu.remove();
}
function positionAdminSelect(){
 if(!selectPopup)return;
 const {select,menu}=selectPopup;
 if(!select.isConnected){closeAdminSelect();return}
 const r=select.getBoundingClientRect(),vw=window.innerWidth,vh=window.innerHeight;
 if(r.bottom<0||r.top>vh||r.right<0||r.left>vw){closeAdminSelect();return}
 const width=Math.min(vw-16,Math.max(196,r.width));
 menu.style.width=width+'px';
 menu.style.left=Math.max(8,Math.min(r.left,vw-width-8))+'px';
 const below=vh-r.bottom-12,above=r.top-12,up=below<Math.min(menu.scrollHeight+8,260)&&above>below;
 const limit=Math.max(40,Math.min(320,up?above:below));
 menu.style.maxHeight=limit+'px';
 menu.style.top=(up?Math.max(8,r.top-6-Math.min(menu.scrollHeight+2,limit)):r.bottom+6)+'px';
}
function highlightAdminOption(index,scroll=true){
 if(!selectPopup)return;
 const {select,rows}=selectPopup;
 if(index<0||index>=rows.length||rows[index].disabled)return;
 selectPopup.index=index;
 rows.forEach((row,i)=>row.classList.toggle('is-highlighted',i===index));
 select.setAttribute('aria-activedescendant',rows[index].id);
 if(scroll)rows[index].scrollIntoView({block:'nearest'});
}
function commitAdminSelect(index){
 if(!selectPopup)return;
 const {select,rows}=selectPopup;
 if(!rows[index]||rows[index].disabled)return;
 const old=select.selectedIndex;
 closeAdminSelect();
 if(!select.isConnected)return;
 select.selectedIndex=index;
 select.focus({preventScroll:true});
 if(old!==index){
  select.dispatchEvent(new Event('input',{bubbles:true}));
  select.dispatchEvent(new Event('change',{bubbles:true}));
 }
}
function openAdminSelect(select){
 if(selectPopup?.select===select)return;
 closeAdminSelect();
 select.focus({preventScroll:true});
 const menu=document.createElement('div');
 menu.className='admin-select-popup';menu.id='admin-select-popup';
 menu.setAttribute('role','listbox');
 menu.setAttribute('aria-label',select.getAttribute('aria-label')||select.labels?.[0]?.textContent?.trim()||'Выберите значение');
 const rows=[];
 const date=select.matches('[data-list-date],.vw-date-edit select');
 let group=null;
 Array.from(select.options).forEach((option,index)=>{
  if(option.parentElement?.tagName==='OPTGROUP'&&option.parentElement!==group){
   group=option.parentElement;const title=document.createElement('div');title.className='admin-select-group';title.textContent=group.label;menu.append(title);
  }
  const row=document.createElement('button');
  row.type='button';row.tabIndex=-1;row.className='admin-select-option';row.id='admin-select-option-'+index;row.setAttribute('role','option');row.setAttribute('aria-selected',String(option.selected));
  row.disabled=option.disabled||(option.parentElement?.tagName==='OPTGROUP'&&option.parentElement.disabled);
  row.classList.toggle('is-selected',option.selected);
  if(date){
   const marker=document.createElement('span');marker.className='admin-select-status';
   marker.dataset.status=option.value;row.append(marker);
  }
  const label=document.createElement('span');label.className='admin-select-option-label';label.textContent=date&&option.value==='unknown'?'Нет подтверждения':option.label;row.append(label);
  const check=document.createElement('span');check.className='admin-select-check';check.setAttribute('aria-hidden','true');check.textContent='✓';row.append(check);
  row.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')event.preventDefault()});
  row.addEventListener('pointermove',event=>{if(event.pointerType==='mouse')highlightAdminOption(index,false)});
  row.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();commitAdminSelect(index)});
  rows.push(row);menu.append(row);
 });
 if(!rows.length)return;
 selectPopup={select,menu,rows,index:-1};
 select.setAttribute('aria-expanded','true');select.setAttribute('aria-controls',menu.id);
 selectTypeahead='';selectTypeTime=0;
 // Use the top layer so the menu is never clipped by a scrolling table or modal.
 const parent=select.closest('dialog[open]')||document.body;
 if(typeof menu.showPopover==='function')menu.setAttribute('popover','manual');
 parent.append(menu);
 if(typeof menu.showPopover==='function'){try{menu.showPopover()}catch{menu.removeAttribute('popover')}}
 positionAdminSelect();
 const initial=rows[select.selectedIndex]&&!rows[select.selectedIndex].disabled?select.selectedIndex:rows.findIndex(row=>!row.disabled);
 highlightAdminOption(initial);
}
document.addEventListener('pointerdown',event=>{
 const select=adminSelectTarget(event.target);
 if(select&&event.button===0){event.preventDefault();openAdminSelect(select);return}
 if(selectPopup&&!selectPopup.menu.contains(event.target))closeAdminSelect();
},true);
document.addEventListener('mousedown',event=>{if(event.button===0&&adminSelectTarget(event.target))event.preventDefault()},true);
document.addEventListener('click',event=>{
 const select=adminSelectTarget(event.target);
 if(select){event.preventDefault();openAdminSelect(select)}
},true);
document.addEventListener('keydown',event=>{
 const select=adminSelectTarget(event.target);
 if(!select)return;
 if(event.key==='Tab'){closeAdminSelect();return}
 if(event.key==='Escape'&&selectPopup){event.preventDefault();event.stopPropagation();closeAdminSelect();return}
 if(['ArrowDown','ArrowUp','Enter',' ','Home','End','F4'].includes(event.key)){
  event.preventDefault();event.stopPropagation();
  if(!selectPopup||selectPopup.select!==select){openAdminSelect(select);return}
  if(event.key==='Enter'||event.key===' '){commitAdminSelect(selectPopup.index);return}
  if(event.key==='F4'){closeAdminSelect();return}
  const {rows,index}=selectPopup;
  const enabled=rows.map((row,i)=>row.disabled?-1:i).filter(i=>i>=0);
  if(!enabled.length)return;
  const n=enabled.indexOf(index);
  highlightAdminOption(event.key==='Home'?enabled[0]:event.key==='End'?enabled.at(-1):enabled[Math.max(0,Math.min(enabled.length-1,n+(event.key==='ArrowUp'?-1:1)))]);
 }else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
  event.preventDefault();event.stopPropagation();
  if(!selectPopup||selectPopup.select!==select)openAdminSelect(select);
  if(!selectPopup)return;
  const now=Date.now();selectTypeahead=(now-selectTypeTime>700?'':selectTypeahead)+event.key.toLocaleLowerCase('ru');selectTypeTime=now;
  const match=selectPopup.rows.findIndex((row,i)=>!row.disabled&&select.options[i].label.toLocaleLowerCase('ru').startsWith(selectTypeahead));
  if(match>=0)highlightAdminOption(match);
 }
},true);
document.addEventListener('focusin',event=>{if(selectPopup&&event.target!==selectPopup.select&&!selectPopup.menu.contains(event.target))closeAdminSelect()},true);
document.addEventListener('scroll',event=>{if(selectPopup&&!selectPopup.menu.contains(event.target))positionAdminSelect()},true);
window.addEventListener('resize',positionAdminSelect);

function render(){
 closeAdminSelect();
 const p=decodeURIComponent((location.hash||'#/admin/overview').slice(1)).replace(/\/+$/,'')||'/admin';
 if(!/^\/admin(?:\/|$)/.test(p)){location.replace('#/admin/overview');return;}
 const section=(p.split('/')[2]||'overview');
 // Old bookmarks and links to the duplicate photo section lead to the single archive.
 if(section==='moderation'){location.replace('#/admin/photos');return;}
 if(!adminModules.some(m=>m.id===section)){location.replace('#/admin/overview');return;}
 // Release any scroll lock left by a drawer on the previous route.
 if(document.documentElement.style)document.documentElement.style.overflow='';
 document.body.classList.remove?.('ad-gb-lock');
 app.innerHTML=admin(section);
 setMobileNav(false,{restoreFocus:false});
 applyAdminTheme();
 if(section==='venues')activateVenueAdmin(app);
 if(section==='photos')activatePhotoArchive(app);
 if(section==='guests')activateGuestDirectory(app);
 activateAdminData(app,section).catch(e=>console.warn('Admin data initialization failed',e));
 document.body.classList.add('admin-body');
 document.title='Никита и Кристина — управление свадьбой';
 window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);
render();

// Release freshness: the live SQLite auto-refresh covers *data*, not JavaScript.
// When REG.RU receives a newer private admin release, detect it without losing
// unsaved guest/venue form edits. Never silently reload an active editor.
const loadedRevision=new URL(import.meta.url).searchParams.get('v')||'';
let latestRevision='',refreshChecking=false,lastNotifiedRevision='';
let editedInThisTab=false;
// Never interrupt a draft just because another release has arrived.
document.addEventListener('input',event=>{
 if(event.target?.matches?.('input,textarea,select,[contenteditable]'))editedInThisTab=true;
},true);
function safeToAutoRefresh(){
 return !editedInThisTab&&!document.querySelector(
  '.vw-rating-drawer,.vdp-inline-form,.vdp-inline-quote-form,.vdp-inline-quote-editor,.ad-gb-lock,[role="dialog"],input:focus,textarea:focus,select:focus,[contenteditable]:focus'
 );
}
function showReleaseBanner(){
 showAdminToast('Сайт обновлён — доступна новая версия.',{
   duration:6000,
   action:{label:'Обновить',onClick:()=>{
     const editing=document.querySelector('.ad-gb-lock')||
       document.querySelector('form input:focus,form textarea:focus,form select:focus');
     if(editing&&!confirm('Обновить сайт? Несохранённые изменения могут потеряться.'))return;
     location.reload();
   }}
 });
}
async function checkRelease(){
 if(!loadedRevision||refreshChecking||document.visibilityState!=='visible')return;
 refreshChecking=true;
 try{
   const response=await fetch('/build-info.json?_='+Date.now(),{cache:'no-store',credentials:'same-origin'});
   if(!response.ok)return;
   const info=await response.json();
   latestRevision=String(info?.revision||'');
   if(latestRevision&&latestRevision!==loadedRevision){
     // The old JavaScript cannot hot-swap itself. Refresh an untouched tab
     // automatically; otherwise offer a reload without discarding user input.
     const key='wedding-admin-auto-refreshed-'+latestRevision;
     let alreadyRefreshed=false;
     try{alreadyRefreshed=sessionStorage.getItem(key)==='1';}catch{}
     if(safeToAutoRefresh()&&!alreadyRefreshed){
       try{sessionStorage.setItem(key,'1');}catch{}
       location.reload();
       return;
     }
     if(latestRevision!==lastNotifiedRevision){
       lastNotifiedRevision=latestRevision;
       showReleaseBanner();
     }
   }
 }catch{/* Temporary network failure must never break the editor. */}
 finally{refreshChecking=false}
}
setInterval(checkRelease,20000);
window.addEventListener('focus',checkRelease);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkRelease()});
checkRelease();