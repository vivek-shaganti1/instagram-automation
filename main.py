#!/usr/bin/env python3
"""
Main orchestrator for Instagram AI News Automation.

Usage:
    python main.py                    # Full run (research + generate + post)
    python main.py --dry-run          # Research + generate only (no posting)
    python main.py --test-post        # Post 1 carousel as a test
    python main.py --research-only    # Only show top stories
    python main.py --generate-only    # Only generate slides (no posting)
"""
import os
import sys
import json
import time
import argparse
from pathlib import Path
from datetime import datetime

# Load .env before imports
from dotenv import load_dotenv
load_dotenv()

from src.utils import get_logger, get_output_dir_for_today, get_today_str, get_cst_now, BASE_DIR
from src.researcher import NewsResearcher
from src.content_generator import ContentGenerator
from src.image_generator import ImageGenerator
from src.slide_renderer import SlideRenderer
from src.instagram_uploader import InstagramUploader
from src.video_generator import ReelGenerator
from src.analytics import PostTracker

logger = get_logger("main")


def load_config() -> dict:
    """Load and validate configuration from environment."""
    required = ["GOOGLE_AI_API_KEY", "INSTAGRAM_USERNAME", "INSTAGRAM_PASSWORD"]
    for key in required:
        if not os.getenv(key):
            logger.error(f"Missing required env var: {key}")
            logger.error("Please copy .env.example to .env and fill in your credentials.")
            sys.exit(1)

    return {
        "api_key": os.getenv("GOOGLE_AI_API_KEY"),
        "ig_username": os.getenv("INSTAGRAM_USERNAME"),
        "ig_password": os.getenv("INSTAGRAM_PASSWORD"),
        "ig_handle": os.getenv("INSTAGRAM_HANDLE", f"@{os.getenv('INSTAGRAM_USERNAME', 'ainewsdaily')}"),
        "posts_per_day": int(os.getenv("POSTS_PER_DAY", "5")),
        "slides_per_post": int(os.getenv("SLIDES_PER_POST", "5")),
        "post_delay": int(os.getenv("POST_DELAY_SECONDS", "45")),
        "lookback_hours": int(os.getenv("NEWS_LOOKBACK_HOURS", "24")),
    }


def save_run_data(data: dict, output_dir: Path):
    """Save run data as JSON for debugging/replay."""
    run_file = output_dir / "run_data.json"
    with open(run_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    logger.info(f"Run data saved to: {run_file}")


def run_automation(
    config: dict,
    dry_run: bool = False,
    test_post: bool = False,
    n_posts: int = None,
    run_mode: str = "auto",
    story_index: int = 0,
):
    """
    Main automation pipeline.
    
    dry_run: Skip posting (generate only)
    test_post: Post only 1 carousel/reel as a test
    run_mode: 'auto', 'morning', 'afternoon', 'evening'
    """
    start_time = datetime.now()
    output_dir = get_output_dir_for_today()

    # 1. Determine current run mode
    cst_now = get_cst_now()
    current_hour = cst_now.hour

    if run_mode == "auto":
        if current_hour < 10:
            active_mode = "morning"
        elif current_hour < 15:
            active_mode = "afternoon"
        else:
            active_mode = "evening"
    else:
        active_mode = run_mode

    # Map run mode to specific theme, format, and content category
    mode_config = {
        "morning": {"theme": "neon_teal", "format": "reel", "category": "ai"},
        "afternoon": {"theme": "sunset_glow", "format": "reel", "category": "business"},
        "evening": {"theme": "cyber_punk", "format": "reel", "category": "motivation"},
    }
    
    active_cfg = mode_config.get(active_mode, mode_config["morning"])
    active_theme = active_cfg["theme"]
    active_format = active_cfg["format"]

    # ─── Load Analytics & Adjust Strategy ─────────────────────────────────────
    tracker = PostTracker()
    analytics_data = tracker.get_latest_analytics()
    use_aggressive = analytics_data.get("settings", {}).get("aggressive_hooks", False)
    winning_hooks = analytics_data.get("settings", {}).get("winning_hooks", [])
    losing_hooks = analytics_data.get("settings", {}).get("losing_hooks", [])
    
    # Auto-adjust theme to the best performing one if it is from the same category
    best_theme = analytics_data.get("settings", {}).get("best_theme", active_theme)
    if active_mode == "morning" and best_theme in ["neon_teal", "cyber_punk"]:
        active_theme = best_theme
    elif active_mode == "afternoon" and best_theme in ["warm_peach", "sunset_glow"]:
        active_theme = best_theme
    
    logger.info("=" * 60)
    logger.info("🤖 Instagram AI News Automation Starting")
    logger.info(f"Date: {get_today_str()}")
    logger.info(f"CST Time: {cst_now.strftime('%H:%M:%S')} (Hour: {current_hour})")
    logger.info(f"Active Mode: {active_mode.upper()}")
    logger.info(f"Theme: {active_theme.upper()}")
    logger.info(f"Format: {active_format.upper()}")
    logger.info(f"Aggressive Hooks: {'ENABLED 🚨' if use_aggressive else 'DISABLED 🛡️'}")
    logger.info(f"Execution Type: {'DRY RUN' if dry_run else 'TEST' if test_post else 'LIVE'}")
    logger.info("=" * 60)

    # ─── Step 1 & 2: Generate Content ─────────────────────────────────────────
    content_gen = ContentGenerator(
        gemini_api_key=config["api_key"],
        instagram_handle=config["ig_handle"],
    )

    category = active_cfg["category"]
    headline_for_images = "AI News"
    story_index_prefix = story_index

    if category == "ai":
        logger.info("\n📰 STEP 1: Researching top AI news...")
        researcher = NewsResearcher(
            gemini_api_key=config["api_key"],
            lookback_hours=config["lookback_hours"],
        )
        stories = researcher.research(n_stories=5)
        if not stories or len(stories) <= story_index:
            logger.error(f"No AI story at index {story_index} found! Aborting.")
            return
        story = stories[story_index]
        headline_for_images = story.get("headline", "AI News")
        logger.info(f"Selected AI story: {headline_for_images}")

        logger.info("\n✍️  STEP 2: Generating AI news content...")
        carousel_content = content_gen.generate_carousel_content(
            story,
            aggressive_hooks=use_aggressive,
            winning_hooks=winning_hooks,
            losing_hooks=losing_hooks
        )
        story_index_prefix = story_index
    elif category == "business":
        logger.info("\n✍️  STEP 1 & 2: Generating Business & Money content...")
        carousel_content = content_gen.generate_business_content(aggressive_hooks=use_aggressive)
        headline_for_images = carousel_content["slides"][0].get("headline", "Business Idea")
        story_index_prefix = 10 + story_index
    else:  # motivation
        logger.info("\n✍️  STEP 1 & 2: Generating Motivation & Story content...")
        carousel_content = content_gen.generate_motivation_content(aggressive_hooks=use_aggressive)
        headline_for_images = carousel_content["slides"][0].get("headline", "Motivation")
        story_index_prefix = 20 + story_index

    # ─── Step 3: Generate Images ──────────────────────────────────────────────
    logger.info("\n🎨 STEP 3: Generating background images with Imagen 3...")
    img_gen = ImageGenerator(api_key=config["api_key"])
    
    slides = carousel_content.get("slides", [])
    bg_images = img_gen.generate_all_images(story_index_prefix, slides, headline_for_images, output_dir)

    # ─── Step 4: Render Slides ────────────────────────────────────────────────
    logger.info("\n🖼️  STEP 4: Rendering final slides...")
    renderer = SlideRenderer(instagram_handle=config["ig_handle"])
    
    # Render with the selected colorful theme
    final_slides = renderer.render_carousel(story_index_prefix, slides, bg_images, output_dir, theme_name=active_theme)
    caption = carousel_content.get("caption", "")

    # Save run data
    save_run_data({"mode": active_mode, "format": active_format, "theme": active_theme, "category": category}, output_dir)

    # ─── Step 5: Format Check & Video Compile (For Reels) ─────────────────────
    video_reel_path = None
    if active_format == "reel":
        logger.info("\n🎬 STEP 4.5: Compiling slides into vertical video Reel...")
        video_gen = ReelGenerator()
        video_reel_path = output_dir / f"story_{story_index_prefix+1}_reel.mp4"
        audio_track = BASE_DIR / "assets" / "song.mp3"
        
        success = video_gen.create_reel(
            slide_paths=final_slides,
            audio_path=audio_track,
            output_path=video_reel_path,
            theme_name=active_theme,
        )
        if not success or not video_reel_path.exists():
            logger.error("Failed to generate Reel! Falling back to standard carousel.")
            active_format = "carousel"

    # ─── Step 6: Upload to Instagram ─────────────────────────────────────────
    if dry_run:
        logger.info("\n🔇 DRY RUN: Skipping Instagram upload")
        logger.info(f"Assets generated successfully in: {output_dir}")
        return

    logger.info("\n📱 STEP 5: Uploading to Instagram...")
    uploader = InstagramUploader(
        username=config["ig_username"],
        password=config["ig_password"],
    )

    upload_success = uploader.post_reel(
        video_path=video_reel_path,
        caption=caption,
    ) if active_format == "reel" else uploader.post_carousel(
        image_paths=final_slides,
        caption=caption,
        story_index=story_index_prefix,
    )

    # ─── Update Analytics & Growth Loop ───────────────────────────────────────
    if upload_success:
        try:
            logger.info("Updating post analytics...")
            post_tracker = PostTracker(uploader=uploader)
            post_tracker.update_metrics_from_instagram()
        except Exception as e:
            logger.error(f"Failed to auto-update metrics post-upload: {e}")

    # ─── Summary ──────────────────────────────────────────────────────────────
    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info("\n" + "=" * 60)
    logger.info("🎉 AUTOMATION COMPLETE")
    logger.info(f"Time elapsed: {elapsed:.0f}s ({elapsed/60:.1f} min)")
    logger.info(f"Upload status: {'SUCCESS' if upload_success else 'FAILED'}")
    logger.info("=" * 60)


def _print_summary(posts: list[dict], dry_run: bool = False, results: dict = None):
    """Print a human-readable summary."""
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    for i, p in enumerate(posts):
        status = ""
        if results:
            status = "✅" if (i + 1) in results.get("success", []) else "❌"
        elif dry_run:
            status = "💾"
        print(f"{status} Post {i+1}: {p['headline'][:60]}")
        print(f"   Slides: {len(p['images'])}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Instagram AI News Automation")
    parser.add_argument("--dry-run", action="store_true", help="Generate only, don't post")
    parser.add_argument("--test-post", action="store_true", help="Post 1 carousel/reel as test")
    parser.add_argument("--research-only", action="store_true", help="Only show top stories")
    parser.add_argument("--generate-only", action="store_true", help="Generate slides but don't post")
    parser.add_argument("--mode", type=str, choices=["auto", "morning", "afternoon", "evening"], default="auto", help="Override schedule run mode")
    parser.add_argument("--n", type=int, help="Override number of posts", default=None)
    parser.add_argument("--story-index", type=int, default=0, help="Index of the researched story to use (0-4)")
    args = parser.parse_args()

    config = load_config()

    if args.research_only:
        researcher = NewsResearcher(
            gemini_api_key=config["api_key"],
            lookback_hours=config["lookback_hours"],
        )
        stories = researcher.research(n_stories=config["posts_per_day"])
        print(f"\n{'='*60}")
        print(f"TOP {len(stories)} AI STORIES TODAY")
        print(f"{'='*60}")
        for i, s in enumerate(stories):
            print(f"\n{i+1}. {s.get('headline', 'Unknown')}")
            print(f"   Source: {s.get('source', 'Unknown')}")
            print(f"   Hook: {s.get('hook', '')[:100]}...")
        return

    dry_run = args.dry_run or args.generate_only
    run_automation(
        config=config,
        dry_run=dry_run,
        test_post=args.test_post,
        run_mode=args.mode,
        story_index=args.story_index,
    )


if __name__ == "__main__":
    main()
