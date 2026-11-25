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

# Install the full-resolution transparent gold engraving into the original hero slot.
from shutil import copyfile
art = Path('mvp-site/hero-skyline-engraving.png')
assert art.stat().st_size > 1000000
assert 'src="assets/skyline.png"' in p.read_text()
# Convert the engraving into a single warm-gold ink layer, like the approved
# reference: shadows are transparent rather than opaque brown/cream fills.
# PNG decoding is self-contained, so the release needs no extra dependencies.
import struct, zlib, re
raw = art.read_bytes()
assert raw[:8] == b'\x89PNG\r\n\x1a\n'
pos, data = 8, []
while pos < len(raw):
    length = struct.unpack_from('>I', raw, pos)[0]
    typ = raw[pos+4:pos+8]
    val = raw[pos+8:pos+8+length]
    if typ == b'IHDR':
        w,h,depth,ct,_,_,interlace = struct.unpack('>IIBBBBB', val)
        assert depth == 8 and ct == 6 and not interlace
    if typ == b'IDAT':
        data.append(val)
    pos += length+12
stride = 4*w
scan = zlib.decompress(b''.join(data))
prev = bytearray(stride)
lum, opacity = bytearray(w*h), bytearray(w*h)
def paeth(a,b,c):
    p=a+b-c
    pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
    return a if pa<=pb and pa<=pc else b if pb<=pc else c
for y in range(h):
    p0 = y*(stride+1)
    typ = scan[p0]
    row = bytearray(scan[p0+1:p0+1+stride])
    if typ:
        for i in range(stride):
            a = row[i-4] if i>=4 else 0
            b = prev[i]
            c = prev[i-4] if i>=4 else 0
            v = a if typ==1 else b if typ==2 else (a+b)//2 if typ==3 else paeth(a,b,c)
            row[i] = (row[i]+v)&255
    for x in range(w):
        i=4*x
        k=y*w+x
        lum[k]=round(.299*row[i]+.587*row[i+1]+.114*row[i+2])
        opacity[k]=row[i+3]
    prev=row
# Suppress flat shaded areas while keeping the highlights and fine ink strokes.
radius=6
diameter=2*radius+1
horizontal=bytearray(w*h)
for y in range(h):
    start=y*w
    total=lum[start]*radius+sum(lum[start:start+radius+1])
    for x in range(w):
        horizontal[start+x]=round(total/diameter)
        total+=lum[start+min(w-1,x+radius+1)]-lum[start+max(0,x-radius)]
low=bytearray(w*h)
for x in range(w):
    total=horizontal[x]*radius+sum(horizontal[y*w+x] for y in range(radius+1))
    for y in range(h):
        low[y*w+x]=round(total/diameter)
        total+=horizontal[min(h-1,y+radius+1)*w+x]-horizontal[max(0,y-radius)*w+x]
def clamp(v): return min(1,max(0,v))
out=bytearray()
for y in range(h):
    out.append(0)
    fy=clamp((h-y)/130)
    for x in range(w):
        k=y*w+x
        l=lum[k]/255
        edge=.42+.58*clamp((l-low[k]/255+.025)/.18)
        fade=clamp(x/80)*clamp((w-1-x)/60)*fy
        alpha=round(opacity[k]*clamp((l-.25)/.61)**1.10*edge*fade)
        out.extend((242,228,174,alpha))
def chunk(t,b):
    return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
encoded=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(out,8))+chunk(b'IEND',b'')
Path('_mvp/assets/skyline.png').write_bytes(encoded)
# Restore the original reference's soft lower atmospheric transition.
html=p.read_text()
html,n=re.subn(r'(<img\b[^>]*\bclass="[^"]*\bhero-skyline\b[^"]*"[^>]*>)',r'\1<div class="hero-soft-haze" aria-hidden="true"></div>',html,count=1)
assert n==1
p.write_text(html)
css.write_text(css.read_text()+"""
/* Reference-like atmospheric fade; stays behind wave, foliage and RSVP. */
.hero .hero-soft-haze{display:none}
@media(min-width:701px){
 .hero .hero-soft-haze{display:block;position:absolute;inset:0;z-index:3;pointer-events:none;background:linear-gradient(180deg,transparent 74%,rgba(160,170,112,.08) 83%,rgba(174,184,125,.39) 100%)}
 .hero .hero-wave{z-index:4!important}
 .hero .hero-cta{z-index:6!important}
}
""")

