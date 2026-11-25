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
function adminSidebar(active){
 const items=adminModules.filter(m=>m.id!=='settings');
 const settings=adminModules.find(m=>m.id==='settings');
 const navLink=m=>`<a href="#/admin/${m.id}" class="side-link ${active===m.id?'selected':''}" ${active===m.id?'aria-current="page"':''}><span class="side-icon" aria-hidden="true">${m.icon}</span>${m.label}</a>`;
 return `<aside class="admin-side" id="admin-navigation" aria-label="Навигация">
   <div class="admin-brand-row"><a href="#/admin/overview" class="admin-brand"><span class="admin-brand-logo">НК</span><span>Wedding</span></a></div>
   <button type="button" class="admin-menu-close" data-admin-menu-close aria-label="Закрыть меню"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button><div class="side-caption">УПРАВЛЕНИЕ</div>
   <nav aria-label="Разделы админки">${items.map(navLink).join('')}</nav>
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

function render(){
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