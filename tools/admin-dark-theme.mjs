// Apply one palette to the PRIVATE admin release only. The public CSS stays unchanged.
// CSS variables preserve the original cascade, media queries, and light theme.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const rgbHex=rgb=>'#'+rgb.map(x=>Math.round(clamp(x,0,255)).toString(16).padStart(2,'0')).join('');
function hsl(r,g,b){
 r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;
 let h=0;if(d)h=max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4;
 return [h*60,d?d/(1-Math.abs(2*l-1)):0,l];
}
function fromHsl(h,s,l){
 const a=s*Math.min(l,1-l);
 const f=n=>{const k=(n+h/30)%12;return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))};
 return rgbHex([f(0),f(8),f(4)]);
}
export function darkColor(value,role){
 let hex=value.toLowerCase().replace(/^#/,'');
 if(hex==='white')hex='ffffff';if(hex==='black')hex='000000';
 if(hex.length===3||hex.length===4)hex=[...hex].map(c=>c+c).join('');
 if(!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(hex))return value;
 const [r,g,b]=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
 const alpha=hex.slice(6),[h,s,l]=hsl(r,g,b);
 const hue=s<.09?155:h;
 let out;
 if(role==='shadow')out='#000000';
 else if(role==='text'){
   // Preserve white/light foregrounds on photographs and primary buttons.
   out=l>=.72?rgbHex([r,g,b]):fromHsl(hue,clamp(s*.75,.07,.55),clamp(.86-l*.13,.76,.90));
 }else if(role==='border'){
   out=l>.58?fromHsl(hue,clamp(s*.55,.07,.28),.29+(1-l)*.11):fromHsl(hue,clamp(s,.12,.45),clamp(l+.12,.30,.55));
 }else if(role==='accent'){
   out=l<.6?fromHsl(hue,clamp(s,.16,.65),.64):rgbHex([r,g,b]);
 }else{
   // Pale backgrounds become dark surfaces. Existing dark accents and photo overlays stay dark.
   out=l>.55?fromHsl(hue,clamp(s*.6,.055,.30),.125+(1-l)*.22):l<.38?rgbHex([r,g,b]):fromHsl(hue,clamp(s,.10,.50),.29);
 }
 return out+alpha;
}
function roleFor(prop){
 if(prop==='color'||prop==='fill'||prop==='stroke'||prop==='text-decoration-color'||/--.*(?:text|title|subtitle|kicker|muted).*color/.test(prop)||prop==='--muted'||prop==='--forest')return 'text';
 if(prop.includes('shadow'))return 'shadow';
 if(prop.startsWith('border')||prop==='--border')return 'border';
 if(prop.startsWith('outline')||prop==='accent-color'||prop==='caret-color'||prop==='scrollbar-color')return 'accent';
 if(prop.startsWith('background')||['--paper','--sage','--gold'].includes(prop)||/--.*(?:bg|surface|background)/.test(prop))return 'surface';
 return null;
}
export function themeAdminStyles(css, tokens=new Map()){
 // Match only declaration values, not selectors, strings, URLs or image data.
 // Every replacement includes the untouched light-theme fallback.
 return css.replace(/([;{]\s*)([\w-]+)(\s*:\s*)([^;{}]*)(?=[;}])/g,(whole,prefix,property,colon,value)=>{
   const role=roleFor(property.toLowerCase());if(!role||/url\s*\(/i.test(value))return whole;
   const token=(original,normalized=original)=>{
     const key='--admin-dark-'+role+'-'+normalized.toLowerCase().replace(/[^0-9a-z]/g,'');
     const dark=darkColor(normalized,role);
     if(dark===normalized)return original;
     tokens.set(key,dark);return 'var('+key+','+original+')';
   };
   const transformed=value.replace(/#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|\b(?:white|black)\b|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/gi,(m,r,g,b,a)=>{
     if(r!==undefined){
       const rgb=[r,g,b].map(Number);if(rgb.some(n=>n>255))return m;
       const hex=rgbHex(rgb)+(a===undefined?'':Math.round(clamp(Number(a),0,1)*255).toString(16).padStart(2,'0'));
       return token(m,hex);
     }
     return token(m);
   });
   return prefix+property+colon+transformed;
 });
}
export function darkAdminVariables(tokens){
 return '\nhtml[data-admin-theme="dark"]{color-scheme:dark;\n'+[...tokens].map(([key,value])=>key+':'+value+';').join('\n')+'\n}\n';
}
