from base64 import b64encode
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONT = Path('.next/static/media/03bda585a99c6450-s.p.32sris142tqlb.woff2')
font_data = b64encode(FONT.read_bytes()).decode('ascii')
font_face = f"@font-face{{font-family:FrauncesEmbedded;src:url(data:font/woff2;base64,{font_data}) format('woff2');font-weight:100 900;font-style:normal}}"

def save(name: str, body: str):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="320" viewBox="0 0 1200 320" role="img" aria-label="ClaimedFirst">
<title>ClaimedFirst</title>
<style>{font_face}</style>
<rect width="1200" height="320" fill="#121613"/>
{body}
</svg>'''
    (HERE / name).write_text(svg, encoding='utf-8')

save('wordmark-1.svg', '''<text x="600" y="208" text-anchor="middle" font-family="FrauncesEmbedded, Georgia, serif" font-weight="500" font-size="154" letter-spacing="-6"><tspan fill="#F3EFE5">Claimed</tspan><tspan fill="#E48C72">First</tspan></text>''')

save('wordmark-2.svg', '''<g fill="none" stroke="#F3EFE5" stroke-width="2" opacity=".72"><circle cx="164" cy="160" r="84"/><circle cx="164" cy="160" r="74"/><circle cx="164" cy="160" r="64"/><circle cx="164" cy="160" r="54"/></g>
<circle cx="164" cy="160" r="25" fill="#E48C72"/>
<text x="310" y="209" font-family="FrauncesEmbedded, Georgia, serif" font-weight="650" font-size="132" letter-spacing="-6"><tspan fill="#F3EFE5">Claimed</tspan><tspan fill="#E48C72">First</tspan></text>''')

save('wordmark-3.svg', '''<text x="95" y="149" font-family="FrauncesEmbedded, Georgia, serif" font-weight="400" font-size="126" letter-spacing="-4" fill="#F3EFE5">Claimed</text>
<path d="M97 175 H855" fill="none" stroke="#F3EFE5" stroke-width="2" opacity=".65"/>
<text x="850" y="267" text-anchor="end" font-family="FrauncesEmbedded, Georgia, serif" font-weight="600" font-size="126" letter-spacing="-4" fill="#E48C72">First</text>''')
