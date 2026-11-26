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


# Welcome photo cards: authentic high-resolution photographs, stored locally at build
# time. Only the two img sources and their attribution are changed.
from urllib.request import Request, urlopen
from urllib.parse import quote
from time import sleep
from html import escape
photos = {
    'estate': {
        'url': 'https://upload.wikimedia.org/wikipedia/commons/8/8c/' + quote('Дом_усадебный_Андрианово2.jpg'),
        'page': 'https://commons.wikimedia.org/wiki/File:' + quote('Дом_усадебный_Андрианово2.jpg'),
        'credit': 'Yulia Pv', 'license': 'CC BY-SA 4.0',
        'license_url': 'https://creativecommons.org/licenses/by-sa/4.0/',
        'alt': 'Усадьба Марьино в Андрианово',
        'position': '50% 50%',
        'min_size': (2992, 2000),
    },
    'city': {
        'url': 'https://upload.wikimedia.org/wikipedia/commons/5/53/Saint_Isaacs_cathedral_from_Moyca_river.jpg',
        'page': 'https://commons.wikimedia.org/wiki/File:Saint_Isaacs_cathedral_from_Moyca_river.jpg',
        'credit': 'Wolfgang Moroder', 'license': 'CC BY-SA 3.0',
        'license_url': 'https://creativecommons.org/licenses/by-sa/3.0/',
        'alt': 'Исаакиевский собор и набережные реки Мойки',
        'position': '50% 50%',
        'min_size': (7360, 4912),
    }
}
# Read JPEG dimensions without introducing an image-processing dependency.
def jpeg_dimensions(data):
    if data[:2] != b'\xff\xd8':
        raise ValueError('Invalid JPEG')
    offset = 2
    while offset < len(data):
        if data[offset] != 255:
            raise ValueError('Invalid JPEG marker')
        while data[offset] == 255:
            offset += 1
        marker = data[offset]
        offset += 1
        if marker in (0xd8, 0xd9):
            continue
        size = int.from_bytes(data[offset:offset+2], 'big')
        if marker in (0xc0, 0xc1, 0xc2, 0xc3):
            return (int.from_bytes(data[offset+5:offset+7], 'big'), int.from_bytes(data[offset+3:offset+5], 'big'))
        if marker == 0xda or size < 2:
            break
        offset += size
    raise ValueError('Missing JPEG size')

html = p.read_text()
for kind, photo in photos.items():
    name = 'welcome-photo-' + kind + '-sunny-v15.jpg'
    for attempt in range(3):
        try:
            req = Request(photo['url'], headers={'User-Agent': 'WeddingMVP/1.0 (https://nikitakristina.ru; local image publication)'})
            with urlopen(req, timeout=45) as response:
                data = response.read(24 * 1024 * 1024)
            w, h = jpeg_dimensions(data)
            assert w >= photo['min_size'][0] and h >= photo['min_size'][1], (kind, w, h)
            assert data[-2:] == b'\xff\xd9', 'Truncated JPEG'
            break
        except Exception:
            if attempt == 2:
                raise
            sleep(3 * (attempt + 1))
    target = Path('_mvp/assets') / name
    target.write_bytes(data)
    # Reframe at original resolution BEFORE resizing. Both files are final
    # independently graded photographs; no overlay or CSS tint is required.
    import shutil, subprocess
    convert = shutil.which('magick') or shutil.which('convert')
    assert convert, 'ImageMagick required for photo preparation'
    ow,oh=jpeg_dimensions(data)
    # Focus on the main portico rather than the dark lawn/tree trunk; for the
    # city, bring the distant dome closer and remove the heavy upper clouds.
    if kind=='estate':
        ch=round(oh*.83); cw=round(ch*.88)
        cx=round(ow*.705-cw*.5); cy=round(oh*.035)
    else:
        ch=round(oh*.79); cw=round(ch*1.14)
        cx=round(ow*.485-cw*.5); cy=round(oh*.16)
    cx=max(0,min(ow-cw,cx));cy=max(0,min(oh-ch,cy))
    assert min(cw,ch)>=1400
    ppm=subprocess.check_output([convert,str(target),'-auto-orient','-crop',f'{cw}x{ch}+{cx}+{cy}','+repage','-resize','2400x2400>','-colorspace','sRGB','-depth','8','ppm:-'])
    header=re.match(rb'P6\s+(\d+)\s+(\d+)\s+255[\r\n ]',ppm)
    assert header
    pw,ph=map(int,header.groups())
    rgb=ppm[header.end():]
    assert len(rgb)==pw*ph*3
    graded=bytearray(len(rgb))
    def clamp(v,low=0.,high=1.):return max(low,min(high,v))
    def smooth(v):
        v=clamp(v)
        return v*v*(3.-2.*v)
    for i in range(0,len(rgb),3):
        r,g,b=rgb[i]/255.,rgb[i+1]/255.,rgb[i+2]/255.
        x=(i//3%pw)/pw
        row=(i//3//pw)/ph
        lum=.2126*r+.7152*g+.0722*b
        chroma=max(r,g,b)-min(r,g,b)
        blue=smooth((b-r+.03)*3.4)*smooth((b-g+.10)*3.6)
        green=smooth((g-r+.015)*3.3)*smooth((g-b+.015)*3.3)
        # Recover exposure without introducing a grey black floor. Protect
        # white columns and keep architecture, leaves and grass crisp.
        shadow_lift=(.075 if kind=='estate' else .055)*(1-lum)**1.5
        mid=lum**(.86 if kind=='estate' else .83)
        y=clamp(mid+shadow_lift-.018)
        sat=1.02-.10*green-.12*blue
        rr=y+(r-lum)*sat
        gg=y+(g-lum)*sat
        bb=y+(b-lum)*sat
        warm=smooth(lum*2.6)*(1-.58*smooth((lum-.78)*4.6))
        rr+=.065*warm;gg+=.025*warm;bb-=.045*warm
        # Selective olive-gold greens; keep foliage from turning fluorescent.
        rr+=.105*green;gg+=.025*green;bb-=.037*green
        # Blue sky remains blue and gets softer, not uniformly desaturated.
        sky_zone=smooth((.52-row)*3.8)
        skyblue=blue*sky_zone
        rr+=.16*skyblue;gg+=.095*skyblue;bb+=.018*skyblue
        # Neutral cloud color grading is separated from the blue sky and land.
        # Apply more peach warmth to the overcast city shot's cloud highlights.
        cloud=sky_zone*smooth((.24-chroma)*5.0)*smooth((lum-.19)*2.8)
        if kind=='city':
            rr+=.21*cloud;gg+=.13*cloud;bb+=.055*cloud
            # Warm river reflections and shaded facades without a fake flare.
            lower=smooth((row-.52)*3)*smooth((lum-.12)*2.5)
            rr+=.055*lower;gg+=.026*lower;bb-=.019*lower
        else:
            rr+=.09*cloud;gg+=.056*cloud;bb+=.021*cloud
            # Brighten and warm lawn separately; keep contact shadows grounded.
            lawn=smooth((row-.52)*4)*green
            rr+=.045*lawn;gg+=.021*lawn
        # Soft highlight shoulder protects detail from clipping.
        def shoulder(v):
            if v<=.91:return clamp(v)
            return .91+.09*(1-math.exp(-(v-.91)/.105))
        graded[i:i+3]=bytes(round(shoulder(v)*255) for v in (rr,gg,bb))
    out_ppm = target.with_suffix('.ppm')
    out_ppm.write_bytes(f'P6\n{pw} {ph}\n255\n'.encode()+graded)
    subprocess.run([convert, str(out_ppm), '-unsharp','0x0.65+0.42+0.025','-sampling-factor', '4:4:4', '-strip', '-quality', '94', str(target)],check=True)
    out_ppm.unlink()
    assert jpeg_dimensions(target.read_bytes()) == (pw,ph)
    print('WELCOME_WARM_GRADE',kind,pw,ph)
    w, h = jpeg_dimensions(target.read_bytes())
    print('WELCOME_HD_PHOTO', kind, w, h, target.stat().st_size)
    pattern = r'(<figure class="photo-frame frame-' + kind + r'">.*?)(<img\b[^>]*>)(.*?</figure>)'
    def replace_photo(match):
        img = match.group(2)
        img, n = re.subn(r'\bsrc="[^"]*"', 'src="assets/' + name + '"', img, count=1)
        assert n == 1
        img = re.sub(r'\s(?:srcset|sizes|alt|style|width|height)="[^"]*"', '', img)
        attrs = {
            'alt': photo['alt'], 'style': 'object-position:'+photo['position']+';filter:none!important;',
            'data-photo-credit': photo['credit'], 'data-photo-source': photo['page'],
            'data-photo-license': photo['license'], 'data-photo-license-url': photo['license_url'],
        }
        img = img.rstrip('>').rstrip('/') + ''.join(' '+k+'="'+escape(v,quote=True)+'"' for k,v in attrs.items()) + '>'
        return match.group(1)+img+match.group(3)
    html, n = re.subn(pattern, replace_photo, html, count=1, flags=re.S)
    assert n == 1, kind
p.write_text(html)
# Credits remain in the existing click-to-open photo viewer, not on the invitation.
js = script.read_text()
anchor = 'figure.append(image,caption);'
assert js.count(anchor) == 1
js = js.replace(anchor, """if(source.dataset.photoCredit){
   const credit=document.createElement('small'), author=document.createElement('a'), license=document.createElement('a');
   author.href=source.dataset.photoSource;author.textContent=source.dataset.photoCredit;author.target='_blank';author.rel='noopener noreferrer';
   license.href=source.dataset.photoLicenseUrl;license.textContent=source.dataset.photoLicense;license.target='_blank';license.rel='noopener noreferrer';
   credit.style.cssText='display:block;margin-top:5px;font-size:12px';
   credit.append('Фото: ',author,' · ',license,' · кадрирование и цветокоррекция');caption.append(credit);
  }
  """+anchor)
script.write_text(js)
