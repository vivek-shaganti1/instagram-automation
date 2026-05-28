"""
Instagram uploader: handles login, session management, and carousel posting.
Uses instagrapi (most reliable open-source Instagram client).
"""
import os
import time
import json
import random
from pathlib import Path

from instagrapi import Client
from instagrapi.exceptions import (
    LoginRequired,
    TwoFactorRequired,
    BadPassword,
    ChallengeRequired,
)

from src.utils import get_logger, BASE_DIR

logger = get_logger("instagram_uploader")

SESSION_FILE = BASE_DIR / "instagram_session.json"


class InstagramUploader:
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.client = Client()
        self.client.delay_range = [2, 5]  # Random delay between requests
        self._login()

    def _login(self):
        """Login with session reuse for safety."""
        logger.info(f"Logging in as: {self.username}")

        # Try to reuse existing session
        if SESSION_FILE.exists():
            try:
                self.client.load_settings(str(SESSION_FILE))
                self.client.login(self.username, self.password)
                logger.info("Logged in using saved session")
                return
            except Exception as e:
                logger.warning(f"Session login failed ({e}), doing fresh login...")

        # Fresh login
        try:
            self.client.login(self.username, self.password)
            self.client.dump_settings(str(SESSION_FILE))
            logger.info("Fresh login successful, session saved")
        except TwoFactorRequired:
            logger.error("2FA required! Please disable 2FA or handle manually.")
            raise
        except BadPassword:
            logger.error("Invalid Instagram password!")
            raise
        except ChallengeRequired:
            logger.error("Instagram challenge required (unusual login). "
                         "Please log in manually from your phone first.")
            raise
        except Exception as e:
            logger.error(f"Instagram login failed: {e}")
            raise

    def post_carousel(
        self,
        image_paths: list[Path],
        caption: str,
        story_index: int = 0,
    ) -> bool:
        """
        Post a carousel (multiple images) to Instagram.
        Returns True on success.
        """
        logger.info(f"Posting carousel (story {story_index+1}): {len(image_paths)} slides")

        if not image_paths:
            logger.error("No images to post!")
            return False

        if len(image_paths) == 1:
            # Single image post
            try:
                media = self.client.photo_upload(
                    path=str(image_paths[0]),
                    caption=caption,
                )
                logger.info(f"Single image posted: {media.pk}")
                return True
            except Exception as e:
                logger.error(f"Single image upload failed: {e}")
                return False
        else:
            # Carousel post
            try:
                paths_str = [str(p) for p in image_paths]
                media = self.client.album_upload(
                    paths=paths_str,
                    caption=caption,
                )
                logger.info(f"Carousel posted: {media.pk} ({len(image_paths)} slides)")
                return True
            except LoginRequired:
                logger.warning("Session expired, re-logging in...")
                self._login()
                # Retry once
                try:
                    media = self.client.album_upload(
                        paths=[str(p) for p in image_paths],
                        caption=caption,
                    )
                    logger.info(f"Carousel posted after re-login: {media.pk}")
                    return True
                except Exception as e2:
                    logger.error(f"Retry failed: {e2}")
                    return False
            except Exception as e:
                logger.error(f"Carousel upload failed: {e}")
                return False

    def post_reel(
        self,
        video_path: Path,
        caption: str,
    ) -> bool:
        """
        Upload a vertical video as a Reel.
        Returns True on success.
        """
        logger.info(f"Posting Reel: {video_path.name}")

        if not video_path.exists():
            logger.error(f"Reel file does not exist: {video_path}")
            return False

        try:
            media = self.client.clip_upload(
                path=str(video_path),
                caption=caption,
            )
            logger.info(f"Reel posted: {media.pk}")
            return True
        except LoginRequired:
            logger.warning("Session expired, re-logging in...")
            self._login()
            # Retry once
            try:
                media = self.client.clip_upload(
                    path=str(video_path),
                    caption=caption,
                )
                logger.info(f"Reel posted after re-login: {media.pk}")
                return True
            except Exception as e2:
                logger.error(f"Retry Reel upload failed: {e2}")
                return False
        except Exception as e:
            logger.error(f"Reel upload failed: {e}")
            return False

    def post_all(
        self,
        posts: list[dict],
        delay_between_posts: int = 45,
    ) -> dict:
        """
        Post all 5 carousels with delays between them.
        posts: list of {'images': [Path, ...], 'caption': str}
        Returns summary dict.
        """
        results = {"success": [], "failed": []}

        for i, post in enumerate(posts):
            logger.info(f"\n{'='*50}")
            logger.info(f"Posting carousel {i+1}/{len(posts)}")
            logger.info(f"{'='*50}")

            success = self.post_carousel(
                image_paths=post["images"],
                caption=post["caption"],
                story_index=i,
            )

            if success:
                results["success"].append(i + 1)
                logger.info(f"✅ Post {i+1} uploaded successfully")
            else:
                results["failed"].append(i + 1)
                logger.error(f"❌ Post {i+1} failed")

            # Delay between posts (except after last)
            if i < len(posts) - 1:
                # Add some randomness to seem more human
                actual_delay = delay_between_posts + random.randint(-10, 20)
                logger.info(f"Waiting {actual_delay}s before next post...")
                time.sleep(actual_delay)

        logger.info(f"\nPosting complete: {len(results['success'])} success, {len(results['failed'])} failed")
        return results
