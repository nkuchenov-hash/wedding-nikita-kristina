import {PUBLIC_VENUES} from './venues.js';

const elem=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node};
const venueNames=new Map(PUBLIC_VENUES.map(v=>[v.id,v.name]));
const archiveUrl='https://drive.google.com/drive/folders/195OYX_CPglwFmwSqwzRhQt7yrYyIPeBi';
const mimeNames={pdf:'PDF',doc:'Google Docs',docx:'Word',xlsx:'Excel',jpg:'Изображение',mp4:'Видео',folder:'Папка'};
const classify=(file)=>file.type==='video'?'Видео':file.type==='archive'?'Архив':/(смет|расчёт|коммерческ|предложени|прайс|условия|меню)/i.test(file.title)?'Предложения и сметы':'Документы';
const safeUrl=(raw)=>{try{const u=new URL(raw);return u.protocol==='https:'&&(u.hostname==='drive.google.com'||u.hostname==='docs.google.com')?u.href:''}catch{return ''}};
function previewUrl(url,mime){
 try {
  const u=new URL(url);
  if(!safeUrl(url))return '';
  if(mime==='folder')return '';
  if(mime==='doc')return url.replace(/\/edit(?:[?#].*)?$/,'/preview');
  return url.replace(/\/view(?:[?#].*)?$/,'/preview');
 }catch{return '';}
}
export async function activateDocumentArchive(root){
 const target=root.querySelector('.admin-content');
 if(!target)return;
 target.replaceChildren();
 const page=elem('section','ad-docs-archive');
 const header=elem('header','ad-docs-header');
 header.append(elem('span','ad-docs-kicker','ОРГАНИЗАЦИЯ  /  АРХИВ'),elem('h1','','Документы и сметы'),
   elem('p','ad-docs-lead','Все найденные предложения, расчёты, договорные условия и видеоматериалы из свадебной папки Google Drive — по площадкам.'));
 page.append(header);
 const toolbar=elem('div','ad-docs-toolbar');
 const filter=elem('select','ad-docs-select');
 const all=elem('option','','Все площадки');all.value='all';filter.append(all);
 for(const v of PUBLIC_VENUES){const opt=elem('option','',v.name);opt.value=v.id;filter.append(opt)}
 const search=elem('input','ad-docs-search');search.type='search';search.placeholder='Поиск по документам и площадкам';search.setAttribute('aria-label','Поиск документов');
 toolbar.append(filter,search);page.append(toolbar);
 const chipRow=elem('div','ad-docs-chips');page.append(chipRow);
 const stats=elem('div','ad-docs-stats');page.append(stats);
 const cards=elem('div','ad-docs-grid');page.append(cards);
 const footer=elem('footer','ad-docs-footer');const folderLink=elem('a','','Открыть всю свадебную папку Google Drive');folderLink.href=archiveUrl;folderLink.target='_blank';folderLink.rel='noopener noreferrer';footer.append(folderLink);page.append(footer);
 const viewer=elem('div','ad-docs-viewer');viewer.hidden=true;viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');
 const close=elem('button','ad-docs-close','Закрыть ×');close.type='button';
 const frame=elem('iframe','ad-docs-frame');frame.title='Предпросмотр документа';frame.referrerPolicy='no-referrer';
 const notice=elem('p','ad-docs-frame-note','Если предпросмотр не поддерживается, откройте оригинал в Google Drive.');
 const direct=elem('a','ad-docs-direct','Открыть оригинал');direct.target='_blank';direct.rel='noopener noreferrer';
 const frameTop=elem('div','ad-docs-frame-top');frameTop.append(elem('strong','','Просмотр документа'),close);
 viewer.append(frameTop,frame,notice,direct);page.append(viewer);target.append(page);
 const state={venue:'all',kind:'Все файлы',search:''};
 const kinds=['Все файлы','Предложения и сметы','Документы','Видео','Архив'];
 let rows=[];
 function dismiss(){viewer.hidden=true;frame.src='about:blank';document.body.classList.remove('ad-docs-modal')}
 function openPreview(file){
  const url=safeUrl(file.source_url);if(!url)return;
  const preview=previewUrl(url,file.mime);
  if(!preview){window.open(url,'_blank','noopener,noreferrer');return}
  frame.src=preview;direct.href=url;viewer.hidden=false;document.body.classList.add('ad-docs-modal');close.focus();
 }
 function render(){
  const shown=rows.filter(file=>{
    if(state.venue!=='all'&&file.venue_id!==state.venue)return false;
    if(state.kind!=='Все файлы'&&classify(file)!==state.kind)return false;
    if(!state.search)return true;
    return (file.title+' '+(venueNames.get(file.venue_id)||'')+' '+file.mime).toLocaleLowerCase('ru').includes(state.search);
  });
  filter.value=state.venue;
  chipRow.replaceChildren();
  for(const kind of kinds){const b=elem('button','ad-docs-chip'+(kind===state.kind?' active':''),kind);
    b.type='button';b.addEventListener('click',()=>{state.kind=kind;render()});chipRow.append(b);
  }
  stats.replaceChildren();
  for(const [name,num] of [['Документов',rows.filter(x=>x.type==='document').length],['Видео',rows.filter(x=>x.type==='video').length],['Папок-архивов',rows.filter(x=>x.type==='archive').length],['Показано',shown.length]]){
    const tile=elem('div','ad-docs-stat');tile.append(elem('strong','',String(num)),elem('span','',name));stats.append(tile);
  }
  cards.replaceChildren();
  if(!shown.length){cards.append(elem('p','ad-docs-empty','Для этого фильтра документов не найдено. Исходные файлы остаются в Google Drive.'));return}
  for(const file of shown){
    const card=elem('article','ad-docs-card');
    const top=elem('div','ad-docs-card-top');top.append(elem('span','ad-docs-filetype',mimeNames[file.mime]||'Файл'),
      elem('span','ad-docs-kind',classify(file)));card.append(top);
    const head=elem('h3','',file.title);card.append(head);
    const caption=elem('p','ad-docs-venue',venueNames.get(file.venue_id)||'Общий архив');card.append(caption);
    const controls=elem('div','ad-docs-actions');
    const link=elem('a','ad-docs-btn ad-docs-open','Открыть');
    link.href=safeUrl(file.source_url)||'#';link.target='_blank';link.rel='noopener noreferrer';controls.append(link);
    if(file.mime!=='folder'){
      const prev=elem('button','ad-docs-btn ad-docs-preview','Просмотреть');
      prev.type='button';prev.addEventListener('click',()=>openPreview(file));controls.append(prev);
    }
    card.append(controls);cards.append(card);
  }
 }
 filter.addEventListener('change',()=>{state.venue=filter.value;render()});
 search.addEventListener('input',()=>{state.search=search.value.trim().toLocaleLowerCase('ru');render()});
 close.addEventListener('click',dismiss);
 viewer.addEventListener('click',e=>{if(e.target===viewer)dismiss()});
 const onKey=e=>{if(e.key==='Escape'&&!viewer.hidden)dismiss()};
 document.addEventListener('keydown',onKey);
 try{
  const resp=await fetch('/admin/index.php?api=admin%2Fvenue-files',{credentials:'same-origin',cache:'no-store'});
  const data=await resp.json();
  if(!resp.ok||!data.ok||!Array.isArray(data.files))throw new Error('Архив недоступен');
  rows=data.files;render();
 }catch(err){
  stats.replaceChildren();
  const fallback=elem('div','ad-docs-error');
  fallback.append(elem('h2','','Архив временно не загружен'),elem('p','','Оригинальные документы сохранены в Wedding Drive.'));
  const source=elem('a','','Открыть Wedding Drive');source.href=archiveUrl;source.target='_blank';source.rel='noopener noreferrer';fallback.append(source);cards.replaceChildren(fallback);
 }
 return ()=>{document.removeEventListener('keydown',onKey);dismiss()};
}
