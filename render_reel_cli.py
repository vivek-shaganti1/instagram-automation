#!/usr/bin/env python3
import sys
import json
import argparse
from pathlib import Path

# Adjust path to import src modules correctly
sys.path.append(str(Path(__file__).parent))

from src.image_generator import ImageGenerator
from src.slide_renderer import SlideRenderer
from src.video_generator import ReelGenerator
from src.utils import get_logger

logger = get_logger("render_reel_cli")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--script-json", required=True, help="JSON string or file path containing the script")
    parser.add_argument("--category", required=True, help="Category of the reel (ai, business, motivation)")
    parser.add_argument("--output", required=True, help="Path where the final MP4 video should be saved")
    parser.add_argument("--handle", default="@ai_signal_09", help="Instagram handle to overlay on the slides")
    parser.add_argument("--api-key", default="", help="Google Gemini API key for image generation")
    parser.add_argument("--theme", default="", help="Visual theme to use (neon_teal, sunset_glow, warm_peach, cyber_punk)")
    parser.add_argument("--story-index", type=int, default=-1, help="Unique index/ID for background image generation")
    args = parser.parse_args()

    try:
        # Load script JSON
        script_data = None
        if Path(args.script_json).exists():
            with open(args.script_json, "r", encoding="utf-8") as f:
                script_data = json.load(f)
        else:
            script_data = json.loads(args.script_json)

        if not script_data or "slides" not in script_data:
            print("ERROR: Invalid script JSON structure.")
            sys.exit(1)

        output_path = Path(args.output)
        output_dir = output_path.parent
        output_dir.mkdir(parents=True, exist_ok=True)

        slides = script_data["slides"]
        headline = slides[0].get("headline", "AI News")

        # 1. Generate background images
        print("Generating background images...")
        img_gen = ImageGenerator(api_key=args.api_key)  # Empty key so it gracefully falls back to beautiful gradients
        
        # Determine prefix for slide filenames based on category or custom story-index
        if args.story_index >= 0:
            story_index = args.story_index
        else:
            story_index = 0
            if args.category == "business":
                story_index = 1
            elif args.category == "motivation":
                story_index = 2

        bg_images = img_gen.generate_all_images(story_index, slides, headline, output_dir)

        # 2. Render final slide images with text overlays
        print("Rendering slide text overlays...")
        renderer = SlideRenderer(instagram_handle=args.handle)
        
        # Select theme based on category or args.theme
        if args.theme:
            theme = args.theme
        else:
            theme_map = {
                "ai": "bloomberg_dark",
                "business": "startup_editorial",
                "motivation": "midnight_strategy"
            }
            theme = theme_map.get(args.category, "neon_teal")
        
        final_slides = renderer.render_carousel(story_index, slides, bg_images, output_dir, theme_name=theme)

        # 3. Compile slide images + audio track into a vertical video
        print("Compiling slides into vertical video Reel...")
        video_gen = ReelGenerator()
        
        audio_dir = Path(__file__).parent / "assets"
        category_audio = audio_dir / f"song_{args.category}.mp3"
        if category_audio.exists():
            audio_track = category_audio
            print(f"Using category-specific audio track: {audio_track.name}")
        else:
            audio_track = audio_dir / "song.mp3"
            print(f"Using fallback audio track: {audio_track.name}")
        
        success = video_gen.create_reel(
            slide_paths=final_slides,
            audio_path=audio_track,
            output_path=output_path,
            theme_name=theme,
        )

        if success and output_path.exists():
            print("RENDER_SUCCESS")
            sys.exit(0)
        else:
            print("RENDER_FAILED")
            sys.exit(1)

    except Exception as e:
        print(f"RENDER_ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(2)

if __name__ == "__main__":
    main()
