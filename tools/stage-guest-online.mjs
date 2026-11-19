import {mkdirSync,cpSync,readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import assert from 'node:assert/strict';

const sha=(process.env.GITHUB_SHA||'local').slice(0,12);
const source=readFileSync('index.html','utf8');
const links=[...source.matchAll(/<link\s+rel="stylesheet"\s+href="\.\/src\/([\w-]+\.css)"\s*\/>/g)].map(x=>x[1]);
assert.ok(links.includes('wedding-reference-2026.css'),'Approved stylesheet missing');
assert.ok(source.includes('<script type="module" src="./src/app.js"></script>'),'Expected guest entry marker');

let html=source.replace('<script type="module" src="./src/app.js"></script>','<script type="module" src="./src/guest-online-entry.js"></script>');
html=html.replace(/\s*<script type="module">if\(new URLSearchParams\(location.search\).get\('compare'\)==='1'\) import\('\.\/src\/comparison\.js'\);<\/script>/,'');
html=html.replace('</head>','  <meta name="robots" content="noindex,nofollow" />\n</head>');
html=html.replace('<title>Никита & Кристина — наша свадьба</title>','<title>Никита & Кристина — просмотр свадебного сайта</title>');
html=html.replace(/(href="\.\/src\/[\w-]+\.css)"/g,(_all,href)=>href+'?v='+sha+'"');
html=html.replace('src="./src/guest-online-entry.js"','src="./src/guest-online-entry.js?v='+sha+'"');

for(const root of ['_site/preview','_pages/preview']){
 mkdirSync(join(root,'src'),{recursive:true});
 mkdirSync(join(root,'public'),{recursive:true});
 writeFileSync(join(root,'index.html'),html);
 for(const f of ['guest-online-entry.js','replica.js','data.js',...links]){
  const src=join('src',f),dest=join(root,src);
  assert.ok(existsSync(src),'Missing preview source: '+src);
  cpSync(src,dest);
 }
 const previewEntry=join(root,'src/guest-online-entry.js');
 writeFileSync(previewEntry,readFileSync(previewEntry,'utf8').replace("from './replica.js'","from './replica.js?v="+sha+"'"));
 const previewReplica=join(root,'src/replica.js');
 writeFileSync(previewReplica,readFileSync(previewReplica,'utf8').replace("from './data.js'","from './data.js?v="+sha+"'"));
 for(const dirname of ['approved-reference','board','production','reference']){
  cpSync(join('public',dirname),join(root,'public',dirname),{recursive:true});
 }
 cpSync('public/mark.svg',join(root,'public','mark.svg'));
 writeFileSync(join(root,'version.json'),JSON.stringify({revision:sha,mode:'guest-preview',rsvp:'demonstration-only'})+'\n');
 const paths=readdirSync(join(root,'src'));
 assert.ok(paths.every(name=>name.endsWith('.css')||['guest-online-entry.js','replica.js','data.js'].includes(name)),root+': private JS prohibited');
 const guest=readFileSync(join(root,'src/replica.js'),'utf8');
 assert.ok(!guest.includes('admin\/records'),'Admin database must never ship in guest preview');
 assert.ok(!html.includes('src/app.js'),'Full admin application may not be linked');
 console.log(root+': static guest preview staged safely ('+paths.length+' source files).');
}
