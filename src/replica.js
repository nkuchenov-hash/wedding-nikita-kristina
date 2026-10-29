
import {wedding} from './data.js';
const PHOTO={
 boardPortrait:'./public/board/01-home/portrait-clean.webp',
 boardEstate:'./public/board/02-invitation/estate-sunny-clean.webp',
 boardCherub:'./public/board/02-invitation/cherub-head-clean.png',
 boardTable:'./public/board/03-program/banquet-clean.webp',
 boardStatue:'./public/board/05-dress-code/sculpture-no-text.png',
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
function footer(){return '<footer class="r-footer">Никита <em>&</em> Кристина<span>Марьино · предварительно</span><small class="r-photo-credit">Фото пары и декора — временные иллюстративные материалы Pexels/Unsplash. На фото не Никита и Кристина. Фотографии Марьино предоставлены сайтом усадьбы; для постоянного использования потребуется разрешение правообладателя.</small></footer>'}
function shell(path,body,cls=''){return '<div class="r-app '+cls+'"><div class="r-site">'+body+footer()+'</div>'+bottom(path)+'</div>'}
function home(){
 return shell('/',
 '<section class="r-hero r-hero--editorial r-hero--board">'+img('boardPortrait','r-cover-photo','Иллюстративное свадебное фото: пока не Никита и Кристина',true)+'<div class="r-hero-dim"></div><div class="r-top-label">УСАДЬБА МАРЬИНО</div><div class="r-hero-title"><span>Мы приглашаем вас на нашу свадьбу</span><h1>Никита<br><em>&</em><br>Кристина</h1>'+flour()+'<p>17 ИЮНЯ 2027</p><small>Дата и место предварительные</small></div><a class="r-scroll-indicator" href="#welcome" aria-label="Листайте к приглашению"><span>⌄</span></a></section>'+
 '<section class="r-invitation" id="welcome"><div class="r-invite-greens" aria-hidden="true"><img src="./public/reference/venue-foliage.png" alt=""></div>'+img('boardCherub','r-invite-statue','Белая садовая скульптура на фоне зелени')+'<div class="r-invite-head"><span class="r-micro">МЫ ЖЕНИМСЯ!</span><h2>Никита<br><em>&</em><br>Кристина</h2><p>И хотим разделить этот особенный день с самыми близкими людьми. Будем счастливы видеть вас на нашей свадьбе в усадьбе Марьино.</p>'+flour()+'</div><div class="r-invite-picture"><img class="board-estate-leaf board-estate-leaf--left" src="./public/reference/venue-foliage.png" alt="" aria-hidden="true"><img class="board-estate-leaf board-estate-leaf--right" src="./public/reference/venue-foliage.png" alt="" aria-hidden="true">'+img('boardEstate','','Фасад усадьбы Марьино в окружении парка')+'<span>С любовью, Никита и Кристина</span></div></section>'+
 '<section class="r-home-links">'+heading('НАШ ПРАЗДНИК','Всё, что нужно знать')+'<a href="#/schedule">'+ic('schedule')+'Программа дня <b>↗</b></a><a href="#/info">'+ic('pin')+'Усадьба Марьино <b>↗</b></a><a href="#/guests">'+ic('guests')+'Наши близкие <b>↗</b></a><a href="#/gallery">'+ic('gallery')+'Фотографии <b>↗</b></a></section>',
 'r-home');
}
const items=[['Уточняется','Сбор гостей','Встреча и общение в усадьбе','glass'],['14:00','Регистрация','Самый важный момент нашего дня','rings'],['Уточняется','Праздничный ужин','Ужин, тосты, музыка и танцы','dish'],['Уточняется','Вечер','Продолжение праздника с близкими','music']];
function schedule(){
 return shell('/schedule',
 '<section class="r-photo-head r-schedule-head r-cinematic-photo">'+img('boardTable','','Праздничный стол с цветами и свечами в зелёном саду',true)+'</section>'+
 '<section class="r-curve-content r-program"><svg class="r-section-wave" viewBox="0 0 500 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 4 C160 12 323 37 500 55 L500 60 H0Z" fill="currentColor"/></svg>'+
 heading('ПРОГРАММА ДНЯ','Как всё<br>будет')+
 '<div class="r-timeline">'+items.map(item=>'<div class="r-time-item"><div class="r-time-icon">'+ic(item[3])+'</div><div class="r-time-line"><i></i></div><div class="r-time-description"><b>'+item[0]+'</b><h3>'+item[1]+'</h3><p>'+item[2]+'</p></div></div>').join('')+'</div>'+
 '<p class="r-draft-note">Расписание ещё согласовывается. 14:00 — время регистрации. Остальные часы появятся после утверждения программы.</p></section>',
 'r-schedule');
}
function guests(){
 return shell('/guests',
 '<section class="r-photo-head r-guests-image">'+img('gardenRef','','Зелёный парк Марьино',true)+'</section>'+
 '<section class="r-curve-content r-guests"><img src="./public/reference/venue-foliage.png" class="r-photo-foliage r-guests-foliage" alt="" aria-hidden="true">'+heading('НАШИ БЛИЗКИЕ','Люди нашей<br>истории','Скоро здесь появятся персональные страницы приглашённых.')+
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
 '<section class="r-gallery-page"><div class="r-gallery-leaf" aria-hidden="true"><img src="./public/reference/venue-foliage.png" alt=""></div>'+
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
function dress(){
 return '<section class="r-dress"><div class="r-dress-statue">'+img('boardStatue','r-dress-bg','Классическая белая садовая скульптура')+'</div><div class="r-dress-leaves" aria-hidden="true"><img src="./public/reference/venue-foliage.png" alt=""></div>'+
 '<div class="r-dress-content">'+heading('ДРЕСС-КОД','Вдохновение<br>в деталях','Мы будем рады, если в своих образах вы поддержите эстетику нашего дня.')+
 '<div class="r-color-dots" aria-label="Палитра сайта"><i style="background:#214D31"></i><i style="background:#4C8C46"></i><i style="background:#83B96B"></i><i style="background:#E2E4E1"></i><i style="background:#C1A46C"></i></div>'+
 '<p>Природные оттенки, элегантные образы, лёгкие ткани.</p><small>Это пока цветовые ориентиры оформления сайта, а не обязательный дресс-код для гостей.</small>'+
 '<div class="r-dress-collage"><figure>'+img('boardOutfit1','','Тёмный костюм для торжественного приёма')+'</figure><figure>'+img('boardOutfit2','','Платье насыщенного зелёного оттенка')+'</figure><figure>'+img('boardOutfit3','','Элегантный костюм с бутоньеркой')+'</figure></div></div></section>';
}
function rsvp(){
 return '<section class="r-rsvp" id="rsvp">'+heading('ПОДТВЕРЖДЕНИЕ','Будем рады<br>вашему ответу','Анкета приглашения — пока демонстрация без сохранения данных.')+
 '<form data-rsvp><div class="r-rsvp-options"><label><input type="radio" name="yesno" value="yes" checked>'+ic('check')+' Я буду</label><label><input type="radio" name="yesno" value="no">'+ic('check')+' К сожалению, не смогу</label></div>'+
 '<label class="r-form-label">Имена гостей<input name="name" maxlength="100" autocomplete="off" placeholder="Например: Анна и Сергей"></label>'+
 '<label class="r-form-label">Особые пожелания<textarea maxlength="500" placeholder="Например: аллергии, пожелания по рассадке"></textarea></label>'+
 '<button type="submit" class="r-rsvp-submit">ПОСМОТРЕТЬ ОТВЕТ</button><output role="status" aria-live="polite"></output>'+
 '<p class="r-draft-note">Тестовая анкета: ничего не отправляется и не сохраняется. Реальная регистрация будет доступна приглашённым позже.</p></form></section>';
}
function details(){return '<section class="r-details">'+heading('КОНТАКТЫ И ВАЖНОЕ','Полезная<br>информация')+
 '<div class="r-map r-map--real"><iframe title="Карта — усадьба Марьино, Андрианово" loading="lazy" referrerpolicy="no-referrer" src="https://www.openstreetmap.org/export/embed.html?bbox=30.895%2C59.414%2C30.914%2C59.423&layer=mapnik&marker=59.41806%2C30.90278"></iframe></div>'+
 '<p>Ленинградская область,<br>Тосненский район, д. Андрианово</p>'+
 '<div class="r-accordion">'+[
 ['pin','Как добраться','Адрес и маршрут можно посмотреть в Яндекс Картах. Площадка предварительная.'],
 ['stay','Проживание','Рекомендации и варианты размещения добавим после подтверждения деталей праздника.'],
 ['gift','Подарки','Пожелания пары пока уточняются.'],
 ['info','Будут вопросы?','Контакты организаторов появятся перед отправкой приглашений.']].map(([ico,title,body])=>'<details><summary>'+ic(ico)+'<span>'+title+'</span><b>⌄</b></summary><p>'+body+'</p></details>').join('')+'</div>'+
 '<div class="r-details-bottom">'+img('lake','','Летний усадебный парк и пруд')+'</div></section>'}
function info(){return shell('/info',venue()+dress()+rsvp()+details(),'r-info')}
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
 root.querySelectorAll('.r-app img').forEach(el=>{
   el.addEventListener('error',()=>{
     if(el.dataset.fallbackApplied)return;
     el.dataset.fallbackApplied='true';
     el.src=el.src===PHOTO.garden?PHOTO.estate:PHOTO.garden;
   });
 });
 const form=root.querySelector('[data-rsvp]');
 if(form)form.addEventListener('submit',e=>{e.preventDefault();const yes=form.querySelector('[name=yesno]:checked')?.value==='yes';form.querySelector('output').textContent=(yes?'Выбрано «Я буду».':'Выбрано «Не смогу».')+' Это демонстрация: ответ не сохранён.';});
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
