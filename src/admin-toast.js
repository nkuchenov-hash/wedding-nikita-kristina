// Shared administrator notifications. Confirmation messages never occupy page
// headers or push content down. Only field validation remains beside form inputs.
const TOAST_ID='ad-global-toast';
let removalTimer=null;

export function showAdminToast(message,{kind='success',duration=4000,action=null}={}){
 const text=String(message||'').trim();
 if(!text||typeof document==='undefined'||!document.body)return;
 const previous=document.getElementById?.(TOAST_ID)||
   document.querySelector?.('#'+TOAST_ID);
 if(previous)previous.remove();
 if(removalTimer!==null){clearTimeout(removalTimer);removalTimer=null}
 const node=document.createElement('div');
 node.id=TOAST_ID;
 node.className='ad-global-toast'+(kind==='error'?' is-error':'');
 node.setAttribute('role',kind==='error'?'alert':'status');
 node.setAttribute('aria-live',kind==='error'?'assertive':'polite');
 const label=document.createElement('span');label.textContent=text;
 node.append(label);
 if(action?.label&&typeof action.onClick==='function'){
   const button=document.createElement('button');
   button.type='button';button.className='ad-global-toast-action';
   button.textContent=String(action.label);
   button.addEventListener('click',action.onClick);
   node.append(button);
 }
 document.body.append(node);
 removalTimer=setTimeout(()=>{
   node.remove();removalTimer=null;
 },Math.max(1600,Math.min(8000,Number(duration)||4000)));
}
