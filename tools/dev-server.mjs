import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const port=Number(process.env.PORT)||4173;
http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target=resolve(root,`.${pathname === '/'?'/index.html':pathname}`);
    if(!target.startsWith(root+sep)){res.writeHead(403);return res.end('Forbidden');}
    if(/(^|\/)\.|node_modules|supabase|docs|tools|tests/.test(pathname)){res.writeHead(403);return res.end('Forbidden');}
    const s=await stat(target);if(!s.isFile())throw Error('not file');
    const b=await readFile(target);res.writeHead(200,{'content-type':types[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(b);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,()=>console.log(`Wedding preview: http://localhost:${port}`));