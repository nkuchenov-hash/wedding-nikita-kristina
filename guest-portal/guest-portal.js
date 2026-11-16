// Draft invited-guest portal. Not published before trusted HTTPS and backend activation.
const API='/api/index.php?r=';
const host=document.querySelector('#guest-app');
let csrf='';
let guest=null;
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node};
function label(text,control){const l=el('label','ga-field');l.append(el('span','',text),control);return l}
function input(value='',type='text'){const node=el('input');node.type=type;node.value=value??'';return node}
function action(text,handler){const b=el('button','ga-button',text);b.type='button';b.addEventListener('click',()=>handler(b));return b}
function notice(target,text){const n=el('p','ga-notice',text);target.append(n);return n}
function section(name,title,description){const card=el('section','ga-card');card.dataset.section=name;card.append(el('h2','',title));if(description)card.append(el('p','ga-lead',description));host.append(card);return card}
async function api(route,options={}){
 const headers={'Accept':'application/json'};
 if(csrf&&options.method&&options.method!=='GET')headers['X-CSRF-Token']=csrf;
 if(options.data && !(options.data instanceof FormData)) headers['Content-Type']='application/json';
 const response=await fetch(API+encodeURIComponent(route),{
   method:options.method||'GET',credentials:'same-origin',headers,
   body:options.data instanceof FormData?options.data:options.data?JSON.stringify(options.data):undefined,cache:'no-store'});
 let body;try{body=await response.json()}catch{throw new Error('Не удалось получить ответ сервера')}
 if(!response.ok||!body.ok)throw new Error(body.message||'Ошибка '+response.status);
 return body;
}
function stateMessage(text){host.replaceChildren();const pane=section('status','Свадебный сайт готовится',text);return pane}
function status(form,message){let s=form.querySelector('.ga-status');if(!s){s=el('p','ga-status');form.append(s)}s.textContent=message}
async function start(){
 try{
   const session=await api('auth/session');csrf=session.csrf;
   if(session.role!=='guest'){login();return}
   await dashboard();
 }catch(e){stateMessage('Личный кабинет будет доступен после запуска защищённого сайта. Пока регистрация и анкеты не принимаются.')}
}
function login(){
 host.replaceChildren();
 const pane=section('invite','Ваше приглашение','Войти можно только по персональному приглашению.');
 const form=el('form','ga-form');
 const token=input('','password');token.placeholder='Код приглашения';token.required=true;token.autocomplete='off';
 // Tokens are read from URL fragment, never from query parameters or Referer headers.
 const fragment=location.hash.match(/^#invite\/([a-f0-9]{64})$/i);
 if(fragment){token.value=fragment[1];history.replaceState(null,'',location.pathname);}
 form.append(label('Персональный код',token));
 const b=el('button','ga-button','Открыть анкету');b.type='submit';form.append(b);
 form.addEventListener('submit',async e=>{
   e.preventDefault();b.disabled=true;
   try{const result=await api('auth/invite',{method:'POST',data:{token:token.value.trim().toLowerCase()}});
     csrf=result.csrf;await dashboard();
   }catch(err){status(form,err.message)}finally{b.disabled=false}
 });
 pane.append(form);
}
function tabs(root,panes){
 const nav=el('nav','ga-tabs');nav.setAttribute('aria-label','Разделы кабинета');
 for(const [key,title]of panes){const b=action(title,()=>{for(const p of host.querySelectorAll('.ga-card[data-section]'))p.hidden=p.dataset.section!==key;for(const n of nav.querySelectorAll('button'))n.classList.toggle('selected',n===b)});
 nav.append(b);}
 root.append(nav);
 const first=nav.querySelector('button');if(first)first.click();
}
function checkbox(text,checked){const l=el('label','ga-checkbox');const c=input('','checkbox');c.checked=Boolean(checked);l.append(c,el('span','',text));return [l,c]}
async function dashboard(){
 const info=await api('guest/me');guest=info.guest;csrf=info.csrf;
 host.replaceChildren();
 const header=el('header','ga-top');header.append(el('p','ga-eyebrow','СВАДЬБА · ЛИЧНЫЙ КАБИНЕТ'),el('h1','',guest.display_name));
 const logout=action('Выйти',async()=>{await api('auth/logout',{method:'POST'});csrf='';guest=null;login()});logout.classList.add('ga-quiet');header.append(logout);host.append(header);
 const nav=el('div','ga-navigation');host.append(nav);
 await Promise.all([profilePanel(info),rsvpPanel(info),menuPanel(info),photosPanel(),directoryPanel(),storyPanel()]);
 tabs(nav,[['profile','Моя карточка'],['rsvp','Участие'],['menu','Меню'],['photos','Фотографии'],['directory','Подтверждённые'],['story','История']]);
}
function profilePanel(info){
 const card=section('profile','Шаг 1. Данные гостя','Сохраните свою карточку перед подтверждением участия. Только вы решаете, показывать ли её другим гостям.');
 const form=el('form','ga-form');
 const display=input(info.guest.display_name);display.required=true;display.maxLength=255;
 const city=input(info.guest.city);city.maxLength=255;
 const about=el('textarea');about.value=info.guest.about||'';about.maxLength=1200;about.rows=4;
 const [visLabel,visible]=checkbox('Показывать мою карточку другим приглашённым',info.guest.profile_visible);
 const [consentLabel,consent]=checkbox('Я разрешаю показывать указанное имя, город и текст в списке гостей',Boolean(info.guest.consent_at));
 form.append(label('Как тебя представить',display),label('Город',city),label('Пара слов о себе',about),visLabel,consentLabel);
 const b=el('button','ga-button','Сохранить карточку');b.type='submit';form.append(b);card.append(form);
 form.addEventListener('submit',async e=>{
   e.preventDefault();b.disabled=true;
   try{await api('guest/profile',{method:'PATCH',data:{display_name:display.value,city:city.value,about:about.value,profile_visible:visible.checked,consent:consent.checked}});
     guest.profile_completed_at=new Date().toISOString();
     status(form,'Анкета сохранена. Теперь перейдите к подтверждению участия.');
     host.querySelector('.ga-tabs button:nth-child(2)')?.click();}
   catch(err){status(form,err.message)}finally{b.disabled=false}
 });
}
function rsvpPanel(info){
 const card=section('rsvp','Шаг 2. Подтверждение участия','После сохранения анкеты выберите «Да, буду», «Пока не знаю» или «Не смогу». Ответ можно изменить позднее.');
 const form=el('form','ga-form');
 const select=el('select');
 for(const [v,t]of [['yes','Да, буду'],['maybe','Пока не знаю'],['no','Не смогу']]){const o=el('option','',t);o.value=v;select.append(o)}
 select.value=info.rsvp?.attendance||'maybe';
 const adults=input(info.rsvp?.adults??1,'number');adults.min='0';adults.max=String(1+Number(guest.plus_one_allowed));adults.required=true;
 const kids=input(info.rsvp?.children??0,'number');kids.min='0';kids.max=String(guest.children_count);kids.required=true;
 const dietary=el('textarea');dietary.rows=3;dietary.value=info.rsvp?.dietary_notes||'';dietary.maxLength=1000;
 const notes=el('textarea');notes.rows=3;notes.value=info.rsvp?.other_notes||'';notes.maxLength=1200;
 const [transLabel,transport]=checkbox('Нужен трансфер',Boolean(info.rsvp?.transport_needed));
 form.append(label('Ответ',select),label('Взрослые',adults),label('Дети',kids),
  label('Аллергии, питание и ограничения (только для организаторов)',dietary),
  label('Дополнительная информация (только для организаторов)',notes),transLabel);
 const b=el('button','ga-button','Отправить ответ');b.type='submit';form.append(b);card.append(form);
 form.addEventListener('submit',async e=>{e.preventDefault();b.disabled=true;
  try{await api('guest/rsvp',{method:'POST',data:{
    attendance:select.value,adults:Number(adults.value),children:Number(kids.value),
    transport_needed:transport.checked,dietary_notes:dietary.value,other_notes:notes.value
  }});status(form,select.value==='yes'?'Участие подтверждено. В списке гостей вы появитесь только если разрешили публикацию в своей карточке.':'Ответ получен и сохранён');}
  catch(err){status(form,err.message)}finally{b.disabled=false}
 });
}
async function menuPanel(info){
 const card=section('menu','Меню и предпочтения','Выбери блюда, когда организаторы опубликуют варианты.');
 let data;
 try{data=await api('guest/menu')}catch(err){notice(card,err.message);return}
 const groups=Map.groupBy(data.options||[],o=>o.category);
 if(groups.size===0){notice(card,'Меню ещё не утверждено. Информация появится здесь позже.');return}
 for(const [category,opts]of groups){
  const pane=el('fieldset','ga-menu-group');pane.append(el('legend','',category));
  const selected=info.choices?.find(x=>x.category===category)?.option_id;
  for(const option of opts){
   const lab=el('label','ga-radio'),radio=input('','radio');radio.name=category;radio.value=option.id;radio.checked=selected===option.id;
   lab.append(radio,el('span','',option.title+(option.allergens?' · Аллергены: '+option.allergens:'')));
   pane.append(lab);
   radio.addEventListener('change',async()=>{if(!radio.checked)return;
     try{await api('guest/menu-choice',{method:'POST',data:{option_id:option.id}});status(pane,'Выбор сохранён')}
     catch(err){status(pane,err.message)}
   });
  }
  card.append(pane);
 }
}
async function photosPanel(){
 const card=section('photos','Наши фотографии','Фотографии сохраняются приватно и появятся в галерее только после модерации.');
 const form=el('form','ga-form');
 const file=input('','file');file.accept='image/jpeg,image/png,image/webp';file.required=true;
 const caption=input('');caption.maxLength=500;
 const b=el('button','ga-button','Отправить фотографию');b.type='submit';
 form.append(label('Фото до 10 МБ',file),label('Подпись',caption),b);card.append(form);
 form.addEventListener('submit',async e=>{e.preventDefault();if(!file.files?.[0])return;b.disabled=true;
   const body=new FormData();body.append('photo',file.files[0]);body.append('caption',caption.value);
   try{await api('guest/photos',{method:'POST',data:body});file.value='';status(form,'Фото получено, ожидает проверки');}
   catch(err){status(form,err.message)}finally{b.disabled=false}
 });
 try{const photos=await api('guest/photos');notice(card,'Загружено: '+photos.items.length+' (личные и ожидающие модерации)')}
 catch{}
}
async function directoryPanel(){
 const card=section('directory','Подтверждённые гости','Здесь только те, кто подтвердил участие и отдельно разрешил показывать свои данные. Контакты и личные ответы не публикуются.');
 try{
   const data=await api('guest/directory');
   if(!data.guests?.length){notice(card,'Никто из подтвердивших участие пока не разрешил показать свою карточку.');return}
   const grid=el('div','ga-grid');
   for(const person of data.guests){const tile=el('article','ga-person');tile.append(el('h3','',person.display_name),el('p','',person.city),el('p','',person.about));grid.append(tile)}
   card.append(grid);
 }catch(err){notice(card,err.message)}
}
function storyPanel(){
 const card=section('story','Напиши что-нибудь о нас','Истории и поздравления появятся только после проверки организаторами.');
 const form=el('form','ga-form');const text=el('textarea');text.rows=6;text.maxLength=2000;text.required=true;
 const b=el('button','ga-button','Отправить историю');b.type='submit';
 form.append(label('Ваше сообщение',text),b);card.append(form);
 form.addEventListener('submit',async e=>{e.preventDefault();b.disabled=true;
   try{await api('guest/story',{method:'POST',data:{content:text.value}});text.value='';status(form,'Спасибо. Сообщение ожидает модерации.')}
   catch(err){status(form,err.message)}finally{b.disabled=false}
 });
}
start();
