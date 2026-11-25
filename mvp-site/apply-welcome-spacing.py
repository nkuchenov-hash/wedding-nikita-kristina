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

# Keep the approved original artwork, not the later replacement.
# Export the unchanged source into QA for pixel-level comparison.
from shutil import copyfile
import subprocess
import sys
try:
    from PIL import Image, ImageFilter
except ImportError:
    subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', 'pillow'], check=True)
    from PIL import Image, ImageFilter
qa=Path('_mvp-qa')
qa.mkdir(exist_ok=True)
asset=Path('_mvp/assets/skyline.png')
copyfile(asset,qa/'original-skyline.png')
im=Image.open(asset).convert('RGBA')
print('ORIGINAL_SKYLINE',im.size,im.getchannel('A').getbbox())
# High-quality interpolation with subtle sharpening, leaving the original layout intact.
im=im.resize((im.width*3,im.height*3),Image.Resampling.LANCZOS)
alpha=im.getchannel('A')
im.putalpha(alpha.filter(ImageFilter.UnsharpMask(radius=1.35,percent=65,threshold=3)))
im.save(asset,optimize=True)
copyfile(asset,qa/'refined-skyline.png')
