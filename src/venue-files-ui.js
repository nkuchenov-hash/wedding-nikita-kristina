/*
 * Organizer-only files inside individual venue cards.
 * Source files stay on Drive; metadata lives in protected SQLite on REG.RU.
 * No global document section and no localStorage copies of file metadata.
 */
const API='/admin/index.php?api=admin%2Fvenue-files&venue_id=';
const KIND={pdf:'PDF',doc:'Google Docs',docx:'Word',xlsx:'Excel',jpg:'Фото',mp4:'Видео',folder:'Папка'};
const cache=new Map();
const node=(tag,cls='',txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=String(txt);return el};
function driveUrl(raw){
 try{
  const url=new URL(String(raw));
  if(url.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(url.hostname))return '';
  return url.href;
 }catch{return '';}
}
function previewLink(url,mime){
 if(!driveUrl(url)||mime==='folder')return '';
 if(mime==='doc')return url.replace(/\/edit(?:[?#].*)?$/,'/preview');
 if(/\/view(?:[?#].*)?$/.test(url))return url.replace(/\/view(?:[?#].*)?$/,'/preview');
 return '';
}
function fileGroup(file){
 if(file.type==='video')return 'Видео с площадки';
 if(file.type==='archive')return 'Исходные папки';
 if(/смет|расч[её]т|коммерческ|предложени|меню|прайс|стоимост|цена|условия/i.test(file.title))return 'Сметы и предложения';
 return 'Документы';
}
async function fetchFiles(id){
 if(cache.has(id))return cache.get(id);
 const promise=(async()=>{
  const r=await fetch(API+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error('Ответ сервера '+r.status);
  const data=await r.json();
  if(!data.ok||!Array.isArray(data.files))throw new Error('Список файлов недоступен');
  return data.files.filter(f=>f.venue_id===id && driveUrl(f.source_url));
 })();
 cache.set(id,promise);
 try{return await promise}catch(err){cache.delete(id);throw err}
}
function showPreview(root,file){
 const url=driveUrl(file.source_url);
 const preview=previewLink(url,file.mime);
 if(!preview){window.open(url,'_blank','noopener,noreferrer');return}
 let lightbox=root.querySelector('.vdp-file-dialog');
 if(!lightbox){
  lightbox=node('div','vdp-file-dialog');lightbox.setAttribute('role','dialog');
  lightbox.setAttribute('aria-modal','true');lightbox.setAttribute('aria-label','Просмотр файла площадки');
  lightbox.hidden=true;root.append(lightbox);
  lightbox.addEventListener('click',e=>{if(e.target===lightbox)closePreview()});
  const key=e=>{if(e.key==='Escape'&&!lightbox.hidden)closePreview()};
  document.addEventListener('keydown',key,{signal:controller.signal});
 }
 const controller=root.__venueFileController||(root.__venueFileController=new AbortController());
 function closePreview(){
  lightbox.hidden=true;lightbox.replaceChildren();
  document.body.classList.remove('vdp-file-locked');
 }
 const box=node('div','vdp-file-dialog-inner');
 const top=node('div','vdp-file-dialog-top');
 const name=node('strong','',file.title);
 const close=node('button','vdp-file-close','Закрыть ×');close.type='button';
 close.addEventListener('click',closePreview);
 top.append(name,close);
 const frame=node('iframe','vdp-file-iframe');
 frame.title='Предпросмотр: '+file.title;frame.loading='lazy';frame.referrerPolicy='no-referrer';frame.src=preview;
 const footer=node('div','vdp-file-dialog-footer');
 const original=node('a','vdp-file-open','Открыть оригинал в Google Drive');
 original.href=url;original.target='_blank';original.rel='noopener noreferrer';
 footer.append(original);
 box.append(top,frame,footer);lightbox.append(box);lightbox.hidden=false;
 document.body.classList.add('vdp-file-locked');close.focus();
}
function card(root,file){
 const el=node('article','vdp-file-card');
 const title=node('div','vdp-file-card-title');
 title.append(node('span','vdp-file-kind',KIND[file.mime]||'Файл'),
   node('h4','',file.title));
 const actions=node('div','vdp-file-card-actions');
 const link=node('a','vdp-file-open','Открыть оригинал');
 link.href=driveUrl(file.source_url);link.rel='noopener noreferrer';link.target='_blank';
 actions.append(link);
 if(previewLink(link.href,file.mime)){
  const btn=node('button','vdp-file-preview','Просмотр');
  btn.type='button';btn.addEventListener('click',()=>showPreview(root,file));actions.append(btn);
 }
 el.append(title,actions);
 return el;
}
function hydrateBlock(root,holder,files){
 if(!holder.isConnected)return;
 holder.replaceChildren();
 const mode=holder.dataset.venueFilesKind||'all';
 const list=mode==='quotes'?files.filter(f=>f.type==='document'):files;
 const order=['Сметы и предложения','Документы','Видео с площадки','Исходные папки'];
 const buckets=new Map();
 for(const file of list){
  const key=fileGroup(file);
  if(!buckets.has(key))buckets.set(key,[]);
  buckets.get(key).push(file);
 }
 const header=node('div','vdp-files-header');
 header.append(node('h3','',mode==='quotes'?'Исходные файлы и расчёты':'Файлы этой площадки'),
  node('span','vdp-files-count',list.length+' файлов'));
 holder.append(header);
 if(!list.length){
  holder.append(node('p','vdp-files-empty',
   mode==='quotes'?'Загруженных исходных смет пока нет.':'Для этой площадки пока нет приложенных файлов.'));
  return;
 }
 for(const section of order){
  const items=buckets.get(section);
  if(!items?.length)continue;
  const group=node('section','vdp-file-group');
  group.append(node('h4','vdp-file-group-label',section));
  const grid=node('div','vdp-file-grid');
  for(const file of items)grid.append(card(root,file));
  group.append(grid);holder.append(group);
 }
 if(mode==='quotes'){
  const id=holder.dataset.venueFiles;
  const more=node('a','vdp-file-all-link','Все документы и видео площадки');
  more.href='#/admin/venues/'+encodeURIComponent(id)+'/documents';holder.append(more);
 }
}
// Called after every venue render, including tabs, photo navigation and filters.
// The public guest site never imports this file.
export function hydrateVenueFiles(root){
 for(const holder of root.querySelectorAll('[data-venue-files]')){
  const id=holder.dataset.venueFiles;
  if(!/^[a-z0-9-]{2,36}$/.test(id))continue;
  holder.replaceChildren(node('p','vdp-files-loading','Загрузка файлов площадки…'));
  fetchFiles(id).then(files=>hydrateBlock(root,holder,files)).catch(err=>{
   if(!holder.isConnected)return;
   holder.replaceChildren(node('p','vdp-files-error','Не удалось загрузить файлы: '+err.message));
  });
 }
}
