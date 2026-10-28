import { wedding, sampleGuests, tentativeSchedule, adminModules } from './data.js';

const app = document.querySelector('#app');
const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {home:'/', schedule:'/schedule', guests:'/guests', gallery:'/gallery', info:'/info'};
const nav = [
  ['/', 'Главная'],['/schedule','Программа'],['/guests','Гости'],['/gallery','Фотографии'],['/info','Информация'],
];
const route = () => decodeURIComponent((location.hash || '#/').slice(1)).replace(/\/+$/, '') || '/';
const link = (path, title, className='') => `<a href="#${path}" class="${className}">${escapeHtml(title)}</a>`;
function header(current) {
  return `<header class="site-header"><div class="header-shell">
    <a class="brand" href="#/">Н <span class="mark-amp">&amp;</span> К</a>
    <nav class="desktop-nav" aria-label="Основное меню">${nav.map(([path,txt])=>`<a href="#${path}" class="${current===path?'active':''}" ${current===path?'aria-current="page"':''}>${txt}</a>`).join('')}</nav>
    <a class="header-pill" href="#/info">О свадьбе <span aria-hidden="true">↗</span></a>
  </div></header>`;
}
const dockIcons = {
  '/': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  '/schedule': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h3m-3 4h6"/></svg>',
  '/guests': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m2-15a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/></svg>',
  '/gallery': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg>',
  '/info': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.5"/></svg>',
};
function mobileNav(current){ return `<nav class="mobile-nav app-dock" aria-label="Основная навигация">${nav.map(([path,txt])=>`<a href="#${path}" class="${current===path?'active':''}" ${current===path?'aria-current="page"':''}>${dockIcons[path]}<span>${txt}</span></a>`).join('')}</nav>`; }
function footer(){return `<footer class="site-footer"><span>Никита <span class="amp">&</span> Кристина</span><span>Наша история только начинается</span></footer>`;}
function stamp(t='Дата и место уточняются'){return `<span class="status-stamp"><span class="stamp-dot"></span>${t}</span>`;}
function pageHero(kicker,title,description){return `<section class="page-hero"><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></section>`;}
function home() {
 return `${header('/')}<main>
 <section class="hero hero-photo" aria-labelledby="wedding-title">
  <div class="hero-photo-stage" data-depth-stage aria-hidden="true">
    <div class="depth-layer depth-sky"></div>
    <div class="depth-layer depth-hills"></div>
    <div class="depth-layer depth-estate"><div class="estate-roof"></div><div class="estate-body"><div class="estate-wing"></div><div class="estate-columns"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="estate-wing"></div></div><div class="estate-steps"></div></div>
    <div class="depth-layer depth-trees depth-trees-left"></div><div class="depth-layer depth-trees depth-trees-right"></div>
    <div class="depth-layer depth-lawn"></div>
    <div class="depth-layer depth-photo"></div><div class="depth-layer depth-subject"></div>
  </div>
  <div class="hero-shade" aria-hidden="true"></div>
  <div class="hero-content photo-content">
    <div class="hero-topline"><span class="hero-small-caps">Наша свадьба <span class="gold-spark">✦</span> Усадьба Марьино</span><span class="hero-placeholder-label">Место для нашего фото</span></div>
    <div class="hero-bottomline">
      <div class="hero-title-area">
        <span class="hero-overline">The beginning of forever</span>
        <h1 id="wedding-title"><span>Никита</span><em>&</em><span>Кристина</span></h1>
        <p class="hero-subtitle">Самый важный день — рядом с самыми близкими.</p>
        <div class="hero-date"><span>17 июня 2027</span><span class="sep"></span><span>Усадьба Марьино</span></div>
        <span class="hero-tentative">Дата, время и площадка уточняются</span>
      </div>
      <button type="button" class="hero-scroll-cue" data-scroll-welcome aria-label="Прокрутить к приглашению"><span>Листайте ниже</span><span class="scroll-cue-arrow">↓</span></button>
    </div>
  </div>
</section>
 <section class="intro-section section-wrap" id="welcome"><div><span class="eyebrow">01 / ДЛЯ НАС И ДЛЯ ВАС</span><h2>Наша история<br/><em>продолжается.</em></h2></div><div class="intro-copy"><p>Мы собираем здесь всё самое важное о нашем празднике: время и место, программу, фотографии и людей, с которыми хотим разделить этот день.</p><p>Этот сайт будет меняться по мере подготовки свадьбы.</p>${link('/info','Что нужно знать ↗','text-link')}</div></section>
 <section class="feature-section section-wrap"><div class="section-head"><span class="eyebrow">02 / НА САЙТЕ</span><h2>Всё в одном месте</h2></div><div class="feature-grid">
 <a class="feature-card" href="#/schedule"><span class="feature-index">01</span><span class="feature-icon">◷</span><h3>Программа</h3><p>Что, где и во сколько — без лишних вопросов.</p><span class="card-arrow">↗</span></a>
 <a class="feature-card" href="#/guests"><span class="feature-index">02</span><span class="feature-icon">◉</span><h3>Наши гости</h3><p>Познакомьтесь с теми, кто разделит этот день.</p><span class="card-arrow">↗</span></a>
 <a class="feature-card" href="#/gallery"><span class="feature-index">03</span><span class="feature-icon">▧</span><h3>Фотографии</h3><p>Наши общие моменты до и после свадьбы.</p><span class="card-arrow">↗</span></a></div></section>
 <section class="quote-section"><span class="quote-decor">“</span><p>Самое ценное в этом дне —<br/>люди, с которыми мы его разделим.</p><span class="eyebrow">Н & К</span></section>
 </main>${footer()}${mobileNav('/')}`;
}
function schedule(){return `${header('/schedule')}<main class="inner-page">${pageHero('ПРОГРАММА ДНЯ','Один особенный день.','Здесь появится окончательное расписание — со временем, адресами и полезными подробностями.')}
 <section class="section-wrap schedule-wrap"><div class="schedule-notice">${stamp()}<p>Сейчас указан только предварительный пункт. Остальная программа будет добавлена позже.</p></div>
 <div class="timeline">${tentativeSchedule.map(e=>`<div class="timeline-row"><div class="timeline-time">${escapeHtml(e.time)}</div><div class="timeline-pin"></div><div class="timeline-detail"><span class="eyebrow">${e.tentative?'ПРЕДВАРИТЕЛЬНО':'ПОДТВЕРЖДЕНО'}</span><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(e.place)} · ${escapeHtml(e.note)}</p></div></div>`).join('')}</div></section></main>${footer()}${mobileNav('/schedule')}`;}
function guests(){return `${header('/guests')}<main class="inner-page">${pageHero('НАШИ БЛИЗКИЕ','Люди нашей истории.','Познакомьтесь с гостями и их историями. Каждый приглашённый сможет дополнить свою страницу фотографиями.')}
 <section class="section-wrap"><div class="section-toolbar"><span class="eyebrow">ГОСТЕВОЙ СПИСОК</span><span class="muted-label">Настоящий список ещё не загружен</span></div>
 <div class="guest-grid">${sampleGuests.map(g=>`<a href="#/guests/${encodeURIComponent(g.id)}" class="guest-card"><div class="guest-avatar">?</div><div class="guest-card-text"><span class="sample-pill">ПРИМЕР КАРТОЧКИ</span><h3>${escapeHtml(g.name)}</h3><p>${escapeHtml(g.city)} · ${escapeHtml(g.relation)}</p><span class="text-link">Открыть профиль ↗</span></div></a>`).join('')}</div>
 <div class="empty-note"><span class="empty-note-icon">✧</span><div><strong>Приглашения появятся здесь</strong><p>Настоящих гостей добавим после переноса списка. Личные страницы будут видны только по правилам доступа, согласованным с гостями.</p></div></div></section></main>${footer()}${mobileNav('/guests')}`;}
function guestDetail(id){const g=sampleGuests.find(x=>x.id===id);if(!g) return notFound();return `${header('/guests')}<main class="inner-page guest-page"><div class="section-wrap">${link('/guests','← Все гости','text-link back-link')}<div class="profile-hero"><div class="profile-portrait"><span>?</span></div><div class="profile-content"><div class="eyebrow">ПРОФИЛЬ ГОСТЯ · ДЕМОНСТРАЦИЯ</div><h1>${escapeHtml(g.name)}</h1><div class="profile-tags"><span>⌖ ${escapeHtml(g.city)}</span><span>◉ ${escapeHtml(g.relation)}</span></div><p>${escapeHtml(g.about)}</p></div></div>
 <div class="profile-gallery"><div><span class="eyebrow">ЛИЧНЫЙ АЛЬБОМ</span><h2>Общие моменты</h2></div><div class="empty-note"><span class="empty-note-icon">▧</span><div><strong>Фотографии появятся здесь</strong><p>После подключения безопасной загрузки гости смогут пополнять свои альбомы и общую галерею. Пока загрузка недоступна.</p></div></div></div></div></main>${footer()}${mobileNav('/guests')}`;}
function gallery(){return `${header('/gallery')}<main class="inner-page">${pageHero('НАШИ ВОСПОМИНАНИЯ','Моменты, которые остаются.','Общая фотогалерея — от первых совместных снимков до фотографий свадебного дня.')}
 <section class="section-wrap"><div class="gallery-grid"><div class="gallery-tile tile-one"><span>01</span><strong>До свадьбы</strong></div><div class="gallery-tile tile-two"><span>02</span><strong>Наш день</strong></div><div class="gallery-tile tile-three"><span>03</span><strong>После праздника</strong></div></div><div class="empty-note"><span class="empty-note-icon">↑</span><div><strong>Загрузка фотографий — следующий этап</strong><p>Гости смогут загружать свои снимки после настройки закрытого хранилища и модерации. Сейчас настоящих фотографий на сайте нет.</p></div></div></section></main>${footer()}${mobileNav('/gallery')}`;}
function info(){return `${header('/info')}<main class="inner-page">${pageHero('ПОЛЕЗНАЯ ИНФОРМАЦИЯ','До скорой встречи.','Всё, что поможет подготовиться к празднику.')}
 <section class="section-wrap info-grid"><article class="info-card"><span class="eyebrow">ДАТА И ВРЕМЯ</span><h2>17 июня 2027</h2><p>14:00 · предварительно</p></article><article class="info-card"><span class="eyebrow">МЕСТО</span><h2>Марьино</h2><p>Точный адрес и маршрут появятся после подтверждения площадки.</p></article><article class="info-card"><span class="eyebrow">ПРИГЛАШЕНИЯ</span><h2>Подтверждение участия</h2><p>Личные приглашения и ответы гостей появятся на следующем этапе разработки.</p></article><article class="info-card"><span class="eyebrow">ВОПРОСЫ</span><h2>Контакты</h2><p>Добавим способы связи с организаторами и детали трансфера.</p></article></section></main>${footer()}${mobileNav('/info')}`;}
const adminTasks = [
 ['Определиться со стилем сайта','Ожидаем референсы'],
 ['Подтвердить регистрацию','Дата и место предварительные'],
 ['Перенести список гостей','Ожидаем список'],
 ['Исследовать кейтеринг','Нужны источники и реальные цены'],
];
function adminSidebar(active){return `<aside class="admin-side"><a href="#/" class="admin-brand"><span class="admin-brand-logo">НК</span><span>Wedding<br/><small>Панель организаторов</small></span></a><div class="side-caption">УПРАВЛЕНИЕ</div><nav aria-label="Разделы админки">${adminModules.map(m=>`<a href="#/admin/${m.id}" class="side-link ${active===m.id?'selected':''}"><span class="side-icon">${m.icon}</span>${m.label}</a>`).join('')}</nav><div class="side-bottom">${link('/','← На сайт для гостей','side-back')}</div></aside>`;}
function adminOverview(){return `<div class="dashboard-heading"><div><div class="eyebrow">ПАНЕЛЬ ПОДГОТОВКИ</div><h1>Наша свадьба</h1><p>Никита & Кристина · планирование мероприятия</p></div>${stamp('17 июня 2027 · предварительно')}</div>
 <div class="metrics-grid"><article class="metric"><span>Приглашённых</span><strong>0</strong><small>Список ещё не загружен</small></article><article class="metric"><span>Ответов RSVP</span><strong>0</strong><small>Приглашения не отправлены</small></article><article class="metric"><span>Подрядчиков</span><strong>0</strong><small>Предложения ещё не внесены</small></article><article class="metric"><span>Бюджет</span><strong>—</strong><small>Не определён</small></article></div>
 <div class="admin-columns"><section class="admin-panel"><div class="panel-header"><h2>Следующие шаги</h2><span class="panel-meta">Черновой список</span></div><div class="task-list">${adminTasks.map(([title,sub])=>`<div class="task-row"><span class="task-circle"></span><div><strong>${title}</strong><small>${sub}</small></div></div>`).join('')}</div></section><section class="admin-panel"><div class="panel-header"><h2>Основные данные</h2></div><dl class="facts"><dt>Дата</dt><dd>17 июня 2027 <span class="pending">предварительно</span></dd><dt>Регистрация</dt><dd>14:00 <span class="pending">предварительно</span></dd><dt>Место</dt><dd>Марьино <span class="pending">не подтверждено</span></dd><dt>Гости</dt><dd>Список готовится</dd></dl></section></div>`;}
function adminCatering(){return `<div class="dashboard-heading"><div><div class="eyebrow">ОРГАНИЗАЦИЯ / ПИТАНИЕ</div><h1>Кейтеринг</h1><p>Сравнение компаний Санкт-Петербурга, Ленобласти и района Тосно.</p></div></div>
 <div class="admin-panel"><div class="panel-header"><h2>Каталог компаний</h2><span class="panel-meta">0 проверенных предложений</span></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Компания</th><th>Формат</th><th>₽ / гость</th><th>Цена на 100</th><th>Что включено</th><th>Источник</th></tr></thead><tbody><tr><td colspan="6" class="table-empty">Каталог пока пуст. Реальные цены будем добавлять только с источником, датой проверки и отметкой о включённых услугах.</td></tr></tbody></table></div></div>
 <div class="admin-panel admin-instruction"><h2>Как будет устроено сравнение</h2><p>Каждый поставщик: район обслуживания, контакты, опубликованные прайсы и полученные сметы; разбивка на питание, персонал, мебель, логистику, дополнительные сборы; цены для разных размеров заказа и подтверждённая скидка за объём. Неподтверждённые оценки не выдаём за коммерческие предложения.</p></div>`;}
function adminGeneric(active){const m=adminModules.find(m=>m.id===active);if(!m)return adminOverview();if(active==='catering')return adminCatering();if(active==='overview')return adminOverview();return `<div class="dashboard-heading"><div><div class="eyebrow">ОРГАНИЗАЦИЯ</div><h1>${m.label}</h1><p>${m.text}</p></div></div><div class="admin-panel module-empty"><div class="module-symbol">${m.icon}</div><h2>Раздел подготовлен</h2><p>Структура раздела создана. Данные, сохранение, загрузка документов и права доступа будут подключены после настройки backend.</p>${active==='guests'?'<p><strong>Важно:</strong> настоящие имена, контакты и RSVP нельзя хранить в публичном GitHub-репозитории.</p>':''}</div>`;}
function admin(active='overview'){return `<div class="admin-layout">${adminSidebar(active)}<main class="admin-main"><div class="admin-topbar"><span>Wedding Management</span><span class="demo-badge">ДЕМО · БЕЗ БАЗЫ ДАННЫХ</span></div><div class="admin-content">${adminGeneric(active)}</div><div class="admin-warning">Это открытый демонстрационный интерфейс без реальных данных. Перед вводом данных гостей нужна авторизация администраторов и правила доступа к базе.</div></main></div>`;}
function notFound(){return `${header('')}<main class="inner-page">${pageHero('404','Страница не найдена','Возможно, адрес изменился.') }<div class="section-wrap">${link('/','Вернуться на главную','btn btn-primary')}</div></main>${footer()}${mobileNav('')}`;}
function render(){ const p=route(); let view;
  if(p==='/' )view=home();
  else if(p==='/schedule')view=schedule();
  else if(p==='/guests')view=guests();
  else if(p.startsWith('/guests/'))view=guestDetail(p.split('/')[2]);
  else if(p==='/gallery')view=gallery();
  else if(p==='/info')view=info();
  else if(p==='/admin')view=admin('overview');
  else if(p.startsWith('/admin/'))view=admin(p.split('/')[2]);
  else view=notFound();
  app.innerHTML=view;
  app.querySelector('[data-scroll-welcome]')?.addEventListener('click', () => app.querySelector('#welcome')?.scrollIntoView({behavior:'smooth'}));
  const stage = app.querySelector('[data-depth-stage]');
  if (stage) {
    if (wedding.heroPhotoUrl) {
      stage.classList.add('has-photo');
      stage.querySelector('.depth-photo').style.backgroundImage = 'url("' + encodeURI(wedding.heroPhotoUrl).replace(/"/g,'%22') + '")';
    }
    if (wedding.heroSubjectUrl) {
      stage.classList.add('has-subject');
      stage.querySelector('.depth-subject').style.backgroundImage = 'url("' + encodeURI(wedding.heroSubjectUrl).replace(/"/g,'%22') + '")';
    }
    const hero = stage.closest('.hero-photo');
    hero.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--depth-x', ((event.clientX-r.left)/r.width-.5).toFixed(3));
      hero.style.setProperty('--depth-y', ((event.clientY-r.top)/r.height-.5).toFixed(3));
    }, {passive:true});
    hero.addEventListener('pointerleave', () => {hero.style.setProperty('--depth-x','0');hero.style.setProperty('--depth-y','0');},{passive:true});
  }
  document.body.classList.toggle('admin-body',p.startsWith('/admin'));
  document.title=`${p.startsWith('/admin')?'Админка — ':''}Никита & Кристина`;
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);
render();