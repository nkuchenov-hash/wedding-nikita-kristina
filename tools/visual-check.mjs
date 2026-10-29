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
    ['03-timeline','#/schedule','.r-schedule-head'],
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
      for(const img of document.querySelectorAll('.r-app img[src]')) img.loading='eager';
      await Promise.all([...document.querySelectorAll('.r-app img[src]')].map(img=>img.decode().catch(()=>null)));
    });
    const broken=await page.evaluate(()=>[...document.querySelectorAll('.r-app img[src]')].filter(el=>!el.complete||el.naturalWidth===0).map(el=>el.getAttribute('src')));
    assert.deepEqual(broken,[],'Broken images on '+name+': '+broken.join(', '));
    if(name!=='01-home')await page.$eval(selector,el=>el.scrollIntoView({block:'start',behavior:'instant'}));
    await delay(200);
    await page.screenshot({path:output+'/'+name+'.png',fullPage:false,animations:'disabled'});
    if (['01-home','02-invitation','03-timeline','04-venue','05-dress','06-rsvp','07-gallery','08-details','09-guests'].includes(name)) {
      const jpeg=await page.screenshot({type:'jpeg',quality:43,fullPage:false,animations:'disabled'});
      console.log('SCREEN_JPEG_'+name.replace(/-/g,'_')+'='+Buffer.from(jpeg).toString('base64'));
    }
    outcomes.push({screen:name,brokenImages:broken.length});
  }

  // Original reference images must really exist in the served website.
  await page.goto('http://127.0.0.1:4173/#/',{waitUntil:'networkidle2'});
  await page.waitForSelector('#reference-mobile-tabs');
  await page.click('#reference-mobile-tabs [data-mobile="original"]');
  await page.waitForFunction(()=>document.querySelector('#reference-screen-image')?.naturalWidth>0);
  assert.equal(await page.$eval('#reference-comparison',el=>getComputedStyle(el).display),'flex','Mobile original comparison must be visible');
  await page.screenshot({path:output+'/11-original-mobile.png',fullPage:false,animations:'disabled'});
  await page.click('#reference-mobile-tabs [data-mobile="site"]');
  assert.equal(await page.$eval('#app',el=>getComputedStyle(el).visibility),'visible','Mobile site must restore after comparison');

  // Interactive smoke: gallery filters, image viewer and preview-only RSVP.
  await page.goto('http://127.0.0.1:4173/#/gallery',{waitUntil:'networkidle2'});
  await page.waitForSelector('.r-photo-filters');
  await page.click('[data-filter="estate"]');
  const gallery=await page.evaluate(()=>({
    selected:document.querySelector('[data-filter="estate"]')?.getAttribute('aria-pressed'),
    visible:[...document.querySelectorAll('.r-gallery-tile')].filter(x=>!x.hidden).length,
    wrong:[...document.querySelectorAll('.r-gallery-tile')].filter(x=>!x.hidden&&x.dataset.category!=='estate').length
  }));
  assert.equal(gallery.selected,'true');
  assert.ok(gallery.visible>0&&gallery.wrong===0,'Gallery filter must affect tiles');
  await page.click('.r-gallery-tile:not([hidden]) .r-photo-open');
  assert.equal(await page.$eval('.r-lightbox',d=>d.open),true,'Gallery photo dialog must open');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('.r-lightbox',d=>d.open),false,'Escape must close dialog');
  await page.goto('http://127.0.0.1:4173/#/info',{waitUntil:'networkidle2'});
  await page.waitForSelector('[data-rsvp]');
  await page.$eval('[data-rsvp] input[name="name"]',el=>el.value='Тест');
  await page.click('.r-rsvp-submit');
  const preview=await page.$eval('[data-rsvp] output',el=>el.textContent);
  assert.match(preview,/не сохранён/,'RSVP must clearly stay a demo');
  console.log('INTERACTIONS OK: gallery filters, lightbox, preview-only RSVP');
  await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:4173/#/',{waitUntil:'networkidle2'});
  await page.waitForSelector('#reference-comparison');
  await page.waitForFunction(()=>document.querySelector('#reference-screen-image')?.naturalWidth>0);
  const split=await page.evaluate(()=>({
    pane:Math.round(document.querySelector('#reference-comparison').getBoundingClientRect().width),
    app:Math.round(document.querySelector('#app').getBoundingClientRect().width),
    original:getComputedStyle(document.querySelector('#reference-comparison')).display
  }));
  assert.equal(split.original,'flex','Original reference must show beside site on desktop');
  assert.ok(Math.abs(split.app-split.pane)<5,'Both comparison halves should be equal width');
  await page.screenshot({path:output+'/10-desktop.png',fullPage:false,animations:'disabled'});
  console.log('REFERENCE COMPARISON OK:',JSON.stringify(split));
  console.log('VISUAL CHECK OK:',JSON.stringify(outcomes));
  console.log('Screenshots: /previews/01-home.png ... /previews/10-desktop.png');
} finally {
  if(browser)await browser.close();
  server.kill();
}