// Normalize neutral and green legacy module colors at the private build boundary.
 // Preserve semantic reds, blues, ambers, custom tag colors, photos and public guest CSS.
 export function unifyAdminPalette(css){
  return css.replace(/([;{]\s*)([\w-]+)(\s*:\s*)([^;{}]*)(?=[;}])/g,(all,prefix,prop,colon,value)=>{
   if(prop.startsWith('--')||/url\s*\(|var\(--wd-|var\(--pd-|var\(--activity-color|var\(--tag-color/.test(value))return all;
   const surface=prop.startsWith('background'),text=prop==='color',border=prop.startsWith('border');
   if(!surface&&!text&&!border)return all;
   return prefix+prop+colon+value.replace(/#[\da-f]{6}\b|#[\da-f]{3}\b/gi,raw=>{
    let h=raw.slice(1);if(h.length===3)h=[...h].map(c=>c+c).join('');
    const [r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)),max=Math.max(r,g,b),min=Math.min(r,g,b),light=(max+min)/2;
    const neutral=max-min<=14,green=g>=r&&g>=b&&g-r<85&&g-b<85;
    if(!neutral&&!green)return raw;
    if(surface){if(light>=245)return '#ffffff';if(light>=200)return '#f4f9f4';if(light>=40&&light<=115)return '#194b30';}
    if(border&&light>175)return '#dce6dc';
    if(text&&light<100)return neutral?'#1b1b1b':'#194b30';
    if(text&&light>=100&&light<180)return '#53675a';
    return raw;
   });
  });
 }
