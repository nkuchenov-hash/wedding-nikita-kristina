import {PUBLIC_VENUES} from './venues.js';
import {getVenuePhotos} from './venue-detail-ui.js';

const safe=(value='')=>String(value??'');
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=safe(text);return n};
const thumb=(id,w=900)=>'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w'+w;
const orig=(id)=>'https://drive.google.com/file/d/'+encodeURIComponent(id)+'/view';
const ALL_ALBUMS=PUBLIC_VENUES.map(v=>({id:v.id,name:v.name,photos:getVenuePhotos(v),drive:v.drive||'',area:v.area||''}));
// The only source of truth for the wedding gallery is the approved programme.
// Other locations remain accessible in their individual venue comparison cards.
export function approvedVenueIds(items=[]){
 return new Set(items.filter(item=>item&&Number(item.is_confirmed)===1&&item.venue_id)
  .map(item=>String(item.venue_id)));
}
const categories=(photos)=>['Все фотографии',...new Set(photos.map(p=>p.section||'Разное'))];
const styleButton=(text,cls='')=>{const b=node('button','ad-photo-button '+cls,text);b.type='button';return b};
let activeCleanup=null;

export function activatePhotoArchive(root){
 if(activeCleanup)activeCleanup();
 const host=root.querySelector('.admin-content');if(!host)return;
 host.replaceChildren();
 const ui={venue:'all',section:'Все фотографии',search:'',limit:72,cols:3,view:null};
 let albumList=[],loaded=false,loadError='',disposed=false;
 const wrap=node('section','ad-photo-archive');
 const eyebrow=node('div','ad-photo-eyebrow','СВАДЬБА  ·  ФОТОАРХИВ');
 const head=node('header','ad-photo-head');
 head.append(eyebrow,node('h1','','Фотографии и альбомы'));
 const lead=node('p','ad-photo-lead','Загружаем утверждённые площадки из программы свадьбы…');
 head.append(lead);
 wrap.append(head);
 const tools=node('div','ad-photo-toolbar');
 const select=node('select','ad-photo-select');
 const allOption=node('option','','Все утверждённые площадки');allOption.value='all';select.append(allOption);
 const search=node('input','ad-photo-search');search.type='search';search.placeholder='Поиск по площадкам и фотографиям';search.setAttribute('aria-label','Поиск по фото');
 const density=node('div','ad-photo-density');
 for(const count of [2,3,4]){
   const btn=styleButton(count+' в ряд');btn.dataset.count=String(count);
   btn.addEventListener('click',()=>{ui.cols=count;render();});
   density.append(btn);
 }
 tools.append(select,search,density);wrap.append(tools);
 const chips=node('nav','ad-photo-chips');chips.setAttribute('aria-label','Категории фотографий');wrap.append(chips);
 const resultInfo=node('p','ad-photo-count');wrap.append(resultInfo);
 const grid=node('div','ad-photo-grid');wrap.append(grid);
 const more=styleButton('Показать ещё фотографии','ad-photo-more');wrap.append(more);
 const footer=node('div','ad-photo-sources');wrap.append(footer);
 const dialog=node('div','ad-photo-overlay');dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Просмотр фотографии');
 const close=styleButton('Закрыть ×','ad-photo-close');
 const previous=styleButton('‹','ad-photo-prev');previous.setAttribute('aria-label','Предыдущая фотография');
 const next=styleButton('›','ad-photo-next');next.setAttribute('aria-label','Следующая фотография');
 const figure=node('figure','ad-photo-figure');
 const bigImg=node('img','ad-photo-full');bigImg.alt='';
 const caption=node('figcaption','ad-photo-caption');
 const originalLink=node('a','ad-photo-original','Открыть оригинал в Google Drive');originalLink.target='_blank';originalLink.rel='noopener noreferrer';
 figure.append(bigImg,caption,originalLink);
 const info=node('div','ad-photo-lightbox-count');
 dialog.append(close,previous,figure,next,info);
 wrap.append(dialog);
 host.append(wrap);
 let displayed=[];
 function items(){
   const all=albumList.filter(v=>ui.venue==='all'||v.id===ui.venue);
   const matches=[];
   for(const venue of all){
     for(const photo of venue.photos){
       if(ui.section!=='Все фотографии'&&photo.section!==ui.section)continue;
       const text=(venue.name+' '+photo.name+' '+photo.section).toLocaleLowerCase('ru');
       if(ui.search && !text.includes(ui.search))continue;
       matches.push({...photo,venueName:venue.name,venueId:venue.id});
     }
   }
   return matches;
 }
 function drawLightbox(){
    if(ui.view===null||!displayed.length)return;
    const photo=displayed[ui.view]||displayed[0];
    if(!photo){closeLightbox();return}
    bigImg.src=thumb(photo.id,2000);
    bigImg.alt=photo.name||'Фотография площадки';
    caption.replaceChildren(node('strong','',photo.venueName),node('span','',photo.section+' · '+photo.name));
    originalLink.href=orig(photo.id);
    info.textContent=(ui.view+1)+' / '+displayed.length;
 }
 function closeLightbox(){ui.view=null;dialog.hidden=true;document.body.classList.remove('ad-photo-lock')}
 function openLightbox(index){ui.view=index;dialog.hidden=false;document.body.classList.add('ad-photo-lock');drawLightbox();close.focus()}
 function nextImage(delta){ui.view=(ui.view+delta+displayed.length)%displayed.length;drawLightbox()}
 function render(){
   const visible=ui.venue==='all'?albumList:albumList.filter(v=>v.id===ui.venue);
   const available=categories(visible.flatMap(v=>v.photos));
   if(!available.includes(ui.section))ui.section='Все фотографии';
   chips.replaceChildren();
   for(const cat of available){
      const b=styleButton(cat,cat===ui.section?'is-current':'');
      b.addEventListener('click',()=>{ui.section=cat;ui.limit=72;render()});chips.append(b);
   }
   select.value=ui.venue;
   for(const b of density.querySelectorAll('button'))b.classList.toggle('is-current',Number(b.dataset.count)===ui.cols);
   displayed=items();
   const count=displayed.length;
   resultInfo.textContent=count+' фотографий'+(ui.venue==='all'?' · '+albumList.filter(v=>v.photos.length).length+' площадок':' · '+(visible[0]?.name||''))+
     (ui.search?' · поиск: '+ui.search:'');
   grid.replaceChildren();grid.style.setProperty('--photo-cols',String(ui.cols));
   for(let i=0;i<Math.min(ui.limit,count);i++){
      const item=displayed[i];
      const cell=styleButton('','ad-photo-card');
      const img=node('img');img.loading='lazy';img.decoding='async';img.src=thumb(item.id,760);img.alt=item.name;
      img.onerror=()=>{cell.classList.add('ad-photo-no-image');img.style.display='none'};
      const details=node('span','ad-photo-card-info');
      details.append(node('strong','',item.venueName),node('small','',(item.section||'Разное')+' · '+item.name));
      cell.append(img,details);cell.addEventListener('click',()=>openLightbox(i));
      grid.append(cell);
   }
   more.hidden=count<=ui.limit;more.textContent='Показать ещё · '+Math.min(count-ui.limit,72)+' из '+(count-ui.limit);
   footer.replaceChildren();
   if(ui.venue!=='all'&&visible[0]?.drive){
      const link=node('a','ad-photo-drive','Открыть исходный альбом в Google Drive');
      link.href=visible[0].drive;link.rel='noopener noreferrer';link.target='_blank';footer.append(link);
   }
   if(!count)grid.append(node('p','ad-photo-empty',
     loadError || (!loaded?'Загрузка фотографий утверждённых площадок…':
     !albumList.length?'В программе пока нет утверждённых площадок. Отметьте площадку как утверждённую в разделе «Программа».':
     'Для выбранных площадок пока нет фотографий в альбомах.')));
   if(ui.view!==null){closeLightbox()}
 }
 select.addEventListener('change',()=>{ui.venue=select.value;ui.section='Все фотографии';ui.limit=72;render()});
 search.addEventListener('input',()=>{ui.search=search.value.trim().toLocaleLowerCase('ru');ui.limit=72;render()});
 more.addEventListener('click',()=>{ui.limit+=72;render()});
 close.addEventListener('click',closeLightbox);
 previous.addEventListener('click',()=>nextImage(-1));
 next.addEventListener('click',()=>nextImage(1));
 dialog.addEventListener('click',e=>{if(e.target===dialog)closeLightbox()});
 const key=e=>{if(dialog.hidden)return;if(e.key==='Escape')closeLightbox();if(e.key==='ArrowLeft')nextImage(-1);if(e.key==='ArrowRight')nextImage(1)};
 document.addEventListener('keydown',key);
 let touchX=0;
 dialog.addEventListener('touchstart',e=>{touchX=e.changedTouches[0]?.clientX||0},{passive:true});
 dialog.addEventListener('touchend',e=>{const dx=(e.changedTouches[0]?.clientX||0)-touchX;if(Math.abs(dx)>60)nextImage(dx<0?1:-1)},{passive:true});
 activeCleanup=()=>{disposed=true;document.removeEventListener('keydown',key);document.body.classList.remove('ad-photo-lock');activeCleanup=null;};
 // Load from the authenticated programme API; do not fall back to unapproved venues.
 async function loadApprovedProgramme(){
  try{
   const response=await fetch('/admin/index.php?api=admin%2Frecords&collection=schedule_items',{
    headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store'
   });
   const data=await response.json();
   if(!response.ok||!data.ok||!Array.isArray(data.items))throw new Error(data.message||'Программа недоступна');
   if(disposed)return;
   const approved=approvedVenueIds(data.items);
   albumList=ALL_ALBUMS.filter(album=>approved.has(album.id));
   const total=albumList.reduce((sum,album)=>sum+album.photos.length,0);
   select.replaceChildren(allOption);
   for(const venue of albumList){
    const option=node('option','',venue.name+' · '+venue.photos.length);
    option.value=venue.id;select.append(option);
   }
   lead.textContent=albumList.length
    ?total+' фотографий из '+albumList.length+' утверждённых площадок программы. Выберите место или категорию: залы, террасы, территории и помещения.'
    :'В программе пока не отмечено ни одной утверждённой площадки. После утверждения она появится здесь автоматически.';
  }catch(error){
   if(disposed)return;
   loadError='Не удалось получить утверждённые площадки из программы. Проверьте доступ к базе данных и обновите страницу.';
   lead.textContent=loadError;
   albumList=[]; // Fail closed: never show all candidate venues as approved.
  }
  loaded=true;
  if(!disposed)render();
 }
 render();
 loadApprovedProgramme();
 return activeCleanup;
}
