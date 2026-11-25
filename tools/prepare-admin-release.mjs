import {mkdirSync,cpSync,writeFileSync,rmSync,readdirSync,existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {themeAdminStyles,darkAdminVariables} from './admin-dark-theme.mjs';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['tools/check-single-photo-section.mjs'],{stdio:'inherit'});
const root='_site';
const sha=(process.env.GITHUB_SHA||'local').slice(0,12);
if(!/^[a-zA-Z0-9-]+$/.test(sha))throw new Error('Invalid revision');
const admin=join(root,'admin'), privateDir='_admin-private', assets=join(privateDir,'src');
mkdirSync(admin,{recursive:true});
mkdirSync(assets,{recursive:true});
const required=['admin-app.js','admin-toast.js','admin-data-ui.js','admin-data.css','admin-program.js','admin-program.css','admin-settings.js','admin-photos.js','admin-photos.css','venue-files-ui.js','venue-files-ui.css','admin-guests.js','admin-guests.css','admin-heading.css','data.js','styles.css','venues.js','venues-data.js','venues.css','venue-detail-ui.js','venue-detail-ui.css','venues-pricing.js','venue-evaluation.js','venue-transcript-costs.js','venue-budget-coverage.js','venues-photos-1.js','venues-photos-2.js','venues-photos-3.js','venues-photos-4.js','venues-photos-5.js'];
for(const name of required){
 const src=join(root,'src',name);
 if(!existsSync(src))throw new Error('Missing admin dependency: '+name);
 cpSync(src,join(assets,name));
}
const themeTokens=new Map();
for(const name of required.filter(n=>n.endsWith('.css'))){
 const file=join(assets,name);
 writeFileSync(file,themeAdminStyles(readFileSync(file,'utf8'),themeTokens));
}
const headingCss=join(assets,'admin-heading.css');
writeFileSync(headingCss,readFileSync(headingCss,'utf8')+darkAdminVariables(themeTokens));
mkdirSync(join(admin,'public'),{recursive:true});
cpSync(join(root,'public','mark.svg'),join(admin,'public','mark.svg'));
const styles=['styles.css','venues.css','venue-detail-ui.css','admin-data.css','admin-program.css','admin-photos.css','venue-files-ui.css','admin-guests.css','admin-heading.css'].map(n=>'<link rel="stylesheet" href="./index.php?asset=src/'+n+'&v='+sha+'">').join('\n');
const adminHtml='<!doctype html>\n<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#17332d"><title>Никита и Кристина — управление свадьбой</title><link rel="icon" href="./public/mark.svg">\n'+"<script>try{var t=localStorage.getItem(\"wedding-admin-theme\");document.documentElement.dataset.adminTheme=t===\"light\"||t===\"dark\"?t:(matchMedia(\"(prefers-color-scheme: dark)\").matches?\"dark\":\"light\")}catch(e){document.documentElement.dataset.adminTheme=matchMedia(\"(prefers-color-scheme: dark)\").matches?\"dark\":\"light\"}</script>"+'\n'+styles+'\n</head><body class="admin-body"><div id="app"></div><script type="module" src="./index.php?asset=src/admin-app.js&v='+sha+'"></script></body></html>\n';
writeFileSync(join(privateDir,'index.html'),adminHtml);
cpSync('tools/admin-gateway.php',join(admin,'index.php'));
for(const name of required){
 if(!name.endsWith('.js'))continue;
 const file=join(assets,name);
 const original=readFileSync(file,'utf8');
 const patched=original.replace(/(from\s*['"]|import\s*['"]|import\(\s*['"])\.\/([a-zA-Z0-9-]+\.js)(?:\?v=[^'"]+)?(['"])/g,
   (_all,prefix,n,close)=>prefix+'./index.php?asset=src/'+n+'&v='+sha+close);
 writeFileSync(file,patched);
}
const maintenance=[
'<!doctype html>',
'<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#193529">',
'<title>Никита и Кристина — сайт готовится</title>',
'<style>*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#f4f7f2;color:#183629;font-family:Georgia,"Times New Roman",serif;text-align:center;padding:24px}main{max-width:620px}h1{font-weight:400;font-size:clamp(32px,6vw,58px);line-height:1.15;margin:0 0 24px}p{font:400 17px/1.7 system-ui,sans-serif;color:#52645b}small{display:block;letter-spacing:.3em;font:600 11px system-ui,sans-serif;margin-bottom:38px;color:#728476}</style>',
'</head><body><main><small>НИКИТА &amp; КРИСТИНА</small><h1>Сайт готовится</h1><p>Приглашение появится здесь, когда всё будет готово.</p></main></body></html>'
].join('\n')+'\n';
const keep=new Set(['index.html','admin','build-info.json','.nojekyll','robots.txt']);
for(const name of readdirSync(root)){if(!keep.has(name))rmSync(join(root,name),{recursive:true,force:true});}
writeFileSync(join(root,'index.html'),maintenance);
writeFileSync(join(root,'robots.txt'),'User-agent: *\nDisallow: /\n');
const pages='_pages';mkdirSync(pages,{recursive:true});
writeFileSync(join(pages,'index.html'),maintenance);
cpSync(join(root,'build-info.json'),join(pages,'build-info.json'));
writeFileSync(join(pages,'.nojekyll'),'');
if(readdirSync(root).some(n=>!keep.has(n)))throw new Error('Unexpected guest artifact in release.');
const code=readFileSync(join(privateDir,'src','admin-app.js'),'utf8');
if(code.includes('renderGuest(')||code.includes('activateGuest('))throw new Error('Guest entrypoint leaked into admin bundle.');
if(!code.includes('index.php?asset=src/venues.js'))throw new Error('Protected admin import not rewritten.');
console.log('ADMIN ONLY: maintenance root, PHP-authenticated /admin/, JS assets outside webroot.');
