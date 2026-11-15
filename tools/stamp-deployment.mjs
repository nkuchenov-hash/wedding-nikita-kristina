import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const site='_site';
const sha=(process.env.GITHUB_SHA||'local').slice(0,12);
if(!/^[a-zA-Z0-9-]+$/.test(sha))throw Error('Invalid build revision');
const version='?v='+sha;

const htmlPath=join(site,'index.html');
let html=readFileSync(htmlPath,'utf8');
html=html.replace(/((?:href|src)=["'])(\.\/src\/[^"']+\.(?:css|js))(["'])/g,(_all,a,path,q)=>a+path+version+q);
html=html.replace(/(import\(["'])(\.\/src\/[^"']+\.js)(["']\))/g,(_all,a,path,q)=>a+path+version+q);
writeFileSync(htmlPath,html,'utf8');

let modified=0;
for(const name of readdirSync(join(site,'src'))){
  if(!name.endsWith('.js'))continue;
  const path=join(site,'src',name);
  let code=readFileSync(path,'utf8');
  const next=code.replace(/(from\s*["']|import\s*["']|import\(\s*["'])(\.\/[^"']+\.js)(["'])/g,
    (_all,start,importPath,end)=>start+importPath+version+end);
  if(next!==code){writeFileSync(path,next,'utf8');modified++;}
}
writeFileSync(join(site,'build-info.json'),JSON.stringify({revision:sha,builtAt:new Date().toISOString(),versioning:'commit-query'},null,2)+'\n','utf8');
console.log('Deployment asset version: '+sha+'; module files updated: '+modified);
