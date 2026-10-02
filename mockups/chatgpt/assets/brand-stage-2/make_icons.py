from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
BG = '#121613'
PANEL = '#1B211C'
PAPER = '#F3EFE5'
CORAL = '#E48C72'

def svg(name: str, shapes: str):
    content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="Record icon">
<title>Record icon</title>
<rect width="1024" height="1024" fill="{BG}"/>
{shapes}
</svg>'''
    (HERE / name).write_text(content, encoding='utf-8')

def disk(draw, radius, fill, outline=None, width=1):
    box=(512-radius,512-radius,512+radius,512+radius)
    draw.ellipse(box,fill=fill,outline=outline,width=width)

def render(name: str, style: int):
    im=Image.new('RGB',(1024,1024),BG)
    d=ImageDraw.Draw(im)
    disk(d,425,PANEL,PAPER,28 if style==1 else 34)
    if style==1:
        for r in (348,290,232): disk(d,r,None,PAPER,22)
        disk(d,118,CORAL)
        disk(d,20,BG)
    else:
        for r in (326,230): disk(d,r,None,PAPER,30)
        disk(d,128,CORAL)
        disk(d,22,BG)
    im.save(HERE / f'icon-{style}-1024.png')
    im.resize((32,32),Image.Resampling.LANCZOS).save(HERE / f'icon-{style}-32.png')

svg('icon-1.svg', f'''<circle cx="512" cy="512" r="425" fill="{PANEL}" stroke="{PAPER}" stroke-width="28"/>
<g fill="none" stroke="{PAPER}" stroke-width="22"><circle cx="512" cy="512" r="348"/><circle cx="512" cy="512" r="290"/><circle cx="512" cy="512" r="232"/></g>
<circle cx="512" cy="512" r="118" fill="{CORAL}"/><circle cx="512" cy="512" r="20" fill="{BG}"/>''')

svg('icon-2.svg', f'''<circle cx="512" cy="512" r="425" fill="{PANEL}" stroke="{PAPER}" stroke-width="34"/>
<g fill="none" stroke="{PAPER}" stroke-width="30"><circle cx="512" cy="512" r="326"/><circle cx="512" cy="512" r="230"/></g>
<circle cx="512" cy="512" r="128" fill="{CORAL}"/><circle cx="512" cy="512" r="22" fill="{BG}"/>''')

render('icon-1',1)
render('icon-2',2)
