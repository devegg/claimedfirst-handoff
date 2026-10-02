from base64 import b64encode
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONT = Path('.next/static/media/03bda585a99c6450-s.p.32sris142tqlb.woff2')
font_data = b64encode(FONT.read_bytes()).decode('ascii')
font_face = f"@font-face{{font-family:FrauncesEmbedded;src:url(data:font/woff2;base64,{font_data}) format('woff2');font-weight:100 900}}"

titles = [
    ('lucky-scout', 'Lucky Scout', 1),
    ('ear-for-talent', 'Ear for Talent', 2),
    ('legendary-ear', 'Legendary Ear', 3),
]

for filename, title, detail_count in titles:
    dots = ''.join(f'<circle cx="{738 + (i - (detail_count - 1) / 2) * 20}" cy="80" r="5" fill="#E48C72"/>' for i in range(detail_count))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="820" height="160" viewBox="0 0 820 160" role="img" aria-label="{title} badge">
<title>{title}</title>
<style>{font_face}</style>
<rect width="820" height="160" fill="#121613"/>
<rect x="12" y="16" width="796" height="128" rx="14" fill="#1B211C" stroke="#3E4A40" stroke-width="2"/>
<circle cx="86" cy="80" r="43" fill="#121613" stroke="#F3EFE5" stroke-width="2"/>
<g fill="none" stroke="#F3EFE5" stroke-width="1.5" opacity=".75"><circle cx="86" cy="80" r="35"/><circle cx="86" cy="80" r="28"/></g>
<circle cx="86" cy="80" r="12" fill="#E48C72"/>
<text x="158" y="101" font-family="FrauncesEmbedded, Georgia, serif" font-size="60" font-weight="550" fill="#F3EFE5">{title}</text>
{dots}
</svg>'''
    (HERE / f'{filename}.svg').write_text(svg, encoding='utf-8')
