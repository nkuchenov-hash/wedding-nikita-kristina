from pathlib import Path
p=Path('_mvp/index.html')
s=p.read_text()
small='<img class="welcome-small-left ornament" src="assets/welcome-small-left.png" alt="">'
berry='<img class="welcome-berry ornament" src="assets/strawberry.png" alt="">'
assert s.count(small)==1 and s.count(berry)==1
s=s.replace(small,'').replace(berry,'')
anchor='alt="Иллюстрация петербургской набережной"></figure></div>'
assert s.count(anchor)==1
s=s.replace(anchor,anchor.replace('</figure></div>','</figure>'+berry+'</div>'))
p.write_text(s)
css=Path('_mvp/style.css')
css.write_text(css.read_text()+'\n'+Path('mvp-site/welcome-spacing.css').read_text())

# Improve only the actual approved raster asset. No external dependencies.
from shutil import copyfile
import struct, zlib, math
qa=Path('_mvp-qa')
qa.mkdir(exist_ok=True)
asset=Path('_mvp/assets/skyline.png')
copyfile(asset,qa/'original-skyline.png')
raw=asset.read_bytes()
assert raw[:8]==b'\x89PNG\r\n\x1a\n'
pos=8
parts=[]
while pos<len(raw):
    n=struct.unpack_from('>I',raw,pos)[0]
    t=raw[pos+4:pos+8]
    data=raw[pos+8:pos+8+n]
    if t==b'IHDR':
        w,h,d,c,_,_,interlace=struct.unpack('>IIBBBBB',data)
        assert (d,c,interlace)==(8,6,0)
    if t==b'IDAT': parts.append(data)
    pos+=n+12
scan=zlib.decompress(b''.join(parts))
stride=w*4
rows=[]
prev=bytearray(stride)
def paeth(a,b,c):
    p=a+b-c
    pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
    return a if pa<=pb and pa<=pc else b if pb<=pc else c
for y in range(h):
    offset=y*(stride+1)
    mode=scan[offset]
    row=bytearray(scan[offset+1:offset+1+stride])
    for i in range(stride):
        a=row[i-4] if i>=4 else 0
        b=prev[i]
        c=prev[i-4] if i>=4 else 0
        if mode:
            v=a if mode==1 else b if mode==2 else (a+b)//2 if mode==3 else paeth(a,b,c)
            row[i]=(row[i]+v)&255
    rows.append(row)
    prev=row
# Lanczos-3 resampling in premultiplied alpha prevents dark borders.
scale=3
W,H=w*scale,h*scale
def sinc(x):
    return math.sin(math.pi*x)/(math.pi*x) if x else 1.
def weights(size):
    result=[]
    for i in range(size*scale):
        u=(i+.5)/scale-.5
        start=math.floor(u)-2
        pairs=[(max(0,min(size-1,j)),sinc(u-j)*sinc((u-j)/3)) for j in range(start,start+6)]
        den=sum(v for _,v in pairs)
        result.append([(j,v/den) for j,v in pairs])
    return result
xw,yw=weights(w),weights(h)
# Interpolate the transparent layer as four premultiplied channels.
horizontal=[]
for row in rows:
    pre=[(row[i]*row[i+3]/255,row[i+1]*row[i+3]/255,row[i+2]*row[i+3]/255,row[i+3]) for i in range(0,stride,4)]
    rr=[]
    for ww in xw:
        rr.append(tuple(sum(pre[j][k]*v for j,v in ww) for k in range(4)))
    horizontal.append(rr)
out=[]
for ww in yw:
    rr=[]
    for x in range(W):
        rr.append(tuple(sum(horizontal[j][x][k]*v for j,v in ww) for k in range(4)))
    out.append(rr)
def clip(v): return max(0,min(255,round(v)))
# Mild, bounded local sharpening of the actual ink edge, not new artwork.
# Preserve original colors and avoid halos by clamping to adjacent extrema.
encoded_rows=bytearray()
for y in range(H):
    encoded_rows.append(0)
    for x in range(W):
        r,g,b,a=out[y][x]
        neighbors=(out[max(0,y-1)][x][3],out[min(H-1,y+1)][x][3],out[y][max(0,x-1)][3],out[y][min(W-1,x+1)][3])
        mean=sum(neighbors)/4
        sharpened=max(min(a,*neighbors),min(max(a,*neighbors),a+.7*(a-mean)))
        # The extrema constraint above preserves the existing alpha silhouette;
        # enhance ink edge slope using the original local variation.
        variation=max(neighbors)-min(neighbors)
        if variation>5 and 12<a<243:
            sharpened=a+max(-7,min(7,(a-mean)*.65))
        if a<=.5:
            encoded_rows.extend((0,0,0,0))
        else:
            encoded_rows.extend((clip(r*255/a),clip(g*255/a),clip(b*255/a),clip(sharpened)))
def chunk(t,b):
    return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
encoded=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',W,H,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(encoded_rows,7))+chunk(b'IEND',b'')
assert (W,H)==(w*3,h*3) and encoded!=raw
asset.write_bytes(encoded)
copyfile(asset,qa/'refined-skyline.png')
print('ORIGINAL_ART_RESAMPLED',w,h,'->',W,H,'bytes',len(raw),'->',len(encoded))


# Remove all old ornaments from the welcome block only; retain photo masks and divider.
import re
html=p.read_text()
start=re.search(r'<section\b[^>]*class="[^"]*\bwelcome\b[^"]*"[^>]*>',html)
assert start
end=html.index('</section>',start.end())
section=html[start.end():end]
section,count=re.subn(r'<img\b(?=[^>]*class="[^"]*\b(?:ornament|welcome-botanical)\b)[^>]*>', '',section)
assert count>=3, count
p.write_text(html[:start.end()]+section+html[end:])

# Approved V11: exact raster layers, original MVP card markup and paths.
names=('left-botanical','upper-white-blossoms','strawberry','foreground-hydrangea')
for name in names:
    src=Path('mvp-site/welcome-v11')/(name+'.png')
    b=src.read_bytes()
    assert b[:8]==b'\x89PNG\r\n\x1a\n' and b[25] in (4,6),name
    copyfile(src,Path('_mvp/assets')/('welcome-v11-'+name+'.png'))
html=p.read_text()
start=re.search(r'<section\b[^>]*class="[^"]*\bwelcome\b[^"]*"[^>]*>',html)
end=html.index('</section>',start.end())
section=html[start.end():end]
cards=list(re.finditer(r'<div class="photo-shell">\s*<figure class="photo-frame frame-(estate|city)">.*?</figure>\s*</div>',section,re.S))
assert len(cards)==2, 'Original card markup not found'
cardmap={m.group(1):m.group(0) for m in cards}
def plant(name):
    return '<img class="welcome-botanical plant-'+name+'" src="assets/welcome-v11-'+name+'.png" alt="" aria-hidden="true">'
def card(name,label):
    return '<div class="welcome-card welcome-card-'+name+'" role="button" tabindex="0" aria-label="Открыть фотографию: '+label+'">'+cardmap[name]+'</div>'
collage='<div class="welcome-collage">'+plant('left-botanical')+plant('upper-white-blossoms')+card('estate','Марьино')+card('city','Санкт-Петербург')+'<div class="welcome-lower-group">'+plant('strawberry')+plant('foreground-hydrangea')+'</div></div>'
for i,m in reversed(list(enumerate(cards))):
    section=section[:m.start()]+(collage if i==0 else '')+section[m.end():]
p.write_text(html[:start.end()]+section+html[end:])
script=Path('_mvp/script.js')
script.write_text(script.read_text()+'\n'+Path('mvp-site/welcome-v11/interaction.js').read_text())


# V17: use the exact, newly generated, independently composed sunny photos.
# These are creative retouchings of the places, not documentary photographs.
from hashlib import sha256
from html import escape
import shutil, subprocess
convert=shutil.which('magick') or shutil.which('convert')
assert convert
photos={
    'estate': ('welcome-estate-generated-v17.jpg','1122x1402','0722be2764dabef9ae0002672f4072a7c660e9faaec85c0e74916d4c605cb9d8','Усадьба Марьино — художественная визуализация'),
    'city': ('welcome-city-generated-v17.jpg','1337x1176','0fc6e05eb4ba739586e2f02a67e23490aa0b275be11611dce5e5474e6f9eed1a','Санкт-Петербург, Мойка и Исаакиевский собор — художественная визуализация')
}
html=p.read_text()
for kind,(name,dimensions,digest,alt) in photos.items():
    source=Path('mvp-site/welcome-v17')/name
    target=Path('_mvp/assets')/name
    assert sha256(source.read_bytes()).hexdigest()==digest, kind
    size=subprocess.check_output([convert,str(source),'-format','%wx%h','info:']).decode().strip()
    assert size==dimensions,(kind,size)
    copyfile(source,target)
    pattern=r'(<figure class="photo-frame frame-'+kind+r'">.*?)(<img\b[^>]*>)(.*?</figure>)'
    def replace_photo(m):
        img,n=re.subn(r'\bsrc="[^"]*"','src="assets/'+name+'"',m.group(2),count=1)
        assert n==1
        img=re.sub(r'\s(?:srcset|sizes|alt|style|width|height|data-photo-(?:credit|source|license|license-url|generated))="[^"]*"','',img)
        img=img.rstrip('>').rstrip('/')+' alt="'+escape(alt,quote=True)+'" style="object-position:50% 50%;filter:none!important;" data-photo-generated="true">'
        return m.group(1)+img+m.group(3)
    html,n=re.subn(pattern,replace_photo,html,count=1,flags=re.S)
    assert n==1,kind
    print('WELCOME_V17_GENERATED_PHOTO',kind,size,digest)
p.write_text(html)
js=script.read_text()
anchor='figure.append(image,caption);'
assert js.count(anchor)==1
js=js.replace(anchor,"if(source.dataset.photoGenerated){const note=document.createElement('small');note.style.cssText='display:block;margin-top:5px;font-size:12px';note.textContent='Художественная визуализация';caption.append(note);}\n  "+anchor)
script.write_text(js)

# V16 shadow masks: trim the transparent margins, so the foliage continues
# through the screen boundary rather than ending inside the page.
for source,name,flip in [('birch-top-left','top',True),('birch-right','bottom',False)]:
    source_file=Path('_mvp/assets')/(source+'.png')
    dest=Path('_mvp/assets')/('welcome-shadow-'+name+'-v16.png')
    args=[convert,str(source_file),'-trim','+repage']
    if flip:args+=['-flop']
    args+=['-resize','1000x1000>','PNG32:'+str(dest)]
    subprocess.run(args,check=True)
    assert dest.read_bytes()[:8]==b'\x89PNG\r\n\x1a\n'
script.write_text(script.read_text()+'\n'+"\n/* Natural leaf projection: slow flex, faster uneven flutter, independently\n   moving branch clusters. A single resize observer aligns the layer to the\n   real viewport; SVG animations are paused outside the viewport. */\n(()=>{\n const section=document.querySelector('.welcome');\n if(!section||section.querySelector('.welcome-shadow-layer'))return;\n const ns='http://www.w3.org/2000/svg';\n const layer=document.createElement('div');\n layer.className='welcome-shadow-layer';layer.setAttribute('aria-hidden','true');\n function addBranch(kind,url,seed,angle,slow,fast){\n  const svg=document.createElementNS(ns,'svg');\n  svg.setAttribute('class','welcome-shadow welcome-shadow-'+kind);\n  svg.setAttribute('viewBox','0 0 640 405');\n  svg.setAttribute('aria-hidden','true');\n  const id='welcome-projection-'+kind;\n  svg.innerHTML='<defs><filter id=\"'+id+'\" x=\"-25%\" y=\"-30%\" width=\"150%\" height=\"160%\" color-interpolation-filters=\"sRGB\">'+\n   '<feTurbulence type=\"fractalNoise\" baseFrequency=\".007 .011\" numOctaves=\"2\" seed=\"'+seed+'\" result=\"wind\">'+\n    '<animate attributeName=\"baseFrequency\" values=\".007 .011;.009 .008;.006 .013;.007 .011\" keyTimes=\"0;.29;.68;1\" dur=\"'+slow+'s\" repeatCount=\"indefinite\"/>'+\n   '</feTurbulence>'+\n   '<feDisplacementMap in=\"SourceGraphic\" in2=\"wind\" scale=\"8\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"bend\">'+\n    '<animate attributeName=\"scale\" values=\"5;13;7;16;6;5\" keyTimes=\"0;.18;.41;.67;.86;1\" dur=\"'+slow+'s\" repeatCount=\"indefinite\"/>'+\n   '</feDisplacementMap>'+\n   '<feTurbulence type=\"fractalNoise\" baseFrequency=\".04 .052\" numOctaves=\"2\" seed=\"'+(seed+13)+'\" result=\"flutter\"/>'+\n   '<feDisplacementMap in=\"bend\" in2=\"flutter\" scale=\"2.3\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"leaves\">'+\n    '<animate attributeName=\"scale\" values=\"1.5;3.5;1.8;4.6;2;1.5\" keyTimes=\"0;.12;.36;.53;.79;1\" dur=\"'+fast+'s\" repeatCount=\"indefinite\"/>'+\n   '</feDisplacementMap>'+\n   '<feColorMatrix in=\"leaves\" type=\"matrix\" values=\"0 0 0 0 .30 0 0 0 0 .34 0 0 0 0 .20 0 0 0 1 0\"/>'+\n   '<feGaussianBlur stdDeviation=\"3.3\"/>'+\n   '</filter></defs><g filter=\"url(#'+id+')\"><g><image href=\"'+url+'\" x=\"-15\" y=\"-24\" width=\"775\" height=\"475\" preserveAspectRatio=\"xMaxYMid meet\"/>'+\n   '<animateTransform attributeName=\"transform\" type=\"rotate\" values=\"'+angle[0]+' 730 170;'+angle[1]+' 730 170;'+angle[2]+' 730 170;'+angle[3]+' 730 170;'+angle[0]+' 730 170\" keyTimes=\"0;.21;.47;.77;1\" calcMode=\"spline\" keySplines=\".45 0 .55 1;.4 0 .6 1;.45 0 .55 1;.4 0 .6 1\" dur=\"'+(slow+3.7)+'s\" repeatCount=\"indefinite\"/>'+\n   '</g></g>';\n  layer.append(svg);return svg;\n }\n const upper=addBranch('upper','assets/welcome-shadow-top-v16.png',19,[-.5,1.5,-1.1,2.1],12.7,3.2);\n const lower=addBranch('lower','assets/welcome-shadow-bottom-v16.png',41,[.3,-2.2,.9,-.8],16.3,4.1);\n section.prepend(layer);\n function align(){const r=section.getBoundingClientRect();layer.style.setProperty('--shadow-left',(-r.left)+'px');layer.style.setProperty('--shadow-width',document.documentElement.clientWidth+'px')}\n align();window.addEventListener('resize',align,{passive:true});\n if('ResizeObserver'in window)new ResizeObserver(align).observe(section);\n const preference=matchMedia('(prefers-reduced-motion: reduce)');\n let visible=true;\n function sync(){[upper,lower].forEach(s=>{if(preference.matches||!visible||document.hidden)s.pauseAnimations();else s.unpauseAnimations()})}\n preference.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);\n if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{rootMargin:'100px'}).observe(section);\n sync();\n})();\n")
