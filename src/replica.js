
import {wedding} from './data.js';
const PHOTO={
 boardPortrait:'./public/production/portrait-extended-background.webp',
 cityPhoto:'https://upload.wikimedia.org/wikipedia/commons/b/b1/Saint_Petersburg_Palace_Bridge%2C_St._Petersburg_%2837931957696%29.jpg',
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
 dressjacket:'./public/board/05-dress-code/outfit-clean-1.webp',
 dressgown:'./public/board/05-dress-code/outfit-clean-2.webp',
 dresstux:'./public/board/05-dress-code/outfit-clean-3.webp',
 'gardenRef':'./public/reference/venue-left-hi.jpg',
 'cherubRef':'./public/reference/venue-right-hi.jpg',
 'mariynoRef':'./public/reference/venue-hero-hi.jpg',
 'heroRef':'./public/board/01-home/portrait-clean.webp',
 couple:'./public/board/01-home/portrait-clean.webp',
 couple2:'./public/board/07-gallery/gallery-clean-1.webp',
 ceremony:'./public/reference/venue-hero-hi.jpg',
 table:'./public/board/03-program/banquet-clean.webp',
 columns:'./public/reference/venue-hero-hi.jpg',
 estate:'./public/board/02-invitation/estate-sunny-clean.webp',
 garden:'./public/reference/venue-left-hi.jpg',
 lake:'./public/reference/venue-photo.jpg',
 statue:'./public/reference/venue-right-hi.jpg',
 bridge:'./public/reference/venue-balustrade.jpg',
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
function referenceHeader(path){
 const links=[['/','Главная'],['/schedule','Программа'],['/info','Локации'],['/gallery','Галерея'],['/guests','Гости']];
 return '<header class="wref-header'+(path==='/'?' wref-header--home':'')+'">'+
 '<a class="wref-monogram" href="#/" aria-label="Главная — Никита и Кристина">Н<span>&</span>К</a>'+
 '<nav class="wref-header-links" aria-label="Разделы свадьбы">'+links.map(([p,n])=>'<a href="#'+p+'"'+(p===path?' aria-current="page"':'')+'>'+n+'</a>').join('')+'<a href="#/" data-go-rsvp>Ответить</a></nav>'+
 '<button type="button" class="wref-menu-toggle" data-site-menu-toggle aria-label="Открыть меню" aria-controls="wref-mobile-menu" aria-expanded="false"><span></span><span></span><span></span></button>'+
 '<nav id="wref-mobile-menu" class="wref-mobile-menu" aria-label="Мобильное меню" hidden>'+links.map(([p,n])=>'<a href="#'+p+'">'+n+'</a>').join('')+'<a href="#/" data-go-rsvp>Ответить на приглашение</a></nav>'+
 '</header>';
}
function refLeaf(cls=''){return '<svg viewBox="0 0 206 269" fill="none" class="wref-leaf '+cls+'" aria-hidden="true"><path d="M18 262C89 208 114 104 194 3" stroke="currentColor" stroke-width="1.9"/><path d="M51 226C17 214 9 184 13 167c33 3 46 20 51 46M79 187c26-2 54-25 58-47-34 1-53 13-67 34M89 161C55 151 42 120 46 103c32 8 48 25 54 46M121 116c34-8 49-34 52-52-32 4-49 19-56 40M142 77c-16-24-15-49-6-64 23 16 28 35 24 55M163 42c27-3 39-19 42-36-27 0-39 12-47 29" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity=".09"/></svg>'}
function refRule(){return '<div class="wref-rule" aria-hidden="true"><i></i><span>❧</span><i></i></div>'}
function refDay(date,title,caption,photoName,where,klass,ico){
 return '<article class="wref-day '+klass+'"><div class="wref-day-image">'+img(photoName,'','Иллюстрация: '+title)+'<div class="wref-day-shade"></div></div><div class="wref-day-content"><span class="wref-day-date">'+date+'</span><h3>'+title+'</h3><p>'+caption+'</p><small>'+ic(ico)+' '+where+'</small></div></article>';
}
function footer(){return '<footer class="r-footer">Никита <em>&</em> Кристина<span>Марьино × Санкт-Петербург · 17–19 июня 2027 · предварительно</span><small class="r-photo-credit">Фото пары и декора — временные иллюстративные материалы. На фото не Никита и Кристина. Вид Дворцового моста: <a href="https://commons.wikimedia.org/wiki/File:Saint_Petersburg_Palace_Bridge,_St._Petersburg_(37931957696).jpg" target="_blank" rel="noopener noreferrer">Michael Kuhn / Wikimedia Commons</a>, CC BY 2.0. Фотографии Марьино требуют согласования прав.</small></footer>'}
function shell(path,body,cls=''){return '<div class="r-app wref-app '+cls+'">'+referenceHeader(path)+'<div class="r-site">'+body+footer()+'</div>'+bottom(path)+'</div>'}
const spbMotif='<img class="spb-skyline spb-skyline--approved" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAVQAAABkAQMAAADjUVrvAAAABlBMVEUAAADYx46oRjLpAAAAAnRSTlMA/1uRIrUAAAUMSURBVHja7ZdBaBxVGMff29nuhDTmRYV21DSzSpRgA65eDJhm9qSBhoK34iWBgFQUGvGyoZJ57Zaag3Q9ScSDOXqMPWhFMWMiKZjoBg9aCZKJOayCuFMFM+tu3ud7b2Y2szOTOmKRHnyHgX3z2/e+73vf+3/fIPT/uEtHJmEufwibS5gr3AE2+x+ypX/AbtwBNvcv2dZdwLJD2N74lALpWXLSSs32v2+nZk9hJzX7Ej6bmn0eD6VmN9FwanYpO5jMdsdm8CJ6OzX7KDqWmn348ftSswAsLaswxUzN/nABUrP7zUNYPc46FyaT2YdojN2cPcTeJ+MswCE2PB1jVc7SRNaITROqlK1UvmGkFUa7pzKJ60atRTq3IZk9QaMs2fgK7EySup6KsxNfrFuZJHWNsfToxMR6MZOkQFFWtSRLaIICmZHw9NqS1bzpPzvefT3VyQ6UJGsU45UOfxspfCNDHutJz0wH+91SJzs0LNlzm97PYtjtZyMF6hxnX1kvjt+Ml1sFZjrZ8eGjz0GzeHYzQWubbow1y2CNJ7H2QpQlLiJW4rq3IutO/qSvwqo96cuqHWSfYD+OsGaL6e7oHHjTuIN9IGLDjG5xTHc8Caa3Z49vU4aIPeCxKMzO3gx1MgrFbK9FoA6uIc+MtjM1xqqMvFEeYbhhz70rc7fN0gg7gvoNgBsM2fxikbK4zAGrhli5B8OudgPgMwJVys2wLMkSWV0l25SsKh7V37We1bKTI/Oz1XpVsXi20i5PFIhIZ2VLBvKIxvk3r5aMJjjC6ZL6pWLxvKEETbtt9kEZyCP8YuVIDcBkJlQBmvzeb/O/QcM5o/MD0V4U7AuaYO+pQQ3YQCBncrijnN2ZL2FwStpj4s2ZealLCoxd13r8oPujj5cvxKzsnAHX9gTby5sbzHqR0o/EDrir4xQXebTUPwhZ+gg5XBRbYluGDFesg3AhfGtEzKhvVAsRjo2oS6d58uX60CDGKMqijAauDisMnbiaQ+bGtdNY6oFg5bn0HbBeuFD3/Y7e8wSuuU/5mjGIcBaVs86YNjNFfb6LF/K8Yv5273Krp2ysFtCAF4E8Z4vTC+6KZk1fKr0qvPZz5zx88KmbVeaUQp53U5k+zHfkLN95BdFHUFHe9zVkocuiljoLWlYp+p1Xoc2iS+0EQ2vHt3keNZSXITR+DLGBrZ7CLUN87F8MWB6HfKSK8GPgZ2UdlDWg+DKKsHnU5R+9yCd/DyqKys80YIvhhlyw/M7A1iK4pp9ayyBVn9ubHw9/bHBW53cKM8JUhqEl6YtgCyGNr6uAlIo5BEh3RXEldSgHOlQ8yEzBmrsV4dROxfXOR3eZ7gwkfTpgxW2cFHmOTC9BuKfv2awWXOtw2LBhtcTPUYWhMV8Gdvcqr83S6AcVwM6+VRXG2foVEtS81jPlT8z6L2tyrbaQbLs7t6gitrZGiR6w+jsUruR+/VAinkaKsEIDYBn8c2BI0cUy6veWfOcgEypu6FL/7XBu+0VohHodo+VE+yAZe6Yz6QmpAJyveO2OESryhHt6DLyFppTrnm/CdAyUOFlusRPqFGTPtEUDg3h+6g3hZoVP9SBgTiDqrwtl5fcIsNzSAFuvQRAV/qiHfSMic1SoF0RfIfKsLqTds5/b8k2Y9c6kRlUn3McxO+jb9DDLM9wlAGWZmV7TwtdzFSZT4PNlFmJHOCsc7BIwRup+C/VR9BZnTX6mu9yGvwD48KWzhBX7ywAAAABJRU5ErkJggg==" alt="" aria-hidden="true" loading="eager" decoding="async">';
function home(){
 return shell('/',
 '<section class="r-hero r-hero--editorial r-hero--board wref-hero" aria-labelledby="wref-main-title">'+
 img('boardPortrait','r-cover-photo wref-cover','Временная иллюстративная свадебная фотография',true)+
 '<div class="wref-hero-shade"></div>'+
 '<div class="wref-hero-decor wref-hero-decor--a">'+refLeaf()+'</div>'+
 '<div class="wref-hero-decor wref-hero-decor--b">'+refLeaf()+'</div>'+
 '<div class="wref-hero-copy"><span class="wref-hero-eyebrow">ПРИГЛАШАЕМ НА НАШУ СВАДЬБУ</span>'+
 '<h1 id="wref-main-title">Никита <em>&</em><br>Кристина</h1>'+refRule()+
 '<p>17 — 19 июня 2027</p><small>МАРЬИНО · САНКТ-ПЕТЕРБУРГ</small>'+
 '<div class="wref-hero-skyline">'+spbMotif+'</div></div>'+
 '<button type="button" class="r-scroll-indicator wref-hero-down" data-scroll-welcome aria-label="Перейти к приглашению">'+ic('arrow')+'</button>'+
 '</section>'+
 '<section class="r-invitation w-invite wref-invitation" id="welcome" aria-labelledby="w-invite-title">'+
 refLeaf('wref-invite-leaf wref-invite-leaf--l')+refLeaf('wref-invite-leaf wref-invite-leaf--r')+
 '<div class="wref-welcome"><figure class="wref-polaroid wref-polaroid--estate">'+img('estate','','Историческая усадьба Марьино')+'<figcaption>Марьино</figcaption></figure>'+
 '<div class="wref-welcome-message"><span class="wref-overline">С ЛЮБОВЬЮ ПРИГЛАШАЕМ</span><h2 id="w-invite-title">Дорогие друзья!</h2><p>Мы будем счастливы разделить с вами важные для нас дни: официальную регистрацию в усадьбе Марьино, свободный день в Петербурге и большой свадебный праздник 19 июня.</p>'+refRule()+'</div>'+
 '<figure class="wref-polaroid wref-polaroid--city">'+img('cityPhoto','','Иллюстративный вид на мост')+'<figcaption>Санкт-Петербург</figcaption></figure></div>'+
 '<div class="wref-program-preview" id="program-preview"><div class="wref-section-head"><span>17 — 19 ИЮНЯ 2027</span><h2>Программа наших дней</h2>'+refRule()+'</div>'+
 '<div class="wref-days">'+
 refDay('17 июня','Официальная<br>регистрация','Начало в 14:00 — предварительно','estate','Усадьба Марьино','wref-day--garden','rings')+
 refDay('18 июня','Свободный день<br>в Петербурге','Прогулки, музеи и любимые места','cityPhoto','Санкт-Петербург','wref-day--city','pin')+
 refDay('19 июня','Торжественная часть<br>и свадебный банкет','Время и площадка уточняются','boardTable','Санкт-Петербург','wref-day--party','glass')+
 '</div><a class="wref-text-link" href="#/schedule">Подробнее о программе <span aria-hidden="true">→</span></a></div>'+
 '<div class="wref-bridge-line">'+spbMotif+'</div>'+
 '<div class="wref-venues-preview"><div class="wref-section-head"><span>ДВА МЕСТА НАШЕЙ ИСТОРИИ</span><h2>Наши локации</h2>'+refRule()+'</div>'+
 '<div class="wref-venue-grid">'+
 '<article class="wref-venue-card"><div class="wref-venue-picture">'+img('estate','','Усадьба Марьино')+'</div><div class="wref-venue-copy"><span>17 ИЮНЯ</span><h3>Усадьба<br>Марьино</h3><p>Историческая усадьба в окружении парка. Здесь планируется официальная регистрация.</p><a href="#/info">Подробнее <span aria-hidden="true">→</span></a></div></article>'+
 '<article class="wref-venue-card"><div class="wref-venue-picture wref-venue-picture--city">'+img('cityPhoto','','Иллюстративный петербургский мост')+'</div><div class="wref-venue-copy"><span>18–19 ИЮНЯ</span><h3>Санкт-<br>Петербург</h3><p>Город белых ночей и набережных. Место торжественной части пока выбираем.</p><a href="#/info">Подробнее <span aria-hidden="true">→</span></a></div></article>'+
 '</div></div>'+
 '</section>'+
 '<section class="w-rsvp wref-rsvp" id="rsvp" aria-labelledby="w-rsvp-title">'+
 refLeaf('wref-rsvp-leaf wref-rsvp-leaf--l')+refLeaf('wref-rsvp-leaf wref-rsvp-leaf--r')+
 '<div class="wref-rsvp-intro"><h2 id="w-rsvp-title">Будете <em>с нами?</em></h2><p>Пожалуйста, сообщите, сможете ли вы разделить с нами этот праздник.</p></div>'+
 '<form data-rsvp class="w-rsvp__form wref-rsvp-form"><label class="wref-rsvp-name">Ваше имя<input name="name" type="text" maxlength="100" autocomplete="name" placeholder="Как к вам обращаться" required></label>'+
 '<fieldset class="wref-rsvp-options"><legend>Ваш ответ</legend><label><input type="radio" name="yesno" value="yes" checked><span>Да, буду</span></label><label><input type="radio" name="yesno" value="no"><span>К сожалению, не смогу</span></label></fieldset>'+
 '<button type="submit" class="wref-rsvp-submit">Посмотреть ответ <span aria-hidden="true">→</span></button><output role="status" aria-live="polite"></output>'+
 '<p class="wref-rsvp-disclaimer">Предварительный просмотр: ответы пока не отправляются и не сохраняются. Участие в отдельных событиях уточним лично.</p>'+
 '</form></section>'+
 '<section class="wref-guides">'+
 '<article><span class="wref-guide-icon">'+ic('leaf')+'</span><h3>Дресс-код</h3><p>Природная палитра и элегантные образы — наше вдохновение, а не строгое правило.</p><a href="#/info">Подробнее →</a></article>'+
 '<article><span class="wref-guide-icon">'+ic('gift')+'</span><h3>Подарки</h3><p>Самое ценное для нас — ваше присутствие. Остальные пожелания расскажем позже.</p><a href="#/info">Подробнее →</a></article>'+
 '<article><span class="wref-guide-icon">'+ic('info')+'</span><h3>Полезная информация</h3><p>Места, маршруты и детали поездки по мере подтверждения программы.</p><a href="#/info">Подробнее →</a></article>'+
 '</section>'+
 '<section class="wref-gallery-preview"><div><span>НАШИ ВОСПОМИНАНИЯ</span><h2>Галерея</h2><p>Делимся атмосферой нашей истории.</p><a href="#/gallery">Смотреть фото →</a></div>'+
 '<div class="wref-gallery-photos"><figure>'+img('boardGallery1','','Галерея, фото 1')+'</figure><figure>'+img('boardGallery3','','Галерея, фото 2')+'</figure><figure>'+img('boardGallery4','','Галерея, фото 3')+'</figure></div>'+
 '</section>',
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
 const menu=root.querySelector('[data-site-menu-toggle]');
 const nav=root.querySelector('#wref-mobile-menu');
 menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');if(nav)nav.hidden=!open;});
 nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{nav.hidden=true;menu?.setAttribute('aria-expanded','false');}));
 root.querySelectorAll('[data-go-rsvp]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();if(location.hash==='#/'||location.hash===''){root.querySelector('#rsvp')?.scrollIntoView({behavior:'smooth'});}else{location.hash='#/';requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelector('#rsvp')?.scrollIntoView({behavior:'smooth'})));}}));
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
