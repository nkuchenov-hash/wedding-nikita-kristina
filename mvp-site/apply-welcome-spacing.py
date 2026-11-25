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
