
/* Original reference comparisons for all eight approved visual screens.
 * Real reference PNGs, never generated from the rendered website. */
const screens=[
 {id:'01-home',name:'01 · Главная',path:'/',selector:'.r-hero--board'},
 {id:'02-invitation',name:'02 · Приглашение',path:'/',selector:'.r-invitation'},
 {id:'03-program',name:'03 · Программа',path:'/schedule',selector:'.r-program'},
 {id:'04-mariyino',name:'04 · Усадьба Марьино',path:'/info',selector:'.v2-venue'},
 {id:'05-dress-code',name:'05 · Дресс-код',path:'/info',selector:'.r-dress'},
 {id:'06-rsvp',name:'06 · Подтверждение',path:'/info',selector:'.r-rsvp'},
 {id:'07-gallery',name:'07 · Фотографии',path:'/gallery',selector:'.r-gallery-page'},
 {id:'08-info',name:'08 · Информация',path:'/info',selector:'.r-details'}
];
const base = new URL('./', import.meta.url);
const src = id => new URL('../public/approved-reference/'+id+'.png',base).href;
const path=()=>decodeURIComponent((location.hash||'#/').slice(1)).replace(/\/+$/,'')||'/';
const panel=document.createElement('aside');
panel.id='reference-comparison';
panel.setAttribute('aria-label','Сравнение с оригинальным макетом');
panel.innerHTML=`<div class="ref-heading"><div><strong>Оригинальный макет</strong><span>Утверждённый эталон · 8 экранов</span></div><button class="ref-close" type="button" aria-label="Скрыть сравнение" title="Скрыть">×</button></div>
<div class="ref-toolbar"><button type="button" data-ref-prev aria-label="Предыдущий экран">‹</button><label class="ref-select-label"><span class="visually-hidden">Выберите экран</span><select id="reference-screen-select">${screens.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join('')}</select></label><button type="button" data-ref-next aria-label="Следующий экран">›</button></div>
<div class="ref-canvas"><img id="reference-screen-image" alt="Оригинальный утверждённый макет" loading="eager"><div class="ref-screen-loading" aria-live="polite"></div></div>
<p class="ref-caption">Справа — исходная картинка без изменений. Слева — работающая HTML-страница. Выберите экран или прокрутите страницу слева.</p>`;
document.body.append(panel);
const reopen=document.createElement('button');
reopen.id='reference-reopen';
reopen.type='button';
reopen.textContent='Показать оригинал ↗';
document.body.append(reopen);
const mobile=document.createElement('div');
mobile.id='reference-mobile-tabs';
mobile.innerHTML='<button type="button" data-mobile="site" aria-pressed="true">Сайт</button><button type="button" data-mobile="original" aria-pressed="false">Оригинал</button>';
document.body.append(mobile);
const select=panel.querySelector('select');
const photo=panel.querySelector('#reference-screen-image');
const loading=panel.querySelector('.ref-screen-loading');
let current='01-home', visible=true, mobileMode='site', pending=false;
function isAdmin(){return path().startsWith('/admin');}
function nearestScreen(){
 const candidates=screens.filter(s=>s.path===path());
 if(!candidates.length)return screens[0];
 const center=window.innerHeight*.43;
 let winner=candidates[0],dist=Infinity;
 for(const s of candidates){
   const el=document.querySelector(s.selector);
   if(!el)continue;
   const r=el.getBoundingClientRect();
   const d=r.top<=center && r.bottom>=center ? 0 : Math.min(Math.abs(r.top-center),Math.abs(r.bottom-center));
   if(d<dist){dist=d;winner=s;}
 }
 return winner;
}
function setReference(id){
 const s=screens.find(x=>x.id===id)||screens[0];
 if(current!==s.id||!photo.getAttribute('src')){
   current=s.id;
   photo.src=src(s.id);
   photo.alt='Эталон '+s.name.replace(/^\d+ · /,'');
   loading.textContent='';
 }
 select.value=s.id;
}
function sync(){
 const admin=isAdmin();
 document.body.classList.toggle('ref-compare-admin',admin);
 document.body.classList.toggle('ref-compare-on',visible&&!admin);
 document.body.classList.toggle('ref-mobile-original',mobileMode==='original'&&visible&&!admin);
 document.body.classList.toggle('ref-compare-off',!visible||admin);
 mobile.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mobile===mobileMode)));
 if(!admin)setReference(nearestScreen().id);
}
function navigate(id){
 const s=screens.find(x=>x.id===id);
 if(!s)return;
 setReference(s.id);
 if(path()!==s.path)location.hash='#'+s.path;
 const go=()=>document.querySelector(s.selector)?.scrollIntoView({behavior:'smooth',block:'start'});
 requestAnimationFrame(()=>requestAnimationFrame(go));
 if(window.matchMedia('(max-width: 767px)').matches){mobileMode='site';sync();}
}
select.addEventListener('change',()=>navigate(select.value));
panel.querySelector('[data-ref-prev]').addEventListener('click',()=>navigate(screens[(screens.findIndex(s=>s.id===current)+7)%8].id));
panel.querySelector('[data-ref-next]').addEventListener('click',()=>navigate(screens[(screens.findIndex(s=>s.id===current)+1)%8].id));
panel.querySelector('.ref-close').addEventListener('click',()=>{visible=false;sync();});
reopen.addEventListener('click',()=>{visible=true;mobileMode=window.matchMedia('(max-width: 767px)').matches?'original':'site';sync();});
mobile.addEventListener('click',e=>{
 const b=e.target.closest('[data-mobile]');if(!b)return;
 visible=true;mobileMode=b.dataset.mobile;sync();
});
photo.addEventListener('error',()=>{loading.textContent='Не удалось загрузить оригинал. Проверьте подключение к сети.';});
window.addEventListener('hashchange',()=>{
 requestAnimationFrame(()=>requestAnimationFrame(sync));
});
window.addEventListener('scroll',()=>{
 if(pending)return;
 pending=true;requestAnimationFrame(()=>{pending=false;if(!isAdmin())setReference(nearestScreen().id);});
},{passive:true});
window.addEventListener('resize',sync,{passive:true});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape' && mobileMode==='original'){mobileMode='site';sync();}
});
sync();
