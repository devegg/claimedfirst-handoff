from base64 import b64encode
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONT = Path('.next/static/media/03bda585a99c6450-s.p.32sris142tqlb.woff2')
font_data = b64encode(FONT.read_bytes()).decode('ascii')
font_face = f"@font-face{{font-family:FrauncesEmbedded;src:url(data:font/woff2;base64,{font_data}) format('woff2');font-weight:100 900}}"

def save(name: str, body: str, label: str = 'Founding Scout'):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="{label} badge">
<title>{label}</title>
<style>{font_face}</style>
<rect width="1024" height="1024" fill="#121613"/>
{body}
</svg>'''
    (HERE / name).write_text(svg, encoding='utf-8')

save('original-scout.svg', '''<circle cx="512" cy="512" r="430" fill="#1B211C" stroke="#E48C72" stroke-width="12"/>
<g fill="none" stroke="#E48C72" stroke-width="3" opacity=".55"><circle cx="512" cy="512" r="393"/><circle cx="512" cy="512" r="368"/><circle cx="512" cy="512" r="343"/><circle cx="512" cy="512" r="318"/></g>
<circle cx="512" cy="512" r="266" fill="#121613" stroke="#E48C72" stroke-width="5"/>
<circle cx="512" cy="340" r="31" fill="#E48C72"/>
<text x="512" y="505" text-anchor="middle" font-family="FrauncesEmbedded, Georgia, serif" font-size="92" font-weight="600" fill="#E48C72">Original</text>
<text x="512" y="618" text-anchor="middle" font-family="FrauncesEmbedded, Georgia, serif" font-size="120" font-weight="600" fill="#E48C72">Scout</text>''', 'Original Scout')

save('founding-scout-2.svg', '''<circle cx="512" cy="512" r="430" fill="#1B211C" stroke="#E48C72" stroke-width="12"/>
<g fill="none" stroke="#E48C72" stroke-width="4" opacity=".7"><circle cx="512" cy="512" r="380"/><circle cx="512" cy="512" r="345"/><circle cx="512" cy="512" r="310"/></g>
<circle cx="512" cy="512" r="256" fill="#E48C72"/>
<circle cx="512" cy="352" r="26" fill="#121613"/>
<text x="512" y="507" text-anchor="middle" font-family="FrauncesEmbedded, Georgia, serif" font-size="88" font-weight="650" fill="#121613">Founding</text>
<text x="512" y="617" text-anchor="middle" font-family="FrauncesEmbedded, Georgia, serif" font-size="120" font-weight="650" fill="#121613">Scout</text>''')
