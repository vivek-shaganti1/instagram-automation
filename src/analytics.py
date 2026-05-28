"""
Analytics module: Tracks Instagram metrics, saves insights, and calculates
auto-optimizations to help hit the exponential views target.
"""
import json
import math
from pathlib import Path
from datetime import datetime, date
from src.utils import get_logger, BASE_DIR

logger = get_logger("analytics")
ANALYTICS_FILE = BASE_DIR / "logs" / "analytics.json"

# Exponential target parameters
START_DATE = date(2026, 5, 28)
BASE_TARGET = 100
GROWTH_RATE = 0.15 # 15% exponential growth daily

class PostTracker:
    def __init__(self, uploader=None):
        self.uploader = uploader
        self.data = self._load_data()

    def _load_data(self) -> dict:
        if ANALYTICS_FILE.exists():
            try:
                with open(ANALYTICS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load analytics: {e}")
        return {"posts": [], "daily_stats": {}, "settings": {"aggressive_hooks": False, "best_theme": "neon_teal"}}

    def _save_data(self):
        ANALYTICS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(ANALYTICS_FILE, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, default=str)

    def calculate_current_target(self) -> int:
        """Calculate the exponential daily view target (100 * 1.15^days)."""
        days_passed = (date.today() - START_DATE).days
        if days_passed < 0:
            days_passed = 0
        return int(BASE_TARGET * math.pow(1 + GROWTH_RATE, days_passed))

    def update_metrics_from_instagram(self) -> dict:
        """Fetch latest posts and their views/likes/comments using instagrapi."""
        if not self.uploader or not self.uploader.client:
            logger.warning("No Instagram uploader client available to fetch metrics.")
            return self.data

        try:
            logger.info("Fetching media insights from Instagram...")
            user_id = self.uploader.client.user_id_from_username(self.uploader.username)
            medias = self.uploader.client.user_medias(user_id, amount=12)
            
            posts_list = []
            total_views = 0
            
            for media in medias:
                # instagrapi returns view_count, like_count, comment_count
                view_count = getattr(media, "view_count", 0) or 0
                like_count = getattr(media, "like_count", 0) or 0
                comment_count = getattr(media, "comment_count", 0) or 0
                
                posts_list.append({
                    "id": media.id,
                    "pk": media.pk,
                    "code": media.code,
                    "taken_at": media.taken_at.isoformat() if media.taken_at else "",
                    "media_type": media.media_type,
                    "views": view_count,
                    "likes": like_count,
                    "comments": comment_count,
                    "caption": media.caption_text or "",
                    "thumbnail": str(media.thumbnail_url) if media.thumbnail_url else "",
                })
                total_views += view_count

            self.data["posts"] = posts_list
            
            # Save today's aggregated stats
            today_str = datetime.now().strftime("%Y-%m-%d")
            target = self.calculate_current_target()
            
            self.data["daily_stats"][today_str] = {
                "total_views": total_views,
                "target_views": target,
                "post_count": len(posts_list),
                "updated_at": datetime.now().isoformat()
            }

            # Strategy adaptation (behavior logic)
            # If our latest posts are underperforming against target, enable aggressive scroll-stopping hooks
            latest_views = posts_list[0]["views"] if posts_list else 0
            if latest_views < (target / 3): # target divided by 3 posts a day
                self.data["settings"]["aggressive_hooks"] = True
                logger.info(f"Target views not met ({latest_views} < {int(target/3)}). Enabling aggressive scroll-stopping hooks!")
            else:
                self.data["settings"]["aggressive_hooks"] = False
                logger.info(f"Target views met ({latest_views} >= {int(target/3)}). Maintaining premium editorial hooks.")

            # Detect the best-performing theme from the last 10 posts
            theme_performance = {}
            for p in posts_list:
                cap = p["caption"].lower()
                theme = "neon_teal"
                if "money" in cap or "hustle" in cap or "startup" in cap:
                    theme = "sunset_glow"
                elif "motivation" in cap or "mindset" in cap or "discipline" in cap:
                    theme = "cyber_punk"
                theme_performance[theme] = theme_performance.get(theme, 0) + p["views"]
            
            if theme_performance:
                best_theme = max(theme_performance, key=theme_performance.get)
                self.data["settings"]["best_theme"] = best_theme
                logger.info(f"Best performing theme detected: {best_theme}")

            self._save_data()
            logger.info("Instagram metrics updated successfully.")
        except Exception as e:
            logger.error(f"Failed to update Instagram metrics: {e}")
            
        return self.data

    def get_latest_analytics(self) -> dict:
        # Populate target in case it's not set
        today_str = datetime.now().strftime("%Y-%m-%d")
        if today_str not in self.data["daily_stats"]:
            self.data["daily_stats"][today_str] = {
                "total_views": sum(p.get("views", 0) for p in self.data["posts"]),
                "target_views": self.calculate_current_target(),
                "post_count": len(self.data["posts"]),
                "updated_at": datetime.now().isoformat()
            }
        return self.data
