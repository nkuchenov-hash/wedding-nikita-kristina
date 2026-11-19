import {spawn} from 'node:child_process';
import {mkdirSync,existsSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chrome/Chromium not found on preview runner.');
const port=4177;
const output='_guest-preview/screenshots';
mkdirSync(output,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory','_guest-preview'],{stdio:'ignore'});
let browser;
const base='http://127.0.0.1:'+port+'/';
async function inspect(page,route,selector){
 await page.goto(base+'#'+route,{waitUntil:'networkidle2'});
 await page.waitForSelector(selector,{timeout:16000});
 await page.evaluate(async()=>{
   document.querySelectorAll('.r-app img[src]').forEach(img=>img.loading='eager');
   await Promise.all([...document.querySelectorAll('.r-app img[src]')].map(img=>img.decode().catch(()=>null)));
 });
 const info=await page.evaluate(()=>({
   viewport:innerWidth,
   scrollWidth:document.documentElement.scrollWidth,
   images:[...document.querySelectorAll('.r-app img[src]')].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src'))
 }));
 assert.ok(info.scrollWidth<=info.viewport+2,route+': horizontal overflow '+JSON.stringify(info));
 // Externally hosted temporary imagery may fail; the text and internal navigation must still work.
 assert.deepEqual(info.images,[],route+': guest photo assets must all load without fallback placeholders');
 return info;
}
try{
 await delay(1000);
 browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars']});
 const page=await browser.newPage();
 for(const scenario of [
   {name:'01-home-desktop',w:1280,h:850,path:'/',selector:'.wref-hero'},
   {name:'02-home-mobile',w:390,h:844,path:'/',selector:'.wref-hero'},
   {name:'03-program-mobile',w:390,h:844,path:'/schedule',selector:'.spb-days'},
   {name:'04-locations-desktop',w:1280,h:850,path:'/info',selector:'.v2-venue'},
   {name:'05-gallery-desktop',w:1280,h:850,path:'/gallery',selector:'.r-masonry'}
 ]){
   await page.setViewport({width:scenario.w,height:scenario.h,deviceScaleFactor:1,isMobile:scenario.w<700,hasTouch:scenario.w<700});
   await inspect(page,scenario.path,scenario.selector);
   await page.screenshot({path:output+'/'+scenario.name+'.png',fullPage:true,animations:'disabled'});
   console.log('SCREENSHOT_OK',scenario.name);
 }
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await inspect(page,'/','.wref-hero');
 await page.click('[data-site-menu-toggle]');
 assert.equal(await page.$eval('[data-site-menu-toggle]',e=>e.getAttribute('aria-expanded')),'true');
 assert.equal(await page.$eval('#wref-mobile-menu',e=>e.hidden),false);
 await page.click('[data-site-menu-toggle]');
 assert.equal(await page.$eval('#wref-mobile-menu',e=>e.hidden),true);
 await page.$eval('.wref-rsvp-name input',e=>e.value='Проверочный гость');
 await page.click('.wref-rsvp-options input[value=no]');
 await page.click('.wref-rsvp-submit');
 assert.match(await page.$eval('.wref-rsvp-form output',e=>e.textContent),/не сможет присутствовать/);
 assert.match(await page.$eval('.wref-rsvp-form output',e=>e.textContent),/не отправлен/);
 console.log('GUEST_VISUAL_PREVIEW_OK; functional navigation and RSVP preview passed');
}finally{if(browser)await browser.close();server.kill()}
