import {spawn} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const chrome = ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if (!chrome) throw Error('Chrome / Chromium not available on this runner.');
const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1','--directory','_site'],{stdio:'ignore'});
const output='_site/previews';
mkdirSync(output,{recursive:true});
let browser;
try {
  await delay(1300);
  browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars']});
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const scenarios=[
    ['01-home','#/','.r-hero'],
    ['02-invitation','#/','.r-invitation'],
    ['03-timeline','#/schedule','.r-program'],
    ['04-venue','#/info','.v2-venue'],
    ['05-dress','#/info','.r-dress'],
    ['06-rsvp','#/info','.r-rsvp'],
    ['07-gallery','#/gallery','.r-gallery-page'],
    ['08-details','#/info','.r-details'],
    ['09-guests','#/guests','.r-guests']
  ];
  const outcomes=[];
  for(const [name,route,selector] of scenarios){
    await page.goto('http://127.0.0.1:4173/'+route,{waitUntil:'networkidle2'});
    await page.waitForSelector(selector,{timeout:15000});
    await page.evaluate(async()=>{
      for(const img of document.querySelectorAll('.r-app img')) img.loading='eager';
      await Promise.all([...document.querySelectorAll('.r-app img')].map(img=>img.decode().catch(()=>null)));
    });
    const broken=await page.evaluate(()=>[...document.querySelectorAll('.r-app img')].filter(el=>!el.complete||el.naturalWidth===0).map(el=>el.getAttribute('src')));
    assert.deepEqual(broken,[],'Broken images on '+name+': '+broken.join(', '));
    if(name!=='01-home')await page.$eval(selector,el=>el.scrollIntoView({block:'start',behavior:'instant'}));
    await delay(200);
    await page.screenshot({path:output+'/'+name+'.png',fullPage:false,animations:'disabled'});
    if (['01-home','04-venue','06-rsvp'].includes(name)) {
      const jpeg=await page.screenshot({type:'jpeg',quality:50,fullPage:false,animations:'disabled'});
      console.log('SCREEN_JPEG_'+name.replace(/-/g,'_')+'='+Buffer.from(jpeg).toString('base64'));
    }
    outcomes.push({screen:name,brokenImages:broken.length});
  }
  await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:4173/#/',{waitUntil:'networkidle2'});
  await page.screenshot({path:output+'/10-desktop.png',fullPage:false,animations:'disabled'});
  console.log('VISUAL CHECK OK:',JSON.stringify(outcomes));
  console.log('Screenshots: /previews/01-home.png ... /previews/10-desktop.png');
} finally {
  if(browser)await browser.close();
  server.kill();
}