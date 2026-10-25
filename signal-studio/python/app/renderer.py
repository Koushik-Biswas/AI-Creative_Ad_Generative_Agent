"""Deterministic Pillow rendering with measured text, original abstract forms and export checks."""
import io
import re
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fastapi import HTTPException
from .models import SPECS

def font(size, bold=False):
    name = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    for path in [Path('/usr/share/fonts/truetype/dejavu')/name, Path('C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf')]:
        if path.exists():
            return ImageFont.truetype(str(path), int(size))
    return ImageFont.load_default(size=int(size))

def quality(creative, project):
    text = ' '.join(creative[k] for k in ('headline', 'body', 'cta'))
    source_text = ' '.join([project['description']] + [s['text'] for s in project['sources']] + [c['text'] for c in (project.get('profile') or {}).get('claims', [])]).lower()
    unverified = [n for n in re.findall(r'\b\d+(?:[.,]\d+)?\s*[%xX]?', text) if n.lower() not in source_text]
    excluded = [s.strip() for s in project['avoid'].split(',') if s.strip() and s.strip().lower() in text.lower()]
    names = [c['name'] for c in project['competitors'] if c['name'].lower() in text.lower()]
    copied = any(len(e['headline']) > 15 and e['headline'].lower() in text.lower() for e in project['evidence'])
    return {'dimensionsValid': SPECS.get(creative['ratio']) == (creative['width'], creative['height']),
            'unverifiedNumbers': unverified, 'excludedWords': excluded, 'competitorNames': names,
            'copiedHeadline': copied, 'policyReviewRequired': True}

def render(creative, project, file_type='png', logo_path=None):
    check = quality(creative, project)
    if not check['dimensionsValid'] or any(check[k] for k in ('unverifiedNumbers', 'excludedWords', 'competitorNames', 'copiedHeadline')):
        raise HTTPException(400, 'Resolve creative quality errors before export.')
    width, height = creative['width'], creative['height']
    scale = width / 1200
    landscape = width / height > 1.5
    tall = height / width > 1.5
    background = creative['color']
    rgb = tuple(int(background[i:i+2], 16) for i in (1,3,5))
    light = sum(a*b for a,b in zip(rgb, (0.2126,0.7152,0.0722))) > 165
    ink = '#172b25' if light else '#ffffff'
    accent = '#325447' if light else '#d8f29c'
    image = Image.new('RGB', (width,height), background)
    draw = ImageDraw.Draw(image)
    margin = int((62 if landscape else 86) * scale)
    top = int((225 if tall else 76) * scale)
    if logo_path:
        with Image.open(logo_path) as logo:
            logo = logo.convert('RGBA'); logo.thumbnail((int(190*scale),int(64*scale)))
            image.paste(logo, (margin,top-int(34*scale)), logo)
    else:
        draw.text((margin,top-int(35*scale)), (project.get('profile') or {}).get('name',project['title']), font=font(36*scale,True), fill=ink)
    art = Image.new('RGBA', (width,height))
    ad = ImageDraw.Draw(art)
    cx,cy = ((875,285) if landscape else (790,1050 if tall else 860))
    for phase in (0,1.2):
        points=[]
        for i in range(181):
            a=i*math.pi/90
            rx,ry=(205,92) if landscape else (285,130)
            x,y=rx*math.cos(a),ry*math.sin(a)
            angle=phase+creative['style']*.3
            points.append((int((cx+x*math.cos(angle)-y*math.sin(angle))*scale),int((cy+x*math.sin(angle)+y*math.cos(angle))*scale)))
        ad.line(points, fill=(*tuple(int(accent[i:i+2],16) for i in (1,3,5)),150), width=int(70*scale), joint='curve')
    image.paste(art,(0,0),art)
    draw = ImageDraw.Draw(image)
    def wrapped(text, f, max_width):
        lines=[]
        for paragraph in text.split('\n'):
            line=''
            for word in paragraph.split():
                trial=(line+' '+word).strip()
                if draw.textlength(trial,font=f)>max_width and line:
                    lines.append(line); line=word
                else:
                    line=trial
            if line: lines.append(line)
        return lines
    size=(66 if landscape else 85)*scale
    title_font=font(size,True)
    lines=wrapped(creative['headline'],title_font,(750 if landscape else 1000)*scale)
    while len(lines)>(3 if landscape else 4) and size>36*scale:
        size-=2;title_font=font(size,True);lines=wrapped(creative['headline'],title_font,(750 if landscape else 1000)*scale)
    y=top+int((92 if landscape else 145)*scale)
    for line in lines:
        draw.text((margin,y),line,font=title_font,fill=ink);y+=int(size*1.15)
    body_font=font(24*scale)
    for line in wrapped(creative['body'],body_font,(720 if landscape else 990)*scale):
        draw.text((margin,y+int(15*scale)),line,font=body_font,fill=ink);y+=int(30*scale)
    cta_y=int((530 if landscape else 1460 if tall else 1090)*scale)
    cta_font=font(25*scale,True);button_w=int(draw.textlength(creative['cta'],font=cta_font)+60*scale)
    draw.rounded_rectangle((margin,cta_y-int(56*scale),margin+button_w,cta_y+int(14*scale)),radius=int(35*scale),fill=ink)
    draw.text((margin+int(30*scale),cta_y-int(39*scale)),creative['cta'],font=cta_font,fill=background)
    if project['disclaimer']:
        draw.text((margin,height-int((200 if tall else 45)*scale)),project['disclaimer'],font=font(15*scale),fill=ink)
    result=io.BytesIO();image.save(result,format='JPEG' if file_type=='jpg' else 'PNG',quality=90,optimize=True)
    if result.tell()>5*1024*1024:
        raise HTTPException(400,'Image exceeds 5 MB; try JPG.')
    return result.getvalue()
