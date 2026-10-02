from base64 import b64encode
from pathlib import Path

HERE = Path(__file__).resolve().parent
MEDIA = Path('.next/static/media')
fraunces = b64encode((MEDIA / '03bda585a99c6450-s.p.32sris142tqlb.woff2').read_bytes()).decode('ascii')
dm_sans = b64encode((MEDIA / '5c285b27cdda1fe8-s.p.2_mbdogr7ni8i.woff2').read_bytes()).decode('ascii')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="ClaimedFirst. Find them first. Keep the number.">
<title>ClaimedFirst</title>
<style>
@font-face{{font-family:FrauncesEmbedded;src:url(data:font/woff2;base64,{fraunces}) format('woff2');font-weight:100 900}}
@font-face{{font-family:DMSansEmbedded;src:url(data:font/woff2;base64,{dm_sans}) format('woff2');font-weight:100 1000}}
</style>
<rect width="1200" height="630" fill="#121613"/>
<text x="80" y="153" font-family="FrauncesEmbedded, Georgia, serif" font-weight="650" font-size="68" letter-spacing="-3"><tspan fill="#F3EFE5">Claimed</tspan><tspan fill="#E48C72">First</tspan></text>
<text x="80" y="338" font-family="DMSansEmbedded, Arial, sans-serif" font-size="47" font-weight="500" fill="#F3EFE5">Find them first.</text>
<text x="80" y="400" font-family="DMSansEmbedded, Arial, sans-serif" font-size="47" font-weight="500" fill="#F3EFE5">Keep the number.</text>
<g>
  <circle cx="936" cy="340" r="215" fill="#1B211C" stroke="#F3EFE5" stroke-width="4"/>
  <g fill="none" stroke="#F3EFE5" stroke-width="3" opacity=".82"><circle cx="936" cy="340" r="177"/><circle cx="936" cy="340" r="143"/><circle cx="936" cy="340" r="111"/></g>
  <circle cx="936" cy="340" r="62" fill="#E48C72"/>
  <circle cx="936" cy="340" r="10" fill="#121613"/>
</g>
</svg>'''
(HERE / 'link-preview.svg').write_text(svg, encoding='utf-8')
