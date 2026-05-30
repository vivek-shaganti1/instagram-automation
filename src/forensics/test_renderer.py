import os
import sys
import shutil
from pathlib import Path

# Adjust path to import src modules
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

from src.slide_renderer import SlideRenderer, THEMES
from src.video_generator import ReelGenerator

def test_rendering_engine():
    print("🎬 INITIATING RENDERING PIPELINE FORENSICS...")
    
    test_output_dir = BASE_DIR / "output" / "test_run"
    test_output_dir.mkdir(parents=True, exist_ok=True)
    
    # Check for fonts
    from src.utils import get_font_path
    font_path = get_font_path("Regular")
    if not font_path:
        print("❌ FONT AUDIT: No font found. PIL fallbacks active.")
    else:
        print(f"✅ FONT AUDIT: Font successfully resolved at: {font_path}")
        
    # Check for ffmpeg
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        print("❌ FFMPEG AUDIT: Ffmpeg binary NOT found on path!")
        return False
    else:
        print(f"✅ FFMPEG AUDIT: Ffmpeg found at: {ffmpeg_path}")

    # Build mock slide content
    mock_slides = [
        {
            "slide_num": 1,
            "type": "hook",
            "label": "AI FORENSICS",
            "headline": "Testing the bounds of rendering engine layout with a very long title string",
            "subheadline": "This subheadline should wrap correctly and not clip at 1080x1080 resolution.",
            "image_prompt": "abstract design"
        },
        {
            "slide_num": 2,
            "type": "what_happened",
            "title": "Severe Stress Test on What Happened Slide",
            "body": "This body text contains multiple lines to guarantee that it wraps and preserves layout margins correctly without running off the bottom margin safe limit.",
            "highlight": "Safety Margin Active",
            "image_prompt": "abstract design"
        }
    ]

    print("🖼️  Compositing mock slide images...")
    renderer = SlideRenderer(instagram_handle="@forensic_auditor")
    
    # Render slide using 'bloomberg_dark' theme
    try:
        bg_images = [None, None]
        rendered_slides = renderer.render_carousel(
            story_id=999,
            slides=mock_slides,
            bg_images=bg_images,
            output_dir=test_output_dir,
            theme_name="bloomberg_dark"
        )
        print(f"✅ SLIDE COMPOSITION: Successfully created {len(rendered_slides)} slides in {test_output_dir}")
        for slide in rendered_slides:
            if not slide.exists():
                print(f"❌ SLIDE ERROR: File {slide.name} not written to disk!")
                return False
    except Exception as e:
        print(f"❌ SLIDE ERROR: Exception during composition: {e}")
        return False

    print("🎬 Attempting FFmpeg reel compile...")
    video_gen = ReelGenerator()
    out_video = test_output_dir / "test_reel.mp4"
    
    try:
        success = video_gen.create_reel(
            slide_paths=rendered_slides,
            audio_path=Path("nonexistent.mp3"), # testing audio missing recovery
            output_path=out_video,
            theme_name="bloomberg_dark"
        )
        
        if success and out_video.exists():
            print(f"✅ VIDEO COMPILATION: Reel successfully rendered at: {out_video}")
            print(f"   Video File Size: {out_video.stat().st_size} bytes")
            return True
        else:
            print("❌ VIDEO COMPILATION: Failed to generate video or output missing.")
            return False
    except Exception as e:
        print(f"❌ VIDEO COMPILATION: Exception during FFmpeg execution: {e}")
        return False
    finally:
        # Cleanup
        if test_output_dir.exists():
            shutil.rmtree(test_output_dir)

if __name__ == "__main__":
    test_rendering_engine()
