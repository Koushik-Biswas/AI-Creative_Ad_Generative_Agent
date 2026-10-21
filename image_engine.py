from PIL import Image, ImageDraw, ImageFont
import io
import base64
import textwrap

def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    )
    if bold:
        candidates = (candidates[0],) + candidates[1:]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()

def create_ad_image(headline: str, subtext: str, cta: str, bg_color: str) -> str:
    """Generates a 1080x1080 ad image and returns it as a Base64 string."""
    width, height = 1080, 1080
    
    # 1. Create Background
    try:
        img = Image.new('RGB', (width, height), color=bg_color)
    except ValueError:
        img = Image.new('RGB', (width, height), color="#1E3A8A") # Fallback color
        
    draw = ImageDraw.Draw(img)

    headline_font = _font(80, bold=True)
    body_font = _font(40)
    cta_font = _font(50, bold=True)

    # Wrap copy so long AI responses remain inside the square creative.
    headline_lines = textwrap.wrap(headline, width=20)[:3]
    subtext_lines = textwrap.wrap(subtext, width=42)[:4]
    draw.multiline_text((100, 260), "\n".join(headline_lines), fill="white",
                        font=headline_font, spacing=12)
    draw.multiline_text((100, 470), "\n".join(subtext_lines), fill="white",
                        font=body_font, spacing=8)
    
    # 4. Draw CTA Button
    draw.rectangle([100, 600, 500, 700], fill="white", outline="white")
    draw.text((150, 620), cta[:24], fill=bg_color, font=cta_font)

    # 5. Convert to Base64 for the frontend
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"