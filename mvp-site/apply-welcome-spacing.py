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
from shutil import copyfile, which
import subprocess
qa=Path('_mvp-qa')
qa.mkdir(exist_ok=True)
asset=Path('_mvp/assets/skyline.png')
copyfile(asset,qa/'original-skyline.png')
# Lanczos interpolation and light alpha sharpening only. No redesign.
tool=which('magick') or which('convert')
if tool:
    dest=asset.with_name('skyline-refined.png')
    subprocess.run([tool,str(asset),'-filter','Lanczos','-resize','300%','-channel','A','-unsharp','0x1.1+0.45+0.01','+channel','PNG32:'+str(dest)],check=True)
    dest.replace(asset)
else:
    print('ImageMagick unavailable; original artwork preserved')
copyfile(asset,qa/'refined-skyline.png')
