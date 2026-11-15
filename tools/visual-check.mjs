import {spawn} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chrome / Chromium not available on runner.');
const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1','--directory','_site'],{stdio:'ignore'});
mkdirSync('_site/previews',{recursive:true});
let browser;
const url=(path='/')=>'http://127.0.0.1:4173/'+path;
async function load(page,hash,selector){
  await page.goto(url()+hash,{waitUntil:'networkidle2'});
  await page.waitForSelector(selector,{timeout:15000});
  await page.evaluate(async()=>{
    for(const img of document.querySelectorAll('.r-app img[src]'))img.loading='eager';
    await Promise.all([...document.querySelectorAll('.r-app img[src]')].map(img=>img.decode().catch(()=>null)));
  });
  const broken=await page.evaluate(()=>[...document.querySelectorAll('.r-app img[src]')]
    .filter(el=>!el.complete||el.naturalWidth===0)
    .map(el=>el.getAttribute('src')));
  assert.deepEqual(broken,[],'Broken images: '+broken.join(', '));
}
try{
  await delay(1200);
  browser=await puppeteer.launch({executablePath:chrome,headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars']});
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await load(page,'#/','.r-home');
  const home=await page.evaluate(()=>{
    const a=[...document.querySelectorAll('.r-home .r-site > section')];
    const invite=document.querySelector('.w-invite');
    const rsvp=document.querySelector('.w-rsvp');
    const photo=invite.querySelector('.w-invite__photo img');
    const title=invite.querySelector('.w-invite__title');
    const r=t=>{const x=t.getBoundingClientRect();return {left:x.left,right:x.right,top:x.top,bottom:x.bottom,width:x.width,height:x.height};};
    return {
      sections:a.map(s=>s.className),
      inviteIndex:a.indexOf(invite),
      rsvpIndex:a.indexOf(rsvp),
      inviteText:invite.textContent,
      photo:{naturalWidth:photo.naturalWidth,width:r(photo).width,filter:getComputedStyle(photo).filter},
      oldColumn:invite.querySelectorAll('.inv-v2-cherub,.inv-v2-cherub-column').length,
      inviteBounds:r(invite), titleBounds:r(title), rsvpBounds:r(rsvp),
      compareBar:!!document.querySelector('#reference-mobile-tabs')
    };
  });
  assert.equal(home.inviteIndex,1,'Invitation must be second section on home');
  assert.equal(home.rsvpIndex,2,'RSVP form must be third section on home');
  assert.match(home.inviteText,/17 июня 2027/);
  assert.match(home.inviteText,/Усадьба Марьино/);
  assert.doesNotMatch(home.inviteText,/Никита|Кристина/,'Do not repeat couple names on the invitation');
  assert.ok(home.photo.naturalWidth>0,'Estate image must load');
  assert.equal(home.photo.filter,'none','Estate photograph should not be blurred');
  assert.equal(home.oldColumn,0,'Remove huge superimposed marble column');
  assert.equal(home.compareBar,false,'Do not expose designer comparison to wedding guests');
  assert.ok(home.titleBounds.left>=home.inviteBounds.left-1 &&
    home.titleBounds.right<=home.inviteBounds.right+1,'Invitation heading must fit');
  const form=page.locator('.w-rsvp [data-rsvp]');
  await page.$eval('.w-rsvp input[name=name]',el=>el.value='Тестовый гость');
  await page.click('.w-rsvp .w-rsvp__choice input[value=no]');
  await page.click('.w-rsvp__submit');
  const response=await page.$eval('.w-rsvp output',el=>el.textContent);
  assert.match(response,/не сможет присутствовать/,'RSVP radio choice must be reflected');
  assert.match(response,/не отправлен/,'Preview must not claim an actual submission');
  await page.$eval('.w-invite',el=>el.scrollIntoView({block:'start',behavior:'instant'}));
  await page.screenshot({path:'_site/previews/02-invitation-new.png',fullPage:false,animations:'disabled'});
  await page.$eval('.w-rsvp',el=>el.scrollIntoView({block:'start',behavior:'instant'}));
  await page.screenshot({path:'_site/previews/03-rsvp-home.png',fullPage:false,animations:'disabled'});
  for(const width of [320,360,390,430]){
    await page.setViewport({width,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
    const metrics=await page.evaluate(()=>{
      const b=document.querySelector('.r-app').getBoundingClientRect();
      const t=document.querySelector('.w-invite__title').getBoundingClientRect();
      const btn=document.querySelector('.w-rsvp__submit').getBoundingClientRect();
      return {app:b.width,title:{left:t.left,right:t.right},button:{left:btn.left,right:btn.right},
      bodyScroll:document.documentElement.scrollWidth,viewport:innerWidth};
    });
    assert.ok(metrics.bodyScroll<=metrics.viewport+2,'No horizontal overflow at '+width);
    assert.ok(metrics.title.left>=-1&&metrics.title.right<=metrics.viewport+1,'Title fits at '+width);
    assert.ok(metrics.button.left>=-1&&metrics.button.right<=metrics.viewport+1,'RSVP button fits at '+width);
  }
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const scenarios=[
    ['01-home','#/','.r-hero'],['04-program','#/schedule','.r-program'],
    ['05-venue','#/info','.v2-venue'],['06-dress','#/info','.r-dress'],
    ['07-rsvp-info','#/info','.r-rsvp'],['08-gallery','#/gallery','.r-gallery-page'],
    ['09-details','#/info','.r-details'],['10-guests','#/guests','.r-guests']
  ];
  for(const [name,route,selector] of scenarios){
    await load(page,route,selector);
    await page.$eval(selector,e=>e.scrollIntoView({block:'start',behavior:'instant'}));
    await delay(80);
    await page.screenshot({path:'_site/previews/'+name+'.png',fullPage:false,animations:'disabled'});
  }
  await load(page,'#/gallery','.r-gallery-page');
  await page.click('[data-filter=estate]');
  assert.equal(await page.$eval('[data-filter=estate]',e=>e.getAttribute('aria-pressed')),'true');
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.r-gallery-tile')]
    .some(e=>!e.hidden&&e.dataset.category==='estate')),'Gallery filter works');
  await page.click('.r-gallery-tile:not([hidden]) .r-photo-open');
  assert.equal(await page.$eval('.r-lightbox',e=>e.open),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('.r-lightbox',e=>e.open),false);
  await load(page,'#/info','.r-rsvp');
  await page.$eval('.r-rsvp input[name=name]',el=>el.value='Тест');
  await page.click('.r-rsvp-submit');
  assert.match(await page.$eval('.r-rsvp output',e=>e.textContent),/не сохранён/);
  await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
  await load(page,'#/','.w-invite');
  assert.equal(await page.$('#reference-comparison'),null,'No editor comparison on published page');
  await page.$eval('.w-invite',e=>e.scrollIntoView({block:'start',behavior:'instant'}));
  await page.screenshot({path:'_site/previews/11-desktop-new.png',fullPage:false,animations:'disabled'});
  // Designer comparison remains opt-in for development, not a guest-facing control.
  await page.goto(url('?compare=1#/'),{waitUntil:'networkidle2'});
  await page.waitForSelector('#reference-comparison',{timeout:15000});
  assert.ok(await page.$('#reference-mobile-tabs'),'Explicit ?compare=1 enables reference mode');
  // Wedding venue admin smoke test: real gallery controls and the uniform cost sheet.
  await page.goto(url()+'#/admin/venues/royal/photos',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.vdp-photo-focus',{timeout:15000});
  assert.ok(await page.$$eval('.vdp-filmstrip .vdp-thumb',x=>x.length>=10),'Royal Beach: all phone photos should be indexed');
  await page.click('[data-photo-view="grid"]');
  await page.waitForSelector('.vdp-photo-grid');
  await page.click('[data-photo-section="Залы"]');
  assert.ok(await page.$$eval('.vdp-photo-grid .vdp-thumb',a=>a.length>0),'Room filter must show indexed banquet hall photos');
  await page.click('.vdp-photo-grid [data-photo-open="0"]');
  await page.waitForSelector('.vdp-lightbox');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('.vdp-lightbox'));
  await page.goto(url()+'#/admin/venues/royal/budget',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.vdp-cost-row',{timeout:15000});
  assert.equal(await page.$$eval('.vdp-cost-row',a=>a.length),13,'Same 13 financial fields on every venue');
  await page.screenshot({path:'_site/previews/12-royal-venue-budget.png',fullPage:false,animations:'disabled'});
  await page.goto(url()+'#/admin/venues/zarenkov-gallery/photos',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.vdp-emptyphotos',{timeout:15000});
  await page.goto(url()+'#/admin/venues/k2/budget',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.vdp-cost-row',{timeout:15000});
  assert.ok(await page.$eval('.vdp-budget-page',el=>el.textContent.includes('420')),'K2 verified rent must be present');
  console.log('VISUAL CHECK OK: guest invite, gallery, venue photos, photo lightbox, 13-row cost card and K2 estimate.');
}finally{
  if(browser)await browser.close();
  server.kill();
}
