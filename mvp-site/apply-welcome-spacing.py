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

import re
for name in ('cascade-hydrangea','cascade-blossom','cascade-strawberry'):
    copyfile(Path('mvp-site')/(name+'.svg'),Path('_mvp/assets')/(name+'.svg'))
html=p.read_text()
start=re.search(r'<section\b[^>]*class="[^"]*\bwelcome\b[^"]*"[^>]*>',html)
assert start, 'Welcome section not found'
end=html.index('</section>',start.end())
art='<img class="welcome-botanical cascade-blossom" src="assets/cascade-blossom.svg" alt="" aria-hidden="true"><img class="welcome-botanical cascade-blossom cascade-blossom-upper" src="assets/cascade-blossom.svg" alt="" aria-hidden="true"><img class="welcome-botanical cascade-hydrangea" src="assets/cascade-hydrangea.svg" alt="" aria-hidden="true"><img class="welcome-botanical cascade-strawberry" src="assets/cascade-strawberry.svg" alt="" aria-hidden="true">'
p.write_text(html[:end]+art+html[end:])
