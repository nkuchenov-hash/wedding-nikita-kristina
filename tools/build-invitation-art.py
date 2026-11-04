"""Build clean invitation cutouts from source art during the Pages build."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops

ROOT = Path('_site/public')
source = ROOT / 'production/invitation-cherub-full-column.png'
out = ROOT / 'production/invitation-column-isolated.png'
assert source.is_file(), source
im = Image.open(source).convert('RGBA')
w,h = im.size
print('Column source resolution:', w,h)
assert w > 250 and h > 850, (w,h)
# Remove the source's burned-in wording and old palace on its left.
points = [(0.35,0.28),(0.98,0.28),(0.98,0.98),
          (0.28,0.98),(0.30,0.89),(0.39,0.78),(0.37,0.60),
          (0.33,0.48),(0.33,0.34)]
mask = Image.new('L',im.size,0)
ImageDraw.Draw(mask).polygon([(round(x*w),round(y*h)) for x,y in points],fill=255)
# Only subpixel antialiasing; no fuzzy gradient masking.
mask = mask.filter(ImageFilter.GaussianBlur(0.55))
im.putalpha(ImageChops.multiply(im.getchannel('A'),mask))
im = im.crop((int(.28*w),int(.27*h),w,h))
im.save(out,optimize=True)
print('CLEAN COLUMN PNG',out,im.size,out.stat().st_size)

estate=ROOT/'board/02-invitation/estate-sunny-clean.webp'
if estate.exists():
    house=Image.open(estate).convert('RGB')
    house=ImageEnhance.Contrast(house).enhance(1.035)
    house=house.filter(ImageFilter.UnsharpMask(radius=1.2,percent=110,threshold=4))
    output=ROOT/'production/invitation-estate-clarified.webp'
    house.save(output,'WEBP',quality=96,method=6)
    print('ESTATE PHOTO',house.size,output.stat().st_size)
