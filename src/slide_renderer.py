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

# ─── Design Constants ─────────────────────────────────────────────────────────
CANVAS_SIZE = (1080, 1080)
PADDING = 80
SAFE_WIDTH = CANVAS_SIZE[0] - (PADDING * 2)

# Default theme (classic Attio off-white style)
DEFAULT_THEME = {
    "bg_gradient": ((250, 247, 242), (245, 240, 230)), # Warm off-white
    "bg_card": (255, 255, 255, 255),
    "bg_card_border": (220, 214, 204, 255),
    "text_primary": (26, 26, 26, 255),    # Near-black
    "text_secondary": (90, 85, 78, 255),  # Warm gray
    "text_accent": (130, 120, 108, 255),  # Muted warm
    "label_bg": (240, 236, 229, 255),     # Beige tag background
    "label_text": (60, 54, 46, 255),      # Dark warm label text
    "divider": (220, 214, 204, 255),      # Subtle divider
    "highlight": (248, 245, 240, 180),    # Row/card highlight bg
    "highlight_border": (210, 203, 191, 255),
    "stat_accent": (45, 38, 28, 255),     # Deep warm brown for stats
    "white": (255, 255, 255, 255),
}

# Premium, vibrant gradient color systems
THEMES = {
    "neon_teal": {
        "bg_gradient": ((10, 25, 47), (23, 42, 69)),  # Dark space blue
        "bg_card": (255, 255, 255, 25),              # Glassmorphism
        "bg_card_border": (255, 255, 255, 40),
        "text_primary": (255, 255, 255, 255),
        "text_secondary": (195, 218, 242, 255),
        "text_accent": (136, 177, 222, 255),
        "label_bg": (27, 73, 101, 200),
        "label_text": (100, 255, 218, 255),           # Neon cyan
        "divider": (255, 255, 255, 40),
        "highlight": (255, 255, 255, 15),
        "highlight_border": (100, 255, 218, 100),
        "stat_accent": (100, 255, 218, 255),          # Neon cyan stats
        "white": (255, 255, 255, 255),
    },
    "sunset_glow": {
        "bg_gradient": ((44, 10, 80), (100, 15, 120)), # Deep purple/magenta
        "bg_card": (255, 255, 255, 30),
        "bg_card_border": (255, 255, 255, 50),
        "text_primary": (255, 255, 255, 255),
        "text_secondary": (245, 220, 255, 255),
        "text_accent": (210, 175, 245, 255),
        "label_bg": (142, 45, 226, 200),
        "label_text": (255, 105, 180, 255),           # Neon hot pink label
        "divider": (255, 255, 255, 50),
        "highlight": (255, 255, 255, 20),
        "highlight_border": (255, 105, 180, 100),
        "stat_accent": (255, 105, 180, 255),          # Neon hot pink stats
        "white": (255, 255, 255, 255),
    },
    "warm_peach": {
        "bg_gradient": ((120, 20, 40), (180, 40, 60)), # Deep crimson/warm rose
        "bg_card": (255, 255, 255, 35),
        "bg_card_border": (255, 255, 255, 55),
        "text_primary": (255, 255, 255, 255),
        "text_secondary": (255, 215, 225, 255),
        "text_accent": (255, 180, 195, 255),
        "label_bg": (220, 40, 80, 200),
        "label_text": (255, 193, 7, 255),             # Warm amber/yellow
        "divider": (255, 255, 255, 55),
        "highlight": (255, 255, 255, 25),
        "highlight_border": (255, 193, 7, 100),
        "stat_accent": (255, 193, 7, 255),            # Warm gold stats
        "white": (255, 255, 255, 255),
    },
    "cyber_punk": {
        "bg_gradient": ((5, 5, 15), (20, 10, 45)),     # Cyber dark violet
        "bg_card": (255, 255, 255, 22),
        "bg_card_border": (255, 255, 255, 45),
        "text_primary": (255, 255, 255, 255),
        "text_secondary": (220, 210, 245, 255),
        "text_accent": (175, 150, 230, 255),
        "label_bg": (60, 20, 110, 200),
        "label_text": (245, 0, 87, 255),              # Magenta tag text
        "divider": (255, 255, 255, 45),
        "highlight": (255, 255, 255, 15),
        "highlight_border": (245, 0, 87, 100),
        "stat_accent": (245, 0, 87, 255),              # Bright magenta stats
        "white": (255, 255, 255, 255),
    }
}

SLIDE_OVERLAY_ALPHA = 200  # Transparency for bg image overlay (0=transparent, 255=opaque)


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
) -> int:
    """Draw wrapped text block. Returns the y position after the last line."""
    lines = _text_wrap(clean_text(text), font, max_width)
    dummy_img = Image.new("RGB", (1, 1))
    dummy_draw = ImageDraw.Draw(dummy_img)
    bbox = dummy_draw.textbbox((0, 0), "Ag", font=font)
    line_height = int((bbox[3] - bbox[1]) * line_spacing)

    for line in lines:
        draw.text((x, y), line, font=font, fill=color)
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


def _draw_label(draw: ImageDraw.Draw, text: str, x: int, y: int, theme: dict) -> int:
    """Draw a styled label tag. Returns the y after label."""
    font = _load_font("Medium", 22)
    text = clean_text(text.upper())
    dummy_img = Image.new("RGB", (1, 1))
    dummy_draw = ImageDraw.Draw(dummy_img)
    bbox = dummy_draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x, pad_y = 16, 8

    # Label pill
    draw.rounded_rectangle(
        [x, y, x + tw + pad_x * 2, y + th + pad_y * 2],
        radius=6,
        fill=theme["label_bg"],
        outline=theme.get("bg_card_border", None),
        width=1 if theme.get("bg_card_border", None) else 0
    )
    draw.text((x + pad_x, y + pad_y), text, font=font, fill=theme["label_text"])
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

    y = PADDING + 20

    # Label tag
    label = slide.get("label", "AI UPDATE")
    y = _draw_label(draw, label, PADDING, y, theme)
    y += 24

    # Main headline — auto-shrink font size for long headlines
    headline = clean_text(slide.get("headline", ""))
    # Truncate very long headlines
    if len(headline) > 80:
        headline = headline[:77] + "..."

    # Auto-size: start at 76px, shrink until text fits in 4 lines max
    for font_size in [76, 64, 52, 44]:
        font_headline = _load_font("Bold", font_size)
        lines = _text_wrap(headline, font_headline, SAFE_WIDTH)
        if len(lines) <= 4:
            break

    dummy_img = Image.new("RGB", (1, 1))
    dummy_draw = ImageDraw.Draw(dummy_img)
    bbox_h = dummy_draw.textbbox((0, 0), "Ag", font=font_headline)
    line_h = int((bbox_h[3] - bbox_h[1]) * 1.15)
    for line in lines:
        draw.text((PADDING, y), line, font=font_headline, fill=theme["text_primary"])
        y += line_h
    y += 22

    # Thin accent divider line
    draw.line([(PADDING, y), (PADDING + 100, y)], fill=theme["stat_accent"], width=3)
    y += 24

    # Subheadline
    sub = clean_text(slide.get("subheadline", ""))
    if sub:
        font_sub = _load_font("Regular", 32)
        y = _draw_text_block(draw, sub, PADDING, y, font_sub, theme["text_secondary"], SAFE_WIDTH, 1.4)
        y += 20

    # Decorative accent: small geometric element instead of emoji
    accent_size = 10
    draw.ellipse(
        [PADDING, y, PADDING + accent_size, y + accent_size],
        fill=theme["stat_accent"]
    )
    draw.ellipse(
        [PADDING + 18, y, PADDING + 18 + accent_size, y + accent_size],
        fill=(*theme["stat_accent"][:3], 150)
    )
    draw.ellipse(
        [PADDING + 36, y, PADDING + 36 + accent_size, y + accent_size],
        fill=(*theme["stat_accent"][:3], 60)
    )

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

    y = PADDING + 10

    # Title
    title = clean_text(slide.get("title", "What Happened"))
    font_title = _load_font("Bold", 46)
    y = _draw_text_block(draw, title, PADDING, y, font_title, theme["text_primary"], SAFE_WIDTH, 1.2)
    y += 12
    y = _draw_divider(draw, PADDING, y, SAFE_WIDTH, theme)
    y += 20

    # Body text
    body = clean_text(slide.get("body", ""))
    font_body = _load_font("Regular", 30)
    y = _draw_text_block(draw, body, PADDING, y, font_body, theme["text_secondary"], SAFE_WIDTH, 1.55)
    y += 30

    # Highlighted quote box
    highlight = clean_text(slide.get("highlight", ""))
    if highlight and y < CANVAS_SIZE[1] - 220:
        box_h = 110
        draw.rounded_rectangle(
            [PADDING, y, PADDING + SAFE_WIDTH, y + box_h],
            radius=12,
            fill=theme["highlight"],
            outline=theme.get("highlight_border", theme["bg_card_border"]),
            width=1,
        )
        # Left accent bar
        draw.rounded_rectangle(
            [PADDING, y, PADDING + 4, y + box_h],
            radius=2,
            fill=theme["stat_accent"],
        )
        font_highlight = _load_font("Medium", 26)
        _draw_text_block(
            draw, f'"{highlight}"',
            PADDING + 24, y + 22,
            font_highlight, theme["stat_accent"],
            SAFE_WIDTH - 40, 1.4
        )

    _draw_brand_handle(draw, handle, theme)
    _draw_slide_indicator(draw, slide_num, total, theme)
    return canvas.convert("RGB")


def render_key_stats_slide(slide: dict, bg_path: Path, handle: str, slide_num: int, total: int, theme: dict = None) -> Image.Image:
    if theme is None:
        theme = DEFAULT_THEME
    canvas = _composite_background(bg_path, theme)
    draw = ImageDraw.Draw(canvas)

    y = PADDING + 10

    # Title
    title = clean_text(slide.get("title", "By The Numbers"))
    font_title = _load_font("Bold", 46)
    y = _draw_text_block(draw, title, PADDING, y, font_title, theme["text_primary"], SAFE_WIDTH)
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
        use_side_by_side = (num_w < 260) and bool(label_part)

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
            
            # Draw row background
            row_bg = theme["highlight"]
            draw.rounded_rectangle(
                [PADDING, y, PADDING + SAFE_WIDTH, y + row_h],
                radius=10, fill=row_bg,
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
            # Stacked layout (e.g. if the stat is just a sentence or a very long number)
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
            
            # Draw row background
            row_bg = theme["highlight"]
            draw.rounded_rectangle(
                [PADDING, y, PADDING + SAFE_WIDTH, y + row_h],
                radius=10, fill=row_bg,
                outline=theme.get("bg_card_border", None),
                width=1 if theme.get("bg_card_border", None) else 0
            )
            
            # Bullet
            draw.ellipse([PADDING + 16, y + 24, PADDING + 24, y + 32], fill=theme["stat_accent"])
            
            # Number lines
            for j, line in enumerate(num_lines):
                draw.text((PADDING + 40, y + 12 + j * num_line_h), line, font=font_stat_num, fill=theme["stat_accent"])
            
            # Label
            if label_part:
                label_start_y = y + total_num_h + 18
                for j, line in enumerate(label_lines):
                    draw.text((PADDING + 40, label_start_y + j * label_line_h), line, font=font_stat_text, fill=theme["text_secondary"])

        y += row_h + 14

    _draw_brand_handle(draw, handle, theme)
    _draw_slide_indicator(draw, slide_num, total, theme)
    return canvas.convert("RGB")


def render_why_it_matters_slide(slide: dict, bg_path: Path, handle: str, slide_num: int, total: int, theme: dict = None) -> Image.Image:
    if theme is None:
        theme = DEFAULT_THEME
    canvas = _composite_background(bg_path, theme)
    draw = ImageDraw.Draw(canvas)

    y = PADDING + 10

    # Title
    title = clean_text(slide.get("title", "Why This Matters"))
    font_title = _load_font("Bold", 46)
    y = _draw_text_block(draw, title, PADDING, y, font_title, theme["text_primary"], SAFE_WIDTH)
    y += 12
    y = _draw_divider(draw, PADDING, y, SAFE_WIDTH, theme)
    y += 20

    # Body
    body = clean_text(slide.get("body", ""))
    font_body = _load_font("Regular", 30)
    y = _draw_text_block(draw, body, PADDING, y, font_body, theme["text_secondary"], SAFE_WIDTH, 1.55)
    y += 30

    # Future insight
    future = clean_text(slide.get("future", ""))
    if future and y < CANVAS_SIZE[1] - 200:
        font_future = _load_font("Medium", 28)
        label_y = y
        _draw_label(draw, "The Future", PADDING, label_y, theme)
        y += 50
        y = _draw_text_block(draw, future, PADDING, y, font_future, theme["text_primary"], SAFE_WIDTH, 1.4)

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

        for i, (slide, bg_path) in enumerate(zip(slides, bg_images)):
            slide_type = slide.get("type", "hook")
            slide_num = slide.get("slide_num", i + 1)

            output_path = output_dir / f"story_{story_index+1}_slide_{slide_num}_final.jpg"

            logger.info(f"Rendering slide {slide_num}/{total} ({slide_type})")

            renderer = SLIDE_RENDERERS.get(slide_type, render_what_happened_slide)
            try:
                img = renderer(slide, bg_path, self.handle, slide_num, total, theme=theme)
                # Save as high-quality JPEG (Instagram accepts JPEG)
                img.save(output_path, "JPEG", quality=95, optimize=True)
                logger.info(f"Saved slide: {output_path.name}")
                output_paths.append(output_path)
            except Exception as e:
                logger.error(f"Slide render failed for slide {slide_num}: {e}")
                # Emergency fallback
                fallback = Image.new("RGB", CANVAS_SIZE, (250, 247, 242))
                fallback.save(output_path, "JPEG", quality=95)
                output_paths.append(output_path)

        return output_paths
