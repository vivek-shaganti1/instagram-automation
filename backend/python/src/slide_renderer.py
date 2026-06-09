"""
Slide renderer: composites background images + text overlays
using Pillow to create final 1080x1080 Instagram carousel slides.

Design system inspired by Attio.com:
- Font: Inter (Display & Regular)
- Colors: warm off-white, near-black text, beige accents
- Layout: generous padding, clear hierarchy, minimal decoration
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from src.utils import get_logger, get_font_path, clean_text, truncate_text

logger = get_logger("slide_renderer")

# ─── Design Constants ───
CANVAS_SIZE = (1080, 1080)
PADDING = 80
SAFE_WIDTH = CANVAS_SIZE[0] - (PADDING * 2)

# Default theme (Light SaaS style)
DEFAULT_THEME = {
    "bg_gradient": ((255, 255, 255), (245, 247, 250)), # Crisp White (#FFFFFF)
    "bg_card": (10, 26, 47, 15),                  # Semi-transparent deep navy card
    "bg_card_border": (10, 26, 47, 30),
    "text_primary": (10, 26, 47, 255),            # Deep Navy
    "text_secondary": (71, 85, 105, 255),         # Slate-600
    "text_accent": (148, 163, 184, 255),          # Slate-400
    "label_bg": (79, 70, 229, 25),                # Soft Indigo bg
    "label_text": (79, 70, 229, 255),             # Soft Indigo (#4F46E5)
    "divider": (10, 26, 47, 30),
    "highlight": (10, 26, 47, 10),
    "highlight_border": (79, 70, 229, 80),
    "stat_accent": (79, 70, 229, 255),            # Soft Indigo (#4F46E5)
    "white": (255, 255, 255, 255),
}

# Premium, high-contrast SaaS color systems
THEMES = {
    "apple_minimal": {
        "bg_gradient": ((240, 240, 242), (225, 225, 230)),
        "bg_card": (255, 255, 255, 120),
        "bg_card_border": (200, 200, 205, 100),
        "text_primary": (25, 25, 27, 255),
        "text_secondary": (75, 75, 80, 255),
        "text_accent": (120, 120, 125, 255),
        "label_bg": (220, 220, 225, 255),
        "label_text": (25, 25, 27, 255),
        "divider": (200, 200, 205, 120),
        "highlight": (25, 25, 27, 10),
        "highlight_border": (25, 25, 27, 40),
        "stat_accent": (25, 25, 27, 255),
        "white": (255, 255, 255, 255),
    },
    "bloomberg_dark": {
        "bg_gradient": ((10, 12, 18), (18, 22, 32)),
        "bg_card": (20, 25, 40, 150),
        "bg_card_border": (50, 70, 100, 80),
        "text_primary": (255, 255, 255, 255),
        "text_secondary": (170, 185, 210, 255),
        "text_accent": (120, 135, 155, 255),
        "label_bg": (25, 30, 45, 200),
        "label_text": (0, 122, 255, 255),
        "divider": (50, 70, 100, 60),
        "highlight": (255, 150, 0, 20),
        "highlight_border": (255, 150, 0, 120),
        "stat_accent": (255, 150, 0, 255),
        "white": (255, 255, 255, 255),
    },
    "startup_editorial": {
        "bg_gradient": ((253, 252, 249), (245, 242, 235)),
        "bg_card": (255, 255, 255, 150),
        "bg_card_border": (220, 215, 200, 120),
        "text_primary": (12, 15, 23, 255),
        "text_secondary": (80, 85, 100, 255),
        "text_accent": (130, 135, 150, 255),
        "label_bg": (235, 230, 220, 255),
        "label_text": (12, 15, 23, 255),
        "divider": (220, 215, 200, 100),
        "highlight": (12, 15, 23, 8),
        "highlight_border": (12, 15, 23, 60),
        "stat_accent": (12, 15, 23, 255),
        "white": (255, 255, 255, 255),
    },
    "cyber_documentary": {
        "bg_gradient": ((15, 15, 17), (24, 24, 28)),
        "bg_card": (30, 30, 35, 180),
        "bg_card_border": (50, 60, 50, 100),
        "text_primary": (255, 255, 255, 255),
        "text_secondary": (180, 185, 180, 255),
        "text_accent": (120, 125, 120, 255),
        "label_bg": (20, 30, 20, 200),
        "label_text": (16, 185, 129, 255),
        "divider": (50, 60, 50, 80),
        "highlight": (16, 185, 129, 20),
        "highlight_border": (16, 185, 129, 120),
        "stat_accent": (16, 185, 129, 255),
        "white": (255, 255, 255, 255),
    },
    "luxury_white": {
        "bg_gradient": ((255, 255, 255), (248, 246, 242)),
        "bg_card": (255, 255, 255, 180),
        "bg_card_border": (230, 225, 215, 120),
        "text_primary": (28, 28, 30, 255),
        "text_secondary": (90, 88, 85, 255),
        "text_accent": (150, 145, 140, 255),
        "label_bg": (240, 235, 225, 255),
        "label_text": (197, 160, 89, 255),
        "divider": (230, 225, 215, 100),
        "highlight": (197, 160, 89, 15),
        "highlight_border": (197, 160, 89, 80),
        "stat_accent": (197, 160, 89, 255),
        "white": (255, 255, 255, 255),
    },
    "midnight_strategy": {
        "bg_gradient": ((5, 5, 8), (12, 12, 20)),
        "bg_card": (15, 15, 25, 180),
        "bg_card_border": (40, 40, 80, 100),
        "text_primary": (255, 255, 255, 255),
        "text_secondary": (180, 185, 210, 255),
        "text_accent": (110, 115, 140, 255),
        "label_bg": (15, 15, 35, 200),
        "label_text": (99, 102, 241, 255),
        "divider": (40, 40, 80, 80),
        "highlight": (99, 102, 241, 25),
        "highlight_border": (99, 102, 241, 120),
        "stat_accent": (99, 102, 241, 255),
        "white": (255, 255, 255, 255),
    },
    "founder_mode": {
        "bg_gradient": ((18, 18, 18), (28, 28, 28)),
        "bg_card": (30, 30, 30, 200),
        "bg_card_border": (60, 50, 45, 120),
        "text_primary": (255, 255, 255, 255),
        "text_secondary": (185, 185, 185, 255),
        "text_accent": (125, 125, 125, 255),
        "label_bg": (35, 25, 20, 200),
        "label_text": (249, 115, 22, 255),
        "divider": (60, 50, 45, 100),
        "highlight": (249, 115, 22, 20),
        "highlight_border": (249, 115, 22, 120),
        "stat_accent": (249, 115, 22, 255),
        "white": (255, 255, 255, 255),
    },
    "ai_war_room": {
        "bg_gradient": ((8, 14, 24), (16, 24, 40)),
        "bg_card": (20, 30, 50, 180),
        "bg_card_border": (80, 40, 50, 100),
        "text_primary": (255, 255, 255, 255),
        "text_secondary": (180, 195, 215, 255),
        "text_accent": (120, 135, 155, 255),
        "label_bg": (30, 15, 20, 200),
        "label_text": (239, 68, 68, 255),
        "divider": (80, 40, 50, 80),
        "highlight": (239, 68, 68, 20),
        "highlight_border": (239, 68, 68, 120),
        "stat_accent": (239, 68, 68, 255),
        "white": (255, 255, 255, 255),
    },
    "modern_finance": {
        "bg_gradient": ((12, 20, 18), (20, 30, 28)),
        "bg_card": (25, 35, 32, 180),
        "bg_card_border": (45, 65, 55, 100),
        "text_primary": (255, 255, 255, 255),
        "text_secondary": (180, 195, 190, 255),
        "text_accent": (120, 135, 130, 255),
        "label_bg": (20, 35, 30, 200),
        "label_text": (52, 211, 153, 255),
        "divider": (45, 65, 55, 80),
        "highlight": (52, 211, 153, 20),
        "highlight_border": (52, 211, 153, 120),
        "stat_accent": (52, 211, 153, 255),
        "white": (255, 255, 255, 255),
    },
    "intelligence_briefing": {
        "bg_gradient": ((242, 245, 245), (230, 235, 235)),
        "bg_card": (255, 255, 255, 150),
        "bg_card_border": (190, 210, 210, 120),
        "text_primary": (15, 35, 35, 255),
        "text_secondary": (70, 90, 90, 255),
        "text_accent": (120, 140, 140, 255),
        "label_bg": (215, 225, 225, 255),
        "label_text": (20, 120, 120, 255),
        "divider": (190, 210, 210, 100),
        "highlight": (20, 120, 120, 15),
        "highlight_border": (20, 120, 120, 80),
        "stat_accent": (20, 120, 120, 255),
        "white": (255, 255, 255, 255),
    }
}

from functools import lru_cache

SLIDE_OVERLAY_ALPHA = 200  # Transparency for bg image overlay (0=transparent, 255=opaque)


@lru_cache(maxsize=128)
def _load_font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    """Load Inter font with fallback to PIL default."""
    font_path = get_font_path(weight)
    try:
        if font_path and font_path.exists():
            return ImageFont.truetype(str(font_path), size)
    except Exception as e:
        logger.warning(f"Font load failed ({weight}, {size}px): {e}")
    # Fallback to PIL default (no TTF)
    return ImageFont.load_default()



def _text_wrap(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    """Wrap text to fit within max_width pixels."""
    words = text.split()
    lines = []
    current_line = ""
    dummy_img = Image.new("RGB", (1, 1))
    draw = ImageDraw.Draw(dummy_img)

    for word in words:
        test_line = f"{current_line} {word}".strip()
        bbox = draw.textbbox((0, 0), test_line, font=font)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    return lines


def _draw_text_block(
    draw: ImageDraw.Draw,
    text: str,
    x: int,
    y: int,
    font: ImageFont.FreeTypeFont,
    color: tuple,
    max_width: int,
    line_spacing: float = 1.3,
    align: str = "left",
) -> int:
    """Draw wrapped and aligned text block. Returns the y position after the last line."""
    lines = _text_wrap(clean_text(text), font, max_width)
    dummy_img = Image.new("RGB", (1, 1))
    dummy_draw = ImageDraw.Draw(dummy_img)
    bbox = dummy_draw.textbbox((0, 0), "Ag", font=font)
    line_height = int((bbox[3] - bbox[1]) * line_spacing)

    for line in lines:
        line_bbox = dummy_draw.textbbox((0, 0), line, font=font)
        line_w = line_bbox[2] - line_bbox[0]
        
        draw_x = x
        if align == "center":
            draw_x = x + (max_width - line_w) // 2
        elif align == "right":
            draw_x = x + (max_width - line_w)
            
        draw.text((draw_x, y), line, font=font, fill=color)
        y += line_height
    return y


def _draw_gradient(size: tuple[int, int], color1: tuple[int, int, int], color2: tuple[int, int, int]) -> Image.Image:
    """Draw a vertical linear gradient from color1 to color2."""
    base = Image.new("RGBA", size, (*color1, 255))
    top = Image.new("RGBA", size, (*color2, 255))
    mask = Image.new("L", size)
    for y in range(size[1]):
        opacity = int(255 * (y / size[1]))
        mask.paste(opacity, (0, y, size[0], y + 1))
    return Image.composite(top, base, mask)


def _composite_background(bg_image_path: Path, theme: dict) -> Image.Image:
    """Create background using theme gradient and optional blended AI image."""
    # 1. Create base theme gradient
    gradient_bg = _draw_gradient(CANVAS_SIZE, theme["bg_gradient"][0], theme["bg_gradient"][1])

    # 2. Blend with AI image if present
    if bg_image_path and bg_image_path.exists():
        try:
            ai_img = Image.open(bg_image_path).convert("RGBA")
            ai_img = ai_img.resize(CANVAS_SIZE, Image.LANCZOS)

            # Lighten and desaturate slightly to allow the gradient to dominate
            enhancer = ImageEnhance.Brightness(ai_img.convert("RGB"))
            ai_img_enhanced = enhancer.enhance(1.1).convert("RGBA")

            # Blend with 23% opacity to overlay the AI image context over the gradient
            result = Image.blend(gradient_bg, ai_img_enhanced, 0.23)
            return result
        except Exception as e:
            logger.warning(f"Background overlay failed: {e}")

    return gradient_bg


def _draw_label(draw: ImageDraw.Draw, text: str, x: int, y: int, theme: dict, align: str = "left", max_width: int = SAFE_WIDTH) -> int:
    """Draw a styled label tag. Returns the y after label."""
    font = _load_font("Medium", 22)
    text = clean_text(text.upper())
    dummy_img = Image.new("RGB", (1, 1))
    dummy_draw = ImageDraw.Draw(dummy_img)
    bbox = dummy_draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x, pad_y = 16, 8

    draw_x = x
    if align == "center":
        draw_x = x + (max_width - (tw + pad_x * 2)) // 2
    elif align == "right":
        draw_x = x + (max_width - (tw + pad_x * 2))

    # Label pill
    draw.rounded_rectangle(
        [draw_x, y, draw_x + tw + pad_x * 2, y + th + pad_y * 2],
        radius=6,
        fill=theme["label_bg"],
        outline=theme.get("bg_card_border", None),
        width=1 if theme.get("bg_card_border", None) else 0
    )
    draw.text((draw_x + pad_x, y + pad_y), text, font=font, fill=theme["label_text"])
    return y + th + pad_y * 2 + 20


def _draw_divider(draw: ImageDraw.Draw, x: int, y: int, width: int, theme: dict) -> int:
    """Draw a subtle horizontal divider line."""
    draw.line([(x, y), (x + width, y)], fill=theme["divider"], width=1)
    return y + 20


def _draw_slide_indicator(draw: ImageDraw.Draw, current: int, total: int, theme: dict):
    """Draw dot indicators at the bottom center."""
    dot_r = 5
    gap = 18
    total_w = (total * dot_r * 2) + ((total - 1) * (gap - dot_r * 2))
    start_x = (CANVAS_SIZE[0] - total_w) // 2
    y = CANVAS_SIZE[1] - PADDING + 12
    for i in range(total):
        cx = start_x + i * gap
        color = theme["text_primary"] if i == current - 1 else theme["divider"]
        draw.ellipse([cx, y, cx + dot_r * 2, y + dot_r * 2], fill=color)


def _draw_brand_handle(draw: ImageDraw.Draw, handle: str, theme: dict):
    """Draw the brand handle at the bottom-left."""
    font = _load_font("Regular", 22)
    text = clean_text(handle)
    draw.text(
        (PADDING, CANVAS_SIZE[1] - PADDING + 8),
        text,
        font=font,
        fill=theme["text_accent"],
    )


# ─── Slide Renderers ──────────────────────────────────────────────────────────

def render_hook_slide(slide: dict, bg_path: Path, handle: str, slide_num: int, total: int, theme: dict = None) -> Image.Image:
    if theme is None:
        theme = DEFAULT_THEME
    canvas = _composite_background(bg_path, theme)
    draw = ImageDraw.Draw(canvas)

    story_index = slide.get("story_index", 0)
    layout_style = (story_index + slide_num) % 3
    align = ["left", "center", "right"][layout_style]

    y = PADDING + 20

    # Label tag
    label = slide.get("label", "AI UPDATE")
    y = _draw_label(draw, label, PADDING, y, theme, align=align, max_width=SAFE_WIDTH)
    y += 24

    # Main headline — auto-shrink font size for long headlines
    headline = clean_text(slide.get("headline", ""))
    if len(headline) > 80:
        headline = headline[:77] + "..."

    # Auto-size: start at 96px for massive cinematic effect, shrink if too long
    for font_size in [96, 76, 64, 52]:
        font_headline = _load_font("Bold", font_size)
        lines = _text_wrap(headline, font_headline, SAFE_WIDTH)
        if len(lines) <= 3:
            break

    dummy_img = Image.new("RGB", (1, 1))
    dummy_draw = ImageDraw.Draw(dummy_img)
    bbox_h = dummy_draw.textbbox((0, 0), "Ag", font=font_headline)
    line_h = int((bbox_h[3] - bbox_h[1]) * 1.15)
    
    for line in lines:
        line_bbox = dummy_draw.textbbox((0, 0), line, font=font_headline)
        line_w = line_bbox[2] - line_bbox[0]
        
        draw_x = PADDING
        if align == "center":
            draw_x = PADDING + (SAFE_WIDTH - line_w) // 2
        elif align == "right":
            draw_x = PADDING + (SAFE_WIDTH - line_w)
            
        draw.text((draw_x, y), line, font=font_headline, fill=theme["text_primary"])
        y += line_h
    y += 24

    # Thin accent divider line
    div_w = 120
    div_x = PADDING
    if align == "center":
        div_x = PADDING + (SAFE_WIDTH - div_w) // 2
    elif align == "right":
        div_x = PADDING + (SAFE_WIDTH - div_w)
        
    draw.line([(div_x, y), (div_x + div_w, y)], fill=theme["stat_accent"], width=4)
    y += 28

    # Subheadline
    sub = clean_text(slide.get("subheadline", ""))
    if sub:
        font_sub = _load_font("Regular", 30)
        y = _draw_text_block(draw, sub, PADDING, y, font_sub, theme["text_secondary"], SAFE_WIDTH, 1.4, align=align)
        y += 24

    # Decorative dots
    accent_size = 12
    dots_w = 48
    dots_x = PADDING
    if align == "center":
        dots_x = PADDING + (SAFE_WIDTH - dots_w) // 2
    elif align == "right":
        dots_x = PADDING + (SAFE_WIDTH - dots_w)

    draw.ellipse([dots_x, y, dots_x + accent_size, y + accent_size], fill=theme["stat_accent"])
    draw.ellipse([dots_x + 18, y, dots_x + 18 + accent_size, y + accent_size], fill=(*theme["stat_accent"][:3], 150))
    draw.ellipse([dots_x + 36, y, dots_x + 36 + accent_size, y + accent_size], fill=(*theme["stat_accent"][:3], 60))

    # Swipe hint at bottom-right
    font_hint = _load_font("Regular", 22)
    hint = "Swipe to learn more  >"
    bbox_hint = dummy_draw.textbbox((0, 0), hint, font=font_hint)
    hw = bbox_hint[2] - bbox_hint[0]
    draw.text(
        (CANVAS_SIZE[0] - PADDING - hw, CANVAS_SIZE[1] - PADDING - 58),
        hint, font=font_hint, fill=theme["text_accent"],
    )

    _draw_brand_handle(draw, handle, theme)
    _draw_slide_indicator(draw, slide_num, total, theme)
    return canvas.convert("RGB")



def render_what_happened_slide(slide: dict, bg_path: Path, handle: str, slide_num: int, total: int, theme: dict = None) -> Image.Image:
    if theme is None:
        theme = DEFAULT_THEME
    canvas = _composite_background(bg_path, theme)
    draw = ImageDraw.Draw(canvas)

    story_index = slide.get("story_index", 0)
    layout_style = (story_index + slide_num) % 3
    align = ["left", "center", "right"][layout_style]

    y = PADDING + 10

    # Title
    title = clean_text(slide.get("title", "What Happened"))
    font_title = _load_font("Bold", 46)
    y = _draw_text_block(draw, title, PADDING, y, font_title, theme["text_primary"], SAFE_WIDTH, 1.2, align=align)
    y += 12
    y = _draw_divider(draw, PADDING, y, SAFE_WIDTH, theme)
    y += 20

    # Body text
    body = clean_text(slide.get("body", ""))
    font_body = _load_font("Regular", 30)
    y = _draw_text_block(draw, body, PADDING, y, font_body, theme["text_secondary"], SAFE_WIDTH, 1.55, align=align)
    y += 30

    # Highlighted quote box
    highlight = clean_text(slide.get("highlight", ""))
    if highlight and y < CANVAS_SIZE[1] - 220:
        box_h = 120
        # Draw glassmorphism rounded card with drop shadow
        draw.rounded_rectangle(
            [PADDING + 4, y + 4, PADDING + SAFE_WIDTH + 4, y + box_h + 4],
            radius=12,
            fill=(0, 0, 0, 40) # drop shadow
        )
        draw.rounded_rectangle(
            [PADDING, y, PADDING + SAFE_WIDTH, y + box_h],
            radius=12,
            fill=theme["highlight"],
            outline=theme.get("highlight_border", theme["bg_card_border"]),
            width=1,
        )
        # Left accent bar
        draw.rounded_rectangle(
            [PADDING, y, PADDING + 6, y + box_h],
            radius=3,
            fill=theme["stat_accent"],
        )
        font_highlight = _load_font("Medium", 26)
        _draw_text_block(
            draw, f'"{highlight}"',
            PADDING + 28, y + 22,
            font_highlight, theme["stat_accent"],
            SAFE_WIDTH - 48, 1.4,
            align=align
        )

    _draw_brand_handle(draw, handle, theme)
    _draw_slide_indicator(draw, slide_num, total, theme)
    return canvas.convert("RGB")


def render_key_stats_slide(slide: dict, bg_path: Path, handle: str, slide_num: int, total: int, theme: dict = None) -> Image.Image:
    if theme is None:
        theme = DEFAULT_THEME
    canvas = _composite_background(bg_path, theme)
    draw = ImageDraw.Draw(canvas)

    story_index = slide.get("story_index", 0)
    layout_style = (story_index + slide_num) % 3
    align = ["left", "center", "right"][layout_style]

    y = PADDING + 10

    # Title
    title = clean_text(slide.get("title", "By The Numbers"))
    font_title = _load_font("Bold", 46)
    y = _draw_text_block(draw, title, PADDING, y, font_title, theme["text_primary"], SAFE_WIDTH, align=align)
    y += 12
    y = _draw_divider(draw, PADDING, y, SAFE_WIDTH, theme)
    y += 30

    # Stats
    stats = slide.get("stats", [])
    font_stat_num = _load_font("Bold", 52)
    font_stat_text = _load_font("Regular", 26)

    for i, stat in enumerate(stats[:4]):
        if y > CANVAS_SIZE[1] - 180:
            break
        stat_clean = clean_text(str(stat))

        # Split on " — ", " -- ", or " - " for number vs label
        if " — " in stat_clean:
            num_part, label_part = stat_clean.split(" — ", 1)
        elif " -- " in stat_clean:
            num_part, label_part = stat_clean.split(" -- ", 1)
        elif " - " in stat_clean:
            num_part, label_part = stat_clean.split(" - ", 1)
        else:
            num_part = stat_clean
            label_part = ""

        num_part = num_part.strip()
        label_part = label_part.strip()

        # Measure the number part
        num_bbox = draw.textbbox((0, 0), num_part, font=font_stat_num)
        num_w = num_bbox[2] - num_bbox[0]
        num_h = num_bbox[3] - num_bbox[1]

        # Use side-by-side if number is reasonably short, otherwise stack
        use_side_by_side = (num_w < 260) and bool(label_part) and (align == "left")

        if use_side_by_side:
            # Wrap label within the remaining width
            label_x = PADDING + 280
            label_width = SAFE_WIDTH - 300
            label_lines = _text_wrap(label_part, font_stat_text, label_width)
            
            # Calculate heights
            dummy_bbox = draw.textbbox((0, 0), "Ag", font=font_stat_text)
            label_line_h = int((dummy_bbox[3] - dummy_bbox[1]) * 1.3)
            total_label_h = len(label_lines) * label_line_h
            
            row_h = max(num_h + 24, total_label_h + 24, 90)
            
            # Draw row background & shadow
            draw.rounded_rectangle([PADDING + 3, y + 3, PADDING + SAFE_WIDTH + 3, y + row_h + 3], radius=10, fill=(0, 0, 0, 30))
            draw.rounded_rectangle(
                [PADDING, y, PADDING + SAFE_WIDTH, y + row_h],
                radius=10, fill=theme["highlight"],
                outline=theme.get("bg_card_border", None),
                width=1 if theme.get("bg_card_border", None) else 0
            )
            
            # Draw bullet
            draw.ellipse([PADDING + 16, y + (row_h // 2) - 4, PADDING + 24, y + (row_h // 2) + 4], fill=theme["stat_accent"])
            
            # Draw number (vertically centered in row)
            num_y = y + (row_h - num_h) // 2 - 4
            draw.text((PADDING + 40, num_y), num_part, font=font_stat_num, fill=theme["stat_accent"])
            
            # Draw label lines (vertically centered in row)
            label_start_y = y + (row_h - total_label_h) // 2
            for j, line in enumerate(label_lines):
                draw.text((label_x, label_start_y + j * label_line_h), line, font=font_stat_text, fill=theme["text_secondary"])
        else:
            # Stacked layout (supports center and right alignment cleanly)
            num_lines = _text_wrap(num_part, font_stat_num, SAFE_WIDTH - 60)
            dummy_num_bbox = draw.textbbox((0, 0), "Ag", font=font_stat_num)
            num_line_h = int((dummy_num_bbox[3] - dummy_num_bbox[1]) * 1.15)
            total_num_h = len(num_lines) * num_line_h

            label_width = SAFE_WIDTH - 60
            label_lines = _text_wrap(label_part, font_stat_text, label_width) if label_part else []
            
            dummy_bbox = draw.textbbox((0, 0), "Ag", font=font_stat_text)
            label_line_h = int((dummy_bbox[3] - dummy_bbox[1]) * 1.3)
            total_label_h = len(label_lines) * label_line_h
            
            # Calculate height
            if label_part:
                row_h = total_num_h + total_label_h + 36
            else:
                row_h = total_num_h + 24
                
            row_h = max(row_h, 90)
            
            # Draw row background & shadow
            draw.rounded_rectangle([PADDING + 3, y + 3, PADDING + SAFE_WIDTH + 3, y + row_h + 3], radius=10, fill=(0, 0, 0, 30))
            draw.rounded_rectangle(
                [PADDING, y, PADDING + SAFE_WIDTH, y + row_h],
                radius=10, fill=theme["highlight"],
                outline=theme.get("bg_card_border", None),
                width=1 if theme.get("bg_card_border", None) else 0
            )
            
            # Bullet (only if left aligned)
            if align == "left":
                draw.ellipse([PADDING + 16, y + 24, PADDING + 24, y + 32], fill=theme["stat_accent"])
            
            # Number lines
            for j, line in enumerate(num_lines):
                line_bbox = draw.textbbox((0, 0), line, font=font_stat_num)
                line_w = line_bbox[2] - line_bbox[0]
                num_x = PADDING + 40
                if align == "center":
                    num_x = PADDING + (SAFE_WIDTH - line_w) // 2
                elif align == "right":
                    num_x = PADDING + SAFE_WIDTH - line_w - 40
                draw.text((num_x, y + 12 + j * num_line_h), line, font=font_stat_num, fill=theme["stat_accent"])
            
            # Label
            if label_part:
                label_start_y = y + total_num_h + 18
                for j, line in enumerate(label_lines):
                    line_bbox = draw.textbbox((0, 0), line, font=font_stat_text)
                    line_w = line_bbox[2] - line_bbox[0]
                    label_x = PADDING + 40
                    if align == "center":
                        label_x = PADDING + (SAFE_WIDTH - line_w) // 2
                    elif align == "right":
                        label_x = PADDING + SAFE_WIDTH - line_w - 40
                    draw.text((label_x, label_start_y + j * label_line_h), line, font=font_stat_text, fill=theme["text_secondary"])

        y += row_h + 14

    _draw_brand_handle(draw, handle, theme)
    _draw_slide_indicator(draw, slide_num, total, theme)
    return canvas.convert("RGB")

    _draw_brand_handle(draw, handle, theme)
    _draw_slide_indicator(draw, slide_num, total, theme)
    return canvas.convert("RGB")


def render_why_it_matters_slide(slide: dict, bg_path: Path, handle: str, slide_num: int, total: int, theme: dict = None) -> Image.Image:
    if theme is None:
        theme = DEFAULT_THEME
    canvas = _composite_background(bg_path, theme)
    draw = ImageDraw.Draw(canvas)

    story_index = slide.get("story_index", 0)
    layout_style = (story_index + slide_num) % 3
    align = ["left", "center", "right"][layout_style]

    y = PADDING + 10

    # Title
    title = clean_text(slide.get("title", "Why This Matters"))
    font_title = _load_font("Bold", 46)
    y = _draw_text_block(draw, title, PADDING, y, font_title, theme["text_primary"], SAFE_WIDTH, align=align)
    y += 12
    y = _draw_divider(draw, PADDING, y, SAFE_WIDTH, theme)
    y += 20

    # Body
    body = clean_text(slide.get("body", ""))
    font_body = _load_font("Regular", 30)
    y = _draw_text_block(draw, body, PADDING, y, font_body, theme["text_secondary"], SAFE_WIDTH, 1.55, align=align)
    y += 30

    # Future insight (premium card layout with drop shadow)
    future = clean_text(slide.get("future", ""))
    if future and y < CANVAS_SIZE[1] - 220:
        box_h = 120
        # Draw glassmorphism rounded card with drop shadow
        draw.rounded_rectangle(
            [PADDING + 4, y + 4, PADDING + SAFE_WIDTH + 4, y + box_h + 4],
            radius=12,
            fill=(0, 0, 0, 40) # drop shadow
        )
        draw.rounded_rectangle(
            [PADDING, y, PADDING + SAFE_WIDTH, y + box_h],
            radius=12,
            fill=theme["highlight"],
            outline=theme.get("highlight_border", theme["bg_card_border"]),
            width=1,
        )
        # Left accent bar
        draw.rounded_rectangle(
            [PADDING, y, PADDING + 6, y + box_h],
            radius=3,
            fill=theme["stat_accent"],
        )
        
        font_future = _load_font("Medium", 28)
        _draw_text_block(
            draw, f'"{future}"',
            PADDING + 28, y + 22,
            font_future, theme["stat_accent"],
            SAFE_WIDTH - 48, 1.4,
            align=align
        )

    _draw_brand_handle(draw, handle, theme)
    _draw_slide_indicator(draw, slide_num, total, theme)
    return canvas.convert("RGB")


def render_cta_slide(slide: dict, bg_path: Path, handle: str, slide_num: int, total: int, theme: dict = None) -> Image.Image:
    if theme is None:
        theme = DEFAULT_THEME
    canvas = _composite_background(bg_path, theme)
    draw = ImageDraw.Draw(canvas)

    # Center everything vertically
    center_x = CANVAS_SIZE[0] // 2
    y = PADDING + 80

    # Question
    question = clean_text(slide.get("question", "What do you think?"))
    font_q = _load_font("Bold", 46)
    lines = _text_wrap(question, font_q, SAFE_WIDTH)
    dummy_img = Image.new("RGB", (1, 1))
    dummy_draw = ImageDraw.Draw(dummy_img)
    bbox = dummy_draw.textbbox((0, 0), "Ag", font=font_q)
    lh = int((bbox[3] - bbox[1]) * 1.25)
    block_h = len(lines) * lh
    text_y = y
    for line in lines:
        bbox2 = dummy_draw.textbbox((0, 0), line, font=font_q)
        lw = bbox2[2] - bbox2[0]
        draw.text(((CANVAS_SIZE[0] - lw) // 2, text_y), line, font=font_q, fill=theme["text_primary"])
        text_y += lh

    y = text_y + 40

    # Divider
    div_w = 200
    draw.line([(center_x - div_w // 2, y), (center_x + div_w // 2, y)], fill=theme["divider"], width=2)
    y += 40

    # CTA text
    cta = clean_text(slide.get("cta", f"Follow {handle} for daily AI updates"))
    font_cta = _load_font("Medium", 30)
    cta_lines = _text_wrap(cta, font_cta, SAFE_WIDTH)
    bbox3 = dummy_draw.textbbox((0, 0), "Ag", font=font_cta)
    cta_lh = int((bbox3[3] - bbox3[1]) * 1.3)
    for line in cta_lines:
        bbox4 = dummy_draw.textbbox((0, 0), line, font=font_cta)
        lw = bbox4[2] - bbox4[0]
        draw.text(((CANVAS_SIZE[0] - lw) // 2, y), line, font=font_cta, fill=theme["text_secondary"])
        y += cta_lh

    y += 30

    # Tagline
    tagline = clean_text(slide.get("tagline", "Stay ahead of the AI curve"))
    font_tag = _load_font("Regular", 24)
    tag_lines = _text_wrap(tagline, font_tag, SAFE_WIDTH)
    bbox5 = dummy_draw.textbbox((0, 0), "Ag", font=font_tag)
    tag_lh = int((bbox5[3] - bbox5[1]) * 1.3)
    for line in tag_lines:
        bbox6 = dummy_draw.textbbox((0, 0), line, font=font_tag)
        lw = bbox6[2] - bbox6[0]
        draw.text(((CANVAS_SIZE[0] - lw) // 2, y), line, font=font_tag, fill=theme["text_accent"])
        y += tag_lh

    # Bottom handle (centered for CTA)
    font_handle = _load_font("Medium", 24)
    h_text = clean_text(handle)
    bbox_h = dummy_draw.textbbox((0, 0), h_text, font=font_handle)
    hw = bbox_h[2] - bbox_h[0]
    draw.text(
        ((CANVAS_SIZE[0] - hw) // 2, CANVAS_SIZE[1] - PADDING - 10),
        h_text, font=font_handle, fill=theme["text_accent"]
    )

    _draw_slide_indicator(draw, slide_num, total, theme)
    return canvas.convert("RGB")


# ─── Main Renderer ────────────────────────────────────────────────────────────

SLIDE_RENDERERS = {
    "hook": render_hook_slide,
    "what_happened": render_what_happened_slide,
    "key_stats": render_key_stats_slide,
    "why_it_matters": render_why_it_matters_slide,
    "cta": render_cta_slide,
}


class SlideRenderer:
    def __init__(self, instagram_handle: str = "@ainewsdaily"):
        self.handle = instagram_handle

    def render_carousel(
        self,
        story_index: int,
        slides: list[dict],
        bg_images: list[Path],
        output_dir: Path,
        theme_name: str = None,
    ) -> list[Path]:
        """
        Render all slides for a carousel. Returns list of final slide image paths.
        """
        total = len(slides)
        output_paths = []

        # Select a colorful theme automatically based on the story index
        if not theme_name:
            theme_keys = list(THEMES.keys())
            theme_name = theme_keys[story_index % len(theme_keys)]
        
        theme = THEMES.get(theme_name, DEFAULT_THEME)
        logger.info(f"Rendering carousel using theme: {theme_name}")

        from concurrent.futures import ThreadPoolExecutor

        def render_single_slide(args):
            i, orig_slide, bg_path = args
            slide = dict(orig_slide)
            slide_type = slide.get("type")
            
            # Map alternative keys or missing types
            if not slide_type or slide_type not in SLIDE_RENDERERS:
                types = ["hook", "what_happened", "key_stats", "why_it_matters", "cta"]
                slide_type = types[i % 5]
                slide["type"] = slide_type

            # If the slide has generic text and is missing layout keys, map them
            if "text" in slide:
                text_val = slide["text"]
                if slide_type == "hook":
                    if not slide.get("headline"):
                        slide["headline"] = text_val[:50] + "..." if len(text_val) > 50 else text_val
                    if not slide.get("subheadline"):
                        slide["subheadline"] = text_val
                    if not slide.get("label"):
                        slide["label"] = "MINDSET" if "motivation" in str(bg_path).lower() else "AI UPDATE"
                elif slide_type == "what_happened":
                    if not slide.get("title"):
                        slide["title"] = "The Hard Truth" if "motivation" in str(bg_path).lower() else "What Happened"
                    if not slide.get("body"):
                        slide["body"] = text_val
                    if not slide.get("highlight"):
                        slide["highlight"] = "Stay focused on the work." if "motivation" in str(bg_path).lower() else ""
                elif slide_type == "key_stats":
                    if not slide.get("title"):
                        slide["title"] = "Rules to Live By" if "motivation" in str(bg_path).lower() else "By The Numbers"
                    if not slide.get("stats"):
                        sentences = [s.strip() for s in text_val.replace(".", ".\n").split("\n") if len(s.strip()) > 5]
                        slide["stats"] = sentences if sentences else [text_val]
                elif slide_type == "why_it_matters":
                    if not slide.get("title"):
                        slide["title"] = "Why This Matters"
                    if not slide.get("body"):
                        slide["body"] = text_val
                    if not slide.get("future"):
                        slide["future"] = "Your future self will thank you." if "motivation" in str(bg_path).lower() else ""
                elif slide_type == "cta":
                    if not slide.get("question"):
                        slide["question"] = text_val[:100] + "?" if not text_val.endswith("?") else text_val
                    if not slide.get("cta"):
                        slide["cta"] = f"Follow {self.handle} for daily mindset" if "motivation" in str(bg_path).lower() else f"Follow {self.handle} for daily updates"
                    if not slide.get("tagline"):
                        slide["tagline"] = "Unleash your potential"

            slide_num = slide.get("slide_num", i + 1)
            slide["story_index"] = story_index
            output_path = output_dir / f"story_{story_index+1}_slide_{slide_num}_final.jpg"

            if output_path.exists():
                logger.info(f"Slide already rendered: {output_path.name}")
                return output_path

            logger.info(f"Rendering slide {slide_num}/{total} ({slide_type})")

            renderer = SLIDE_RENDERERS.get(slide_type, render_what_happened_slide)
            try:
                img = renderer(slide, bg_path, self.handle, slide_num, total, theme=theme)
                # Save as high-quality JPEG (Instagram accepts JPEG)
                img.save(output_path, "JPEG", quality=95, optimize=True)
                logger.info(f"Saved slide: {output_path.name}")
                return output_path
            except Exception as e:
                logger.error(f"Slide render failed for slide {slide_num}: {e}")
                # Emergency fallback
                fallback = Image.new("RGB", CANVAS_SIZE, (250, 247, 242))
                fallback.save(output_path, "JPEG", quality=95)
                return output_path

        # Run rendering jobs concurrently
        jobs = [(i, slide, bg_path) for i, (slide, bg_path) in enumerate(zip(slides, bg_images))]
        with ThreadPoolExecutor(max_workers=min(len(jobs), 5)) as executor:
            output_paths = list(executor.map(render_single_slide, jobs))

        return output_paths
