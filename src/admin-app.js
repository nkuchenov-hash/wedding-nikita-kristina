import {renderVenueAdmin,activateVenueAdmin} from './venues.js';
import {activateAdminData} from './admin-data-ui.js';
import {adminModules,weddingDays} from './data.js';
import {VENUE_RECORDS} from './venues-data.js';
import {getVenuePhotos} from './venue-detail-ui.js';
const app=document.querySelector('#app');
const escapeHtml=str=>String(str??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(path,title,className='')=>`<a href="#${path}" class="${className}">${escapeHtml(title)}</a>`;
const stamp=(t='Дата и место уточняются')=>`<span class="status-stamp"><span class="stamp-dot"></span>${t}</span>`;
const venueIds=Object.keys(VENUE_RECORDS);
const venuePhotos=venueIds.map(id=>getVenuePhotos({id}));
const venueSummary={
 total:venueIds.length,
 inspected:venueIds.filter(id=>VENUE_RECORDS[id].visited===true).length,
 withPhotos:venuePhotos.filter(photos=>photos.length>0).length,
 photos:venuePhotos.reduce((sum,photos)=>sum+photos.length,0),
 quotes:venueIds.filter(id=>VENUE_RECORDS[id].quotes?.length>0).length
};
function adminSidebar(active){return `<aside class="admin-side"><a href="#/admin/overview" class="admin-brand"><span class="admin-brand-logo">НК</span><span>Wedding<br/><small>Панель организаторов</small></span></a><div class="side-caption">УПРАВЛЕНИЕ</div><nav aria-label="Разделы админки">${adminModules.map(m=>`<a href="#/admin/${m.id}" class="side-link ${active===m.id?'selected':''}"><span class="side-icon">${m.icon}</span>${m.label}</a>`).join('')}</nav></aside>`;}
function adminOverview(){
 return `<div class="dashboard-heading"><div><div class="eyebrow">ПОДГОТОВКА СВАДЬБЫ</div><h1>Никита и Кристина</h1><p>Площадки, условия и бюджет праздника</p></div></div>
 <div class="metrics-grid">
  <article class="metric"><span>Площадок</span><strong>${venueSummary.total}</strong><small>В сравнении</small></article>
  <article class="metric"><span>Посмотрели</span><strong>${venueSummary.inspected}</strong><small>По материалам осмотров</small></article>
  <article class="metric"><span>Фотографий</span><strong>${venueSummary.photos}</strong><small>Из ${venueSummary.withPhotos} альбомов</small></article>
  <article class="metric"><span>Полученных смет</span><strong>${venueSummary.quotes}</strong><small>С полным указанным итогом</small></article>
 </div>
 <div class="admin-columns">
  <section class="admin-panel"><div class="panel-header"><h2>Сравнение площадок</h2></div>
   <p><b>17 июня, 14:00</b> — регистрация в Марьино. <b>19 июня</b> — торжественная часть в Санкт-Петербурге. Площадка ещё выбирается.</p>
   <p><a class="text-link" href="#/admin/venues">Открыть все площадки →</a></p>
  </section>
  <section class="admin-panel"><div class="panel-header"><h2>Материалы свадьбы</h2></div>
   <p>Фотографии осмотров, предложения менеджеров и документы собраны в Wedding Drive.</p>
   <p><a class="text-link" href="https://drive.google.com/drive/folders/195OYX_CPglwFmwSqwzRhQt7yrYyIPeBi" target="_blank" rel="noopener noreferrer">Открыть Wedding Drive ↗</a></p>
  </section>
 </div>`;
}
function adminProgram(){
 return `<div class="dashboard-heading"><div><div class="eyebrow">17—19 ИЮНЯ 2027</div><h1>Программа свадьбы</h1><p>Три дня · место торжества выбирается</p></div></div>
 <div class="ad-wedding-days">${weddingDays.map((day,i)=>`<article class="ad-day-card"><div class="ad-day-number">0${i+1}</div><div class="ad-day-date"><span>${day.weekday}</span><strong>${day.label}</strong></div><div class="ad-day-content"><h2>${escapeHtml(day.title)}</h2><p>${escapeHtml(day.description)}</p><div class="ad-day-facts"><span>${day.time||'Время уточняется'}</span><span>${escapeHtml(day.place||'Место не определено')}</span></div></div></article>`).join('')}</div>`;
}
function adminGeneric(active){const m=adminModules.find(m=>m.id===active);if(!m)return adminOverview();if(active==='venues')return renderVenueAdmin();if(active==='overview')return adminOverview();if(active==='schedule')return adminProgram();return `<div class="dashboard-heading"><div><div class="eyebrow">ОРГАНИЗАЦИЯ</div><h1>${m.label}</h1><p>${m.text}</p></div></div><div class="admin-panel module-empty"><div class="module-symbol">${m.icon}</div><h2>${m.label}</h2></div>`;}
function admin(active='overview'){return `<div class="admin-layout">${adminSidebar(active)}<main class="admin-main"><div class="admin-topbar"><span>Панель организаторов</span></div><div class="admin-content">${adminGeneric(active)}</div></main></div>`;}

function render(){
 const p=decodeURIComponent((location.hash||'#/admin/overview').slice(1)).replace(/\/+$/,'')||'/admin';
 if(!/^\/admin(?:\/|$)/.test(p)){location.replace('#/admin/overview');return;}
 const section=(p.split('/')[2]||'overview');
 if(!adminModules.some(m=>m.id===section)){location.replace('#/admin/overview');return;}
 app.innerHTML=admin(section);
 if(section==='venues')activateVenueAdmin(app);
 activateAdminData(app,section).catch(e=>console.warn('Admin data initialization failed',e));
 document.body.classList.add('admin-body');
 document.title='Панель организаторов — Никита и Кристина';
 window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);
render();