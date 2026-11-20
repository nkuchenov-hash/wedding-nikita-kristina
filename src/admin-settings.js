import {BASE_TYPES,itemTags} from './admin-program.js';

// One settings screen for shared activity categories and tags; never edit them
// inside an individual activity. Persists to the existing private SQLite API.
const $=(tag,className='',text)=>{
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=String(text);
 return el;
};
const makeButton=(label,fn,style='')=>{
 const button=$('button','ad-tl-button '+style,label);
 button.type='button';button.addEventListener('click',fn);return button;
};
const validColor=value=>/^#[0-9a-fA-F]{6}$/.test(value||'')?value:'#DDE9DF';

export async function renderWeddingSettings(host,api){
 const [settingsResponse,recordsResponse]=await Promise.all([
   api('admin/settings'),api('admin/records?collection=schedule_items')
 ]);
 const settings=settingsResponse.settings||{};
 const records=recordsResponse.items||[];
 const state={
   activity_types:Array.isArray(settings.activity_types)&&settings.activity_types.length
     ?settings.activity_types.map(t=>({...t}))
     :BASE_TYPES.map(t=>({...t})),
   activity_tags:Array.isArray(settings.activity_tags)
     ?settings.activity_tags.map(t=>({...t})):[]
 };
 let active='activity_tags',saving=false;
 const head=$('header','ad-tl-settings-head');
 head.append($('h1','','Общие настройки'),$('p','','Настройка оформления и классификации активностей свадебной программы.'));
 const tabs=$('nav','ad-tl-settings-tabs');
 tabs.setAttribute('aria-label','Тип настроек');
 const content=$('section','ad-tl-settings-content');
 const status=$('p','ad-tl-form-error');status.setAttribute('role','status');
 const available=new Set(['activity_types','activity_tags']);
 function used(key,id){
   return records.some(x=>key==='activity_types'
     ?x.activity_type===id
     :itemTags(x).includes(id));
 }
 const draw=()=>{
   tabs.replaceChildren();content.replaceChildren();status.textContent='';
   const tabNames=[['activity_tags','Теги'],['activity_types','Категории']];
   for(const [id,title] of tabNames){
     const b=makeButton(title,()=>{active=id;draw()},'ad-tl-main-tab'+(active===id?' is-active':''));
     b.setAttribute('aria-pressed',String(active===id));tabs.append(b);
   }
   const isTag=active==='activity_tags';
   const title=$('h2','',isTag?'Теги для активностей':'Категории и цвета карточек');
   const note=$('p','ad-tl-settings-help',isTag
     ?'Несколько тегов можно назначать одной активности. Здесь меняются их названия и цвета.'
     :'У каждой активности одна категория. Она определяет основной цвет карточки.');
   content.append(title,note);
   const list=$('div','ad-tl-settings-list');
   const data=state[active];
   for(const entry of data){
     const row=$('div','ad-tl-settings-row');
     const input=$('input');input.type='text';input.value=entry.label;input.maxLength=60;
     input.setAttribute('aria-label','Название '+(isTag?'тега':'категории'));
     input.addEventListener('input',()=>entry.label=input.value);
     const color=$('input');color.type='color';color.value=validColor(entry.color);
     color.setAttribute('aria-label','Цвет '+(isTag?'тега':'категории'));
     color.addEventListener('input',()=>entry.color=color.value);
     const remove=makeButton('Удалить',()=>{
       if(used(active,entry.id)){status.textContent='Этот '+(isTag?'тег':'тип')+' уже применяется в карточках. Сначала снимите его с активностей.';return}
       data.splice(data.indexOf(entry),1);draw();
     },'ad-tl-muted');
     remove.disabled=used(active,entry.id);
     if(remove.disabled)remove.title='Используется в карточках';
     row.append(input,color,remove);list.append(row);
   }
   if(!data.length)list.append($('p','ad-tl-settings-help','Пока нет записей.'));
   content.append(list);
   const actions=$('div','ad-tl-modal-actions');
   actions.append(makeButton('+ '+(isTag?'Добавить тег':'Добавить категорию'),()=>{
     if(data.length>=30){status.textContent='Максимум 30 записей.';return}
     const prefix=isTag?'tag_':'category_';
     let candidate,idx=0;
     do{candidate=prefix+Date.now().toString(36)+'_'+(idx++).toString(36)}while(data.some(x=>x.id===candidate));
     data.push({id:candidate,label:isTag?'Новый тег':'Новая категория',color:'#DDE9DF'});
     draw();list.lastElementChild?.querySelector('input[type=text]')?.focus();
   },'ad-tl-secondary'));
   const save=makeButton('Сохранить изменения',async()=>{
     if(saving)return;
     if(active==='activity_types'&&!data.length){status.textContent='Нужна хотя бы одна категория.';return}
     if(data.some(x=>!x.label.trim()||x.label.length>60)){
       status.textContent='Заполните названия (не длиннее 60 символов).';return;
     }
     if(!available.has(active))return;
     saving=true;save.disabled=true;
     try{
       await api('admin/settings',{method:'POST',body:{key:active,value:data.map(x=>({
         id:x.id,label:x.label.trim(),color:validColor(x.color)
       }))}});
       status.textContent='Изменения сохранены в общей базе.';
       status.classList.add('ad-tl-setting-success');
     }catch(e){status.classList.remove('ad-tl-setting-success');status.textContent=e.message||'Ошибка сохранения'}
     finally{saving=false;save.disabled=false}
   },'ad-tl-primary'));
   actions.append(save);content.append(actions);
 };
 host.classList.add('ad-timeline-page','ad-global-settings-page');
 host.replaceChildren(head,tabs,content,status);
 draw();
}
