/* The organizer's ONE guest-facing photo collection.
   It is NOT a gallery of candidate venue research or a guest moderation screen.
   No assets appear here without explicit organizer upload. */
import {PUBLIC_VENUES} from './venues.js';

const CATEGORY = Object.freeze([
  ['couple','Наши фотографии','Совместные снимки Никиты и Кристины'],
  ['location','Места из программы и регистрация','Только уже утверждённые места'],
  ['city','Петербург и достопримечательности','Город, архитектура, красивые места'],
  ['guide','Дополнительные развлечения','Куда сходить и чем заняться']
]);
export const GUEST_PHOTO_CATEGORIES=CATEGORY.map(([id,title])=>({id,title}));
export function approvedVenueIds(items=[]){
  return new Set(items.filter(item=>item&&item.stage==='program'&&Number(item.is_confirmed)===1&&item.venue_id)
    .map(item=>String(item.venue_id)));
}
export function guestGalleryAssets(items=[],approved=new Set()){
  return items.filter(item=>item&&['couple','location','city','guide'].includes(item.category)
    &&(item.category!=='location'||approved.has(String(item.venue_id||''))));
}

const venueLabels=new Map(PUBLIC_VENUES.map(v=>[v.id,v.name]));
const element=(tag,className='',value)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(value!==undefined)el.textContent=String(value);
  return el;
};
const button=(label,cls='')=>{const b=element('button','ad-photo-button '+cls,label);b.type='button';return b};
const linkImage=id=>'/admin/index.php?media=gallery&id='+encodeURIComponent(id);
const apiBase='/admin/index.php?api=';
const categoryName=id=>CATEGORY.find(c=>c[0]===id)?.[1]||'Фотография';
let cleanupActive=null;

export function activatePhotoArchive(root){
  if(cleanupActive)cleanupActive();
  const host=root.querySelector('.admin-content');
  if(!host)return;
  host.replaceChildren();
  const ui={category:'all',query:'',cols:3,limit:72,assets:[],approved:new Set(),
    csrf:'',busy:false,view:null,loaded:false,disposed:false};
  const page=element('section','ad-photo-archive ad-guest-curation');
  const head=element('header','ad-photo-head');
  head.append(element('div','ad-photo-eyebrow','ГОСТЕВАЯ ГАЛЕРЕЯ'),
    element('h1','','Фотографии для гостей'));
  const intro=element('p','ad-photo-lead',
    'Только фотографии пары, места регистрации, утверждённых локаций программы, Петербурга, достопримечательностей и дополнительных развлечений. Фотографии площадок для сравнения остаются в разделе «Площадки».');
  head.append(intro);page.append(head);
  const status=element('p','ad-photo-count');
  status.setAttribute('aria-live','polite');
  const form=element('form','ad-photo-upload-form');
  const uploadTitle=element('h2','','Добавить в гостевую галерею');
  const uploadHint=element('p','ad-photo-lead','Новые фото сохраняются закрытыми. Отметка «Для гостей» подготавливает их к публикации, но сама по себе не открывает гостевой сайт.');
  const inputs=element('div','ad-photo-upload-fields');
  const fileLabel=element('label','','Фотография');
  const file=element('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.required=true;
  fileLabel.append(file);
  const categoryLabel=element('label','','Раздел');
  const category=element('select');
  for(const [id,title] of CATEGORY){const o=element('option','',title);o.value=id;category.append(o)}
  categoryLabel.append(category);
  const venueLabel=element('label','','Утверждённая локация');
  const venue=element('select');
  venueLabel.append(venue);
  const captionLabel=element('label','','Подпись для гостей');
  const caption=element('input');caption.type='text';caption.maxLength=500;caption.placeholder='Короткая подпись к фотографии';
  captionLabel.append(caption);
  inputs.append(fileLabel,categoryLabel,venueLabel,captionLabel);
  const submit=button('Добавить фотографию','ad-photo-submit');submit.type='submit';
  const feedback=element('p','ad-photo-feedback');feedback.setAttribute('role','status');
  form.append(uploadTitle,uploadHint,inputs,submit,feedback);page.append(form);
  const toolbar=element('div','ad-photo-toolbar');
  const search=element('input','ad-photo-search');search.type='search';search.placeholder='Поиск по подписям и местам';
  search.setAttribute('aria-label','Поиск по фотографиям для гостей');
  const density=element('div','ad-photo-density');
  for(const count of [2,3,4]){
    const b=button(count+' в ряд');b.dataset.count=count;
    b.addEventListener('click',()=>{ui.cols=count;render()});density.append(b);
  }
  toolbar.append(search,density);
  const chips=element('nav','ad-photo-chips');
  chips.setAttribute('aria-label','Категории гостевой галереи');
  const grid=element('div','ad-photo-grid');
  const more=button('Показать ещё','ad-photo-more');
  const overlay=element('div','ad-photo-overlay');
  overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','Просмотр фотографии для гостей');
  const close=button('Закрыть ×','ad-photo-close');
  const prev=button('‹','ad-photo-prev');prev.setAttribute('aria-label','Предыдущая фотография');
  const next=button('›','ad-photo-next');next.setAttribute('aria-label','Следующая фотография');
  const figure=element('figure','ad-photo-figure');
  const full=element('img','ad-photo-full');full.alt='';
  const detail=element('figcaption','ad-photo-caption');
  const flag=button('','ad-photo-publish');
  const original=element('a','ad-photo-original','Открыть фото');original.target='_blank';original.rel='noopener noreferrer';
  figure.append(full,detail,flag,original);
  const count=element('div','ad-photo-lightbox-count');
  overlay.append(close,prev,figure,next,count);
  page.append(toolbar,chips,status,grid,more,overlay);host.append(page);
  let visible=[];

  async function request(route,{method='GET',data,formData}={}){
    const headers={Accept:'application/json'};
    if(method!=='GET'&&ui.csrf)headers['X-CSRF-Token']=ui.csrf;
    if(data)headers['Content-Type']='application/json';
    const [endpoint,params='']=route.split('?');
    const response=await fetch(apiBase+encodeURIComponent(endpoint)+(params?'&'+params:''),{
      method,headers,credentials:'same-origin',cache:'no-store',
      body:formData||(data?JSON.stringify(data):undefined)
    });
    let result;
    try{result=await response.json()}catch{throw new Error('Сервер галереи не отвечает')}
    if(!response.ok||!result.ok)throw new Error(result.message||'Ошибка галереи ('+response.status+')');
    return result;
  }
  function updateCategory(){
    const isLocation=category.value==='location';
    venueLabel.hidden=!isLocation;venue.required=isLocation;
    submit.disabled=ui.busy||!ui.loaded||(isLocation&&!ui.approved.size);
    if(isLocation&&!ui.approved.size)feedback.textContent='Сначала утвердите место в программе свадьбы — только тогда можно добавлять фото локации.';
    else if(feedback.textContent.startsWith('Сначала утвердите'))feedback.textContent='';
  }
  function setApproved(ids=[]){
    ui.approved=new Set(ids.map(String));
    venue.replaceChildren();
    const placeholder=element('option','','Выберите место из программы');placeholder.value='';venue.append(placeholder);
    for(const id of ui.approved){
      const option=element('option','',venueLabels.get(id)||id);option.value=id;venue.append(option);
    }
    venue.value='';
    updateCategory();
  }
  function currentItems(){
    const q=ui.query.trim().toLocaleLowerCase('ru');
    return guestGalleryAssets(ui.assets,ui.approved).filter(item=>
      (ui.category==='all'||item.category===ui.category)&&
      (!q||(item.caption||'').toLocaleLowerCase('ru').includes(q)||
        (venueLabels.get(item.venue_id)||'').toLocaleLowerCase('ru').includes(q))
    );
  }
  function drawLightbox(){
    if(ui.view===null||!visible.length)return;
    const item=visible[ui.view];
    if(!item){closeView();return}
    full.src=linkImage(item.id);full.alt=item.caption||categoryName(item.category);
    original.href=linkImage(item.id);
    detail.replaceChildren(element('strong','',item.caption||categoryName(item.category)),
      element('span','',categoryName(item.category)+
        (item.category==='location'?' · '+(venueLabels.get(item.venue_id)||item.venue_id):'')));
    flag.textContent=Number(item.is_public)===1?'Для гостей: включено ✓':'Для гостей: выключено';
    flag.disabled=ui.busy;flag.dataset.assetId=item.id;
    count.textContent=(ui.view+1)+' / '+visible.length;
  }
  function openView(index){
    ui.view=index;overlay.hidden=false;document.body.classList.add('ad-photo-lock');
    drawLightbox();close.focus({preventScroll:true});
  }
  function closeView(){ui.view=null;overlay.hidden=true;document.body.classList.remove('ad-photo-lock')}
  function step(delta){if(!visible.length)return;ui.view=(ui.view+delta+visible.length)%visible.length;drawLightbox()}
  function render(){
    chips.replaceChildren();
    const source=guestGalleryAssets(ui.assets,ui.approved);
    const choices=[['all','Все фотографии'],...CATEGORY.map(([id,title])=>[id,title])];
    for(const [id,title]of choices){
      const n=id==='all'?source.length:source.filter(x=>x.category===id).length;
      const chip=button(title+' · '+n,id===ui.category?'is-current':'');
      chip.addEventListener('click',()=>{ui.category=id;ui.limit=72;render()});
      chips.append(chip);
    }
    for(const b of density.querySelectorAll('button'))b.classList.toggle('is-current',Number(b.dataset.count)===ui.cols);
    visible=currentItems();
    status.textContent=ui.loaded?visible.length+' фотографий для гостей · '+source.filter(x=>Number(x.is_public)===1).length+' отмечены к публикации':'Загружаем фотографии для гостей…';
    grid.replaceChildren();grid.style.setProperty('--photo-cols',String(ui.cols));
    for(let i=0;i<Math.min(ui.limit,visible.length);i++){
      const item=visible[i];
      const cell=button('','ad-photo-card');
      const img=element('img');img.src=linkImage(item.id);img.loading='lazy';
      img.alt=item.caption||categoryName(item.category);
      img.onerror=()=>{img.style.display='none';cell.classList.add('ad-photo-no-image')};
      const text=element('span','ad-photo-card-info');
      text.append(element('strong','',item.caption||categoryName(item.category)),
        element('small','',(Number(item.is_public)===1?'Для гостей · ':'Черновик · ')+categoryName(item.category)));
      cell.append(img,text);cell.addEventListener('click',()=>openView(i));grid.append(cell);
    }
    if(ui.loaded&&!visible.length)grid.append(element('p','ad-photo-empty',
      'Пока нет фотографий в этом разделе. Добавьте только подходящие для гостей снимки; материалы неутверждённых площадок сюда не переносятся.'));
    more.hidden=visible.length<=ui.limit;
    more.textContent='Показать ещё · '+Math.min(72,visible.length-ui.limit);
    if(ui.view!==null)drawLightbox();
  }
  async function reload(){
    const data=await request('admin/gallery');
    if(ui.disposed)return;
    ui.assets=data.assets||[];
    setApproved(data.approved_venues||[]);
    ui.loaded=true;updateCategory();render();
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(ui.busy)return;
    if(!file.files?.[0]){feedback.textContent='Выберите фотографию';return}
    if(file.files[0].size>10*1024*1024){feedback.textContent='Размер файла должен быть не более 10 МБ';return}
    ui.busy=true;submit.disabled=true;feedback.textContent='Загрузка фотографии…';
    try{
      const data=new FormData();data.append('photo',file.files[0]);
      data.append('category',category.value);
      data.append('caption',caption.value.trim());
      if(category.value==='location'){
        if(!ui.approved.has(venue.value))throw new Error('Выберите утверждённую площадку из программы');
        data.append('venue_id',venue.value);
      }
      const result=await request('admin/gallery/upload',{method:'POST',formData:data});
      await reload();file.value='';caption.value='';
      feedback.textContent=result.duplicate?'Эта фотография уже есть в галерее.':'Фото сохранено как черновик для гостей.';
    }catch(error){feedback.textContent=error.message}
    finally{ui.busy=false;updateCategory()}
  });
  flag.addEventListener('click',async()=>{
    if(ui.view===null||ui.busy)return;
    const item=visible[ui.view];if(!item)return;
    ui.busy=true;flag.disabled=true;
    try{
      await request('admin/gallery/update',{method:'PATCH',data:{id:item.id,is_public:Number(item.is_public)!==1}});
      await reload();drawLightbox();
    }catch(error){feedback.textContent=error.message}
    finally{ui.busy=false;flag.disabled=false}
  });
  category.addEventListener('change',()=>{feedback.textContent='';updateCategory()});
  search.addEventListener('input',()=>{ui.query=search.value;ui.limit=72;render()});
  more.addEventListener('click',()=>{ui.limit+=72;render()});
  close.addEventListener('click',closeView);
  prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeView()});
  const key=e=>{if(overlay.hidden)return;if(e.key==='Escape')closeView();if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1)};
  document.addEventListener('keydown',key);
  let touchX=0;
  overlay.addEventListener('touchstart',e=>{touchX=e.changedTouches[0]?.clientX||0},{passive:true});
  overlay.addEventListener('touchend',e=>{const dx=(e.changedTouches[0]?.clientX||0)-touchX;if(Math.abs(dx)>60)step(dx<0?1:-1)},{passive:true});
  cleanupActive=()=>{
    ui.disposed=true;document.removeEventListener('keydown',key);
    document.body.classList.remove('ad-photo-lock');cleanupActive=null;
  };
  updateCategory();render();
  Promise.all([request('auth/session'),request('admin/gallery'),request('admin/records?collection=venues').catch(()=>({items:[]}))]).then(([session,data,venueData])=>{
    for(const v of venueData.items||[])if(v.id&&v.name)venueLabels.set(String(v.id),String(v.name));
    if(ui.disposed)return;
    ui.csrf=session.csrf||'';
    ui.assets=data.assets||[];
    setApproved(data.approved_venues||[]);
    ui.loaded=true;render();
  }).catch(error=>{
    if(ui.disposed)return;
    ui.loaded=true;
    feedback.textContent='Не удалось загрузить защищённую галерею: '+error.message;
    intro.textContent='Галерея недоступна без авторизованного сервера. Фотографии площадок для сравнения не подставляются вместо гостевых.';
    form.querySelectorAll('input,select,button').forEach(el=>el.disabled=true);
    render();
  });
  return cleanupActive;
}