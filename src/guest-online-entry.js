import {renderGuest,activateGuest} from './replica.js';

const root=document.getElementById('app');
if(!root)throw new Error('Wedding preview root is missing');
const validRoutes=new Set(['/','/schedule','/info','/guests','/gallery','/guests/primer']);
function route(){
 let value='/';
 try{value=decodeURIComponent(location.hash.replace(/^#/,''))||'/'}catch{}
 value=value.replace(/\/+$/,'')||'/';
 return validRoutes.has(value)?value:'/';
}
function draw(){
 const path=route();
 root.innerHTML=renderGuest(path);
 document.title='Никита & Кристина — предварительный просмотр';
 activateGuest(root);
 window.scrollTo(0,0);
}
addEventListener('hashchange',draw);
draw();
