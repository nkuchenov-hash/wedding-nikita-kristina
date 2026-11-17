
import {wedding} from './data.js';
const PHOTO={
 boardPortrait:'./public/production/portrait-extended-background.webp',
 boardEstate:'./public/production/invitation-estate-clear.png',
 boardCherub:'./public/production/invitation-cherub.png',
 boardTable:'./public/board/03-program/banquet-clean.webp',
 boardStatue:'./public/production/dress-statue.png',
 boardOutfit1:'./public/board/05-dress-code/outfit-clean-1.webp',
 boardOutfit2:'./public/board/05-dress-code/outfit-clean-2.webp',
 boardOutfit3:'./public/board/05-dress-code/outfit-clean-3.webp',
 boardGallery1:'./public/board/07-gallery/gallery-clean-1.webp',
 boardGallery2:'./public/board/07-gallery/gallery-clean-2.webp',
 boardGallery3:'./public/board/07-gallery/gallery-clean-3.webp',
 boardGallery4:'./public/board/07-gallery/gallery-clean-4.webp',
 boardGallery5:'./public/board/07-gallery/gallery-clean-5.webp',
 boardGallery6:'./public/board/07-gallery/gallery-clean-6.webp',
 dressjacket:'./public/photos/dressjacket.jpg',
 dressgown:'./public/photos/dressgown.jpg',
 dresstux:'./public/photos/dresstux.jpg',
 'gardenRef':'./public/reference/venue-left-hi.jpg',
 'cherubRef':'./public/reference/venue-right-hi.jpg',
 'mariynoRef':'./public/reference/venue-hero-hi.jpg',
 'heroRef':'./public/photos/couple-ref.jpg',
 couple:'./public/photos/couple.jpg',
 couple2:'./public/photos/couple2.jpg',
 ceremony:'./public/photos/ceremony.jpg',
 table:'./public/photos/table.jpg',
 columns:'./public/photos/columns.jpg',
 estate:'./public/photos/estate.jpg',
 garden:'./public/photos/garden.jpg',
 lake:'./public/photos/lake.jpg',
 statue:'./public/photos/statue.jpg',
 bridge:'./public/photos/bridge.jpg',
 venueHero:'./public/reference/venue-hero-hi.jpg',
 venueStatue:'./public/reference/venue-right-hi.jpg',
 venueGarden:'./public/reference/venue-left-hi.jpg'
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const img=(name,cls='',alt='',priority=false)=>'<img class="'+cls+'" src="'+PHOTO[name]+'" alt="'+esc(alt)+'" loading="'+(priority?'eager':'lazy')+'" decoding="async" referrerpolicy="no-referrer">';
const icons={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 schedule:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
 guests:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m2-13a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/>',
 gallery:'<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m4 18 5-5 3 3 3-4 5 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9v.5"/>',
 pin:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 glass:'<path d="M5 3h14l-2 9a5 5 0 0 1-10 0L5 3ZM12 17v4m-5 0h10"/>',
 rings:'<circle cx="9" cy="13" r="6"/><circle cx="16" cy="13" r="6"/><path d="m10 5 3-3 3 3-3 3Z"/>',
 dish:'<circle cx="12" cy="12" r="7"/><path d="M3 3v18m18-18v18"/>',
 music:'<path d="M9 18V5l12-2v13M9 8l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
 gift:'<rect x="4" y="9" width="16" height="12" rx="2"/><path d="M12 9v12M3 9h18v-4H3zm9 0S4 9 5 4c4-3 7 5 7 5s3-8 7-5c1 5-7 5-7 5"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 heart:'<path d="M20.7 4.5a5.5 5.5 0 0 0-7.8 0l-.9.9-.9-.9a5.5 5.5 0 0 0-7.8 7.8L12 21l8.7-8.7a5.5 5.5 0 0 0 0-7.8Z"/>',
 stay:'<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 14h18M7 8V5h10v3"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 leaf:'<path d="M3 21C5 8 13 3 21 3c0 8-5 16-18 18Zm4-4c3-3 7-6 10-8"/>'
};
const ic=(n)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[n]+'</svg>';
const nav=[['/','Главная','home'],['/schedule','Программа','schedule'],['/guests','Гости','guests'],['/gallery','Фото','gallery'],['/info','Информация','info']];
function bottom(path){return '<nav class="r-tabs" aria-label="Разделы свадьбы">'+nav.map(([p,n,i])=>'<a class="'+(path===p?'r-selected':'')+'" href="#'+p+'" '+(path===p?'aria-current="page"':'')+'>'+ic(i)+'<span>'+n+'</span></a>').join('')+'</nav>'}
function flour(){return '<div class="r-ornament" aria-hidden="true"><i></i><b>❧</b><i></i></div>'}
function leaf(){return '<svg viewBox="0 0 180 210" fill="none" class="r-leaf" aria-hidden="true"><path d="M13 199c44-48 85-87 156-175" stroke="currentColor" stroke-width="1.5"/><path d="M49 156C6 147 7 105 16 93c28 13 38 36 33 63Zm23-27C55 91 78 61 91 58c10 27 3 52-19 71Zm31-38C71 80 72 45 89 33c24 20 26 42 14 58Zm27-36C118 31 135 10 154 8c8 18-1 36-24 47Z" stroke="currentColor" fill="currentColor" fill-opacity=".13"/><path d="M50 158c-21-22-27-43-34-65m56 35 19-70m13 33L89 33m41 21 24-46" stroke="currentColor" stroke-width="1"/></svg>'}
function heading(top,title,sub=''){return '<div class="r-heading"><span class="r-micro">'+top+'</span><h1>'+title+'</h1>'+(sub?'<p>'+sub+'</p>':'')+'</div>'}
function footer(){return '<footer class="r-footer">Никита <em>&</em> Кристина<span>Марьино × Санкт-Петербург · 17–19 июня 2027 · предварительно</span><small class="r-photo-credit">Фото пары и декора — временные иллюстративные материалы Pexels/Unsplash. На фото не Никита и Кристина. Фотографии Марьино предоставлены сайтом усадьбы; для постоянного использования потребуется разрешение правообладателя.</small></footer>'}
function shell(path,body,cls=''){return '<div class="r-app '+cls+'"><div class="r-site">'+body+footer()+'</div>'+bottom(path)+'</div>'}
const spbMotif="<svg class=\"spb-skyline\" viewBox=\"0 0 900 226\" preserveAspectRatio=\"xMidYMax meet\" aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 183h878M16 197c110-8 190-8 283 0s188 8 286 0 208-8 299 0M22 210c78-7 145-7 213 0m77 0c74-7 158-7 248 0m58 0c96-7 174-7 246 0\" opacity=\".38\"/><path d=\"M51 182v-48h169v48M46 133h179l-12-13H59zM80 132v50m35-50v50m35-50v50m35-50v50M63 151h145m-146 15h145\"/><path d=\"M290 182v-61h158v61M280 122h177l-14-11H294zM311 121v61m25-61v61m66-61v61m25-61v61M321 109c8-32 27-49 48-49s40 17 48 49M364 60v-16m-6 0h12M301 146h138\"/><path d=\"M519 182V137h141v45M508 137h164l-16-12H522zM540 137v45m39-45v45m39-45v45M579 125V69m-21 0h42l-21-57-21 57zm14-57h14M578 8v-6M544 162h91\"/><path d=\"M704 182v-41h149v41M694 141h171l-17-10H711zM729 141v41m32-41v41m32-41v41m32-41v41M720 159h125\"/></g></svg>";
function home(){
  return shell('/',
    '<section class="r-hero r-hero--editorial r-hero--board">'+img('boardPortrait','r-cover-photo','Иллюстративное свадебное фото: пока не фотография пары',true)+'<div class="r-hero-dim"></div><img class="r-hero-bouquet" src="./public/production/invitation-flowers-left.png" alt="" aria-hidden="true" loading="eager"><div class="r-top-label">МАРЬИНО · САНКТ-ПЕТЕРБУРГ</div><div class="r-hero-title"><span>Мы приглашаем вас на нашу свадьбу</span><h1>Никита<br><em>&</em><br>Кристина</h1>'+flour()+'<p>17 — 19 ИЮНЯ 2027</p><small class="spb-hero-subline">Три дня · две локации · одна история</small></div><button type="button" class="r-scroll-indicator" data-scroll-welcome aria-label="Перейти к приглашению"><span>⌄</span></button></section>'+
    '<section class="r-invitation w-invite" id="welcome" aria-labelledby="w-invite-title">'+
      '<div class="w-invite__content">'+
        '<svg class="w-invite__botanical" aria-hidden="true" viewBox="0 0 180 250" fill="none"><path d="M166 1C124 89 94 167 28 242" stroke="currentColor" stroke-width="1.4"/><path d="M144 49C106 43 93 19 98 3c27 4 44 23 46 46ZM124 92C87 83 75 54 80 36c29 10 44 30 44 56ZM102 134C64 135 49 115 48 91c31 2 51 17 54 43ZM76 173C41 178 22 160 17 138c29-2 52 9 59 35ZM138 64C164 52 175 31 174 15c-28 6-37 21-36 49ZM111 119c27-10 39-32 35-55-25 9-38 26-35 55ZM87 157c25-6 43-23 41-49-28 6-40 21-41 49Z" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity=".10"/></svg>'+
        '<span class="w-invite__eyebrow">ПРИГЛАШЕНИЕ НА СВАДЬБУ</span>'+
        '<h2 id="w-invite-title" class="w-invite__title">Разделите<br><em>эту историю с нами</em></h2>'+
        '<p class="w-invite__message">В этом июне нас ждут три особенных дня: от камерной регистрации в усадебном саду до большого праздника в Петербурге. Будем счастливы разделить их с вами.</p>'+
        '<div class="w-invite__rule" aria-hidden="true"><i></i><span>✦</span><i></i></div>'+
        '<div class="w-invite__details spb-invite__dates"><div><span>17 ИЮНЯ · ЧЕТВЕРГ</span><strong>17 июня 2027</strong><small>Регистрация · Усадьба Марьино</small></div><div><span>19 ИЮНЯ · СУББОТА</span><strong>19 июня 2027</strong><small>Торжество · Санкт-Петербург</small></div></div>'+
        '<p class="w-invite__tentative">18 июня — свободный день в Санкт-Петербурге. Все детали программы пока предварительные.</p>'+
      '</div>'+
      '<figure class="w-invite__photo"><img src="./public/photos/estate.jpg" alt="Усадьба Марьино, исторический усадебный комплекс и парк" loading="lazy" decoding="async"><figcaption>Марьино · начало нашей истории</figcaption></figure>'+
      '<div class="spb-transition"><span class="spb-transition__eyebrow">ОТ УСАДЕБНОГО САДА К НАБЕРЕЖНЫМ</span><h3>И дальше — <em>Петербург</em></h3><p>Каналы, летняя зелень и особенная атмосфера белых ночей. 18 июня оставляем для свободных прогулок, а 19-го собираемся на большой праздник.</p>'+spbMotif+'</div>'+
    '</section>'+
    '<section class="w-rsvp" id="rsvp" aria-labelledby="w-rsvp-title">'+
      '<div class="w-rsvp__intro"><span class="w-rsvp__eyebrow">ВАШ ОТВЕТ</span><h2 id="w-rsvp-title">Будете <em>с нами?</em></h2><p>Пожалуйста, сообщите, сможете ли вы присоединиться к празднику. Участие в отдельных событиях 17 и 19 июня уточним после утверждения программы.</p></div>'+
      '<form data-rsvp class="w-rsvp__form">'+
        '<fieldset class="w-rsvp__choices"><legend>Планируете присутствовать?</legend>'+
          '<label class="w-rsvp__choice"><input type="radio" name="yesno" value="yes" checked><span>Да, с радостью!</span><span class="w-rsvp__check" aria-hidden="true">✓</span></label>'+
          '<label class="w-rsvp__choice"><input type="radio" name="yesno" value="no"><span>К сожалению, не смогу</span><span class="w-rsvp__check" aria-hidden="true">✓</span></label>'+
        '</fieldset>'+
        '<label class="w-rsvp__name">Ваше имя<input name="name" type="text" maxlength="100" autocomplete="name" placeholder="Как к вам обращаться" required></label>'+
        '<button type="submit" class="w-rsvp__submit">ПОСМОТРЕТЬ ОТВЕТ <span aria-hidden="true">→</span></button>'+
        '<output role="status" aria-live="polite"></output>'+
        '<p class="w-rsvp__notice">Анкета пока только для просмотра: ответ не отправляется и не сохраняется. Подтверждение по отдельным дням появится в личном приглашении после утверждения программы.</p>'+
      '</form>'+
    '</section>'+
    '<section class="r-home-links">'+heading('НАШ ПРАЗДНИК','Всё, что нужно знать')+'<a href="#/schedule">'+ic('schedule')+'Программа трёх дней <b>↗</b></a><a href="#/info">'+ic('pin')+'Марьино и Петербург <b>↗</b></a><a href="#/guests">'+ic('guests')+'Наши близкие <b>↗</b></a><a href="#/gallery">'+ic('gallery')+'Фотографии <b>↗</b></a></section>',
    'r-home');
}
function schedule(){
 return shell('/schedule',
 '<section class="r-photo-head r-schedule-head r-cinematic-photo">'+img('boardTable','','Иллюстративная фотография праздничного ужина',true)+'</section>'+
 '<section class="r-curve-content r-program spb-program">'+
 heading('17 — 19 ИЮНЯ 2027','Три дня.<br><em>Одна история.</em>','Планируем провести регистрацию в усадьбе Марьино, а большое торжество — в Санкт-Петербурге.')+
 '<div class="spb-program__skyline">'+spbMotif+'</div>'+
 '<p class="spb-program__notice">Это предварительная программа. Точное время, состав участников и адрес торжества 19 июня появятся после подтверждения.</p>'+
 '<div class="spb-days" aria-label="Предварительная программа по дням">'+
 '<article class="spb-day spb-day--garden"><div class="spb-day__date"><b>17</b><span>ИЮНЯ<br>ЧЕТВЕРГ</span></div><div class="spb-day__body"><span class="spb-day__kicker">ДЕНЬ ПЕРВЫЙ · МАРЬИНО</span><h2>Официальная регистрация</h2><p>Торжественная регистрация в усадьбе Марьино, среди старинной архитектуры и летнего парка.</p><small>14:00 — предварительно; детали и состав гостей уточняются</small></div></article>'+
 '<article class="spb-day spb-day--city"><div class="spb-day__date"><b>18</b><span>ИЮНЯ<br>ПЯТНИЦА</span></div><div class="spb-day__body"><span class="spb-day__kicker">ДЕНЬ ВТОРОЙ · ПЕТЕРБУРГ</span><h2>Свободный день</h2><p>Никаких обязательных мероприятий: прогулки по каналам, встречи и белые ночи — каждый выбирает свой маршрут.</p><small>Свободная программа, без официального сбора</small></div></article>'+
 '<article class="spb-day spb-day--celebration"><div class="spb-day__date"><b>19</b><span>ИЮНЯ<br>СУББОТА</span></div><div class="spb-day__body"><span class="spb-day__kicker">ДЕНЬ ТРЕТИЙ · ПЕТЕРБУРГ</span><h2>Большой праздник</h2><p>Торжественная часть, праздничный ужин, музыка и танцы с нашими близкими.</p><small>Место в Санкт-Петербурге и время начала уточняются</small></div></article>'+
 '</div></section>',
 'r-schedule');
}
function guests(){
 return shell('/guests',
 '<section class="r-photo-head r-guests-image">'+img('gardenRef','','Зелёный парк Марьино',true)+'</section>'+
 '<section class="r-curve-content r-guests"><img src="./public/production/invitation-leaves-top.png" class="r-photo-foliage r-guests-foliage" alt="" aria-hidden="true">'+heading('НАШИ БЛИЗКИЕ','Люди нашей<br>истории','Скоро здесь появятся персональные страницы приглашённых.')+
 '<div class="r-guest-card"><div class="r-guest-avatar">'+ic('heart')+'</div><div><span class="r-micro">ПРИМЕР ПРОФИЛЯ</span><h2>Наш гость</h2><p>Откуда мы знакомы, любимые воспоминания и фотографии с парой.</p><a href="#/guests/primer" class="r-pill">Посмотреть карточку →</a></div></div>'+
 '<p class="r-draft-note">Настоящие имена гостей не публикуются до получения согласия и подключения защищённой части сайта.</p></section>',
 'r-guests-page');
}
function profile(){return shell('/guests','<section class="r-profile-page">'+heading('КАРТОЧКА ГОСТЯ','Наш гость','Это пример будущей страницы, без персональных данных.')+'<div class="r-guest-avatar">'+ic('heart')+'</div><p>Город · Знакомство с парой · Воспоминания · Личные фотографии</p><a href="#/guests" class="r-pill">← Все гости</a></section>','r-profile')}
const photos=[
 ['boardGallery1','Мы','couple'],['boardGallery2','Усадьба','estate'],['boardGallery3','Цветы','inspo'],
 ['boardGallery4','Праздник','inspo'],['boardGallery5','Свадебный образ','couple'],['boardGallery6','Парк','estate']
];
function gallery(){
 return shell('/gallery',
 '<section class="r-gallery-page"><div class="r-gallery-leaf" aria-hidden="true"><img src="./public/production/gallery-leaves.png" alt=""></div>'+
 heading('НАШИ ФОТОГРАФИИ','История<br>в кадрах')+
 '<div class="r-photo-filters" role="group" aria-label="Фильтр фотогалереи"><button class="active" aria-pressed="true" data-filter="all">Все</button><button aria-pressed="false" data-filter="couple">Мы</button><button aria-pressed="false" data-filter="estate">Усадьба</button><button aria-pressed="false" data-filter="inspo">Вдохновение</button></div>'+
 '<div class="r-masonry">'+photos.map(([key,title,cat])=>'<figure class="r-gallery-tile" data-category="'+cat+'"><button class="r-photo-open" type="button" aria-label="Открыть изображение: '+title+'">'+img(key,'',title)+'<span class="r-image-caption">'+title+'</span></button></figure>').join('')+'</div>'+
 '<p class="r-draft-note">Это временные иллюстративные кадры. Общие фотографии гостей появятся после подключения защищённого хранилища.</p>'+
 '<dialog class="r-lightbox" aria-label="Просмотр фотографии"><button type="button" class="r-lightbox-close" aria-label="Закрыть фотографию">×</button><img alt=""><p></p></dialog></section>',
 'r-gallery-page-outer');
}
function venue(){
 const venueAsset=(name,alt)=>'<img src="./public/reference/'+name+'" alt="'+esc(alt)+'" loading="eager" decoding="async">';
 return '<section class="v2-venue" aria-label="Усадьба Марьино">'+
  '<div class="v2-venue-photo">'+venueAsset('venue-hero-hi.jpg','Цветущая белая колоннада среди деревьев, художественная визуализация')+'</div>'+
  '<svg class="v3-photo-curve" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5 C190 8 391 30 574 49 C760 69 900 92 1000 114 L1000 120 L0 120 Z" fill="currentColor"/></svg>'+
  '<div class="v3-hanging-leaves" aria-hidden="true">'+venueAsset('venue-foliage.png','')+'</div>'+
  '<div class="v2-venue-copy"><div class="v2-venue-label">МЕСТО</div><h1>Усадьба<br>Марьино</h1><p>Живописный парк, историческая<br class="v2-wide-break"> архитектура и особая атмосфера —<br class="v2-wide-break"> идеальное место для особого праздника.</p>'+
  '<a class="v2-venue-directions" href="https://yandex.ru/maps/?text=%D1%83%D1%81%D0%B0%D0%B4%D1%8C%D0%B1%D0%B0%20%D0%9C%D0%B0%D1%80%D1%8C%D0%B8%D0%BD%D0%BE%20%D0%90%D0%BD%D0%B4%D1%80%D0%B8%D0%B0%D0%BD%D0%BE%D0%B2%D0%BE" target="_blank" rel="noopener noreferrer"><span>КАК ДОБРАТЬСЯ</span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></a></div>'+
  '<div class="v2-venue-thumbnails"><figure>'+venueAsset('venue-left-hi.jpg','Самостоятельная фотоплитка: балюстрада и скульптура в зелёном саду')+'</figure><figure>'+venueAsset('venue-right-hi.jpg','Самостоятельная фотоплитка: белая скульптура среди деревьев')+'</figure></div>'+
  '</section>';
}
function cityCelebration(){
 return '<section class="spb-city-venue" aria-labelledby="spb-city-title"><div class="spb-city-venue__eyebrow">19 ИЮНЯ · САНКТ-ПЕТЕРБУРГ</div><h2 id="spb-city-title">Продолжение — <em>в городе</em></h2><p>Вторая часть свадебной истории пройдёт в Петербурге. Выбираем площадку для торжественного вечера, а точный адрес сообщим позже.</p>'+spbMotif+'<div class="spb-city-venue__pending">ПЛОЩАДКА И ВРЕМЯ УТОЧНЯЮТСЯ</div></section>';
}
function dress(){
 return '<section class="r-dress"><div class="r-dress-statue">'+img('boardStatue','r-dress-bg','Классическая белая садовая скульптура')+'</div><div class="r-dress-leaves" aria-hidden="true"><img src="./public/production/dress-flowers.png" alt=""></div>'+
 '<div class="r-dress-content">'+heading('ДРЕСС-КОД','Вдохновение<br>в деталях','Мы будем рады, если в своих образах вы поддержите эстетику нашего дня.')+
 '<div class="r-color-dots" aria-label="Палитра сайта"><i style="background:#214D31"></i><i style="background:#4C8C46"></i><i style="background:#83B96B"></i><i style="background:#E2E4E1"></i><i style="background:#C1A46C"></i></div>'+
 '<p>Природные оттенки, элегантные образы, лёгкие ткани.</p><small>Палитра вдохновения — не обязательное требование к одежде гостей.</small>'+
 '<div class="r-dress-collage"><figure>'+img('boardOutfit1','','Тёмный костюм для торжественного приёма')+'</figure><figure>'+img('boardOutfit2','','Платье насыщенного зелёного оттенка')+'</figure><figure>'+img('boardOutfit3','','Элегантный костюм с бутоньеркой')+'</figure></div></div></section>';
}
function rsvp(){
 return '<section class="r-rsvp" id="rsvp">'+heading('ПОДТВЕРЖДЕНИЕ','Будем рады<br>вашему ответу','Это предварительная форма без отправки. Участие по дням уточним в личных приглашениях.')+
 '<form data-rsvp><div class="r-rsvp-options"><label><input type="radio" name="yesno" value="yes" checked>'+ic('check')+' Я буду</label><label><input type="radio" name="yesno" value="no">'+ic('check')+' К сожалению, не смогу</label></div>'+
 '<label class="r-form-label">Имена гостей<input name="name" maxlength="100" autocomplete="off" placeholder="Например: Анна и Сергей"></label>'+
 '<label class="r-form-label">Особые пожелания<textarea maxlength="500" placeholder="Например: аллергии, пожелания по рассадке"></textarea></label>'+
 '<button type="submit" class="r-rsvp-submit">ПОСМОТРЕТЬ ОТВЕТ</button><output role="status" aria-live="polite"></output>'+
 '<p class="r-draft-note">Тестовая анкета: ничего не отправляется и не сохраняется. Реальная регистрация будет доступна приглашённым позже.</p></form></section>';
}
function details(){return '<section class="r-details">'+heading('КОНТАКТЫ И ВАЖНОЕ','Полезная<br>информация')+
 '<div class="r-map r-map--illustration"><img src="./public/board/08-info/map-art-reference.webp" alt="Декоративная схема расположения усадьбы Марьино. Это не навигационная карта."></div><a class="r-map-real-link" href="https://yandex.ru/maps/?text=%D1%83%D1%81%D0%B0%D0%B4%D1%8C%D0%B1%D0%B0%20%D0%9C%D0%B0%D1%80%D1%8C%D0%B8%D0%BD%D0%BE%20%D0%90%D0%BD%D0%B4%D1%80%D0%B8%D0%B0%D0%BD%D0%BE%D0%B2%D0%BE" target="_blank" rel="noopener noreferrer">Открыть реальную карту и маршрут ↗</a>'+
 '<p><strong>17 июня:</strong> Усадьба Марьино, Ленинградская область, Тосненский район, д. Андрианово.<br><strong>19 июня:</strong> Санкт-Петербург; адрес торжества уточняется.</p>'+
 '<div class="r-accordion">'+[
 ['pin','Как добраться','Адрес и маршрут можно посмотреть в Яндекс Картах. Площадка предварительная.'],
 ['stay','Проживание','Рекомендации и варианты размещения добавим после подтверждения деталей праздника.'],
 ['gift','Подарки','Пожелания пары пока уточняются.'],
 ['info','Будут вопросы?','Контакты организаторов появятся перед отправкой приглашений.']].map(([ico,title,body])=>'<details><summary>'+ic(ico)+'<span>'+title+'</span><b>⌄</b></summary><p>'+body+'</p></details>').join('')+'</div>'+
 '<div class="r-details-bottom">'+img('lake','','Летний усадебный парк и пруд')+'</div></section>'}
function info(){return shell('/info',venue()+cityCelebration()+dress()+rsvp()+details(),'r-info')}
export function renderGuest(path){
 if(path==='/')return home();
 if(path==='/schedule')return schedule();
 if(path==='/guests')return guests();
 if(path==='/guests/primer')return profile();
 if(path==='/gallery')return gallery();
 if(path==='/info')return info();
 return shell('/','<section class="r-profile-page"><h1>Страница не найдена</h1><a href="#/">На главную</a></section>');
}
export function activateGuest(root){
 root.querySelector('[data-scroll-welcome]')?.addEventListener('click',()=>{
   root.querySelector('#welcome')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 });
 root.querySelectorAll('.r-app img').forEach(el=>{
   el.addEventListener('error',()=>{
     if(el.dataset.fallbackApplied)return;
     el.dataset.fallbackApplied='true';
     el.src=el.src===PHOTO.garden?PHOTO.estate:PHOTO.garden;
   });
 });
 root.querySelectorAll('[data-program-mode]').forEach(btn=>btn.addEventListener('click',()=>{
   const three=btn.dataset.programMode==='three';
   root.querySelectorAll('[data-program-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
   const one=root.querySelector('.r-program-one'),extra=root.querySelector('.r-program-three');
   if(one)one.hidden=three;
   if(extra)extra.hidden=!three;
 }));
 const form=root.querySelector('[data-rsvp]');
 if(form)form.addEventListener('submit',e=>{e.preventDefault();const yes=form.querySelector('[name=yesno]:checked')?.value==='yes';const guest=(form.querySelector('[name=name]')?.value||'Гость').trim();form.querySelector('output').textContent=guest+': '+(yes?'планирует присутствовать.':'не сможет присутствовать.')+' Это предварительный просмотр: ответ не сохранён и не отправлен.';});
 root.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.filter;root.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  root.querySelectorAll('[data-category]').forEach(el=>{el.hidden=filter!=='all'&&el.dataset.category!==filter});
 }));
 const lightbox=root.querySelector('.r-lightbox');
 if(lightbox){
   root.querySelectorAll('.r-photo-open').forEach(button=>button.addEventListener('click',()=>{
     const img=button.querySelector('img'),cap=button.querySelector('.r-image-caption');
     lightbox.querySelector('img').src=img.src;
     lightbox.querySelector('img').alt=img.alt;
     lightbox.querySelector('p').textContent=cap?.textContent||'';
     if(typeof lightbox.showModal==='function')lightbox.showModal();
   }));
   lightbox.querySelector('.r-lightbox-close')?.addEventListener('click',()=>lightbox.close());
   lightbox.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close()});
 }
}
