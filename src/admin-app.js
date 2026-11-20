import {renderVenueAdmin,activateVenueAdmin} from './venues.js';
import {activateAdminData} from './admin-data-ui.js';
import {activatePhotoArchive} from './admin-photos.js';
import {activateGuestDirectory} from './admin-guests.js';
import {adminModules,weddingDays} from './data.js';
import {VENUE_RECORDS} from './venues-data.js';
const app=document.querySelector('#app');
const escapeHtml=str=>String(str??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(path,title,className='')=>`<a href="#${path}" class="${className}">${escapeHtml(title)}</a>`;
const stamp=(t='Дата и место уточняются')=>`<span class="status-stamp"><span class="stamp-dot"></span>${t}</span>`;
const venueIds=Object.keys(VENUE_RECORDS);
const venueSummary={
 total:venueIds.length,
 inspected:venueIds.filter(id=>VENUE_RECORDS[id].visited===true).length,
 quotes:venueIds.filter(id=>VENUE_RECORDS[id].quotes?.length>0).length
};
function adminSidebar(active){
 const items=adminModules.filter(m=>m.id!=='settings');
 const settings=adminModules.find(m=>m.id==='settings');
 const navLink=m=>`<a href="#/admin/${m.id}" class="side-link ${active===m.id?'selected':''}"><span class="side-icon">${m.icon}</span>${m.label}</a>`;
 return `<aside class="admin-side">
   <a href="#/admin/overview" class="admin-brand"><span class="admin-brand-logo">НК</span><span>Wedding<br/><small>Панель организаторов</small></span></a>
   <div class="side-caption">УПРАВЛЕНИЕ</div>
   <nav aria-label="Разделы админки">${items.map(navLink).join('')}</nav>
   ${settings?`<div class="admin-settings-footer">${navLink(settings)}</div>`:''}
 </aside>`;
}
function adminOverview(){
 return `<div class="dashboard-heading"><div><div class="eyebrow">ПОДГОТОВКА СВАДЬБЫ</div><h1>Никита и Кристина</h1><p>Площадки, условия и бюджет праздника</p></div></div>
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
 return `<div class="dashboard-heading"><div><div class="eyebrow">17—19 ИЮНЯ 2027</div><h1>Программа свадьбы</h1><p>Три дня · место торжества выбирается</p></div></div>
 <div class="ad-wedding-days">${weddingDays.map((day,i)=>`<article class="ad-day-card"><div class="ad-day-number">0${i+1}</div><div class="ad-day-date"><span>${day.weekday}</span><strong>${day.label}</strong></div><div class="ad-day-content"><h2>${escapeHtml(day.title)}</h2><p>${escapeHtml(day.description)}</p><div class="ad-day-facts"><span>${day.time||'Время уточняется'}</span><span>${escapeHtml(day.place||'Место не определено')}</span></div></div></article>`).join('')}</div>`;
}
function adminGeneric(active){const m=adminModules.find(m=>m.id===active);if(!m)return adminOverview();if(active==='guests')return '';if(active==='venues')return renderVenueAdmin();if(active==='overview')return adminOverview();if(active==='schedule')return adminProgram();if(active==='settings')return '';return `<div class="dashboard-heading"><div><div class="eyebrow">ОРГАНИЗАЦИЯ</div><h1>${m.label}</h1><p>${m.text}</p></div></div><div class="admin-panel module-empty"><div class="module-symbol">${m.icon}</div><h2>${m.label}</h2></div>`;}
function admin(active='overview'){return `<div class="admin-layout">${adminSidebar(active)}<main class="admin-main">${active==='schedule'||active==='guests'?'':'<div class="admin-topbar"><span>Панель организаторов</span></div>'}<div class="admin-content">${adminGeneric(active)}</div></main></div>`;}

function render(){
 const p=decodeURIComponent((location.hash||'#/admin/overview').slice(1)).replace(/\/+$/,'')||'/admin';
 if(!/^\/admin(?:\/|$)/.test(p)){location.replace('#/admin/overview');return;}
 const section=(p.split('/')[2]||'overview');
 // Old bookmarks and links to the duplicate photo section lead to the single archive.
 if(section==='moderation'){location.replace('#/admin/photos');return;}
 if(!adminModules.some(m=>m.id===section)){location.replace('#/admin/overview');return;}
 app.innerHTML=admin(section);
 if(section==='venues')activateVenueAdmin(app);
 if(section==='photos')activatePhotoArchive(app);
 if(section==='guests')activateGuestDirectory(app);
 activateAdminData(app,section).catch(e=>console.warn('Admin data initialization failed',e));
 document.body.classList.add('admin-body');
 document.title='Панель организаторов — Никита и Кристина';
 window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);
render();

// Release freshness: the live SQLite auto-refresh covers *data*, not JavaScript.
// When REG.RU receives a newer private admin release, detect it without losing
// unsaved guest/venue form edits. Never silently reload an active editor.
const loadedRevision=new URL(import.meta.url).searchParams.get('v')||'';
let latestRevision='',refreshChecking=false,lastNotifiedRevision='';
function showReleaseBanner(){
 document.querySelector('#ad-release-banner')?.remove();
 const toast=document.createElement('div');toast.id='ad-release-banner';
 toast.setAttribute('role','status');
 Object.assign(toast.style,{
   position:'fixed',bottom:'max(20px,env(safe-area-inset-bottom))',
   left:'50%',transform:'translateX(-50%)',
   width:'max-content',maxWidth:'calc(100% - 28px)',
   zIndex:'2147483600',background:'#204b37',color:'#fff',
   borderRadius:'12px',boxShadow:'0 10px 26px #0003',
   padding:'11px 15px',display:'flex',alignItems:'center',gap:'12px',
   font:'500 13px/1.4 system-ui,Arial,sans-serif'
 });
 const label=document.createElement('span');
 label.textContent='Сайт обновлён — доступна новая версия.';
 const action=document.createElement('button');action.type='button';
 action.textContent='Обновить';
 Object.assign(action.style,{
   background:'#edf5ec',border:0,borderRadius:'8px',cursor:'pointer',
   padding:'7px 12px',color:'#204b37',fontWeight:'700',whiteSpace:'nowrap'
 });
 action.addEventListener('click',()=>{
   const editing=document.querySelector('.ad-gb-lock')||
     document.querySelector('form input:focus,form textarea:focus,form select:focus');
   if(editing&&!confirm('Обновить сайт? Несохранённые изменения могут потеряться.'))return;
   location.reload();
 });
 toast.append(label,action);document.body.append(toast);
 setTimeout(()=>toast.remove(),5500);
}
async function checkRelease(){
 if(!loadedRevision||refreshChecking||document.visibilityState!=='visible')return;
 refreshChecking=true;
 try{
   const response=await fetch('/build-info.json?_='+Date.now(),{cache:'no-store',credentials:'same-origin'});
   if(!response.ok)return;
   const info=await response.json();
   latestRevision=String(info?.revision||'');
   if(latestRevision&&latestRevision!==loadedRevision&&latestRevision!==lastNotifiedRevision){
     lastNotifiedRevision=latestRevision;
     showReleaseBanner();
   }
 }catch{/* Temporary network failure must never break the editor. */}
 finally{refreshChecking=false}
}
setInterval(checkRelease,20000);
window.addEventListener('focus',checkRelease);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkRelease()});
checkRelease();