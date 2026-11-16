import {renderVenueAdmin,activateVenueAdmin} from './venues.js';
import {activateAdminData} from './admin-data-ui.js';
import {adminModules} from './data.js';
const app=document.querySelector('#app');
const escapeHtml=str=>String(str??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(path,title,className='')=>`<a href="#${path}" class="${className}">${escapeHtml(title)}</a>`;
const stamp=(t='Дата и место уточняются')=>`<span class="status-stamp"><span class="stamp-dot"></span>${t}</span>`;
const adminTasks = [
 ['Определиться со стилем сайта','Ожидаем референсы'],
 ['Подтвердить регистрацию','Дата и место предварительные'],
 ['Перенести список гостей','Ожидаем список'],
 ['Исследовать кейтеринг','Нужны источники и реальные цены'],
];
function adminSidebar(active){return `<aside class="admin-side"><a href="#/admin/overview" class="admin-brand"><span class="admin-brand-logo">НК</span><span>Wedding<br/><small>Панель организаторов</small></span></a><div class="side-caption">УПРАВЛЕНИЕ</div><nav aria-label="Разделы админки">${adminModules.map(m=>`<a href="#/admin/${m.id}" class="side-link ${active===m.id?'selected':''}"><span class="side-icon">${m.icon}</span>${m.label}</a>`).join('')}</nav><div class="side-bottom"><span class="side-back">Гостевая версия не опубликована</span></div></aside>`;}
function adminOverview(){return `<div class="dashboard-heading"><div><div class="eyebrow">ПАНЕЛЬ ПОДГОТОВКИ</div><h1>Наша свадьба</h1><p>Никита & Кристина · планирование мероприятия</p></div>${stamp('17 июня 2027 · предварительно')}</div>
 <div class="metrics-grid"><article class="metric"><span>Приглашённых</span><strong>0</strong><small>Список ещё не загружен</small></article><article class="metric"><span>Ответов RSVP</span><strong>0</strong><small>Приглашения не отправлены</small></article><article class="metric"><span>Подрядчиков</span><strong>0</strong><small>Предложения ещё не внесены</small></article><article class="metric"><span>Бюджет</span><strong>—</strong><small>Не определён</small></article></div>
 <div class="admin-columns"><section class="admin-panel"><div class="panel-header"><h2>Следующие шаги</h2></div><div class="task-list">${adminTasks.map(([title,sub])=>`<div class="task-row"><span class="task-circle"></span><div><strong>${title}</strong><small>${sub}</small></div></div>`).join('')}</div></section><section class="admin-panel"><div class="panel-header"><h2>Основные данные</h2></div><dl class="facts"><dt>Дата</dt><dd>17 июня 2027 <span class="pending">предварительно</span></dd><dt>Регистрация</dt><dd>14:00 <span class="pending">предварительно</span></dd><dt>Место</dt><dd>Марьино <span class="pending">не подтверждено</span></dd><dt>Гости</dt><dd>Список готовится</dd></dl></section></div>`;}
function adminCatering(){return `<div class="dashboard-heading"><div><div class="eyebrow">ОРГАНИЗАЦИЯ / ПИТАНИЕ</div><h1>Кейтеринг</h1><p>Сравнение компаний Санкт-Петербурга, Ленобласти и района Тосно.</p></div></div>
 <div class="admin-panel"><div class="panel-header"><h2>Каталог компаний</h2><span class="panel-meta">0 проверенных предложений</span></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Компания</th><th>Формат</th><th>₽ / гость</th><th>Цена на 100</th><th>Что включено</th><th>Источник</th></tr></thead><tbody><tr><td colspan="6" class="table-empty">Каталог пока пуст. Реальные цены будем добавлять только с источником, датой проверки и отметкой о включённых услугах.</td></tr></tbody></table></div></div>
 <div class="admin-panel admin-instruction"><h2>Сравнение кейтеринга</h2><p>Прайсы, обслуживание, мебель, логистика, напитки и дополнительные сборы учитываются отдельно. Для каждого предложения указывается источник.</p></div>`;}
function adminGeneric(active){const m=adminModules.find(m=>m.id===active);if(!m)return adminOverview();if(active==='catering')return adminCatering();if(active==='venues')return renderVenueAdmin();if(active==='overview')return adminOverview();return `<div class="dashboard-heading"><div><div class="eyebrow">ОРГАНИЗАЦИЯ</div><h1>${m.label}</h1><p>${m.text}</p></div></div><div class="admin-panel module-empty"><div class="module-symbol">${m.icon}</div><h2>${m.label}</h2></div>`;}
function admin(active='overview'){return `<div class="admin-layout">${adminSidebar(active)}<main class="admin-main"><div class="admin-topbar"><span>Панель организаторов</span></div><div class="admin-content">${adminGeneric(active)}</div></main></div>`;}

function render(){
 const p=decodeURIComponent((location.hash||'#/admin/overview').slice(1)).replace(/\/+$/,'')||'/admin';
 if(!/^\/admin(?:\/|$)/.test(p)){location.replace('#/admin/overview');return;}
 const section=(p.split('/')[2]||'overview');
 app.innerHTML=admin(section);
 if(section==='venues')activateVenueAdmin(app);
 activateAdminData(app,section).catch(e=>console.warn('Admin data initialization failed',e));
 document.body.classList.add('admin-body');
 document.title='Панель организаторов — Никита и Кристина';
 window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);
render();