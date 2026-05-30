"""
Image generator: uses Google Imagen 3 via the new google-genai SDK
to generate background images for each slide.
"""
import time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import io

from src.utils import get_logger

logger = get_logger("image_generator")


class ImageGenerator:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = None

    def _get_client(self):
        """Lazy-load the genai client."""
        if self._client is None:
            try:
                from google import genai
                if not self.api_key:
                    raise ValueError("No API key provided")
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"google-genai initialization failed ({e}), falling back to gradient backgrounds")
                self._client = "fallback"
        return self._client

    def _build_image_prompt(self, slide_type: str, story_headline: str, slide_prompt: str) -> str:
        """
        Build a detailed prompt for Imagen 3 that generates
        light, minimal, on-brand backgrounds (Attio-inspired).
        """
        style_base = (
            "Minimalist abstract background image, warm cream and off-white tones, "
            "subtle texture, clean and airy, premium editorial aesthetic, "
            "light warm beige, soft shadows, no text, no people, "
            "inspired by high-end tech company websites, "
            "photorealistic with painterly abstract elements, "
            "NOT blue, NOT dark, NOT neon, NOT generic corporate"
        )

        type_context = {
            "hook": f"Bold abstract composition, strong visual impact, geometric shapes, warm pastels, theme: {story_headline[:40]}",
            "what_happened": "Flowing abstract shapes, soft gradients, informational calm mood, cream and sand tones",
            "key_stats": "Clean grid-like abstract, subtle mathematical patterns, warm neutral palette, data visualization aesthetic",
            "why_it_matters": "Expansive horizon abstract, depth and perspective, warm morning light aesthetic",
            "cta": "Inviting warm abstract, rounded organic shapes, gentle invitation mood, cream and rose-beige",
        }

        context = type_context.get(slide_type, "Clean abstract minimal background")
        custom = slide_prompt or ""

        return f"{style_base}. {context}. {custom}. Square format 1:1 aspect ratio."

    def generate_slide_image(
        self,
        story_index: int,
        slide: dict,
        story_headline: str,
        output_dir: Path,
    ) -> Path:
        """
        Generate an image for a single slide using Imagen 3.
        Returns the path to the saved image.
        """
        slide_num = slide.get("slide_num", 1)
        slide_type = slide.get("type", "hook")
        slide_prompt = slide.get("image_prompt", "")

        output_path = output_dir / f"story_{story_index+1}_slide_{slide_num}_bg.png"

        if output_path.exists():
            logger.info(f"Image already exists: {output_path.name}")
            return output_path

        prompt = self._build_image_prompt(slide_type, story_headline, slide_prompt)
        logger.info(f"Generating image for story {story_index+1}, slide {slide_num} ({slide_type})")

        client = self._get_client()
        if client == "fallback":
            return self._generate_gradient_fallback(slide_type, output_path)

        try:
            from google.genai import types as genai_types

            response = client.models.generate_images(
                model="imagen-4.0-generate-001",
                prompt=prompt,
                config=genai_types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="1:1",
                    output_mime_type="image/png",
                    person_generation="dont_allow",
                ),
            )

            if response.generated_images:
                img_data = response.generated_images[0].image.image_bytes
                img = Image.open(io.BytesIO(img_data)).convert("RGBA")
                img = img.resize((1080, 1080), Image.LANCZOS)
                img.save(output_path, "PNG")
                logger.info(f"Imagen 3 image saved: {output_path.name}")
                return output_path
            else:
                logger.warning("Imagen 3 returned no images")

        except Exception as e:
            logger.warning(f"Imagen 3 generation failed: {e}. Using gradient fallback.")

        return self._generate_gradient_fallback(slide_type, output_path)

    def _generate_gradient_fallback(self, slide_type: str, output_path: Path) -> Path:
        """Generate a beautiful gradient background as fallback."""
        import math

        # Attio-inspired color palettes per slide type
        palettes = {
            "hook":          [(250, 247, 242), (238, 232, 220), (225, 217, 202)],
            "what_happened": [(252, 250, 247), (243, 238, 230), (232, 226, 215)],
            "key_stats":     [(248, 245, 240), (236, 231, 222), (222, 215, 203)],
            "why_it_matters":[(250, 248, 244), (241, 236, 227), (228, 222, 210)],
            "cta":           [(252, 249, 245), (243, 239, 231), (231, 225, 214)],
        }

        colors = palettes.get(slide_type, palettes["hook"])
        img = Image.new("RGBA", (1080, 1080), colors[0])
        draw = ImageDraw.Draw(img)

        # Radial gradient from center
        cx, cy = 540, 540
        for r in range(700, 0, -3):
            t = r / 700.0
            if t < 0.5:
                col = tuple(int(colors[0][i] + (colors[1][i] - colors[0][i]) * (t * 2)) for i in range(3)) + (255,)
            else:
                col = tuple(int(colors[1][i] + (colors[2][i] - colors[1][i]) * ((t - 0.5) * 2)) for i in range(3)) + (255,)
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)

        # Subtle grid lines (Attio.com style)
        grid_color = (190, 183, 171, 50)
        for x in range(0, 1080, 80):
            draw.line([(x, 0), (x, 1080)], fill=grid_color, width=1)
        for y in range(0, 1080, 80):
            draw.line([(0, y), (1080, y)], fill=grid_color, width=1)

        # Soft diagonal accent line
        draw.line([(0, 400), (400, 0)], fill=(180, 172, 160, 40), width=1)
        draw.line([(680, 1080), (1080, 680)], fill=(180, 172, 160, 40), width=1)

        # Gentle blur for smoothness
        img = img.filter(ImageFilter.GaussianBlur(radius=1.5))
        img.save(output_path, "PNG")
        return output_path

    def generate_all_images(
        self,
        story_index: int,
        slides: list[dict],
        story_headline: str,
        output_dir: Path,
    ) -> list[Path]:
        """Generate images for all slides of a story."""
        image_paths = []
        for slide in slides:
            path = self.generate_slide_image(story_index, slide, story_headline, output_dir)
            image_paths.append(path)
            time.sleep(3)  # Rate limit protection for Imagen 3
        return image_paths
