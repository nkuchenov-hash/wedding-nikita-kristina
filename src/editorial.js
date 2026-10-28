import {wedding, sampleGuests, tentativeSchedule} from './data.js';

/* Editorial guest experience: reference photos only, never real couple/guest data. */
const ART = Object.freeze({
 couple:'https://upload.wikimedia.org/wikipedia/commons/2/20/Groom_follows_behind_bride_%28Unsplash%29.jpg',
 park:'https://usadbamaryino.ru/sites/default/files/styles/photogal/public/images/photogallery/01_5.jpg?itok=u-XnOLTm',
 columns:'https://usadbamaryino.ru/sites/default/files/images/photogallery/048_0.jpg',
 estate:'https://usadbamaryino.ru/sites/default/files/images/single/603e1081138aa9001209ed52.jpg',
 landscape:'https://media.kudago.com/images/place/0f/6d/0f6dca476493446d87b197f827991971.jpg'
});
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(name)=>({
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 clock:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m5 4H8"/>',
 guests:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m2-13a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/>',
 camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.5"/>',
 pin:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 flower:'<circle cx="12" cy="12" r="2"/><path d="M12 10c-6-9 6-11 6-4 0 2-2 4-4 5 10-4 12 8 5 8-3 0-5-2-6-5 4 10-8 12-8 5 0-3 2-5 5-6-10 4-11-8-4-8 3 0 5 2 6 5Z"/>',
 heart:'<path d="M20.8 4.6c-2.2-2.2-5.7-2.2-7.9 0L12 5.5l-.9-.9c-2.2-2.2-5.7-2.2-7.9 0s-2.2 5.7 0 7.9L12 21l8.8-8.5c2.2-2.2 2.2-5.7 0-7.9Z"/>'
}[name]||'');
const svg=(name)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icon(name)+'</svg>';
const nav=[['/','Главная','home'],['/schedule','Программа','clock'],['/guests','Гости','guests'],['/gallery','Фото','camera'],['/info','Детали','info']];
function dock(path){return '<nav class="w-dock" aria-label="Разделы свадебного приложения">'+nav.map(([url,label,ico])=>'<a href="#'+url+'" class="'+(path===url||path.startsWith(url+'/')&&url!=='/'?'is-active':'')+'" '+(path===url?'aria-current="page"':'')+'>'+svg(ico)+'<span>'+label+'</span></a>').join('')+'</nav>'}
function header(home=false){return '<header class="w-head'+(home?' w-head--overlay':'')+'"><a href="#/" class="w-brand" aria-label="Главная Никиты и Кристины"><span class="w-brand-monogram">Н<span>&</span>К</span><span class="w-brand-sub">17 / 06 / 2027 <small>предварительно</small></span></a><a class="w-head-link" href="#/info">Детали праздника <span>↗</span></a></header>'}
function footer(){return '<footer class="w-footer"><div class="w-footer-heading">Никита <em>&</em> Кристина</div><p>До встречи в Марьино</p><small>Временные иллюстративные фотографии: <a href="https://commons.wikimedia.org/wiki/File:Groom_follows_behind_bride_(Unsplash).jpg" target="_blank" rel="noopener noreferrer">Brooke Cagle (CC0)</a>; <a href="https://usadbamaryino.ru/" target="_blank" rel="noopener noreferrer">Усадьба Марьино</a>. Изображения других людей не изображают пару. Фото усадьбы используются для предварительного дизайн-макета.</small></footer>'}
function botanical(className=''){return '<svg class="w-botanical '+className+'" viewBox="0 0 180 240" fill="none" aria-hidden="true"><path d="M20 233C85 191 63 117 146 20" stroke="currentColor" stroke-width="1.5"/><path d="M48 198C23 179 22 160 26 147c20 0 31 14 34 34M64 169C94 161 110 144 112 124c-27-3-45 8-51 26M71 146C41 135 32 116 38 103c22 2 36 13 42 29M94 111c25-4 47-23 48-44-25 0-42 11-49 27M111 78C96 59 103 34 116 26c12 17 11 32 3 46M140 36c-2-19 9-30 22-34 3 18-4 30-18 37" stroke="currentColor" stroke-width="1.4"/><path d="M24 147q32-1 36 36-28-4-36-36ZM112 124q-26-2-49 35 41-10 49-35ZM38 103q23 0 42 29-32-7-42-29ZM141 67q-24-1-48 28 35-2 48-28ZM116 26q-19 18-3 49 14-28 3-49Z" fill="currentColor" fill-opacity=".24"/></svg>'}
function flourish(){return '<div class="w-flourish" aria-hidden="true"><span></span>'+svg('flower')+'<span></span></div>'}
function photo(src,alt,cls='',loading='lazy'){return '<img src="'+escapeHtml(src)+'" alt="'+escapeHtml(alt)+'" class="'+cls+'" loading="'+loading+'" decoding="async" referrerpolicy="no-referrer" />'}
function overline(n,text){return '<div class="w-kicker"><span>'+n+'</span> '+text+'</div>'}
function photoNote(){return '<span class="w-photo-note">Иллюстративные фотографии · заменим на ваши</span>'}
function home(){
 return header(true)+'<main class="w-main">'+
 '<section class="w-hero"><div class="w-hero-photo" data-photo-depth>'+photo(ART.couple,'Иллюстративная фотография свадебной пары в зелёном саду','w-hero-img','eager')+'</div><div class="w-hero-vignette"></div>'+
 '<div class="w-hero-inner"><div class="w-hero-top"><span>УСАДЬБА МАРЬИНО</span><span>ЛЕНИНГРАДСКАЯ ОБЛАСТЬ</span></div><div class="w-hero-writing"><span class="w-invite">Приглашаем на нашу свадьбу</span>'+flourish()+'<h1>Никита <em>&</em><br>Кристина</h1><div class="w-hero-meta"><span>17 июня 2027</span><span class="w-dot"></span><span>Марьино</span></div><span class="w-hero-caution">Дата и место предварительные</span><a href="#/info" class="w-hero-cta">Подробнее о свадьбе '+svg('arrow')+'</a></div><span class="w-hero-footnote">Фото пары будет заменено на ваше · 3D-режим в подготовке</span></div></section>'+
 '<section class="w-intro w-container">'+overline('01','НАШЕ ПРИГЛАШЕНИЕ')+'<div class="w-intro-layout"><div class="w-intro-copy"><h2>День, который<br>хочется <em>разделить.</em></h2>'+botanical('w-intro-leaf')+'<p>Мы очень хотим, чтобы рядом с нами были люди, которые делают нашу историю особенной. Здесь будет всё, что нужно знать о предстоящем празднике — от программы до маленьких деталей.</p><a class="w-text-link" href="#/info">Всё о празднике '+svg('arrow')+'</a></div><div class="w-intro-picture"><div class="w-photoframe">'+photo(ART.columns,'Белые колонны, цветы и зелёный парк усадьбы Марьино')+'</div><div class="w-floating-letter">N <span>&</span> K</div></div></div></section>'+
 '<section class="w-venue-feature"><div class="w-venue-photo">'+photo(ART.park,'Летний парк усадьбы Марьино с прудом, скульптурой и зелёной травой')+'</div><div class="w-venue-card">'+overline('02','МЕСТО НАШЕГО ДНЯ')+'<h2>Усадьба<br><em>Марьино</em></h2>'+flourish()+'<p>Старинные колонны, сад, просторные лужайки и пруды. Именно эта атмосфера вдохновляет оформление нашей свадьбы.</p><span class="w-prelim">Площадка пока уточняется</span><a href="#/info" class="w-outline-button">Посмотреть детали '+svg('arrow')+'</a></div></section>'+
 '<section class="w-moments w-container">'+overline('03','НАСТРОЕНИЕ ДНЯ')+'<h2>Немного <em>волшебства</em><br>в самых простых деталях</h2><div class="w-moment-grid"><figure class="w-moment-one">'+photo(ART.estate,'Фасад усадьбы Марьино, классические колонны и цветущий сад')+'<figcaption>Архитектура усадьбы <span>01</span></figcaption></figure><figure class="w-moment-two">'+photo(ART.columns,'Цветочные композиции на колоннах усадьбы')+'<figcaption>Цветы и детали <span>02</span></figcaption></figure><figure class="w-moment-three">'+photo(ART.landscape,'Парк Марьино и пруд у дворца')+'<figcaption>Зелень и воздух <span>03</span></figcaption></figure></div></section>'+
 '<section class="w-home-timeline"><div class="w-container w-timeline-layout"><div>'+overline('04','ПРОГРАММА')+'<h2>В этот<br><em>особенный день</em></h2><p>Мы соберём здесь окончательное расписание, чтобы никто ничего не пропустил.</p><a href="#/schedule" class="w-outline-button w-on-dark">Программа дня '+svg('arrow')+'</a></div><div class="w-timeline-preview"><div><span>01</span><strong>Сбор гостей</strong><small>Время уточняется</small></div><div><span>02</span><strong>Регистрация брака</strong><small>14:00 · предварительно</small></div><div><span>03</span><strong>Праздничный вечер</strong><small>Программа уточняется</small></div></div></div></section>'+
 '<section class="w-rsvp-teaser w-container">'+botanical('w-rsvp-leaf')+overline('05','ДО СКОРОЙ ВСТРЕЧИ')+'<h2>Будем рады<br><em>видеть вас!</em></h2><p>В личном приглашении можно будет подтвердить участие, а пока посмотреть, как будет устроена анкета гостя.</p><a href="#/info" class="w-solid-button">Информация и анкета '+svg('arrow')+'</a></section></main>'+footer()+dock('/');
}
const program=[
 {n:'01',time:'Уточняется',name:'Встреча гостей',detail:'Будет время для приветствий и первых совместных фотографий.',ic:'guests'},
 {n:'02',time:'14:00 · предварительно',name:'Регистрация',detail:'Предварительно планируем регистрацию в усадьбе Марьино.',ic:'heart'},
 {n:'03',time:'Уточняется',name:'Праздничный вечер',detail:'Общение, ужин и праздник с близкими. Расписание появится после согласования.',ic:'flower'}
];
function schedule(){
 return header()+'<main class="w-inner">'+
 '<section class="w-page-top w-schedule-top"><div class="w-container w-page-top-inner">'+overline('01','ПРОГРАММА СВАДЬБЫ')+'<h1>Наш <em>особенный</em><br>день</h1><p>Пока это предварительный план. Здесь появятся точные часы, локации и полезные подробности.</p></div><div class="w-page-image">'+photo(ART.columns,'Свадебная площадка среди белых колонн Марьино')+'</div></section>'+
 '<section class="w-container w-program"><div class="w-program-head">'+botanical('w-program-leaf')+'<span>17 / 06 / 2027</span><h2>Программа дня</h2><p>Время и детали могут измениться.</p></div><div class="w-program-list">'+program.map(x=>'<article class="w-program-row"><div class="w-program-time"><span>'+x.n+'</span><small>'+x.time+'</small></div><div class="w-program-rule"><i></i></div><div class="w-program-text"><div class="w-program-icon">'+svg(x.ic)+'</div><h3>'+x.name+'</h3><p>'+x.detail+'</p></div></article>').join('')+'</div></section>'+
 '<div class="w-ribbon-photo">'+photo(ART.park,'Лето в усадебном парке Марьино')+'<div><span>Там, где хочется остаться</span><strong>Марьино</strong></div></div>'+
 '</main>'+footer()+dock('/schedule');
}
function guests(){
 return header()+'<main class="w-inner">'+
 '<section class="w-page-top w-guests-top"><div class="w-container w-page-top-inner">'+overline('02','НАШИ БЛИЗКИЕ')+'<h1>Люди нашей<br><em>истории</em></h1><p>Здесь каждый приглашённый сможет рассказать немного о себе и познакомиться с остальными гостями.</p></div><div class="w-page-image">'+photo(ART.park,'Летний зелёный парк усадьбы Марьино')+'</div></section>'+
 '<section class="w-container w-guests-block"><div class="w-section-caption">Гостевая книга</div><div class="w-guest-preview">'+botanical('w-guest-leaf')+'<div class="w-guest-avatar">✳</div><div><small>ПРИМЕР БУДУЩЕЙ КАРТОЧКИ</small><h2>Знакомьтесь,<br>это наши гости</h2><p>У каждого гостя появится мини-страница: откуда он, как знаком с нами, что хочет рассказать о себе и какие общие фотографии добавить.</p><a href="#/guests/primer" class="w-text-link">Открыть пример профиля '+svg('arrow')+'</a></div></div><p class="w-explanation">Реальный список гостей ещё не загружен. Имена и фотографии будут опубликованы только с учётом согласия гостей и правил доступа.</p></section>'+
 '</main>'+footer()+dock('/guests');
}
function profile(){
 return header()+'<main class="w-inner"><section class="w-container w-profile"><a class="w-text-link" href="#/guests">← К гостям</a><div class="w-profile-card">'+botanical()+'<div class="w-guest-avatar">✳</div><div><span class="w-kicker">ПРИМЕР / ДЕМОНСТРАЦИЯ</span><h1>Гость — пример</h1><p>Санкт-Петербург · Друг семьи</p><p>Здесь появится рассказ о знакомстве с парой, информация о госте и фотографии. Эта карточка не относится к реальному человеку.</p></div></div></section></main>'+footer()+dock('/guests');
}
function gallery(){
 return header()+'<main class="w-inner">'+
 '<section class="w-page-top w-gallery-top"><div class="w-container w-page-top-inner">'+overline('03','НАШ АЛЬБОМ')+'<h1>История<br><em>в кадрах</em></h1><p>Общие воспоминания, любимые фотографии и самые тёплые моменты.</p></div><div class="w-page-image">'+photo(ART.couple,'Иллюстративное свадебное фото в саду')+'</div></section>'+
 '<section class="w-container w-gallery-section"><div class="w-section-caption">В ожидании наших фотографий</div><div class="w-gallery-masonry"><figure>'+photo(ART.couple,'Пример свадебной фотографии пары')+'<figcaption>01 · Будущие фотографии пары</figcaption></figure><figure>'+photo(ART.estate,'Усадьба Марьино летом')+'<figcaption>02 · Место праздника</figcaption></figure><figure>'+photo(ART.columns,'Усадебные колонны с цветами')+'<figcaption>03 · Детали</figcaption></figure><figure>'+photo(ART.park,'Парк Марьино и его пруд')+'<figcaption>04 · Атмосфера</figcaption></figure></div><div class="w-note-box"><span>✳</span><div><strong>Общая галерея появится здесь</strong><p>После подключения закрытого хранилища приглашённые смогут загружать свои кадры. Пока на странице только иллюстративные референсы, не ваши личные снимки.</p></div></div></section>'+
 '</main>'+footer()+dock('/gallery');
}
const dressColors=['#214D31','#4C8C46','#83B96B','#E2E4E1','#C1A46C'];
function info(){
 return header()+'<main class="w-inner">'+
 '<section class="w-page-top w-info-top"><div class="w-container w-page-top-inner">'+overline('04','ВСЁ ВАЖНОЕ')+'<h1>С любовью<br><em>к деталям</em></h1><p>Локация, дресс-код, ответы на вопросы и ваше приглашение — в одном месте.</p></div><div class="w-page-image">'+photo(ART.estate,'Фасад усадьбы Марьино с белыми колоннами')+'</div></section>'+
 '<section class="w-container w-info-venue"><div class="w-info-photo">'+photo(ART.park,'Парк, пруд и классические архитектурные элементы усадьбы Марьино')+'</div><div class="w-info-details">'+overline('01','ЛОКАЦИЯ')+'<h2>Усадьба <em>Марьино</em></h2><p>Ленинградская область, Тосненский район, деревня Андрианово.</p><p class="w-subtle">Усадьба и дата пока не подтверждены окончательно.</p><a class="w-outline-button" href="https://www.google.com/maps/search/?api=1&query=%D1%83%D1%81%D0%B0%D0%B4%D1%8C%D0%B1%D0%B0+%D0%9C%D0%B0%D1%80%D1%8C%D0%B8%D0%BD%D0%BE+%D0%90%D0%BD%D0%B4%D1%80%D0%B8%D0%B0%D0%BD%D0%BE%D0%B2%D0%BE" target="_blank" rel="noopener noreferrer">Открыть карту '+svg('arrow')+'</a></div></section>'+
 '<section class="w-dress"><div class="w-container w-dress-layout"><div>'+overline('02','ДРЕСС-КОД')+'<h2>Красота —<br><em>в деталях</em></h2><p>Предлагаемая стилистика оформления: живой зелёный, светлые оттенки колонн и тонкие золотые акценты.</p><p class="w-subtle">Это палитра сайта, а не обязательный дресс-код для гостей. Рекомендации по одежде ещё не согласованы.</p><div class="w-dress-swatches" aria-label="Цвета дизайна свадебного сайта">'+dressColors.map(c=>'<span style="background:'+c+'" title="'+c+'"></span>').join('')+'</div></div><div class="w-dress-visual">'+photo(ART.columns,'Цветочный декор у белых колонн в Марьино')+'</div></div></section>'+
 '<section class="w-container w-rsvp" id="rsvp">'+botanical('w-rsvp-corner')+overline('03','ПРИГЛАШЕНИЕ')+'<h2>Ждём вашего<br><em>ответа</em></h2><p>Будущая анкета гостя. Пока это демонстрация: ответы не отправляются и не сохраняются.</p><form class="w-rsvp-form" data-rsvp-preview><fieldset><legend>Планируете быть с нами?</legend><label><input type="radio" name="attending" value="yes" checked> С радостью приду</label><label><input type="radio" name="attending" value="no"> К сожалению, не смогу</label></fieldset><button type="submit" class="w-solid-button">Посмотреть результат '+svg('arrow')+'</button><output aria-live="polite"></output></form></section>'+
 '<section class="w-container w-questions">'+overline('04','ПОЛЕЗНО ЗНАТЬ')+'<h2>Частые вопросы</h2><details><summary>Когда будет окончательное расписание?</summary><p>Когда дата, площадка и программа будут согласованы, обновим эту страницу.</p></details><details><summary>Можно ли будет загрузить общие фотографии?</summary><p>Да, это запланированная функция. Загрузка станет доступна после подключения безопасного хранения и прав доступа.</p></details><details><summary>Где посмотреть информацию о гостях?</summary><p>В разделе «Гости» появятся персональные карточки приглашённых с учётом их согласия на публикацию.</p></details></section>'+
 '</main>'+footer()+dock('/info');
}
export function renderGuest(path){
 if(path==='/')return home();
 if(path==='/schedule')return schedule();
 if(path==='/guests')return guests();
 if(path==='/guests/primer')return profile();
 if(path==='/gallery')return gallery();
 if(path==='/info')return info();
 return header()+'<main class="w-inner w-unknown"><h1>Страница не найдена</h1><a href="#/">На главную</a></main>'+footer()+dock('');
}
export function activateGuest(root){
 const form=root.querySelector('[data-rsvp-preview]');
 if(form)form.addEventListener('submit',e=>{
  e.preventDefault();
  const attending=form.querySelector('input[name="attending"]:checked')?.value==='yes';
  form.querySelector('output').textContent=attending?'Демонстрация: отмечено «Приду». Ответ не сохранён.':'Демонстрация: отмечено «Не смогу». Ответ не сохранён.';
 });
 const hero=root.querySelector('.w-hero');
 if(hero)hero.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const r=hero.getBoundingClientRect();
  hero.style.setProperty('--dx',((e.clientX-r.left)/r.width-.5).toFixed(3));
  hero.style.setProperty('--dy',((e.clientY-r.top)/r.height-.5).toFixed(3));
 },{passive:true});
}
