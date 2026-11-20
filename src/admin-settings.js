import {itemTags} from './admin-program.js';
const $=(tag,cls='',value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
const button=(label,fn,cls='')=>{const e=$('button','ad-tl-button '+cls,label);e.type='button';e.addEventListener('click',fn);return e};
const color=value=>/^#[0-9a-fA-F]{6}$/.test(value||'')?value:'#DDE9DF';

export async function renderWeddingSettings(host,api){
 const [settings,records]=await Promise.all([api('admin/settings'),api('admin/records?collection=schedule_items')]);
 const tags=Array.isArray(settings.settings?.activity_tags)?settings.settings.activity_tags.map(x=>({...x})):[];
 const used=id=>(records.items||[]).some(item=>itemTags(item).includes(id));
 let saving=false;
 const header=$('header','ad-tl-settings-head');
 header.append($('h1','','Настройки'),$('p','','Общие теги для программы и пула идей.'));
 const panel=$('section','ad-tl-settings-content');
 panel.append($('h2','','Теги активностей'),$('p','ad-tl-settings-help','Теги объединяют классификацию и цвета карточек. У активности может быть несколько тегов.'));
 const list=$('div','ad-tl-settings-list'),actions=$('div','ad-tl-modal-actions');
 const message=$('p','ad-tl-form-error');message.setAttribute('role','status');
 panel.append(list,actions);
 host.classList.add('ad-timeline-page','ad-global-settings-page');
 host.replaceChildren(header,panel,message);
 function draw(){
   list.replaceChildren();actions.replaceChildren();
   for(const tag of tags){
     const row=$('div','ad-tl-settings-row');
     const name=$('input');name.type='text';name.maxLength=60;name.value=tag.label;
     name.setAttribute('aria-label','Название тега');
     name.addEventListener('input',()=>tag.label=name.value);
     const paint=$('input');paint.type='color';paint.value=color(tag.color);
     paint.setAttribute('aria-label','Цвет тега');
     paint.addEventListener('input',()=>tag.color=paint.value);
     const remove=button('Удалить',()=>{
       if(used(tag.id)){message.textContent='Тег используется в карточках.';return}
       tags.splice(tags.indexOf(tag),1);draw();
     },'ad-tl-muted');
     remove.disabled=used(tag.id);
     if(remove.disabled)remove.title='Сначала снимите тег с карточек';
     row.append(name,paint,remove);list.append(row);
   }
   if(!tags.length)list.append($('p','ad-tl-settings-help','Тегов пока нет.'));
   actions.append(button('+ Добавить тег',()=>{
     if(tags.length>=30){message.textContent='Не более 30 тегов.';return}
     let id,n=0;
     do{id='tag_'+Date.now().toString(36)+'_'+(n++).toString(36)}while(tags.some(x=>x.id===id));
     tags.push({id,label:'Новый тег',color:'#DDE9DF'});message.textContent='';draw();
     list.lastElementChild?.querySelector('input[type=text]')?.focus();
   },'ad-tl-secondary'));
   const save=button('Сохранить',async()=>{
     if(saving)return;
     if(tags.some(x=>!x.label.trim()||x.label.length>60)){message.textContent='Заполните названия тегов.';return}
     saving=true;save.disabled=true;
     try{
       await api('admin/settings',{method:'POST',body:{key:'activity_tags',
         value:tags.map(x=>({id:x.id,label:x.label.trim(),color:color(x.color)}))}});
       message.textContent='Теги сохранены. Цвета карточек обновлены в базе.';
       message.classList.add('ad-tl-setting-success');
     }catch(err){message.classList.remove('ad-tl-setting-success');message.textContent=err.message||'Ошибка сохранения'}
     finally{saving=false;save.disabled=false}
   },'ad-tl-primary');
   actions.append(save);
 }
 draw();
}
