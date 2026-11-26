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

# V18: make six small static alpha textures from the existing birch art.
# The broad feathering is baked into each PNG, never calculated during motion.
import math
def smoothstep(v):
    v=max(0.,min(1.,v))
    return v*v*(3.-2.*v)
for source,kind,flip in [('birch-top-left','upper',True),('birch-right','lower',False)]:
    source_file=Path('_mvp/assets')/(source+'.png')
    W,H=640,420
    args=[convert,str(source_file),'-trim','+repage']
    if flip:args+=['-flop']
    args+=['-resize','640x372','-background','none','-gravity','east','-extent',f'{W}x{H}','-alpha','on','-depth','8','rgba:-']
    rgba=subprocess.check_output(args)
    assert len(rgba)==W*H*4
    parts=[bytearray(W*H*4) for i in range(3)]
    for y in range(H):
        v=y/(H-1)
        for x in range(W):
            u=x/(W-1);j=(y*W+x)*4
            alpha=rgba[j+3]/255.
            # Fade all potentially exposed edges except the off-screen root.
            edge=smoothstep(v/.15)*smoothstep((1-v)/.17)*smoothstep(u/.075)
            root=smoothstep((u-.36)/.49)
            upper=1-smoothstep((v-.34)/.35)
            weights=[root,(1-root)*upper,(1-root)*(1-upper)]
            for k,w in enumerate(weights):
                parts[k][j:j+4]=bytes((79,82,51,round(255*alpha*edge*w)))
    for k,raw in enumerate(parts):
        dest=Path('_mvp/assets')/f'welcome-shadow-{kind}-{k}-v18.png'
        subprocess.run([convert,'-size',f'{W}x{H}','-depth','8','rgba:-','-channel','A','-blur','0x2.6','+channel','-strip','PNG32:'+str(dest)],input=raw,check=True)
        assert dest.read_bytes()[:8]==b'\x89PNG\r\n\x1a\n'
        assert dest.stat().st_size<400000
script.write_text(script.read_text()+'\n'+"\n// Visibility only: no requestAnimationFrame, no animation-related JS.\n(()=>{\n const section=document.querySelector('.welcome');\n if(!section||section.querySelector('.welcome-shadow-layer'))return;\n const layer=document.createElement('div');layer.className='welcome-shadow-layer';layer.setAttribute('aria-hidden','true');\n for(const kind of ['upper','lower']){\n  const branch=document.createElement('div');branch.className='welcome-shadow-branch welcome-shadow-'+kind;\n  for(let i=0;i<3;i++){const img=document.createElement('img');img.className='welcome-shadow-piece';img.alt='';img.decoding='async';img.src='assets/welcome-shadow-'+kind+'-'+i+'-v18.png';img.draggable=false;branch.append(img)}\n  layer.append(branch);\n }\n section.prepend(layer);\n function align(){const r=section.getBoundingClientRect();layer.style.setProperty('--shadow-left',(-r.left)+'px');layer.style.setProperty('--shadow-width',document.documentElement.clientWidth+'px')}\n align();window.addEventListener('resize',align,{passive:true});\n if('ResizeObserver'in window)new ResizeObserver(align).observe(section);\n let visible=true;\n function sync(){layer.classList.toggle('is-visible',visible&&!document.hidden)}\n document.addEventListener('visibilitychange',sync);\n if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{rootMargin:'0px'}).observe(section);\n sync();\n})();\n")
