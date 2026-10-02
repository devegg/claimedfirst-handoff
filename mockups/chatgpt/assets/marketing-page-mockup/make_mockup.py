from base64 import b64encode
from pathlib import Path

HERE = Path(__file__).resolve().parent
MEDIA = Path('.next/static/media')
fraunces = b64encode((MEDIA / '03bda585a99c6450-s.p.32sris142tqlb.woff2').read_bytes()).decode('ascii')
dm_sans = b64encode((MEDIA / '5c285b27cdda1fe8-s.p.2_mbdogr7ni8i.woff2').read_bytes()).decode('ascii')
fonts = f'''<style>@font-face{{font-family:FrauncesEmbedded;src:url(data:font/woff2;base64,{fraunces}) format('woff2');font-weight:100 900}}@font-face{{font-family:DMSansEmbedded;src:url(data:font/woff2;base64,{dm_sans}) format('woff2');font-weight:100 1000}}</style>'''

def wordmark(x: int, y: int, size: int):
    return f'''<text x="{x}" y="{y}" font-family="FrauncesEmbedded, Georgia, serif" font-weight="650" font-size="{size}" letter-spacing="-3"><tspan fill="#F3EFE5">Claimed</tspan><tspan fill="#E48C72">First</tspan></text>'''

def record(cx: int, cy: int, r: int):
    rings = ''.join(f'<circle cx="{cx}" cy="{cy}" r="{int(r * m)}"/>' for m in (.77, .54))
    return f'''<g aria-label="Record">
      <circle cx="{cx}" cy="{cy}" r="{r}" fill="#1B211C" stroke="#F3EFE5" stroke-width="4"/>
      <g fill="none" stroke="#F3EFE5" stroke-width="3" opacity=".82">{rings}</g>
      <circle cx="{cx}" cy="{cy}" r="{int(r * .30)}" fill="#E48C72"/>
      <circle cx="{cx}" cy="{cy}" r="{int(r * .046)}" fill="#121613"/>
    </g>'''

desktop = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900" role="img" aria-label="ClaimedFirst. Find them first. Keep the number. Claim number seven.">
<title>ClaimedFirst</title>{fonts}
<rect width="1440" height="900" fill="#121613"/>
{wordmark(92,78,48)}
<path d="M92 112 H1348" stroke="#3E4A40" stroke-width="2"/>
<text x="100" y="328" font-family="FrauncesEmbedded, Georgia, serif" font-size="82" font-weight="450" fill="#F3EFE5">Find them first.</text>
<text x="100" y="428" font-family="FrauncesEmbedded, Georgia, serif" font-size="82" font-weight="450" fill="#F3EFE5">Keep the number.</text>
<g><rect x="100" y="567" width="425" height="198" rx="5" fill="#1B211C" stroke="#3E4A40" stroke-width="3"/>
<path d="M100 612 H525" stroke="#3E4A40" stroke-width="2" stroke-dasharray="7 10"/>
<text x="306" y="721" text-anchor="middle" font-family="FrauncesEmbedded, Georgia, serif" font-size="142" font-weight="600" fill="#E48C72">#7</text></g>
{record(1065,443,277)}
<path d="M92 834 H1348" stroke="#3E4A40" stroke-width="2"/>
</svg>'''

mobile = f'''<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844" role="img" aria-label="ClaimedFirst. Find them first. Keep the number. Claim number seven.">
<title>ClaimedFirst</title>{fonts}
<rect width="390" height="844" fill="#121613"/>
{wordmark(24,64,39)}
<path d="M24 88 H366" stroke="#3E4A40" stroke-width="1.5"/>
{record(195,263,137)}
<text x="26" y="503" font-family="FrauncesEmbedded, Georgia, serif" font-size="43" font-weight="450" fill="#F3EFE5">Find them first.</text>
<text x="26" y="557" font-family="FrauncesEmbedded, Georgia, serif" font-size="43" font-weight="450" fill="#F3EFE5">Keep the number.</text>
<g><rect x="26" y="621" width="338" height="176" rx="5" fill="#1B211C" stroke="#3E4A40" stroke-width="2"/>
<path d="M26 659 H364" stroke="#3E4A40" stroke-width="2" stroke-dasharray="6 8"/>
<text x="195" y="769" text-anchor="middle" font-family="FrauncesEmbedded, Georgia, serif" font-size="128" font-weight="600" fill="#E48C72">#7</text></g>
</svg>'''

(HERE / 'desktop.svg').write_text(desktop, encoding='utf-8')
(HERE / 'mobile.svg').write_text(mobile, encoding='utf-8')
