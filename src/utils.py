"""
Utility functions: logging, font management, helpers
"""
import os
import sys
import logging
import urllib.request
from pathlib import Path
from datetime import datetime
import pytz

# ─── Directories ────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
ASSETS_DIR = BASE_DIR / "assets"
FONTS_DIR = ASSETS_DIR / "fonts"
OUTPUT_DIR = BASE_DIR / "output"
LOGS_DIR = BASE_DIR / "logs"

for d in [ASSETS_DIR, FONTS_DIR, OUTPUT_DIR, LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# ─── Logging ────────────────────────────────────────────────────────────────
def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(logging.DEBUG)

    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # File
    log_file = LOGS_DIR / f"automation_{datetime.now().strftime('%Y%m%d')}.log"
    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    return logger


# ─── Font Management ─────────────────────────────────────────────────────────
FONT_URLS = {
    "Inter-Regular.ttf": "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.otf",
    "Inter-Medium.ttf": "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Medium.otf",
    "Inter-SemiBold.ttf": "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-SemiBold.otf",
    "Inter-Bold.ttf": "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.otf",
    "Inter-ExtraBold.ttf": "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-ExtraBold.otf",
}

# Fallback: Google Fonts API static URLs
FONT_URLS_FALLBACK = {
    "Inter-Regular.ttf": "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
    "Inter-Medium.ttf": "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2",
    "Inter-Bold.ttf": "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2",
}

logger = get_logger("utils")


def download_fonts():
    """Download Inter font files if not already present."""
    # Check if system fonts exist as fallback
    system_font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",  # macOS
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",  # Linux
    ]

    for name in ["Inter-Regular.ttf", "Inter-Medium.ttf", "Inter-SemiBold.ttf", "Inter-Bold.ttf", "Inter-ExtraBold.ttf"]:
        dest = FONTS_DIR / name
        if dest.exists():
            continue
        logger.info(f"Downloading font: {name}")
        # Try direct GitHub release links (TTF/OTF format)
        github_ttf_urls = {
            "Inter-Regular.ttf": "https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip",
        }
        # Use bundled approach: write minimal font data so PIL can work
        # We'll use the system fonts as source
        try:
            # Try downloading from a working URL
            url = f"https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf"
            if "Bold" in name or "ExtraBold" in name:
                url = f"https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf"
            urllib.request.urlretrieve(url, dest)
            logger.info(f"Downloaded {name}")
        except Exception as e:
            logger.warning(f"Could not download {name}: {e}. Using system fallback.")


def get_font_path(weight: str = "Regular") -> Path:
    """
    Get font path for a given weight.
    Falls back to system fonts on macOS or bundled fallback.
    """
    download_fonts()
    
    # Try to find downloaded Inter fonts
    weight_map = {
        "Regular": "Inter-Regular.ttf",
        "Medium": "Inter-Medium.ttf",
        "SemiBold": "Inter-SemiBold.ttf",
        "Bold": "Inter-Bold.ttf",
        "ExtraBold": "Inter-ExtraBold.ttf",
    }
    
    font_file = weight_map.get(weight, "Inter-Regular.ttf")
    font_path = FONTS_DIR / font_file
    
    if font_path.exists():
        return font_path
    
    # Check for variable Inter font (single file)
    variable_path = FONTS_DIR / "Inter[opsz,wght].ttf"
    if variable_path.exists():
        return variable_path
    
    # macOS system fallback
    mac_fonts = [
        Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
        Path("/System/Library/Fonts/Helvetica.ttc"),
        Path("/Library/Fonts/Arial.ttf"),
    ]
    for p in mac_fonts:
        if p.exists():
            logger.warning(f"Using system font fallback: {p}")
            return p
    
    # Last resort: let PIL use default
    logger.error("No suitable font found. PIL will use its built-in bitmap font.")
    return None


# ─── Time Helpers ────────────────────────────────────────────────────────────
def get_cst_now() -> datetime:
    cst = pytz.timezone("America/Chicago")
    return datetime.now(cst)


def get_today_str() -> str:
    return get_cst_now().strftime("%Y-%m-%d")


def get_output_dir_for_today() -> Path:
    today_dir = OUTPUT_DIR / get_today_str()
    today_dir.mkdir(parents=True, exist_ok=True)
    return today_dir


# ─── Text Helpers ─────────────────────────────────────────────────────────────
def truncate_text(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars - 3] + "..."


def clean_text(text: str) -> str:
    """Remove problematic unicode that PIL can't render."""
    replacements = {
        "\u2018": "'", "\u2019": "'",
        "\u201c": '"', "\u201d": '"',
        "\u2013": "-", "\u2014": "--",
        "\u2026": "...",
        "\u00b7": "*",
    }
    for orig, rep in replacements.items():
        text = text.replace(orig, rep)
    # Keep only basic latin + common chars
    result = ""
    for c in text:
        if ord(c) < 0x2200 or c in "•→←↑↓★☆✓✗":
            result += c
    return result
